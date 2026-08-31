import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, notFoundResponse, unauthorizedResponse } from '@/lib/api'
import { getCurrentAdmin } from '@/lib/auth-helpers'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: { orderNumber: string }
}

// POST /api/orders/[orderNumber]/archive — Archive an order
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber: params.orderNumber },
    })

    if (!order) {
      return notFoundResponse('Order not found')
    }

    const updated = await prisma.order.update({
      where: { orderNumber: params.orderNumber },
      data: { isArchived: true },
    })

    await prisma.adminLog.create({
      data: {
        action: 'ARCHIVE_ORDER',
        details: `Archived order ${params.orderNumber}`,
        adminId: admin.id,
        adminName: `${admin.firstName} ${admin.lastName}`,
      },
    })

    return successResponse(updated)
  } catch (error) {
    console.error('Archive order error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// DELETE /api/orders/[orderNumber]/archive — Restore an archived order
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber: params.orderNumber },
    })

    if (!order) {
      return notFoundResponse('Order not found')
    }

    const updated = await prisma.order.update({
      where: { orderNumber: params.orderNumber },
      data: { isArchived: false },
    })

    await prisma.adminLog.create({
      data: {
        action: 'RESTORE_ORDER',
        details: `Restored order ${params.orderNumber}`,
        adminId: admin.id,
        adminName: `${admin.firstName} ${admin.lastName}`,
      },
    })

    return successResponse(updated)
  } catch (error) {
    console.error('Restore order error:', error)
    return errorResponse('Internal server error', 500)
  }
}
