import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse, validationError } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth-helpers'
import { addToCartSchema } from '@/lib/validations'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

// GET /api/cart — Get current user's cart
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const items = await prisma.cartItem.findMany({
      where: { userId: user.id },
      include: {
        product: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return successResponse(items)
  } catch (error) {
    console.error('Get cart error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// POST /api/cart — Add item to cart
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const parsed = addToCartSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error)
    }

    const { productId, quantity } = parsed.data

    // Verify product exists and has stock
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) {
      return errorResponse('Product not found', 404)
    }
    if (product.stock <= 0) {
      return errorResponse('Product is out of stock', 400)
    }

    // Check if item already in cart
    const existing = await prisma.cartItem.findUnique({
      where: { userId_productId: { userId: user.id, productId } },
    })

    if (existing) {
      // Update quantity, cap at stock
      const newQty = Math.min(existing.quantity + quantity, product.stock)
      const item = await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQty },
        include: { product: true },
      })
      return successResponse(item)
    }

    // Create new cart item
    const cappedQty = Math.min(quantity, product.stock)
    const item = await prisma.cartItem.create({
      data: {
        userId: user.id,
        productId,
        quantity: cappedQty,
      },
      include: { product: true },
    })

    return successResponse(item, 201)
  } catch (error) {
    console.error('Add to cart error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// DELETE /api/cart — Clear entire cart
export async function DELETE() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    await prisma.cartItem.deleteMany({ where: { userId: user.id } })

    return successResponse({ message: 'Cart cleared' })
  } catch (error) {
    console.error('Clear cart error:', error)
    return errorResponse('Internal server error', 500)
  }
}
