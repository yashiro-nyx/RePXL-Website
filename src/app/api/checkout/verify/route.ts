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
  retrieveCheckoutSession,
} from '@/lib/paymongo'
import { finalizePaidOrder, InsufficientStockError } from '@/lib/purchase-finalization'

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
 * an atomic PENDING → PAID update inside the shared transaction.
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

  if (order.paymentStatus === 'PAID') {
    return successResponse({ orderNumber, status: order.status, paymentStatus: 'PAID', alreadyFinalized: true })
  }
  if (order.paymentStatus !== 'PENDING' || order.status !== 'PROCESSING') return errorResponse('Order cannot be finalized', 409)

  // Retrieve the PaymentIntent from PayMongo to verify actual payment status
  const intentId = order.paymentIntentId ?? order.paymentSessionId
  if (!intentId) {
    console.warn(`[CHECKOUT verify] No payment intent ID for order ${orderNumber}`)
    return errorResponse('No payment intent found for this order', 422)
  }

  let piStatus: string
  try {
    if (order.paymentIntentId) {
      piStatus = (await retrievePaymentIntent(order.paymentIntentId)).attributes.status
    } else {
      const session = await retrieveCheckoutSession(intentId)
      piStatus = session.attributes.payment_intent?.attributes?.status ?? 'pending'
    }
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
    await finalizePaidOrder(orderNumber)
    const current = await prisma.order.findUniqueOrThrow({where: {orderNumber}})
    if (current.paymentStatus !== 'PAID') return errorResponse('Order cannot be finalized', 409)
    console.log(`[CHECKOUT verify] Order finalized: ${orderNumber}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[CHECKOUT verify] Finalization failed for ${orderNumber}:`, msg)
    return errorResponse(err instanceof InsufficientStockError ? err.message : 'Order finalization failed. Please retry.', err instanceof InsufficientStockError ? 409 : 500)
  }

  return successResponse({
    orderNumber,
    status: 'PROCESSING',
    paymentStatus: 'PAID',
    alreadyFinalized: false,
    message: 'Payment verified and order finalized.',
  })
}
