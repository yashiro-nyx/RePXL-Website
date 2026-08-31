import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  verifyWebhookSignature,
  type PaymongoWebhookEvent,
} from '@/lib/paymongo'
import { createTransporter, isMailerConfigured } from '@/lib/mailer'

// Webhooks must run per-request and read the raw body for signature verification.
export const dynamic = 'force-dynamic'

// Track processed event ids in-process as a fast idempotency short-circuit.
// The durable guard is the order's paymentStatus check below.
const processedEvents = new Set<string>()

// POST /api/webhooks/paymongo
// Receives PayMongo events. On a successful payment, finalizes the matching
// order: marks it PAID, decrements stock, increments voucher usage, clears the
// user's cart — all idempotently. Then sends a confirmation email.
export async function POST(request: NextRequest) {
  // 1) Read the RAW body BEFORE parsing (signature is over the exact bytes).
  const rawBody = await request.text()
  const signature = request.headers.get('paymongo-signature')

  const verification = verifyWebhookSignature(
    rawBody,
    signature,
    process.env.PAYMONGO_WEBHOOK_SECRET
  )
  if (!verification.valid) {
    console.warn('[paymongo webhook] rejected:', verification.reason)
    return NextResponse.json({ received: false }, { status: 401 })
  }

  let event: PaymongoWebhookEvent
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ received: false }, { status: 400 })
  }

  const eventId = event.data?.id
  const type = event.data?.attributes?.type

  // 2) Acknowledge fast + idempotency short-circuit.
  if (eventId && processedEvents.has(eventId)) {
    return NextResponse.json({ received: true, duplicate: true })
  }
  if (eventId) processedEvents.add(eventId)

  try {
    if (type === 'checkout_session.payment.paid' || type === 'payment.paid') {
      const resource = event.data.attributes.data.attributes
      // reference_number is our order number (set on the checkout session).
      const orderNumber =
        resource.reference_number ??
        resource.metadata?.orderNumber ??
        resource.payment_intent?.attributes?.metadata?.orderNumber

      if (orderNumber) {
        await finalizePaidOrder(orderNumber)
      }
    } else if (type === 'payment.failed') {
      const resource = event.data.attributes.data.attributes
      const orderNumber = resource.reference_number ?? resource.metadata?.orderNumber
      if (orderNumber) {
        await prisma.order
          .updateMany({
            where: { orderNumber, paymentStatus: 'PENDING' },
            data: { paymentStatus: 'FAILED', status: 'CANCELLED' },
          })
          .catch(() => undefined)
      }
    }
  } catch (err) {
    // Log but still return 2xx-ish? No — return 500 so PayMongo retries.
    console.error('[paymongo webhook] processing error:', err)
    return NextResponse.json({ received: false }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

/**
 * Idempotently finalize an order once payment is confirmed:
 * flips PENDING → PAID, decrements product stock, increments voucher usage, and
 * clears the buyer's cart. The paymentStatus guard makes re-delivery a no-op.
 * After the transaction succeeds, sends a confirmation email (non-blocking).
 */
async function finalizePaidOrder(orderNumber: string): Promise<void> {
  // Fetch full order with items + user outside the transaction first, so we
  // have the email address available for the confirmation email.
  const orderBefore = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: { include: { product: true } },
      user: { select: { email: true } },
    },
  })
  if (!orderBefore) {
    console.warn(`[paymongo webhook] order not found: ${orderNumber}`)
    return
  }
  if (orderBefore.paymentStatus === 'PAID') {
    // Already processed — idempotent no-op.
    console.info(`[paymongo webhook] order already PAID, skipping: ${orderNumber}`)
    return
  }

  // Run the state-changing work inside a transaction so stock/status/cart are
  // always consistent even if something fails mid-way.
  await prisma.$transaction(async (tx) => {
    // Re-check inside the transaction to handle concurrent webhook deliveries.
    const order = await tx.order.findUnique({
      where: { orderNumber },
      include: { items: true },
    })
    if (!order || order.paymentStatus === 'PAID') return

    await tx.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'PAID', status: 'PROCESSING' },
    })

    // Decrement stock for each purchased item using the actual quantity stored
    // on the OrderItem row. We use updateMany with a stock >= quantity guard so
    // the decrement can never make stock negative. If stock was already depleted
    // (e.g. a concurrent order), we floor at 0 via a separate update.
    for (const item of order.items) {
      // Try the safe decrement first (only applies when stock >= quantity).
      const updated = await tx.product.updateMany({
        where: { id: item.productId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      })

      if (updated.count === 0) {
        // Stock was less than the purchased quantity — floor it at 0 rather
        // than allowing it to go negative.
        await tx.product.updateMany({
          where: { id: item.productId, stock: { gt: 0 } },
          data: { stock: 0 },
        })
      }
    }

    // Increment voucher usage if one was applied.
    if (order.voucherCode) {
      await tx.voucher
        .updateMany({
          where: { code: order.voucherCode },
          data: { used: { increment: 1 } },
        })
        .catch(() => undefined)
    }

    // Clear the buyer's cart.
    await tx.cartItem.deleteMany({ where: { userId: order.userId } })
  })

  // Send confirmation email outside the transaction so a mail failure does
  // NOT roll back the order finalization.
  await sendConfirmationEmail(orderBefore).catch((err) => {
    console.error('[paymongo webhook] confirmation email failed (non-fatal):', err)
  })
}

