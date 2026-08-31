import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse, validationError } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth-helpers'
import { updateProfileSchema } from '@/lib/validations'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

// GET /api/auth/me — Get current user profile
export async function GET() {
  try {
    const user = await getCurrentUser()
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
      },
    })

    if (!fullUser) {
      return unauthorizedResponse()
    }

    return successResponse(fullUser)
  } catch (error) {
    console.error('Get profile error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// PUT /api/auth/me — Update current user profile
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
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
      data: { firstName, lastName, email, phone: phone || '' },
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
