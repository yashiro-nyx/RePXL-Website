import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'

const mocks = vi.hoisted(() => ({
  cookies: new Map<string, string>(),
  google: vi.fn(),
  email: vi.fn().mockResolvedValue({ ok: true }),
}))
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) =>
      mocks.cookies.has(name) ? { value: mocks.cookies.get(name) } : undefined,
    set: (name: string, value: string, options: { maxAge?: number }) =>
      options?.maxAge === 0
        ? mocks.cookies.delete(name)
        : mocks.cookies.set(name, value),
  }),
}))
vi.mock('next-auth', () => ({ getServerSession: mocks.google }))
vi.mock('@/lib/mailer', () => ({ sendNotificationEmail: mocks.email }))
vi.mock('@/lib/prisma', async () => {
  const { PrismaClient } = await import('@prisma/client')
  return {
    prisma: new PrismaClient({
      datasources: {
        db: {
          url:
            process.env.TEST_MFA_DATABASE_URL ??
            'postgresql://localhost/unused',
        },
      },
    }),
  }
})
import { prisma } from '@/lib/prisma'
import {
  getCurrentAdmin,
  getCurrentUser,
  setSessionCookie,
} from '@/lib/auth-helpers'
import { POST as login } from '@/app/api/auth/login/route'
import { POST as google } from '@/app/api/auth/oauth/login/route'
import { POST as legacy } from '@/app/api/auth/oauth/route'
import { POST as googleRegister } from '@/app/api/auth/oauth/register/route'
import { POST as manage, GET as status } from '@/app/api/auth/mfa/route'
import { POST as recentAuth } from '@/app/api/auth/recent-auth/route'
import { POST as verify } from '@/app/api/auth/mfa/verify/route'
import { CHALLENGE_COOKIE, completeChallenge, primaryLogin } from './service'
import { authenticator, decryptSecret } from './crypto'

const databaseUrl = process.env.TEST_MFA_DATABASE_URL
if (databaseUrl) {
  const url = new URL(databaseUrl)
  if (
    !['localhost', '127.0.0.1'].includes(url.hostname) ||
    url.pathname !== '/repixl_mfa_test'
  )
    throw new Error(
      'MFA tests require disposable local repixl_mfa_test database'
    )
}
const password = 'Test-password-123!'
const request = (body: unknown, origin = 'http://localhost') =>
  new NextRequest('http://localhost/api/auth/mfa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify(body),
  })
async function customer(oauth = false) {
  const user = await prisma.user.create({
    data: {
      email: 'mfa@example.test',
      password: oauth ? '' : await bcrypt.hash(password, 4),
      firstName: 'Test',
      lastName: 'Customer',
    },
  })
  setSessionCookie(user.id)
  const reauth = await recentAuth(request({method: oauth ? 'google' : 'password', password}))
  expect(reauth.status).toBe(200)
  return user
}
async function begin() {
  const response = await manage(request({ action: 'begin', password }))
  expect(response.status).toBe(200)
  return (await response.json()).data as { secret: string; qrCode: string }
}
async function enroll() {
  const user = await customer()
  const setup = await begin()
  const response = await manage(
    request({ action: 'confirm', code: authenticator(setup.secret).generate() })
  )
  expect(response.status).toBe(200)
  const codes: string[] = (await response.json()).data.recoveryCodes
  return { user, setup, codes }
}
async function passwordLogin() {
  return login(request({ email: 'mfa@example.test', password }))
}
async function challenge() {
  mocks.cookies.clear()
  const response = await passwordLogin()
  expect(response.status).toBe(200)
  expect((await response.json()).data).toEqual({ mfaRequired: true })
  return mocks.cookies.get(CHALLENGE_COOKIE)!
}

