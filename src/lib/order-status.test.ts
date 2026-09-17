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

  it('automatically sets deliveryStatus to In Transit and progress to 50 when marked SHIPPED', () => {
    const result = buildOrderStatusUpdate(
      { status: OrderStatus.PROCESSING, deliveredAt: null, completedAt: null, orderNumber: 'RPX-1001' },
      OrderStatus.SHIPPED
    )

    expect(result.status).toBe(OrderStatus.SHIPPED)
    expect(result.deliveryStatus).toBe('In Transit')
    expect(result.trackingProgress).toBe(50)
    expect(result.trackingNumber).toBe('RPX-1001')
  })

  it('automatically sets deliveryStatus to Delivered and progress to 100 when marked DELIVERED', () => {
    const result = buildOrderStatusUpdate(
      { status: OrderStatus.SHIPPED, deliveredAt: null, completedAt: null },
      OrderStatus.DELIVERED
    )

    expect(result.deliveryStatus).toBe('Delivered')
    expect(result.trackingProgress).toBe(100)
  })

  it('automatically sets deliveryStatus to Cancelled and progress to 0 when marked CANCELLED', () => {
    const result = buildOrderStatusUpdate(
      { status: OrderStatus.PROCESSING, deliveredAt: null, completedAt: null },
      OrderStatus.CANCELLED
    )

    expect(result.deliveryStatus).toBe('Cancelled')
    expect(result.trackingProgress).toBe(0)
  })
})
