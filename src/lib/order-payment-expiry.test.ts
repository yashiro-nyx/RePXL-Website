import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getPaymentExpiryMs,
  isPaymentProcessing,
  getPaymentExpiryDate,
  isPaymentExpired,
  canAdminEditOrderStatus,
  DEFAULT_PAYMENT_EXPIRY_HOURS,
} from './order-payment-expiry'

describe('order-payment-expiry', () => {
  const originalEnv = process.env.ORDER_PAYMENT_EXPIRY_HOURS

  afterEach(() => {
    process.env.ORDER_PAYMENT_EXPIRY_HOURS = originalEnv
  })

  describe('getPaymentExpiryMs', () => {
    it('returns default 24 hours in ms when env is not set', () => {
      delete process.env.ORDER_PAYMENT_EXPIRY_HOURS
      expect(getPaymentExpiryMs()).toBe(DEFAULT_PAYMENT_EXPIRY_HOURS * 60 * 60 * 1000)
    })

    it('parses valid environment variable in hours', () => {
      process.env.ORDER_PAYMENT_EXPIRY_HOURS = '12'
      expect(getPaymentExpiryMs()).toBe(12 * 60 * 60 * 1000)
    })

    it('falls back to default if env is invalid or non-positive', () => {
      process.env.ORDER_PAYMENT_EXPIRY_HOURS = 'invalid'
      expect(getPaymentExpiryMs()).toBe(DEFAULT_PAYMENT_EXPIRY_HOURS * 60 * 60 * 1000)

      process.env.ORDER_PAYMENT_EXPIRY_HOURS = '-5'
      expect(getPaymentExpiryMs()).toBe(DEFAULT_PAYMENT_EXPIRY_HOURS * 60 * 60 * 1000)
    })
  })

  describe('isPaymentProcessing', () => {
    it('returns true when paymentStatus is PENDING and status is PROCESSING', () => {
      expect(isPaymentProcessing({ paymentStatus: 'PENDING', status: 'PROCESSING' })).toBe(true)
    })

    it('returns true when status is omitted but paymentStatus is PENDING', () => {
      expect(isPaymentProcessing({ paymentStatus: 'PENDING' })).toBe(true)
    })

    it('returns false when paymentStatus is PAID', () => {
      expect(isPaymentProcessing({ paymentStatus: 'PAID', status: 'PROCESSING' })).toBe(false)
    })

    it('returns false when paymentStatus is FAILED or REFUNDED', () => {
      expect(isPaymentProcessing({ paymentStatus: 'FAILED', status: 'CANCELLED' })).toBe(false)
      expect(isPaymentProcessing({ paymentStatus: 'REFUNDED', status: 'COMPLETED' })).toBe(false)
    })

    it('returns false when status is CANCELLED even if paymentStatus is PENDING', () => {
      expect(isPaymentProcessing({ paymentStatus: 'PENDING', status: 'CANCELLED' })).toBe(false)
    })
  })

  describe('getPaymentExpiryDate', () => {
    it('calculates the correct expiry timestamp', () => {
      const now = new Date('2026-09-13T10:00:00Z')
      const expiry = getPaymentExpiryDate(now, 24 * 60 * 60 * 1000)
      expect(expiry.toISOString()).toBe('2026-09-14T10:00:00.000Z')
    })
  })

  describe('isPaymentExpired', () => {
    const baseDate = new Date('2026-09-13T10:00:00Z').getTime()
    const expiryMs = 24 * 60 * 60 * 1000 // 24 hours

    it('returns false if within the expiry window', () => {
      const order = {
        createdAt: new Date(baseDate),
        paymentStatus: 'PENDING',
        status: 'PROCESSING',
      }
      const justBefore = baseDate + expiryMs - 1000
      expect(isPaymentExpired(order, justBefore, expiryMs)).toBe(false)
    })

    it('returns true if at or beyond the expiry window', () => {
      const order = {
        createdAt: new Date(baseDate),
        paymentStatus: 'PENDING',
        status: 'PROCESSING',
      }
      const exactlyAt = baseDate + expiryMs
      expect(isPaymentExpired(order, exactlyAt, expiryMs)).toBe(true)

      const afterExpiry = baseDate + expiryMs + 5000
      expect(isPaymentExpired(order, afterExpiry, expiryMs)).toBe(true)
    })

    it('returns false if order is already PAID even if created long ago', () => {
      const order = {
        createdAt: new Date(baseDate - 100 * expiryMs),
        paymentStatus: 'PAID',
        status: 'PROCESSING',
      }
      expect(isPaymentExpired(order, baseDate, expiryMs)).toBe(false)
    })
  })

  describe('canAdminEditOrderStatus', () => {
    it('allows editing order status when payment is PAID', () => {
      const result = canAdminEditOrderStatus({
        paymentStatus: 'PAID',
        status: 'PROCESSING',
      })
      expect(result.allowed).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('blocks editing order status when payment is PENDING (unpaid/processing)', () => {
      const result = canAdminEditOrderStatus({
        paymentStatus: 'PENDING',
        status: 'PROCESSING',
      })
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Order status cannot be edited until payment has been marked completed')
    })

    it('blocks editing order status when payment is FAILED', () => {
      const result = canAdminEditOrderStatus({
        paymentStatus: 'FAILED',
        status: 'CANCELLED',
      })
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('payment status: FAILED')
    })

    it('blocks editing order status when payment is REFUNDED', () => {
      const result = canAdminEditOrderStatus({
        paymentStatus: 'REFUNDED',
        status: 'COMPLETED',
      })
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('payment status: REFUNDED')
    })

    it('specifically detects and blocks expired payment processing orders', () => {
      const pastDate = new Date(Date.now() - 48 * 60 * 60 * 1000) // 48h ago
      const result = canAdminEditOrderStatus({
        createdAt: pastDate,
        paymentStatus: 'PENDING',
        status: 'PROCESSING',
      })
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Order payment processing has expired')
    })
  })

  describe('expireOverduePendingOrders', () => {
    it('returns 0 if no overdue orders are found', async () => {
      const mockPrisma = {
        order: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      } as any

      const { expireOverduePendingOrders } = await import('./order-payment-expiry')
      const count = await expireOverduePendingOrders(mockPrisma)
      expect(count).toBe(0)
    })

    it('expires overdue orders and restores stock for direct orders', async () => {
      const mockOrder = {
        id: 'ord_123',
        orderNumber: 'RPX-TEST-1',
        paymentStatus: 'PENDING',
        status: 'PROCESSING',
        paymentIntentId: null,
        paymentSessionId: null,
        items: [{ productId: 'prod_1', quantity: 2 }],
      }

      const mockTx = {
        product: {
          update: vi.fn().mockResolvedValue({}),
        },
        order: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      }

      const mockPrisma = {
        order: {
          findMany: vi.fn().mockResolvedValue([mockOrder]),
        },
        $transaction: vi.fn().mockImplementation(async (cb) => cb(mockTx)),
      } as any

      const { expireOverduePendingOrders } = await import('./order-payment-expiry')
      const count = await expireOverduePendingOrders(mockPrisma)

      expect(count).toBe(1)
      expect(mockTx.product.update).toHaveBeenCalledWith({
        where: { id: 'prod_1' },
        data: { stock: { increment: 2 } },
      })
      expect(mockTx.order.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'ord_123',
          paymentStatus: 'PENDING',
          status: 'PROCESSING',
        },
        data: {
          paymentStatus: 'FAILED',
          status: 'CANCELLED',
          updatedAt: expect.any(Date),
        },
      })
    })
  })
})
