import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, notFoundResponse, unauthorizedResponse } from '@/lib/api'
import { getCurrentAdmin } from '@/lib/auth-helpers'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: { customerId: string }
}

// POST /api/admin/customers/[customerId]/archive — Archive a customer
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const customer = await prisma.user.findUnique({ where: { id: params.customerId } })
    if (!customer) {
      return notFoundResponse('Customer not found')
    }

    // Can't archive super admin
    if (customer.isSuperAdmin) {
      return errorResponse('Cannot archive a super admin account', 403)
    }

    // Can't archive yourself
    if (customer.id === admin.id) {
      return errorResponse('Cannot archive your own account', 403)
    }

    const updated = await prisma.user.update({
      where: { id: params.customerId },
      data: { isArchived: true, archivedAt: new Date() },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isArchived: true,
        archivedAt: true,
      },
    })

    await prisma.adminLog.create({
      data: {
        action: 'ARCHIVE_CUSTOMER',
        details: `Archived customer: ${customer.firstName} ${customer.lastName} (${customer.email})`,
        adminId: admin.id,
        adminName: `${admin.firstName} ${admin.lastName}`,
      },
    })

    return successResponse(updated)
  } catch (error) {
    console.error('Archive customer error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// DELETE /api/admin/customers/[customerId]/archive — Restore an archived customer
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const customer = await prisma.user.findUnique({ where: { id: params.customerId } })
    if (!customer) {
      return notFoundResponse('Customer not found')
    }

    const updated = await prisma.user.update({
      where: { id: params.customerId },
      data: { isArchived: false, archivedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isArchived: true,
      },
    })

    await prisma.adminLog.create({
      data: {
        action: 'RESTORE_CUSTOMER',
        details: `Restored customer: ${customer.firstName} ${customer.lastName} (${customer.email})`,
        adminId: admin.id,
        adminName: `${admin.firstName} ${admin.lastName}`,
      },
    })

    return successResponse(updated)
  } catch (error) {
    console.error('Restore customer error:', error)
    return errorResponse('Internal server error', 500)
  }
}
