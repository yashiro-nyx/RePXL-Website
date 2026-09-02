import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  verifyWebhookSignature,
  type PaymongoWebhookEvent,
} from '@/lib/paymongo'
import { emitNotification } from '@/lib/notifications'
import { sendOrderConfirmationEmail } from '@/lib/order-email'

// Webhooks must run per-request and read the raw body for signature verification.
export const dynamic = 'force-dynamic'

// Track processed event ids in-process as a fast idempotency short-circuit.
// The durable guard is the order's paymentStatus check below.
const processedEvents = new Set<string>()

// POST /api/webhooks/paymongo
// Receives PayMongo events. On a successful payment, finalizes the matching
// order: marks it PAID, decrements stock, increments voucher usage, clears the
// user's cart — all idempotently. Then sends a confirmation email.
export async function POST(request: NextRequest) {
  // 1) Read the RAW body BEFORE parsing (signature is over the exact bytes).
  const rawBody = await request.text()
  const signature = request.headers.get('paymongo-signature')

  console.log('[paymongo webhook] received event, signature present:', !!signature)
  console.log('[paymongo webhook] webhook secret configured:', !!process.env.PAYMONGO_WEBHOOK_SECRET)

  const verification = verifyWebhookSignature(
    rawBody,
    signature,
    process.env.PAYMONGO_WEBHOOK_SECRET,
    { toleranceSeconds: 15 * 60 } // 15 min — handles clock skew between PayMongo and Vercel
  )
  if (!verification.valid) {
    console.warn('[paymongo webhook] signature rejected:', verification.reason)
    console.warn('[paymongo webhook] raw body preview:', rawBody.slice(0, 100))
    return NextResponse.json({ received: false, reason: verification.reason }, { status: 401 })
  }

  console.log('[paymongo webhook] signature verified OK')

  let event: PaymongoWebhookEvent
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ received: false }, { status: 400 })
  }

  const eventId = event.data?.id
  const type = event.data?.attributes?.type

  console.log(`[paymongo webhook] event id=${eventId} type=${type}`)

  // 2) Acknowledge fast + idempotency short-circuit.
  if (eventId && processedEvents.has(eventId)) {
    return NextResponse.json({ received: true, duplicate: true })
  }
  if (eventId) processedEvents.add(eventId)

  try {
    if (type === 'checkout_session.payment.paid' || type === 'payment.paid') {
      const resource = event.data.attributes.data.attributes
      const orderNumber =
        resource.reference_number ??
        resource.metadata?.orderNumber ??
        resource.payment_intent?.attributes?.metadata?.orderNumber

      if (orderNumber) {
        console.log(`[paymongo webhook] finalizing order from ${type}: ${orderNumber}`)
        await finalizePaidOrder(orderNumber)
      }
    } else if (type === 'payment_intent.succeeded') {
      const resource = event.data.attributes.data.attributes
      const orderNumber =
        resource.metadata?.orderNumber ??
        resource.reference_number

      if (orderNumber) {
        console.log(`[paymongo webhook] finalizing order from payment_intent.succeeded: ${orderNumber}`)
        await finalizePaidOrder(orderNumber)
      }
    } else if (type === 'payment.failed') {
      const resource = event.data.attributes.data.attributes
      const orderNumber = resource.reference_number ?? resource.metadata?.orderNumber
      if (orderNumber) {
        await prisma.order
          .updateMany({
            where: { orderNumber, paymentStatus: 'PENDING' },
            data: { paymentStatus: 'FAILED', status: 'CANCELLED' },
          })
          .catch(() => undefined)
      }
    }
  } catch (err) {
    console.error('[paymongo webhook] processing error:', err)
    return NextResponse.json({ received: false }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

/**
 * Idempotently finalize an order once payment is confirmed.
 * Flips PENDING → PAID, decrements stock, clears purchased cart items,
 * increments voucher usage, sends confirmation email.
 */
async function finalizePaidOrder(orderNumber: string): Promise<void> {
  console.log(`[paymongo webhook] finalizePaidOrder: ${orderNumber}`)

  const orderBefore = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: { include: { product: true } },
      user: { select: { email: true } },
    },
  })
  if (!orderBefore) {
    console.warn(`[paymongo webhook] order not found: ${orderNumber}`)
    return
  }
  if (orderBefore.paymentStatus === 'PAID') {
    console.info(`[paymongo webhook] order already PAID, skipping: ${orderNumber}`)
    return
  }

  console.log(`[paymongo webhook] running finalization transaction for: ${orderNumber}`)

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { orderNumber },
      include: { items: true },
    })
    if (!order || order.paymentStatus === 'PAID') return

    await tx.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'PAID', status: 'PROCESSING' },
    })
    console.log(`[paymongo webhook] transaction: order ${orderNumber} marked PAID`)

    // Decrement stock — floor at 0, never negative
    for (const item of order.items) {
      const updated = await tx.product.updateMany({
        where: { id: item.productId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      })
      if (updated.count === 0) {
        await tx.product.updateMany({
          where: { id: item.productId, stock: { gt: 0 } },
          data: { stock: 0 },
        })
      }
    }

    // Increment voucher usage if one was applied
    if (order.voucherCode) {
      await tx.voucher
        .updateMany({
          where: { code: order.voucherCode },
          data: { used: { increment: 1 } },
        })
        .catch(() => undefined)
    }

    // Clear ONLY the purchased products from the buyer's cart.
    // Authoritative source: order_items records (never client state).
    for (const item of order.items) {
      const cartRow = await tx.cartItem.findFirst({
        where: { userId: order.userId, productId: item.productId },
      })
      if (!cartRow) continue

      if (cartRow.quantity <= item.quantity) {
        await tx.cartItem.delete({ where: { id: cartRow.id } })
      } else {
        await tx.cartItem.update({
          where: { id: cartRow.id },
          data: { quantity: { decrement: item.quantity } },
        })
      }
    }
    console.log(`[paymongo webhook] transaction: cleared purchased cart items for order ${orderNumber}`)
  })

  // Non-blocking: notification + email — failures do NOT roll back the order
  await emitNotification({
    userId: orderBefore.userId,
    event: 'ORDER_CONFIRMATION',
    subject: `Order Confirmed — ${orderBefore.orderNumber}`,
    body: `Your order ${orderBefore.orderNumber} has been confirmed.`,
    channel: 'BOTH',
    recipientEmail: orderBefore.user?.email ?? undefined,
  }).catch((err) => {
    console.error('[paymongo webhook] notification failed (non-fatal):', err)
  })

  const userEmail = orderBefore.user?.email
  if (userEmail) {
    sendOrderConfirmationEmail({
      orderNumber: orderBefore.orderNumber,
      createdAt: orderBefore.createdAt,
      fullName: orderBefore.fullName,
      address: orderBefore.address,
      barangay: orderBefore.barangay,
      city: orderBefore.city,
      province: orderBefore.province,
      postalCode: orderBefore.postalCode,
      paymentMethod: orderBefore.paymentMethod,
      courierName: orderBefore.courierName,
      subtotal: orderBefore.subtotal,
      shippingCost: orderBefore.shippingCost,
      discount: orderBefore.discount,
      total: orderBefore.total,
      items: orderBefore.items.map((item) => ({
        quantity: item.quantity,
        price: item.price,
        product: item.product ? { name: item.product.name } : null,
      })),
      userEmail,
    }).catch((err) => {
      console.error('[paymongo webhook] confirmation email failed (non-fatal):', err)
    })
  }
}
