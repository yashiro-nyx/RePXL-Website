import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentAdmin } from '@/lib/auth-helpers'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api'

export const dynamic = 'force-dynamic'

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
        details: 'Published all homepage content blocks',
        adminId: admin.id,
        adminName: `${admin.firstName} ${admin.lastName}`,
      },
    })

    const blocks = await prisma.homepageContentBlock.findMany({
      orderBy: { displayOrder: 'asc' },
    })
    return successResponse(blocks)
  } catch (error) {
    console.error('CMS homepage publish error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to publish homepage',
      500
    )
  }
}

