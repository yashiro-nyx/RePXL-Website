import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-helpers'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api'
import { z } from 'zod'
import { calculateReturnQuote } from '@/lib/return-workflow'
import { notifyReturn, returnInclude } from '@/lib/return-service'

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
      include: { items: true },
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
      include: { items: true },
    })

    if (!returnRequest) {
      return errorResponse('No return request found for this order', 404)
    }

    const { refundAttemptKey: _internalKey, ...publicRequest } = returnRequest
    return successResponse({
      ...publicRequest,
      refundQuote: calculateReturnQuote(order, returnRequest.items),
    })
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

// Customer records their return shipment after receiving approved instructions.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse('Authentication required')
    const { orderNumber } = await params
    const input = z
      .object({
        returnRequestId: z.string().cuid(),
        returnCarrier: z.string().trim().min(2).max(100),
        returnTrackingNumber: z.string().trim().min(3).max(150),
      })
      .parse(await request.json())
    const current = await prisma.returnRequest.findFirst({
      where: {
        id: input.returnRequestId,
        userId: user.id,
        order: { orderNumber },
      },
      include: returnInclude,
    })
    if (!current) return errorResponse('Return request not found', 404)
    if (
      current.status !== 'APPROVED' ||
      current.receivedAt ||
      current.refundStartedAt
    )
      return errorResponse(
        'Shipment tracking can only be recorded for an approved return before receipt.',
        409
      )
    const updated = await prisma.$transaction(async (tx) => {
      const change = await tx.returnRequest.updateMany({
        where: {
          id: current.id,
          updatedAt: current.updatedAt,
          status: 'APPROVED',
          receivedAt: null,
          refundStartedAt: null,
        },
        data: {
          returnCarrier: input.returnCarrier,
          returnTrackingNumber: input.returnTrackingNumber,
          shippedAt: current.shippedAt ?? new Date(),
        },
      })
      if (!change.count) return null
      return tx.returnRequest.findUniqueOrThrow({
        where: { id: current.id },
        include: returnInclude,
      })
    })
    if (!updated)
      return errorResponse(
        'This return changed. Refresh before trying again.',
        409
      )
    void notifyReturn(updated)
    return successResponse({ recorded: true })
  } catch (error) {
    if (error instanceof z.ZodError)
      return errorResponse(
        error.issues.map((issue) => issue.message).join(' '),
        422
      )
    return errorResponse(
      'Unable to save return tracking. Please try again.',
      500
    )
  }
}
