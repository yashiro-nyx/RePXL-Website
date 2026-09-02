import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/webhooks/shipping
// Receives shipping carrier status updates and persists them to the orders table.
// Payload: { tracking_number, status_code: "IT" | "OD" | "DE", status_description }
export const dynamic = 'force-dynamic'

interface ShippingPayload {
  tracking_number: string
  status_code: 'IT' | 'OD' | 'DE'
  status_description: string
}

const STATUS_MAP: Record<string, { status: string; progress: number }> = {
  IT: { status: 'In Transit',       progress: 50 },
  OD: { status: 'Out for Delivery', progress: 75 },
  DE: { status: 'Delivered',        progress: 100 },
}

export async function POST(request: NextRequest) {
  let body: ShippingPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const { tracking_number, status_code, status_description } = body

  if (!tracking_number || !status_code || !STATUS_MAP[status_code]) {
    return NextResponse.json(
      { success: false, error: 'Missing or invalid fields. Required: tracking_number, status_code (IT|OD|DE).' },
      { status: 400 }
    )
  }

  const { status, progress } = STATUS_MAP[status_code]

  const updated = await prisma.order.updateMany({
    where: { trackingNumber: tracking_number },
    data: {
      deliveryStatus: status,
      trackingDescription: status_description || status,
      trackingProgress: progress,
      updatedAt: new Date(),
      // Flip the Prisma OrderStatus enum when delivered
      ...(status_code === 'DE'
        ? { status: 'DELIVERED', deliveredAt: new Date() }
        : status_code === 'OD'
          ? { status: 'SHIPPED' }
          : {}),
    },
  })

  if (updated.count === 0) {
    return NextResponse.json(
      { success: false, error: `No order found with tracking number: ${tracking_number}` },
      { status: 404 }
    )
  }

  console.log(`[shipping webhook] ${tracking_number} → ${status} (${progress}%)`)
  return NextResponse.json({ success: true, status, progress })
}
