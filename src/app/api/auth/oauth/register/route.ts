import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, validationError } from '@/lib/api'
import { setSessionCookie } from '@/lib/auth-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/next-auth-options'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().max(50).optional().default(''),
})

/**
 * POST /api/auth/oauth/register
 *
 * Called from the REGISTER page after a successful NextAuth Google sign-in.
 * REGISTER-ONLY: creates a new account for the Google email.
 * If the email already exists, returns 409 so the client can show
 * "Account already exists — please log in instead."
 */
export async function POST(request: NextRequest) {
  try {
    // Verify the caller has a valid NextAuth session.
    const nextAuthSession = await getServerSession(authOptions)
    if (!nextAuthSession?.user?.email) {
      return errorResponse('No active Google session', 401)
    }

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error)

    const { email, firstName, lastName } = parsed.data
    const normalizedEmail = email.toLowerCase().trim()

    // Ensure the session email matches
    if (nextAuthSession.user.email.toLowerCase() !== normalizedEmail) {
      return errorResponse('Email mismatch', 403)
    }

    if (normalizedEmail.endsWith('@repixl-admin.com')) {
      return errorResponse('This email cannot be used for registration.', 403)
    }

    // REGISTER-ONLY: check for duplicate, do NOT update existing
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      // Return a distinct 409 so the client can show "log in instead"
      return errorResponse('An account with this Google email already exists. Please log in instead.', 409)
    }

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        firstName,
        lastName,
        password: '', // OAuth accounts have no password
        role: 'CUSTOMER',
      },
    })

    setSessionCookie(user.id)

    return successResponse({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin,
    })
  } catch (error) {
    console.error('OAuth register error:', error)
    return errorResponse('Internal server error', 500)
  }
}
