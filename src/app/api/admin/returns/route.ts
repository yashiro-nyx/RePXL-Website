import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentAdmin } from '@/lib/auth-helpers'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  paginatedResponse,
  parsePagination,
} from '@/lib/api'
import { canTransition } from '@/lib/returns'
import { z } from 'zod'

/**
 * Task 12.2: Admin returns routes
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12, 4.13, 4.14
 */

export const dynamic = 'force-dynamic'

// GET /api/admin/returns — List all return requests (descending by createdAt)
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const { searchParams } = new URL(request.url)
    const pagination = parsePagination(searchParams)
    const statusFilter = searchParams.get('status')

    const where: any = {}
    if (statusFilter) {
      where.status = statusFilter
    }

    const [returns, total] = await Promise.all([
      prisma.returnRequest.findMany({
        where,
        include: {
          order: {
            select: {
              orderNumber: true,
              total: true,
              status: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          items: {
            include: {
              returnRequest: false, // Avoid circular select
            },
          },
        },
        orderBy: { createdAt: 'desc' }, // Requirement 4.1, 4.2
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      prisma.returnRequest.count({ where }),
    ])

    return paginatedResponse(returns, total, pagination)
  } catch (error) {
    console.error('Returns list error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch return requests',
      500
    )
  }
}
