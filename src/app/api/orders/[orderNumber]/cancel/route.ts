import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
} from '@/lib/api'
import { getCurrentUser } from '@/lib/auth-helpers'
import { emitNotification } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

// POST /api/orders/[orderNumber]/cancel
// Customer-facing: cancel a PROCESSING order that belongs to the authenticated user.
// Server enforces: authenticated, owner, order is still cancellable (PROCESSING).
export async function POST(
  _request: NextRequest,
  { params }: { params: { orderNumber: string } }
) {
  const user = await getCurrentUser()
  if (!user) return unauthorizedResponse()

  const order = await prisma.order.findUnique({
    where: { orderNumber: params.orderNumber },
    select: {
      id: true,
      userId: true,
      status: true,
      orderNumber: true,
      paymentStatus: true,
      total: true,
      createdAt: true,
      items: { select: { productId: true, quantity: true } },
    },
  })

  if (!order) return notFoundResponse('Order not found')

  // Ownership check — server-enforced
  if (order.userId !== user.id) return notFoundResponse('Order not found')

  // Only PROCESSING orders can be cancelled by the customer
  if (order.status !== 'PROCESSING') {
    return errorResponse(
      `Order cannot be cancelled (current status: ${order.status}). Only orders in Processing status can be cancelled.`,
      409
    )
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED', updatedAt: new Date() },
    })

    if (order.paymentStatus === 'PAID') {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })
      }
    }
  })

  // Emit notification to the customer (non-blocking — failure does not roll back)
  emitNotification({
    userId: user.id,
    event: 'ORDER_STATUS_CHANGE',
    subject: `Order ${order.orderNumber} Cancelled`,
    body: `Your order ${order.orderNumber} has been cancelled as requested.`,
    channel: 'BOTH',
    recipientEmail: user.email,
    context: {
      orderNumber: order.orderNumber,
      customerName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email || 'Customer',
      status: 'CANCELLED',
      orderStatus: 'CANCELLED',
      orderTotal: order.total != null ? `₱${order.total.toLocaleString()}` : '',
      orderDate: order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' }) : '',
    },
  }).catch((err) => {
    console.error('[cancel] notification failed (non-fatal):', err)
  })

  console.log(`[cancel] User ${user.email} cancelled order ${order.orderNumber}`)
  return successResponse({ orderNumber: order.orderNumber, status: 'CANCELLED' })
}
