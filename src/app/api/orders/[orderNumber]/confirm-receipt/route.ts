import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
  validationError,
} from '@/lib/api'
import { getCurrentUser } from '@/lib/auth-helpers'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schema = z.object({
  rating: z.number().int().min(1, 'Rating must be 1–5').max(5, 'Rating must be 1–5'),
  comment: z
    .string()
    .min(5, 'Feedback must be at least 5 characters')
    .max(2000, 'Feedback must be 2000 characters or fewer')
    .transform((s) => s.trim()),
})

/**
 * POST /api/orders/[orderNumber]/confirm-receipt
 *
 * Customer action: confirms they received the order, submits mandatory feedback,
 * and transitions the order from DELIVERED → COMPLETED.
 *
 * Required body: { rating: 1–5, comment: string }
 *
 * Server enforces:
 *  - authenticated customer
 *  - order ownership
 *  - order must be DELIVERED (not Processing/Shipped/Completed/Cancelled)
 *  - rating is required (1–5)
 *  - comment is required (5–2000 chars)
 *  - prevents duplicate review per user+product per order
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orderNumber: string } }
) {
  const user = await getCurrentUser()
  if (!user) return unauthorizedResponse()

  // Parse and validate body
  let rawBody: unknown
  try { rawBody = await request.json() } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  const parsed = schema.safeParse(rawBody)
  if (!parsed.success) return validationError(parsed.error)
  const { rating, comment } = parsed.data

  // Load order with items so we can create reviews per purchased product
  const order = await prisma.order.findUnique({
    where: { orderNumber: params.orderNumber },
    include: {
      items: { include: { product: { select: { id: true, name: true } } } },
    },
  })

  if (!order) return notFoundResponse('Order not found')

  // Ownership check — server-enforced
  if (order.userId !== user.id) return notFoundResponse('Order not found')

  // Must be DELIVERED to confirm receipt
  if (order.status !== 'DELIVERED') {
    return errorResponse(
      `Receipt cannot be confirmed (current status: ${order.status}). Order must be in Delivered status.`,
      409
    )
  }

  // Prevent duplicate — check if user already reviewed the first product in this order
  const firstProduct = order.items[0]?.product
  if (firstProduct) {
    const existing = await prisma.review.findFirst({
      where: { userId: user.id, productId: firstProduct.id },
    })
    if (existing) {
      // Still safe to mark Completed even if review exists
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'COMPLETED', completedAt: new Date(), updatedAt: new Date() },
      })
      return successResponse({
        orderNumber: order.orderNumber,
        status: 'COMPLETED',
        reviewCreated: false,
        message: 'Order marked as completed. Review was previously submitted.',
      })
    }
  }

  // Create reviews for each purchased product and mark order COMPLETED in a transaction
  const reviewerName = `${user.firstName} ${user.lastName}`.trim() || user.email

  await prisma.$transaction(async (tx) => {
    // Create one review per unique product purchased
    const seenProductIds = new Set<string>()
    for (const item of order.items) {
      const pid = item.product.id
      if (seenProductIds.has(pid)) continue
      seenProductIds.add(pid)

      // Upsert — skip if this user already reviewed this product
      const alreadyReviewed = await tx.review.findFirst({
        where: { userId: user.id, productId: pid },
      })
      if (alreadyReviewed) continue

      await tx.review.create({
        data: {
          productId: pid,
          userId: user.id,
          reviewerName,
          rating,
          comment,
          verifiedPurchase: true,
        },
      })
    }

    // Transition order: DELIVERED → COMPLETED
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    })
  })

  console.log(`[confirm-receipt] ${user.email} confirmed order ${order.orderNumber} — review submitted, order COMPLETED`)

  return successResponse({
    orderNumber: order.orderNumber,
    status: 'COMPLETED',
    reviewCreated: true,
    message: 'Thank you for your feedback! Your order is now complete.',
  })
}
