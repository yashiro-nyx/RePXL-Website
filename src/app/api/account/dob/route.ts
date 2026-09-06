/**
 * POST /api/account/dob
 *
 * Apply a date-of-birth change after the user has verified their identity
 * via the CHANGE_DOB OTP challenge.
 *
 * Body: { newDob: string }  — YYYY-MM-DD format
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-helpers'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api'
import { sameOrigin } from '@/lib/mfa/http'
import { sendSecurityNotification, lockSensitiveCustomer, consumeAuthorization } from '@/lib/sensitive-change'

export const dynamic = 'force-dynamic'

const schema = z.object({
  newDob: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
    .refine((d) => {
      const parsed = new Date(d)
      if (isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== d) return false
      const now = new Date()
      const min = new Date()
      min.setFullYear(now.getFullYear() - 120)
      return parsed < now && parsed > min
    }, 'Enter a valid past date'),
})

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return errorResponse('Forbidden', 403)

  const user = await getCurrentUser()
  if (!user) return unauthorizedResponse()
  if (user.role !== 'CUSTOMER') return errorResponse('Not applicable', 400)

  let body: unknown
  try { body = await request.json() } catch { return errorResponse('Invalid JSON', 400) }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return errorResponse(parsed.error.errors[0]?.message ?? 'Invalid date', 400)

  const { newDob } = parsed.data

  try {
    await prisma.$transaction(async tx => {
      await lockSensitiveCustomer(tx, user.id)
      await consumeAuthorization(tx, user.id, 'CHANGE_DOB')
      await tx.user.update({where: {id: user.id}, data: {dateOfBirth: new Date(newDob)}})
    })
  } catch { return errorResponse('Verification required or already consumed.', 403) }

  sendSecurityNotification(user.email, 'date of birth updated').catch(() => undefined)

  return successResponse({ changed: true })
}
