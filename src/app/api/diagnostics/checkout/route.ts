import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/diagnostics/checkout
 *
 * TEMPORARY — shows order counts by status and payment status.
 * Reveals whether PENDING orders exist (webhook not firing) vs orders not created at all.
 * Never returns user data, payment details, or secrets.
 * Remove after verification.
 */
export async function GET() {
  try {
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

    // Most recent 5 orders — metadata only, no PII
    const recent = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        orderNumber: true,
        status: true,
        paymentStatus: true,
        total: true,
        createdAt: true,
        paymentIntentId: true, // presence indicates PIPM flow was used
        paymentSessionId: true, // presence indicates session was created
      },
    })

    // Is webhook secret configured?
    const webhookSecretSet = Boolean(process.env.PAYMONGO_WEBHOOK_SECRET)
    const paymongoSecretSet = Boolean(process.env.PAYMONGO_SECRET_KEY)
    const paymongoEnabledFlag = process.env.NEXT_PUBLIC_PAYMONGO_ENABLED

    return Response.json({
      ordersByStatus: byStatus.map((r) => ({ status: r.status, count: r._count._all })),
      ordersByPaymentStatus: byPaymentStatus.map((r) => ({ paymentStatus: r.paymentStatus, count: r._count._all })),
      recentOrders: recent.map((o) => ({
        orderNumber: o.orderNumber,
        status: o.status,
        paymentStatus: o.paymentStatus,
        total: o.total,
        createdAt: o.createdAt,
        hasPaymentIntent: !!o.paymentIntentId,
        hasSessionId: !!o.paymentSessionId,
      })),
      config: {
        webhookSecretSet,
        paymongoSecretSet,
        paymongoEnabledFlag,
      },
    })
  } catch (err) {
    return Response.json({
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 })
  }
}
