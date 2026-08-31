import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  successResponse,
  errorResponse,
  validationError,
  unauthorizedResponse,
  paginatedResponse,
  parsePagination,
} from '@/lib/api'
import { getCurrentAdmin } from '@/lib/auth-helpers'
import { productSchema } from '@/lib/validations'
import { Prisma } from '@prisma/client'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

// GET /api/products — List products with filtering, sorting, pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pagination = parsePagination(searchParams)

    // Build filter conditions
    const where: Prisma.ProductWhereInput = {}

    // Brand filter
    const brand = searchParams.get('brand')
    if (brand) {
      where.brand = { equals: brand, mode: 'insensitive' }
    }

    // Condition filter
    const condition = searchParams.get('condition')
    if (condition) {
      const conditions = condition.toUpperCase().split(',') as Array<'MINT' | 'EXCELLENT' | 'GOOD' | 'FAIR'>
      where.condition = { in: conditions }
    }

    // Status filter (default to ACTIVE for storefront)
    const status = searchParams.get('status')
    if (status) {
      const statuses = status.toUpperCase().split(',') as Array<'ACTIVE' | 'INACTIVE' | 'COMING_SOON' | 'DISCONTINUED'>
      where.status = { in: statuses }
    } else {
      where.status = 'ACTIVE'
    }

    // Price range filter
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) where.price.gte = parseFloat(minPrice)
      if (maxPrice) where.price.lte = parseFloat(maxPrice)
    }

    // Year/era filter
    const minYear = searchParams.get('minYear')
    const maxYear = searchParams.get('maxYear')
    if (minYear || maxYear) {
      where.year = {}
      if (minYear) where.year.gte = parseInt(minYear, 10)
      if (maxYear) where.year.lte = parseInt(maxYear, 10)
    }

    // Search query
    const search = searchParams.get('search') || searchParams.get('q')
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { series: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Series filter
    const series = searchParams.get('series')
    if (series) {
      where.series = { equals: series, mode: 'insensitive' }
    }

    // In-stock filter
    const inStock = searchParams.get('inStock')
    if (inStock === 'true') {
      where.stock = { gt: 0 }
    }

    // Build sort
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'
    const orderBy: Prisma.ProductOrderByWithRelationInput = { [sortBy]: sortOrder }

    // Execute query
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.product.count({ where }),
    ])

    return paginatedResponse(products, total, pagination)
  } catch (error) {
    console.error('List products error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// POST /api/products — Create a new product (admin only)
export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const body = await request.json()
    const parsed = productSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error)
    }

    const data = parsed.data

    // Check slug uniqueness
    const existing = await prisma.product.findUnique({ where: { slug: data.slug } })
    if (existing) {
      return errorResponse('A product with this slug already exists', 409)
    }

    const product = await prisma.product.create({
      data: {
        slug: data.slug,
        name: data.name,
        brand: data.brand,
        series: data.series,
        price: data.price,
        condition: data.condition,
        image: data.image,
        stock: data.stock,
        description: data.description,
        status: data.status || 'ACTIVE',
        serialNumber: data.serialNumber,
        conditionNotes: data.conditionNotes,
        megapixels: data.megapixels,
        zoom: data.zoom,
        storage: data.storage,
        year: data.year,
      },
    })

    // Log admin action
    await prisma.adminLog.create({
      data: {
        action: 'CREATE_PRODUCT',
        details: `Created product: ${product.name} (${product.slug})`,
        adminId: admin.id,
        adminName: `${admin.firstName} ${admin.lastName}`,
      },
    })

    return successResponse(product, 201)
  } catch (error) {
    console.error('Create product error:', error)
    return errorResponse('Internal server error', 500)
  }
}
