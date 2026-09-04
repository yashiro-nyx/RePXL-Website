import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentAdmin } from '@/lib/auth-helpers'
import { unauthorizedResponse } from '@/lib/api'

/**
 * GET /api/diagnostics/orders
 * Admin-only diagnostic endpoint that returns a full breakdown of all orders
 * in the database for the data integrity investigation.
 * No records are modified.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = await getCurrentAdmin()
  if (!admin) return unauthorizedResponse('Admin access required')

  // 1. All orders with user info, item count, and payment fields
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
      _count: { select: { items: true } },
    },
  })

  // 2. Count by status
  const byStatus = await prisma.order.groupBy({
    by: ['status'],
    _count: { _all: true },
  })

  // 3. Count by payment status
  const byPaymentStatus = await prisma.order.groupBy({
    by: ['paymentStatus'],
    _count: { _all: true },
  })

  // 4. Count by isArchived
  const byArchived = await prisma.order.groupBy({
    by: ['isArchived'],
    _count: { _all: true },
  })

  // 5. Unique users who have orders
  const uniqueUsers = await prisma.order.findMany({
    distinct: ['userId'],
    select: { userId: true, user: { select: { email: true } } },
  })

  const rows = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    userId: o.userId,
    userEmail: o.user?.email ?? '(no user)',
    userName: o.user ? `${o.user.firstName} ${o.user.lastName}` : '(no user)',
    createdAt: o.createdAt,
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentIntentId: o.paymentIntentId ?? null,
    paymentReference: o.paymentReference ?? null,
    deliveryStatus: o.deliveryStatus,
    total: o.total,
    isArchived: o.isArchived,
    itemCount: o._count.items,
  }))

  return NextResponse.json({
    summary: {
      totalOrders: orders.length,
      uniqueUserCount: uniqueUsers.length,
      byStatus: Object.fromEntries(byStatus.map((g) => [g.status, g._count._all])),
      byPaymentStatus: Object.fromEntries(byPaymentStatus.map((g) => [g.paymentStatus, g._count._all])),
      byArchived: Object.fromEntries(byArchived.map((g) => [String(g.isArchived), g._count._all])),
      usersWithOrders: uniqueUsers.map((u) => ({ userId: u.userId, email: u.user?.email })),
    },
    orders: rows,
  })
}
