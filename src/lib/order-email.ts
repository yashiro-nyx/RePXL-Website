/**
 * src/lib/order-email.ts
 *
 * Shared order-confirmation email sender used by:
 *   - /api/checkout/verify  (server-side payment verification, primary path)
 *   - /api/webhooks/paymongo (PayMongo webhook, backup path)
 *
 * Both routes call sendOrderConfirmationEmail() with the same shape so the
 * customer always receives an identical, complete email regardless of which
 * finalization path runs first.
 *
 * The email content/layout is produced by the shared RePXL email design system
 * (`src/lib/email`). This module only owns the data-shaping, dev-mode logging,
 * and SMTP send/retry behavior — the sending infrastructure is unchanged.
 */

import { createTransporter, isMailerConfigured } from '@/lib/mailer'
import { buildOrderConfirmationEmail } from '@/lib/email'

export interface OrderEmailItem {
  quantity: number
  price: number      // unit price at time of purchase
  product: { name: string } | null
}

export interface OrderEmailData {
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
  discount: number
  total: number
  items: OrderEmailItem[]
  userEmail: string
}

// ─── Email sender ────────────────────────────────────────────────────────────────

/**
 * Send an order-confirmation email with a full HTML receipt.
 * Retries up to 3 times for transient SMTP failures.
 * Throws on final failure so the caller can log it; does NOT affect order state.
 */
export async function sendOrderConfirmationEmail(order: OrderEmailData): Promise<void> {
  if (!isMailerConfigured()) {
    // Dev/staging — log to console instead of sending
    console.log('\n[RePXL Order Confirmation — DEV MODE]')
    console.log(`Order : ${order.orderNumber}`)
    console.log(`To    : ${order.userEmail}`)
    console.log(`Total : ₱${order.total.toFixed(2)}`)
    for (const item of order.items) {
      const name = item.product?.name ?? 'Product'
      console.log(`  ${name} ×${item.quantity} @ ₱${item.price.toFixed(2)} = ₱${(item.price * item.quantity).toFixed(2)}`)
    }
    return
  }

  // Build the shipping address lines from validated data only (omit blanks).
  const addressLines = [
    order.fullName,
    order.address,
    order.barangay || '',
    [order.city, order.province].filter(Boolean).join(', '),
    order.postalCode || '',
  ].filter((l) => l && l.trim().length > 0)

  const { subject, html, text } = buildOrderConfirmationEmail({
    orderNumber: order.orderNumber,
    customerName: order.fullName,
    createdAt: order.createdAt,
    paymentMethod: order.paymentMethod,
    items: order.items.map((i) => ({
      name: i.product?.name ?? 'Product',
      quantity: i.quantity,
      price: i.price,
    })),
    subtotal: order.subtotal,
    shippingCost: order.shippingCost,
    discount: order.discount,
    total: order.total,
    courierName: order.courierName,
    shippingAddressLines: addressLines,
  })

  // ── Send with up to 3 retries ───────────────────────────────────────────────
  const MAX_ATTEMPTS = 3
  let lastErr: unknown
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const transporter = createTransporter()
      await transporter.sendMail({
        from: `"RePXL" <${process.env.GMAIL_USER}>`,
        to: order.userEmail,
        subject,
        html,
        text,
      })
      console.log(`[order-email] Confirmation email sent to ${order.userEmail} for order ${order.orderNumber} (attempt ${attempt})`)
      return // success
    } catch (err) {
      lastErr = err
      console.warn(`[order-email] Email attempt ${attempt}/${MAX_ATTEMPTS} failed for order ${order.orderNumber}:`, err)
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 1000 * attempt))
      }
    }
  }
  throw lastErr
}
