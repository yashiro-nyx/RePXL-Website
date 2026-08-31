import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, notFoundResponse, unauthorizedResponse } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth-helpers'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: { productId: string }
}

// DELETE /api/wishlist/[productId] — Remove product from wishlist
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const item = await prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId: user.id, productId: params.productId } },
    })

    if (!item) {
      return notFoundResponse('Item not in wishlist')
    }

    await prisma.wishlistItem.delete({ where: { id: item.id } })

    return successResponse({ message: 'Removed from wishlist' })
  } catch (error) {
    console.error('Remove from wishlist error:', error)
    return errorResponse('Internal server error', 500)
  }
}
