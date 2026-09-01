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
  sortByUpdatedDesc,
  isValidPlacement,
} from '@/lib/cms'
import { z } from 'zod'

/**
 * Task 12.4: Admin CMS banner routes
 * GET/POST /api/admin/cms/banners
 * PATCH/DELETE /api/admin/cms/banners/[id]
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.10
 */

export const dynamic = 'force-dynamic'

const bannerInputSchema = z.object({
  title: z.string().min(1).max(120),
  imageRef: z.string().min(1),
  placement: z.string(),
  linkTarget: z.string().url(),
  isActive: z.boolean().default(true),
  startDate: z.string().datetime().nullable().default(null),
  endDate: z.string().datetime().nullable().default(null),
})

// GET /api/admin/cms/banners — List all banners (ordered by updatedAt desc)
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const banners = await prisma.banner.findMany()
    const sorted = sortByUpdatedDesc(banners)

    return successResponse(sorted)
  } catch (error) {
    console.error('CMS banners list error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch banners',
      500
    )
  }
}

// POST /api/admin/cms/banners — Create a new banner
export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const body = await request.json()
    const input = bannerInputSchema.parse(body)

    // Validate banner fields
    const validation = validateBanner({
      title: input.title,
      imageRef: input.imageRef,
      placement: input.placement,
      linkTarget: input.linkTarget,
    })

    if (!validation.valid) {
      return errorResponse(`Validation failed: ${JSON.stringify(validation.errors)}`, 400)
    }

    // Validate placement is a valid enum
    if (!isValidPlacement(input.placement)) {
      return errorResponse('Invalid placement value', 400)
    }

    // Validate schedule
    const startDate = input.startDate ? new Date(input.startDate) : null
    const endDate = input.endDate ? new Date(input.endDate) : null

    if (!validateSchedule(startDate, endDate)) {
      return errorResponse('Start date must be before end date', 400)
    }

    // Create banner
    const banner = await prisma.banner.create({
      data: {
        title: input.title,
        imageRef: input.imageRef,
        placement: input.placement as BannerPlacement, // Validated by isValidPlacement above
        linkTarget: input.linkTarget,
        isActive: input.isActive,
        startDate,
        endDate,
      },
    })

    // Record AdminLog
    await prisma.adminLog.create({
      data: {
        action: 'BANNER_CREATED',
        details: `Created banner: ${input.title}`,
        adminId: admin.id,
        adminName: `${admin.firstName} ${admin.lastName}`,
      },
    })

    return successResponse(banner, 201)
  } catch (error) {
    console.error('CMS banner creation error:', error)
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation error: ${error.message}`, 400)
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to create banner',
      500
    )
  }
}
