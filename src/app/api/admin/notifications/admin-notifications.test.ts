import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as listTemplates, PATCH as updateTemplateQuery } from './route'
import { GET as getTemplate, PATCH as updateTemplateParam } from './[event]/route'
import { prisma } from '@/lib/prisma'
import * as authHelpers from '@/lib/auth-helpers'
import { MODERN_DEFAULT_TEMPLATES } from '@/lib/notification-templates'

vi.mock('@/lib/auth-helpers', () => ({
  getCurrentUser: vi.fn(),
  getCurrentAdmin: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    notificationTemplate: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    adminLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}))

describe('Admin Notification Templates API', () => {
  const mockAdmin = {
    id: 'admin_1',
    email: 'admin@repixl-admin.com',
    firstName: 'RePXL',
    lastName: 'Admin',
    role: 'ADMIN',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authHelpers.getCurrentAdmin).mockResolvedValue(mockAdmin as any)
  })

  describe('Authentication Enforcement', () => {
    it('rejects unauthenticated requests with 401', async () => {
      vi.mocked(authHelpers.getCurrentAdmin).mockResolvedValue(null)

      const req = new NextRequest('http://localhost/api/admin/notifications')
      const res = await listTemplates(req)
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/admin/notifications', () => {
    it('returns all notification templates from database', async () => {
      const mockList = Object.values(MODERN_DEFAULT_TEMPLATES).map((t) => ({
        ...t,
        id: `tpl_${t.event}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
      vi.mocked(prisma.notificationTemplate.findMany).mockResolvedValue(mockList as any)

      const req = new NextRequest('http://localhost/api/admin/notifications')
      const res = await listTemplates(req)
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data).toHaveLength(7)
    })
  })

  describe('GET /api/admin/notifications/[event]', () => {
    it('returns a single notification template by event', async () => {
      const mockTpl = {
        ...MODERN_DEFAULT_TEMPLATES.ORDER_CONFIRMATION,
        id: 'tpl_order_conf',
      }
      vi.mocked(prisma.notificationTemplate.findUnique).mockResolvedValue(mockTpl as any)

      const req = new NextRequest('http://localhost/api/admin/notifications/ORDER_CONFIRMATION')
      const res = await getTemplate(req, {
        params: Promise.resolve({ event: 'ORDER_CONFIRMATION' }),
      })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data.event).toBe('ORDER_CONFIRMATION')
      expect(body.data.subject).toBe(mockTpl.subject)
    })

    it('rejects invalid notification event name with 400', async () => {
      const req = new NextRequest('http://localhost/api/admin/notifications/INVALID_EVENT')
      const res = await getTemplate(req, {
        params: Promise.resolve({ event: 'INVALID_EVENT' }),
      })

      expect(res.status).toBe(400)
    })
  })

  describe('PATCH /api/admin/notifications/[event]', () => {
    it('successfully updates template subject, body, channel, and isEnabled', async () => {
      const existing = {
        event: 'ORDER_STATUS_CHANGE',
        subject: 'Old Subject',
        body: 'Old Body {{status}}',
        channel: 'BOTH',
        isEnabled: true,
      }
      vi.mocked(prisma.notificationTemplate.findUnique).mockResolvedValue(existing as any)
      vi.mocked(prisma.notificationTemplate.update).mockResolvedValue({
        ...existing,
        subject: 'Order #{{orderNumber}} Update: {{status}}',
        body: 'Hi {{customerName}}, your order {{orderNumber}} is {{status}} with courier {{courierName}}.',
        channel: 'EMAIL',
        isEnabled: false,
      } as any)

      const req = new NextRequest('http://localhost/api/admin/notifications/ORDER_STATUS_CHANGE', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'Order #{{orderNumber}} Update: {{status}}',
          body: 'Hi {{customerName}}, your order {{orderNumber}} is {{status}} with courier {{courierName}}.',
          channel: 'EMAIL',
          isEnabled: false,
        }),
      })

      const res = await updateTemplateParam(req, {
        params: Promise.resolve({ event: 'ORDER_STATUS_CHANGE' }),
      })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(prisma.notificationTemplate.update).toHaveBeenCalledWith({
        where: { event: 'ORDER_STATUS_CHANGE' },
        data: {
          subject: 'Order #{{orderNumber}} Update: {{status}}',
          body: 'Hi {{customerName}}, your order {{orderNumber}} is {{status}} with courier {{courierName}}.',
          channel: 'EMAIL',
          isEnabled: false,
        },
      })
      expect(prisma.adminLog.create).toHaveBeenCalled()
    })

    it('rejects unknown placeholder tokens with 400', async () => {
      const existing = {
        event: 'ORDER_STATUS_CHANGE',
        subject: 'Old Subject',
        body: 'Old Body',
        channel: 'BOTH',
        isEnabled: true,
      }
      vi.mocked(prisma.notificationTemplate.findUnique).mockResolvedValue(existing as any)

      const req = new NextRequest('http://localhost/api/admin/notifications/ORDER_STATUS_CHANGE', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: 'Your order is here {{unknownToken123}}',
        }),
      })

      const res = await updateTemplateParam(req, {
        params: Promise.resolve({ event: 'ORDER_STATUS_CHANGE' }),
      })
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toContain('Unknown placeholder tokens in body')
      expect(body.error).toContain('unknownToken123')
      expect(prisma.notificationTemplate.update).not.toHaveBeenCalled()
    })

    it('rejects empty subject with 400', async () => {
      const existing = {
        event: 'ORDER_STATUS_CHANGE',
        subject: 'Old Subject',
        body: 'Old Body',
        channel: 'BOTH',
        isEnabled: true,
      }
      vi.mocked(prisma.notificationTemplate.findUnique).mockResolvedValue(existing as any)

      const req = new NextRequest('http://localhost/api/admin/notifications/ORDER_STATUS_CHANGE', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: '',
        }),
      })

      const res = await updateTemplateParam(req, {
        params: Promise.resolve({ event: 'ORDER_STATUS_CHANGE' }),
      })

      expect(res.status).toBe(400)
      expect(prisma.notificationTemplate.update).not.toHaveBeenCalled()
    })
  })
})

