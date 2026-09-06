import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-helpers'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/notifications/[id]/read
 * Mark a single notification as read.
 * Only the authenticated owner may mark their own notifications.
 */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return unauthorizedResponse()

  const { id } = await params

  const notification = await prisma.notification.findUnique({
    where: { id },
    select: { id: true, userId: true, isRead: true },
  })

  if (!notification) return errorResponse('Notification not found', 404)

  // Ownership check — never allow modifying another user's notification
  if (notification.userId !== user.id) return errorResponse('Notification not found', 404)

  if (notification.isRead) {
    // Already read — idempotent success
    return successResponse({ id, isRead: true })
  }

  await prisma.notification.update({ where: { id }, data: { isRead: true } })
  return successResponse({ id, isRead: true })
}
