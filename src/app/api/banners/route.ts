import { NextRequest } from 'next/server'
import { BannerPlacement } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api'
import { isBannerVisible, isValidPlacement } from '@/lib/cms'

export const dynamic = 'force-dynamic'

// GET /api/banners — Public list of active banners (filtered by schedule & optional placement)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const placement = searchParams.get('placement')

    const where: {
      isActive: boolean
      placement?: BannerPlacement
    } = {
      isActive: true,
    }

    if (placement && isValidPlacement(placement)) {
      where.placement = placement as BannerPlacement
    }

    let banners = await prisma.banner.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    })

    if (banners.length === 0) {
      const totalCount = await prisma.banner.count()
      if (totalCount === 0) {
        const { DEFAULT_LANDING_BANNERS } = await import('@/lib/cms-defaults')
        for (const b of DEFAULT_LANDING_BANNERS) {
          await prisma.banner.create({ data: b })
        }
        banners = await prisma.banner.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
        })
      }
    }

    const now = new Date()
    const activeBanners = banners.filter((b) => isBannerVisible(b, now))

    return successResponse(activeBanners)
  } catch (error) {
    console.error('Public banners error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch banners',
      500
    )
  }
}

