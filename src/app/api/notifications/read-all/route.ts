import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-helpers'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api'

export const dynamic = 'force-dynamic'

/**
 * POST /api/notifications/read-all
 * Mark all in-app notifications for the authenticated user as read.
 * Only operates on notifications belonging to the session user.
 */
export async function POST() {
  const user = await getCurrentUser()
  if (!user) return unauthorizedResponse()

  try {
    const result = await prisma.notification.updateMany({
      where: { userId: user.id, channel: 'IN_APP', isRead: false },
      data: { isRead: true },
    })
    return successResponse({ updated: result.count })
  } catch (error) {
    console.error('Mark all read error:', error)
    return errorResponse('Internal server error', 500)
  }
}
