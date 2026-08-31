import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, notFoundResponse, unauthorizedResponse } from '@/lib/api'
import { getCurrentAdmin } from '@/lib/auth-helpers'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: { customerId: string }
}

// GET /api/admin/customers/[customerId] — Get customer details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const customer = await prisma.user.findUnique({
      where: { id: params.customerId },
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
        orders: {
          select: { orderNumber: true, total: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        reviews: {
          select: { id: true, rating: true, comment: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: { select: { orders: true, reviews: true } },
      },
    })

    if (!customer) {
      return notFoundResponse('Customer not found')
    }

    return successResponse(customer)
  } catch (error) {
    console.error('Get customer error:', error)
    return errorResponse('Internal server error', 500)
  }
}
