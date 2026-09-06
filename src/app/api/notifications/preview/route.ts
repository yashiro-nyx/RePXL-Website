import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-helpers'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api'

export const dynamic = 'force-dynamic'

/**
 * GET /api/notifications/preview
 *
 * Returns the latest few in-app notifications for the authenticated customer.
 * Used by the navbar bell dropdown — avoids loading the full notification history.
 *
 * Query params:
 *   limit  — capped server-side at MAX_PREVIEW (10). Defaults to 5.
 *
 * Security:
 *   - Requires authenticated session; userId derived server-side only.
 *   - Client cannot supply a userId.
 *   - Only returns IN_APP channel notifications belonging to the session user.
 */

const MAX_PREVIEW = 10
const DEFAULT_LIMIT = 5

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return unauthorizedResponse()

  const { searchParams } = new URL(request.url)
  const rawLimit = parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10)
  // Hard-cap: never more than MAX_PREVIEW regardless of what the client requests
  const limit = Math.min(isNaN(rawLimit) || rawLimit < 1 ? DEFAULT_LIMIT : rawLimit, MAX_PREVIEW)

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.id,   // userId always from session — never from client
        channel: 'IN_APP',
      },
      orderBy: { createdAt: 'desc' }, // newest first
      take: limit,
      select: {
        id:        true,
        event:     true,
        message:   true,
        isRead:    true,
        createdAt: true,
      },
    })

    return successResponse({ notifications, limit })
  } catch (error) {
    console.error('Notification preview error:', error)
    return errorResponse('Internal server error', 500)
  }
}
