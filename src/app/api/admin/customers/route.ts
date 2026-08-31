import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  paginatedResponse,
  parsePagination,
} from '@/lib/api'
import { getCurrentAdmin } from '@/lib/auth-helpers'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

// GET /api/admin/customers — List all customers (admin only)
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const { searchParams } = new URL(request.url)
    const pagination = parsePagination(searchParams)

    const isArchived = searchParams.get('archived') === 'true'
    const search = searchParams.get('search')
    const role = searchParams.get('role')

    const where: any = { isArchived }

    if (role) {
      where.role = role.toUpperCase()
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [customers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isSuperAdmin: true,
          isArchived: true,
          archivedAt: true,
          createdAt: true,
          _count: { select: { orders: true, reviews: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.user.count({ where }),
    ])

    return paginatedResponse(customers, total, pagination)
  } catch (error) {
    console.error('Get customers error:', error)
    return errorResponse('Internal server error', 500)
  }
}
