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
 * COD orders are not considered in-flight gateway processing sessions.
 */
export function isPaymentProcessing(order: {
  paymentStatus: string
  status?: string
  paymentMethod?: string
}): boolean {
  if (
    order.paymentMethod?.toLowerCase().includes('cash on delivery') ||
    order.paymentMethod?.toLowerCase() === 'cod'
  ) {
    return false
  }
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
 * Cash on Delivery orders never expire under the gateway payment processing window.
 */
export function isPaymentExpired(
  order: {
    createdAt: Date | string
    paymentStatus: string
    status?: string
    paymentMethod?: string
  },
  now: number = Date.now(),
  expiryMs: number = getPaymentExpiryMs()
): boolean {
  if (
    order.paymentMethod?.toLowerCase().includes('cash on delivery') ||
    order.paymentMethod?.toLowerCase() === 'cod'
  ) {
    return false
  }
  if (!isPaymentProcessing(order)) return false
  const createdTime = new Date(order.createdAt).getTime()
  return now - createdTime >= expiryMs
}

/**
 * Validates whether an administrator is permitted to edit an order's status.
 * - Online payment orders require paymentStatus === 'PAID'.
 * - Cash on Delivery orders require administrator approval (deliveryStatus !== 'Pending COD Approval').
 */
export function canAdminEditOrderStatus(order: {
  paymentStatus: string
  status?: string
  createdAt?: Date | string
  paymentMethod?: string
  deliveryStatus?: string
}): { allowed: boolean; reason?: string } {
  const isCod =
    order.paymentMethod?.toLowerCase().includes('cash on delivery') ||
    order.paymentMethod?.toLowerCase() === 'cod'

  if (isCod) {
    if (order.deliveryStatus === 'Pending COD Approval') {
      return {
        allowed: false,
        reason:
          'Cash on Delivery order request must be approved by an administrator before updating status.',
      }
    }
    return { allowed: true }
  }

  if (
    order.createdAt &&
    isPaymentExpired({
      createdAt: order.createdAt,
      paymentStatus: order.paymentStatus,
      status: order.status,
      paymentMethod: order.paymentMethod,
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

