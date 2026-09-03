import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  validationError,
} from '@/lib/api'
import { getCurrentUser } from '@/lib/auth-helpers'
import { addressSchema } from '@/lib/validations'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: { addressId: string }
}

// PUT /api/addresses/[addressId] — Update an address
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const address = await prisma.address.findFirst({
      where: { id: params.addressId, userId: user.id },
    })

    if (!address) {
      return notFoundResponse('Address not found')
    }

    const body = await request.json()
    const parsed = addressSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error)
    }

    const data = parsed.data

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId: user.id, id: { not: params.addressId } },
        data: { isDefault: false },
      })
    }

    const updated = await prisma.address.update({
      where: { id: params.addressId },
      data: {
        fullName: data.fullName,
        address: data.address,
        barangay: data.barangay,
        city: data.city,
        province: data.province,
        postalCode: data.postalCode,
        phone: data.phone,
        isDefault: data.isDefault,
        regionCode: data.regionCode ?? '',
        provinceCode: data.provinceCode ?? '',
        cityCode: data.cityCode ?? '',
      },
    })

    return successResponse(updated)
  } catch (error) {
    console.error('Update address error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// DELETE /api/addresses/[addressId] — Delete an address
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const address = await prisma.address.findFirst({
      where: { id: params.addressId, userId: user.id },
    })

    if (!address) {
      return notFoundResponse('Address not found')
    }

    await prisma.address.delete({ where: { id: params.addressId } })

    // If deleted address was default, set the first remaining as default
    if (address.isDefault) {
      const remaining = await prisma.address.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      })
      if (remaining) {
        await prisma.address.update({
          where: { id: remaining.id },
          data: { isDefault: true },
        })
      }
    }

    return successResponse({ message: 'Address deleted' })
  } catch (error) {
    console.error('Delete address error:', error)
    return errorResponse('Internal server error', 500)
  }
}
