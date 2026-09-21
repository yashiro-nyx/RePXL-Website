import type { OrderStatus } from '@prisma/client'

export interface OrderStatusSnapshot {
  status: OrderStatus
  deliveredAt: Date | null
  completedAt: Date | null
  deliveryStatus?: string | null
  trackingProgress?: number | null
  trackingDescription?: string | null
  trackingNumber?: string | null
  orderNumber?: string | null
}

export function buildOrderStatusUpdate(
  current: OrderStatusSnapshot,
  nextStatus: OrderStatus | string,
  targetDeliveryStatus?: string | null
): Pick<OrderStatusSnapshot, 'status'> & {
  deliveredAt?: Date | null
  completedAt?: Date | null
  deliveryStatus: string
  trackingProgress: number
  trackingDescription: string
  trackingNumber?: string
} {
  const normNext = typeof nextStatus === 'string' ? nextStatus.trim().toUpperCase() : ''
  const normTargetDeliv = typeof targetDeliveryStatus === 'string' ? targetDeliveryStatus.trim().toLowerCase() : ''

  let resolvedStatus: OrderStatus
  let deliveryStatus: string
  let trackingProgress: number
  let trackingDescription: string

  if (normNext === 'OUT_FOR_DELIVERY' || normTargetDeliv === 'out for delivery') {
    resolvedStatus = 'SHIPPED'
    deliveryStatus = 'Out for Delivery'
    trackingProgress = 75
    trackingDescription = 'Your package is out for delivery and will arrive today.'
  } else if (normNext === 'IN_TRANSIT' || normTargetDeliv === 'in transit') {
    resolvedStatus = 'SHIPPED'
    deliveryStatus = 'In Transit'
    trackingProgress = 50
    trackingDescription = 'Your camera has left the warehouse and is on its way to you.'
  } else if (normNext === 'SHIPPED') {
    resolvedStatus = 'SHIPPED'
    if (current.deliveryStatus === 'Out for Delivery' && normTargetDeliv !== 'in transit') {
      deliveryStatus = 'Out for Delivery'
      trackingProgress = 75
      trackingDescription = 'Your package is out for delivery and will arrive today.'
    } else {
      deliveryStatus = 'In Transit'
      trackingProgress = 50
      trackingDescription = 'Your camera has left the warehouse and is on its way to you.'
    }
  } else if (normNext === 'DELIVERED' || normTargetDeliv === 'delivered') {
    resolvedStatus = 'DELIVERED'
    deliveryStatus = 'Delivered'
    trackingProgress = 100
    trackingDescription = 'Your camera has been delivered. Enjoy your new camera!'
  } else if (normNext === 'COMPLETED') {
    resolvedStatus = 'COMPLETED'
    deliveryStatus = 'Delivered'
    trackingProgress = 100
    trackingDescription = 'Your camera has been delivered and order is completed. Enjoy your new camera!'
  } else if (normNext === 'CANCELLED' || normTargetDeliv === 'cancelled') {
    resolvedStatus = 'CANCELLED'
    deliveryStatus = current.deliveryStatus === 'COD Request Declined' ? 'COD Request Declined' : 'Cancelled'
    trackingProgress = 0
    trackingDescription = 'Order has been cancelled.'
  } else {
    // PROCESSING / Default
    resolvedStatus = 'PROCESSING'
    if (
      current.deliveryStatus === 'Pending COD Approval' ||
      current.deliveryStatus === 'COD Approval Requested'
    ) {
      deliveryStatus = current.deliveryStatus
      trackingProgress = 10
      trackingDescription = 'Cash on Delivery order placed. Awaiting store confirmation.'
    } else {
      deliveryStatus = 'Order Placed'
      trackingProgress = 25
      trackingDescription = 'We are preparing your camera gear and checking lens optics.'
    }
  }

  const data: Pick<OrderStatusSnapshot, 'status'> & {
    deliveredAt?: Date | null
    completedAt?: Date | null
    deliveryStatus: string
    trackingProgress: number
    trackingDescription: string
    trackingNumber?: string
  } = {
    status: resolvedStatus,
    deliveryStatus,
    trackingProgress,
    trackingDescription,
  }

  if (resolvedStatus === 'DELIVERED') {
    data.deliveredAt = current.deliveredAt ?? new Date()
  }

  if (resolvedStatus === 'COMPLETED') {
    data.completedAt = current.completedAt ?? new Date()
    data.deliveredAt = current.deliveredAt ?? new Date()
  }

  if (!current.trackingNumber && current.orderNumber) {
    data.trackingNumber = current.orderNumber
  }

  return data
}
