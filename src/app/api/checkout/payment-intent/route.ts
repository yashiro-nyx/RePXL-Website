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
  createPaymentIntent,
} from '@/lib/paymongo'

export const dynamic = 'force-dynamic'

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `RPX-${timestamp}${random}`
}

/**
 * POST /api/checkout/payment-intent
 *
 * Embedded PIPM flow: creates a PENDING order in the DB and a PayMongo
 * Payment Intent. Returns { clientKey, intentId, orderNumber } to the
 * frontend. The frontend then creates a Payment Method (client-side, using
 * the public key) and attaches it to the intent — card details never touch
 * our backend.
 *
 * This replaces the hosted-checkout-session approach for card payments.
 * For e-wallets the same intent is used; the frontend handles the
 * next_action.redirect.url in a contained modal.
 */
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
      where: {
        userId: user.id,
        // If the client sent a list of selected product slugs, restrict the
        // DB cart query to only those products. The server resolves slugs →
        // productIds internally so we never trust client-supplied prices.
        ...(data.selectedProductIds && data.selectedProductIds.length > 0
          ? {
              product: {
                slug: { in: data.selectedProductIds },
              },
            }
          : {}),
      },
      include: { product: true },
    })
    if (cartItems.length === 0) return errorResponse('No matching items found in cart. Please go back and re-select your items.', 400)

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

    // Voucher validation (usage increment deferred to payment.paid webhook).
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

    // Map payment method label → PayMongo type
    const methodTypeMap: Record<string, string> = {
      'Credit / Debit Card': 'card',
      'card': 'card',
      'GCash': 'gcash',
      'gcash': 'gcash',
      'GrabPay': 'grab_pay',
      'grab_pay': 'grab_pay',
      'Maya': 'paymaya',
      'paymaya': 'paymaya',
      'PayPal': 'card', // fallback to card for demo
    }
    const pmType = methodTypeMap[data.paymentMethod] ?? 'card'

    // Create Payment Intent on PayMongo (server-side, secret key).
    const intent = await createPaymentIntent({
      amount: totalCentavos,
      currency: 'PHP',
      description: `RePXL order ${orderNumber}`,
      paymentMethodAllowed: [pmType],
      metadata: { orderNumber, userId: user.id },
    })

    // Persist the PENDING order now so it exists when the webhook fires.
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
        barangay: data.barangay,
        city: data.city,
        province: data.province,
        postalCode: data.postalCode,
        paymentStatus: 'PENDING',
        paymentIntentId: intent.id,
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

    // Keep session ID field in sync (used by existing webhook handler).
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentSessionId: intent.id },
    })

    return successResponse({
      clientKey: intent.attributes.client_key,
      intentId: intent.id,
      orderNumber,
      total,
    })
  } catch (error) {
    console.error('Create payment intent error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to start payment',
      500
    )
  }
}
