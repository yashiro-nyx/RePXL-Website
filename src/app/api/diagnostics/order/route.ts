import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/** TEMPORARY — safe metadata only, no secrets */
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
    if (!order) return Response.json({ found: false }, { status: 404 })
    return Response.json({
      found: true,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      deliveryStatus: order.deliveryStatus,
      trackingProgress: order.trackingProgress,
      trackingDescription: order.trackingDescription,
      trackingNumberSet: !!order.trackingNumber && order.trackingNumber !== '',
      deliveredAtSet: order.deliveredAt !== null,
      completedAtSet: order.completedAt !== null,
      isArchived: order.isArchived,
      updatedAt: order.updatedAt,
    })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
