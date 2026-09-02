import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentAdmin } from '@/lib/auth-helpers'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api'

/**
 * POST /api/admin/update-tracking
 *
 * Authenticated admin endpoint: updates an order's delivery tracking fields
 * directly in the database. No internal HTTP round-trip.
 *
 * Body: { orderNumber: string, step: "transit" | "out_for_delivery" | "delivered" }
 *
 * Returns: { success, status, progress, description }
 */
export const dynamic = 'force-dynamic'

const STEP_MAP = {
  transit: {
    deliveryStatus: 'In Transit',
    trackingProgress: 50,
    trackingDescription: 'Your camera has left the warehouse and is on its way to you.',
    orderStatus: 'SHIPPED' as const,
  },
  out_for_delivery: {
    deliveryStatus: 'Out for Delivery',
    trackingProgress: 75,
    trackingDescription: 'Your package is out for delivery and will arrive today.',
    orderStatus: 'SHIPPED' as const,
  },
  delivered: {
    deliveryStatus: 'Delivered',
    trackingProgress: 100,
    trackingDescription: 'Your camera has been delivered. Enjoy your new camera!',
    orderStatus: 'DELIVERED' as const,
  },
} as const

type Step = keyof typeof STEP_MAP

export async function POST(request: NextRequest) {
  // ── Admin auth guard ──────────────────────────────────────────────────────
  const admin = await getCurrentAdmin()
  if (!admin) {
    console.warn('[update-tracking] Unauthorized attempt')
    return unauthorizedResponse()
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: { orderNumber?: string; step?: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  const { orderNumber, step } = body

  if (!orderNumber || typeof orderNumber !== 'string' || !orderNumber.trim()) {
    return errorResponse('orderNumber is required', 400)
  }

  if (!step || !(step in STEP_MAP)) {
    return errorResponse(
      'step must be one of: "transit", "out_for_delivery", "delivered"',
      400
    )
  }

  const tracking = STEP_MAP[step as Step]

  console.log(`[update-tracking] Admin ${admin.email} → ${orderNumber} → ${step}`)

  // ── Database update ───────────────────────────────────────────────────────
  let updated
  try {
    updated = await prisma.order.updateMany({
      where: { orderNumber: orderNumber.trim() },
      data: {
        // Use the orderNumber as the tracking number so the SSE stream
        // (which queries by tracking_number) can find this order.
        trackingNumber: orderNumber.trim(),
        deliveryStatus: tracking.deliveryStatus,
        trackingProgress: tracking.trackingProgress,
        trackingDescription: tracking.trackingDescription,
        status: tracking.orderStatus,
        updatedAt: new Date(),
        ...(step === 'delivered' ? { deliveredAt: new Date() } : {}),
      },
    })
  } catch (dbErr) {
    const msg = dbErr instanceof Error ? dbErr.message : String(dbErr)
    console.error('[update-tracking] Database error:', msg)

    // If the column doesn't exist (migration not yet applied) give a clear message
    if (msg.includes('trackingNumber') || msg.includes('deliveryStatus') || msg.includes('trackingProgress')) {
      return errorResponse(
        'Tracking fields are missing from the database. The tracking migration may not have been applied yet.',
        503
      )
    }

    return errorResponse('Database update failed', 500)
  }

  if (updated.count === 0) {
    return errorResponse(`Order not found: ${orderNumber}`, 404)
  }

  console.log(`[update-tracking] ✓ ${orderNumber} → ${tracking.deliveryStatus} (${tracking.trackingProgress}%)`)

  return successResponse({
    orderNumber,
    step,
    deliveryStatus: tracking.deliveryStatus,
    trackingProgress: tracking.trackingProgress,
    trackingDescription: tracking.trackingDescription,
    orderStatus: tracking.orderStatus,
  })
}
