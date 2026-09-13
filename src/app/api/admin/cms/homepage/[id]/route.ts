import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentAdmin } from '@/lib/auth-helpers'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api'
import { validateHomepageBlock } from '@/lib/cms'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const paramsSchema = z.object({
  id: z.string().min(1, 'Block ID is required'),
})

const patchBlockSchema = z.object({
  type: z.string().min(1).optional(),
  content: z.unknown().optional(),
  displayOrder: z.number().int().optional(),
  isPublished: z.boolean().optional(),
})

// GET /api/admin/cms/homepage/[id] — Fetch a single homepage block
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const { id } = await paramsSchema.parseAsync(await params)
    const block = await prisma.homepageContentBlock.findUnique({ where: { id } })
    if (!block) {
      return errorResponse('Homepage content block not found', 404)
    }

    return successResponse(block)
  } catch (error) {
    console.error('Fetch homepage block error:', error)
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid block ID', 400)
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch homepage block',
      500
    )
  }
}

// PATCH /api/admin/cms/homepage/[id] — Update a homepage block
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
    const patch = patchBlockSchema.parse(body)

    const block = await prisma.homepageContentBlock.findUnique({ where: { id } })
    if (!block) {
      return errorResponse('Homepage content block not found', 404)
    }

    const updated = {
      content: patch.content !== undefined ? patch.content : block.content,
      displayOrder: patch.displayOrder !== undefined ? patch.displayOrder : block.displayOrder,
    }

    const validation = validateHomepageBlock(updated)
    if (!validation.valid) {
      return errorResponse(`Validation failed: ${JSON.stringify(validation.errors)}`, 400)
    }

    const updateData: Record<string, any> = {}
    if (patch.type !== undefined) updateData.type = patch.type
    if (patch.content !== undefined) updateData.content = patch.content ?? {}
    if (patch.displayOrder !== undefined) updateData.displayOrder = patch.displayOrder
    if (patch.isPublished !== undefined) updateData.isPublished = patch.isPublished

    const result = await prisma.homepageContentBlock.update({
      where: { id },
      data: updateData,
    })

    await prisma.adminLog.create({
      data: {
        action: 'HOMEPAGE_BLOCK_UPDATED',
        details: `Updated homepage block: ${id} (${result.type})`,
        adminId: admin.id,
        adminName: `${admin.firstName} ${admin.lastName}`,
      },
    })

    return successResponse(result)
  } catch (error) {
    console.error('Update homepage block error:', error)
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation error: ${error.message}`, 400)
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to update homepage block',
      500
    )
  }
}

// DELETE /api/admin/cms/homepage/[id] — Delete a homepage block
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
    const block = await prisma.homepageContentBlock.findUnique({ where: { id } })
    if (!block) {
      return errorResponse('Homepage content block not found', 404)
    }

    await prisma.homepageContentBlock.delete({ where: { id } })

    await prisma.adminLog.create({
      data: {
        action: 'HOMEPAGE_BLOCK_DELETED',
        details: `Deleted homepage block: ${id} (${block.type})`,
        adminId: admin.id,
        adminName: `${admin.firstName} ${admin.lastName}`,
      },
    })

    return successResponse({ id })
  } catch (error) {
    console.error('Delete homepage block error:', error)
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid block ID', 400)
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to delete homepage block',
      500
    )
  }
}

