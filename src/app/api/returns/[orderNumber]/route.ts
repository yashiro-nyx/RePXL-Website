import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-helpers'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api'
import { z } from 'zod'

/**
 * Task 13: Customer return detail route
 * GET /api/returns/[orderNumber]
 *
 * Requirements: 4.1, 4.4
 */

export const dynamic = 'force-dynamic'

const paramsSchema = z.object({
  orderNumber: z.string(),
})

// GET /api/returns/[orderNumber] — Get return request status for an order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse('Authentication required')
    }

    const { orderNumber } = await paramsSchema.parseAsync(await params)

    // Verify order exists and belongs to customer
    const order = await prisma.order.findUnique({
      where: { orderNumber },
    })

    if (!order || order.userId !== user.id) {
      return errorResponse('Order not found', 404)
    }

    // Get return request (most recent)
    const returnRequest = await prisma.returnRequest.findFirst({
      where: {
        userId: user.id,
        order: {
          orderNumber,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!returnRequest) {
      return errorResponse('No return request found for this order', 404)
    }

    return successResponse(returnRequest)
  } catch (error) {
    console.error('Customer return detail error:', error)
    if (error instanceof z.ZodError) {
      return errorResponse(`Invalid order number`, 400)
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch return request',
      500
    )
  }
}
