import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api'
import { getCurrentUser } from '@/lib/auth-helpers'
import {
  isPaymongoConfigured,
  retrievePaymentIntent,
} from '@/lib/paymongo'
import { emitNotification } from '@/lib/notifications'
import { createTransporter, isMailerConfigured } from '@/lib/mailer'

export const dynamic = 'force-dynamic'

/**
 * POST /api/checkout/verify
 *
 * Server-side payment verification called by the success page.
 * Does NOT depend on the PayMongo webhook.
 *
 * Flow:
 * 1. Authenticate the user (customer session cookie).
 * 2. Find the order by orderNumber — ownership check.
 * 3. If already PAID → return success (idempotent).
 * 4. Retrieve the PaymentIntent from PayMongo to confirm status = 'succeeded'.
 * 5. Run finalization transaction: PAID + stock decrement + cart clear.
 * 6. Return success.
 *
 * The webhook also calls finalizePaidOrder — both paths are idempotent via
 * the paymentStatus = PAID guard inside the transaction.
 *
 * Body: { orderNumber: string }
 */
export async function POST(request: NextRequest) {
  console.log('[CHECKOUT verify] Request received')

  if (!isPaymongoConfigured()) {
    return errorResponse('Payment gateway not configured.', 503)
  }

  const user = await getCurrentUser()
  if (!user) {
    console.warn('[CHECKOUT verify] Unauthorized — no user session')
    return unauthorizedResponse()
  }

  let body: { orderNumber?: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid request body', 400)
  }

  const { orderNumber } = body
  if (!orderNumber || typeof orderNumber !== 'string') {
    return errorResponse('orderNumber is required', 400)
  }

  console.log(`[CHECKOUT verify] Verifying order ${orderNumber} for user ${user.id}`)

  // Load the order with ownership check
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: { include: { product: true } },
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  })

  if (!order) {
    console.warn(`[CHECKOUT verify] Order not found: ${orderNumber}`)
    return errorResponse('Order not found', 404)
  }

  // Ownership — the calling user must own this order
  if (order.userId !== user.id) {
    console.warn(`[CHECKOUT verify] Ownership mismatch: order.userId=${order.userId} user.id=${user.id}`)
    return errorResponse('Order not found', 404)
  }

  // Already finalized — idempotent return
  if (order.paymentStatus === 'PAID') {
    console.log(`[CHECKOUT verify] Order already PAID: ${orderNumber}`)
    return successResponse({ orderNumber, status: order.status, paymentStatus: 'PAID', alreadyFinalized: true })
  }

  // Retrieve the PaymentIntent from PayMongo to verify actual payment status
  const intentId = order.paymentIntentId ?? order.paymentSessionId
  if (!intentId) {
    console.warn(`[CHECKOUT verify] No payment intent ID for order ${orderNumber}`)
    return errorResponse('No payment intent found for this order', 422)
  }

  let piStatus: string
  try {
    const intent = await retrievePaymentIntent(intentId)
    piStatus = intent.attributes.status
    console.log(`[CHECKOUT verify] PaymentIntent ${intentId} status: ${piStatus}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[CHECKOUT verify] Failed to retrieve PaymentIntent ${intentId}:`, msg)
    return errorResponse(`Could not verify payment: ${msg}`, 502)
  }

  if (piStatus !== 'succeeded') {
    console.log(`[CHECKOUT verify] Payment not yet succeeded (${piStatus}) for ${orderNumber}`)
    return successResponse({
      orderNumber,
      paymentStatus: 'PENDING',
      piStatus,
      alreadyFinalized: false,
      message: piStatus === 'processing' ? 'Payment is still processing.' : `Payment status: ${piStatus}`,
    })
  }

  // Payment is confirmed succeeded — finalize the order
  console.log(`[CHECKOUT verify] Payment succeeded — finalizing order ${orderNumber}`)

  try {
    await finalizeOrder(order)
    console.log(`[CHECKOUT verify] Order finalized: ${orderNumber}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[CHECKOUT verify] Finalization failed for ${orderNumber}:`, msg)
    return errorResponse(`Order finalization failed: ${msg}`, 500)
  }

  return successResponse({
    orderNumber,
    status: 'PROCESSING',
    paymentStatus: 'PAID',
    alreadyFinalized: false,
    message: 'Payment verified and order finalized.',
  })
}

