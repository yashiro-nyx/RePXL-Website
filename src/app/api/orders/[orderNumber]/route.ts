import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  validationError,
} from '@/lib/api'
import { getCurrentUser, getCurrentAdmin } from '@/lib/auth-helpers'
import { updateOrderStatusSchema } from '@/lib/validations'
import { emitNotification } from '@/lib/notifications'
import { buildOrderStatusUpdate } from '@/lib/order-status'
import { canAdminEditOrderStatus, isPaymentExpired, canCustomerCancelOrder } from '@/lib/order-payment-expiry'
import { finalizePaidOrder, InsufficientStockError } from '@/lib/purchase-finalization'
import { checkPaymongoPaymentStatus } from '@/lib/paymongo'
import { sendOrderConfirmationEmail } from '@/lib/order-email'
import type { OrderStatus } from '@prisma/client'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: { orderNumber: string }
}

// Valid admin-driven status transitions.
// DELIVERED → COMPLETED is intentionally absent: that transition is
// customer-only (via /api/orders/[orderNumber]/confirm-receipt).
const ALLOWED_ADMIN_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['DELIVERED'], // admin can re-set Delivered; cannot set Completed
  COMPLETED: [],
  CANCELLED: [],
}

// GET /api/orders/[orderNumber] — Get single order
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    const admin = await getCurrentAdmin()

    if (!user && !admin) {
      return unauthorizedResponse()
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber: params.orderNumber },
      include: {
        items: { include: { product: true } },
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    })

    if (!order) {
      return notFoundResponse('Order not found')
    }

    let activeOrder = order

    // If order has pending payment and a gateway identifier, auto-reconcile with PayMongo
    if (
      activeOrder.paymentStatus === 'PENDING' &&
      activeOrder.status === 'PROCESSING' &&
      (activeOrder.paymentIntentId || activeOrder.paymentSessionId)
    ) {
      try {
        const statusResult = await checkPaymongoPaymentStatus({
          paymentIntentId: activeOrder.paymentIntentId,
          paymentSessionId: activeOrder.paymentSessionId,
        })
        if (statusResult.isPaid) {
          console.log(`[GET order] Auto-reconciling paid order from PayMongo: ${params.orderNumber}`)
          await finalizePaidOrder(params.orderNumber)
          if (statusResult.paymentId && !activeOrder.paymentReference) {
            await prisma.order.update({
              where: { orderNumber: params.orderNumber },
              data: { paymentReference: statusResult.paymentId },
            }).catch(() => {})
          }
          const refreshed = await prisma.order.findUnique({
            where: { orderNumber: params.orderNumber },
            include: {
              items: { include: { product: true } },
              user: { select: { id: true, email: true, firstName: true, lastName: true } },
            },
          })
          if (refreshed) {
            activeOrder = refreshed
          }
        }
      } catch (err) {
        console.warn(`[GET order] PayMongo auto-reconciliation failed for ${params.orderNumber}:`, err)
      }
    }

    // Auto-expire overdue pending orders on read (only if still PENDING after PayMongo check)
    if (isPaymentExpired(activeOrder)) {
      await prisma.order.update({
        where: { orderNumber: params.orderNumber },
        data: { paymentStatus: 'FAILED', status: 'CANCELLED', updatedAt: new Date() },
      })
      activeOrder.paymentStatus = 'FAILED'
      activeOrder.status = 'CANCELLED'
    }

    // Non-admin users can only see their own orders
    if (!admin && user && activeOrder.userId !== user.id) {
      return notFoundResponse('Order not found')
    }

    return successResponse(activeOrder)
  } catch (error) {
    console.error('Get order error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// PATCH /api/orders/[orderNumber] — Update order status or mark payment completed (admin only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await getCurrentAdmin()
    const user = !admin ? await getCurrentUser() : null

    if (!admin && !user) {
      return unauthorizedResponse('Admin access required')
    }

    const body = await request.json()
    const parsed = updateOrderStatusSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error)
    }

    const { status, paymentStatus, markPaymentCompleted, approveCod, rejectCod } = parsed.data

    const order = await prisma.order.findUnique({
      where: { orderNumber: params.orderNumber },
      include: {
        items: { include: { product: true } },
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    })

    if (!order) {
      return notFoundResponse('Order not found')
    }

    // Customer cancellation: allow authenticated order owner to cancel without admin access
    if (!admin && user) {
      if (order.userId !== user.id) {
        return notFoundResponse('Order not found')
      }
      if (status !== 'CANCELLED') {
        return unauthorizedResponse('Admin access required')
      }

      const cancelCheck = canCustomerCancelOrder(order)
      if (!cancelCheck.allowed) {
        return errorResponse(
          cancelCheck.reason || 'Order cannot be cancelled at this stage.',
          409
        )
      }

      if (order.status !== 'PROCESSING') {
        return errorResponse(
          `Order cannot be cancelled (current status: ${order.status}). Only orders in Processing status can be cancelled.`,
          409
        )
      }

      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'CANCELLED', updatedAt: new Date() },
        })
        if (order.paymentStatus === 'PAID') {
          for (const item of order.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            })
          }
        }
      })

      emitNotification({
        userId: user.id,
        event: 'ORDER_STATUS_CHANGE',
        subject: `Order ${order.orderNumber} Cancelled`,
        body: `Your order ${order.orderNumber} has been cancelled as requested.`,
        channel: 'BOTH',
        recipientEmail: user.email,
        context: {
          orderNumber: order.orderNumber,
          customerName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email || 'Customer',
          status: 'CANCELLED',
          orderStatus: 'CANCELLED',
          orderTotal: order.total != null ? `₱${order.total.toLocaleString()}` : '',
          orderDate: order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' }) : '',
        },
      }).catch(() => {})

      const updated = await prisma.order.findUniqueOrThrow({
        where: { orderNumber: params.orderNumber },
        include: {
          items: { include: { product: true } },
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      })
      return successResponse(updated)
    }

    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    // Handle Admin COD Approval
    if (approveCod) {
      if (order.status === 'CANCELLED') {
        return errorResponse('Cannot approve a cancelled order.', 409)
      }
      const isCod =
        order.paymentMethod?.toLowerCase().includes('cash on delivery') ||
        order.paymentMethod?.toLowerCase() === 'cod'
      if (!isCod) {
        return errorResponse('Only Cash on Delivery orders can be approved via COD approval.', 400)
      }

      const updated = await prisma.order.update({
        where: { orderNumber: params.orderNumber },
        data: {
          deliveryStatus: 'Order Placed',
          trackingDescription:
            'Your Cash on Delivery order has been approved by the store administrator. We are preparing your camera gear.',
          trackingProgress: 25,
          paymentReference: 'COD_APPROVED',
          updatedAt: new Date(),
        },
        include: {
          items: { include: { product: true } },
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      })

      // Send official order confirmation to customer now that COD is approved
      emitNotification({
        userId: updated.user.id,
        event: 'ORDER_CONFIRMATION',
        subject: `Order Confirmed & Placed — ${updated.orderNumber}`,
        body: `Great news! Your Cash on Delivery order ${updated.orderNumber} has been approved by our team and is officially placed. We are now preparing your camera gear for shipment.`,
        channel: 'BOTH',
        recipientEmail: updated.user.email,
        orderNumber: updated.orderNumber,
        context: {
          orderNumber: updated.orderNumber,
          customerName: `${updated.user?.firstName ?? ''} ${updated.user?.lastName ?? ''}`.trim() || updated.user?.email || 'Customer',
          orderTotal: updated.total != null ? `₱${updated.total.toLocaleString()}` : '',
          orderDate: updated.createdAt ? new Date(updated.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' }) : '',
        },
      }).catch(() => {})

      sendOrderConfirmationEmail({
        orderNumber: updated.orderNumber,
        createdAt: updated.createdAt,
        fullName: updated.fullName,
        address: updated.address,
        barangay: updated.barangay,
        city: updated.city,
        province: updated.province,
        postalCode: updated.postalCode,
        paymentMethod: updated.paymentMethod,
        courierName: updated.courierName,
        subtotal: updated.subtotal,
        shippingCost: updated.shippingCost,
        discount: updated.discount,
        total: updated.total,
        items: updated.items.map((i) => ({
          product: { name: i.product.name },
          quantity: i.quantity,
          price: i.price,
        })),
        userEmail: updated.user.email,
      }).catch(() => {})

      await prisma.adminLog.create({
        data: {
          action: 'COD_ORDER_APPROVED',
          details: `Order ${params.orderNumber} Cash on Delivery request approved by ${admin.firstName} ${admin.lastName}. Order is officially placed.`,
          adminId: admin.id,
          adminName: `${admin.firstName} ${admin.lastName}`,
        },
      })

      return successResponse(updated)
    }

    // Handle Admin COD Rejection
    if (rejectCod) {
      if (order.status === 'CANCELLED') {
        return errorResponse('Order is already cancelled.', 409)
      }

      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { orderNumber: params.orderNumber },
          data: {
            status: 'CANCELLED',
            paymentStatus: 'FAILED',
            deliveryStatus: 'COD Request Declined',
            trackingDescription:
              'Cash on Delivery request was declined by the store administrator.',
            trackingProgress: 0,
            updatedAt: new Date(),
          },
        })

        // Restore reserved inventory
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          })
        }
      })

      const updated = await prisma.order.findUniqueOrThrow({
        where: { orderNumber: params.orderNumber },
        include: {
          items: { include: { product: true } },
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      })

      emitNotification({
        userId: updated.user.id,
        event: 'ORDER_STATUS_CHANGE',
        subject: `Order ${updated.orderNumber} COD Request Declined`,
        body: `Your Cash on Delivery request for order ${updated.orderNumber} could not be approved at this time. The order has been cancelled and reserved items have been returned to inventory.`,
        channel: 'BOTH',
        recipientEmail: updated.user.email,
        orderNumber: updated.orderNumber,
      }).catch(() => {})

      await prisma.adminLog.create({
        data: {
          action: 'COD_ORDER_REJECTED',
          details: `Order ${params.orderNumber} Cash on Delivery request declined by ${admin.firstName} ${admin.lastName}. Reserved stock restored.`,
          adminId: admin.id,
          adminName: `${admin.firstName} ${admin.lastName}`,
        },
      })

      return successResponse(updated)
    }

    // If order is overdue for payment, expire it immediately
    if (isPaymentExpired(order)) {
      await prisma.order.update({
        where: { orderNumber: params.orderNumber },
        data: { paymentStatus: 'FAILED', status: 'CANCELLED', updatedAt: new Date() },
      })
      order.paymentStatus = 'FAILED'
      order.status = 'CANCELLED'

      return errorResponse(
        'Order payment processing has expired. Order status cannot be edited.',
        409
      )
    }

    // Handle marking payment as completed if requested
    if (markPaymentCompleted || paymentStatus === 'PAID') {
      if (order.paymentStatus !== 'PAID') {
        if (order.status === 'CANCELLED' || order.paymentStatus === 'FAILED') {
          return errorResponse('Cannot mark an expired or cancelled order as paid.', 409)
        }

        try {
          const finalized = await finalizePaidOrder(order.orderNumber)
          if (!finalized) {
            const recheck = await prisma.order.findUnique({ where: { orderNumber: params.orderNumber } })
            if (recheck?.paymentStatus !== 'PAID') {
              return errorResponse('Failed to finalize payment. Check stock availability.', 409)
            }
          }
        } catch (err) {
          if (err instanceof InsufficientStockError) {
            return errorResponse(err.message, 409)
          }
          console.error(`Failed to finalize payment for order ${order.orderNumber}:`, err)
          return errorResponse('Failed to finalize payment. Check stock availability.', 409)
        }
        order.paymentStatus = 'PAID'

        await prisma.adminLog.create({
          data: {
            action: 'MARK_PAYMENT_COMPLETED',
            details: `Order ${params.orderNumber} payment marked as completed`,
            adminId: admin.id,
            adminName: `${admin.firstName} ${admin.lastName}`,
          },
        })
      }

      // If only marking payment completed without changing order status, return now
      if (!status) {
        const updated = await prisma.order.findUniqueOrThrow({
          where: { orderNumber: params.orderNumber },
          include: {
            items: { include: { product: true } },
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        })
        return successResponse(updated)
      }
    }

    // If attempting to edit order status, strictly enforce that payment is completed
    if (status) {
      const editCheck = canAdminEditOrderStatus(order)
      if (!editCheck.allowed) {
        return errorResponse(
          editCheck.reason ?? 'Order status cannot be edited until payment has been marked completed.',
          409
        )
      }

      // Enforce server-side transition rules.
      const allowed = ALLOWED_ADMIN_TRANSITIONS[order.status] ?? []
      if (!allowed.includes(status)) {
        // Special case: DELIVERED → COMPLETED is blocked for admins.
        if (order.status === 'DELIVERED' && status === 'COMPLETED') {
          return errorResponse(
            'Order cannot be marked Completed by admin. The customer must confirm receipt and submit feedback.',
            409
          )
        }
        return errorResponse(
          `Invalid status transition: ${order.status} → ${status}`,
          409
        )
      }

      const isCod =
        order.paymentMethod?.toLowerCase().includes('cash on delivery') ||
        order.paymentMethod?.toLowerCase() === 'cod'

      const updateData = buildOrderStatusUpdate(
        {
          status: order.status,
          deliveredAt: order.deliveredAt,
          completedAt: order.completedAt,
          deliveryStatus: order.deliveryStatus,
          trackingProgress: order.trackingProgress,
          trackingDescription: order.trackingDescription,
          trackingNumber: order.trackingNumber,
          orderNumber: order.orderNumber,
        },
        status
      )

      const updated = await prisma.order.update({
        where: { orderNumber: params.orderNumber },
        data: updateData,
        data: {
          ...updateData,
          ...(isCod && order.paymentReference !== 'COD_APPROVED' ? { paymentReference: 'COD_APPROVED' } : {}),
          updatedAt: new Date(),
        },
        include: {
          items: { include: { product: true } },
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      })

      // Restore inventory if a paid order is cancelled
      if (status === 'CANCELLED' && order.paymentStatus === 'PAID') {
        for (const item of order.items) {
          await prisma.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          })
        }
      }

      await emitNotification({
        userId: updated.user.id,
        event: 'ORDER_STATUS_CHANGE',
        subject: `Order ${updated.orderNumber} Status Update`,
        body: `Your order ${updated.orderNumber} status has changed from ${order.status} to ${updated.status}.`,
        channel: 'BOTH',
        recipientEmail: updated.user.email,
        context: {
          orderNumber: updated.orderNumber,
          customerName: `${updated.user?.firstName ?? ''} ${updated.user?.lastName ?? ''}`.trim() || updated.user?.email || 'Customer',
          status: updated.status,
          orderStatus: updated.status,
          orderTotal: updated.total != null ? `₱${updated.total.toLocaleString()}` : '',
          orderDate: updated.createdAt ? new Date(updated.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' }) : '',
          courierName: updated.courierName || 'Standard Delivery',
          trackingNumber: updated.trackingNumber || 'Pending assignment',
        },
      })

      // Log admin action
      await prisma.adminLog.create({
        data: {
          action: 'UPDATE_ORDER_STATUS',
          details: `Order ${params.orderNumber} status changed to ${status}`,
          adminId: admin.id,
          adminName: `${admin.firstName} ${admin.lastName}`,
        },
      })

      return successResponse(updated)
    }

    return successResponse(order)
  } catch (error) {
    console.error('Update order status error:', error)
    return errorResponse('Internal server error', 500)
  }
}
