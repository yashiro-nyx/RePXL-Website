import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from './[orderNumber]/route'
import { POST as updateTracking } from '../admin/update-tracking/route'
import * as authHelpers from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/auth-helpers', () => ({
  getCurrentUser: vi.fn(),
  getCurrentAdmin: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    adminLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}))

vi.mock('@/lib/notifications', () => ({
  emitNotification: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/lib/purchase-finalization', () => ({
  finalizePaidOrder: vi.fn().mockResolvedValue(true),
}))

describe('Order Payment Guard — Admin Status Editing Restrictions', () => {
  const mockAdmin = {
    id: 'admin_1',
    email: 'admin@repixl.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'ADMIN',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authHelpers.getCurrentAdmin).mockResolvedValue(mockAdmin as any)
  })

  it('rejects order status update when order paymentStatus is PENDING', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: 'ord_1',
      orderNumber: 'RPX-1234',
      status: 'PROCESSING',
      paymentStatus: 'PENDING',
      createdAt: new Date(),
      items: [],
      user: { id: 'usr_1', email: 'cust@repxl.com' },
    } as any)

    const req = new NextRequest('http://localhost/api/orders/RPX-1234', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'SHIPPED' }),
    })

    const res = await PATCH(req, { params: { orderNumber: 'RPX-1234' } })
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toContain('Order status cannot be edited until payment has been marked completed')
    expect(prisma.order.update).not.toHaveBeenCalled()
  })

  it('rejects order status update when order payment processing has expired', async () => {
    const expiredDate = new Date(Date.now() - 48 * 60 * 60 * 1000) // 48h ago
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: 'ord_1',
      orderNumber: 'RPX-1234',
      status: 'PROCESSING',
      paymentStatus: 'PENDING',
      createdAt: expiredDate,
      items: [],
      user: { id: 'usr_1', email: 'cust@repxl.com' },
    } as any)

    const req = new NextRequest('http://localhost/api/orders/RPX-1234', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'SHIPPED' }),
    })

    const res = await PATCH(req, { params: { orderNumber: 'RPX-1234' } })
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toContain('Order payment processing has expired')
  })

  it('allows order status update when order paymentStatus is PAID', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: 'ord_1',
      orderNumber: 'RPX-1234',
      status: 'PROCESSING',
      paymentStatus: 'PAID',
      createdAt: new Date(),
      deliveredAt: null,
      completedAt: null,
      items: [],
      user: { id: 'usr_1', email: 'cust@repxl.com', firstName: 'Cust', lastName: 'Omer' },
    } as any)

    vi.mocked(prisma.order.update).mockResolvedValue({
      id: 'ord_1',
      orderNumber: 'RPX-1234',
      status: 'SHIPPED',
      paymentStatus: 'PAID',
      items: [],
      user: { id: 'usr_1', email: 'cust@repxl.com', firstName: 'Cust', lastName: 'Omer' },
    } as any)

    const req = new NextRequest('http://localhost/api/orders/RPX-1234', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'SHIPPED' }),
    })

    const res = await PATCH(req, { params: { orderNumber: 'RPX-1234' } })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.status).toBe('SHIPPED')
    expect(prisma.order.update).toHaveBeenCalled()
  })

  it('allows admin to mark payment as completed', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: 'ord_1',
      orderNumber: 'RPX-1234',
      status: 'PROCESSING',
      paymentStatus: 'PENDING',
      createdAt: new Date(),
      paymentIntentId: null,
      paymentSessionId: null,
      items: [],
      user: { id: 'usr_1', email: 'cust@repxl.com', firstName: 'Cust', lastName: 'Omer' },
    } as any)

    vi.mocked(prisma.order.findUniqueOrThrow).mockResolvedValue({
      id: 'ord_1',
      orderNumber: 'RPX-1234',
      status: 'PROCESSING',
      paymentStatus: 'PAID',
      items: [],
      user: { id: 'usr_1', email: 'cust@repxl.com', firstName: 'Cust', lastName: 'Omer' },
    } as any)

    const req = new NextRequest('http://localhost/api/orders/RPX-1234', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markPaymentCompleted: true }),
    })

    const res = await PATCH(req, { params: { orderNumber: 'RPX-1234' } })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orderNumber: 'RPX-1234' },
        data: expect.objectContaining({ paymentStatus: 'PAID' }),
      })
    )
  })

  it('rejects delivery tracking update when order is unpaid or pending', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: 'ord_1',
      orderNumber: 'RPX-1234',
      status: 'PROCESSING',
      paymentStatus: 'PENDING',
      createdAt: new Date(),
    } as any)

    const req = new NextRequest('http://localhost/api/admin/update-tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderNumber: 'RPX-1234', step: 'transit' }),
    })

    const res = await updateTracking(req)
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toContain('Cannot update delivery tracking for an unpaid or pending order')
    expect(prisma.order.updateMany).not.toHaveBeenCalled()
  })
})

