import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api'

export const dynamic = 'force-dynamic'

// GET /api/cms/homepage — Public published homepage content blocks
export async function GET(request: NextRequest) {
  try {
    const blocks = await prisma.homepageContentBlock.findMany({
      where: { isPublished: true },
      orderBy: { displayOrder: 'asc' },
    })

    return successResponse(blocks)
  } catch (error) {
    console.error('Public homepage blocks error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch homepage content',
      500
    )
  }
}

