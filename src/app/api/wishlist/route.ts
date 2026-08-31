import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth-helpers'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

// GET /api/wishlist — Get user's wishlist
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const items = await prisma.wishlistItem.findMany({
      where: { userId: user.id },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    })

    return successResponse(items)
  } catch (error) {
    console.error('Get wishlist error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// POST /api/wishlist — Add product to wishlist
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { productId } = body

    if (!productId) {
      return errorResponse('Product ID is required', 400)
    }

    // Verify product exists
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) {
      return errorResponse('Product not found', 404)
    }

    // Check if already in wishlist
    const existing = await prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId: user.id, productId } },
    })

    if (existing) {
      return successResponse(existing) // Idempotent — just return existing
    }

    const item = await prisma.wishlistItem.create({
      data: { userId: user.id, productId },
      include: { product: true },
    })

    return successResponse(item, 201)
  } catch (error) {
    console.error('Add to wishlist error:', error)
    return errorResponse('Internal server error', 500)
  }
}
