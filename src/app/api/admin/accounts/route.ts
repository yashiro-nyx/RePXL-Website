import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse, validationError } from '@/lib/api'
import { getCurrentAdmin } from '@/lib/auth-helpers'
import { z } from 'zod'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

const createAdminSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  isSuperAdmin: z.boolean().optional().default(false),
})

// GET /api/admin/accounts — List admin accounts
export async function GET() {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', isArchived: false },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isSuperAdmin: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    return successResponse(admins)
  } catch (error) {
    console.error('Get admin accounts error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// POST /api/admin/accounts — Create a new admin account (super admin only)
export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    if (!admin.isSuperAdmin) {
      return errorResponse('Only super admins can create admin accounts', 403)
    }

    const body = await request.json()
    const parsed = createAdminSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error)
    }

    const { firstName, lastName, email, password, isSuperAdmin } = parsed.data

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return errorResponse('An account with this email already exists', 409)
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const newAdmin = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role: 'ADMIN',
        isSuperAdmin,
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

    await prisma.adminLog.create({
      data: {
        action: 'CREATE_ADMIN',
        details: `Created admin account: ${firstName} ${lastName} (${email})`,
        adminId: admin.id,
        adminName: `${admin.firstName} ${admin.lastName}`,
      },
    })

    return successResponse(newAdmin, 201)
  } catch (error) {
    console.error('Create admin error:', error)
    return errorResponse('Internal server error', 500)
  }
}
