import { describe, expect, it } from 'vitest'
import { OrderStatus } from '@prisma/client'
import { buildOrderStatusUpdate } from './order-status'

describe('buildOrderStatusUpdate', () => {
  it('sets deliveredAt when an order is marked delivered', () => {
    const result = buildOrderStatusUpdate(
      { status: OrderStatus.SHIPPED, deliveredAt: null, completedAt: null },
      OrderStatus.DELIVERED
    )

    expect(result.status).toBe(OrderStatus.DELIVERED)
    expect(result.deliveredAt).toBeInstanceOf(Date)
  })

  it('sets completedAt when an order is marked completed', () => {
    const result = buildOrderStatusUpdate(
      { status: OrderStatus.DELIVERED, deliveredAt: new Date('2024-01-15'), completedAt: null },
      OrderStatus.COMPLETED
    )

    expect(result.status).toBe(OrderStatus.COMPLETED)
    expect(result.completedAt).toBeInstanceOf(Date)
  })

  it('preserves a timestamp already recorded for the target state', () => {
    const existing = new Date('2024-02-02T12:00:00.000Z')
    const result = buildOrderStatusUpdate(
      { status: OrderStatus.SHIPPED, deliveredAt: existing, completedAt: null },
      OrderStatus.DELIVERED
    )

    expect(result.deliveredAt).toEqual(existing)
  })
})
