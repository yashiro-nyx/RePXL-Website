import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  verifyWebhookSignature,
  type PaymongoWebhookEvent,
} from '@/lib/paymongo'

// Webhooks must run per-request and read the raw body for signature verification.
export const dynamic = 'force-dynamic'

// Track processed event ids in-process as a fast idempotency short-circuit.
// The durable guard is the order's paymentStatus check below.
const processedEvents = new Set<string>()

// POST /api/webhooks/paymongo
// Receives PayMongo events. On a successful payment, finalizes the matching
// order: marks it PAID, decrements stock, increments voucher usage, clears the
// user's cart — all idempotently.
export async function POST(request: NextRequest) {
  // 1) Read the RAW body BEFORE parsing (signature is over the exact bytes).
  const rawBody = await request.text()
  const signature = request.headers.get('paymongo-signature')

  const verification = verifyWebhookSignature(
    rawBody,
    signature,
    process.env.PAYMONGO_WEBHOOK_SECRET
  )
  if (!verification.valid) {
    console.warn('[paymongo webhook] rejected:', verification.reason)
    return NextResponse.json({ received: false }, { status: 401 })
  }

  let event: PaymongoWebhookEvent
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ received: false }, { status: 400 })
  }

  const eventId = event.data?.id
  const type = event.data?.attributes?.type

  // 2) Acknowledge fast + idempotency short-circuit.
  if (eventId && processedEvents.has(eventId)) {
    return NextResponse.json({ received: true, duplicate: true })
  }
  if (eventId) processedEvents.add(eventId)

  try {
    if (type === 'checkout_session.payment.paid' || type === 'payment.paid') {
      const resource = event.data.attributes.data.attributes
      // reference_number is our order number (set on the checkout session).
      const orderNumber =
        resource.reference_number ??
        resource.metadata?.orderNumber ??
        resource.payment_intent?.attributes?.metadata?.orderNumber

      if (orderNumber) {
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
    // Log but still return 2xx-ish? No — return 500 so PayMongo retries.
    console.error('[paymongo webhook] processing error:', err)
    return NextResponse.json({ received: false }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

/**
 * Idempotently finalize an order once payment is confirmed:
 * flips PENDING → PAID, decrements product stock, increments voucher usage, and
 * clears the buyer's cart. The paymentStatus guard makes re-delivery a no-op.
 */
async function finalizePaidOrder(orderNumber: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { orderNumber },
      include: { items: true },
    })
    if (!order) return
    if (order.paymentStatus === 'PAID') return // already processed

    await tx.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'PAID', status: 'PROCESSING' },
    })

    // Decrement stock for each purchased item.
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      })
    }

    // Increment voucher usage if one was applied.
    if (order.voucherCode) {
      await tx.voucher
        .updateMany({
          where: { code: order.voucherCode },
          data: { used: { increment: 1 } },
        })
        .catch(() => undefined)
    }

    // Clear the buyer's cart.
    await tx.cartItem.deleteMany({ where: { userId: order.userId } })
  })
}
