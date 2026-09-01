import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-helpers'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  parsePagination,
  paginatedResponse,
} from '@/lib/api'
import { z } from 'zod'

/**
 * Task 13: Customer returns API
 * GET/POST /api/returns
 * GET /api/returns/[orderNumber]
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

export const dynamic = 'force-dynamic'

const submitReturnSchema = z.object({
  orderNumber: z.string(),
  reason: z.string().min(10).max(1000),
})

// GET /api/returns — List customer's return requests (paginated)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse('Authentication required')
    }

    const url = new URL(request.url)
    const pagination = parsePagination(url.searchParams)

    const returns = await prisma.returnRequest.findMany({
      where: { userId: user.id },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      orderBy: { createdAt: 'desc' },
    })

    const total = await prisma.returnRequest.count({
      where: { userId: user.id },
    })

    return paginatedResponse(returns, total, pagination)
  } catch (error) {
    console.error('Customer returns list error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch returns',
      500
    )
  }
}

// POST /api/returns — Submit a return request
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse('Authentication required')
    }

    const body = await request.json()
    const input = submitReturnSchema.parse(body)

    // Verify order exists and belongs to customer
    const order = await prisma.order.findUnique({
      where: { orderNumber: input.orderNumber },
    })

    if (!order || order.userId !== user.id) {
      return errorResponse('Order not found', 404)
    }

    // Check for existing active return request
    const existingReturn = await prisma.returnRequest.findFirst({
      where: {
        userId: user.id,
        order: {
          orderNumber: input.orderNumber,
        },
        status: { not: 'REJECTED' }, // Allow new request after rejection
      },
    })

    if (existingReturn) {
      return errorResponse('An active return request already exists for this order', 400)
    }

    // Create return request
    const returnRequest = await prisma.returnRequest.create({
      data: {
        userId: user.id,
        orderId: order.id,
        reason: input.reason,
        status: 'REQUESTED',
      },
    })

    // Record customer action in AdminLog
    await prisma.adminLog.create({
      data: {
        action: 'CUSTOMER_RETURN_SUBMITTED',
        details: `Customer ${user.id} submitted return for order ${input.orderNumber}`,
        adminId: 'system',
        adminName: 'System',
      },
    })

    return successResponse(returnRequest, 201)
  } catch (error) {
    console.error('Customer return submission error:', error)
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation error: ${error.message}`, 400)
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to submit return request',
      500
    )
  }
}
