/**
 * Step-up email OTP — a self-contained verification challenge for confirming a
 * customer's identity before a sensitive Security action, WITHOUT a database
 * migration.
 *
 * The signed, session-bound cookie carries the OTP hash and expiry. The existing
 * RecentAuthRecord stores issuance, attempts and consumption under a row lock:
 *
 *   base64url(JSON{ userId, session, codeHash, expiresAt, attempts, sentAt }) . hmac
 *
 * Security properties:
 *  - The 6-digit code is generated with `randomInt` (CSPRNG) and only its
 *    SHA-256 hash is ever stored — never the plaintext (never logged, never in
 *    the cookie in the clear).
 *  - HMAC-signed with NEXTAUTH_SECRET → the client cannot forge/alter the
 *    challenge (change attempts, expiry, or which code is accepted).
 *  - Short TTL, single-use (cleared on success), attempt-limited, resend
 *    cooldown — all enforced server-side.
 *  - Bound to the userId, so a challenge issued for one account can't verify
 *    another.
 *
 * On success the caller issues the normal recent-auth record + cookie
 * (`setRecentAuthCookie`), so the elevated window is the SAME server-enforced
 * mechanism used by the password/Google/TOTP methods.
 */

import { createHash, createHmac, timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { generateOtp, hashOtp, OTP_TTL_MS, OTP_RESEND_COOLDOWN_MS, OTP_MAX_ATTEMPTS } from '@/lib/sensitive-change-utils'

export const STEP_UP_COOKIE = 'repixl-stepup-otp'
export { OTP_TTL_MS, OTP_RESEND_COOLDOWN_MS, OTP_MAX_ATTEMPTS }

interface StepUpChallenge {
  userId: string
  session: string
  codeHash: string
  expiresAt: number
  attempts: number
  sentAt: number
}

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXTAUTH_SECRET must be set in production for step-up signing.')
    }
    return 'repixl-dev-only-insecure-secret'
  }
  return secret
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

function encodeChallenge(c: StepUpChallenge): string {
  const payload = Buffer.from(JSON.stringify(c)).toString('base64url')
  return `${payload}.${sign(payload)}`
}

/** Decode + verify the signed challenge cookie. Returns null if forged/invalid. */
export function decodeChallenge(raw: string | undefined | null): StepUpChallenge | null {
  if (!raw) return null
  const parts = raw.split('.')
  if (parts.length !== 2) return null
  const [payload, sig] = parts
  const expected = sign(payload)
  const sigBuf = Buffer.from(sig)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'))
    if (
      typeof parsed?.userId !== 'string' ||
      typeof parsed?.session !== 'string' ||
      typeof parsed?.codeHash !== 'string' ||
      typeof parsed?.expiresAt !== 'number' ||
      typeof parsed?.attempts !== 'number' ||
      typeof parsed?.sentAt !== 'number'
    ) {
      return null
    }
    return parsed as StepUpChallenge
  } catch {
    return null
  }
}

async function writeCookie(challenge: StepUpChallenge): Promise<void> {
  const store = await cookies()
  store.set(STEP_UP_COOKIE, encodeChallenge(challenge), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    // Cookie lifetime tracks the OTP TTL; server still checks expiresAt.
    maxAge: Math.ceil(OTP_TTL_MS / 1000),
    path: '/',
  })
}

export async function clearStepUpChallenge(): Promise<void> {
  const store = await cookies()
  store.set(STEP_UP_COOKIE, '', { httpOnly: true, sameSite: 'strict', maxAge: 0, path: '/' })
}

export type StepUpSendResult =
  | { ok: true; code: string; ttlMs: number }
  | { ok: false; reason: 'cooldown'; retryInMs: number }

/**
 * Create (or replace) a step-up OTP challenge for `userId`. Enforces the resend
 * cooldown against the existing (valid) challenge cookie. Returns the plaintext
 * `code` ONLY so the caller can email it — it is never persisted or logged.
 */
