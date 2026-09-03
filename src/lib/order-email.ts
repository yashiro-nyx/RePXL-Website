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
 */

import { createTransporter, isMailerConfigured } from '@/lib/mailer'

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

// ─── HTML escape helper ──────────────────────────────────────────────────────────

function safe(s: string | number | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
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
      console.log(`  ${name} ×${item.quantity} @ ₱${item.price.toFixed(2)} = $${(item.price * item.quantity).toFixed(2)}`)
    }
    return
  }

  const dateStr = order.createdAt.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  // ── Build item rows ─────────────────────────────────────────────────────────
  const itemRowsHtml = order.items.map((item) => {
    const name = item.product?.name ?? 'Product'
    const lineTotal = item.price * item.quantity
    return `
    <tr style="border-bottom:1px solid rgba(140,133,128,0.06);">
      <td style="padding:10px 0;font-family:sans-serif;font-size:13px;color:#f5f1ec;">${safe(name)}</td>
      <td style="padding:10px 0;font-family:monospace;font-size:13px;color:#8c8580;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 0;font-family:monospace;font-size:13px;color:#8c8580;text-align:right;">₱${item.price.toFixed(2)}</td>
      <td style="padding:10px 0;font-family:monospace;font-size:13px;color:#f5f1ec;text-align:right;">₱${lineTotal.toFixed(2)}</td>
    </tr>`
  }).join('')

  const itemsText = order.items.map((item) => {
    const name = item.product?.name ?? 'Product'
    return `  ${name} x${item.quantity} @ ₱${item.price.toFixed(2)} = $${(item.price * item.quantity).toFixed(2)}`
  }).join('\n')

  const discountRow = order.discount > 0
    ? `<tr>
        <td style="padding:4px 0;font-family:sans-serif;font-size:13px;color:#5A6E4E;">Discount</td>
        <td style="padding:4px 0;font-family:monospace;font-size:13px;color:#5A6E4E;text-align:right;">-₱${order.discount.toFixed(2)}</td>
       </tr>`
    : ''

  const discountText = order.discount > 0
    ? `Discount        : -₱${order.discount.toFixed(2)}\n`
    : ''

  // ── HTML template ───────────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Order Confirmation</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0806;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#0a0806">
  <tr>
    <td align="center" style="padding:48px 20px 40px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;">

        <!-- Wordmark -->
        <tr>
          <td align="center" style="padding-bottom:32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border:1px solid rgba(245,241,236,0.22);padding:7px 18px;">
                  <span style="font-family:Georgia,serif;font-size:20px;font-weight:700;letter-spacing:1px;color:#f5f1ec;">RePXL</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background-color:#16131a;border:1px solid rgba(140,133,128,0.14);border-top:3px solid #c22c2c;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="padding:40px 36px 36px;">

                  <!-- Heading -->
                  <h1 style="margin:0 0 6px;font-family:Georgia,serif;font-size:24px;font-weight:700;color:#f5f1ec;">Order Confirmed</h1>
                  <p style="margin:0 0 28px;font-family:sans-serif;font-size:14px;line-height:1.65;color:#8c8580;">
                    Thank you, <strong style="color:#f5f1ec;">${safe(order.fullName)}</strong>. Your payment has been received and your order is being prepared.
                  </p>

                  <!-- Order meta -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;border:1px solid rgba(140,133,128,0.12);">
                    <tr>
                      <td style="padding:12px 14px;border-bottom:1px solid rgba(140,133,128,0.10);">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td width="50%">
                              <p style="margin:0 0 2px;font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;">Order Number</p>
                              <p style="margin:0;font-family:monospace;font-size:13px;font-weight:700;color:#c22c2c;">${safe(order.orderNumber)}</p>
                            </td>
                            <td width="50%">
                              <p style="margin:0 0 2px;font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;">Date</p>
                              <p style="margin:0;font-family:sans-serif;font-size:13px;color:#f5f1ec;">${safe(dateStr)}</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:12px 14px;">
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

                  <!-- Items header -->
                  <p style="margin:0 0 8px;font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;">Items Ordered</p>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;">
                    <tr style="border-bottom:1px solid rgba(140,133,128,0.12);">
                      <td style="padding:5px 0;font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;">Item</td>
                      <td style="padding:5px 0;font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;text-align:center;">Qty</td>
                      <td style="padding:5px 0;font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;text-align:right;">Unit</td>
                      <td style="padding:5px 0;font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;text-align:right;">Total</td>
                    </tr>
                    ${itemRowsHtml}
                  </table>

                  <!-- Totals -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;border-top:1px solid rgba(140,133,128,0.12);padding-top:10px;">
                    <tr>
                      <td style="padding:3px 0;font-family:sans-serif;font-size:13px;color:#8c8580;">Subtotal</td>
                      <td style="padding:3px 0;font-family:monospace;font-size:13px;color:#f5f1ec;text-align:right;">₱${order.subtotal.toFixed(2)}</td>
                    </tr>
                    ${discountRow}
                    <tr>
                      <td style="padding:3px 0;font-family:sans-serif;font-size:13px;color:#8c8580;">Shipping (${safe(order.courierName)})</td>
                      <td style="padding:3px 0;font-family:monospace;font-size:13px;color:#f5f1ec;text-align:right;">₱${order.shippingCost.toFixed(2)}</td>
                    </tr>
                    <tr style="border-top:1px solid rgba(140,133,128,0.12);">
                      <td style="padding:8px 0 0;font-family:sans-serif;font-size:15px;font-weight:700;color:#f5f1ec;">Total</td>
                      <td style="padding:8px 0 0;font-family:monospace;font-size:17px;font-weight:700;color:#f5f1ec;text-align:right;">₱${order.total.toFixed(2)}</td>
                    </tr>
                  </table>

                  <!-- Shipping address -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid rgba(140,133,128,0.12);">
                    <tr>
                      <td style="padding:14px 16px;">
                        <p style="margin:0 0 6px;font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;">Shipping Address</p>
                        <p style="margin:0;font-family:sans-serif;font-size:13px;line-height:1.7;color:#f5f1ec;">
                          ${safe(order.fullName)}<br/>
                          ${safe(order.address)}${order.barangay ? `<br/>${safe(order.barangay)}` : ''}<br/>
                          ${safe(order.city)}${order.province ? `, ${safe(order.province)}` : ''}<br/>
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

        <!-- Footer -->
        <tr>
          <td align="center" style="padding-top:28px;">
            <p style="margin:0 0 4px;font-family:monospace;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:rgba(140,133,128,0.4);">
              &copy; ${new Date().getFullYear()} RePXL
            </p>
            <p style="margin:0;font-family:sans-serif;font-size:11px;color:rgba(140,133,128,0.3);">
              Vintage Digital Cameras &middot; Condition-graded &middot; Serial-verified
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`

  // ── Plain-text fallback ─────────────────────────────────────────────────────
  const text = [
    `ORDER CONFIRMED — ${order.orderNumber}`,
    '',
    `Thank you, ${order.fullName}. Your payment has been received.`,
    '',
    `Order Number : ${order.orderNumber}`,
    `Date         : ${dateStr}`,
    `Payment      : ${order.paymentMethod}`,
    `Status       : Paid & Processing`,
    '',
    'ITEMS ORDERED',
    '─────────────',
    ...order.items.map((i) => {
      const name = i.product?.name ?? 'Product'
      return `  ${name} x${i.quantity} @ ₱${i.price.toFixed(2)} = ₱${(i.price * i.quantity).toFixed(2)}`
    }),
    '',
    'ORDER TOTAL',
    '───────────',
    `Subtotal        : ₱${order.subtotal.toFixed(2)}`,
    discountText.trimEnd(),
    `Shipping (${order.courierName}) : ₱${order.shippingCost.toFixed(2)}`,
    `Total           : ₱${order.total.toFixed(2)}`,
    '',
    'SHIPPING ADDRESS',
    '────────────────',
    order.fullName,
    order.address,
    order.barangay ? order.barangay : '',
    `${order.city}${order.province ? `, ${order.province}` : ''}`,
    order.postalCode,
    '',
    `© ${new Date().getFullYear()} RePXL — Vintage Digital Cameras`,
  ].filter((line) => line !== null).join('\n')

  // ── Send with up to 3 retries ───────────────────────────────────────────────
  const MAX_ATTEMPTS = 3
  let lastErr: unknown
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const transporter = createTransporter()
      await transporter.sendMail({
        from: `"RePXL" <${process.env.GMAIL_USER}>`,
        to: order.userEmail,
        subject: `Order Confirmed — ${order.orderNumber}`,
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
