import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  validationError,
} from '@/lib/api'
import { getCurrentAdmin } from '@/lib/auth-helpers'
import { productUpdateSchema } from '@/lib/validations'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: { slug: string }
}

// GET /api/products/[slug] — Get single product by slug
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: params.slug },
    })

    if (!product) {
      return notFoundResponse('Product not found')
    }

    return successResponse(product)
  } catch (error) {
    console.error('Get product error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// PUT /api/products/[slug] — Update a product (admin only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const existing = await prisma.product.findUnique({ where: { slug: params.slug } })
    if (!existing) {
      return notFoundResponse('Product not found')
    }

    const body = await request.json()
    const parsed = productUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error)
    }

    const data = parsed.data

    // If slug is being changed, check uniqueness
    if (data.slug && data.slug !== params.slug) {
      const slugExists = await prisma.product.findUnique({ where: { slug: data.slug } })
      if (slugExists) {
        return errorResponse('A product with this slug already exists', 409)
      }
    }

    const product = await prisma.product.update({
      where: { slug: params.slug },
      data: {
        ...(data.slug && { slug: data.slug }),
        ...(data.name && { name: data.name }),
        ...(data.brand && { brand: data.brand }),
        ...(data.series && { series: data.series }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.condition && { condition: data.condition }),
        ...(data.image && { image: data.image }),
        ...(data.stock !== undefined && { stock: data.stock }),
        ...(data.description && { description: data.description }),
        ...(data.status && { status: data.status }),
        ...(data.serialNumber !== undefined && { serialNumber: data.serialNumber }),
        ...(data.conditionNotes !== undefined && { conditionNotes: data.conditionNotes }),
        ...(data.megapixels !== undefined && { megapixels: data.megapixels }),
        ...(data.zoom && { zoom: data.zoom }),
        ...(data.storage && { storage: data.storage }),
        ...(data.year !== undefined && { year: data.year }),
      },
    })

    // Log admin action
    await prisma.adminLog.create({
      data: {
        action: 'UPDATE_PRODUCT',
        details: `Updated product: ${product.name} (${product.slug})`,
        adminId: admin.id,
        adminName: `${admin.firstName} ${admin.lastName}`,
      },
    })

    return successResponse(product)
  } catch (error) {
    console.error('Update product error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// DELETE /api/products/[slug] — Delete a product (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const existing = await prisma.product.findUnique({ where: { slug: params.slug } })
    if (!existing) {
      return notFoundResponse('Product not found')
    }

    await prisma.product.delete({ where: { slug: params.slug } })

    // Log admin action
    await prisma.adminLog.create({
      data: {
        action: 'DELETE_PRODUCT',
        details: `Deleted product: ${existing.name} (${existing.slug})`,
        adminId: admin.id,
        adminName: `${admin.firstName} ${admin.lastName}`,
      },
    })

    return successResponse({ message: 'Product deleted' })
  } catch (error) {
    console.error('Delete product error:', error)
    return errorResponse('Internal server error', 500)
  }
}
