import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse, validationError } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth-helpers'
import { addressSchema } from '@/lib/validations'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

// GET /api/addresses — Get user's addresses
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const addresses = await prisma.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })

    return successResponse(addresses)
  } catch (error) {
    console.error('Get addresses error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// POST /api/addresses — Create a new address
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const parsed = addressSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error)
    }

    const data = parsed.data

    // If this is the first address or set as default, unset other defaults
    const existingCount = await prisma.address.count({ where: { userId: user.id } })
    const shouldBeDefault = existingCount === 0 || data.isDefault

    if (shouldBeDefault) {
      await prisma.address.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      })
    }

    const address = await prisma.address.create({
      data: {
        userId: user.id,
        fullName: data.fullName,
        address: data.address,
        city: data.city,
        postalCode: data.postalCode,
        phone: data.phone,
        isDefault: shouldBeDefault,
      },
    })

    return successResponse(address, 201)
  } catch (error) {
    console.error('Create address error:', error)
    return errorResponse('Internal server error', 500)
  }
}
