import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api'
import { getCurrentAdmin } from '@/lib/auth-helpers'
import { isPaymongoConfigured, retrievePaymentIntent } from '@/lib/paymongo'
import { finalizePaidOrder } from '@/lib/purchase-finalization'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/backfill-payments
 *
 * Admin-only: iterates over PENDING orders that have a paymentIntentId,
 * checks each one against PayMongo, and finalizes any that are 'succeeded'.
 *
 * This fixes all existing PENDING orders created before the verify endpoint
 * was added to the success page.
 *
 * Safe to call multiple times — idempotent via the shared atomic payment transition.
 */
export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin()
  if (!admin) return unauthorizedResponse('Admin access required')

  if (!isPaymongoConfigured()) {
    return errorResponse('Payment gateway not configured.', 503)
  }

  // Find all PENDING orders with a payment intent
  const pendingOrders = await prisma.order.findMany({
    where: {
      paymentStatus: 'PENDING',
      paymentIntentId: { not: null },
    },
    include: {
      items: true,
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50, // process up to 50 at a time
  })

  console.log(`[backfill] Found ${pendingOrders.length} PENDING orders to check`)

  const results: Array<{
    orderNumber: string
    piStatus: string
    action: string
    error?: string
  }> = []

  for (const order of pendingOrders) {
    const intentId = order.paymentIntentId!
    try {
      const intent = await retrievePaymentIntent(intentId)
      const piStatus = intent.attributes.status

      if (piStatus === 'succeeded') {
        const finalized = await finalizePaidOrder(order.orderNumber)
        results.push({orderNumber: order.orderNumber, piStatus, action: finalized ? 'finalized' : 'skipped'})
      } else if (piStatus === 'failed') {
        // Mark as failed/cancelled
        const changed = await prisma.order.updateMany({
          where: { id: order.id, paymentStatus: 'PENDING' },
          data: { paymentStatus: 'FAILED', status: 'CANCELLED' },
        })
        console.log(`[backfill] Marked order ${order.orderNumber} as FAILED (PI status: ${piStatus})`)
        results.push({ orderNumber: order.orderNumber, piStatus, action: changed.count ? 'marked_failed' : 'skipped' })
      } else {
        results.push({ orderNumber: order.orderNumber, piStatus, action: 'skipped' })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[backfill] Error processing ${order.orderNumber}:`, msg)
      results.push({ orderNumber: order.orderNumber, piStatus: 'unknown', action: 'error', error: msg })
    }
  }

  const finalized = results.filter((r) => r.action === 'finalized').length
  const failed = results.filter((r) => r.action === 'marked_failed').length
  const errors = results.filter((r) => r.action === 'error').length

  console.log(`[backfill] Complete: ${finalized} finalized, ${failed} marked failed, ${errors} errors`)

  await prisma.adminLog.create({
    data: {
      action: 'BACKFILL_PAYMENTS',
      details: `Backfilled ${finalized} payments. ${failed} marked failed. ${errors} errors.`,
      adminId: admin.id,
      adminName: `${admin.firstName} ${admin.lastName}`,
    },
  })

  return successResponse({
    processed: pendingOrders.length,
    finalized,
    markedFailed: failed,
    errors,
    results,
  })
}
