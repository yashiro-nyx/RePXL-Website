/**
 * POST /api/account/email
 *
 * Final step of the two-step email change flow:
 *   1. User verified current email via /api/account/sensitive (CHANGE_EMAIL_VERIFY_OLD)
 *   2. User entered new email and verified it via /api/account/sensitive (CHANGE_EMAIL_VERIFY_NEW)
 *   3. THIS endpoint applies the change — only after both OTPs are consumed.
 *
 * GOOGLE-ONLY ACCOUNTS ARE BLOCKED:
 *   The entire OAuth→database user binding is User.email === Google account email.
 *   There is no providerAccountId / Account table. Changing User.email for a
 *   Google-only account (password === '') would break their only login path
 *   because the next Google OAuth attempt would look up the old email and get 404.
 *   These accounts must keep their Google-provided email as the identity anchor.
 *   The OTP flow is only permitted for accounts that have a RePIXL password set,
 *   meaning they can authenticate independently of Google.
 *
 * Body: { newEmail: string }
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, clearSessionCookie, clearRecentAuthCookie } from '@/lib/auth-helpers'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api'
import { sameOrigin } from '@/lib/mfa/http'
import { sendSecurityNotification, lockSensitiveCustomer, consumeAuthorization } from '@/lib/sensitive-change'
import { emailIdentityHash, lockEmailIdentity } from '@/lib/retired-auth-email'
import { clearChallenge } from '@/lib/mfa/http'

export const dynamic = 'force-dynamic'

const schema = z.object({
  newEmail: z.string().email('Invalid email address').max(200),
})

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return errorResponse('Forbidden', 403)

  const user = await getCurrentUser()
  if (!user) return unauthorizedResponse()
  if (user.role !== 'CUSTOMER') return errorResponse('Not applicable', 400)

  // Fetch the full user to check account type
  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { password: true, email: true },
  })
  if (!fullUser) return unauthorizedResponse()

  // Block Google-only accounts.
  // A Google-only account has password === '' (set explicitly during OAuth register).
  // Changing their email would sever their Google→User binding with no recovery path.
  if (!fullUser.password || fullUser.password.length === 0) {
    return errorResponse(
      'Email address is managed through Google. Sign in with Google to use a different Google account.',
      403
    )
  }

  let body: unknown
  try { body = await request.json() } catch { return errorResponse('Invalid JSON', 400) }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return errorResponse(parsed.error.errors[0]?.message ?? 'Invalid email', 400)

  const { newEmail } = parsed.data
  const normalised = newEmail.trim().toLowerCase()

  let oldEmail: string
  try {
    oldEmail = await prisma.$transaction(async tx => {
      const account = await lockSensitiveCustomer(tx, user.id)
      await lockEmailIdentity(tx, account.email)
      if (!account.password) throw new Error('Managed through Google')
      if (account.email === normalised) throw new Error('New email must differ')
      if (await tx.retiredAuthEmail.findUnique({where: {emailHash: emailIdentityHash(normalised)}})) throw new Error('Email unavailable')
      await consumeAuthorization(tx, user.id, 'CHANGE_EMAIL_VERIFY_OLD', normalised)
      await consumeAuthorization(tx, user.id, 'CHANGE_EMAIL_VERIFY_NEW', normalised)
      await tx.user.update({where: {id: user.id}, data: {email: normalised}})
      await tx.retiredAuthEmail.upsert({where: {emailHash: emailIdentityHash(account.email)}, create: {emailHash: emailIdentityHash(account.email)}, update: {}})
      await tx.customerMfa.upsert({where: {userId: user.id}, create: {userId: user.id, version: 1}, update: {version: {increment: 1}}})
      await tx.recentAuthRecord.deleteMany({where: {userId: user.id}})
      await tx.customerMfaChallenge.deleteMany({where: {userId: user.id}})
      await tx.sensitiveChangeChallenge.deleteMany({where: {userId: user.id}})
      return account.email
    })
  } catch { return errorResponse('Email unavailable or verification expired/already consumed. Restart verification.', 403) }

  // Security notifications (best-effort — never throws)
  void sendSecurityNotification(oldEmail, 'email address changed').catch(() => undefined)
  void sendSecurityNotification(normalised, 'your email address was set on this account').catch(() => undefined)

  // Invalidate the repixl session cookie so the browser cannot reuse it.
  clearSessionCookie()
  clearRecentAuthCookie()
  clearChallenge()

  // The client must also set the oauth-logged-out flag so useOAuthSync does not
  // immediately restore the session from the NextAuth JWT (which still carries
  // the old Google email). The flag is set client-side by the modal on success.

  return successResponse({ changed: true, message: 'Email updated. Please log in again.', requiresLogout: true })
}
