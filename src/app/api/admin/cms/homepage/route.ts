import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentAdmin } from '@/lib/auth-helpers'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api'
import {
  validateHomepageBlock,
  sortByUpdatedDesc,
} from '@/lib/cms'
import { z } from 'zod'

/**
 * Task 12.5: Admin CMS homepage routes
 * GET/PATCH /api/admin/cms/homepage
 * POST /api/admin/cms/homepage/publish
 *
 * Requirements: 6.7, 6.8, 6.9, 6.10
 */

export const dynamic = 'force-dynamic'

const blockInputSchema = z.object({
  content: z.unknown(),
  displayOrder: z.number().int(),
})

const patchBlockSchema = z.object({
  content: z.unknown().optional(),
  displayOrder: z.number().int().optional(),
})

// GET /api/admin/cms/homepage — List all homepage content blocks
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const blocks = await prisma.homepageContentBlock.findMany()
    const sorted = sortByUpdatedDesc(blocks)

    return successResponse(sorted)
  } catch (error) {
    console.error('CMS homepage list error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch homepage blocks',
      500
    )
  }
}

// PATCH /api/admin/cms/homepage/[id] — Update a homepage content block
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id?: string }> }
) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const { id } = await params
    if (!id) {
      return errorResponse('Block ID is required', 400)
    }

    const body = await request.json()
    const patch = patchBlockSchema.parse(body)

    // Fetch existing block
    const block = await prisma.homepageContentBlock.findUnique({ where: { id } })
    if (!block) {
      return errorResponse('Block not found', 404)
    }

    // Prepare updated block for validation
    const updated = {
      content: patch.content !== undefined ? patch.content : block.content,
      displayOrder: patch.displayOrder !== undefined ? patch.displayOrder : block.displayOrder,
    }

    // Validate
    const validation = validateHomepageBlock(updated)
    if (!validation.valid) {
      return errorResponse(`Validation failed: ${JSON.stringify(validation.errors)}`, 400)
    }

    // Build update data with proper type casting for JSON field
    const updateData: Record<string, any> = {}
    if (patch.content !== undefined) {
      updateData.content = patch.content ?? {}
    }
    if (patch.displayOrder !== undefined) {
      updateData.displayOrder = patch.displayOrder
    }

    // Update block
    const result = await prisma.homepageContentBlock.update({
      where: { id },
      data: updateData,
    })

    // Record AdminLog
    await prisma.adminLog.create({
      data: {
        action: 'HOMEPAGE_BLOCK_UPDATED',
        details: `Updated homepage content block: ${id}`,
        adminId: admin.id,
        adminName: `${admin.firstName} ${admin.lastName}`,
      },
    })

    return successResponse(result)
  } catch (error) {
    console.error('CMS homepage block update error:', error)
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation error: ${error.message}`, 400)
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to update homepage block',
      500
    )
  }
}

// POST /api/admin/cms/homepage/publish — Publish homepage (mark all blocks as published)
export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    // Mark all blocks as published
    await prisma.homepageContentBlock.updateMany({
      data: { isPublished: true },
    })

    // Record AdminLog
    await prisma.adminLog.create({
      data: {
        action: 'HOMEPAGE_PUBLISHED',
        details: 'Published homepage content',
        adminId: admin.id,
        adminName: `${admin.firstName} ${admin.lastName}`,
      },
    })

    const blocks = await prisma.homepageContentBlock.findMany()
    return successResponse(blocks)
  } catch (error) {
    console.error('CMS homepage publish error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to publish homepage',
      500
    )
  }
}
