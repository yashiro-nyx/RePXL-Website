import { beforeEach, describe, expect, it, vi } from 'vitest'
import bcrypt from 'bcryptjs'
import { NextRequest } from 'next/server'

// Behavioral tests for the step-up recent-auth route: the Google-no-loop fix,
// method availability, TOTP step-up, and direct-API-bypass rejection.

const mock = vi.hoisted(() => ({
  currentUser: vi.fn(),
  serverSession: vi.fn(),
  sameOrigin: vi.fn(() => true),
  setRecentAuthCookie: vi.fn(async () => {}),
  checkRecentAuth: vi.fn(async () => false),
  customerPrimaryAuthTime: vi.fn(async () => 0),
  isRecentAuthLocked: vi.fn(async () => false),
  recordRecentAuthFailure: vi.fn(async () => ({ locked: false })),
  verifyStepUpTotp: vi.fn(),
  issueStepUpChallenge: vi.fn(),
  verifyStepUpChallenge: vi.fn(),
  sendNotificationEmail: vi.fn(async () => ({ ok: true })),
  userFindUnique: vi.fn(),
  recentFindUnique: vi.fn(async () => null as any),
}))

vi.mock('@/lib/auth-helpers', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/auth-helpers')
  return {
    ...actual,
    getCurrentUser: mock.currentUser,
    setRecentAuthCookie: mock.setRecentAuthCookie,
    checkRecentAuth: mock.checkRecentAuth,
    customerPrimaryAuthTime: mock.customerPrimaryAuthTime,
    isRecentAuthLocked: mock.isRecentAuthLocked,
    recordRecentAuthFailure: mock.recordRecentAuthFailure,
    RECENT_AUTH_WINDOW_MS: 12 * 60 * 1000,
  }
})
vi.mock('next-auth', () => ({ getServerSession: mock.serverSession }))
vi.mock('@/lib/next-auth-options', () => ({ authOptions: {} }))
vi.mock('@/lib/mfa/http', () => ({ sameOrigin: mock.sameOrigin }))
vi.mock('@/lib/mfa/service', () => ({ verifyStepUpTotp: mock.verifyStepUpTotp }))
vi.mock('@/lib/step-up', () => ({
  issueStepUpChallenge: mock.issueStepUpChallenge,
  verifyStepUpChallenge: mock.verifyStepUpChallenge,
  OTP_TTL_MS: 8 * 60 * 1000,
}))
vi.mock('@/lib/mailer', () => ({ sendNotificationEmail: mock.sendNotificationEmail }))
vi.mock('@/lib/email', () => ({ buildVerificationCodeEmail: () => ({ subject: 's', html: 'h', text: 't' }) }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: mock.userFindUnique },
    recentAuthRecord: { findUnique: mock.recentFindUnique },
  },
}))

import { POST, GET } from '@/app/api/auth/recent-auth/route'

const customer = { id: 'cust_1', email: 'buyer@repxl.com', role: 'CUSTOMER' }
function post(body: unknown) {
  return new NextRequest('http://localhost/api/auth/recent-auth', { method: 'POST', body: JSON.stringify(body) })
}

