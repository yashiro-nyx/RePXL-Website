import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-helpers'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Default preferences for new or missing records — internal, not exported as route field
const DEFAULT_PREFS = {
  emailOrderUpdates:  true,
  emailPromotions:    true,
  emailRepixlUpdates: true,
  inAppOrderUpdates:  true,
  inAppPromotions:    true,
  inAppRepixlUpdates: true,
}

const prefsSchema = z.object({
  emailOrderUpdates:  z.boolean().optional(),
  emailPromotions:    z.boolean().optional(),
  emailRepixlUpdates: z.boolean().optional(),
  inAppOrderUpdates:  z.boolean().optional(),
  inAppPromotions:    z.boolean().optional(),
  inAppRepixlUpdates: z.boolean().optional(),
})

// GET /api/auth/notification-preferences
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()

    // Also migrate promoOptOut → preferences on first load
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { promoOptOut: true, notificationPreference: true },
    })
    if (!dbUser) return unauthorizedResponse()

    let prefs = dbUser.notificationPreference

    // If no pref record yet, create one (defaulting promoOptOut→emailPromotions)
    if (!prefs) {
      prefs = await prisma.userNotificationPreference.create({
        data: {
          userId: user.id,
          emailOrderUpdates:  DEFAULT_PREFS.emailOrderUpdates,
          // Migrate existing promoOptOut: if they previously opted out, default off
          emailPromotions:    !dbUser.promoOptOut,
          emailRepixlUpdates: DEFAULT_PREFS.emailRepixlUpdates,
          inAppOrderUpdates:  DEFAULT_PREFS.inAppOrderUpdates,
          inAppPromotions:    !dbUser.promoOptOut,
          inAppRepixlUpdates: DEFAULT_PREFS.inAppRepixlUpdates,
        },
      })
    }

    return successResponse({
      emailOrderUpdates:  prefs.emailOrderUpdates,
      emailPromotions:    prefs.emailPromotions,
      emailRepixlUpdates: prefs.emailRepixlUpdates,
      inAppOrderUpdates:  prefs.inAppOrderUpdates,
      inAppPromotions:    prefs.inAppPromotions,
      inAppRepixlUpdates: prefs.inAppRepixlUpdates,
    })
  } catch (error) {
    console.error('Get notification preferences error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// PUT /api/auth/notification-preferences
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()

    const body = await request.json()
    const parsed = prefsSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('Invalid preference data', 400)
    }

    const data = parsed.data

    const prefs = await prisma.userNotificationPreference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        ...DEFAULT_PREFS,
        ...data,
      },
      update: data,
    })

    // Keep promoOptOut in sync for backward compatibility with existing emitNotification logic
    if (data.emailPromotions !== undefined || data.inAppPromotions !== undefined) {
      const optOut = !(data.emailPromotions ?? prefs.emailPromotions) &&
                     !(data.inAppPromotions ?? prefs.inAppPromotions)
      await prisma.user.update({
        where: { id: user.id },
        data: { promoOptOut: optOut },
      })
    }

    return successResponse({
      emailOrderUpdates:  prefs.emailOrderUpdates,
      emailPromotions:    prefs.emailPromotions,
      emailRepixlUpdates: prefs.emailRepixlUpdates,
      inAppOrderUpdates:  prefs.inAppOrderUpdates,
      inAppPromotions:    prefs.inAppPromotions,
      inAppRepixlUpdates: prefs.inAppRepixlUpdates,
    })
  } catch (error) {
    console.error('Update notification preferences error:', error)
    return errorResponse('Internal server error', 500)
  }
}
