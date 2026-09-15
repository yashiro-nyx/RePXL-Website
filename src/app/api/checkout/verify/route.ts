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
  checkPaymongoPaymentStatus,
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
 * 4. Verify payment status with PayMongo (Checkout Session or Payment Intent).
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

  // Verify payment status directly with PayMongo
  const gatewayId = order.paymentIntentId ?? order.paymentSessionId
  if (!gatewayId) {
    console.warn(`[CHECKOUT verify] No gateway ID for order ${orderNumber}`)
    return errorResponse('No payment intent found for this order', 422)
  }

  let verification
  try {
    verification = await checkPaymongoPaymentStatus({
      paymentIntentId: order.paymentIntentId,
      paymentSessionId: order.paymentSessionId,
    })
    console.log(`[CHECKOUT verify] Order ${orderNumber} verification:`, verification)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[CHECKOUT verify] Failed to verify payment for ${orderNumber}:`, msg)
    return errorResponse(`Could not verify payment: ${msg}`, 502)
  }

  if (!verification.isPaid) {
    console.log(`[CHECKOUT verify] Payment not yet paid (${verification.status}) for ${orderNumber}`)
    return successResponse({
      orderNumber,
      paymentStatus: 'PENDING',
      piStatus: verification.status,
      alreadyFinalized: false,
      message: verification.status === 'processing' ? 'Payment is still processing.' : `Payment status: ${verification.status}`,
    })
  }

  // Payment is confirmed paid/succeeded — finalize the order
  console.log(`[CHECKOUT verify] Payment succeeded — finalizing order ${orderNumber}`)

  try {
    await finalizePaidOrder(orderNumber)
    if (verification.paymentId && !order.paymentReference) {
      await prisma.order.update({
        where: { orderNumber },
        data: { paymentReference: verification.paymentId },
      }).catch(() => {})
    }
    const current = await prisma.order.findUniqueOrThrow({ where: { orderNumber } })
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
