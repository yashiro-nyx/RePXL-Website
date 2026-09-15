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

  let body: { orderNumber?: string; paymentIntentId?: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid request body', 400)
  }

  const { orderNumber, paymentIntentId } = body
  if (
    (!orderNumber || typeof orderNumber !== 'string') &&
    (!paymentIntentId || typeof paymentIntentId !== 'string')
  ) {
    return errorResponse('orderNumber or paymentIntentId is required', 400)
  }

  console.log(
    `[CHECKOUT verify] Verifying order ${orderNumber || paymentIntentId} for user ${user.id}`
  )

  // Load the order with ownership check
  const order = await prisma.order.findFirst({
    where: {
      userId: user.id,
      ...(orderNumber ? { orderNumber } : {}),
      ...(paymentIntentId ? { paymentIntentId } : {}),
    },
    include: {
      items: { include: { product: true } },
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  })

  if (!order) {
    console.warn(`[CHECKOUT verify] Order not found for: ${orderNumber || paymentIntentId}`)
    return errorResponse('Order not found', 404)
  }

  const resolvedOrderNumber = order.orderNumber

  if (order.paymentStatus === 'PAID') {
    return successResponse({
      orderNumber: resolvedOrderNumber,
      status: order.status,
      paymentStatus: 'PAID',
      alreadyFinalized: true,
    })
  }
  if (order.paymentStatus !== 'PENDING' || order.status !== 'PROCESSING') {
    return errorResponse('Order cannot be finalized', 409)
  }

  // Verify payment status directly with PayMongo
  const gatewayId = order.paymentIntentId ?? order.paymentSessionId
  if (!gatewayId) {
    console.warn(`[CHECKOUT verify] No gateway ID for order ${resolvedOrderNumber}`)
    return errorResponse('No payment intent found for this order', 422)
  }

  let verification
  try {
    verification = await checkPaymongoPaymentStatus({
      paymentIntentId: order.paymentIntentId,
      paymentSessionId: order.paymentSessionId,
    })
    console.log(`[CHECKOUT verify] Order ${resolvedOrderNumber} verification:`, verification)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[CHECKOUT verify] Failed to verify payment for ${resolvedOrderNumber}:`, msg)
    return errorResponse(`Could not verify payment: ${msg}`, 502)
  }

  if (!verification.isPaid) {
    console.log(
      `[CHECKOUT verify] Payment not yet paid (${verification.status}) for ${resolvedOrderNumber}`
    )
    return successResponse({
      orderNumber: resolvedOrderNumber,
      paymentStatus: 'PENDING',
      piStatus: verification.status,
      alreadyFinalized: false,
      message:
        verification.status === 'processing'
          ? 'Payment is still processing.'
          : `Payment status: ${verification.status}`,
    })
  }

  // Payment is confirmed paid/succeeded — finalize the order
  console.log(`[CHECKOUT verify] Payment succeeded — finalizing order ${resolvedOrderNumber}`)

  try {
    await finalizePaidOrder(resolvedOrderNumber)
    if (verification.paymentId && !order.paymentReference) {
      await prisma.order
        .update({
          where: { orderNumber: resolvedOrderNumber },
          data: { paymentReference: verification.paymentId },
        })
        .catch(() => {})
    }
    const current = await prisma.order.findUniqueOrThrow({
      where: { orderNumber: resolvedOrderNumber },
    })
    if (current.paymentStatus !== 'PAID') return errorResponse('Order cannot be finalized', 409)
    console.log(`[CHECKOUT verify] Order finalized: ${resolvedOrderNumber}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[CHECKOUT verify] Finalization failed for ${resolvedOrderNumber}:`, msg)
    return errorResponse(
      err instanceof InsufficientStockError ? err.message : 'Order finalization failed. Please retry.',
      err instanceof InsufficientStockError ? 409 : 500
    )
  }

  return successResponse({
    orderNumber: resolvedOrderNumber,
    status: 'PROCESSING',
    paymentStatus: 'PAID',
    alreadyFinalized: false,
    message: 'Payment verified and order finalized.',
  })
}
