import { describe, it, expect } from 'vitest'
import {
  normalizeOrderStatus,
  getOrderStatusLabel,
  getOrderStatusBadgeClass,
  CANONICAL_ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  getUnifiedFulfillmentStatus,
  UNIFIED_STATUS_CONFIG,
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

  it('reflects payment state between Order Placed and Payment Processed when in PROCESSING', () => {
    expect(getOrderStatusLabel('PROCESSING', 'PAID')).toBe('Payment Processed')
    expect(getOrderStatusLabel('Processing', 'paid')).toBe('Payment Processed')
    expect(getOrderStatusBadgeClass('PROCESSING', 'PAID')).toContain('text-emerald-400')

    expect(getOrderStatusLabel('PROCESSING', 'PENDING')).toBe('Order Placed')
    expect(getOrderStatusLabel('Processing', 'pending')).toBe('Order Placed')
    expect(getOrderStatusBadgeClass('PROCESSING', 'PENDING')).toContain('text-amber-400')

    // For later stages, canonical status label is preserved
    expect(getOrderStatusLabel('SHIPPED', 'PAID')).toBe('Shipped')
    expect(getOrderStatusLabel('DELIVERED', 'PAID')).toBe('Delivered')
    expect(getOrderStatusLabel('COMPLETED', 'PAID')).toBe('Completed')
  })

  it('resolves unified fulfillment status and badges with deliveryStatus accurately', () => {
    expect(getUnifiedFulfillmentStatus({ status: 'PROCESSING' })).toBe('PROCESSING')
    expect(getUnifiedFulfillmentStatus({ status: 'SHIPPED', deliveryStatus: 'In Transit' })).toBe('IN_TRANSIT')
    expect(getUnifiedFulfillmentStatus({ status: 'SHIPPED', deliveryStatus: 'Out for Delivery' })).toBe('OUT_FOR_DELIVERY')
    expect(getUnifiedFulfillmentStatus({ status: 'DELIVERED' })).toBe('DELIVERED')
    expect(getUnifiedFulfillmentStatus({ status: 'COMPLETED' })).toBe('COMPLETED')
    expect(getUnifiedFulfillmentStatus({ status: 'CANCELLED' })).toBe('CANCELLED')

    // Labels with delivery status
    expect(getOrderStatusLabel('SHIPPED', 'PAID', 'In Transit')).toBe('In Transit')
    expect(getOrderStatusLabel('SHIPPED', 'PAID', 'Out for Delivery')).toBe('Out for Delivery')

    // Badges distinguish In Transit vs Out for Delivery
    expect(getOrderStatusBadgeClass('SHIPPED', 'PAID', 'In Transit')).toContain('text-blue-400')
    expect(getOrderStatusBadgeClass('SHIPPED', 'PAID', 'Out for Delivery')).toContain('text-amber-300')

    // Config matches expected progress percentages
    expect(UNIFIED_STATUS_CONFIG.PROCESSING.progress).toBe(25)
    expect(UNIFIED_STATUS_CONFIG.IN_TRANSIT.progress).toBe(50)
    expect(UNIFIED_STATUS_CONFIG.OUT_FOR_DELIVERY.progress).toBe(75)
    expect(UNIFIED_STATUS_CONFIG.DELIVERED.progress).toBe(100)
    expect(UNIFIED_STATUS_CONFIG.COMPLETED.progress).toBe(100)
    expect(UNIFIED_STATUS_CONFIG.CANCELLED.progress).toBe(0)
  })
})

