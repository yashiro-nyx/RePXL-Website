import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, validationError } from '@/lib/api'
import { loginSchema } from '@/lib/validations'
import { setSessionCookie, setAdminSessionCookie } from '@/lib/auth-helpers'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error)
    }

    const { email, password } = parsed.data

    // Find user in database — the only source of truth.
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return errorResponse('Invalid email or password', 401)
    }

    if (user.isArchived) {
      return errorResponse('This account has been deactivated', 403)
    }

    // Verify password hash
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return errorResponse('Invalid email or password', 401)
    }

    // Set appropriate session cookie.
    // Admin gets the admin HTTP-only cookie (read by getCurrentAdmin).
    // All users also get the customer cookie so /api/auth/me works for hydration.
    if (user.role === 'ADMIN') {
      setAdminSessionCookie(user.id)
    }
    setSessionCookie(user.id)

    return successResponse({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin,
    })
  } catch (error) {
    console.error('Login error:', error)
    return errorResponse('Internal server error', 500)
  }
}
