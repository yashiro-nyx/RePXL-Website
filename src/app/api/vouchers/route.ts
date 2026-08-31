import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationError,
  paginatedResponse,
  parsePagination,
} from '@/lib/api'
import { getCurrentAdmin } from '@/lib/auth-helpers'
import { voucherSchema } from '@/lib/validations'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

// GET /api/vouchers — List vouchers (admin only)
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const { searchParams } = new URL(request.url)
    const pagination = parsePagination(searchParams)

    const status = searchParams.get('status')
    const where: any = {}

    if (status) {
      where.status = status.toUpperCase()
    }

    const [vouchers, total] = await Promise.all([
      prisma.voucher.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.voucher.count({ where }),
    ])

    return paginatedResponse(vouchers, total, pagination)
  } catch (error) {
    console.error('Get vouchers error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// POST /api/vouchers — Create a new voucher (admin only)
export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const body = await request.json()
    const parsed = voucherSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error)
    }

    const data = parsed.data

    // Check code uniqueness
    const existing = await prisma.voucher.findUnique({
      where: { code: data.code.toUpperCase().trim() },
    })
    if (existing) {
      return errorResponse('A voucher with this code already exists', 409)
    }

    const voucher = await prisma.voucher.create({
      data: {
        code: data.code.toUpperCase().trim(),
        discountType: data.discountType,
        discountValue: data.discountValue,
        minPurchase: data.minPurchase || 0,
        maxDiscount: data.maxDiscount || 0,
        usageLimit: data.usageLimit || 0,
        perUserLimit: data.perUserLimit || 1,
        validFrom: new Date(data.validFrom),
        validUntil: new Date(data.validUntil),
        description: data.description || '',
        status: 'ACTIVE',
      },
    })

    await prisma.adminLog.create({
      data: {
        action: 'CREATE_VOUCHER',
        details: `Created voucher: ${voucher.code}`,
        adminId: admin.id,
        adminName: `${admin.firstName} ${admin.lastName}`,
      },
    })

    return successResponse(voucher, 201)
  } catch (error) {
    console.error('Create voucher error:', error)
    return errorResponse('Internal server error', 500)
  }
}
