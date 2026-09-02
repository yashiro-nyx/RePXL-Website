import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/diagnostics/database
 *
 * TEMPORARY diagnostic endpoint — returns only safe metadata.
 * Never returns connection strings, passwords, or secrets.
 * Remove after production verification is complete.
 */
export async function GET(request: NextRequest) {
  const results: Record<string, unknown> = {}

  // 1. Verify DB connection + identify database name and user (no secrets)
  try {
    const meta = await prisma.$queryRaw<{ db: string; usr: string }[]>`
      SELECT current_database() AS db, current_user AS usr
    `
    results.connection = 'PASS'
    results.database = meta[0]?.db ?? 'unknown'
    results.user = meta[0]?.usr ?? 'unknown'
  } catch (err) {
    results.connection = 'FAIL'
    results.connectionError = err instanceof Error ? err.message : String(err)
  }

  // 2. Verify orders table exists and has the tracking migration columns
  try {
    const cols = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'orders'
        AND column_name IN (
          'tracking_number', 'delivery_status',
          'tracking_description', 'tracking_progress',
          'delivered_at', 'completed_at'
        )
      ORDER BY column_name
    `
    const found = cols.map((c) => c.column_name)
    const required = [
      'completed_at', 'delivered_at', 'delivery_status',
      'tracking_description', 'tracking_number', 'tracking_progress',
    ]
    const missing = required.filter((c) => !found.includes(c))
    results.trackingColumns = missing.length === 0 ? 'PASS' : `MISSING: ${missing.join(', ')}`
    results.trackingColumnsFound = found
  } catch (err) {
    results.trackingColumns = 'FAIL'
    results.trackingColumnsError = err instanceof Error ? err.message : String(err)
  }

  // 3. Verify the specific test order exists
  const TEST_ORDER = 'RPX-MTKBXXI0LP7W'
  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber: TEST_ORDER },
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
      results.testOrder = 'NOT_FOUND'
    } else {
      results.testOrder = 'FOUND'
      results.testOrderData = {
        orderNumber: order.orderNumber,
        status: order.status,
        deliveryStatus: order.deliveryStatus,
        trackingProgress: order.trackingProgress,
        trackingDescription: order.trackingDescription,
        // Show whether trackingNumber is populated (not the value itself if it's sensitive)
        trackingNumberSet: !!order.trackingNumber && order.trackingNumber !== '',
        deliveredAtSet: order.deliveredAt !== null,
        completedAtSet: order.completedAt !== null,
        updatedAt: order.updatedAt,
      }
    }
  } catch (err) {
    results.testOrder = 'FAIL'
    results.testOrderError = err instanceof Error ? err.message : String(err)
  }

  // 4. Count total orders in DB (proves the app is talking to the right DB)
  try {
    const count = await prisma.order.count()
    results.totalOrders = count
  } catch (err) {
    results.totalOrders = 'FAIL'
    results.totalOrdersError = err instanceof Error ? err.message : String(err)
  }

  // 5. Verify admin user exists (by role, no credentials exposed)
  try {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN', isArchived: false } })
    results.adminUsersExist = adminCount > 0 ? `PASS (${adminCount} admin(s))` : 'FAIL — no admin users in DB'
  } catch (err) {
    results.adminUsersExist = 'FAIL'
    results.adminUsersError = err instanceof Error ? err.message : String(err)
  }

  return Response.json(results, { status: 200 })
}
