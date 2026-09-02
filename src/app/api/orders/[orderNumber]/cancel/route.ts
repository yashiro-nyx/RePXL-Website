import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
} from '@/lib/api'
import { getCurrentUser } from '@/lib/auth-helpers'

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
    select: { id: true, userId: true, status: true, orderNumber: true },
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

  await prisma.order.update({
    where: { id: order.id },
    data: { status: 'CANCELLED', updatedAt: new Date() },
  })

  console.log(`[cancel] User ${user.email} cancelled order ${order.orderNumber}`)
  return successResponse({ orderNumber: order.orderNumber, status: 'CANCELLED' })
}
