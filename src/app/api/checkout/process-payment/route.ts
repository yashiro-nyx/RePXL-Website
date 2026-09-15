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

      // Non-blocking notification
      emitNotification({
        userId: user.id,
        event: 'ORDER_CONFIRMATION',
        subject: `Order Confirmed — ${order.orderNumber}`,
        body: `Your order ${order.orderNumber} has been placed via Cash on Delivery.`,
        channel: 'BOTH',
        recipientEmail: user.email,
      }).catch(() => {})

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
        items: order.items.map((i) => ({
          product: { name: i.product.name },
          quantity: i.quantity,
          price: i.price,
        })),
        userEmail: user.email,
      }).catch(() => {})

      return successResponse(
        {
          success: true,
          orderNumber: order.orderNumber,
          isPaid: false,
          status: 'PROCESSING',
          message: 'Order placed with Cash on Delivery',
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

    const returnUrl =
      data.returnUrl || `${siteUrl()}/checkout/success?order=${orderNumber}`

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
    })
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return errorResponse(error.message, 409)
    }
    console.error('Process payment error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Unable to process payment.',
      400
    )
  }
}
