import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'crypto'
import { prisma } from './prisma'

// ─── Session Token Management ───────────────────────────────────────────────────
// Simple token-based sessions stored as HTTP-only cookies.
// The token is the user ID encrypted/hashed — for this project we use a simple
// approach where the session cookie contains a signed user ID.

const SESSION_COOKIE = 'repixl-session-token'
const ADMIN_SESSION_COOKIE = 'repixl-admin-session-token'
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 // 7 days for customers
const ADMIN_SESSION_MAX_AGE = 60 * 60 // 1 hour for admin

export interface SessionUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'CUSTOMER' | 'ADMIN'
  isSuperAdmin: boolean
}

/**
 * Secret used to sign session tokens. Falls back to a dev-only value so local
 * development works without config, but production MUST set NEXTAUTH_SECRET.
 */
function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXTAUTH_SECRET must be set in production for session signing.')
    }
    return 'repixl-dev-only-insecure-secret'
  }
  return secret
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

/**
 * Create a signed session token: base64url(payload).base64url(hmac(payload)).
 * The HMAC prevents forging a token for an arbitrary userId.
 */
interface CustomerSessionProof { mfaVersion?: number; mfaVerified?: boolean; primaryAt?: number }

function createToken(userId: string, proof: CustomerSessionProof = {}): string {
  const payload = Buffer.from(JSON.stringify({ userId, iat: Date.now(), ...proof })).toString('base64url')
  return `${payload}.${sign(payload)}`
}

/**
 * Decode and verify a signed session token. Returns null if the signature is
 * missing/invalid or the payload cannot be parsed.
 */
function decodeToken(token: string): ({ userId: string; iat: number } & CustomerSessionProof) | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [payload, signature] = parts
  const expected = sign(payload)

  // Constant-time comparison to avoid signature timing leaks.
  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null
  }

  try {
    const decoded = Buffer.from(payload, 'base64url').toString('utf-8')
    const parsed = JSON.parse(decoded)
    if (typeof parsed?.userId !== 'string' || typeof parsed?.iat !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

/**
 * Set session cookie for customer
 */
export function setSessionCookie(userId: string, proof: CustomerSessionProof = {}) {
  const token = createToken(userId, { primaryAt: Date.now(), ...proof })
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

/**
 * Set session cookie for admin
 */
export function setAdminSessionCookie(userId: string) {
  const token = createToken(userId)
  cookies().set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ADMIN_SESSION_MAX_AGE,
    path: '/',
  })
}

/**
 * Clear customer session
 */
export function clearSessionCookie() {
  cookies().set(SESSION_COOKIE, '', { maxAge: 0, path: '/' })
}

/**
 * Clear admin session
 */
export function clearAdminSessionCookie() {
  cookies().set(ADMIN_SESSION_COOKIE, '', { maxAge: 0, path: '/' })
}

/**
 * Get current authenticated user from customer session cookie
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value

  if (!token) return null

  const decoded = decodeToken(token)
  if (!decoded) return null

  // Check session expiry
  if (Date.now() - decoded.iat > SESSION_MAX_AGE * 1000) return null

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isSuperAdmin: true,
      isArchived: true,
      customerMfa: { select: { enabledAt: true, version: true } },
    },
  })

  if (!user || user.isArchived) return null
  if (user.role === 'CUSTOMER') {
    if ((decoded.mfaVersion ?? 0) !== (user.customerMfa?.version ?? 0)) return null
    if (user.customerMfa?.enabledAt && decoded.mfaVerified !== true) return null
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
  }
}

/**
 * Get current authenticated admin from admin session cookie
 */
export async function getCurrentAdmin(): Promise<SessionUser | null> {
  const cookieStore = cookies()
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value

  if (!token) return null

  const decoded = decodeToken(token)
  if (!decoded) return null

  // Check admin session expiry (1 hour)
  if (Date.now() - decoded.iat > ADMIN_SESSION_MAX_AGE * 1000) return null

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isSuperAdmin: true,
      isArchived: true,
    },
  })

  if (!user || user.role !== 'ADMIN' || user.isArchived) return null

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
  }
}

/**
 * Require authenticated user — returns user or throws
 */
export async function requireUser(): Promise<SessionUser | null> {
  return getCurrentUser()
}

/**
 * Require admin user — returns admin or null
 */
export async function requireAdmin(): Promise<SessionUser | null> {
  return getCurrentAdmin()
}

/** Signed time of the primary factor, never extended by hydration or MFA setup. */
export function customerPrimaryAuthTime(): number {
  const token = cookies().get(SESSION_COOKIE)?.value
  const decoded = token ? decodeToken(token) : null
  return decoded?.primaryAt ?? 0
}

export function customerMfaSessionVersion(): number {
  const token = cookies().get(SESSION_COOKIE)?.value
  return (token ? decodeToken(token)?.mfaVersion : undefined) ?? 0
}

// ─── Recent Re-Authentication ───────────────────────────────────────────────────
// Customers must re-verify identity before accessing sensitive Security pages.
// Window: 12 minutes. State is canonical in the DB; cookie carries only a signed
// userId claim so it cannot be forged or replayed across logouts.

