import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api'
import {
  getCurrentUser,
  setRecentAuthCookie,
  checkRecentAuth,
  recordRecentAuthFailure,
  isRecentAuthLocked,
  RECENT_AUTH_WINDOW_MS,
} from '@/lib/auth-helpers'
import { authOptions } from '@/lib/next-auth-options'
import { sameOrigin } from '@/lib/mfa/http'
import {
  issueStepUpChallenge,
  verifyStepUpChallenge,
  OTP_TTL_MS,
} from '@/lib/step-up'
import { verifyStepUpTotp } from '@/lib/mfa/service'
import { sendNotificationEmail } from '@/lib/mailer'
import { buildVerificationCodeEmail } from '@/lib/email'
import { maskEmail } from '@/lib/mask'

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

  // Which step-up methods this account can actually use — the UI must never
  // offer a method the customer can't complete (e.g. a password for a
  // Google-only account). Email is always available; Google is offered when a
  // NextAuth (Google) session is present.
  const [full, nextAuthSession] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { password: true, customerMfa: { select: { enabledAt: true } } },
    }),
    getServerSession(authOptions).catch(() => null),
  ])
  const hasPassword = !!full?.password && full.password.length > 0
  const mfaEnabled = !!full?.customerMfa?.enabledAt
  const googleLinked = !!nextAuthSession?.user?.email &&
    nextAuthSession.user.email.toLowerCase().trim() === user.email.toLowerCase().trim()

  const methods = {
    password: hasPassword,
    totp: !hasPassword && mfaEnabled,
    email: !hasPassword,
    google: !hasPassword && googleLinked,
  }

  const verified = await checkRecentAuth(user.id, hasPassword ? 'password' : undefined)
  if (!verified) return successResponse({ verified: false, methods, googleLinked, maskedEmail: maskEmail(user.email) })

  const record = await prisma.recentAuthRecord.findUnique({ where: { userId: user.id } })
  return successResponse({ verified: true, methods, googleLinked, maskedEmail: maskEmail(user.email), expiresAt: record?.expiresAt?.toISOString() })
}

/** Password accounts must use bcrypt-verified current passwords. Passwordless
 * accounts may prove ownership for Set Password with email, TOTP, or a matching
 * fresh Google session. Normal Google login is a separate endpoint. */
export async function POST(request: NextRequest) {
  try { return await verifyIdentity(request) }
  catch (error) {
    console.error('[recent-auth] verification failed', error)
    return errorResponse("We couldn't verify your identity right now. Please try again.", 503)
  }
}

