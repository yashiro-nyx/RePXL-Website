/**
 * POST /api/account/phone
 *
 * Apply a phone number change after the user has verified their identity
 * via the CHANGE_PHONE OTP challenge.
 *
 * Body: { newPhone: string }
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-helpers'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api'
import { sameOrigin } from '@/lib/mfa/http'
import { sendSecurityNotification, lockSensitiveCustomer, consumeAuthorization } from '@/lib/sensitive-change'

export const dynamic = 'force-dynamic'

// Philippine mobile: 09XXXXXXXXX (11 digits) or +639XXXXXXXXX
const PH_PHONE_RE = /^(09\d{9}|\+639\d{9})$/

const schema = z.object({
  newPhone: z.string()
    .transform((v) => v.replace(/\s/g, ''))
    .refine((v) => PH_PHONE_RE.test(v), 'Enter a valid Philippine mobile number (09XXXXXXXXX or +639XXXXXXXXX)'),
})

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return errorResponse('Forbidden', 403)

  const user = await getCurrentUser()
  if (!user) return unauthorizedResponse()
  if (user.role !== 'CUSTOMER') return errorResponse('Not applicable', 400)

  let body: unknown
  try { body = await request.json() } catch { return errorResponse('Invalid JSON', 400) }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return errorResponse(parsed.error.errors[0]?.message ?? 'Invalid phone', 400)

  const { newPhone } = parsed.data

  try {
    await prisma.$transaction(async tx => {
      await lockSensitiveCustomer(tx, user.id)
      await consumeAuthorization(tx, user.id, 'CHANGE_PHONE')
      await tx.user.update({where: {id: user.id}, data: {phone: newPhone}})
    })
  } catch { return errorResponse('Verification required or already consumed.', 403) }

  sendSecurityNotification(user.email, 'phone number changed').catch(() => undefined)

  return successResponse({ changed: true })
}