export const RECENT_AUTH_COOKIE = 'repixl-recent-auth'
export const RECENT_AUTH_WINDOW_MS = 12 * 60 * 1000   // 12 minutes
// Attempt budget: 5 wrong passwords per 10-minute window before lockout
const RECENT_AUTH_MAX_ATTEMPTS = 5
const RECENT_AUTH_ATTEMPT_WINDOW_MS = 10 * 60 * 1000

/**
 * Issue a short-lived recent-auth cookie and persist the canonical record in the DB.
 * The cookie payload is `{userId}.{hmac}` — cannot be forged without NEXTAUTH_SECRET.
 * Called after the customer successfully re-verifies their identity.
 */
export async function setRecentAuthCookie(userId: string): Promise<void> {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + RECENT_AUTH_WINDOW_MS)

  // Upsert DB record — canonical source of truth
  await prisma.recentAuthRecord.upsert({
    where:  { userId },
    create: { userId, verifiedAt: now, expiresAt, attempts: 0, windowStart: now },
    update: { verifiedAt: now, expiresAt, attempts: 0, windowStart: now },
  })

  // Issue signed cookie
  const token = createRecentAuthToken(userId)
  cookies().set(RECENT_AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: Math.floor(RECENT_AUTH_WINDOW_MS / 1000),
    path: '/',
  })
}

/**
 * Clear the recent-auth cookie (called on logout).
 */
export function clearRecentAuthCookie(): void {
  cookies().set(RECENT_AUTH_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })
}

/**
 * Check whether the current customer session has a valid, unexpired recent-auth.
 * Verifies: cookie signature, userId matches session user, DB record not expired.
 * Returns `true` only when ALL checks pass.
 *
 * Does NOT throw — returns false for any failure so callers can redirect to the gate.
 */
export async function checkRecentAuth(userId: string): Promise<boolean> {
  try {
    const cookieStore = cookies()
    const raw = cookieStore.get(RECENT_AUTH_COOKIE)?.value
    if (!raw) return false

    const cookieUserId = verifyRecentAuthToken(raw)
    if (!cookieUserId || cookieUserId !== userId) return false

    // DB is the canonical source — cookie alone is insufficient
    const record = await prisma.recentAuthRecord.findUnique({ where: { userId } })
    if (!record) return false
    if (record.expiresAt.getTime() <= Date.now()) return false

    return true
  } catch {
    return false
  }
}

/**
 * Enforce recent auth — convenience wrapper that returns a 401 response object
 * when the check fails, or null when the caller may proceed.
 * The response shape matches RePIXL's `unauthorizedResponse()` so API routes
 * can use it with a simple null-check.
 */
export async function requireRecentAuth(userId: string): Promise<{ status: 401; body: string } | null> {
  const ok = await checkRecentAuth(userId)
  if (!ok) return { status: 401, body: JSON.stringify({ success: false, error: 'Recent authentication required.', code: 'RECENT_AUTH_REQUIRED' }) }
  return null
}

/**
 * Record a failed password attempt against the recent-auth rate-limit bucket.
 * Returns `{ locked: true }` if the budget is exhausted, `{ locked: false }` otherwise.
 */
export async function recordRecentAuthFailure(userId: string): Promise<{ locked: boolean }> {
  const now = new Date()
  try {
    const record = await prisma.recentAuthRecord.upsert({
      where:  { userId },
      create: {
        userId,
        verifiedAt: new Date(0), // sentinel — not actually verified
        expiresAt:  new Date(0),
        attempts:   1,
        windowStart: now,
      },
      update: {},
    })

    const windowExpired = now.getTime() - record.windowStart.getTime() >= RECENT_AUTH_ATTEMPT_WINDOW_MS
    if (windowExpired) {
      await prisma.recentAuthRecord.update({
        where: { userId },
        data:  { attempts: 1, windowStart: now },
      })
      return { locked: false }
    }

    const newAttempts = record.attempts + 1
    await prisma.recentAuthRecord.update({
      where: { userId },
      data:  { attempts: newAttempts },
    })
    return { locked: newAttempts > RECENT_AUTH_MAX_ATTEMPTS }
  } catch {
    return { locked: false }
  }
}

/**
 * Check if the recent-auth attempt bucket is currently locked for a user.
 */
export async function isRecentAuthLocked(userId: string): Promise<boolean> {
  try {
    const record = await prisma.recentAuthRecord.findUnique({ where: { userId } })
    if (!record) return false
    const windowExpired = Date.now() - record.windowStart.getTime() >= RECENT_AUTH_ATTEMPT_WINDOW_MS
    if (windowExpired) return false
    return record.attempts >= RECENT_AUTH_MAX_ATTEMPTS
  } catch {
    return false
  }
}

// ── Token helpers ─────────────────────────────────────────────────────────────

function createRecentAuthToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, iat: Date.now() })).toString('base64url')
  const sig = createHmac('sha256', getSecret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

function verifyRecentAuthToken(token: string): string | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payload, sig] = parts
  const expected = createHmac('sha256', getSecret()).update(payload).digest('base64url')
  const sigBuf = Buffer.from(sig)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'))
    if (typeof parsed?.userId !== 'string') return null
    return parsed.userId as string
  } catch {
    return null
  }
}

// getSecret() is defined earlier in this file; the recent-auth token helpers above use it.
