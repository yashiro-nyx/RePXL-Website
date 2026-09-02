import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/diagnostics/order
 * TEMPORARY — returns tracking fields for the test order.
 * No PII, no secrets. Remove after diagnosis.
 */
export async function GET() {
  const ORDER = 'RPX-MTKGPGADXKWP'

  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber: ORDER },
      select: {
        orderNumber: true,
        status: true,
        paymentStatus: true,
        deliveryStatus: true,
        trackingNumber: true,
        trackingDescription: true,
        trackingProgress: true,
        deliveredAt: true,
        completedAt: true,
        isArchived: true,
        updatedAt: true,
      },
    })

    if (!order) {
      return Response.json({ found: false, orderNumber: ORDER }, { status: 404 })
    }

    return Response.json({
      found: true,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      deliveryStatus: order.deliveryStatus,
      trackingNumberSet: !!order.trackingNumber && order.trackingNumber !== '',
      trackingNumberValue: order.trackingNumber,
      trackingDescription: order.trackingDescription,
      trackingProgress: order.trackingProgress,
      deliveredAtSet: order.deliveredAt !== null,
      completedAtSet: order.completedAt !== null,
      isArchived: order.isArchived,
      updatedAt: order.updatedAt,
    })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
