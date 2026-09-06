/**
 * POST /api/account/sensitive
 *
 * Unified OTP request + verify endpoint for sensitive profile changes.
 *
 * Actions:
 *   request_otp  — generate and email an OTP for the given change type
 *   verify_otp   — verify a submitted OTP, returning a typed result
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-helpers'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api'
import { sameOrigin } from '@/lib/mfa/http'
import {
  createChallenge,
  verifyChallenge,
  sendOtpEmail,
  isOnResendCooldown,
  OTP_RESEND_COOLDOWN_MS,
} from '@/lib/sensitive-change'
import type { SensitiveChangeType } from '@prisma/client'

export const dynamic = 'force-dynamic'

const VALID_CHANGE_TYPES = [
  'CHANGE_EMAIL_VERIFY_OLD',
  'CHANGE_EMAIL_VERIFY_NEW',
  'CHANGE_PHONE',
  'CHANGE_DOB',
] as const

const requestSchema = z.object({
  action:     z.enum(['request_otp', 'verify_otp']),
  changeType: z.enum(VALID_CHANGE_TYPES),
  // For verify_otp
  code:       z.string().length(6).regex(/^\d{6}$/).optional(),
  // For CHANGE_EMAIL_VERIFY_NEW — the candidate new email
  pendingEmail: z.string().email().optional(),
})

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return errorResponse('Forbidden', 403)

  const user = await getCurrentUser()
  if (!user) return unauthorizedResponse()
  if (user.role !== 'CUSTOMER') return errorResponse('Not applicable for admin accounts', 400)

  let body: unknown
  try { body = await request.json() } catch { return errorResponse('Invalid JSON', 400) }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) return errorResponse(parsed.error.errors[0]?.message ?? 'Invalid request', 400)

  const { action, changeType, code, pendingEmail } = parsed.data

  // For CHANGE_EMAIL_VERIFY_NEW we send to the candidate address, not the current one
  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, password: true },
  })
  if (!fullUser) return unauthorizedResponse()

  if (changeType.startsWith('CHANGE_EMAIL') && !fullUser.password) return errorResponse('Managed through Google', 403)
  if (changeType === 'CHANGE_EMAIL_VERIFY_NEW' && !pendingEmail) return errorResponse('New email required', 400)

  const sendTo = changeType === 'CHANGE_EMAIL_VERIFY_NEW' && pendingEmail
    ? pendingEmail
    : fullUser.email

  try {
  if (action === 'request_otp') {
    // Resend cooldown
    if (await isOnResendCooldown(user.id, changeType as SensitiveChangeType)) {
      return errorResponse(
        `Please wait ${Math.ceil(OTP_RESEND_COOLDOWN_MS / 1000)} seconds before requesting another code.`,
        429
      )
    }

    const otp = await createChallenge(user.id, changeType as SensitiveChangeType, pendingEmail?.trim().toLowerCase())
    await sendOtpEmail(sendTo, otp, changeType as SensitiveChangeType)

    return successResponse({
      sent: true,
      sentTo: maskEmail(sendTo),
    })
  }

  // action === 'verify_otp'
  if (!code) return errorResponse('code is required for verify_otp', 400)

  const result = await verifyChallenge(user.id, changeType as SensitiveChangeType, code, pendingEmail?.trim().toLowerCase())
  if (!result.ok) {
    return errorResponse(result.error, result.tooManyAttempts ? 429 : 401)
  }

  return successResponse({ verified: true })
  } catch { return errorResponse('Unable to authorize this change. Verify your current email first or retry after the resend cooldown.', 403) }
}

/** Mask an email for safe display in API responses. */
function maskEmail(email: string): string {
  const at = email.indexOf('@')
  if (at <= 1) return email
  return `${email[0]}${'*'.repeat(Math.min(at - 1, 6))}@${email.slice(at + 1)}`
}