async function verifyIdentity(request: NextRequest) {
  if (!sameOrigin(request))
    return errorResponse(
      "We couldn't verify your security status right now. Please refresh the page and try again.",
      403
    )

  const user = await getCurrentUser()
  if (!user) return unauthorizedResponse()

  // Only customers use the security gate (admins have their own auth)
  if (user.role !== 'CUSTOMER') return errorResponse('Not applicable for admin accounts', 400)

  let body: { method?: string; password?: string; code?: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Please check your verification details and try again.', 400)
  }

  if (!body || typeof body !== 'object') return errorResponse('Please choose a verification method.', 400)
  const method = body.method
  const account = await prisma.user.findUnique({ where: { id: user.id }, select: { password: true } })
  if (!account) return unauthorizedResponse()
  if (account.password && method !== 'password') {
    return errorResponse('Enter your current RePXL password to continue.', 400)
  }

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
      return errorResponse('Set a RePXL password before using password verification.', 400)
    }

    const valid = await bcrypt.compare(password, fullUser.password)
    if (!valid) {
      const { locked } = await recordRecentAuthFailure(user.id)
      if (locked) {
        return errorResponse('Too many failed attempts. Please wait 10 minutes.', 429)
      }
      return errorResponse('The password you entered is incorrect.', 401)
    }

    // Success — issue recent-auth
    await setRecentAuthCookie(user.id, 'password')
    return successResponse({ verified: true, expiresIn: Math.floor(RECENT_AUTH_WINDOW_MS / 1000) })

  } else if (method === 'google') {
    // Passwordless ownership verification only; never infer Google freshness
    // from the application's primary-login timestamp.
    const nextAuthSession = await getServerSession(authOptions)
    const sessionEmail = nextAuthSession?.user?.email?.toLowerCase().trim() ?? ''
    const naPrimaryAt =
      (nextAuthSession as unknown as { primaryAuthenticatedAt?: number } | null)?.primaryAuthenticatedAt ?? 0

    const emailMatches = !!sessionEmail && sessionEmail === user.email.toLowerCase().trim()
    const age = Date.now() - naPrimaryAt
    if (!emailMatches || naPrimaryAt <= 0 || age < 0 || age > RECENT_AUTH_WINDOW_MS) {
      return errorResponse(
        "We couldn't verify your identity with Google. Please sign in with Google again, or choose another verification method.",
        401
      )
    }

    await setRecentAuthCookie(user.id, 'google')
    return successResponse({ verified: true, expiresIn: Math.floor(RECENT_AUTH_WINDOW_MS / 1000) })

  } else if (method === 'totp') {
    // ── Authenticator app (TOTP) step-up ─────────────────────────────────────
    // Only usable when the customer has 2FA enabled. Reuses the MFA service's
    // locked, rate-limited, anti-replay verifier — never weakens MFA.
    const code = typeof body.code === 'string' ? body.code.trim() : ''
    if (!code) return errorResponse('Enter the 6-digit code from your authenticator app.', 400)

    const result = await verifyStepUpTotp(user.id, code)
    if (!result.ok) {
      if (result.status === 429) return errorResponse('Too many attempts. Please wait a few minutes and try again.', 429)
      if (result.status === 400) return errorResponse('Two-factor authentication is not enabled on this account.', 400)
      return errorResponse('That code is incorrect. Please try again.', 401)
    }
    await setRecentAuthCookie(user.id, 'totp')
    return successResponse({ verified: true, expiresIn: Math.floor(RECENT_AUTH_WINDOW_MS / 1000) })

  } else if (method === 'email-otp-send') {
    // ── Send an email verification code ──────────────────────────────────────
    if (await isRecentAuthLocked(user.id)) {
      return errorResponse('Too many attempts. Please wait 10 minutes.', 429)
    }
    const sent = await issueStepUpChallenge(user.id)
    if (!sent.ok) {
      return errorResponse('Please wait a moment before requesting another code.', 429)
    }
    // Deliver the code by email. The plaintext code is used ONLY here and never
    // logged or persisted (only its hash lives in the signed cookie).
    try {
      const ttlMins = Math.round(OTP_TTL_MS / 60000)
      const built = buildVerificationCodeEmail({
        subject: 'Verify your identity',
        purpose: 'confirm your identity before changing your security settings',
        code: sent.code,
        ttlMinutes: ttlMins,
      })
      const delivery = await sendNotificationEmail(user.email, built.subject, built.text, { html: built.html })
      if (!delivery.ok) return errorResponse("We couldn't send the code right now. Please try again in a moment.", 502)
    } catch {
      // Email delivery failure is non-fatal to the challenge state, but tell the user.
      return errorResponse("We couldn't send the code right now. Please try again in a moment.", 502)
    }
    return successResponse({ sent: true, to: maskEmail(user.email), expiresIn: Math.floor(OTP_TTL_MS / 1000) })

  } else if (method === 'email-otp-verify') {
    // ── Verify the emailed code ──────────────────────────────────────────────
    const code = typeof body.code === 'string' ? body.code.trim() : ''
    if (!code) return errorResponse('Enter the verification code we emailed you.', 400)

    const result = await verifyStepUpChallenge(user.id, code)
    if (!result.ok) {
      if (result.reason === 'expired') return errorResponse('This verification code has expired. Request a new code to continue.', 401)
      if (result.reason === 'locked') return errorResponse('Too many incorrect codes. Request a new code to continue.', 429)
      if (result.reason === 'no_challenge') return errorResponse('Request a verification code first.', 400)
      return errorResponse('That verification code is incorrect. Please try again.', 401)
    }
    await setRecentAuthCookie(user.id, 'email')
    return successResponse({ verified: true, expiresIn: Math.floor(RECENT_AUTH_WINDOW_MS / 1000) })

  } else {
    return errorResponse('Unsupported verification method.', 400)
  }
}
