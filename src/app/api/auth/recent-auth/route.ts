import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api'
import {
  getCurrentUser,
  customerPrimaryAuthTime,
  setRecentAuthCookie,
  checkRecentAuth,
  recordRecentAuthFailure,
  isRecentAuthLocked,
  RECENT_AUTH_WINDOW_MS,
} from '@/lib/auth-helpers'
import { sameOrigin } from '@/lib/mfa/http'

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/recent-auth
 * Check whether the current customer session has a valid recent-auth.
 * Returns { verified: boolean, expiresAt?: string }.
 * Used by the SecurityGate client component to decide whether to show the gate.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return unauthorizedResponse()

  const verified = await checkRecentAuth(user.id)
  if (!verified) return successResponse({ verified: false })

  const record = await prisma.recentAuthRecord.findUnique({ where: { userId: user.id } })
  return successResponse({ verified: true, expiresAt: record?.expiresAt?.toISOString() })
}

/**
 * POST /api/auth/recent-auth
 *
 * Verify the customer's identity and issue a recent-auth record + cookie.
 *
 * Body (password accounts):   { method: 'password', password: string }
 * Body (Google-only accounts): { method: 'google' }
 *
 * For Google-only accounts: we verify that primaryAt (from the session cookie) is
 * within the same 12-minute window — i.e. the customer just re-authenticated via
 * Google OAuth. The client must trigger a fresh Google sign-in before calling this
 * endpoint; the primaryAt timestamp on the session is the server-side evidence.
 *
 * Security:
 *   - userId is ALWAYS derived from the server session — never accepted from the body
 *   - Password hash never leaves the server
 *   - Attempt rate-limiting: 5 wrong passwords per 10-minute window
 *   - CSRF: sameOrigin check on state-changing POST
 */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return errorResponse('Forbidden', 403)

  const user = await getCurrentUser()
  if (!user) return unauthorizedResponse()

  // Only customers use the security gate (admins have their own auth)
  if (user.role !== 'CUSTOMER') return errorResponse('Not applicable for admin accounts', 400)

  let body: { method?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const method = body.method

  if (method === 'password') {
    // ── Password re-authentication ──────────────────────────────────────────

    // Check attempt lock first (before any bcrypt work)
    if (await isRecentAuthLocked(user.id)) {
      return errorResponse('Too many failed attempts. Please wait 10 minutes.', 429)
    }

    const password = body.password
    if (!password || typeof password !== 'string' || password.length > 256) {
      return errorResponse('Password is required', 400)
    }

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { password: true },
    })
    if (!fullUser) return unauthorizedResponse()

    // Google-only account has no password — shouldn't use this method
    if (!fullUser.password) {
      return errorResponse('This account uses Google sign-in. Choose the Google verification method.', 400)
    }

    const valid = await bcrypt.compare(password, fullUser.password)
    if (!valid) {
      const { locked } = await recordRecentAuthFailure(user.id)
      if (locked) {
        return errorResponse('Too many failed attempts. Please wait 10 minutes.', 429)
      }
      return errorResponse('Incorrect password. Please try again.', 401)
    }

    // Success — issue recent-auth
    await setRecentAuthCookie(user.id)
    return successResponse({ verified: true, expiresIn: Math.floor(RECENT_AUTH_WINDOW_MS / 1000) })

  } else if (method === 'google') {
    // ── Google re-authentication ────────────────────────────────────────────
    // The client must have triggered a fresh Google sign-in. The primaryAt in
    // the customer session cookie is the server-side timestamp of that login.
    // We accept it if it is within the recent-auth window.

    const primaryAt = customerPrimaryAuthTime()
    const age = Date.now() - primaryAt
    if (primaryAt <= 0 || age > RECENT_AUTH_WINDOW_MS) {
      return errorResponse(
        'Google re-authentication required. Please sign in with Google again.',
        401
      )
    }

    await setRecentAuthCookie(user.id)
    return successResponse({ verified: true, expiresIn: Math.floor(RECENT_AUTH_WINDOW_MS / 1000) })

  } else {
    return errorResponse('method must be "password" or "google"', 400)
  }
}
