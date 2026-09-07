import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { readFileSync } from 'node:fs'
const mocks = vi.hoisted(() => ({
  cookies: new Map<string, string>(),
  google: vi.fn(),
}))
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (key: string) =>
      mocks.cookies.has(key) ? { value: mocks.cookies.get(key) } : undefined,
    set: (key: string, value: string, opts: { maxAge?: number }) =>
      opts?.maxAge === 0
        ? mocks.cookies.delete(key)
        : mocks.cookies.set(key, value),
  }),
}))
vi.mock('next-auth', () => ({ getServerSession: mocks.google }))
vi.mock('@/lib/mailer', () => ({
  sendNotificationEmail: vi.fn().mockResolvedValue({ ok: true }),
}))
vi.mock('@/lib/prisma', async () => {
  const { PrismaClient } = await import('@prisma/client')
  return {
    prisma: new PrismaClient({
      datasources: {
        db: {
          url:
            process.env.TEST_PROFILE_DATABASE_URL ??
            'postgresql://localhost/unused',
        },
      },
    }),
  }
})
import { prisma } from './prisma'
import { createChallenge, verifyChallenge } from './sensitive-change'
import { setSessionCookie, getCurrentUser } from './auth-helpers'
import { primaryLogin } from './mfa/service'
import { GET as me, PUT as update } from '@/app/api/auth/me/route'
import { POST as emailChange } from '@/app/api/account/email/route'
import { POST as phoneChange } from '@/app/api/account/phone/route'
import { POST as dobChange } from '@/app/api/account/dob/route'
import { POST as oauth } from '@/app/api/auth/oauth/login/route'
import { POST as registerGoogle } from '@/app/api/auth/oauth/register/route'

