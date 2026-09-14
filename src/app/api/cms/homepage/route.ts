import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api'

export const dynamic = 'force-dynamic'

// GET /api/cms/homepage — Public published homepage content blocks
export async function GET(request: NextRequest) {
  try {
    let blocks = await prisma.homepageContentBlock.findMany({
      where: { isPublished: true },
      orderBy: { displayOrder: 'asc' },
    })

    if (blocks.length === 0) {
      const totalCount = await prisma.homepageContentBlock.count()
      if (totalCount === 0) {
        const { DEFAULT_HOMEPAGE_BLOCKS } = await import('@/lib/cms-defaults')
        for (const block of DEFAULT_HOMEPAGE_BLOCKS) {
          await prisma.homepageContentBlock.create({ data: block })
        }
        blocks = await prisma.homepageContentBlock.findMany({
          where: { isPublished: true },
          orderBy: { displayOrder: 'asc' },
        })
      }
    }

    return successResponse(blocks)
  } catch (error) {
    console.error('Public homepage blocks error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch homepage content',
      500
    )
  }
}

