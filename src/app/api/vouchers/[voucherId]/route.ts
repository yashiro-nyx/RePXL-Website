import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, notFoundResponse, unauthorizedResponse } from '@/lib/api'
import { getCurrentAdmin } from '@/lib/auth-helpers'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: { voucherId: string }
}

// DELETE /api/vouchers/[voucherId] — Delete a voucher (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const voucher = await prisma.voucher.findUnique({ where: { id: params.voucherId } })
    if (!voucher) {
      return notFoundResponse('Voucher not found')
    }

    await prisma.voucher.delete({ where: { id: params.voucherId } })

    await prisma.adminLog.create({
      data: {
        action: 'DELETE_VOUCHER',
        details: `Deleted voucher: ${voucher.code}`,
        adminId: admin.id,
        adminName: `${admin.firstName} ${admin.lastName}`,
      },
    })

    return successResponse({ message: 'Voucher deleted' })
  } catch (error) {
    console.error('Delete voucher error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// PATCH /api/vouchers/[voucherId] — Update voucher status (admin only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const voucher = await prisma.voucher.findUnique({ where: { id: params.voucherId } })
    if (!voucher) {
      return notFoundResponse('Voucher not found')
    }

    const body = await request.json()
    const { status } = body

    if (!['ACTIVE', 'EXPIRED', 'DISABLED'].includes(status)) {
      return errorResponse('Invalid status. Must be ACTIVE, EXPIRED, or DISABLED', 400)
    }

    const updated = await prisma.voucher.update({
      where: { id: params.voucherId },
      data: { status },
    })

    return successResponse(updated)
  } catch (error) {
    console.error('Update voucher error:', error)
    return errorResponse('Internal server error', 500)
  }
}
