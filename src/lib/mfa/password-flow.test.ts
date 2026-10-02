/** Route-to-service regression tests. Crypto, bcrypt, sessions, QR generation,
 * and handlers are real; persistence and email/Google providers are test doubles.
 * These do not claim PostgreSQL or live OAuth/browser end-to-end verification. */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'

const state = vi.hoisted(() => ({
  cookies: new Map<string, string>(), user: null as any, mfa: null as any,
  recent: null as any, challenges: new Map<string, any>(), google: vi.fn(),
  transactionOptions: [] as Array<{ maxWait?: number; timeout?: number } | undefined>,
}))
vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
  cookies: async () => ({
    get: (key: string) => state.cookies.has(key) ? { value: state.cookies.get(key) } : undefined,
    set: (key: string, value: string, options: { maxAge?: number }) => {
      if (options.maxAge === 0) state.cookies.delete(key)
      else state.cookies.set(key, value)
    },
  }),
}))
vi.mock('next-auth', () => ({ getServerSession: state.google }))
vi.mock('@/lib/next-auth-options', () => ({ authOptions: {} }))
vi.mock('@/lib/mailer', () => ({ sendNotificationEmail: vi.fn(async () => ({ ok: true })) }))
vi.mock('@/lib/retired-auth-email', () => ({ isRetiredAuthEmail: async () => false }))
vi.mock('@/lib/prisma', () => {
  const tx = {
    $queryRaw: async () => [],
    user: {
      findUnique: async ({ where }: any) => state.user && (where.id === state.user.id || where.email === state.user.email)
        ? { ...state.user, customerMfa: state.mfa } : null,
      updateMany: async ({ where, data }: any) => {
        if (state.user.id !== where.id || state.user.password !== where.password) return { count: 0 }
        Object.assign(state.user, data); return { count: 1 }
      },
    },
    recentAuthRecord: {
      findUnique: async () => state.recent,
      upsert: async ({ create, update }: any) => (state.recent = state.recent ? { ...state.recent, ...update } : { ...create }),
      update: async ({ data }: any) => (state.recent = { ...state.recent, ...data }),
    },
    customerMfa: {
      findUnique: async () => state.mfa,
      upsert: async ({ create }: any) => (state.mfa ??= {
        ...create, enabledAt: null, secret: null, pendingExpiresAt: null, version: 0,
        lastStep: -1, recoveryHashes: [], recoveryAcknowledged: false,
        windowStartedAt: new Date(), attempts: 0,
      }),
      update: async ({ data }: any) => (state.mfa = { ...state.mfa, ...data }),
    },
    customerMfaChallenge: {
      deleteMany: async () => state.challenges.clear(),
      create: async ({ data }: any) => state.challenges.set(data.tokenHash, { ...data }),
      findUnique: async ({ where }: any) => state.challenges.get(where.tokenHash) ?? null,
      delete: async ({ where }: any) => state.challenges.delete(where.tokenHash),
    },
  }
  return {
    prisma: {
      ...tx,
      $transaction: async (fn: any, options?: { maxWait?: number; timeout?: number }) => {
        state.transactionOptions.push(options)
        return fn(tx)
      },
    },
  }
})
import { POST as recentAuth } from '@/app/api/auth/recent-auth/route'
import { POST as manage, GET as status } from '@/app/api/auth/mfa/route'
import { POST as login } from '@/app/api/auth/login/route'
import { POST as googleLogin } from '@/app/api/auth/oauth/login/route'
import { POST as verify } from '@/app/api/auth/mfa/verify/route'
import { POST as setPassword } from '@/app/api/auth/set-password/route'
import { checkRecentAuth, getCurrentUser, setSessionCookie, setRecentAuthCookie, RECENT_AUTH_COOKIE } from '@/lib/auth-helpers'
import { authenticator, decryptSecret } from './crypto'
import { CHALLENGE_COOKIE, manageMfa } from './service'

