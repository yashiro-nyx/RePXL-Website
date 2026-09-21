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
    let page = await prisma.staticPage.findUnique({
      where: { slug: slug.toLowerCase() },
    })

    if (!page) {
      const totalCount = await prisma.staticPage.count()
      if (totalCount === 0) {
        const { DEFAULT_STATIC_PAGES } = await import('@/lib/cms-defaults')
        for (const p of DEFAULT_STATIC_PAGES) {
          await prisma.staticPage.create({ data: p })
        }
        page = await prisma.staticPage.findUnique({
          where: { slug: slug.toLowerCase() },
        })
      } else {
        const { DEFAULT_STATIC_PAGES } = await import('@/lib/cms-defaults')
        const defaultPage = DEFAULT_STATIC_PAGES.find(
          (p) => p.slug.toLowerCase() === slug.toLowerCase()
        )
        if (defaultPage) {
          page = await prisma.staticPage.create({ data: defaultPage })
        }
      }
    }

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

