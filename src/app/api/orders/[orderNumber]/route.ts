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
import { updateOrderStatusSchema } from '@/lib/validations'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: { orderNumber: string }
}

// GET /api/orders/[orderNumber] — Get single order
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    const admin = await getCurrentAdmin()

    if (!user && !admin) {
      return unauthorizedResponse()
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber: params.orderNumber },
      include: {
        items: { include: { product: true } },
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    })

    if (!order) {
      return notFoundResponse('Order not found')
    }

    // Non-admin users can only see their own orders
    if (!admin && user && order.userId !== user.id) {
      return notFoundResponse('Order not found')
    }

    return successResponse(order)
  } catch (error) {
    console.error('Get order error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// PATCH /api/orders/[orderNumber] — Update order status (admin only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const body = await request.json()
    const parsed = updateOrderStatusSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error)
    }

    const { status } = parsed.data

    const order = await prisma.order.findUnique({
      where: { orderNumber: params.orderNumber },
    })

    if (!order) {
      return notFoundResponse('Order not found')
    }

    const updated = await prisma.order.update({
      where: { orderNumber: params.orderNumber },
      data: { status },
      include: {
        items: { include: { product: true } },
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    })

    // Log admin action
    await prisma.adminLog.create({
      data: {
        action: 'UPDATE_ORDER_STATUS',
        details: `Order ${params.orderNumber} status changed to ${status}`,
        adminId: admin.id,
        adminName: `${admin.firstName} ${admin.lastName}`,
      },
    })

    return successResponse(updated)
  } catch (error) {
    console.error('Update order status error:', error)
    return errorResponse('Internal server error', 500)
  }
}
