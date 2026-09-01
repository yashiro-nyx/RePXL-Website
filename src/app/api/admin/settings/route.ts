import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentAdmin } from '@/lib/auth-helpers'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/api'
import {
  getSettings,
  updateSettings,
  validateShippingOption,
  SettingsAccessError,
  type PlatformSettings,
} from '@/lib/settings'
import { z } from 'zod'

/**
 * Task 12.6: Admin settings routes
 * GET/PUT /api/admin/settings
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.8, 7.9, 7.10
 */

export const dynamic = 'force-dynamic'

const updateSettingsSchema = z.object({
  currency: z.string().optional(),
  shippingOptions: z.array(z.object({
    name: z.string(),
    cost: z.number(),
  })).optional(),
  paymentOptions: z.array(z.object({
    key: z.string(),
    label: z.string(),
    enabled: z.boolean(),
  })).optional(),
})

// GET /api/admin/settings — Read current platform settings
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const settings = await getSettings()
    return successResponse(settings)
  } catch (error) {
    console.error('Settings read error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch settings',
      500
    )
  }
}

// PUT /api/admin/settings — Update platform settings (Super_Admin only)
export async function PUT(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    // Requirement 7.10: Super_Admin gate
    if (!admin.isSuperAdmin) {
      return forbiddenResponse('Only Super_Admins can modify platform settings')
    }

    const body = await request.json()
    const patch = updateSettingsSchema.parse(body)

    // Validate shipping options
    if (patch.shippingOptions) {
      const current = await getSettings()
      for (const option of patch.shippingOptions) {
        const validation = validateShippingOption(option, current.shippingOptions)
        if (!validation.valid) {
          return errorResponse(
            `Validation failed: ${JSON.stringify(validation.errors)}`,
            400
          )
        }
      }
    }

    // Get current settings before update for logging
    const beforeUpdate = await getSettings()

    // Update settings
    const afterUpdate = await updateSettings(
      {
        ...(patch.currency && { currency: patch.currency }),
        ...(patch.shippingOptions && { shippingOptions: patch.shippingOptions }),
        ...(patch.paymentOptions && { paymentOptions: patch.paymentOptions }),
      },
      admin
    )

    // Record AdminLog with before/after values
    await prisma.adminLog.create({
      data: {
        action: 'SETTINGS_UPDATED',
        details: `Updated platform settings. Before: ${JSON.stringify(beforeUpdate)}. After: ${JSON.stringify(afterUpdate)}`,
        adminId: admin.id,
        adminName: `${admin.firstName} ${admin.lastName}`,
      },
    })

    return successResponse(afterUpdate)
  } catch (error) {
    console.error('Settings update error:', error)

    if (error instanceof SettingsAccessError) {
      return forbiddenResponse(error.message)
    }

    if (error instanceof z.ZodError) {
      return errorResponse(`Validation error: ${error.message}`, 400)
    }

    return errorResponse(
      error instanceof Error ? error.message : 'Failed to update settings',
      500
    )
  }
}
