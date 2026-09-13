import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'
import * as authHelpers from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import * as purchaseFinalization from '@/lib/purchase-finalization'

vi.mock('@/lib/auth-helpers', () => ({
  getCurrentUser: vi.fn(),
  getCurrentAdmin: vi.fn(),
}))

vi.mock('@/lib/purchase-finalization', () => ({
  deductInventory: vi.fn().mockResolvedValue(undefined),
  InsufficientStockError: class InsufficientStockError extends Error {},
}))

vi.mock('@/lib/order-payment-expiry', () => ({
  expireOverduePendingOrders: vi.fn().mockResolvedValue(0),
}))

vi.mock('@/lib/prisma', () => {
  const mockTx = {
    order: {
      create: vi.fn(),
    },
    voucher: {
      update: vi.fn(),
    },
    cartItem: {
      deleteMany: vi.fn(),
    },
  }

  return {
    prisma: {
      cartItem: {
        findMany: vi.fn(),
      },
      voucher: {
        findUnique: vi.fn(),
      },
      order: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(mockTx)),
      _mockTx: mockTx,
    },
  }
})

describe('POST /api/orders — Built-in Order Placement', () => {
  const mockUser = {
    id: 'user_123',
    email: 'test@repxl.com',
    firstName: 'Juan',
    lastName: 'Dela Cruz',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(mockUser as any)
  })

  it('rejects order placement when user is not authenticated', async () => {
    vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Juan Dela Cruz',
        address: '123 Main St',
        city: 'Manila',
        postalCode: '1000',
        courierName: 'J&T Express',
        courierEstimate: '2-3 days',
        paymentMethod: 'Credit / Debit Card',
        shippingCost: 150,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('filters cart items by selectedProductIds and deletes only purchased items', async () => {
    const mockCart = [
      {
        id: 'cart_item_1',
        productId: 'prod_1',
        quantity: 1,
        product: { id: 'prod_1', slug: 'canon-ae-1', name: 'Canon AE-1', price: 12000, stock: 5 },
      },
    ]

    vi.mocked(prisma.cartItem.findMany).mockResolvedValue(mockCart as any)

    const mockCreatedOrder = {
      id: 'order_1',
      orderNumber: 'RPX-TEST-1',
      status: 'PROCESSING',
      paymentStatus: 'PENDING',
      total: 12150,
      items: mockCart,
    }

    const { _mockTx } = prisma as any
    _mockTx.order.create.mockResolvedValue(mockCreatedOrder)
    _mockTx.cartItem.deleteMany.mockResolvedValue({ count: 1 })

    const req = new NextRequest('http://localhost/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Juan Dela Cruz',
        address: '123 Main St',
        city: 'Manila',
        postalCode: '1000',
        courierName: 'J&T Express',
        courierEstimate: '2-3 days',
        paymentMethod: 'Credit / Debit Card',
        shippingCost: 150,
        selectedProductIds: ['canon-ae-1'],
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(201)

    // Verify cart query filtered by selectedProductIds
    expect(prisma.cartItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user_123',
          product: { slug: { in: ['canon-ae-1'] } },
        }),
      })
    )

    // Verify inventory deducted
    expect(purchaseFinalization.deductInventory).toHaveBeenCalledWith(
      expect.anything(),
      mockCart
    )

    // Verify only purchased cart items are deleted
    expect(_mockTx.cartItem.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['cart_item_1'] } },
    })
  })

  it('rejects order when stock is insufficient', async () => {
    const mockCart = [
      {
        id: 'cart_item_1',
        productId: 'prod_1',
        quantity: 3,
        product: { id: 'prod_1', slug: 'canon-ae-1', name: 'Canon AE-1', price: 12000, stock: 1 },
      },
    ]

    vi.mocked(prisma.cartItem.findMany).mockResolvedValue(mockCart as any)

    const req = new NextRequest('http://localhost/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Juan Dela Cruz',
        address: '123 Main St',
        city: 'Manila',
        postalCode: '1000',
        courierName: 'J&T Express',
        courierEstimate: '2-3 days',
        paymentMethod: 'Credit / Debit Card',
        shippingCost: 150,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Insufficient stock')
  })
})

