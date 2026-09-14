import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as getBanners } from './route'
import { GET as getCmsHomepage } from '../cms/homepage/route'
import { GET as getStaticPage } from '../pages/[slug]/route'
import { prisma } from '@/lib/prisma'
import * as authHelpers from '@/lib/auth-helpers'

vi.mock('@/lib/auth-helpers', () => ({
  getCurrentUser: vi.fn(),
  getCurrentAdmin: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    banner: {
      findMany: vi.fn(),
      count: vi.fn().mockResolvedValue(1),
      create: vi.fn().mockResolvedValue({}),
    },
    homepageContentBlock: {
      findMany: vi.fn(),
      count: vi.fn().mockResolvedValue(1),
      create: vi.fn().mockResolvedValue({}),
    },
    staticPage: {
      findUnique: vi.fn(),
    },
  },
}))

describe('Public Banners & CMS Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authHelpers.getCurrentAdmin).mockResolvedValue(null)
  })

  describe('GET /api/banners', () => {
    it('returns active scheduled banners and filters out expired ones', async () => {
      const now = new Date()
      const past = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const future = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      vi.mocked(prisma.banner.findMany).mockResolvedValue([
        {
          id: 'b1',
          title: 'Active Deal Banner',
          imageRef: '/images/editorial-2.svg',
          placement: 'HOMEPAGE_STRIP',
          linkTarget: 'https://repxl.com/products',
          isActive: true,
          startDate: past,
          endDate: future,
          createdAt: past,
          updatedAt: now,
        },
        {
          id: 'b2',
          title: 'Expired Banner',
          imageRef: '/images/editorial-1.svg',
          placement: 'HOMEPAGE_STRIP',
          linkTarget: 'https://repxl.com/products',
          isActive: true,
          startDate: new Date(now.getTime() - 48 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Expired yesterday
          createdAt: past,
          updatedAt: now,
        },
      ] as any)

      const req = new NextRequest('http://localhost/api/banners?placement=HOMEPAGE_STRIP')
      const res = await getBanners(req)
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data).toHaveLength(1)
      expect(body.data[0].id).toBe('b1')
      expect(body.data[0].title).toBe('Active Deal Banner')
    })

    it('passes placement filter to query when specified', async () => {
      vi.mocked(prisma.banner.findMany).mockResolvedValue([])

      const req = new NextRequest('http://localhost/api/banners?placement=HOMEPAGE_STRIP')
      await getBanners(req)

      expect(prisma.banner.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          placement: 'HOMEPAGE_STRIP',
        },
        orderBy: { updatedAt: 'desc' },
      })
    })
  })

  describe('GET /api/cms/homepage', () => {
    it('returns published homepage blocks in display order', async () => {
      vi.mocked(prisma.homepageContentBlock.findMany).mockResolvedValue([
        {
          id: 'block_1',
          type: 'editorial',
          content: { heading: 'Before filters, there was light' },
          displayOrder: 1,
          isPublished: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any)

      const req = new NextRequest('http://localhost/api/cms/homepage')
      const res = await getCmsHomepage(req)
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data).toHaveLength(1)
      expect(body.data[0].type).toBe('editorial')
      expect(prisma.homepageContentBlock.findMany).toHaveBeenCalledWith({
        where: { isPublished: true },
        orderBy: { displayOrder: 'asc' },
      })
    })
  })

  describe('GET /api/pages/[slug]', () => {
    it('returns published static page for public viewers', async () => {
      vi.mocked(prisma.staticPage.findUnique).mockResolvedValue({
        id: 'page_1',
        title: 'About Us',
        slug: 'about-us',
        body: 'About RePXL...',
        status: 'PUBLISHED',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)

      const req = new NextRequest('http://localhost/api/pages/about-us')
      const res = await getStaticPage(req, { params: Promise.resolve({ slug: 'about-us' }) })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data.slug).toBe('about-us')
    })

    it('returns 404 for draft static page when requester is not an admin', async () => {
      vi.mocked(prisma.staticPage.findUnique).mockResolvedValue({
        id: 'page_2',
        title: 'Draft Terms',
        slug: 'draft-terms',
        body: 'Confidential...',
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)

      const req = new NextRequest('http://localhost/api/pages/draft-terms')
      const res = await getStaticPage(req, { params: Promise.resolve({ slug: 'draft-terms' }) })

      expect(res.status).toBe(404)
    })
  })
})

