import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  validationError,
} from '@/lib/api'
import { getCurrentUser, getCurrentAdmin } from '@/lib/auth-helpers'
import { updateReviewSchema } from '@/lib/validations'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: { reviewId: string }
}

// PUT /api/reviews/[reviewId] — Update a review (own review only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const review = await prisma.review.findUnique({ where: { id: params.reviewId } })
    if (!review) {
      return notFoundResponse('Review not found')
    }

    // Only the review author can update
    if (review.userId !== user.id) {
      return unauthorizedResponse('You can only edit your own reviews')
    }

    const body = await request.json()
    const parsed = updateReviewSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error)
    }

    const updated = await prisma.review.update({
      where: { id: params.reviewId },
      data: parsed.data,
      include: {
        product: { select: { slug: true, name: true } },
      },
    })

    return successResponse(updated)
  } catch (error) {
    console.error('Update review error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// DELETE /api/reviews/[reviewId] — Delete a review (own or admin)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    const admin = await getCurrentAdmin()

    if (!user && !admin) {
      return unauthorizedResponse()
    }

    const review = await prisma.review.findUnique({ where: { id: params.reviewId } })
    if (!review) {
      return notFoundResponse('Review not found')
    }

    // Non-admin can only delete their own reviews
    if (!admin && user && review.userId !== user.id) {
      return unauthorizedResponse('You can only delete your own reviews')
    }

    await prisma.review.delete({ where: { id: params.reviewId } })

    return successResponse({ message: 'Review deleted' })
  } catch (error) {
    console.error('Delete review error:', error)
    return errorResponse('Internal server error', 500)
  }
}
