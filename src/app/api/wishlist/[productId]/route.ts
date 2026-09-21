import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth-helpers'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ productId: string }>
}

// DELETE /api/wishlist/[productId] — Remove product from wishlist
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { productId } = await params
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // Support both ID and slug resolution
    let targetProductId = productId
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: productId }, { slug: productId }],
      },
      select: { id: true },
    })
    if (product) {
      targetProductId = product.id
    }

    // Idempotent delete — deletes if present, succeeds cleanly even if already removed
    await prisma.wishlistItem.deleteMany({
      where: {
        userId: user.id,
        productId: targetProductId,
      },
    })

    return successResponse({ message: 'Removed from wishlist' })
  } catch (error) {
    console.error('Remove from wishlist error:', error)
    return errorResponse('Internal server error', 500)
  }
}
