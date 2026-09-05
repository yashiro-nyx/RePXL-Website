import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { emitNotification } from '@/lib/notifications'
import { sendOrderConfirmationEmail } from '@/lib/order-email'

export class InsufficientStockError extends Error {
  constructor() {
    super(
      'Stock is no longer available. Order not confirmed; contact support if payment was collected.'
    )
  }
}

// Conditional UPDATE takes a PostgreSQL row lock and rechecks stock after waiting.
// Always call inside the transaction containing the order transition/creation.
export async function deductInventory(
  tx: Prisma.TransactionClient,
  items: Array<{ productId: string; quantity: number }>
) {
  const quantities = new Map<string, number>()
  for (const item of items) {
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0)
      throw new Error('Invalid purchase quantity')
    quantities.set(
      item.productId,
      (quantities.get(item.productId) ?? 0) + item.quantity
    )
  }
  // Stable lock ordering prevents opposite-order multi-product deadlocks.
  for (const [id, quantity] of Array.from(quantities).sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    const result = await tx.product.updateMany({
      where: { id, stock: { gte: quantity } },
      data: { stock: { decrement: quantity } },
    })
    if (result.count !== 1) throw new InsufficientStockError()
  }
}

export async function finalizePaidOrder(orderNumber: string) {
  const order = await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: {
        orderNumber,
        paymentStatus: 'PENDING',
        status: 'PROCESSING',
        OR: [
          { paymentIntentId: { not: null } },
          { paymentSessionId: { not: null } },
        ],
      },
      data: { paymentStatus: 'PAID' },
    })
    if (!claimed.count) return null
    const order = await tx.order.findUniqueOrThrow({
      where: { orderNumber },
      include: {
        items: { include: { product: true } },
        user: { select: { email: true } },
      },
    })
    await deductInventory(tx, order.items)
    if (order.voucherCode)
      await tx.voucher.updateMany({
        where: { code: order.voucherCode },
        data: { used: { increment: 1 } },
      })
    for (const item of [...order.items].sort((a, b) =>
      a.productId.localeCompare(b.productId)
    )) {
      // Lock/update the cart row before deleting depleted quantities.
      await tx.cartItem.updateMany({
        where: { userId: order.userId, productId: item.productId },
        data: { quantity: { decrement: item.quantity } },
      })
      await tx.cartItem.deleteMany({
        where: {
          userId: order.userId,
          productId: item.productId,
          quantity: { lte: 0 },
        },
      })
    }
    return order
  })
  if (!order) return false
  // Non-blocking: notification + email — failures do NOT roll back the order
  await emitNotification({
    userId: order.userId,
    event: 'ORDER_CONFIRMATION',
    subject: `Order Confirmed — ${order.orderNumber}`,
    body: `Your order ${order.orderNumber} has been confirmed.`,
    channel: 'BOTH',
    recipientEmail: order.user?.email ?? undefined,
  }).catch((err) => {
    console.error('[paymongo webhook] notification failed (non-fatal):', err)
  })

  const userEmail = order.user?.email
  if (userEmail) {
    sendOrderConfirmationEmail({
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      fullName: order.fullName,
      address: order.address,
      barangay: order.barangay,
      city: order.city,
      province: order.province,
      postalCode: order.postalCode,
      paymentMethod: order.paymentMethod,
      courierName: order.courierName,
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      discount: order.discount,
      total: order.total,
      items: order.items.map((item) => ({
        quantity: item.quantity,
        price: item.price,
        product: item.product ? { name: item.product.name } : null,
      })),
      userEmail,
    }).catch((err) => {
      console.error(
        '[paymongo webhook] confirmation email failed (non-fatal):',
        err
      )
    })
  }
  return true
}