const password = 'Test-password-123!'
const request = (body: unknown) => new NextRequest('http://localhost/api/auth/mfa', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' }, body: JSON.stringify(body),
})
async function verifyPassword(value = password) {
  return recentAuth(request({ method: 'password', password: value }))
}
async function setup() {
  expect((await verifyPassword()).status).toBe(200)
  const res = await manage(request({ action: 'begin' }))
  expect(res.status).toBe(200)
  return (await res.json()).data
}
async function enroll() {
  const provisioning = await setup()
  const res = await manage(request({ action: 'confirm', code: authenticator(provisioning.secret).generate() }))
  expect(res.status).toBe(200)
  return { ...provisioning, codes: (await res.json()).data.recoveryCodes }
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-01T10:00:00Z'))
  vi.stubEnv('MFA_ENCRYPTION_KEY', 'ab'.repeat(32))
  vi.stubEnv('NEXTAUTH_SECRET', 'test-signing-key')
  vi.stubEnv('NEXTAUTH_URL', 'http://localhost')
  state.cookies.clear(); state.challenges.clear(); state.recent = null; state.mfa = null
  state.transactionOptions = []
  state.google.mockReset()
  state.user = { id: 'test-customer', email: 'customer@example.test', password: await bcrypt.hash(password, 4),
    firstName: 'Test', lastName: 'Customer', role: 'CUSTOMER', isArchived: false, isSuperAdmin: false }
  await setSessionCookie(state.user.id, { primaryAt: Date.now() - 60 * 60 * 1000 })
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs() })

