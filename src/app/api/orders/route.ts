import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationError,
  paginatedResponse,
  parsePagination,
} from '@/lib/api'
import { getCurrentUser, getCurrentAdmin } from '@/lib/auth-helpers'
import { createOrderSchema } from '@/lib/validations'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

// Generate a unique order number
function generateOrderNumber(): string {
  const prefix = 'RPX'
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

// GET /api/orders — Get orders (user sees own, admin sees all)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pagination = parsePagination(searchParams)

    // Check if admin is requesting
    const admin = await getCurrentAdmin()
    const user = await getCurrentUser()

    if (!admin && !user) {
      return unauthorizedResponse()
    }

    const isAdmin = !!admin
    const isArchived = searchParams.get('archived') === 'true'
    const statusFilter = searchParams.get('status')

    // Build where clause
    const where: any = { isArchived }

    if (!isAdmin && user) {
      where.userId = user.id
    }

    if (statusFilter) {
      where.status = statusFilter.toUpperCase()
    }

    // Search by order number
    const search = searchParams.get('search')
    if (search) {
      where.orderNumber = { contains: search, mode: 'insensitive' }
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: { include: { product: true } },
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.order.count({ where }),
    ])

    return paginatedResponse(orders, total, pagination)
  } catch (error) {
    console.error('Get orders error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// POST /api/orders — Create a new order from cart
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const parsed = createOrderSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error)
    }

    const data = parsed.data

    // Get user's cart items
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: user.id },
      include: { product: true },
    })

    if (cartItems.length === 0) {
      return errorResponse('Cart is empty', 400)
    }

    // Validate stock availability
    for (const item of cartItems) {
      if (item.product.stock < item.quantity) {
        return errorResponse(
          `Insufficient stock for ${item.product.name}. Available: ${item.product.stock}`,
          400
        )
      }
    }

    // Calculate subtotal
    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    )

    // Apply voucher if provided
    let discount = 0
    if (data.voucherCode) {
      const voucher = await prisma.voucher.findUnique({
        where: { code: data.voucherCode.toUpperCase().trim() },
      })

      if (voucher && voucher.status === 'ACTIVE' && voucher.used < voucher.usageLimit) {
        if (subtotal >= voucher.minPurchase) {
          if (voucher.discountType === 'PERCENTAGE') {
            discount = Math.round(subtotal * (voucher.discountValue / 100))
            if (voucher.maxDiscount > 0 && discount > voucher.maxDiscount) {
              discount = voucher.maxDiscount
            }
          } else {
            discount = voucher.discountValue
          }

          // Increment voucher usage
          await prisma.voucher.update({
            where: { id: voucher.id },
            data: { used: { increment: 1 } },
          })
        }
      }
    }

    const total = subtotal + data.shippingCost - discount

    // Create order with items in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId: user.id,
          status: 'PROCESSING',
          subtotal,
          shippingCost: data.shippingCost,
          discount,
          total,
          courierName: data.courierName,
          courierEstimate: data.courierEstimate,
          paymentMethod: data.paymentMethod,
          voucherCode: data.voucherCode || null,
          fullName: data.fullName,
          address: data.address,
          barangay: data.barangay,
          city: data.city,
          province: data.province,
          postalCode: data.postalCode,
          items: {
            create: cartItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.product.price,
            })),
          },
        },
        include: {
          items: { include: { product: true } },
        },
      })

      // Decrement stock for each product
      for (const item of cartItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      }

      // Clear the cart
      await tx.cartItem.deleteMany({ where: { userId: user.id } })

      return newOrder
    })

    return successResponse(order, 201)
  } catch (error) {
    console.error('Create order error:', error)
    return errorResponse('Internal server error', 500)
  }
}
