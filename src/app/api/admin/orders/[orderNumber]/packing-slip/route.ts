import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentAdmin } from '@/lib/auth-helpers'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api'
import { buildPackingSlipModel, validatePackingSlip } from '@/lib/documents'
import { getSettings } from '@/lib/settings'
import { z } from 'zod'

/**
 * Task 12.1: Packing slip generation route
 * POST /api/admin/orders/[orderNumber]/packing-slip
 *
 * Requirements: 2.1, 2.5, 2.6, 2.7
 * - Guard with getCurrentAdmin
 * - Validate order existence and required fields
 * - Build packing slip model
 * - Validate packing slip (serial numbers, required fields)
 * - Record AdminLog
 * - Return document data or error
 */

export const dynamic = 'force-dynamic'

const paramsSchema = z.object({
  orderNumber: z.string().min(1, 'Order number is required'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    const { orderNumber } = await paramsSchema.parseAsync(await params)

    // Fetch order with all related items and user
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: true,
      },
    })

    // Requirement 2.5: Order not found → error
    if (!order) {
      return errorResponse(`Order ${orderNumber} not found`, 404)
    }

    // Transform order to match OrderWithItems interface
    const orderForDocument = {
      orderNumber: order.orderNumber,
      orderDate: order.createdAt,
      customerFullName: order.fullName,
      shippingAddress: {
        fullName: order.fullName,
        address: order.address,
        barangay: order.barangay,
        city: order.city,
        province: order.province,
        postalCode: order.postalCode,
      },
      shippingCost: order.shippingCost,
      discount: order.discount,
      courierName: order.courierName,
      courierEstimate: order.courierEstimate,
      items: order.items.map((item) => ({
        productName: item.product.name,
        condition: item.product.condition as any,
        unitPrice: item.price,
        quantity: item.quantity,
        serialNumber: item.product.serialNumber,
      })),
    }

    const missingFields = validatePackingSlip(orderForDocument)
    if (missingFields.length > 0) {
      return errorResponse(
        `Packing slip validation failed: missing ${missingFields.join('; ')}`,
        400
      )
    }

    // Build packing slip model (Requirement 2.2, 2.3)
    const packingSlipModel = buildPackingSlipModel(orderForDocument)

    // Record AdminLog (Requirement 2.7)
    await prisma.adminLog.create({
      data: {
        action: 'PACKING_SLIP_GENERATED',
        details: `Generated packing slip for order ${orderNumber}`,
        adminId: admin.id,
        adminName: `${admin.firstName} ${admin.lastName}`,
      },
    })

    // Return packing slip data
    return successResponse(packingSlipModel)
  } catch (error) {
    console.error('Packing slip generation error:', error)

    // Requirement 2.6: Generation failure → error message
    if (error instanceof z.ZodError) {
      return errorResponse(`Invalid order number: ${error.message}`, 400)
    }

    return errorResponse(
      error instanceof Error ? error.message : 'Failed to generate packing slip',
      500
    )
  }
}
