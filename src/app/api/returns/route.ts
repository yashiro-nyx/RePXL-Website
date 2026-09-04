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
import { deleteFromCloudinary, MAX_IMAGES } from '@/lib/cloudinary'
import {
  ALL_REASONS,
  REASON_LABELS,
  type ReturnReason,
  requiresEvidence,
} from '@/lib/returnReasons'
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
  reason: z.enum(ALL_REASONS, {
    errorMap: () => ({ message: 'Please select a valid return reason.' }),
  }),
  details: z.string().min(10, 'Details must be at least 10 characters').max(1000).optional().default(''),
  // publicIds of images already uploaded to Cloudinary
  imagePublicIds: z
    .array(z.string().min(1).max(300))
    .max(MAX_IMAGES, `Maximum ${MAX_IMAGES} images allowed`)
    .optional()
    .default([]),
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

    // Server-side enforcement: evidence required for damage-type reasons
    if (requiresEvidence(input.reason) && input.imagePublicIds.length === 0) {
      return errorResponse(
        `Photo evidence is required for "${REASON_LABELS[input.reason as ReturnReason]}". Please upload at least one image.`,
        422
      )
    }

    // Validate all imagePublicIds are from the returns folder
    for (const pid of input.imagePublicIds) {
      if (!pid.startsWith('repixl/returns/')) {
        return errorResponse('Invalid image reference.', 422)
      }
    }

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
      // Clean up orphan uploads since we won't create a new request
      for (const pid of input.imagePublicIds) {
        await deleteFromCloudinary(pid, 'authenticated')
      }
      return errorResponse('An active return request already exists for this order', 400)
    }

    // Build a human-readable reason string from the structured reason + optional details
    const reasonLabel = REASON_LABELS[input.reason as ReturnReason] ?? input.reason
    const fullReason = input.details
      ? `${reasonLabel}: ${input.details}`
      : reasonLabel

    // Create return request + images in a transaction
    const returnRequest = await prisma.$transaction(async (tx) => {
      const rr = await tx.returnRequest.create({
        data: {
          userId: user.id,
          orderId: order.id,
          reason: fullReason,
          status: 'REQUESTED',
        },
      })

      // Create image records (authenticated / protected delivery)
      for (let i = 0; i < input.imagePublicIds.length; i++) {
        await tx.returnRequestImage.create({
          data: {
            returnRequestId: rr.id,
            publicId: input.imagePublicIds[i],
            resourceType: 'image',
            deliveryType: 'authenticated',
            sortOrder: i,
          },
        })
      }

      return rr
    })

    // Record customer action in AdminLog
    await prisma.adminLog.create({
      data: {
        action: 'CUSTOMER_RETURN_SUBMITTED',
        details: `Customer ${user.id} submitted return for order ${input.orderNumber} (${input.imagePublicIds.length} images)`,
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
