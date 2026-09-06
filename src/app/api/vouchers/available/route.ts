import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-helpers'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api'

export const dynamic = 'force-dynamic'

/**
 * GET /api/vouchers/available
 * Returns currently active, date-valid vouchers visible to authenticated customers.
 * Exposes only customer-safe fields — no internal IDs, usage counters beyond
 * what's needed for display, or admin-only fields.
 *
 * Note: RePIXL vouchers are global promo codes, not customer-owned. This endpoint
 * shows "what codes can I use right now?" — not a personal voucher wallet.
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()

    const now = new Date()

    const vouchers = await prisma.voucher.findMany({
      where: {
        status: 'ACTIVE',
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
      orderBy: { validUntil: 'asc' },
      select: {
        code:          true,
        discountType:  true,
        discountValue: true,
        minPurchase:   true,
        maxDiscount:   true,
        validUntil:    true,
        description:   true,
        // Include usage info to filter unlimited vs limited in JS (avoids raw SQL)
        usageLimit:    true,
        used:          true,
      },
    })

    // Filter out fully-used vouchers (usageLimit 0 = unlimited)
    const available = vouchers
      .filter((v) => v.usageLimit === 0 || v.used < v.usageLimit)
      .map(({ usageLimit: _ul, used: _u, ...safe }) => safe)

    return successResponse(available)
  } catch (error) {
    console.error('Available vouchers error:', error)
    return errorResponse('Internal server error', 500)
  }
}