describe('password step-up through real MFA handlers', () => {
  it('allows serialized MFA work to exceed Prisma interactive-transaction defaults', async () => {
    await setup()
    expect(state.transactionOptions[state.transactionOptions.length - 1]).toEqual({
      maxWait: 10_000,
      timeout: 30_000,
    })
  })
  it('wrong password fails; correct password satisfies enrollment without Google or resending password', async () => {
    expect((await verifyPassword('wrong')).status).toBe(401)
    expect((await manage(request({ action: 'begin', verified: true }))).status).toBe(401)
    const provisioning = await setup()
    expect(state.google).not.toHaveBeenCalled()
    expect(provisioning.qrCode).toMatch(/^data:image\/png;base64,/)
    expect(state.mfa.enabledAt).toBeNull()
    expect(decryptSecret(state.mfa.secret, state.user.id)).toBe(provisioning.secret)
    const response = await status()
    expect(await response.text()).not.toContain(provisioning.secret)
  })
  it('locks after five wrong password attempts without issuing a verification cookie', async () => {
    for (let i = 0; i < 4; i++) expect((await verifyPassword('wrong')).status).toBe(401)
    expect((await verifyPassword('wrong')).status).toBe(429)
    expect((await verifyPassword()).status).toBe(429)
    expect(state.cookies.has(RECENT_AUTH_COOKIE)).toBe(false)
    vi.setSystemTime(Date.now() + 10 * 60000)
    expect((await verifyPassword()).status).toBe(200)
  })
  it('expired verification fails at both the endpoint and the service', async () => {
    await verifyPassword()
    vi.setSystemTime(Date.now() + 12 * 60000)
    expect((await manage(request({ action: 'begin' }))).status).toBe(401)
    expect((await manageMfa(state.user.id, 'begin', {}, 0, 0)).ok).toBe(false)
  })
  it('rejects forged, other-session, wrong-method, and stale database verification', async () => {
    await verifyPassword()
    const original = state.cookies.get(RECENT_AUTH_COOKIE)!
    state.cookies.set(RECENT_AUTH_COOKIE, original + 'x')
    expect(await checkRecentAuth(state.user.id, 'password')).toBe(false)
    state.cookies.set(RECENT_AUTH_COOKIE, original)
    await setRecentAuthCookie(state.user.id, 'google')
    expect((await manage(request({ action: 'begin' }))).status).toBe(401)
    await verifyPassword()
    vi.setSystemTime(Date.now() + 1)
    await setSessionCookie(state.user.id)
    expect(await checkRecentAuth(state.user.id, 'password')).toBe(false)
    await verifyPassword()
    state.recent.verifiedAt = new Date(0)
    expect(await checkRecentAuth(state.user.id, 'password')).toBe(false)
  })
  it('activates only after valid TOTP; password login challenges; wrong/replayed code fails; disable requires fresh password plus second factor', async () => {
    const provisioning = await setup()
    expect((await manage(request({ action: 'confirm', code: 'wrong' }))).status).toBe(401)
    expect(state.mfa.enabledAt).toBeNull()
    const confirmation = await manage(request({ action: 'confirm', code: authenticator(provisioning.secret).generate() }))
    expect(confirmation.status).toBe(200)
    expect(state.mfa.enabledAt).not.toBeNull()
    expect((await getCurrentUser())?.id).toBe(state.user.id)
    // Enrollment changes the session version and invalidates previous step-up.
    expect((await manage(request({ action: 'disable', code: 'wrong' }))).status).toBe(401)
    state.cookies.clear()
    const primary = await login(request({ email: state.user.email, password }))
    expect((await primary.json()).data).toEqual({ mfaRequired: true })
    expect(state.cookies.has(CHALLENGE_COOKIE)).toBe(true)
    expect(await getCurrentUser()).toBeNull()
    expect((await verify(request({ code: 'wrong' }))).status).toBe(401)
    vi.setSystemTime(Date.now() + 30000)
    const code = authenticator(provisioning.secret).generate()
    expect((await verify(request({ code }))).status).toBe(200)
    expect((await getCurrentUser())?.id).toBe(state.user.id)
    expect((await verify(request({ code }))).status).toBe(401)
    expect((await manage(request({ action: 'disable', code }))).status).toBe(401)
    expect((await verifyPassword()).status).toBe(200)
    expect((await manage(request({ action: 'disable', code: 'wrong' }))).status).toBe(401)
    vi.setSystemTime(Date.now() + 30000)
    expect((await manage(request({ action: 'disable', code: authenticator(provisioning.secret).generate() }))).status).toBe(200)
    expect(state.mfa.enabledAt).toBeNull()
    expect(state.mfa.secret).toBeNull()
    expect(state.mfa.recoveryHashes).toEqual([])
    state.cookies.clear()
    expect((await login(request({ email: state.user.email, password }))).status).toBe(200)
    expect((await getCurrentUser())?.id).toBe(state.user.id)
  })
  it('expired pending setup never activates', async () => {
    const provisioning = await setup()
    vi.setSystemTime(Date.now() + 5 * 60000)
    expect((await manage(request({ action: 'confirm', code: authenticator(provisioning.secret).generate() }))).status).toBe(401)
    expect(state.mfa.enabledAt).toBeNull()
  })
  it('recovery regeneration requires fresh step-up and invalidates old recovery codes', async () => {
    const { codes } = await enroll()
    expect((await manage(request({ action: 'regenerate', code: codes[0] }))).status).toBe(401)
    await verifyPassword()
    const res = await manage(request({ action: 'regenerate', code: codes[0] }))
    expect(res.status).toBe(200)
    const next = (await res.json()).data.recoveryCodes
    await verifyPassword()
    expect((await manage(request({ action: 'disable', code: codes[1] }))).status).toBe(401)
    expect((await manage(request({ action: 'disable', code: next[0] }))).status).toBe(200)
  })
  it('Google-only cannot fake password verification or enroll; ownership verification allows Set Password', async () => {
    state.user.password = ''
    expect((await verifyPassword()).status).toBe(400)
    expect((await manageMfa(state.user.id, 'begin', {}, Date.now(), 0)).ok).toBe(false)
    const body = { newPassword: password, confirmPassword: password }
    expect((await setPassword(request(body))).status).toBe(401)
    await setRecentAuthCookie(state.user.id, 'email')
    expect((await setPassword(request(body))).status).toBe(200)
    expect(await bcrypt.compare(password, state.user.password)).toBe(true)
    expect(state.cookies.has(RECENT_AUTH_COOKIE)).toBe(false)
    await setup()
  })
  it.each([false, true])('normal Google login remains separate from step-up (MFA=%s)', async (mfa) => {
    if (mfa) await enroll()
    state.cookies.clear()
    state.google.mockResolvedValue({ user: { email: state.user.email }, primaryAuthenticatedAt: Date.now() })
    const response = await googleLogin(request({ email: state.user.email, firstName: 'Test' }))
    expect(response.status).toBe(200)
    if (mfa) {
      expect((await response.json()).data).toEqual({ mfaRequired: true })
      expect(await getCurrentUser()).toBeNull()
    } else expect((await getCurrentUser())?.id).toBe(state.user.id)
    expect(await checkRecentAuth(state.user.id, 'password')).toBe(false)
  })
})
