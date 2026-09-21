import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentAdmin } from '@/lib/auth-helpers'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api'
import { emitNotification } from '@/lib/notifications'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const broadcastSchema = z.object({
  event: z.enum(['PROMOTION', 'REPIXL_UPDATE']),
  subject: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(10000).optional(),
  channel: z.enum(['IN_APP', 'EMAIL', 'BOTH']).optional(),
})

// POST /api/admin/notifications/broadcast
// Broadcast an announcement or promotional notification to all active customers.
// Emits through emitNotification, honoring customer preferences & template settings.
export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const json = await request.json()
    const parsed = broadcastSchema.safeParse(json)
    if (!parsed.success) {
      return errorResponse(
        `Validation error: ${parsed.error.errors.map((e) => e.message).join(', ')}`,
        400
      )
    }

    const { event, subject, body, channel } = parsed.data

    // Fetch active customers
    const customers = await prisma.user.findMany({
      where: {
        role: 'CUSTOMER',
        isArchived: false,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    })

    let inAppCreated = 0
    let emailsSent = 0
    let suppressed = 0

    for (const customer of customers) {
      try {
        const customerName = `${customer.firstName} ${customer.lastName}`.trim() || customer.email
        const res = await emitNotification({
          userId: customer.id,
          event,
          subject: subject || '',
          body: body || '',
          channel: channel || 'BOTH',
          recipientEmail: customer.email,
          context: {
            customerName,
          },
        })

        if (res.notificationId) inAppCreated++
        if (res.emailDelivered) emailsSent++
        if (!res.notificationId && !res.emailDelivered) suppressed++
      } catch (err) {
        console.error(`Error emitting broadcast to user ${customer.id}:`, err)
        suppressed++
      }
    }

    // Log admin action
    await prisma.adminLog.create({
      data: {
        action: 'NOTIFICATION_BROADCAST',
        details: `Broadcasted ${event} to ${customers.length} customer(s). In-app created: ${inAppCreated}, emails delivered: ${emailsSent}, suppressed/opted-out: ${suppressed}`,
        adminId: admin.id,
        adminName: `${admin.firstName} ${admin.lastName}`,
      },
    })

    return successResponse({
      event,
      targeted: customers.length,
      inAppCreated,
      emailsSent,
      suppressed,
    })
  } catch (error) {
    console.error('Broadcast notification error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to broadcast notifications',
      500
    )
  }
}

