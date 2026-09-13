import { describe, it, expect } from 'vitest'
import {
  normalizeOrderStatus,
  getOrderStatusLabel,
  getOrderStatusBadgeClass,
  CANONICAL_ORDER_STATUSES,
  ORDER_STATUS_LABELS,
} from './order-status-unified'

describe('order-status-unified', () => {
  it('normalizes various casing formats correctly', () => {
    expect(normalizeOrderStatus('processing')).toBe('PROCESSING')
    expect(normalizeOrderStatus('Processing')).toBe('PROCESSING')
    expect(normalizeOrderStatus('PROCESSING')).toBe('PROCESSING')

    expect(normalizeOrderStatus('shipped')).toBe('SHIPPED')
    expect(normalizeOrderStatus('Shipped')).toBe('SHIPPED')

    expect(normalizeOrderStatus('delivered')).toBe('DELIVERED')
    expect(normalizeOrderStatus('Delivered')).toBe('DELIVERED')

    expect(normalizeOrderStatus('completed')).toBe('COMPLETED')
    expect(normalizeOrderStatus('Completed')).toBe('COMPLETED')

    expect(normalizeOrderStatus('cancelled')).toBe('CANCELLED')
    expect(normalizeOrderStatus('Cancelled')).toBe('CANCELLED')
    expect(normalizeOrderStatus('canceled')).toBe('CANCELLED')

    expect(normalizeOrderStatus(null)).toBe('PROCESSING')
    expect(normalizeOrderStatus(undefined)).toBe('PROCESSING')
    expect(normalizeOrderStatus('UNKNOWN_STATUS')).toBe('PROCESSING')
  })

  it('returns appropriate human-readable labels', () => {
    for (const status of CANONICAL_ORDER_STATUSES) {
      expect(getOrderStatusLabel(status)).toBe(ORDER_STATUS_LABELS[status])
      expect(getOrderStatusLabel(status.toLowerCase())).toBe(ORDER_STATUS_LABELS[status])
    }
  })

  it('returns valid badge classes for all statuses', () => {
    for (const status of CANONICAL_ORDER_STATUSES) {
      const cls = getOrderStatusBadgeClass(status)
      expect(cls).toBeDefined()
      expect(cls.length).toBeGreaterThan(0)
    }
  })
})

