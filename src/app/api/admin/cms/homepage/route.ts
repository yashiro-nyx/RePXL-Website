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

export const dynamic = 'force-dynamic'

const createBlockSchema = z.object({
  type: z.string().min(1).default('editorial'),
  content: z.unknown(),
  displayOrder: z.number().int(),
  isPublished: z.boolean().default(false),
})

const patchBodySchema = z.object({
  id: z.string().optional(),
  type: z.string().min(1).optional(),
  content: z.unknown().optional(),
  displayOrder: z.number().int().optional(),
  isPublished: z.boolean().optional(),
})

// GET /api/admin/cms/homepage — List all homepage content blocks
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const blocks = await prisma.homepageContentBlock.findMany({
      orderBy: { displayOrder: 'asc' },
    })

    return successResponse(blocks)
  } catch (error) {
    console.error('CMS homepage list error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch homepage blocks',
      500
    )
  }
}

// POST /api/admin/cms/homepage — Create a new homepage content block
export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const body = await request.json()
    const input = createBlockSchema.parse(body)

    const validation = validateHomepageBlock({
      content: input.content,
      displayOrder: input.displayOrder,
    })

    if (!validation.valid) {
      return errorResponse(`Validation failed: ${JSON.stringify(validation.errors)}`, 400)
    }

    const block = await prisma.homepageContentBlock.create({
      data: {
        type: input.type,
        content: input.content as any,
        displayOrder: input.displayOrder,
        isPublished: input.isPublished,
      },
    })

    await prisma.adminLog.create({
      data: {
        action: 'HOMEPAGE_BLOCK_CREATED',
        details: `Created homepage block: ${block.id} (${block.type})`,
        adminId: admin.id,
        adminName: `${admin.firstName} ${admin.lastName}`,
      },
    })

    return successResponse(block, 201)
  } catch (error) {
    console.error('CMS homepage create error:', error)
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation error: ${error.message}`, 400)
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to create homepage block',
      500
    )
  }
}

// PATCH /api/admin/cms/homepage — Update a homepage content block (supports id in query or body)
export async function PATCH(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const { searchParams } = new URL(request.url)
    const queryId = searchParams.get('id')

    const body = await request.json()
    const patch = patchBodySchema.parse(body)
    const id = queryId || patch.id

    if (!id) {
      return errorResponse('Block ID is required', 400)
    }

    const block = await prisma.homepageContentBlock.findUnique({ where: { id } })
    if (!block) {
      return errorResponse('Block not found', 404)
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
