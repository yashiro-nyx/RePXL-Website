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
  params: Promise<{ slug: string }>
}

// Order statuses that represent a GENUINE completed sale. This mirrors the
// verified-purchase definition already used by POST /api/reviews, so "sold"
// and "verified purchase" stay consistent across the app. PROCESSING (paid but
// not yet delivered), CANCELLED, and unpaid/failed orders are intentionally
// excluded — a sold count must reflect real, fulfilled transactions.
const SOLD_ORDER_STATUSES = ['DELIVERED', 'COMPLETED'] as const

// GET /api/products/[slug] — Get single product by slug (+ real sold count)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params
    const product = await prisma.product.findUnique({
      where: { slug },
    })

    if (!product) {
      return notFoundResponse('Product not found')
    }

    // Real units sold: SUM of OrderItem.quantity across this product's items
    // whose parent order is DELIVERED or COMPLETED. A single aggregate query
    // (no per-order loop / N+1); returns 0 when the product has never sold.
    const soldAgg = await prisma.orderItem.aggregate({
      _sum: { quantity: true },
      where: {
        productId: product.id,
        order: { status: { in: [...SOLD_ORDER_STATUSES] } },
      },
    })
    const soldCount = soldAgg._sum.quantity ?? 0

    return successResponse({ ...product, soldCount })
  } catch (error) {
    console.error('Get product error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// PUT /api/products/[slug] — Update a product (admin only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const existing = await prisma.product.findUnique({ where: { slug } })
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
    if (data.slug && data.slug !== slug) {
      const slugExists = await prisma.product.findUnique({ where: { slug: data.slug } })
      if (slugExists) {
        return errorResponse('A product with this slug already exists', 409)
      }
    }

    const product = await prisma.product.update({
      where: { slug },
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

// PATCH /api/products/[slug] — Partial update (status only, admin only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const existing = await prisma.product.findUnique({ where: { slug } })
    if (!existing) {
      return notFoundResponse('Product not found')
    }

    const body = await request.json()
    const allowedFields: Record<string, unknown> = {}
    if (body.status) {
      const validStatuses = ['ACTIVE', 'INACTIVE', 'COMING_SOON', 'DISCONTINUED']
      if (!validStatuses.includes(body.status)) {
        return errorResponse('Invalid status value', 422)
      }
      allowedFields.status = body.status
    }
    if (body.stock !== undefined) allowedFields.stock = Number(body.stock)

    if (Object.keys(allowedFields).length === 0) {
      return errorResponse('No patchable fields provided', 422)
    }

    const product = await prisma.product.update({
      where: { slug },
      data: allowedFields,
    })

    await prisma.adminLog.create({
      data: {
        action: 'UPDATE_PRODUCT',
        details: `Patched product: ${product.name} (${product.slug}) — ${JSON.stringify(allowedFields)}`,
        adminId: admin.id,
        adminName: `${admin.firstName} ${admin.lastName}`,
      },
    })

    return successResponse(product)
  } catch (error) {
    console.error('Patch product error:', error)
    return errorResponse('Internal server error', 500)
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const existing = await prisma.product.findUnique({ where: { slug } })
    if (!existing) {
      return notFoundResponse('Product not found')
    }

    await prisma.product.delete({ where: { slug } })

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
