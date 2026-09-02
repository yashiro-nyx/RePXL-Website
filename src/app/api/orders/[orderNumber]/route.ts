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
import { emitNotification } from '@/lib/notifications'
import { buildOrderStatusUpdate } from '@/lib/order-status'
import type { OrderStatus } from '@prisma/client'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: { orderNumber: string }
}

// Valid admin-driven status transitions.
// DELIVERED → COMPLETED is intentionally absent: that transition is
// customer-only (via /api/orders/[orderNumber]/confirm-receipt).
const ALLOWED_ADMIN_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['DELIVERED'], // admin can re-set Delivered; cannot set Completed
  COMPLETED: [],
  CANCELLED: [],
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

    // Enforce server-side transition rules.
    const allowed = ALLOWED_ADMIN_TRANSITIONS[order.status] ?? []
    if (!allowed.includes(status)) {
      // Special case: DELIVERED → COMPLETED is blocked for admins.
      if (order.status === 'DELIVERED' && status === 'COMPLETED') {
        return errorResponse(
          'Order cannot be marked Completed by admin. The customer must confirm receipt and submit feedback.',
          409
        )
      }
      return errorResponse(
        `Invalid status transition: ${order.status} → ${status}`,
        409
      )
    }

    const updateData = buildOrderStatusUpdate(
      {
        status: order.status,
        deliveredAt: order.deliveredAt,
        completedAt: order.completedAt,
      },
      status
    )

    const updated = await prisma.order.update({
      where: { orderNumber: params.orderNumber },
      data: updateData,
      include: {
        items: { include: { product: true } },
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    })

    await emitNotification({
      userId: updated.user.id,
      event: 'ORDER_STATUS_CHANGE',
      subject: `Order ${updated.orderNumber} Status Update`,
      body: `Your order ${updated.orderNumber} status has changed from ${order.status} to ${updated.status}.`,
      channel: 'BOTH',
      recipientEmail: updated.user.email,
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
