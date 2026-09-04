import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationError,
  paginatedResponse,
  parsePagination,
} from '@/lib/api'
import { getCurrentUser } from '@/lib/auth-helpers'
import { createReviewSchema } from '@/lib/validations'
// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

// GET /api/reviews — Get reviews (by product or by user)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pagination = parsePagination(searchParams)

    const productId = searchParams.get('productId')
    const productSlug = searchParams.get('productSlug')
    const userId = searchParams.get('userId')
    // ?mine=true — return only the authenticated user's reviews (Account → Reviews)
    const mine = searchParams.get('mine') === 'true'

    const where: any = {}

    if (mine) {
      // Server-side ownership: authenticated user only — never trust client userId
      const currentUser = await getCurrentUser()
      if (!currentUser) return unauthorizedResponse()
      where.userId = currentUser.id
    } else if (userId) {
      // Public userId filter — still safe, reviews are public
      where.userId = userId
    }

    if (productId) {
      where.productId = productId
    } else if (productSlug) {
      where.product = { slug: productSlug }
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          product: { select: { slug: true, name: true, image: true } },
          user: { select: { firstName: true, lastName: true, email: true } },
          images: { orderBy: { sortOrder: 'asc' }, select: { id: true, secureUrl: true, sortOrder: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.review.count({ where }),
    ])

    // Calculate average rating if filtered by product
    let averageRating = 0
    let totalReviews = 0
    if (productId || productSlug) {
      const productWhere = productId
        ? { productId }
        : { product: { slug: productSlug as string } }
      const aggregate = await prisma.review.aggregate({
        where: productWhere,
        _avg: { rating: true },
        _count: { _all: true },
      })
      averageRating = aggregate._avg?.rating ?? 0
      totalReviews = aggregate._count._all
    }

    return NextResponse.json({
      success: true,
      data: reviews,
      averageRating,
      totalReviews,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    })
  } catch (error) {
    console.error('Get reviews error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// POST /api/reviews — Create a new review
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const parsed = createReviewSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error)
    }

    const { productId, rating, comment } = parsed.data

    // Verify product exists
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) {
      return errorResponse('Product not found', 404)
    }

    // Check if user already reviewed this product
    const existingReview = await prisma.review.findUnique({
      where: { userId_productId: { userId: user.id, productId } },
    })
    if (existingReview) {
      return errorResponse('You have already reviewed this product', 409)
    }

    // Check if user has purchased this product (verified purchase)
    const hasPurchased = await prisma.orderItem.findFirst({
      where: {
        productId,
        order: { userId: user.id, status: { in: ['DELIVERED', 'COMPLETED'] } },
      },
    })

    const review = await prisma.review.create({
      data: {
        productId,
        userId: user.id,
        reviewerName: `${user.firstName} ${user.lastName.charAt(0)}.`,
        rating,
        comment,
        verifiedPurchase: !!hasPurchased,
      },
      include: {
        product: { select: { slug: true, name: true } },
      },
    })

    return successResponse(review, 201)
  } catch (error) {
    console.error('Create review error:', error)
    return errorResponse('Internal server error', 500)
  }
}


