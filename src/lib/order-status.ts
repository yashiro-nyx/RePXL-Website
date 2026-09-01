import type { OrderStatus } from '@prisma/client'

export interface OrderStatusSnapshot {
  status: OrderStatus
  deliveredAt: Date | null
  completedAt: Date | null
}

export function buildOrderStatusUpdate(
  current: OrderStatusSnapshot,
  nextStatus: OrderStatus
): Pick<OrderStatusSnapshot, 'status'> & {
  deliveredAt?: Date | null
  completedAt?: Date | null
} {
  const data: Pick<OrderStatusSnapshot, 'status'> & {
    deliveredAt?: Date | null
    completedAt?: Date | null
  } = { status: nextStatus }

  if (nextStatus === 'DELIVERED') {
    data.deliveredAt = current.deliveredAt ?? new Date()
  }

  if (nextStatus === 'COMPLETED') {
    data.completedAt = current.completedAt ?? new Date()
  }

  return data
}
