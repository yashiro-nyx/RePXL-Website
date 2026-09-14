import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSendNotificationEmail, mockPrisma } = vi.hoisted(() => ({
  mockSendNotificationEmail: vi.fn(),
  mockPrisma: {
    user: {
      findUnique: vi.fn(),
    },
    notificationTemplate: {
      findUnique: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    pushToken: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    adminLog: {
      create: vi.fn(),
    },
  },
}))

vi.mock('./mailer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./mailer')>()
  return {
    ...actual,
    sendNotificationEmail: mockSendNotificationEmail,
  }
})

vi.mock('./prisma', () => ({
  prisma: mockPrisma,
}))

import { emitNotification } from './notifications'

describe('emitNotification Dynamic Template & HTML Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSendNotificationEmail.mockResolvedValue({ ok: true, attempts: 1 })
    mockPrisma.notification.create.mockResolvedValue({ id: 'notif-1' })
  })

  it('resolves database template tokens using provided context and sends styled HTML email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'alex@example.com',
      firstName: 'Alex',
      lastName: 'Rivera',
      promoOptOut: false,
      notificationPreference: null,
    })

    mockPrisma.notificationTemplate.findUnique.mockResolvedValue({
      event: 'ORDER_STATUS_CHANGE',
      subject: 'Custom Parcel Alert: #{{orderNumber}} is {{status}}',
      body: 'Hi {{customerName}},\n\nYour package is with {{courierName}} (tracking {{trackingNumber}}).',
      channel: 'BOTH',
      isEnabled: true,
    })

    const result = await emitNotification({
      userId: 'user-1',
      event: 'ORDER_STATUS_CHANGE',
      subject: 'Fallback Subject',
      body: 'Fallback Body',
      channel: 'BOTH',
      recipientEmail: 'alex@example.com',
      context: {
        orderNumber: 'RPX-9000',
        status: 'IN TRANSIT',
        courierName: 'LBC Express',
        trackingNumber: 'LBC-777888',
      },
    })

    expect(result.notificationId).toBe('notif-1')
    expect(result.emailDelivered).toBe(true)

    // Verify in-app notification uses resolved template
    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        event: 'ORDER_STATUS_CHANGE',
        message: expect.stringContaining('Your package is with LBC Express (tracking LBC-777888)'),
        channel: 'IN_APP',
      }),
    })

    // Verify email was dispatched with resolved subject, resolved body, and branded HTML layout
    expect(mockSendNotificationEmail).toHaveBeenCalledWith(
      'alex@example.com',
      'Custom Parcel Alert: #RPX-9000 is IN TRANSIT',
      'Hi Alex Rivera,\n\nYour package is with LBC Express (tracking LBC-777888).',
      expect.objectContaining({
        html: expect.stringContaining('RePXL'),
      })
    )

    const callArgs = mockSendNotificationEmail.mock.calls[0]
    const options = callArgs[3]
    expect(options.html).toContain('Custom Parcel Alert: #RPX-9000 is IN TRANSIT')
    expect(options.html).toContain('Track Order Details')
    expect(options.html).toContain('/account/orders/RPX-9000')
  })

  it('falls back to provided subject and body when no database template is saved', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-2',
      email: 'buyer@example.com',
      firstName: 'Maria',
      lastName: 'Clara',
      promoOptOut: false,
      notificationPreference: null,
    })

    mockPrisma.notificationTemplate.findUnique.mockResolvedValue(null)

    await emitNotification({
      userId: 'user-2',
      event: 'ORDER_STATUS_CHANGE',
      subject: 'Order {{orderNumber}} Dispatched',
      body: 'Hello {{customerName}}, your order {{orderNumber}} has shipped.',
      channel: 'BOTH',
      recipientEmail: 'buyer@example.com',
      context: {
        orderNumber: 'RPX-1010',
      },
    })

    expect(mockSendNotificationEmail).toHaveBeenCalledWith(
      'buyer@example.com',
      'Order RPX-1010 Dispatched',
      'Hello Maria Clara, your order RPX-1010 has shipped.',
      expect.objectContaining({
        html: expect.stringContaining('Order RPX-1010 Dispatched'),
      })
    )
  })

  it('suppresses both in-app and email when database template is disabled', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-3',
      email: 'suppressed@example.com',
      firstName: 'Quiet',
      lastName: 'User',
      promoOptOut: false,
      notificationPreference: null,
    })

    mockPrisma.notificationTemplate.findUnique.mockResolvedValue({
      event: 'ORDER_STATUS_CHANGE',
      subject: 'Disabled Template',
      body: 'Disabled Body',
      channel: 'BOTH',
      isEnabled: false,
    })

    const result = await emitNotification({
      userId: 'user-3',
      event: 'ORDER_STATUS_CHANGE',
      subject: 'Some Subject',
      body: 'Some Body',
      channel: 'BOTH',
      recipientEmail: 'suppressed@example.com',
    })

    expect(result.notificationId).toBe('')
    expect(result.emailDelivered).toBe(false)
    expect(mockPrisma.notification.create).not.toHaveBeenCalled()
    expect(mockSendNotificationEmail).not.toHaveBeenCalled()
  })
})

