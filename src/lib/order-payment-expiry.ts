import { prisma } from '@/lib/prisma'
import type { PrismaClient, Prisma } from '@prisma/client'

export const DEFAULT_PAYMENT_EXPIRY_HOURS = 24

/**
 * Returns the payment processing expiry window in milliseconds.
 * Configurable via ORDER_PAYMENT_EXPIRY_HOURS environment variable.
 */
export function getPaymentExpiryMs(): number {
  const envHours = process.env.ORDER_PAYMENT_EXPIRY_HOURS
  if (envHours) {
    const parsed = parseInt(envHours, 10)
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed * 60 * 60 * 1000
    }
  }
  return DEFAULT_PAYMENT_EXPIRY_HOURS * 60 * 60 * 1000
}

/**
 * Checks whether an order is in an active payment-processing (pending) state.
 */
export function isPaymentProcessing(order: {
  paymentStatus: string
  status?: string
}): boolean {
  if (order.paymentStatus !== 'PENDING') return false
  if (order.status && order.status !== 'PROCESSING') return false
  return true
}

/**
 * Calculates the exact expiry timestamp for an order based on its creation date.
 */
export function getPaymentExpiryDate(
  createdAt: Date | string,
  expiryMs: number = getPaymentExpiryMs()
): Date {
  return new Date(new Date(createdAt).getTime() + expiryMs)
}

/**
 * Returns true if the order is in PENDING payment state and the expiry window has lapsed.
 */
export function isPaymentExpired(
  order: {
    createdAt: Date | string
    paymentStatus: string
    status?: string
  },
  now: number = Date.now(),
  expiryMs: number = getPaymentExpiryMs()
): boolean {
  if (!isPaymentProcessing(order)) return false
  const createdTime = new Date(order.createdAt).getTime()
  return now - createdTime >= expiryMs
}

/**
 * Validates whether an administrator is permitted to edit an order's status.
 * Order status can only be edited when payment has been completed (paymentStatus === 'PAID').
 */
export function canAdminEditOrderStatus(order: {
  paymentStatus: string
  status?: string
  createdAt?: Date | string
}): { allowed: boolean; reason?: string } {
  if (
    order.createdAt &&
    isPaymentExpired({
      createdAt: order.createdAt,
      paymentStatus: order.paymentStatus,
      status: order.status,
    })
  ) {
    return {
      allowed: false,
      reason:
        'Order payment processing has expired. Order status cannot be edited.',
    }
  }

  if (order.paymentStatus !== 'PAID') {
    return {
      allowed: false,
      reason: `Order status cannot be edited until payment has been marked completed (current payment status: ${order.paymentStatus}).`,
    }
  }

  return { allowed: true }
}

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
