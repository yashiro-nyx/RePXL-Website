import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentAdmin } from '@/lib/auth-helpers'
import { successResponse, errorResponse } from '@/lib/api'
import { isPageVisibleTo } from '@/lib/cms'

export const dynamic = 'force-dynamic'

// GET /api/pages/[slug] — Public static page reader
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const page = await prisma.staticPage.findUnique({
      where: { slug: slug.toLowerCase() },
    })

    if (!page) {
      return errorResponse('Page not found', 404)
    }

    const admin = await getCurrentAdmin()
    const isVisible = isPageVisibleTo(page.status, !!admin)

    if (!isVisible) {
      return errorResponse('Page not found', 404)
    }

    return successResponse(page)
  } catch (error) {
    console.error('Fetch static page error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch static page',
      500
    )
  }
}

