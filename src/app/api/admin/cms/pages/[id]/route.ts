import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentAdmin } from '@/lib/auth-helpers'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/api'
import {
  validateStaticPage,
  isSlugUnique,
} from '@/lib/cms'
import { z } from 'zod'

/**
 * Task 12.3: Admin CMS static-page detail routes
 * PATCH /api/admin/cms/pages/[id]
 * DELETE /api/admin/cms/pages/[id]
 *
 * Requirements: 5.1, 5.3, 5.4, 5.5, 5.6, 5.8, 5.9
 */

export const dynamic = 'force-dynamic'

const paramsSchema = z.object({
  id: z.string().cuid('Invalid page ID'),
})

const patchPageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(100).optional(),
  body: z.string().min(1).max(100000).optional(),
  status: z.enum(['PUBLISHED', 'DRAFT']).optional(),
})

// PATCH /api/admin/cms/pages/[id] — Update a static page
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
    const patch = patchPageSchema.parse(body)

    // Fetch existing page
    const page = await prisma.staticPage.findUnique({ where: { id } })
    if (!page) {
      return errorResponse('Page not found', 404)
    }

    // Prepare updated page for validation
    const updated = {
      title: patch.title ?? page.title,
      slug: patch.slug ?? page.slug,
      body: patch.body ?? page.body,
    }

    // Validate
    const validation = validateStaticPage(updated)
    if (!validation.valid) {
      return errorResponse(`Validation failed: ${JSON.stringify(validation.errors)}`, 400)
    }

    // If slug changed, check uniqueness
    if (patch.slug && patch.slug !== page.slug) {
      const existingSlugs = await prisma.staticPage.findMany({
        where: { id: { not: id } },
        select: { slug: true },
      })
      const existingSlugsArray = existingSlugs.map((p) => p.slug)

      if (!isSlugUnique(patch.slug, existingSlugsArray)) {
        return errorResponse('A page with this slug already exists', 409)
      }
    }

    // Update page
    const result = await prisma.staticPage.update({
      where: { id },
      data: {
        ...(patch.title && { title: patch.title }),
        ...(patch.slug && { slug: patch.slug }),
        ...(patch.body && { body: patch.body }),
        ...(patch.status && { status: patch.status }),
      },
    })

    // Record AdminLog
    await prisma.adminLog.create({
      data: {
        action: 'STATIC_PAGE_UPDATED',
        details: `Updated static page: ${page.slug}`,
        adminId: admin.id,
        adminName: `${admin.firstName} ${admin.lastName}`,
      },
    })

    return successResponse(result)
  } catch (error) {
    console.error('CMS page update error:', error)
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation error: ${error.message}`, 400)
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to update page',
      500
    )
  }
}

// DELETE /api/admin/cms/pages/[id] — Delete a static page
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

    const page = await prisma.staticPage.findUnique({ where: { id } })
    if (!page) {
      return errorResponse('Page not found', 404)
    }

    // Delete page
    await prisma.staticPage.delete({ where: { id } })

    // Record AdminLog
    await prisma.adminLog.create({
      data: {
        action: 'STATIC_PAGE_DELETED',
        details: `Deleted static page: ${page.slug}`,
        adminId: admin.id,
        adminName: `${admin.firstName} ${admin.lastName}`,
      },
    })

    return successResponse({ id })
  } catch (error) {
    console.error('CMS page deletion error:', error)
    if (error instanceof z.ZodError) {
      return errorResponse(`Invalid page ID`, 400)
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to delete page',
      500
    )
  }
}
