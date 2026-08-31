import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse, validationError } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth-helpers'
import { updateCartSchema } from '@/lib/validations'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: { itemId: string }
}

// PUT /api/cart/[itemId] — Update cart item quantity
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const parsed = updateCartSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error)
    }

    const { quantity } = parsed.data

    // Find the cart item (ensure it belongs to this user)
    const cartItem = await prisma.cartItem.findFirst({
      where: { id: params.itemId, userId: user.id },
      include: { product: true },
    })

    if (!cartItem) {
      return notFoundResponse('Cart item not found')
    }

    // Cap quantity at product stock
    const cappedQty = Math.min(quantity, cartItem.product.stock)

    const updated = await prisma.cartItem.update({
      where: { id: params.itemId },
      data: { quantity: cappedQty },
      include: { product: true },
    })

    return successResponse(updated)
  } catch (error) {
    console.error('Update cart item error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// DELETE /api/cart/[itemId] — Remove item from cart
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    // Verify the item belongs to this user
    const cartItem = await prisma.cartItem.findFirst({
      where: { id: params.itemId, userId: user.id },
    })

    if (!cartItem) {
      return notFoundResponse('Cart item not found')
    }

    await prisma.cartItem.delete({ where: { id: params.itemId } })

    return successResponse({ message: 'Item removed from cart' })
  } catch (error) {
    console.error('Remove cart item error:', error)
    return errorResponse('Internal server error', 500)
  }
}
