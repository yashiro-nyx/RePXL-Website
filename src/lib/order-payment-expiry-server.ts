import { prisma } from '@/lib/prisma'
import { checkPaymongoPaymentStatus } from '@/lib/paymongo'
import { finalizePaidOrder } from '@/lib/purchase-finalization'
import { getPaymentExpiryMs } from '@/lib/order-payment-expiry'
import type { Prisma } from '@prisma/client'

/**
 * Finds and marks overdue PENDING orders as FAILED / CANCELLED.
 * For direct orders where inventory was deducted at creation, inventory is safely restored.
 */
export async function expireOverduePendingOrders(
  client: typeof prisma = prisma
): Promise<number> {
  try {
    const cutoff = new Date(Date.now() - getPaymentExpiryMs())

    const overdueOrders = await client.order.findMany({
      where: {
        paymentStatus: 'PENDING',
        status: 'PROCESSING',
        createdAt: { lte: cutoff },
      },
      include: {
        items: true,
      },
      take: 50,
    })

    if (overdueOrders.length === 0) return 0

    let expiredCount = 0

    for (const order of overdueOrders) {
      try {
        // If order has PayMongo gateway ID, check upstream before cancelling
        if (order.paymentIntentId || order.paymentSessionId) {
          try {
            const statusResult = await checkPaymongoPaymentStatus({
              paymentIntentId: order.paymentIntentId,
              paymentSessionId: order.paymentSessionId,
            })
            if (statusResult.isPaid) {
              console.log(`[expireOverduePendingOrders] Found paid order during expiry check: ${order.orderNumber}`)
              await finalizePaidOrder(order.orderNumber)
              if (statusResult.paymentId && !order.paymentReference) {
                await client.order.update({
                  where: { orderNumber: order.orderNumber },
                  data: { paymentReference: statusResult.paymentId },
                }).catch(() => {})
              }
              // Do not cancel this order as it was paid!
              continue
            }
          } catch (err) {
            console.warn(`[expireOverduePendingOrders] PayMongo check failed for ${order.orderNumber}:`, err)
          }
        }

        await client.$transaction(async (tx: Prisma.TransactionClient) => {
          // If inventory was deducted at creation (direct orders without gateway IDs), restore it
          const isDirectOrder = !order.paymentIntentId && !order.paymentSessionId
          if (isDirectOrder && order.items.length > 0) {
            for (const item of order.items) {
              await tx.product.update({
                where: { id: item.productId },
                data: { stock: { increment: item.quantity } },
              })
            }
          }

          // Mark payment failed and order cancelled
          const res = await tx.order.updateMany({
            where: {
              id: order.id,
              paymentStatus: 'PENDING',
              status: 'PROCESSING',
            },
            data: {
              paymentStatus: 'FAILED',
              status: 'CANCELLED',
              updatedAt: new Date(),
            },
          })

          if (res.count > 0) expiredCount++
        })
      } catch (err) {
        console.error(`Failed to expire overdue order ${order.orderNumber}:`, err)
      }
    }

    return expiredCount
  } catch (err) {
    console.error('Error running expireOverduePendingOrders:', err)
    return 0
  }
}

