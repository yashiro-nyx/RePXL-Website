import { NextRequest } from 'next/server'
import { BannerPlacement } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCurrentAdmin } from '@/lib/auth-helpers'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api'
import {
  validateBanner,
  validateSchedule,
  isValidPlacement,
} from '@/lib/cms'
import { z } from 'zod'

/**
 * Task 12.4: Admin CMS banner detail routes
 * PATCH/DELETE /api/admin/cms/banners/[id]
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.10
 */

export const dynamic = 'force-dynamic'

const paramsSchema = z.object({
  id: z.string().cuid('Invalid banner ID'),
})

const patchBannerSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  imageRef: z.string().min(1).optional(),
  placement: z.string().optional(),
  linkTarget: z.string().url().optional(),
  isActive: z.boolean().optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
})

// PATCH /api/admin/cms/banners/[id] — Update a banner
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const { id } = await paramsSchema.parseAsync(await params)
    const body = await request.json()
    const patch = patchBannerSchema.parse(body)

    // Fetch existing banner
    const banner = await prisma.banner.findUnique({ where: { id } })
    if (!banner) {
      return errorResponse('Banner not found', 404)
    }

    // Prepare updated banner for validation
    const updated = {
      title: patch.title ?? banner.title,
      imageRef: patch.imageRef ?? banner.imageRef,
      placement: patch.placement ?? banner.placement,
      linkTarget: patch.linkTarget ?? banner.linkTarget,
    }

    // Validate banner fields
    const validation = validateBanner(updated)
    if (!validation.valid) {
      return errorResponse(`Validation failed: ${JSON.stringify(validation.errors)}`, 400)
    }

    // Validate placement if provided
    if (patch.placement && !isValidPlacement(patch.placement)) {
      return errorResponse('Invalid placement value', 400)
    }

    // Validate schedule
    const startDate =
      patch.startDate !== undefined
        ? patch.startDate
          ? new Date(patch.startDate)
          : null
        : banner.startDate
    const endDate =
      patch.endDate !== undefined
        ? patch.endDate
          ? new Date(patch.endDate)
          : null
        : banner.endDate

    if (!validateSchedule(startDate, endDate)) {
      return errorResponse('Start date must be before end date', 400)
    }

    // Build update data object
    const updateData: Record<string, any> = {}
    if (patch.title) updateData.title = patch.title
    if (patch.imageRef) updateData.imageRef = patch.imageRef
    if (patch.placement) updateData.placement = patch.placement as BannerPlacement
    if (patch.linkTarget) updateData.linkTarget = patch.linkTarget
    if (patch.isActive !== undefined) updateData.isActive = patch.isActive
    if (patch.startDate !== undefined) updateData.startDate = startDate
    if (patch.endDate !== undefined) updateData.endDate = endDate

    // Update banner
    const result = await prisma.banner.update({
      where: { id },
      data: updateData,
    })

    // Record AdminLog
    await prisma.adminLog.create({
      data: {
        action: 'BANNER_UPDATED',
        details: `Updated banner: ${banner.title}`,
        adminId: admin.id,
        adminName: `${admin.firstName} ${admin.lastName}`,
      },
    })

    return successResponse(result)
  } catch (error) {
    console.error('CMS banner update error:', error)
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation error: ${error.message}`, 400)
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to update banner',
      500
    )
  }
}

// DELETE /api/admin/cms/banners/[id] — Delete a banner
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const { id } = await paramsSchema.parseAsync(await params)

    const banner = await prisma.banner.findUnique({ where: { id } })
    if (!banner) {
      return errorResponse('Banner not found', 404)
    }

    // Delete banner
    await prisma.banner.delete({ where: { id } })

    // Record AdminLog
    await prisma.adminLog.create({
      data: {
        action: 'BANNER_DELETED',
        details: `Deleted banner: ${banner.title}`,
        adminId: admin.id,
        adminName: `${admin.firstName} ${admin.lastName}`,
      },
    })

    return successResponse({ id })
  } catch (error) {
    console.error('CMS banner deletion error:', error)
    if (error instanceof z.ZodError) {
      return errorResponse(`Invalid banner ID`, 400)
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to delete banner',
      500
    )
  }
}
