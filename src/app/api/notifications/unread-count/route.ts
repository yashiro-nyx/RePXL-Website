import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-helpers'
import { successResponse, unauthorizedResponse } from '@/lib/api'
import { EVENT_CATEGORY_MAP, type NotificationCategory } from '@/lib/notification-templates'

export const dynamic = 'force-dynamic'

/**
 * GET /api/notifications/unread-count
 *
 * Returns the total unread in-app notification count PLUS per-category counts,
 * all derived from a single grouped database query.
 *
 * Used by:
 *   - Navbar bell badge  (uses `count` only)
 *   - AccountShell sidebar  (uses `count` + `byCategory` for per-child badges)
 *
 * Response shape:
 *   { count: number, byCategory: Record<notificationRoute, number> }
 *
 * byCategory keys are the route paths used by the sidebar nav children
 * (/account/notifications/order-updates, /promotions, /repixl-updates) so the
 * sidebar can apply badges directly without a second fetch.
 */

// Route paths matching AccountShell's CATEGORY_META
const CATEGORY_ROUTES: Record<NotificationCategory, string> = {
  ORDER_UPDATES:  '/account/notifications/order-updates',
  PROMOTIONS:     '/account/notifications/promotions',
  REPIXL_UPDATES: '/account/notifications/repixl-updates',
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return unauthorizedResponse()

  // Single grouped query — one round trip instead of a COUNT + a findMany(200)
  const grouped = await prisma.notification.groupBy({
    by: ['event'],
    where: { userId: user.id, channel: 'IN_APP', isRead: false },
    _count: { _all: true },
  })

  let total = 0
  const byCategory: Record<string, number> = {}

  for (const row of grouped) {
    const cat = (EVENT_CATEGORY_MAP as Record<string, NotificationCategory>)[row.event]
    const n = row._count._all
    total += n
    if (cat) {
      const route = CATEGORY_ROUTES[cat]
      byCategory[route] = (byCategory[route] ?? 0) + n
    }
  }

  return successResponse({ count: total, byCategory })
}
