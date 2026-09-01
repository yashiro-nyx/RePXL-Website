import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentAdmin } from '@/lib/auth-helpers'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/api'
import {
  validateStaticPage,
  isSlugUnique,
  sortByUpdatedDesc,
} from '@/lib/cms'
import { z } from 'zod'

/**
 * Task 12.3: Admin CMS static-page routes
 * GET/POST/PATCH/DELETE /api/admin/cms/pages
 *
 * Requirements: 5.1, 5.3, 5.4, 5.5, 5.6, 5.8, 5.9
 */

export const dynamic = 'force-dynamic'

const pageInputSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(100),
  body: z.string().min(1).max(100000),
  status: z.enum(['PUBLISHED', 'DRAFT']).default('DRAFT'),
})

const patchPageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(100).optional(),
  body: z.string().min(1).max(100000).optional(),
  status: z.enum(['PUBLISHED', 'DRAFT']).optional(),
})

// GET /api/admin/cms/pages — List all static pages (ordered by updatedAt desc)
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const pages = await prisma.staticPage.findMany()
    const sorted = sortByUpdatedDesc(pages)

    return successResponse(sorted)
  } catch (error) {
    console.error('CMS pages list error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch pages',
      500
    )
  }
}

// POST /api/admin/cms/pages — Create a new static page
export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const body = await request.json()
    const input = pageInputSchema.parse(body)

    // Validate page content
    const validation = validateStaticPage({
      title: input.title,
      slug: input.slug,
      body: input.body,
    })

    if (!validation.valid) {
      return errorResponse(`Validation failed: ${JSON.stringify(validation.errors)}`, 400)
    }

    // Check slug uniqueness
    const existingSlugs = await prisma.staticPage.findMany({
      select: { slug: true },
    })
    const existingSlugsArray = existingSlugs.map((p) => p.slug)

    if (!isSlugUnique(input.slug, existingSlugsArray)) {
      return errorResponse('A page with this slug already exists', 409)
    }

    // Create page
    const page = await prisma.staticPage.create({
      data: {
        title: input.title,
        slug: input.slug,
        body: input.body,
        status: input.status,
      },
    })

    // Record AdminLog
    await prisma.adminLog.create({
      data: {
        action: 'STATIC_PAGE_CREATED',
        details: `Created static page: ${input.slug}`,
        adminId: admin.id,
        adminName: `${admin.firstName} ${admin.lastName}`,
      },
    })

    return successResponse(page, 201)
  } catch (error) {
    console.error('CMS page creation error:', error)
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation error: ${error.message}`, 400)
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to create page',
      500
    )
  }
}
