import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse, validationError } from '@/lib/api'
import { getCurrentUser, getCurrentAdmin } from '@/lib/auth-helpers'
import { updateProfileSchema } from '@/lib/validations'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

// GET /api/auth/me — Get current user profile
// Checks admin session cookie first, then customer session cookie.
export async function GET() {
  try {
    // Check admin cookie first so hydrateAdmin() works via the admin session.
    const admin = await getCurrentAdmin()
    const user = admin ?? (await getCurrentUser())
    if (!user) {
      return unauthorizedResponse()
    }

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isSuperAdmin: true,
        createdAt: true,
        password: true, // included only to derive hasPassword — never returned to client
      },
    })

    if (!fullUser) {
      return unauthorizedResponse()
    }

    // Expose a safe boolean so the Security tab can detect OAuth-only accounts.
    // The raw password hash is intentionally stripped before the response.
    const { password: _pw, ...safeUser } = fullUser

    return successResponse({ ...safeUser, hasPassword: !!_pw && _pw.length > 0 })
  } catch (error) {
    console.error('Get profile error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// PUT /api/auth/me — Update current user profile
export async function PUT(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin()
    const user = admin ?? (await getCurrentUser())
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const parsed = updateProfileSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error)
    }

    const { firstName, lastName, email, phone } = parsed.data

    // Check if email is taken by another user
    if (email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) {
        return errorResponse('Email is already taken', 409)
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName,
        lastName,
        email,
        // Only update phone if the caller supplied a non-empty value;
        // omitting the field lets Prisma leave the existing value unchanged.
        ...(phone !== undefined && phone !== '' ? { phone } : {}),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isSuperAdmin: true,
      },
    })

    return successResponse(updated)
  } catch (error) {
    console.error('Update profile error:', error)
    return errorResponse('Internal server error', 500)
  }
}
