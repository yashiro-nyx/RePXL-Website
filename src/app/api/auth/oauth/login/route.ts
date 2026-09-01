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
 * POST /api/auth/oauth/login
 *
 * Called from the LOGIN page after a successful NextAuth Google sign-in.
 * LOGIN-ONLY: the email must already exist in the database.
 * If the email is not found, returns 404 so the client can show
 * "Account not found — please register first."
 */
export async function POST(request: NextRequest) {
  try {
    // Verify the caller has a valid NextAuth session so this endpoint
    // cannot be called without actually completing Google OAuth.
    const nextAuthSession = await getServerSession(authOptions)
    if (!nextAuthSession?.user?.email) {
      return errorResponse('No active Google session', 401)
    }

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error)

    const { email } = parsed.data
    const normalizedEmail = email.toLowerCase().trim()

    // Ensure the session email matches the claimed email (prevent spoofing)
    if (nextAuthSession.user.email.toLowerCase() !== normalizedEmail) {
      return errorResponse('Email mismatch', 403)
    }

    // LOGIN-ONLY: look up the existing user — do NOT create
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

    if (!user) {
      // Return a distinct 404 so the client can show "register first"
      return errorResponse('Account not found. Please register first.', 404)
    }

    if (user.isArchived) {
      return errorResponse('This account has been deactivated.', 403)
    }

    if (user.role !== 'CUSTOMER') {
      return errorResponse('Admin accounts cannot use Google login.', 403)
    }

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
    console.error('OAuth login error:', error)
    return errorResponse('Internal server error', 500)
  }
}
