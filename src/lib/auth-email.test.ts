import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const sendMail = vi.fn()
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail })),
  },
}))

import { sendPasswordChangedEmail } from './auth-email'

describe('sendPasswordChangedEmail', () => {
  const ORIGINAL_ENV = { ...process.env }

  beforeEach(() => {
    sendMail.mockReset()
    process.env.GMAIL_USER = 'security@repxl.com'
    process.env.GMAIL_APP_PASSWORD = 'password-123'
    process.env.NEXT_PUBLIC_SITE_URL = 'https://repxlph.vercel.app'
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('sends a branded security alert email with customer details', async () => {
    sendMail.mockResolvedValueOnce({ messageId: 'msg-1' })

    const result = await sendPasswordChangedEmail({
      email: 'collector@example.com',
      name: 'Maria Clara',
      changedAt: new Date('2026-09-14T10:00:00Z'),
    })

    expect(result.ok).toBe(true)
    expect(sendMail).toHaveBeenCalledTimes(1)
    const callArg = sendMail.mock.calls[0][0]
    expect(callArg.to).toBe('collector@example.com')
    expect(callArg.subject).toContain('Security Alert')
    expect(callArg.html).toContain('Maria Clara')
    expect(callArg.html).toContain('collector@example.com')
    expect(callArg.html).toContain('https://repxlph.vercel.app/forgot-password')
    expect(callArg.text).toContain('SECURITY ALERT')
  })

  it('handles unconfigured mailer gracefully in dev mode without throwing', async () => {
    delete process.env.GMAIL_USER
    delete process.env.GMAIL_APP_PASSWORD

    const result = await sendPasswordChangedEmail({
      email: 'test@example.com',
      name: 'Test User',
    })

    expect(result.ok).toBe(true)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('reports ok:false with error when transport fails', async () => {
    sendMail.mockRejectedValueOnce(new Error('SMTP connection refused'))

    const result = await sendPasswordChangedEmail({
      email: 'test@example.com',
    })

    expect(result.ok).toBe(false)
    expect(result.error).toContain('SMTP connection refused')
  })
})

