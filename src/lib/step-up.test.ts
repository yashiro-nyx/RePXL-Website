import { beforeEach, describe, expect, it, vi } from 'vitest'

// In-memory cookie jar so we can exercise the signed step-up challenge cookie
// without a real request context.
const jar = new Map<string, string>()
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined),
    set: (name: string, value: string) => {
      if (value === '') jar.delete(name)
      else jar.set(name, value)
    },
  }),
}))

let record: Record<string, any> | null = null
vi.mock('@/lib/prisma', () => {
  const tx = {
    $queryRaw: async () => [],
    recentAuthRecord: {
      findUnique: async () => record,
      upsert: async ({ create, update }: any) => { record = record ? { ...record, ...update } : create; return record },
      update: async ({ data }: any) => { record = { ...record, ...data }; return record },
    },
  }
  return { prisma: { ...tx, $transaction: async (fn: any) => fn(tx) } }
})

import {
  issueStepUpChallenge,
  verifyStepUpChallenge,
  decodeChallenge,
  clearStepUpChallenge,
  STEP_UP_COOKIE,
  OTP_MAX_ATTEMPTS,
} from './step-up'

const USER = 'user_1'

describe('step-up email OTP challenge', () => {
  beforeEach(() => {
    jar.clear()
    jar.set('repixl-session-token', 'test-session')
    record = null
    vi.restoreAllMocks()
  })

  it('issues a 6-digit code and stores only its hash in a signed cookie (no plaintext)', async () => {
    const res = await issueStepUpChallenge(USER)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.code).toMatch(/^\d{6}$/)
    const cookie = jar.get(STEP_UP_COOKIE)!
    expect(cookie).toBeTruthy()
    // The plaintext code must never appear in the cookie.
    expect(cookie).not.toContain(res.code)
    const decoded = decodeChallenge(cookie)
    expect(decoded?.userId).toBe(USER)
    expect(decoded?.attempts).toBe(0)
  })

  it('verifies the correct code once (single-use), then the challenge is gone', async () => {
    const res = await issueStepUpChallenge(USER)
    if (!res.ok) throw new Error('send failed')
    const ok = await verifyStepUpChallenge(USER, res.code)
    expect(ok).toEqual({ ok: true })
    // Single-use: cookie cleared → a replay of the same code fails.
    expect(jar.get(STEP_UP_COOKIE)).toBeUndefined()
    const replay = await verifyStepUpChallenge(USER, res.code)
    expect(replay.ok).toBe(false)
  })

  it('rejects a wrong code and counts attempts, locking after the max', async () => {
    await issueStepUpChallenge(USER)
    for (let i = 1; i < OTP_MAX_ATTEMPTS; i++) {
      const r = await verifyStepUpChallenge(USER, '000000')
      expect(r).toEqual({ ok: false, reason: 'mismatch', attemptsLeft: OTP_MAX_ATTEMPTS - i })
    }
    // Final wrong attempt locks + clears the challenge.
    const locked = await verifyStepUpChallenge(USER, '000000')
    expect(locked.ok).toBe(false)
    expect(jar.get(STEP_UP_COOKIE)).toBeUndefined()
  })

  it('rejects an expired challenge', async () => {
    await issueStepUpChallenge(USER)
    // Fast-forward well past the TTL.
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 60 * 60 * 1000)
    const r = await verifyStepUpChallenge(USER, '123456')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('expired')
  })

  it('is bound to the user — another user cannot verify the challenge', async () => {
    const res = await issueStepUpChallenge(USER)
    if (!res.ok) throw new Error('send failed')
    const r = await verifyStepUpChallenge('someone_else', res.code)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('no_challenge')
  })

  it('enforces a resend cooldown', async () => {
    const first = await issueStepUpChallenge(USER)
    expect(first.ok).toBe(true)
    const second = await issueStepUpChallenge(USER)
    expect(second.ok).toBe(false)
    if (!second.ok) expect(second.reason).toBe('cooldown')
  })

  it('rejects a forged/tampered cookie (bad signature)', async () => {
    await issueStepUpChallenge(USER)
    // Tamper with the payload — signature no longer matches.
    const tampered = 'eyJ1c2VySWQiOiJhdHRhY2tlciJ9.deadbeef'
    expect(decodeChallenge(tampered)).toBeNull()
  })

  it('rejects replay of a consumed signed cookie', async () => {
    const sent = await issueStepUpChallenge(USER)
    if (!sent.ok) throw new Error('send failed')
    const old = jar.get(STEP_UP_COOKIE)!
    expect((await verifyStepUpChallenge(USER, sent.code)).ok).toBe(true)
    jar.set(STEP_UP_COOKIE, old)
    expect((await verifyStepUpChallenge(USER, sent.code)).ok).toBe(false)
  })
  it('replaying the original cookie cannot reset the attempt budget', async () => {
    const sent = await issueStepUpChallenge(USER)
    if (!sent.ok) throw new Error('send failed')
    const old = jar.get(STEP_UP_COOKIE)!
    const wrong = sent.code === '000000' ? '111111' : '000000'
    for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) {
      jar.set(STEP_UP_COOKIE, old)
      await verifyStepUpChallenge(USER, wrong)
    }
    jar.set(STEP_UP_COOKIE, old)
    expect((await verifyStepUpChallenge(USER, sent.code)).ok).toBe(false)
  })
  it('clearing the cookie cannot bypass resend cooldown', async () => {
    await issueStepUpChallenge(USER)
    jar.delete(STEP_UP_COOKIE)
    expect((await issueStepUpChallenge(USER)).ok).toBe(false)
  })
  it('another login session cannot use the same challenge', async () => {
    const sent = await issueStepUpChallenge(USER)
    if (!sent.ok) throw new Error('send failed')
    jar.set('repixl-session-token', 'different-session')
    expect((await verifyStepUpChallenge(USER, sent.code)).ok).toBe(false)
  })
  it('clears the challenge on demand', async () => {
    await issueStepUpChallenge(USER)
    await clearStepUpChallenge()
    expect(jar.get(STEP_UP_COOKIE)).toBeUndefined()
  })
})