describe.skipIf(!databaseUrl)('customer MFA security with PostgreSQL', () => {
  beforeEach(async () => {
    vi.stubEnv('MFA_ENCRYPTION_KEY', 'ab'.repeat(32))
    vi.stubEnv('NEXTAUTH_SECRET', 'test-signing-key-not-production')
    vi.stubEnv('NEXTAUTH_URL', 'http://localhost')
    mocks.cookies.clear()
    mocks.google.mockReset()
    mocks.email.mockClear()
    await prisma.user.deleteMany()
  })
  afterAll(async () => {
    await prisma.$disconnect()
    vi.unstubAllEnvs()
  })

  it('requires authentication, password confirmation, and same-origin enrollment', async () => {
    expect((await manage(request({ action: 'begin', password }))).status).toBe(
      401
    )
    await customer()
    expect(
      (await manage(request({ action: 'begin', password: 'wrong' }))).status
    ).toBe(401)
    expect(
      (
        await manage(
          request({ action: 'begin', password }, 'https://attacker.test')
        )
      ).status
    ).toBe(403)
  })
  it('provisions QR/manual key but does not enable before a valid code', async () => {
    const user = await customer()
    const setup = await begin()
    expect(setup.qrCode).toMatch(/^data:image\/png;base64,/)
    const row = await prisma.customerMfa.findUniqueOrThrow({
      where: { userId: user.id },
    })
    expect(row.enabledAt).toBeNull()
    expect(row.secret).not.toContain(setup.secret)
    expect(decryptSecret(row.secret!, user.id)).toBe(setup.secret)
    expect(
      (await manage(request({ action: 'confirm', code: 'wrong' }))).status
    ).toBe(401)
    expect(
      (
        await prisma.customerMfa.findUniqueOrThrow({
          where: { userId: user.id },
        })
      ).enabledAt
    ).toBeNull()
  })
  it('enables, hashes recovery codes, requires acknowledgement, and never exposes saved secrets', async () => {
    const { user, setup, codes } = await enroll()
    const row = await prisma.customerMfa.findUniqueOrThrow({
      where: { userId: user.id },
    })
    expect(row.enabledAt).not.toBeNull()
    expect(row.recoveryAcknowledged).toBe(false)
    for (const code of codes) expect(JSON.stringify(row)).not.toContain(code)
    const response = await status()
    const text = await response.text()
    expect(text).not.toContain(setup.secret)
    expect(text).not.toContain(row.secret!)
    expect(text).not.toContain(row.recoveryHashes[0])
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(
      (await manage(request({ action: 'acknowledge', saved: false }))).status
    ).toBe(401)
    expect(
      (await manage(request({ action: 'acknowledge', saved: true }))).status
    ).toBe(200)
    expect(
      (
        await prisma.customerMfa.findUniqueOrThrow({
          where: { userId: user.id },
        })
      ).recoveryAcknowledged
    ).toBe(true)
    expect(mocks.email).toHaveBeenCalledWith(
      user.email,
      expect.stringContaining('MFA enabled'),
      expect.any(String)
    )
    expect(JSON.stringify(mocks.email.mock.calls)).not.toContain(setup.secret)
    for (const code of codes)
      expect(JSON.stringify(mocks.email.mock.calls)).not.toContain(code)
  })
  it('issues only a challenge after password verification and accepts TOTP once', async () => {
    const { user, setup } = await enroll()
    // Permit the current time step as if enrollment happened in a previous period.
    await prisma.customerMfa.update({
      where: { userId: user.id },
      data: { lastStep: -1 },
    })
    await challenge()
    expect(mocks.cookies.has('repixl-session-token')).toBe(false)
    expect(await getCurrentUser()).toBeNull()
    const code = authenticator(setup.secret).generate()
    expect((await verify(request({ code }))).status).toBe(200)
    expect((await getCurrentUser())?.id).toBe(user.id)
    expect(mocks.cookies.has(CHALLENGE_COOKIE)).toBe(false)
    await challenge()
    expect((await verify(request({ code }))).status).toBe(401)
  })
  it.each([
    ['Google', google],
    ['legacy', legacy],
  ] as const)(
    '%s bridge requires MFA even with valid Google session',
    async (_name, handler) => {
      const { user } = await enroll()
      mocks.cookies.clear()
      mocks.google.mockResolvedValue({
        user: { email: user.email },
        primaryAuthenticatedAt: Date.now(),
      })
      const response = await handler(
        request({ email: user.email, firstName: user.firstName })
      )
      expect((await response.json()).data).toEqual({ mfaRequired: true })
      expect(await getCurrentUser()).toBeNull()
      expect(mocks.cookies.has('repixl-session-token')).toBe(false)
    }
  )
  it('blocks unverified/mismatched Google identity and duplicate Google registration bypass', async () => {
    const { user } = await enroll()
    mocks.cookies.clear()
    mocks.google.mockResolvedValue(null)
    expect(
      (await legacy(request({ email: user.email, firstName: 'Test' }))).status
    ).toBe(401)
    mocks.google.mockResolvedValue({ user: { email: 'attacker@example.test' } })
    expect(
      (await google(request({ email: user.email, firstName: 'Test' }))).status
    ).toBe(403)
    mocks.google.mockResolvedValue({ user: { email: user.email } })
    expect(
      (await googleRegister(request({ email: user.email, firstName: 'Test' })))
        .status
    ).toBe(409)
    expect(await getCurrentUser()).toBeNull()
  })
  it('consumes a recovery code once, even across simultaneous challenges', async () => {
    const { user, codes } = await enroll()
    const token = await challenge()
    const results = await Promise.all([
      completeChallenge(token, codes[0]),
      completeChallenge(token, codes[0]),
    ])
    expect(results.filter((r) => r.ok)).toHaveLength(1)
    await challenge()
    expect((await verify(request({ code: codes[0] }))).status).toBe(401)
    expect((await verify(request({ code: codes[1] }))).status).toBe(200)
    expect(mocks.email).toHaveBeenCalledWith(
      user.email,
      expect.stringContaining('Recovery code used'),
      expect.any(String)
    )
  })
  it('regeneration invalidates every old code and old session', async () => {
    const { user, codes } = await enroll()
    const oldCookie = mocks.cookies.get('repixl-session-token')!
    const response = await manage(
      request({ action: 'regenerate', password, code: codes[0] })
    )
    expect(response.status).toBe(200)
    const replacement = (await response.json()).data.recoveryCodes
    mocks.cookies.set('repixl-session-token', oldCookie)
    expect(await getCurrentUser()).toBeNull()
    await challenge()
    expect((await verify(request({ code: codes[1] }))).status).toBe(401)
    expect((await verify(request({ code: replacement[0] }))).status).toBe(200)
    expect((await getCurrentUser())?.id).toBe(user.id)
  })
  it('disabling requires primary and second factor and clears all secret material', async () => {
    const { user, codes } = await enroll()
    expect(
      (
        await manage(
          request({ action: 'disable', password: 'wrong', code: codes[0] })
        )
      ).status
    ).toBe(401)
    expect(
      (await manage(request({ action: 'disable', password, code: 'wrong' })))
        .status
    ).toBe(401)
    expect(
      (await manage(request({ action: 'disable', password, code: codes[0] })))
        .status
    ).toBe(200)
    const row = await prisma.customerMfa.findUniqueOrThrow({
      where: { userId: user.id },
    })
    expect(row.secret).toBeNull()
    expect(row.enabledAt).toBeNull()
    expect(row.recoveryHashes).toEqual([])
    mocks.cookies.clear()
    expect((await passwordLogin()).status).toBe(200)
    expect((await getCurrentUser())?.id).toBe(user.id)
  })
  it('archiving after the first factor prevents challenge completion', async () => {
    const { user, codes } = await enroll()
    await challenge()
    await prisma.user.update({
      where: { id: user.id },
      data: { isArchived: true },
    })
    expect((await verify(request({ code: codes[0] }))).status).toBe(401)
    expect(await getCurrentUser()).toBeNull()
  })
  it('invalidates pre-enrollment cookies and rejects first-factor-only cookies', async () => {
    const { user } = await enroll()
    setSessionCookie(user.id)
    expect(await getCurrentUser()).toBeNull()
    const row = await prisma.customerMfa.findUniqueOrThrow({
      where: { userId: user.id },
    })
    setSessionCookie(user.id, { mfaVersion: row.version })
    expect(await getCurrentUser()).toBeNull()
  })
  it('enforces an account-wide attempt budget that new challenges cannot reset', async () => {
    const { user, codes } = await enroll()
    await challenge()
    for (let i = 0; i < 10; i++) await verify(request({ code: 'wrong' }))
    expect((await verify(request({ code: codes[0] }))).status).toBe(429)
    expect((await primaryLogin(user.id)).ok).toBe(false)
    await prisma.customerMfa.update({
      where: { userId: user.id },
      data: { windowStartedAt: new Date(Date.now() - 16 * 60000) },
    })
    expect((await verify(request({ code: codes[0] }))).status).toBe(200)
  })
  it('requires recent Google authentication for Google-only enrollment', async () => {
    const user = await customer(true)
    setSessionCookie(user.id, { primaryAt: Date.now() - 6 * 60000 })
    expect((await manage(request({ action: 'begin' }))).status).toBe(401)
    setSessionCookie(user.id, { primaryAt: Date.now() })
    expect((await manage(request({ action: 'begin' }))).status).toBe(200)
  })
  it('rejects expired setup and expired challenges', async () => {
    const { user, codes } = await enroll()
    const token = await challenge()
    await prisma.customerMfaChallenge.updateMany({
      data: { expiresAt: new Date(0) },
    })
    expect((await completeChallenge(token, codes[0])).ok).toBe(false)
    await prisma.customerMfa.update({
      where: { userId: user.id },
      data: { enabledAt: null, pendingExpiresAt: new Date(0) },
    })
    setSessionCookie(user.id, { mfaVersion: 1 })
    expect(
      (await manage(request({ action: 'confirm', code: '123456' }))).status
    ).toBe(401)
  })
  it('fails securely without encryption config while non-MFA and admin login still work', async () => {
    const { user, codes } = await enroll()
    await challenge()
    vi.stubEnv('MFA_ENCRYPTION_KEY', '')
    expect((await verify(request({ code: codes[0] }))).status).toBe(503)
    expect(await getCurrentUser()).toBeNull()
    await prisma.customerMfa.delete({ where: { userId: user.id } })
    expect((await passwordLogin()).status).toBe(200)
    expect((await getCurrentUser())?.id).toBe(user.id)
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'ADMIN' },
    })
    expect((await passwordLogin()).status).toBe(200)
    expect((await getCurrentAdmin())?.id).toBe(user.id)
    expect((await manage(request({ action: 'begin', password }))).status).toBe(
      401
    )
  })
  it('preserves password and Google login without MFA', async () => {
    const user = await customer()
    mocks.cookies.clear()
    const response = await passwordLogin()
    expect(response.status).toBe(200)
    expect((await response.json()).data.email).toBe(user.email)
    expect((await getCurrentUser())?.id).toBe(user.id)
    mocks.cookies.clear()
    mocks.google.mockResolvedValue({
      user: { email: user.email },
      primaryAuthenticatedAt: Date.now(),
    })
    expect(
      (await google(request({ email: user.email, firstName: 'Test' }))).status
    ).toBe(200)
    expect((await getCurrentUser())?.id).toBe(user.id)
  })
  it('does not issue a challenge for an incorrect primary password', async () => {
    await enroll()
    mocks.cookies.clear()
    expect(
      (
        await login(
          request({ email: 'mfa@example.test', password: 'wrong-password' })
        )
      ).status
    ).toBe(401)
    expect(mocks.cookies.has(CHALLENGE_COOKIE)).toBe(false)
    expect(await getCurrentUser()).toBeNull()
  })
  it('enforces MFA on a Google-only account and preserves recent primary auth time', async () => {
    const user = await customer(true)
    const setup = await begin()
    const enrolled = await manage(
      request({
        action: 'confirm',
        code: authenticator(setup.secret).generate(),
      })
    )
    const codes = (await enrolled.json()).data.recoveryCodes
    mocks.cookies.clear()
    mocks.google.mockResolvedValue({
      user: { email: user.email },
      primaryAuthenticatedAt: Date.now() - 6 * 60000,
    })
    expect(
      (await google(request({ email: user.email, firstName: 'Test' }))).status
    ).toBe(200)
    expect(await getCurrentUser()).toBeNull()
    expect((await verify(request({ code: codes[0] }))).status).toBe(200)
    // Completing MFA must not turn an old Google primary factor into a recent one.
    expect(
      (await manage(request({ action: 'disable', code: codes[1] }))).status
    ).toBe(401)
  })
})