// ─── Confirmation email ─────────────────────────────────────────────────────────

interface OrderWithItemsAndUser {
  orderNumber: string
  createdAt: Date
  fullName: string
  address: string
  barangay: string
  city: string
  province: string
  postalCode: string
  paymentMethod: string
  courierName: string
  subtotal: number
  shippingCost: number
  total: number
  items: Array<{
    quantity: number
    price: number // unit price snapshot
    product: {
      name: string
    } | null
  }>
  user: { email: string } | null
}

async function sendConfirmationEmail(order: OrderWithItemsAndUser): Promise<void> {
  const email = order.user?.email
  if (!email) {
    console.warn('[paymongo webhook] no user email for order:', order.orderNumber)
    return
  }

  if (!isMailerConfigured()) {
    // Dev mode — log to console instead of sending.
    console.log('\n[RePXL Order Confirmation — DEV MODE]')
    console.log(`Order: ${order.orderNumber} → ${email}`)
    console.log(`Total: $${order.total}`)
    console.log('Items:')
    for (const item of order.items) {
      console.log(`  ${item.product?.name ?? 'Unknown'} × ${item.quantity} @ $${item.price} = $${item.price * item.quantity}`)
    }
    return
  }

  const safe = (s: string) =>
    String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const dateStr = order.createdAt.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const itemRows = order.items.map((item) => {
    const name = item.product?.name ?? 'Product'
    const lineTotal = item.price * item.quantity
    return `
    <tr style="border-bottom:1px solid rgba(140,133,128,0.06);">
      <td style="padding:10px 0;font-family:sans-serif;font-size:13px;color:#f5f1ec;">${safe(name)}</td>
      <td style="padding:10px 0;font-family:monospace;font-size:13px;color:#8c8580;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 0;font-family:monospace;font-size:13px;color:#8c8580;text-align:right;">$${item.price.toFixed(2)}</td>
      <td style="padding:10px 0;font-family:monospace;font-size:13px;color:#f5f1ec;text-align:right;">$${lineTotal.toFixed(2)}</td>
    </tr>`
  }).join('')

  const itemsText = order.items.map((item) => {
    const name = item.product?.name ?? 'Product'
    return `  ${name} ×${item.quantity} @ $${item.price.toFixed(2)} = $${(item.price * item.quantity).toFixed(2)}`
  }).join('\n')

  const transporter = createTransporter()
  await transporter.sendMail({
    from: `"RePXL" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `Order Confirmed — ${order.orderNumber}`,
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Order Confirmation</title></head>
<body style="margin:0;padding:0;background-color:#0a0806;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#0a0806">
  <tr>
    <td align="center" style="padding:48px 20px 40px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;">
        <tr>
          <td align="center" style="padding-bottom:36px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border:1px solid rgba(245,241,236,0.22);padding:7px 16px;">
                  <span style="font-family:Georgia,serif;font-size:21px;font-weight:700;color:#f5f1ec;">RePXL</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background-color:#16131a;border:1px solid rgba(140,133,128,0.14);border-top:3px solid #c22c2c;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="padding:44px 40px 40px;">
                  <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:700;color:#f5f1ec;">Order Confirmed</h1>
                  <p style="margin:0 0 32px;font-family:sans-serif;font-size:15px;line-height:1.65;color:#8c8580;">
                    Thank you, <strong style="color:#f5f1ec;">${safe(order.fullName)}</strong>. We&apos;ve received your payment and are preparing your order.
                  </p>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:28px;border:1px solid rgba(140,133,128,0.12);">
                    <tr>
                      <td style="padding:12px 16px;border-bottom:1px solid rgba(140,133,128,0.12);">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td width="50%">
                              <p style="margin:0 0 2px;font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;">Order Number</p>
                              <p style="margin:0;font-family:monospace;font-size:14px;font-weight:700;color:#c22c2c;">${safe(order.orderNumber)}</p>
                            </td>
                            <td width="50%">
                              <p style="margin:0 0 2px;font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;">Order Date</p>
                              <p style="margin:0;font-family:sans-serif;font-size:13px;color:#f5f1ec;">${safe(dateStr)}</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:12px 16px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td width="50%">
                              <p style="margin:0 0 2px;font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;">Payment</p>
                              <p style="margin:0;font-family:sans-serif;font-size:13px;color:#f5f1ec;">${safe(order.paymentMethod)}</p>
                            </td>
                            <td width="50%">
                              <p style="margin:0 0 2px;font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;">Status</p>
                              <p style="margin:0;font-family:sans-serif;font-size:13px;color:#5A6E4E;">Paid &amp; Processing</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:0 0 10px;font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;">Order Items</p>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:28px;">
                    <tr style="border-bottom:1px solid rgba(140,133,128,0.12);">
                      <td style="padding:6px 0;font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;">Item</td>
                      <td style="padding:6px 0;font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;text-align:center;">Qty</td>
                      <td style="padding:6px 0;font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;text-align:right;">Unit Price</td>
                      <td style="padding:6px 0;font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;text-align:right;">Total</td>
                    </tr>
                    ${itemRows}
                  </table>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:28px;border-top:1px solid rgba(140,133,128,0.12);padding-top:12px;">
                    <tr>
                      <td style="padding:4px 0;font-family:sans-serif;font-size:13px;color:#8c8580;">Subtotal</td>
                      <td style="padding:4px 0;font-family:monospace;font-size:13px;color:#f5f1ec;text-align:right;">$${order.subtotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;font-family:sans-serif;font-size:13px;color:#8c8580;">Shipping (${safe(order.courierName)})</td>
                      <td style="padding:4px 0;font-family:monospace;font-size:13px;color:#f5f1ec;text-align:right;">$${order.shippingCost.toFixed(2)}</td>
                    </tr>
                    <tr style="border-top:1px solid rgba(140,133,128,0.12);">
                      <td style="padding:8px 0 0;font-family:sans-serif;font-size:15px;font-weight:700;color:#f5f1ec;">Total</td>
                      <td style="padding:8px 0 0;font-family:monospace;font-size:18px;font-weight:700;color:#f5f1ec;text-align:right;">$${order.total.toFixed(2)}</td>
                    </tr>
                  </table>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid rgba(140,133,128,0.12);">
                    <tr>
                      <td style="padding:16px;">
                        <p style="margin:0 0 8px;font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;">Shipping Address</p>
                        <p style="margin:0;font-family:sans-serif;font-size:13px;line-height:1.7;color:#f5f1ec;">
                          ${safe(order.fullName)}<br/>
                          ${safe(order.address)}<br/>
                          ${safe(order.barangay)}<br/>
                          ${safe(order.city)}, ${safe(order.province)}<br/>
                          ${safe(order.postalCode)}
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top:32px;">
            <p style="margin:0 0 5px;font-family:monospace;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:rgba(140,133,128,0.45);">&copy; ${new Date().getFullYear()} RePXL</p>
            <p style="margin:0;font-family:sans-serif;font-size:11px;color:rgba(140,133,128,0.35);">Vintage Digital Cameras &middot; Condition-graded &middot; Serial-verified</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`,
    text: `ORDER CONFIRMED — ${order.orderNumber}\n\nThank you, ${order.fullName}. Your payment was received.\n\nOrder: ${order.orderNumber}\nDate: ${dateStr}\nPayment: ${order.paymentMethod}\nStatus: Paid & Processing\n\nItems:\n${itemsText}\n\nSubtotal: $${order.subtotal.toFixed(2)}\nShipping (${order.courierName}): $${order.shippingCost.toFixed(2)}\nTotal: $${order.total.toFixed(2)}\n\nShip to:\n${order.fullName}\n${order.address}\n${order.barangay}\n${order.city}, ${order.province} ${order.postalCode}\n\n© ${new Date().getFullYear()} RePXL`,
  })

  console.log(`[paymongo webhook] confirmation email sent to ${email} for order ${order.orderNumber}`)
}
