import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, notFoundResponse, unauthorizedResponse } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth-helpers'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: { addressId: string }
}

// PUT /api/addresses/[addressId]/default — Set address as default
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

    // Unset all defaults, then set this one
    await prisma.address.updateMany({
      where: { userId: user.id },
      data: { isDefault: false },
    })

    const updated = await prisma.address.update({
      where: { id: params.addressId },
      data: { isDefault: true },
    })

    return successResponse(updated)
  } catch (error) {
    console.error('Set default address error:', error)
    return errorResponse('Internal server error', 500)
  }
}
