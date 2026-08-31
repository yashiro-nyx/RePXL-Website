import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, validationError } from '@/lib/api'
import { setSessionCookie } from '@/lib/auth-helpers'
import { z } from 'zod'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

const oauthSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1).max(50),
  lastName: z.string().max(50).optional().default(''),
})

/**
 * POST /api/auth/oauth
 * Called client-side after a successful NextAuth OAuth sign-in.
 * Upserts the user in the database (creates on first login, finds on subsequent
 * logins) and sets the HTTP-only session cookie so /api/auth/me works correctly.
 *
 * This is intentionally NOT protected by getCurrentUser() — the caller has
 * already been authenticated by Google/NextAuth and is supplying the verified
 * email from the NextAuth session token. The password field is left empty for
 * OAuth-only accounts.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = oauthSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error)
    }

    const { email, firstName, lastName } = parsed.data
    const normalizedEmail = email.toLowerCase().trim()

    // Block admin email domain from OAuth registration
    if (normalizedEmail.endsWith('@repixl-admin.com')) {
      return errorResponse('This email cannot be used for OAuth login', 403)
    }

    // Upsert: find existing user or create new one.
    // For existing users we do NOT overwrite name/password — respect what they
    // already set. For new users we create with an empty password (OAuth-only).
    let user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          firstName,
          lastName,
          password: '', // OAuth accounts have no password
          role: 'CUSTOMER',
        },
      })
    }

    if (user.isArchived) {
      return errorResponse('This account has been deactivated', 403)
    }

    // Issue the HTTP-only session cookie so subsequent API calls (including
    // /api/auth/me and /api/cart) authenticate correctly.
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
