import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationError,
} from '@/lib/api'
import { getCurrentUser } from '@/lib/auth-helpers'
import { processPaymentSchema } from '@/lib/validations'
import {
  isPaymongoConfigured,
  isTestMode,
  createPaymentIntent,
  createPaymentMethod,
  attachPaymentMethod,
} from '@/lib/paymongo'
import {
  finalizePaidOrder,
  deductInventory,
  InsufficientStockError,
} from '@/lib/purchase-finalization'
import { emitNotification } from '@/lib/notifications'
import { sendOrderConfirmationEmail } from '@/lib/order-email'

export const dynamic = 'force-dynamic'

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `RPX-${timestamp}${random}`
}

function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  return raw.replace(/\/+$/, '')
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()

    const body = await request.json().catch(() => ({}))
    const parsed = processPaymentSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error)
    const data = parsed.data

    const cartItems = await prisma.cartItem.findMany({
      where: {
        userId: user.id,
        ...(data.selectedProductIds && data.selectedProductIds.length > 0
          ? { product: { slug: { in: data.selectedProductIds } } }
          : {}),
      },
      include: { product: true },
    })

    if (cartItems.length === 0) {
      return errorResponse('No matching items found in cart. Please re-select your items.', 400)
    }

    // Stock pre-check
    for (const item of cartItems) {
      if (item.product.stock < item.quantity) {
        return errorResponse(
          `Insufficient stock for ${item.product.name}. Available: ${item.product.stock}`,
          400
        )
      }
    }

    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    )

    let discount = 0
    let voucherCode: string | null = null
    if (data.voucherCode) {
      const voucher = await prisma.voucher.findUnique({
        where: { code: data.voucherCode.toUpperCase().trim() },
      })
      if (
        voucher &&
        voucher.status === 'ACTIVE' &&
        (voucher.usageLimit === 0 || voucher.used < voucher.usageLimit) &&
        subtotal >= voucher.minPurchase
      ) {
        if (voucher.discountType === 'PERCENTAGE') {
          discount = Math.round(subtotal * (voucher.discountValue / 100))
          if (voucher.maxDiscount > 0 && discount > voucher.maxDiscount) {
            discount = voucher.maxDiscount
          }
        } else {
          discount = voucher.discountValue
        }
        voucherCode = voucher.code
      }
    }

    const total = Math.max(0, subtotal + data.shippingCost - discount)
    const totalCentavos = Math.round(total * 100)
    const orderNumber = generateOrderNumber()

    // Normalize payment method
    const normMethod = (data.paymentMethod || '').toLowerCase()
    const isCod = normMethod === 'cod' || normMethod.includes('cash on delivery')
    const isGcash = normMethod === 'gcash'
    const isCard = normMethod === 'card' || normMethod.includes('card') || (!isCod && !isGcash)

    // ── Cash on Delivery Flow ───────────────────────────────────────────────────
    if (isCod) {
      const order = await prisma.$transaction(async (tx) => {
        const newOrder = await tx.order.create({
          data: {
            orderNumber,
            userId: user.id,
            status: 'PROCESSING',
            subtotal,
            shippingCost: data.shippingCost,
            discount,
            total,
            courierName: data.courierName,
            courierEstimate: data.courierEstimate,
            paymentMethod: 'Cash on Delivery',
            paymentStatus: 'PENDING',
            deliveryStatus: 'Pending COD Approval',
            trackingDescription:
              'Your Cash on Delivery order has been submitted and is awaiting administrator confirmation before being officially placed.',
            trackingProgress: 10,
            paymentReference: 'COD_PENDING_APPROVAL',
            voucherCode,
            fullName: data.fullName,
            address: data.address,
            barangay: data.barangay || '',
            city: data.city,
            province: data.province || '',
            postalCode: data.postalCode,
            items: {
              create: cartItems.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.product.price,
              })),
            },
          },
          include: { items: { include: { product: true } } },
        })

        await deductInventory(tx, cartItems)

        if (voucherCode) {
          await tx.voucher.updateMany({
            where: { code: voucherCode },
            data: { used: { increment: 1 } },
          })
        }

        await tx.cartItem.deleteMany({
          where: { id: { in: cartItems.map((item) => item.id) } },
        })

        return newOrder
      })

      // Non-blocking acknowledgement notification to customer
      emitNotification({
        userId: user.id,
        event: 'ORDER_STATUS_CHANGE',
        subject: `COD Order Request Received — ${order.orderNumber}`,
        body: `Thank you for your order! Your Cash on Delivery request for order ${order.orderNumber} (₱${total.toLocaleString()}) has been received and is awaiting administrator confirmation before the order is officially placed.`,
        channel: 'BOTH',
        recipientEmail: user.email,
        orderNumber: order.orderNumber,
        context: {
          orderNumber: order.orderNumber,
          customerName: `${user.firstName} ${user.lastName}`.trim() || user.email,
          status: 'Awaiting COD Approval',
          orderStatus: 'Awaiting COD Approval',
          orderTotal: `₱${total.toLocaleString()}`,
          orderDate: new Date(order.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' }),
          courierName: order.courierName,
          trackingNumber: 'Awaiting store approval',
        },
      }).catch(() => {})

      // Notify Store Administrators via AdminLog and in-app/email notifications
      prisma.adminLog?.create({
        data: {
          action: 'COD_REQUEST_RECEIVED',
          details: `New Cash on Delivery order request ${order.orderNumber} (₱${total.toLocaleString()}) submitted by ${data.fullName}. Requires administrator approval before order is officially placed.`,
          adminId: user.id,
          adminName: `${user.firstName} ${user.lastName} (Customer)`,
        },
      })?.catch(() => {})

      prisma.user?.findMany({
        where: { role: 'ADMIN' },
        select: { id: true, email: true },
      })?.then((admins) => {
        for (const adminUser of admins) {
          emitNotification({
            userId: adminUser.id,
            event: 'REPIXL_UPDATE',
            subject: `COD Approval Needed: ${order.orderNumber}`,
            body: `Customer ${data.fullName} placed a Cash on Delivery request for order ${order.orderNumber} (₱${total.toLocaleString()}). Please review and approve in Admin Orders.`,
            channel: 'BOTH',
            recipientEmail: adminUser.email,
            orderNumber: order.orderNumber,
          }).catch(() => {})
        }
      })?.catch(() => {})

      return successResponse(
        {
          success: true,
          orderNumber: order.orderNumber,
          isPaid: false,
          status: 'PROCESSING',
          deliveryStatus: 'Pending COD Approval',
          isCodPendingApproval: true,
          message: 'Cash on Delivery request submitted. Awaiting administrator approval.',
        },
        201
      )
    }

    // ── PayMongo Unconfigured / Demo Fallback ──────────────────────────────────
    if (!isPaymongoConfigured()) {
      const order = await prisma.order.create({
        data: {
          orderNumber,
          userId: user.id,
          status: 'PROCESSING',
          subtotal,
          shippingCost: data.shippingCost,
          discount,
          total,
          courierName: data.courierName,
          courierEstimate: data.courierEstimate,
          paymentMethod: isGcash ? 'GCash' : 'Credit / Debit Card',
          paymentStatus: 'PENDING',
          paymentReference: orderNumber,
          voucherCode,
          fullName: data.fullName,
          address: data.address,
          barangay: data.barangay || '',
          city: data.city,
          province: data.province || '',
          postalCode: data.postalCode,
          items: {
            create: cartItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.product.price,
            })),
          },
        },
      })

      await finalizePaidOrder(order.orderNumber)

      return successResponse(
        {
          success: true,
          orderNumber: order.orderNumber,
          isPaid: true,
          status: 'PAID',
        },
        201
      )
    }

    // ── PayMongo PIPM In-App Payment Flow ──────────────────────────────────────
    const pmType = isGcash ? 'gcash' : 'card'

    // Create Payment Intent
    const intent = await createPaymentIntent({
      amount: totalCentavos,
      currency: 'PHP',
      description: `RePXL order ${orderNumber}`,
      paymentMethodAllowed: [pmType],
      metadata: { orderNumber, userId: user.id },
    })

    // Create DB Order with PENDING status
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: user.id,
        status: 'PROCESSING',
        subtotal,
        shippingCost: data.shippingCost,
        discount,
        total,
        courierName: data.courierName,
        courierEstimate: data.courierEstimate,
        paymentMethod: isGcash ? 'GCash' : 'Credit / Debit Card',
        paymentStatus: 'PENDING',
        paymentIntentId: intent.id,
        paymentSessionId: intent.id,
        paymentReference: orderNumber,
        voucherCode,
        fullName: data.fullName,
        address: data.address,
        barangay: data.barangay || '',
        city: data.city,
        province: data.province || '',
        postalCode: data.postalCode,
        items: {
          create: cartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price,
          })),
        },
      },
    })

    // Create PayMongo Payment Method using customer input
    let paymentMethodRes
    if (isCard) {
      if (!data.card) {
        return errorResponse('Card details are required for card payments.', 400)
      }
      paymentMethodRes = await createPaymentMethod({
        type: 'card',
        card: {
          cardNumber: data.card.cardNumber,
          expMonth: data.card.expMonth,
          expYear: data.card.expYear,
          cvc: data.card.cvc,
        },
        billing: {
          name: data.card.cardholderName || data.fullName,
          email: user.email,
          phone: data.phone || '',
          address: {
            line1: data.address,
            city: data.city,
            state: data.province || data.city,
            postal_code: data.postalCode,
            country: 'PH',
          },
        },
        metadata: { orderNumber },
      })
    } else {
      // GCash
      paymentMethodRes = await createPaymentMethod({
        type: 'gcash',
        billing: {
          name: data.fullName,
          email: user.email,
          phone: data.gcash?.phone || data.phone || '',
        },
        metadata: { orderNumber },
      })
    }

    let returnUrl =
      data.returnUrl || `${siteUrl()}/checkout/success`
    if (!returnUrl.includes('order=')) {
      const sep = returnUrl.includes('?') ? '&' : '?'
      returnUrl = `${returnUrl}${sep}order=${orderNumber}`
    }

    // Attach Payment Method to Payment Intent
    const attached = await attachPaymentMethod(intent.id, {
      paymentMethodId: paymentMethodRes.id,
      clientKey: intent.attributes.client_key,
      returnUrl,
    })

    const attachedStatus = attached.attributes.status

    if (attachedStatus === 'succeeded') {
      // Direct payment succeeded (e.g. non-3DS or test mode)
      await finalizePaidOrder(order.orderNumber)
      return successResponse({
        success: true,
        orderNumber: order.orderNumber,
        isPaid: true,
        status: 'PAID',
        isTestMode: isTestMode(),
      })
    }

    if (attachedStatus === 'awaiting_next_action') {
      // 3DS OTP verification or GCash wallet authorization required
      const nextActionUrl = attached.attributes.next_action?.redirect?.url
      return successResponse({
        success: true,
        orderNumber: order.orderNumber,
        isPaid: false,
        status: 'AWAITING_NEXT_ACTION',
        nextActionUrl,
        intentId: intent.id,
        isTestMode: isTestMode(),
      })
    }

    if (attachedStatus === 'failed') {
      const failReason =
        attached.attributes.last_payment_error?.failed_message ||
        'Payment could not be processed. Please check your details and try again.'
      return errorResponse(failReason, 400)
    }

    // Default return for processing / pending
    return successResponse({
      success: true,
      orderNumber: order.orderNumber,
      isPaid: false,
      status: attachedStatus,
      intentId: intent.id,
      isTestMode: isTestMode(),
    })
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return errorResponse(error.message, 409)
    }
    console.error('Process payment error:', error)
    const msg = error instanceof Error ? error.message : 'Unable to process payment.'
    return errorResponse(msg, 400)
  }
}
