import { NextRequest, NextResponse } from 'next/server'
import { createTransporter, isMailerConfigured } from '@/lib/mailer'

interface OrderItem {
  name: string
  quantity: number
  price: number
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      orderNumber, date, email, fullName, phone,
      address, barangay, city, province, postalCode,
      paymentMethod, courierName,
      items, subtotal, shippingCost, total,
    } = body

    // Validate required fields
    if (!orderNumber || !email || !fullName || !items?.length) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 })
    }

    const safe = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    if (isMailerConfigured()) {
      const transporter = createTransporter()

      await transporter.sendMail({
        from: `"RePXL" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: `Order Confirmed — ${orderNumber}`,
        html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Order Confirmation</title></head>
<body style="margin:0;padding:0;background-color:#0a0806;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#0a0806">
  <tr>
    <td align="center" style="padding:48px 20px 40px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;">

        <!-- Wordmark -->
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

        <!-- Card -->
        <tr>
          <td style="background-color:#16131a;border:1px solid rgba(140,133,128,0.14);border-top:3px solid #c22c2c;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="padding:44px 40px 40px;">

                  <!-- Heading -->
                  <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:700;color:#f5f1ec;">Order Confirmed</h1>
                  <p style="margin:0 0 32px;font-family:sans-serif;font-size:15px;line-height:1.65;color:#8c8580;">
                    Thank you, <strong style="color:#f5f1ec;">${safe(fullName)}</strong>. We&apos;ve received your order and are preparing it for processing.
                  </p>

                  <!-- Order meta -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:28px;border:1px solid rgba(140,133,128,0.12);">
                    <tr>
                      <td style="padding:12px 16px;border-bottom:1px solid rgba(140,133,128,0.12);">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td width="50%">
                              <p style="margin:0 0 2px;font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;">Order Number</p>
                              <p style="margin:0;font-family:monospace;font-size:14px;font-weight:700;color:#c22c2c;">${safe(orderNumber)}</p>
                            </td>
                            <td width="50%">
                              <p style="margin:0 0 2px;font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;">Order Date</p>
                              <p style="margin:0;font-family:sans-serif;font-size:13px;color:#f5f1ec;">${safe(date)}</p>
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
                              <p style="margin:0;font-family:sans-serif;font-size:13px;color:#f5f1ec;">${safe(paymentMethod)}</p>
                            </td>
                            <td width="50%">
                              <p style="margin:0 0 2px;font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;">Status</p>
                              <p style="margin:0;font-family:sans-serif;font-size:13px;color:#f5f1ec;">Processing</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Order items -->
                  <p style="margin:0 0 10px;font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;">Order Items</p>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:28px;">
                    <tr style="border-bottom:1px solid rgba(140,133,128,0.12);">
                      <td style="padding:6px 0;font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;">Item</td>
                      <td style="padding:6px 0;font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;text-align:center;">Qty</td>
                      <td style="padding:6px 0;font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;text-align:right;">Price</td>
                      <td style="padding:6px 0;font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;text-align:right;">Total</td>
                    </tr>
                    ${(items as OrderItem[]).map((item) => `
                    <tr style="border-bottom:1px solid rgba(140,133,128,0.06);">
                      <td style="padding:10px 0;font-family:sans-serif;font-size:13px;color:#f5f1ec;">${safe(item.name)}</td>
                      <td style="padding:10px 0;font-family:monospace;font-size:13px;color:#8c8580;text-align:center;">${item.quantity}</td>
                      <td style="padding:10px 0;font-family:monospace;font-size:13px;color:#8c8580;text-align:right;">$${item.price}</td>
                      <td style="padding:10px 0;font-family:monospace;font-size:13px;color:#f5f1ec;text-align:right;">$${item.price * item.quantity}</td>
                    </tr>`).join('')}
                  </table>

                  <!-- Order summary -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:28px;border-top:1px solid rgba(140,133,128,0.12);padding-top:12px;">
                    <tr>
                      <td style="padding:4px 0;font-family:sans-serif;font-size:13px;color:#8c8580;">Subtotal</td>
                      <td style="padding:4px 0;font-family:monospace;font-size:13px;color:#f5f1ec;text-align:right;">$${subtotal}</td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;font-family:sans-serif;font-size:13px;color:#8c8580;">Shipping (${safe(courierName)})</td>
                      <td style="padding:4px 0;font-family:monospace;font-size:13px;color:#f5f1ec;text-align:right;">$${shippingCost}</td>
                    </tr>
                    <tr style="border-top:1px solid rgba(140,133,128,0.12);">
                      <td style="padding:8px 0 0;font-family:sans-serif;font-size:15px;font-weight:700;color:#f5f1ec;">Total</td>
                      <td style="padding:8px 0 0;font-family:monospace;font-size:18px;font-weight:700;color:#f5f1ec;text-align:right;">$${total}</td>
                    </tr>
                  </table>

                  <!-- Shipping address -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:12px;border:1px solid rgba(140,133,128,0.12);padding:16px;">
                    <tr>
                      <td>
                        <p style="margin:0 0 8px;font-family:monospace;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;">Shipping Address</p>
                        <p style="margin:0;font-family:sans-serif;font-size:13px;line-height:1.7;color:#f5f1ec;">
                          ${safe(fullName)}<br/>
                          ${phone ? `${safe(phone)}<br/>` : ''}
                          ${safe(address)}<br/>
                          ${safe(barangay)}<br/>
                          ${safe(city)}, ${safe(province)}<br/>
                          ${safe(postalCode)}
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
          <td align="center" style="padding-top:32px;">
            <p style="margin:0 0 5px;font-family:monospace;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:rgba(140,133,128,0.45);">&copy; ${new Date().getFullYear()} RePXL</p>
            <p style="margin:0 0 5px;font-family:sans-serif;font-size:11px;color:rgba(140,133,128,0.35);">Vintage Digital Cameras</p>
            <p style="margin:0;font-family:sans-serif;font-size:10px;color:rgba(140,133,128,0.28);">Condition-graded &middot; Serial-verified &middot; Trusted by collectors</p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`,
        text: `ORDER CONFIRMED — ${orderNumber}\n\nThank you, ${fullName}. We've received your order.\n\nOrder Number: ${orderNumber}\nDate: ${date}\nPayment: ${paymentMethod}\nStatus: Processing\n\nItems:\n${(items as OrderItem[]).map((i) => `  ${i.name} x${i.quantity} — $${i.price * i.quantity}`).join('\n')}\n\nSubtotal: $${subtotal}\nShipping (${courierName}): $${shippingCost}\nTotal: $${total}\n\nShip to:\n${fullName}\n${address}\n${barangay}\n${city}, ${province}\n${postalCode}\n\n© ${new Date().getFullYear()} RePXL`,
      })
      console.log('[orders/confirmation] Email sent to:', email)
    } else {
      console.log('\n[RePXL Order Confirmation — DEV MODE]')
      console.log(`Order: ${orderNumber} → ${email}`)
      console.log(`Total: $${total}\n`)
    }

    return NextResponse.json({ sent: true })
  } catch (err) {
    console.error('[orders/confirmation] Error:', err)
    // Return 500 but order is already saved — caller handles gracefully
    return NextResponse.json({ sent: false, message: 'Email failed.' }, { status: 500 })
  }
}
