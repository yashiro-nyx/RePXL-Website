import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationError,
} from '@/lib/api'
import { getCurrentUser } from '@/lib/auth-helpers'
import { createOrderSchema } from '@/lib/validations'
import {
  isPaymongoConfigured,
  createCheckoutSession,
  type CheckoutLineItem,
} from '@/lib/paymongo'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `RPX-${timestamp}${random}`
}

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  )
}

// POST /api/checkout/session
// Creates a PENDING order from the user's cart and a PayMongo hosted checkout
// session. Returns { checkoutUrl, orderNumber }. Stock is only decremented and
// the cart cleared once payment is confirmed via the webhook.
export async function POST(request: NextRequest) {
  try {
    if (!isPaymongoConfigured()) {
      return errorResponse('Online payment is not configured.', 503)
    }

    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()

    const body = await request.json()
    const parsed = createOrderSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error)
    const data = parsed.data

    const cartItems = await prisma.cartItem.findMany({
      where: { userId: user.id },
      include: { product: true },
    })
    if (cartItems.length === 0) return errorResponse('Cart is empty', 400)

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

    // Apply voucher (validation only — usage increment happens on payment.paid).
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

    const total = subtotal + data.shippingCost - discount
    const orderNumber = generateOrderNumber()

    // Create the order in PENDING payment state (no stock change yet).
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
        paymentMethod: data.paymentMethod,
        voucherCode,
        fullName: data.fullName,
        address: data.address,
        city: data.city,
        postalCode: data.postalCode,
        paymentStatus: 'PENDING',
        paymentReference: orderNumber,
        items: {
          create: cartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price,
          })),
        },
      },
    })

    // Build PayMongo line items (amounts in centavos). Fold shipping into a line
    // and subtract discount from the first item so the session total matches.
    const lineItems: CheckoutLineItem[] = cartItems.map((item) => ({
      name: item.product.name,
      quantity: item.quantity,
      amount: Math.round(item.product.price * 100),
      currency: 'PHP',
      description: `${item.product.brand} · ${item.product.condition}`,
    }))
    if (data.shippingCost > 0) {
      lineItems.push({
        name: `Shipping — ${data.courierName}`,
        quantity: 1,
        amount: Math.round(data.shippingCost * 100),
        currency: 'PHP',
      })
    }
    if (discount > 0) {
      // PayMongo has no negative line items; represent the discount by reducing
      // the first item's unit amount, guarding against going below 0.
      const first = lineItems[0]
      const reduced = Math.max(0, first.amount * first.quantity - Math.round(discount * 100))
      first.amount = Math.round(reduced / first.quantity)
    }

    const session = await createCheckoutSession({
      lineItems,
      successUrl: `${siteUrl()}/checkout/success?order=${orderNumber}`,
      cancelUrl: `${siteUrl()}/checkout?cancelled=${orderNumber}`,
      referenceNumber: orderNumber,
      description: `RePXL order ${orderNumber}`,
      metadata: { orderNumber, userId: user.id },
    })

    await prisma.order.update({
      where: { id: order.id },
      data: { paymentSessionId: session.id },
    })

    return successResponse({
      checkoutUrl: session.attributes.checkout_url,
      orderNumber,
      sessionId: session.id,
    })
  } catch (error) {
    console.error('Create checkout session error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to start checkout',
      500
    )
  }
}