async function sessionBinding() {
  const session = (await cookies()).get('repixl-session-token')?.value
  if (!session) throw new Error('Authenticated session required')
  return createHash('sha256').update(session).digest('hex')
}

export async function issueStepUpChallenge(userId: string): Promise<StepUpSendResult> {
  const session = await sessionBinding()
  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`
    const existing = await tx.recentAuthRecord.findUnique({ where: { userId } })
    const now = Date.now()
    if (existing && now - existing.verifiedAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      return { ok: false as const, reason: 'cooldown' as const, retryInMs: OTP_RESEND_COOLDOWN_MS - (now - existing.verifiedAt.getTime()) }
    }
    const windowExpired = !existing || now - existing.windowStart.getTime() >= 10 * 60 * 1000
    if (!windowExpired && existing.attempts >= OTP_MAX_ATTEMPTS) {
      return { ok: false as const, reason: 'cooldown' as const, retryInMs: 10 * 60 * 1000 - (now - existing.windowStart.getTime()) }
    }
    const code = generateOtp()
    await tx.recentAuthRecord.upsert({
      where: { userId },
      create: { userId, verifiedAt: new Date(now), expiresAt: new Date(0), attempts: 0, windowStart: new Date(now) },
      update: { verifiedAt: new Date(now), expiresAt: new Date(0), ...(windowExpired ? { attempts: 0, windowStart: new Date(now) } : {}) },
    })
    return { ok: true as const, code, sentAt: now }
  })
  if (!result.ok) return result
  await writeCookie({ userId, session, codeHash: hashOtp(result.code), sentAt: result.sentAt,
    expiresAt: result.sentAt + OTP_TTL_MS, attempts: 0 })
  return { ok: true, code: result.code, ttlMs: OTP_TTL_MS }
}

export type StepUpVerifyResult =
  | { ok: true }
  | { ok: false; reason: 'no_challenge' | 'expired' | 'locked' | 'mismatch'; attemptsLeft?: number }

/**
 * Verify a submitted OTP against the challenge cookie for `userId`.
 * On success the challenge is cleared (single-use). On a wrong code the attempt
 * counter is incremented (and the challenge is invalidated once the limit is
 * reached). Constant-time hash comparison.
 */
export async function verifyStepUpChallenge(userId: string, code: string): Promise<StepUpVerifyResult> {
  const store = await cookies()
  const challenge = decodeChallenge(store.get(STEP_UP_COOKIE)?.value)
  if (!challenge || challenge.userId !== userId || challenge.session !== await sessionBinding()) return { ok: false, reason: 'no_challenge' }
  if (Date.now() >= challenge.expiresAt) {
    await clearStepUpChallenge()
    return { ok: false, reason: 'expired' }
  }
  const result = await prisma.$transaction(async (tx): Promise<StepUpVerifyResult> => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`
    const record = await tx.recentAuthRecord.findUnique({ where: { userId } })
    // expiresAt=epoch identifies an unconsumed challenge, never recent auth.
    if (!record || record.verifiedAt.getTime() !== challenge.sentAt || record.expiresAt.getTime() !== 0) return { ok: false, reason: 'no_challenge' }
    if (record.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, reason: 'locked' }
    const submitted = Buffer.from(hashOtp(String(code ?? '')))
    const expected = Buffer.from(challenge.codeHash)
    if (submitted.length !== expected.length || !timingSafeEqual(submitted, expected)) {
      const attempts = record.attempts + 1
      await tx.recentAuthRecord.update({ where: { userId }, data: { attempts } })
      return { ok: false, reason: 'mismatch', attemptsLeft: OTP_MAX_ATTEMPTS - attempts }
    }
    // Consume in the database BEFORE returning, including concurrent requests
    // or a client replaying an older signed cookie. This remains expired.
    await tx.recentAuthRecord.update({ where: { userId }, data: { expiresAt: new Date(1) } })
    return { ok: true }
  })
  if (result.ok || result.reason === 'locked' || (result.reason === 'mismatch' && result.attemptsLeft === 0)) await clearStepUpChallenge()
  return result
}
