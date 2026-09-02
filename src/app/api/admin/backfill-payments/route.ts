import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api'
import { getCurrentAdmin } from '@/lib/auth-helpers'
import { isPaymongoConfigured, retrievePaymentIntent } from '@/lib/paymongo'
import { emitNotification } from '@/lib/notifications'

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
 * Safe to call multiple times — idempotent via paymentStatus = PAID guard.
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
        // Finalize
        await prisma.$transaction(async (tx) => {
          const fresh = await tx.order.findUnique({ where: { id: order.id }, include: { items: true } })
          if (!fresh || fresh.paymentStatus === 'PAID') return

          await tx.order.update({
            where: { id: order.id },
            data: { paymentStatus: 'PAID', status: 'PROCESSING' },
          })

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

          if (fresh.voucherCode) {
            await tx.voucher.updateMany({
              where: { code: fresh.voucherCode },
              data: { used: { increment: 1 } },
            }).catch(() => undefined)
          }

          // Clear ONLY the purchased products from the buyer's cart
          for (const item of fresh.items) {
            const cartRow = await tx.cartItem.findFirst({
              where: { userId: fresh.userId, productId: item.productId },
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
        })

        // Non-blocking notification
        if (order.user?.email) {
          emitNotification({
            userId: order.userId,
            event: 'ORDER_CONFIRMATION',
            subject: `Order Confirmed — ${order.orderNumber}`,
            body: `Your order ${order.orderNumber} has been confirmed and is being processed.`,
            channel: 'BOTH',
            recipientEmail: order.user.email,
          }).catch(() => undefined)
        }

        console.log(`[backfill] Finalized order ${order.orderNumber}`)
        results.push({ orderNumber: order.orderNumber, piStatus, action: 'finalized' })
      } else if (piStatus === 'failed' || piStatus === 'awaiting_payment_method') {
        // Mark as failed/cancelled
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: 'FAILED', status: 'CANCELLED' },
        })
        console.log(`[backfill] Marked order ${order.orderNumber} as FAILED (PI status: ${piStatus})`)
        results.push({ orderNumber: order.orderNumber, piStatus, action: 'marked_failed' })
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
