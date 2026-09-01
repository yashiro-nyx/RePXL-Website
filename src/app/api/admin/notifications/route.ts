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

/**
 * Task 12.7: Admin notification-template routes
 * GET /api/admin/notifications (list templates)
 * PATCH /api/admin/notifications/[event] (update template)
 *
 * Requirements: 8.1, 8.2, 8.3, 8.5, 8.9
 */

export const dynamic = 'force-dynamic'

const templateUpdateSchema = z.object({
  subject: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(10000).optional(),
  enabled: z.boolean().optional(),
  channel: z.enum(['IN_APP', 'EMAIL', 'BOTH']).optional(),
})

// GET /api/admin/notifications — List all notification templates
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const templates = await prisma.notificationTemplate.findMany()
    return successResponse(templates)
  } catch (error) {
    console.error('Notification templates list error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch notification templates',
      500
    )
  }
}

// PATCH /api/admin/notifications/[event] — Update a notification template
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ event?: string }> }
) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const { event } = await params
    if (!event) {
      return errorResponse('Event is required', 400)
    }

    // Validate event
    if (!NOTIFICATION_EVENTS.includes(event as NotificationEvent)) {
      return errorResponse(`Invalid notification event: ${event}`, 400)
    }

    const body = await request.json()
    const patch = templateUpdateSchema.parse(body)

    // Fetch existing template
    const template = await prisma.notificationTemplate.findUnique({
      where: { event: event as NotificationEvent },
    })

    if (!template) {
      return errorResponse('Notification template not found', 404)
    }

    // Prepare updated template for validation
    const updated = {
      subject: patch.subject ?? template.subject,
      body: patch.body ?? template.body,
    }

    // Validate template fields
    const validation = validateTemplate(updated)
    if (!validation.valid) {
      return errorResponse(
        `Validation failed: ${validation.errors.map((e) => `${e.field}: ${e.message}`).join('; ')}`,
        400
      )
    }

    // Check for unknown tokens (Requirement 8.5)
    const unknownTokens = findUnknownTokens(updated.body, event as NotificationEvent)
    if (unknownTokens.length > 0) {
      return errorResponse(
        `Unknown placeholder tokens in body: ${unknownTokens.join(', ')}`,
        400
      )
    }

    // Update template
    const result = await prisma.notificationTemplate.update({
      where: { event: event as NotificationEvent },
      data: {
        ...(patch.subject && { subject: patch.subject }),
        ...(patch.body && { body: patch.body }),
        ...(patch.enabled !== undefined && { enabled: patch.enabled }),
        ...(patch.channel && { channel: patch.channel }),
      },
    })

    // Record AdminLog
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
