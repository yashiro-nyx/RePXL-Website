import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-helpers'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  parsePagination,
  paginatedResponse,
} from '@/lib/api'
import { z } from 'zod'

/**
 * Task 13: Customer notifications API
 * GET /api/notifications
 * PATCH /api/notifications/[id]
 *
 * Requirements: 8.6, 8.7
 */

export const dynamic = 'force-dynamic'

const notificationIdSchema = z.object({
  id: z.string().cuid('Invalid notification ID'),
})

const markReadSchema = z.object({
  isRead: z.boolean(),
})

// GET /api/notifications — List customer's in-app notifications
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse('Authentication required')
    }

    const url = new URL(request.url)
    const pagination = parsePagination(url.searchParams)
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true'

    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.id,
        channel: 'IN_APP',
        ...(unreadOnly && { isRead: false }),
      },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      orderBy: { createdAt: 'desc' },
    })

    const total = await prisma.notification.count({
      where: {
        userId: user.id,
        channel: 'IN_APP',
        ...(unreadOnly && { isRead: false }),
      },
    })

    return paginatedResponse(notifications, total, pagination)
  } catch (error) {
    console.error('Notifications list error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch notifications',
      500
    )
  }
}

// PATCH /api/notifications/[id] — Mark notification as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id?: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse('Authentication required')
    }

    const { id } = await params
    if (!id) {
      return errorResponse('Notification ID is required', 400)
    }

    const body = await request.json()
    const { isRead } = markReadSchema.parse(body)

    // Verify notification belongs to customer
    const notification = await prisma.notification.findUnique({
      where: { id },
    })

    if (!notification || notification.userId !== user.id) {
      return errorResponse('Notification not found', 404)
    }

    // Update notification
    const result = await prisma.notification.update({
      where: { id },
      data: { isRead },
    })
    return successResponse(result)
  } catch (error) {
    console.error('Notification update error:', error)
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation error: ${error.message}`, 400)
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to update notification',
      500
    )
  }
}
