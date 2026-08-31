import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { errorResponse, unauthorizedResponse, paginatedResponse, parsePagination } from '@/lib/api'
import { getCurrentAdmin } from '@/lib/auth-helpers'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

// GET /api/admin/logs — Get admin activity logs
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const { searchParams } = new URL(request.url)
    const pagination = parsePagination(searchParams)

    const action = searchParams.get('action')
    const search = searchParams.get('search')

    const where: any = {}

    if (action) {
      where.action = action
    }

    if (search) {
      where.OR = [
        { details: { contains: search, mode: 'insensitive' } },
        { adminName: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [logs, total] = await Promise.all([
      prisma.adminLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.adminLog.count({ where }),
    ])

    return paginatedResponse(logs, total, pagination)
  } catch (error) {
    console.error('Get admin logs error:', error)
    return errorResponse('Internal server error', 500)
  }
}
