import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockGetCurrentAdmin, mockPrisma, mockEmitNotification } = vi.hoisted(() => ({
  mockGetCurrentAdmin: vi.fn(),
  mockPrisma: {
    user: {
      findMany: vi.fn(),
    },
    adminLog: {
      create: vi.fn(),
    },
  },
  mockEmitNotification: vi.fn(),
}))

vi.mock('@/lib/auth-helpers', () => ({
  getCurrentAdmin: mockGetCurrentAdmin,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/notifications', () => ({
  emitNotification: mockEmitNotification,
}))

import { POST } from './route'

describe('Admin Notifications Broadcast API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCurrentAdmin.mockResolvedValue({
      id: 'admin-1',
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
    })
    mockPrisma.adminLog.create.mockResolvedValue({ id: 'log-1' })
  })

  it('rejects unauthenticated requests with 401', async () => {
    mockGetCurrentAdmin.mockResolvedValue(null)
    const req = new NextRequest('http://localhost:3000/api/admin/notifications/broadcast', {
      method: 'POST',
      body: JSON.stringify({ event: 'PROMOTION' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('rejects invalid event types with 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/notifications/broadcast', {
      method: 'POST',
      body: JSON.stringify({ event: 'ORDER_CONFIRMATION' }), // Not a broadcastable event
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it('broadcasts PROMOTION to active customers and logs action', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'user-1', email: 'alice@example.com', firstName: 'Alice', lastName: 'Smith' },
      { id: 'user-2', email: 'bob@example.com', firstName: 'Bob', lastName: 'Jones' },
    ])

    mockEmitNotification
      .mockResolvedValueOnce({ notificationId: 'notif-1', emailDelivered: true })
      .mockResolvedValueOnce({ notificationId: 'notif-2', emailDelivered: true })

    const req = new NextRequest('http://localhost:3000/api/admin/notifications/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        event: 'PROMOTION',
        subject: 'Flash Sale: 20% Off All CCDs',
        body: 'Use code FLASH20 at checkout!',
        channel: 'BOTH',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.targeted).toBe(2)
    expect(body.data.inAppCreated).toBe(2)
    expect(body.data.emailsSent).toBe(2)
    expect(body.data.suppressed).toBe(0)

    expect(mockEmitNotification).toHaveBeenCalledTimes(2)
    expect(mockPrisma.adminLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'NOTIFICATION_BROADCAST',
          adminId: 'admin-1',
        }),
      })
    )
  })

  it('correctly tracks suppressed/opted-out recipients', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'user-1', email: 'alice@example.com', firstName: 'Alice', lastName: 'Smith' },
      { id: 'user-2', email: 'optout@example.com', firstName: 'Opt', lastName: 'Out' },
    ])

    mockEmitNotification
      .mockResolvedValueOnce({ notificationId: 'notif-1', emailDelivered: true })
      .mockResolvedValueOnce({ notificationId: '', emailDelivered: false }) // suppressed

    const req = new NextRequest('http://localhost:3000/api/admin/notifications/broadcast', {
      method: 'POST',
      body: JSON.stringify({ event: 'REPIXL_UPDATE' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.targeted).toBe(2)
    expect(body.data.inAppCreated).toBe(1)
    expect(body.data.suppressed).toBe(1)
  })
})

