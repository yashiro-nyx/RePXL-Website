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
  nextStatus: OrderStatus
): Pick<OrderStatusSnapshot, 'status'> & {
  deliveredAt?: Date | null
  completedAt?: Date | null
  deliveryStatus: string
  trackingProgress: number
  trackingDescription: string
  trackingNumber?: string
} {
  let deliveryStatus: string
  let trackingProgress: number
  let trackingDescription: string

  switch (nextStatus) {
    case 'SHIPPED':
      if (current.deliveryStatus === 'Out for Delivery') {
        deliveryStatus = 'Out for Delivery'
        trackingProgress = 75
        trackingDescription = 'Your package is out for delivery and will arrive today.'
      } else {
        deliveryStatus = 'In Transit'
        trackingProgress = 50
        trackingDescription = 'Your camera has left the warehouse and is on its way to you.'
      }
      break

    case 'DELIVERED':
      deliveryStatus = 'Delivered'
      trackingProgress = 100
      trackingDescription = 'Your camera has been delivered. Enjoy your new camera!'
      break

    case 'COMPLETED':
      deliveryStatus = 'Delivered'
      trackingProgress = 100
      trackingDescription = 'Your camera has been delivered and order is completed. Enjoy your new camera!'
      break

    case 'CANCELLED':
      deliveryStatus = current.deliveryStatus === 'COD Request Declined' ? 'COD Request Declined' : 'Cancelled'
      trackingProgress = 0
      trackingDescription = 'Order has been cancelled.'
      break

    case 'PROCESSING':
    default:
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
      break
  }

  const data: Pick<OrderStatusSnapshot, 'status'> & {
    deliveredAt?: Date | null
    completedAt?: Date | null
  } = { status: nextStatus }
    deliveryStatus: string
    trackingProgress: number
    trackingDescription: string
    trackingNumber?: string
  } = {
    status: nextStatus,
    deliveryStatus,
    trackingProgress,
    trackingDescription,
  }

  if (nextStatus === 'DELIVERED') {
    data.deliveredAt = current.deliveredAt ?? new Date()
  }

  if (nextStatus === 'COMPLETED') {
    data.completedAt = current.completedAt ?? new Date()
    data.deliveredAt = current.deliveredAt ?? new Date()
  }

  if (!current.trackingNumber && current.orderNumber) {
    data.trackingNumber = current.orderNumber
  }

  return data
}