describe('recent-auth route — step-up methods', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mock.sameOrigin.mockReturnValue(true)
    mock.currentUser.mockResolvedValue(customer)
    mock.userFindUnique.mockResolvedValue({ password: '' })
    mock.isRecentAuthLocked.mockResolvedValue(false)
  })

  it('rejects unauthenticated callers (direct API bypass blocked)', async () => {
    mock.currentUser.mockResolvedValue(null)
    const res = await POST(post({ method: 'password', password: 'x' }))
    expect(res.status).toBe(401)
  })

  it('rejects cross-origin POST (CSRF guard)', async () => {
    mock.sameOrigin.mockReturnValue(false)
    const res = await POST(post({ method: 'password', password: 'x' }))
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe(
      "We couldn't verify your security status right now. Please refresh the page and try again."
    )
  })

  it('verifies a real bcrypt password and issues password-scoped verification', async () => {
    mock.userFindUnique.mockResolvedValue({ password: await bcrypt.hash('test-password', 4) })
    const res = await POST(post({ method: 'password', password: 'test-password' }))
    expect(res.status).toBe(200)
    expect(mock.setRecentAuthCookie).toHaveBeenCalledWith('cust_1', 'password')
    expect(mock.serverSession).not.toHaveBeenCalled()
  })
  it('wrong password never issues verification', async () => {
    mock.userFindUnique.mockResolvedValue({ password: await bcrypt.hash('test-password', 4) })
    const res = await POST(post({ method: 'password', password: 'wrong' }))
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('The password you entered is incorrect.')
    expect(mock.recordRecentAuthFailure).toHaveBeenCalledWith('cust_1')
    expect(mock.setRecentAuthCookie).not.toHaveBeenCalled()
  })
  it.each(['google', 'totp', 'email-otp-send', 'email-otp-verify'])('password accounts cannot bypass password with %s', async (method) => {
    mock.userFindUnique.mockResolvedValue({ password: 'hash' })
    expect((await POST(post({ method }))).status).toBe(400)
    expect(mock.setRecentAuthCookie).not.toHaveBeenCalled()
  })
  it('blocks password verification during account lockout', async () => {
    mock.userFindUnique.mockResolvedValue({ password: 'hash' })
    mock.isRecentAuthLocked.mockResolvedValue(true)
    expect((await POST(post({ method: 'password', password: 'test' }))).status).toBe(429)
    expect(mock.setRecentAuthCookie).not.toHaveBeenCalled()
  })
  it('does not claim an email was sent when the mailer reports failure', async () => {
    mock.issueStepUpChallenge.mockResolvedValue({ ok: true, code: '481953', ttlMs: 480000 })
    mock.sendNotificationEmail.mockResolvedValueOnce({ ok: false })
    expect((await POST(post({ method: 'email-otp-send' }))).status).toBe(502)
  })
  // ── THE LOOP REGRESSION ──
  it('Google: succeeds using the FRESH NextAuth session time (no loop)', async () => {
    // App session cookie primaryAt is stale/0 (the old bug), but the live
    // NextAuth session was just refreshed by signIn('google').
    mock.customerPrimaryAuthTime.mockResolvedValue(0)
    mock.serverSession.mockResolvedValue({
      user: { email: 'buyer@repxl.com' },
      primaryAuthenticatedAt: Date.now(),
    })
    const res = await POST(post({ method: 'google' }))
    expect(res.status).toBe(200)
    expect(mock.setRecentAuthCookie).toHaveBeenCalledWith('cust_1', 'google')
  })

  it('Google: a different Google account does NOT satisfy the step-up', async () => {
    mock.customerPrimaryAuthTime.mockResolvedValue(0)
    mock.serverSession.mockResolvedValue({
      user: { email: 'someone-else@gmail.com' },
      primaryAuthenticatedAt: Date.now(),
    })
    const res = await POST(post({ method: 'google' }))
    expect(res.status).toBe(401)
    expect(mock.setRecentAuthCookie).not.toHaveBeenCalled()
  })

  it('Google: stale session (no fresh time anywhere) is rejected with a friendly message', async () => {
    mock.customerPrimaryAuthTime.mockResolvedValue(0)
    mock.serverSession.mockResolvedValue(null)
    const res = await POST(post({ method: 'google' }))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toContain('Google')
    expect(json.error).not.toContain('primaryAt')
  })

  // ── TOTP step-up ──
  it('TOTP: valid code elevates the session', async () => {
    mock.verifyStepUpTotp.mockResolvedValue({ ok: true, method: 'totp' })
    const res = await POST(post({ method: 'totp', code: '123456' }))
    expect(res.status).toBe(200)
    expect(mock.setRecentAuthCookie).toHaveBeenCalledWith('cust_1', 'totp')
  })
  it('TOTP: wrong code → 401 friendly', async () => {
    mock.verifyStepUpTotp.mockResolvedValue({ ok: false, status: 401 })
    const res = await POST(post({ method: 'totp', code: '000000' }))
    expect(res.status).toBe(401)
    expect(mock.setRecentAuthCookie).not.toHaveBeenCalled()
  })

  // ── Email OTP ──
  it('email-otp-send: issues a challenge and emails a masked address', async () => {
    mock.issueStepUpChallenge.mockResolvedValue({ ok: true, code: '481953', ttlMs: 480000 })
    const res = await POST(post({ method: 'email-otp-send' }))
    expect(res.status).toBe(200)
    expect(mock.sendNotificationEmail).toHaveBeenCalled()
    // The plaintext code must never be echoed back to the client.
    const json = await res.json()
    expect(JSON.stringify(json)).not.toContain('481953')
  })
  it('email-otp-verify: correct code elevates; expired → friendly 401', async () => {
    mock.verifyStepUpChallenge.mockResolvedValueOnce({ ok: true })
    let res = await POST(post({ method: 'email-otp-verify', code: '481953' }))
    expect(res.status).toBe(200)

    mock.verifyStepUpChallenge.mockResolvedValueOnce({ ok: false, reason: 'expired' })
    res = await POST(post({ method: 'email-otp-verify', code: '000000' }))
    expect(res.status).toBe(401)
    expect((await res.json()).error).toContain('expired')
  })

  it('unknown method is rejected', async () => {
    const res = await POST(post({ method: 'magic' }))
    expect(res.status).toBe(400)
  })
})

