import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentAdmin } from '@/lib/auth-helpers'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api'
import { canTransition, isRefundEligible } from '@/lib/returns'
import { createRefundWithTimeout, retrieveRefund } from '@/lib/paymongo'
import { emitNotification } from '@/lib/notifications'
import { z } from 'zod'

/**
 * Task 12.2: Admin returns detail routes
 * GET /api/admin/returns/[id]
 * PATCH /api/admin/returns/[id] — Update return status
 * POST /api/admin/returns/[id]/refund — Process refund
 *
 * Requirements: 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12, 4.13, 4.14
 */

export const dynamic = 'force-dynamic'

const paramsSchema = z.object({
  id: z.string().cuid('Invalid return request ID'),
})

const updateStatusSchema = z.object({
  status: z.enum(['UNDER_REVIEW', 'APPROVED', 'REJECTED']),
  rejectionReason: z.string().min(1).max(500).optional(),
})

// GET /api/admin/returns/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const { id } = await paramsSchema.parseAsync(await params)

    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
        user: true,
        items: {
          include: {
            returnRequest: false,
          },
        },
      },
    })

    if (!returnRequest) {
      return errorResponse('Return request not found', 404)
    }

    // Requirement 4.3: Return detail with order/items/reason
    return successResponse(returnRequest, 200)
  } catch (error) {
    console.error('Return detail error:', error)
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid return request ID', 400)
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch return request',
      500
    )
  }
}

// PATCH /api/admin/returns/[id] — Update status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const { id } = await paramsSchema.parseAsync(await params)
    const body = await request.json()
    const { status, rejectionReason } = updateStatusSchema.parse(body)

    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id },
      include: { order: true, user: true },
    })

    if (!returnRequest) {
      return errorResponse('Return request not found', 404)
    }

    // Requirement 4.4, 4.5, 4.6: Validate transition
    if (!canTransition(returnRequest.status, status)) {
      return errorResponse(
        `Cannot transition from ${returnRequest.status} to ${status}`,
        400
      )
    }

    // Requirement 4.7: Validate rejection reason
    if (status === 'REJECTED') {
      if (!rejectionReason || rejectionReason.trim().length === 0) {
        return errorResponse('Rejection reason is required when rejecting', 400)
      }
      if (rejectionReason.length < 1 || rejectionReason.length > 500) {
        return errorResponse('Rejection reason must be 1–500 characters', 400)
      }
    }

    // Update status
    const updated = await prisma.returnRequest.update({
      where: { id },
      data: {
        status,
        rejectionReason: status === 'REJECTED' ? rejectionReason : null,
      },
      include: {
        order: true,
        user: true,
      },
    })

    // Record AdminLog
    await prisma.adminLog.create({
      data: {
        action: 'RETURN_STATUS_UPDATED',
        details: `Updated return request ${id} status to ${status}${rejectionReason ? ` with reason: ${rejectionReason}` : ''}`,
        adminId: admin.id,
        adminName: `${admin.firstName} ${admin.lastName}`,
      },
    })

    // Emit notification for status change (Requirement 4.8)
    await emitNotification({
      userId: updated.user.id,
      event: 'RETURN_STATUS_CHANGE',
      subject: `Return Status Update - ${id}`,
      body: `Your return request status has changed to: ${status}`,
      channel: 'BOTH',
      recipientEmail: updated.user.email,
    })

    return successResponse(updated)
  } catch (error) {
    console.error('Return update error:', error)
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation error: ${error.message}`, 400)
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to update return request',
      500
    )
  }
}

// POST /api/admin/returns/[id]/refund — Process refund
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const { id } = await paramsSchema.parseAsync(await params)

    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        order: true,
        user: true,
      },
    })

    if (!returnRequest) {
      return errorResponse('Return request not found', 404)
    }

    // Requirement 4.9, 4.10: Check refund eligibility
    if (!isRefundEligible(returnRequest.status, returnRequest.order.paymentStatus)) {
      return errorResponse(
        'Return must be APPROVED and order payment must be PAID to process refund',
        400
      )
    }

    // Requirement 4.11: Create refund via PayMongo with a timeout bound.
    let refundResult
    try {
      refundResult = await createRefundWithTimeout({
        paymentId: returnRequest.order.paymentReference || returnRequest.order.paymentIntentId || '',
        amount: Math.round(returnRequest.order.total * 100),
        reason: 'others',
        notes: `Return request ${id}`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      await prisma.adminLog.create({
        data: {
          action: 'REFUND_FAILED',
          details: `Refund processing failed for return ${id}: ${message}`,
          adminId: admin.id,
          adminName: `${admin.firstName} ${admin.lastName}`,
        },
      })

      return errorResponse(`Refund failed: ${message}`, 400)
    }

    // Update return request and order status
    const updated = await prisma.returnRequest.update({
      where: { id },
      data: {
        status: 'REFUNDED',
        refundId: refundResult.id,
      },
      include: {
        order: true,
        user: true,
      },
    })

    // Update order payment status to REFUNDED
    await prisma.order.update({
      where: { id: returnRequest.order.id },
      data: { paymentStatus: 'REFUNDED' },
    })

    // Record AdminLog (Requirement 4.13)
    await prisma.adminLog.create({
      data: {
        action: 'REFUND_PROCESSED',
        details: `Processed refund for return ${id}, refund ID: ${refundResult.id}`,
        adminId: admin.id,
        adminName: `${admin.firstName} ${admin.lastName}`,
      },
    })

    // Emit notification (Requirement 4.14)
    await emitNotification({
      userId: updated.user.id,
      event: 'REFUND_COMPLETED',
      subject: `Refund Completed - ${returnRequest.order.orderNumber}`,
      body: `Your refund has been processed successfully!\n\nRefund Amount: ₱${updated.order.total.toFixed(2)}\n\nIt may take 3-5 business days to appear in your account.`,
      channel: 'BOTH',
      recipientEmail: updated.user.email,
    })

    return successResponse(updated)
  } catch (error) {
    console.error('Refund processing error:', error)
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid return request ID', 400)
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to process refund',
      500
    )
  }
}
