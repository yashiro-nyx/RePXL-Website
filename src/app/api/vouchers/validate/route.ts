import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse, validationError } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth-helpers'
import { validateVoucherSchema } from '@/lib/validations'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

// POST /api/vouchers/validate — Validate a voucher code
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const parsed = validateVoucherSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error)
    }

    const { code, cartTotal } = parsed.data

    const voucher = await prisma.voucher.findUnique({
      where: { code: code.toUpperCase().trim() },
    })

    if (!voucher) {
      return successResponse({ valid: false, discount: 0, error: 'Invalid voucher code.' })
    }

    if (voucher.status !== 'ACTIVE') {
      return successResponse({ valid: false, discount: 0, error: 'This voucher has expired.' })
    }

    // Check date validity
    const now = new Date()
    if (now < new Date(voucher.validFrom) || now > new Date(voucher.validUntil)) {
      return successResponse({ valid: false, discount: 0, error: 'This voucher is not currently valid.' })
    }

    if (voucher.used >= voucher.usageLimit && voucher.usageLimit > 0) {
      return successResponse({ valid: false, discount: 0, error: 'This voucher has reached its usage limit.' })
    }

    if (cartTotal < voucher.minPurchase) {
      return successResponse({
        valid: false,
        discount: 0,
        error: `Minimum purchase of $${voucher.minPurchase} required.`,
      })
    }

    let discount = 0
    if (voucher.discountType === 'PERCENTAGE') {
      discount = Math.round(cartTotal * (voucher.discountValue / 100))
      if (voucher.maxDiscount > 0 && discount > voucher.maxDiscount) {
        discount = voucher.maxDiscount
      }
    } else {
      discount = voucher.discountValue
    }

    return successResponse({ valid: true, discount, voucher: { code: voucher.code, description: voucher.description } })
  } catch (error) {
    console.error('Validate voucher error:', error)
    return errorResponse('Internal server error', 500)
  }
}
