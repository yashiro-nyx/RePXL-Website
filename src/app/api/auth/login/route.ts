import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, validationError } from '@/lib/api'
import { loginSchema } from '@/lib/validations'
import { setSessionCookie, setAdminSessionCookie } from '@/lib/auth-helpers'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

// Hardcoded admin credentials (matches the seed + admin login page constants).
// Used to auto-provision the admin account if the DB was never seeded.
const ADMIN_EMAIL = 'admin@repixl-admin.com'
const ADMIN_PLAIN_PASSWORD = 'RePIXL2026!'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error)
    }

    const { email, password } = parsed.data

    // Find user — if admin credentials are used and the admin record doesn't
    // exist in the DB yet (e.g. DB was never seeded), auto-provision it so the
    // HTTP-only session cookie can always be issued after a valid admin login.
    let user = await prisma.user.findUnique({ where: { email } })
    if (!user && email === ADMIN_EMAIL && password === ADMIN_PLAIN_PASSWORD) {
      const hashedPassword = await bcrypt.hash(ADMIN_PLAIN_PASSWORD, 12)
      user = await prisma.user.create({
        data: {
          email: ADMIN_EMAIL,
          password: hashedPassword,
          firstName: 'RePXL',
          lastName: 'Admin',
          role: 'ADMIN',
          isSuperAdmin: true,
        },
      })
      console.log('[login] Auto-provisioned admin user:', user.id)
    }

    if (!user) {
      return errorResponse('Invalid email or password', 401)
    }

    if (user.isArchived) {
      return errorResponse('This account has been deactivated', 403)
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return errorResponse('Invalid email or password', 401)
    }

    // Set appropriate session cookie.
    // Admin gets the admin cookie (read by getCurrentAdmin / update-tracking).
    // Also set the customer cookie so /api/auth/me works for profile hydration.
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
