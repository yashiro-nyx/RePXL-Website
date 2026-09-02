import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/diagnostics/tracking?order=<orderNumber>
 *
 * TEMPORARY — returns the live tracking state for an order without SSE.
 * Proves the data pipeline from DB → API → JSON works.
 * Remove after verification.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const orderNumber = searchParams.get('order')

  if (!orderNumber) {
    return Response.json({ error: 'Missing ?order= parameter' }, { status: 400 })
  }

  try {
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { orderNumber },
          { trackingNumber: orderNumber },
        ],
      },
      select: {
        orderNumber: true,
        status: true,
        deliveryStatus: true,
        trackingProgress: true,
        trackingDescription: true,
        trackingNumber: true,
        deliveredAt: true,
        completedAt: true,
        updatedAt: true,
      },
    })

    if (!order) {
      return Response.json({ found: false, orderNumber }, { status: 404 })
    }

    return Response.json({
      found: true,
      orderNumber: order.orderNumber,
      status: order.status,
      deliveryStatus: order.deliveryStatus,
      trackingProgress: order.trackingProgress,
      trackingDescription: order.trackingDescription,
      trackingNumberSet: !!order.trackingNumber && order.trackingNumber !== '',
      deliveredAtSet: order.deliveredAt !== null,
      completedAtSet: order.completedAt !== null,
      updatedAt: order.updatedAt,
    })
  } catch (err) {
    return Response.json({
      found: false,
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 })
  }
}
