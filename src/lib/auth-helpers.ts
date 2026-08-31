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
function createToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, iat: Date.now() })).toString('base64url')
  return `${payload}.${sign(payload)}`
}

/**
 * Decode and verify a signed session token. Returns null if the signature is
 * missing/invalid or the payload cannot be parsed.
 */
function decodeToken(token: string): { userId: string; iat: number } | null {
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
export function setSessionCookie(userId: string) {
  const token = createToken(userId)
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
    },
  })

  if (!user || user.isArchived) return null

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