const url = process.env.TEST_PROFILE_DATABASE_URL
if (url) {
  const parsed = new URL(url)
  if (
    !['localhost', '127.0.0.1'].includes(parsed.hostname) ||
    parsed.pathname !== '/repixl_profile_test'
  )
    throw new Error('Disposable local profile test DB required')
}
const request = (body: unknown) =>
  new NextRequest('http://localhost/api/account/email', {
    method: 'POST',
    headers: { Origin: 'http://localhost', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
async function fixture(password = 'hash') {
  const user = await prisma.user.create({
    data: {
      email: 'old@example.test',
      password,
      firstName: 'Test',
      lastName: 'User',
      phone: '09171234567',
      dateOfBirth: new Date('1990-06-15'),
    },
  })
  setSessionCookie(user.id)
  return user
}
async function verifyType(
  userId: string,
  type:
    | 'CHANGE_PHONE'
    | 'CHANGE_DOB'
    | 'CHANGE_EMAIL_VERIFY_OLD'
    | 'CHANGE_EMAIL_VERIFY_NEW',
  pendingEmail?: string
) {
  const code = await createChallenge(userId, type, pendingEmail)
  expect((await verifyChallenge(userId, type, code, pendingEmail)).ok).toBe(
    true
  )
  return code
}
describe('profile UI data contract', () => {
  it('uses masked state and hides the Google-only email action', () => {
    const source = readFileSync(
      'src/components/account/ProfilePanel.tsx',
      'utf8'
    )
    expect(source).toContain('managed={!hasPassword}')
    expect(source).toContain('Managed through Google')
    expect(source).toContain('maskedPhone')
    expect(source).not.toContain('dateOfBirth')
    expect(source).not.toContain('userPhone')
  })
  it('uses the existing OAuth logout convention and never preloads raw values in the modal', () => {
    const modal = readFileSync(
      'src/components/account/SensitiveChangeModal.tsx',
      'utf8'
    )
    expect(modal).toContain('setLogoutPreference(true)')
    expect(modal).toContain('signOut({ redirect: false })')
    expect(modal).toMatch(/newValue.*useState\(''\)/)
    expect(readFileSync('src/hooks/useOAuthSync.ts', 'utf8')).toContain(
      'repixl-oauth-logged-out'
    )
  })
})
describe.skipIf(!url)('sensitive profile PostgreSQL regression', () => {
  beforeEach(async () => {
    vi.stubEnv('NEXTAUTH_SECRET', 'profile-test-signing-key')
    vi.stubEnv('NEXTAUTH_URL', 'http://localhost')
    mocks.cookies.clear()
    mocks.google.mockReset()
    await prisma.user.deleteMany()
    await prisma.retiredAuthEmail.deleteMany()
  })
  afterAll(async () => {
    await prisma.$disconnect()
    vi.unstubAllEnvs()
  })
  it('GET and PUT return masks and hasPassword without raw phone/DOB', async () => {
    const user = await fixture()
    for (const response of [
      await me(new NextRequest('http://localhost/api/auth/me')),
      await update(request({ firstName: 'New', lastName: 'Name' })),
    ]) {
      const body = (await response.json()).data
      expect(body.maskedPhone).toBe('*******4567')
      expect(body.maskedDob).toBe('**/**/1990')
      expect(body.hasPassword).toBe(true)
      expect(body).not.toHaveProperty('phone')
      expect(body).not.toHaveProperty('dateOfBirth')
      expect(JSON.stringify(body)).not.toContain(user.phone)
    }
  })
  it('generic profile update ignores sensitive values', async () => {
    const user = await fixture()
    expect(
      (
        await update(
          request({
            firstName: 'New',
            lastName: 'Name',
            email: 'attacker@example.test',
            phone: '09999999999',
            dateOfBirth: '2000-01-01',
          })
        )
      ).status
    ).toBe(200)
    const current = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    })
    expect(current.email).toBe(user.email)
    expect(current.phone).toBe(user.phone)
    expect(current.dateOfBirth).toEqual(user.dateOfBirth)
  })
  it('blocks Google-only email changes and even OTP issuance', async () => {
    const user = await fixture('')
    expect(
      (await emailChange(request({ newEmail: 'new@example.test' }))).status
    ).toBe(403)
    await expect(
      createChallenge(user.id, 'CHANGE_EMAIL_VERIFY_OLD')
    ).rejects.toThrow()
    expect(await prisma.user.count()).toBe(1)
  })
  it('requires old-email verification before issuing the new-email code', async () => {
    const user = await fixture()
    await expect(
      createChallenge(user.id, 'CHANGE_EMAIL_VERIFY_NEW', 'new@example.test')
    ).rejects.toThrow()
  })
  it('OTP verification succeeds once under concurrent requests', async () => {
    const user = await fixture()
    const otp = await createChallenge(user.id, 'CHANGE_PHONE')
    const result = await Promise.all([
      verifyChallenge(user.id, 'CHANGE_PHONE', otp),
      verifyChallenge(user.id, 'CHANGE_PHONE', otp),
    ])
    expect(result.filter((r) => r.ok)).toHaveLength(1)
  })
  it.each([
    ['phone', 'CHANGE_PHONE', phoneChange, { newPhone: '09991234567' }],
    ['dob', 'CHANGE_DOB', dobChange, { newDob: '1995-01-01' }],
  ] as const)(
    '%s mutation consumes authorization once, including concurrent replay',
    async (_label, type, handler, body) => {
      const user = await fixture()
      await verifyType(user.id, type)
      const responses = await Promise.all([
        handler(request(body)),
        handler(request(body)),
      ])
      expect(responses.map((r) => r.status).sort()).toEqual([200, 403])
      expect((await handler(request(body))).status).toBe(403)
    }
  )
  it('dual OTP changes email once, revokes old cookies, and blocks stale Google login/duplicate registration', async () => {
    const user = await fixture()
    const oldCookie = mocks.cookies.get('repixl-session-token')!
    await verifyType(user.id, 'CHANGE_EMAIL_VERIFY_OLD')
    await verifyType(user.id, 'CHANGE_EMAIL_VERIFY_NEW', 'new@example.test')
    expect(
      (await emailChange(request({ newEmail: 'new@example.test' }))).status
    ).toBe(200)
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).email
    ).toBe('new@example.test')
    mocks.cookies.set('repixl-session-token', oldCookie)
    expect(await getCurrentUser()).toBeNull()
    expect(
      (await emailChange(request({ newEmail: 'new@example.test' }))).status
    ).toBe(401)
    mocks.google.mockResolvedValue({
      user: { email: user.email },
      primaryAuthenticatedAt: Date.now(),
    })
    expect(
      (await oauth(request({ email: user.email, firstName: 'Test' }))).status
    ).toBe(403)
    expect(
      (await registerGoogle(request({ email: user.email, firstName: 'Test' })))
        .status
    ).toBe(403)
    expect(await prisma.user.count()).toBe(1)
    expect((await primaryLogin(user.id, Date.now(), user.email)).ok).toBe(false)
    expect(
      (await primaryLogin(user.id, Date.now(), 'new@example.test')).ok
    ).toBe(true)
  })
  it('email authorizations are bound to pendingEmail and require BOTH verified codes', async () => {
    const user = await fixture()
    await verifyType(user.id, 'CHANGE_EMAIL_VERIFY_OLD')
    await verifyType(user.id, 'CHANGE_EMAIL_VERIFY_NEW', 'new@example.test')
    expect(
      (await emailChange(request({ newEmail: 'other@example.test' }))).status
    ).toBe(403)
    await prisma.sensitiveChangeChallenge.deleteMany({
      where: { userId: user.id, changeType: 'CHANGE_EMAIL_VERIFY_OLD' },
    })
    expect(
      (await emailChange(request({ newEmail: 'new@example.test' }))).status
    ).toBe(403)
  })
  it('expired verified authorization cannot mutate and wrong attempts cannot race past limits', async () => {
    const user = await fixture()
    await verifyType(user.id, 'CHANGE_PHONE')
    await prisma.sensitiveChangeChallenge.updateMany({
      data: { expiresAt: new Date(0) },
    })
    expect(
      (await phoneChange(request({ newPhone: '09991234567' }))).status
    ).toBe(403)
    await prisma.sensitiveChangeChallenge.deleteMany()
    const code = await createChallenge(user.id, 'CHANGE_DOB')
    await Promise.all(
      Array.from({ length: 8 }, () =>
        verifyChallenge(user.id, 'CHANGE_DOB', 'invalid')
      )
    )
    expect((await verifyChallenge(user.id, 'CHANGE_DOB', code)).ok).toBe(false)
    expect(
      (await prisma.sensitiveChangeChallenge.findFirstOrThrow()).attempts
    ).toBe(5)
  })
  it('concurrent email mutations commit only one session invalidation and one change', async () => {
    const user = await fixture()
    await verifyType(user.id, 'CHANGE_EMAIL_VERIFY_OLD')
    await verifyType(user.id, 'CHANGE_EMAIL_VERIFY_NEW', 'new@example.test')
    const responses = await Promise.all([
      emailChange(request({ newEmail: 'new@example.test' })),
      emailChange(request({ newEmail: 'new@example.test' })),
    ])
    expect(responses.filter((r) => r.status === 200)).toHaveLength(1)
    expect(responses.filter((r) => r.status >= 400)).toHaveLength(1)
    expect(
      (
        await prisma.customerMfa.findUniqueOrThrow({
          where: { userId: user.id },
        })
      ).version
    ).toBe(1)
    expect(await prisma.retiredAuthEmail.count()).toBe(1)
  })
})
