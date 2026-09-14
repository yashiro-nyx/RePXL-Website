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

const PICKED_UP_OR_SHIPPED_KEYWORDS = [
  'picked up',
  'pickup',
  'in transit',
  'out for delivery',
  'delivered',
  'departed',
  'en route',
  'shipped',
  'dispatched',
]

/**
 * Returns true if an order has been marked as shipped or picked up by the courier.
 * Checked against order status and courier delivery status keywords.
 */
export function isOrderPickedUpOrShipped(order?: {
  status?: string | null
  deliveryStatus?: string | null
} | null): boolean {
  if (!order) return false

  const normStatus = (order.status || '').trim().toUpperCase()
  if (
    normStatus === 'SHIPPED' ||
    normStatus === 'DELIVERED' ||
    normStatus === 'COMPLETED'
  ) {
    return true
  }

  if (order.deliveryStatus) {
    const lowerDelivery = order.deliveryStatus.toLowerCase()
    return PICKED_UP_OR_SHIPPED_KEYWORDS.some((kw) => lowerDelivery.includes(kw))
  }

  return false
}

/**
 * Determines whether a customer is allowed to cancel their order.
 * Customer cancellation is permitted while the order is in PROCESSING,
 * UNLESS the order has already been marked as picked up by courier or shipped.
 */
export function canCustomerCancelOrder(order?: {
  status?: string | null
  deliveryStatus?: string | null
  paymentStatus?: string | null
  createdAt?: string | Date | null
} | null): { allowed: boolean; reason?: string } {
  if (!order) {
    return { allowed: false, reason: 'Invalid order.' }
  }

  const normStatus = (order.status || '').trim().toUpperCase()

  if (normStatus === 'CANCELLED') {
    return { allowed: false, reason: 'This order has already been cancelled.' }
  }

  if (normStatus === 'COMPLETED') {
    return { allowed: false, reason: 'This order has already been completed.' }
  }

  if (isOrderPickedUpOrShipped(order)) {
    return {
      allowed: false,
      reason: 'Order cannot be cancelled because it has already been picked up by the courier or shipped.',
    }
  }

  if (normStatus !== 'PROCESSING') {
    return {
      allowed: false,
      reason: `Order cannot be cancelled at this stage (current status: ${order.status ?? 'unknown'}). Only orders in Processing status can be cancelled.`,
    }
  }

  return { allowed: true }
}

/**
 * Calculates remaining time in the payment processing window.
 */
export function getPaymentTimeRemaining(
  createdAt: Date | string,
  expiryMs: number = getPaymentExpiryMs(),
  now: number = Date.now()
): {
  expired: boolean
  remainingMs: number
  hours: number
  minutes: number
  text: string
} {
  const createdTime = new Date(createdAt).getTime()
  if (Number.isNaN(createdTime)) {
    return { expired: false, remainingMs: 0, hours: 0, minutes: 0, text: '' }
  }

  const expiryTime = createdTime + expiryMs
  const remainingMs = Math.max(0, expiryTime - now)

  if (remainingMs <= 0) {
    return {
      expired: true,
      remainingMs: 0,
      hours: 0,
      minutes: 0,
      text: 'Expired',
    }
  }

  const totalMinutes = Math.floor(remainingMs / (60 * 1000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  const text = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`

  return {
    expired: false,
    remainingMs,
    hours,
    minutes,
    text,
  }
}

