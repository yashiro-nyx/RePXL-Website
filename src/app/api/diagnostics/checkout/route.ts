import { prisma } from '@/lib/prisma'
import { getCurrentAdmin } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

// Admin-only aggregate checkout health; no individual order or payment metadata.
const headers = { 'Cache-Control': 'private, no-store' }
export async function GET() {
  try {
    if (!(await getCurrentAdmin())) {
      return Response.json({ error: 'Admin access required' }, { status: 401, headers })
    }
    // Count by status
    const byStatus = await prisma.order.groupBy({
      by: ['status'],
      _count: { _all: true },
    })

    // Count by payment status
    const byPaymentStatus = await prisma.order.groupBy({
      by: ['paymentStatus'],
      _count: { _all: true },
    })

    return Response.json({
      ordersByStatus: byStatus.map((r) => ({ status: r.status, count: r._count._all })),
      ordersByPaymentStatus: byPaymentStatus.map((r) => ({ paymentStatus: r.paymentStatus, count: r._count._all })),
    }, { headers })
  } catch (err) {
    return Response.json({
      error: 'Checkout diagnostics unavailable',
    }, { status: 500, headers })
  }
}
