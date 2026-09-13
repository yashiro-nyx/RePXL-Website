import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentAdmin } from '@/lib/auth-helpers'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api'
import {
  validateTemplate,
  findUnknownTokens,
  NOTIFICATION_EVENTS,
  type NotificationEvent,
} from '@/lib/notification-templates'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const templateUpdateSchema = z.object({
  subject: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(10000).optional(),
  enabled: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  channel: z.enum(['IN_APP', 'EMAIL', 'BOTH']).optional(),
})

// GET /api/admin/notifications/[event] — Fetch a notification template by event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ event: string }> }
) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const { event } = await params
    if (!NOTIFICATION_EVENTS.includes(event as NotificationEvent)) {
      return errorResponse(`Invalid notification event: ${event}`, 400)
    }

    const template = await prisma.notificationTemplate.findUnique({
      where: { event: event as NotificationEvent },
    })

    if (!template) {
      return errorResponse('Notification template not found', 404)
    }

    return successResponse(template)
  } catch (error) {
    console.error('Fetch notification template error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch notification template',
      500
    )
  }
}

// PATCH /api/admin/notifications/[event] — Update a notification template
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ event: string }> }
) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const { event } = await params
    if (!NOTIFICATION_EVENTS.includes(event as NotificationEvent)) {
      return errorResponse(`Invalid notification event: ${event}`, 400)
    }

    const body = await request.json()
    const patch = templateUpdateSchema.parse(body)

    const template = await prisma.notificationTemplate.findUnique({
      where: { event: event as NotificationEvent },
    })

    if (!template) {
      return errorResponse('Notification template not found', 404)
    }

    const updated = {
      subject: patch.subject ?? template.subject,
      body: patch.body ?? template.body,
    }

    const validation = validateTemplate(updated)
    if (!validation.valid) {
      return errorResponse(
        `Validation failed: ${validation.errors.map((e) => `${e.field}: ${e.message}`).join('; ')}`,
        400
      )
    }

    const unknownTokens = findUnknownTokens(updated.body, event as NotificationEvent)
    if (unknownTokens.length > 0) {
      return errorResponse(
        `Unknown placeholder tokens in body: ${unknownTokens.join(', ')}`,
        400
      )
    }

    const activeState = patch.isEnabled ?? patch.enabled

    const result = await prisma.notificationTemplate.update({
      where: { event: event as NotificationEvent },
      data: {
        ...(patch.subject && { subject: patch.subject }),
        ...(patch.body && { body: patch.body }),
        ...(activeState !== undefined && { isEnabled: activeState }),
        ...(patch.channel && { channel: patch.channel }),
      },
    })

    await prisma.adminLog.create({
      data: {
        action: 'NOTIFICATION_TEMPLATE_UPDATED',
        details: `Updated notification template for event: ${event}`,
        adminId: admin.id,
        adminName: `${admin.firstName} ${admin.lastName}`,
      },
    })

    return successResponse(result)
  } catch (error) {
    console.error('Notification template update error:', error)
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation error: ${error.message}`, 400)
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to update notification template',
      500
    )
  }
}