describe('recent-auth GET — method availability per account', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mock.currentUser.mockResolvedValue(customer)
    mock.checkRecentAuth.mockResolvedValue(false)
  })

  it('returns 401 only when the customer session is absent', async () => {
    mock.currentUser.mockResolvedValue(null)
    expect((await GET()).status).toBe(401)
  })

  it('authenticated but unverified password account gets 200 + verified false', async () => {
    mock.userFindUnique.mockResolvedValue({ password: 'hash', customerMfa: null })
    mock.serverSession.mockResolvedValue(null)
    const res = await GET()
    const { data } = await res.json()
    expect(res.status).toBe(200)
    expect(data.verified).toBe(false)
    expect(data.methods).toEqual({ password: true, totp: false, email: false, google: false })
  })

  it('authenticated account with valid recent verification gets 200 + verified true', async () => {
    const expiresAt = new Date(Date.now() + 60_000)
    mock.userFindUnique.mockResolvedValue({ password: 'hash', customerMfa: null })
    mock.serverSession.mockResolvedValue(null)
    mock.checkRecentAuth.mockResolvedValue(true)
    mock.recentFindUnique.mockResolvedValue({ expiresAt })
    const res = await GET()
    const { data } = await res.json()
    expect(res.status).toBe(200)
    expect(data).toMatchObject({ verified: true, expiresAt: expiresAt.toISOString() })
  })

  it('expired recent verification is the normal 200 + verified false state', async () => {
    mock.userFindUnique.mockResolvedValue({ password: 'hash', customerMfa: null })
    mock.serverSession.mockResolvedValue(null)
    mock.checkRecentAuth.mockResolvedValue(false)
    const res = await GET()
    expect(res.status).toBe(200)
    expect((await res.json()).data.verified).toBe(false)
  })

  it('Google-only account: email + google, NOT password', async () => {
    mock.userFindUnique.mockResolvedValue({ password: '', customerMfa: null })
    mock.serverSession.mockResolvedValue({ user: { email: 'buyer@repxl.com' } })
    const res = await GET()
    const { data } = await res.json()
    expect(data.methods.password).toBe(false)
    expect(data.methods.google).toBe(true)
    expect(data.methods.email).toBe(true)
  })

  it('password accounts require password even when MFA is enabled', async () => {
    mock.userFindUnique.mockResolvedValue({ password: 'hash', customerMfa: { enabledAt: new Date() } })
    mock.serverSession.mockResolvedValue(null)
    const res = await GET()
    const { data } = await res.json()
    expect(data.methods.totp).toBe(false)
  })
})
