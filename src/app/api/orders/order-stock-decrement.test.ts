import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from './[orderNumber]/route'
import { POST as cancelOrder } from './[orderNumber]/cancel/route'
import * as authHelpers from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { deductInventory, finalizePaidOrder, InsufficientStockError } from '@/lib/purchase-finalization'

vi.mock('@/lib/auth-helpers', () => ({
  getCurrentUser: vi.fn(),
  getCurrentAdmin: vi.fn(),
}))

vi.mock('@/lib/notifications', () => ({
  emitNotification: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/lib/order-email', () => ({
  sendOrderConfirmationEmail: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/lib/prisma', () => {
  const mockTx = {
    order: {
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    product: {
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    voucher: {
      updateMany: vi.fn(),
    },
    cartItem: {
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  }

  return {
    prisma: {
      order: {
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      product: {
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      adminLog: {
        create: vi.fn().mockResolvedValue({}),
      },
      $transaction: vi.fn(async (cb) => cb(mockTx)),
      _mockTx: mockTx,
    },
  }
})

describe('Product Stock Decrement Upon Payment Confirmation', () => {
  const mockAdmin = {
    id: 'admin_1',
    email: 'admin@repixl.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'ADMIN',
  }

  const mockUser = {
    id: 'user_1',
    email: 'customer@repixl.com',
    firstName: 'Customer',
    lastName: 'User',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authHelpers.getCurrentAdmin).mockResolvedValue(mockAdmin as any)
    vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(mockUser as any)
  })

  describe('deductInventory logic', () => {
    it('decrements stock atomically using gte check and decrement for single item', async () => {
      const { _mockTx } = prisma as any
      _mockTx.product.updateMany.mockResolvedValue({ count: 1 })

      await deductInventory(_mockTx, [{ productId: 'prod_1', quantity: 2 }])

      expect(_mockTx.product.updateMany).toHaveBeenCalledWith({
        where: { id: 'prod_1', stock: { gte: 2 } },
        data: { stock: { decrement: 2 } },
      })
    })

    it('decrements stock for multiple items in stable sorted order', async () => {
      const { _mockTx } = prisma as any
      _mockTx.product.updateMany.mockResolvedValue({ count: 1 })

      await deductInventory(_mockTx, [
        { productId: 'prod_b', quantity: 1 },
        { productId: 'prod_a', quantity: 3 },
      ])

      expect(_mockTx.product.updateMany).toHaveBeenNthCalledWith(1, {
        where: { id: 'prod_a', stock: { gte: 3 } },
        data: { stock: { decrement: 3 } },
      })
      expect(_mockTx.product.updateMany).toHaveBeenNthCalledWith(2, {
        where: { id: 'prod_b', stock: { gte: 1 } },
        data: { stock: { decrement: 1 } },
      })
    })

    it('throws InsufficientStockError when product stock is less than purchase quantity', async () => {
      const { _mockTx } = prisma as any
      _mockTx.product.updateMany.mockResolvedValue({ count: 0 })

      await expect(
        deductInventory(_mockTx, [{ productId: 'prod_out_of_stock', quantity: 5 }])
      ).rejects.toThrow(InsufficientStockError)
    })
  })

  describe('finalizePaidOrder function', () => {
    it('marks order as PAID and decrements database stock by item quantities', async () => {
      const { _mockTx } = prisma as any
      _mockTx.order.updateMany.mockResolvedValue({ count: 1 })
      _mockTx.order.findUniqueOrThrow.mockResolvedValue({
        id: 'ord_1',
        orderNumber: 'RPX-PAID-1',
        paymentStatus: 'PAID',
        userId: 'user_1',
        items: [
          { productId: 'prod_1', quantity: 2, price: 5000 },
          { productId: 'prod_2', quantity: 1, price: 10000 },
        ],
        user: { email: 'customer@repixl.com' },
      })
      _mockTx.product.updateMany.mockResolvedValue({ count: 1 })
      _mockTx.cartItem.updateMany.mockResolvedValue({ count: 1 })
      _mockTx.cartItem.deleteMany.mockResolvedValue({ count: 1 })

      const result = await finalizePaidOrder('RPX-PAID-1')

      expect(result).toBe(true)
      expect(_mockTx.order.updateMany).toHaveBeenCalledWith({
        where: {
          orderNumber: 'RPX-PAID-1',
          paymentStatus: 'PENDING',
          status: 'PROCESSING',
        },
        data: { paymentStatus: 'PAID' },
      })
      expect(_mockTx.product.updateMany).toHaveBeenCalledWith({
        where: { id: 'prod_1', stock: { gte: 2 } },
        data: { stock: { decrement: 2 } },
      })
      expect(_mockTx.product.updateMany).toHaveBeenCalledWith({
        where: { id: 'prod_2', stock: { gte: 1 } },
        data: { stock: { decrement: 1 } },
      })
    })

    it('is idempotent: returns false without re-decrementing stock if order is already PAID', async () => {
      const { _mockTx } = prisma as any
      // Order update returns 0 because paymentStatus is already PAID
      _mockTx.order.updateMany.mockResolvedValue({ count: 0 })

      const result = await finalizePaidOrder('RPX-ALREADY-PAID')

      expect(result).toBe(false)
      expect(_mockTx.product.updateMany).not.toHaveBeenCalled()
    })
  })

  describe('Admin Order PATCH /api/orders/[orderNumber] — Payment Confirmation', () => {
    it('admin marking payment completed decrements product stock and updates paymentStatus', async () => {
      const { _mockTx } = prisma as any
      _mockTx.order.updateMany.mockResolvedValue({ count: 1 })
      _mockTx.order.findUniqueOrThrow.mockResolvedValue({
        id: 'ord_1',
        orderNumber: 'RPX-ADMIN-PAID',
        paymentStatus: 'PAID',
        userId: 'user_1',
        items: [{ productId: 'camera_lens', quantity: 3, price: 15000 }],
        user: { email: 'customer@repixl.com' },
      })
      _mockTx.product.updateMany.mockResolvedValue({ count: 1 })
      _mockTx.cartItem.updateMany.mockResolvedValue({ count: 1 })
      _mockTx.cartItem.deleteMany.mockResolvedValue({ count: 1 })

      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: 'ord_1',
        orderNumber: 'RPX-ADMIN-PAID',
        status: 'PROCESSING',
        paymentStatus: 'PENDING',
        createdAt: new Date(),
        items: [{ productId: 'camera_lens', quantity: 3, price: 15000 }],
        user: { id: 'user_1', email: 'customer@repixl.com', firstName: 'Customer', lastName: 'User' },
      } as any)

      vi.mocked(prisma.order.findUniqueOrThrow).mockResolvedValue({
        id: 'ord_1',
        orderNumber: 'RPX-ADMIN-PAID',
        status: 'PROCESSING',
        paymentStatus: 'PAID',
        items: [{ productId: 'camera_lens', quantity: 3, price: 15000 }],
        user: { id: 'user_1', email: 'customer@repixl.com', firstName: 'Customer', lastName: 'User' },
      } as any)

      const req = new NextRequest('http://localhost/api/orders/RPX-ADMIN-PAID', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markPaymentCompleted: true }),
      })

      const res = await PATCH(req, { params: { orderNumber: 'RPX-ADMIN-PAID' } })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.paymentStatus).toBe('PAID')
      expect(_mockTx.product.updateMany).toHaveBeenCalledWith({
        where: { id: 'camera_lens', stock: { gte: 3 } },
        data: { stock: { decrement: 3 } },
      })
    })

    it('rejects payment completion with 409 if stock is insufficient', async () => {
      const { _mockTx } = prisma as any
      _mockTx.order.updateMany.mockResolvedValue({ count: 1 })
      _mockTx.order.findUniqueOrThrow.mockResolvedValue({
        id: 'ord_1',
        orderNumber: 'RPX-OUT-OF-STOCK',
        paymentStatus: 'PAID',
        userId: 'user_1',
        items: [{ productId: 'rare_camera', quantity: 1, price: 50000 }],
        user: { email: 'customer@repixl.com' },
      })
      // Stock update fails because stock < 1
      _mockTx.product.updateMany.mockResolvedValue({ count: 0 })

      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: 'ord_1',
        orderNumber: 'RPX-OUT-OF-STOCK',
        status: 'PROCESSING',
        paymentStatus: 'PENDING',
        createdAt: new Date(),
        items: [{ productId: 'rare_camera', quantity: 1, price: 50000 }],
        user: { id: 'user_1', email: 'customer@repixl.com', firstName: 'Customer', lastName: 'User' },
      } as any)

      const req = new NextRequest('http://localhost/api/orders/RPX-OUT-OF-STOCK', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markPaymentCompleted: true }),
      })

      const res = await PATCH(req, { params: { orderNumber: 'RPX-OUT-OF-STOCK' } })
      const json = await res.json()

      expect(res.status).toBe(409)
      expect(json.error).toContain('Stock is no longer available')
    })

    it('restores stock when admin cancels an already PAID order', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: 'ord_paid',
        orderNumber: 'RPX-CANCEL-PAID',
        status: 'PROCESSING',
        paymentStatus: 'PAID',
        createdAt: new Date(),
        items: [{ productId: 'canon_f1', quantity: 2 }],
        user: { id: 'user_1', email: 'customer@repixl.com', firstName: 'Customer', lastName: 'User' },
      } as any)

      vi.mocked(prisma.order.update).mockResolvedValue({
        id: 'ord_paid',
        orderNumber: 'RPX-CANCEL-PAID',
        status: 'CANCELLED',
        paymentStatus: 'PAID',
        items: [{ productId: 'canon_f1', quantity: 2 }],
        user: { id: 'user_1', email: 'customer@repixl.com', firstName: 'Customer', lastName: 'User' },
      } as any)

      const req = new NextRequest('http://localhost/api/orders/RPX-CANCEL-PAID', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })

      const res = await PATCH(req, { params: { orderNumber: 'RPX-CANCEL-PAID' } })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.status).toBe('CANCELLED')
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'canon_f1' },
        data: { stock: { increment: 2 } },
      })
    })
  })

  describe('Customer Order Cancellation — Stock Restoration', () => {
    it('restores stock when customer cancels an order that was PAID', async () => {
      const { _mockTx } = prisma as any

      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: 'ord_cust_paid',
        userId: 'user_1',
        orderNumber: 'RPX-CUST-PAID',
        status: 'PROCESSING',
        paymentStatus: 'PAID',
        items: [{ productId: 'nikon_fm2', quantity: 1 }],
      } as any)

      _mockTx.order.update.mockResolvedValue({
        id: 'ord_cust_paid',
        status: 'CANCELLED',
      })
      _mockTx.product.update.mockResolvedValue({})

      const req = new NextRequest('http://localhost/api/orders/RPX-CUST-PAID/cancel', {
        method: 'POST',
      })

      const res = await cancelOrder(req, { params: { orderNumber: 'RPX-CUST-PAID' } })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.status).toBe('CANCELLED')
      expect(_mockTx.product.update).toHaveBeenCalledWith({
        where: { id: 'nikon_fm2' },
        data: { stock: { increment: 1 } },
      })
    })

    it('does not increment stock when customer cancels an unpaid PENDING order', async () => {
      const { _mockTx } = prisma as any

      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: 'ord_cust_pending',
        userId: 'user_1',
        orderNumber: 'RPX-CUST-PENDING',
        status: 'PROCESSING',
        paymentStatus: 'PENDING',
        items: [{ productId: 'nikon_fm2', quantity: 1 }],
      } as any)

      _mockTx.order.update.mockResolvedValue({
        id: 'ord_cust_pending',
        status: 'CANCELLED',
      })

      const req = new NextRequest('http://localhost/api/orders/RPX-CUST-PENDING/cancel', {
        method: 'POST',
      })

      const res = await cancelOrder(req, { params: { orderNumber: 'RPX-CUST-PENDING' } })
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.status).toBe('CANCELLED')
      expect(_mockTx.product.update).not.toHaveBeenCalled()
    })

    it('rejects cancellation with 409 when order has already been SHIPPED', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: 'ord_cust_shipped',
        userId: 'user_1',
        orderNumber: 'RPX-CUST-SHIPPED',
        status: 'SHIPPED',
        deliveryStatus: 'In Transit',
        paymentStatus: 'PAID',
        items: [{ productId: 'nikon_fm2', quantity: 1 }],
      } as any)

      const req = new NextRequest('http://localhost/api/orders/RPX-CUST-SHIPPED/cancel', {
        method: 'POST',
      })

      const res = await cancelOrder(req, { params: { orderNumber: 'RPX-CUST-SHIPPED' } })
      const json = await res.json()

      expect(res.status).toBe(409)
      expect(json.error).toContain('already been picked up by the courier or shipped')
    })

    it('rejects cancellation with 409 when order deliveryStatus indicates courier pickup', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: 'ord_cust_transit',
        userId: 'user_1',
        orderNumber: 'RPX-CUST-TRANSIT',
        status: 'PROCESSING',
        deliveryStatus: 'Picked Up by Courier',
        paymentStatus: 'PAID',
        items: [{ productId: 'nikon_fm2', quantity: 1 }],
      } as any)

      const req = new NextRequest('http://localhost/api/orders/RPX-CUST-TRANSIT/cancel', {
        method: 'POST',
      })

      const res = await cancelOrder(req, { params: { orderNumber: 'RPX-CUST-TRANSIT' } })
      const json = await res.json()

      expect(res.status).toBe(409)
      expect(json.error).toContain('already been picked up by the courier or shipped')
    })
  })
})