// ─── Shared finalization logic ──────────────────────────────────────────────────
// Identical to finalizePaidOrder in the webhook — both are idempotent via the
// paymentStatus = PAID guard. Extracted here so this route and the webhook
// share the same business logic without an internal HTTP round-trip.

interface OrderWithItemsAndUser {
  id: string
  orderNumber: string
  userId: string
  voucherCode: string | null
  paymentStatus: string
  paymentMethod: string
  subtotal: number
  shippingCost: number
  total: number
  courierName: string
  fullName: string
  address: string
  barangay: string
  city: string
  province: string
  postalCode: string
  createdAt: Date
  items: Array<{
    productId: string
    quantity: number
    price: number
    product: { name: string } | null
  }>
  user: { id: string; email: string; firstName: string; lastName: string } | null
}

async function finalizeOrder(order: OrderWithItemsAndUser): Promise<void> {
  // Re-check inside a transaction so concurrent calls (webhook + verify) are safe
  await prisma.$transaction(async (tx) => {
    const fresh = await tx.order.findUnique({
      where: { id: order.id },
      include: { items: true },
    })
    if (!fresh || fresh.paymentStatus === 'PAID') {
      console.log(`[CHECKOUT verify] Transaction: order ${order.orderNumber} already PAID, skipping`)
      return
    }

    console.log(`[CHECKOUT verify] Transaction: updating order ${order.orderNumber} to PAID`)

    await tx.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'PAID', status: 'PROCESSING' },
    })

    // Decrement stock for each purchased item
    for (const item of fresh.items) {
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
    console.log(`[CHECKOUT verify] Transaction: stock decremented for ${fresh.items.length} item(s)`)

    // Increment voucher usage if one was applied
    if (fresh.voucherCode) {
      await tx.voucher
        .updateMany({
          where: { code: fresh.voucherCode },
          data: { used: { increment: 1 } },
        })
        .catch(() => undefined)
    }

    // Clear the buyer's cart from the database
    const deleted = await tx.cartItem.deleteMany({ where: { userId: fresh.userId } })
    console.log(`[CHECKOUT verify] Transaction: cleared ${deleted.count} cart item(s)`)
  })

  // Non-blocking: emit notification + send email (failures don't affect order state)
  const userEmail = order.user?.email
  if (userEmail) {
    emitNotification({
      userId: order.userId,
      event: 'ORDER_CONFIRMATION',
      subject: `Order Confirmed — ${order.orderNumber}`,
      body: `Your order ${order.orderNumber} has been confirmed. Total: ${order.total}`,
      channel: 'BOTH',
      recipientEmail: userEmail,
    }).catch((err) => {
      console.error(`[CHECKOUT verify] Notification failed (non-fatal):`, err)
    })

    sendConfirmationEmail(order).catch((err) => {
      console.error(`[CHECKOUT verify] Confirmation email failed (non-fatal):`, err)
    })
  }
}

async function sendConfirmationEmail(order: OrderWithItemsAndUser): Promise<void> {
  if (!isMailerConfigured()) return
  const email = order.user?.email
  if (!email) return

  const safe = (s: string) =>
    String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const dateStr = order.createdAt.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const itemText = order.items
    .map((i) => `  ${i.product?.name ?? 'Product'} ×${i.quantity} @ $${i.price.toFixed(2)}`)
    .join('\n')

  try {
    const transporter = createTransporter()
    await transporter.sendMail({
      from: `"RePXL" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `Order Confirmed — ${order.orderNumber}`,
      text: `ORDER CONFIRMED — ${order.orderNumber}\n\nThank you, ${order.fullName}.\n\nItems:\n${itemText}\n\nTotal: $${order.total.toFixed(2)}\nShipping (${order.courierName}): $${order.shippingCost.toFixed(2)}\n\nShip to:\n${order.fullName}\n${order.address}, ${order.barangay}\n${order.city}, ${order.province} ${order.postalCode}\n\n© ${new Date().getFullYear()} RePXL`,
    })
    console.log(`[CHECKOUT verify] Confirmation email sent to ${email}`)
  } catch (err) {
    throw err
  }
}
