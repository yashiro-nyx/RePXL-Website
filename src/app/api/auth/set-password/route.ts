import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse, validationError } from '@/lib/api'
import { getCurrentUser, requireRecentAuth, clearRecentAuthCookie } from '@/lib/auth-helpers'
import { z } from 'zod'

import { sameOrigin } from '@/lib/mfa/http'

export const dynamic = 'force-dynamic'

const schema = z.object({
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/\d/, 'Must contain at least one number')
    .regex(/[!@#$%^&*]/, 'Must contain at least one special character (!@#$%^&*)'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

/**
 * POST /api/auth/set-password
 *
 * For Google-only (OAuth) accounts that have no RePXL password (password = '').
 * Allows them to set a separate RePXL email/password credential without
 * touching their Google authentication.
 *
 * NEVER accesses or stores the user's Google/Gmail password.
 */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return errorResponse('Please refresh the page and try again.', 403)
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()

    // Creating a RePXL password credential is a sensitive Security action —
    // require a recent step-up verification (server-enforced), matching the
    // Change Password / 2FA endpoints. Google-only accounts satisfy this via
    // the email-code or Google step-up methods.
    const recentAuthResult = await requireRecentAuth(user.id, 'ownership')
    if (recentAuthResult) {
      return new Response(recentAuthResult.body, {
        status: recentAuthResult.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch the actual user record to check whether a password is already set
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, password: true },
    })
    if (!fullUser) return unauthorizedResponse()

    // This endpoint is only for accounts with no existing RePXL password.
    // Accounts that already have a password must use /api/auth/change-password.
    if (fullUser.password && fullUser.password.length > 0) {
      return errorResponse(
        'Your account already has a RePXL password. Use Change Password instead.',
        409
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse('Invalid request body', 400)
    }

    const parsed = schema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error)

    const { newPassword } = parsed.data
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    const changed = await prisma.user.updateMany({
      where: { id: user.id, password: '' },
      data: { password: hashedPassword },
    })

    if (changed.count !== 1) return errorResponse('Your account already has a RePXL password. Use Change Password instead.', 409)
    await clearRecentAuthCookie()
    return successResponse({ message: 'RePXL password set successfully.' })
  } catch (error) {
    console.error('Set password error:', error)
    return errorResponse("We couldn't set your password right now. Please try again.", 500)
  }
}
