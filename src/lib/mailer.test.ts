import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock nodemailer so no real email is ever sent. `sendMail` is a spy whose
// behavior each test configures (resolve = success, reject = transport failure).
const sendMail = vi.fn()
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail })),
  },
}))

import { sendNotificationEmail, renderBrandedEmailHtml } from './mailer'

describe('sendNotificationEmail (Requirements 8.8, 9.8)', () => {
  const ORIGINAL_ENV = { ...process.env }

  beforeEach(() => {
    sendMail.mockReset()
    // Ensure isMailerConfigured() is true for these tests.
    process.env.GMAIL_USER = 'sender@example.com'
    process.env.GMAIL_APP_PASSWORD = 'app-password-123'
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('succeeds on the first attempt', async () => {
    sendMail.mockResolvedValueOnce({ messageId: 'ok' })

    const result = await sendNotificationEmail(
      'buyer@example.com',
      'Your order shipped',
      'Order RPX-1001 is on the way.',
      { backoffMs: 0 }
    )

    expect(result).toEqual({ ok: true, attempts: 1 })
    expect(sendMail).toHaveBeenCalledTimes(1)
  })

  it('retries and succeeds on a later attempt', async () => {
    sendMail
      .mockRejectedValueOnce(new Error('temporary SMTP failure'))
      .mockResolvedValueOnce({ messageId: 'ok' })

    const result = await sendNotificationEmail(
      'buyer@example.com',
      'Your order shipped',
      'Order RPX-1001 is on the way.',
      { backoffMs: 0 }
    )

    expect(result).toEqual({ ok: true, attempts: 2 })
    expect(sendMail).toHaveBeenCalledTimes(2)
  })

  it('returns ok:false with the last error after 3 failed attempts', async () => {
    sendMail
      .mockRejectedValueOnce(new Error('failure 1'))
      .mockRejectedValueOnce(new Error('failure 2'))
      .mockRejectedValueOnce(new Error('failure 3'))

    const result = await sendNotificationEmail(
      'buyer@example.com',
      'Your order shipped',
      'Order RPX-1001 is on the way.',
      { backoffMs: 0 }
    )

    expect(result.ok).toBe(false)
    expect(result.attempts).toBe(3)
    expect(result.error).toBe('failure 3')
    expect(sendMail).toHaveBeenCalledTimes(3)
  })

  it('supports an HTML body without throwing', async () => {
    sendMail.mockResolvedValueOnce({ messageId: 'ok' })

    const result = await sendNotificationEmail(
      'buyer@example.com',
      'Welcome',
      'Plain text version',
      { html: '<p>Welcome to RePXL</p>', backoffMs: 0 }
    )

    expect(result.ok).toBe(true)
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'buyer@example.com',
        text: 'Plain text version',
        html: '<p>Welcome to RePXL</p>',
      })
    )
  })

  it('returns ok:false without sending when the mailer is not configured', async () => {
    delete process.env.GMAIL_USER
    delete process.env.GMAIL_APP_PASSWORD

    const result = await sendNotificationEmail(
      'buyer@example.com',
      'Your order shipped',
      'Order RPX-1001 is on the way.',
      { backoffMs: 0 }
    )

    expect(result.ok).toBe(false)
    expect(result.attempts).toBe(0)
    expect(sendMail).not.toHaveBeenCalled()
  })
})

describe('renderBrandedEmailHtml', () => {
  it('renders a branded email with title, preheader, body, button, and footer', () => {
    const html = renderBrandedEmailHtml({
      title: 'Order Status Update',
      preheader: 'Your parcel is on the way',
      bodyHtml: '<p>Package dispatched via LBC Express.</p>',
      actionUrl: 'https://repxlph.vercel.app/account/orders/RPX-101',
      actionText: 'Track Parcel',
      footerNote: 'Automated notice.',
    })

    expect(html).toContain('RePXL')
    expect(html).toContain('Order Status Update')
    expect(html).toContain('Your parcel is on the way')
    expect(html).toContain('Package dispatched via LBC Express.')
    expect(html).toContain('https://repxlph.vercel.app/account/orders/RPX-101')
    expect(html).toContain('Track Parcel')
    expect(html).toContain('Automated notice.')
    expect(html).toContain('Vintage Digital Cameras')
  })

  it('omits button when actionUrl or actionText are not provided', () => {
    const html = renderBrandedEmailHtml({
      title: 'Store Announcement',
      bodyHtml: '<p>New cameras added to the collection.</p>',
    })

    expect(html).toContain('Store Announcement')
    expect(html).toContain('New cameras added to the collection.')
    expect(html).not.toContain('<!-- BUTTON -->')
  })
})

