import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentAdmin } from '@/lib/auth-helpers'
import { unauthorizedResponse } from '@/lib/api'

/**
 * GET /api/diagnostics/orders
 * Admin-only aggregate summary for the data integrity investigation.
 * Never returns individual orders, customer identities or payment references.
 * No records are modified.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) return unauthorizedResponse('Admin access required')

    const totalOrders = await prisma.order.count()

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
      select: { userId: true },
    })

    return NextResponse.json({
      summary: {
        totalOrders,
        uniqueUserCount: uniqueUsers.length,
        byStatus: Object.fromEntries(byStatus.map((g) => [g.status, g._count._all])),
        byPaymentStatus: Object.fromEntries(byPaymentStatus.map((g) => [g.paymentStatus, g._count._all])),
        byArchived: Object.fromEntries(byArchived.map((g) => [String(g.isArchived), g._count._all])),
      },
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'Order diagnostics unavailable' }, {
      status: 500, headers: { 'Cache-Control': 'private, no-store' },
    })
  }
}
