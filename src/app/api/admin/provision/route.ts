import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/provision
 *
 * One-time endpoint to ensure the admin user exists in the database.
 * This is the proper alternative to auto-creating admins in the login route.
 *
 * IMPORTANT: Protected by ADMIN_PROVISION_SECRET env var.
 * Call this once after deploying to production if the DB was not seeded.
 *
 * Body: { secret: string, email: string, password: string, firstName?: string, lastName?: string }
 *
 * This endpoint is idempotent — calling it multiple times is safe.
 * It will NOT overwrite an existing admin's password.
 */
export async function POST(request: NextRequest) {
  const provisionSecret = process.env.ADMIN_PROVISION_SECRET
  if (!provisionSecret) {
    return errorResponse('Admin provisioning is not enabled on this instance.', 503)
  }

  let body: { secret?: string; email?: string; password?: string; firstName?: string; lastName?: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  // Verify the provision secret
  if (!body.secret || body.secret !== provisionSecret) {
    return errorResponse('Invalid provision secret', 401)
  }

  const email = body.email?.trim().toLowerCase()
  const password = body.password
  const firstName = body.firstName?.trim() || 'RePXL'
  const lastName = body.lastName?.trim() || 'Admin'

  if (!email || !password) {
    return errorResponse('email and password are required', 400)
  }

  if (password.length < 8) {
    return errorResponse('password must be at least 8 characters', 400)
  }

  // Check if this admin already exists
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    if (existing.role !== 'ADMIN') {
      return errorResponse('This email is registered as a non-admin user.', 409)
    }
    // Admin already exists — do not overwrite
    return successResponse({
      created: false,
      message: 'Admin user already exists. No changes made.',
      email: existing.email,
    })
  }

  const hashedPassword = await bcrypt.hash(password, 12)
  const admin = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'ADMIN',
      isSuperAdmin: true,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isSuperAdmin: true,
      createdAt: true,
    },
  })

  console.log('[provision] Admin user created:', admin.email)

  return successResponse(
    { created: true, message: 'Admin user created successfully.', email: admin.email },
    201
  )
}
