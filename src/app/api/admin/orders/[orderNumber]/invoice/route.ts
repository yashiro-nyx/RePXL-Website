import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentAdmin } from '@/lib/auth-helpers'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api'
import { buildInvoiceModel } from '@/lib/documents'
import { getSettings } from '@/lib/settings'
import { z } from 'zod'

/**
 * Task 12.1: Invoice generation route
 * POST /api/admin/orders/[orderNumber]/invoice
 *
 * Requirements: 1.1, 1.5, 1.6, 1.7
 * - Guard with getCurrentAdmin
 * - Validate order existence
 * - Build invoice model
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

    // Requirement 1.5: Order not found → error
    if (!order) {
      return errorResponse(`Order ${orderNumber} not found`, 404)
    }

    // Get currency from settings
    const settings = await getSettings()
    const currency = (settings.currency as any)?.code || 'PHP'

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

    // Build invoice model (Requirement 1.2, 1.3, 1.4)
    const invoiceModel = buildInvoiceModel(orderForDocument, currency)

    // Record AdminLog (Requirement 1.7)
    await prisma.adminLog.create({
      data: {
        action: 'INVOICE_GENERATED',
        details: `Generated invoice for order ${orderNumber}`,
        adminId: admin.id,
        adminName: `${admin.firstName} ${admin.lastName}`,
      },
    })

    // Return invoice data
    return successResponse(invoiceModel)
  } catch (error) {
    console.error('Invoice generation error:', error)

    // Requirement 1.6: Generation failure → error message
    if (error instanceof z.ZodError) {
      return errorResponse(`Invalid order number: ${error.message}`, 400)
    }

    return errorResponse(
      error instanceof Error ? error.message : 'Failed to generate invoice',
      500
    )
  }
}
