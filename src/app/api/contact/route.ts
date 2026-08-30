import { NextRequest, NextResponse } from 'next/server'
import { createTransporter, isMailerConfigured } from '@/lib/mailer'

// Rate limit: max 5 contact submissions per IP per 15 minutes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW = 15 * 60 * 1000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return false
  }
  if (record.count >= RATE_LIMIT_MAX) return true
  record.count++
  return false
}

function sanitize(str: string, maxLen: number): string {
  return str.trim().slice(0, maxLen)
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (isRateLimited(ip)) {
      return NextResponse.json({ message: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const body = await req.json()

    const name = sanitize(body?.name ?? '', 100)
    const email = sanitize(body?.email ?? '', 200).toLowerCase()
    const subject = sanitize(body?.subject ?? '', 200)
    const message = sanitize(body?.message ?? '', 5000)

    // Server-side validation
    if (!name) return NextResponse.json({ message: 'Name is required.' }, { status: 400 })
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: 'Valid email address is required.' }, { status: 400 })
    }
    if (!subject) return NextResponse.json({ message: 'Subject is required.' }, { status: 400 })
    if (!message || message.length < 10) {
      return NextResponse.json({ message: 'Message must be at least 10 characters.' }, { status: 400 })
    }

    const now = new Date()
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })

    // Escape HTML for the email body
    const safe = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    if (isMailerConfigured()) {
      const transporter = createTransporter()

      // 1. Send message to RePXL with Reply-To set to customer email
      await transporter.sendMail({
        from: `"RePXL Contact" <${process.env.GMAIL_USER}>`,
        to: process.env.GMAIL_USER,
        replyTo: `"${name}" <${email}>`,
        subject: `[RePXL Contact] ${subject}`,
        html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>Contact Form</title></head>
<body style="margin:0;padding:0;background-color:#0a0806;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#0a0806">
  <tr>
    <td align="center" style="padding:40px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;">
        <tr>
          <td align="center" style="padding-bottom:28px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border:1px solid rgba(245,241,236,0.2);padding:6px 14px;">
                  <span style="font-family:Georgia,serif;font-size:18px;font-weight:700;color:#f5f1ec;">RePXL</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background-color:#16131a;border:1px solid rgba(140,133,128,0.15);border-top:3px solid #c22c2c;padding:36px 32px;">
            <h2 style="margin:0 0 24px;font-family:Georgia,serif;font-size:20px;color:#f5f1ec;">New Contact Form Submission</h2>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid rgba(140,133,128,0.1);">
                  <span style="font-family:monospace;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;">Name</span><br/>
                  <span style="font-family:sans-serif;font-size:14px;color:#f5f1ec;">${safe(name)}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid rgba(140,133,128,0.1);">
                  <span style="font-family:monospace;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;">Email</span><br/>
                  <a href="mailto:${safe(email)}" style="font-family:monospace;font-size:14px;color:#c22c2c;text-decoration:none;">${safe(email)}</a>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid rgba(140,133,128,0.1);">
                  <span style="font-family:monospace;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;">Subject</span><br/>
                  <span style="font-family:sans-serif;font-size:14px;color:#f5f1ec;">${safe(subject)}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid rgba(140,133,128,0.1);">
                  <span style="font-family:monospace;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;">Message</span><br/>
                  <p style="margin:8px 0 0;font-family:sans-serif;font-size:14px;line-height:1.65;color:#8c8580;white-space:pre-wrap;">${safe(message)}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;">
                  <span style="font-family:monospace;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;">Received</span><br/>
                  <span style="font-family:sans-serif;font-size:13px;color:#8c8580;">${dateStr} at ${timeStr}</span>
                </td>
              </tr>
            </table>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:24px;">
              <tr>
                <td style="background-color:rgba(194,44,44,0.08);border:1px solid rgba(194,44,44,0.2);padding:12px 16px;">
                  <p style="margin:0;font-family:sans-serif;font-size:12px;color:#8c8580;">
                    <strong style="color:#f5f1ec;">Reply-To:</strong> ${safe(name)} &lt;${safe(email)}&gt;<br/>
                    Hit Reply in Gmail to respond directly to this customer.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top:24px;">
            <p style="margin:0;font-family:monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(140,133,128,0.4);">&copy; ${now.getFullYear()} RePXL</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`,
        text: `New Contact Form Submission\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\nReceived: ${dateStr} at ${timeStr}\n\nMessage:\n${message}\n\n---\nReply-To: ${name} <${email}>`,
      })

      // 2. Confirmation to customer
      await transporter.sendMail({
        from: `"RePXL" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: 'We received your message — RePXL',
        html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>Message received</title></head>
<body style="margin:0;padding:0;background-color:#0a0806;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#0a0806">
  <tr>
    <td align="center" style="padding:48px 20px 40px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;">
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
                  <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;font-weight:700;color:#f5f1ec;">We received your message.</h1>
                  <p style="margin:0 0 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#8c8580;">
                    Hi ${safe(name)},
                  </p>
                  <p style="margin:0 0 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#8c8580;">
                    Thank you for contacting <strong style="color:#f5f1ec;">RePXL</strong>. We&apos;ve received your message and our team will get back to you as soon as possible.
                  </p>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:28px;">
                    <tr>
                      <td style="border:1px solid rgba(140,133,128,0.12);background-color:rgba(0,0,0,0.2);padding:14px 16px;">
                        <p style="margin:0 0 4px;font-family:monospace;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;">Your subject</p>
                        <p style="margin:0;font-family:sans-serif;font-size:13px;color:#f5f1ec;">${safe(subject)}</p>
                      </td>
                    </tr>
                  </table>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td style="border-top:1px solid rgba(140,133,128,0.12);padding-top:28px;">
                        <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#8c8580;">
                          Regards,<br/>
                          <strong style="color:#f5f1ec;font-weight:600;">RePXL</strong><br/>
                          <span style="font-size:12px;">Vintage Digital Cameras</span>
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
            <p style="margin:0 0 5px;font-family:monospace;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:rgba(140,133,128,0.45);">&copy; ${now.getFullYear()} RePXL</p>
            <p style="margin:0;font-family:sans-serif;font-size:11px;color:rgba(140,133,128,0.3);">Condition-graded &middot; Serial-verified &middot; Trusted by collectors</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`,
        text: `Hi ${name},\n\nThank you for contacting RePXL. We've received your message and our team will get back to you as soon as possible.\n\nYour subject: ${subject}\n\nRegards,\nRePXL\nVintage Digital Cameras\n\n© ${now.getFullYear()} RePXL`,
      })
    } else {
      console.log('\n[RePXL Contact — DEV MODE]')
      console.log(`From: ${name} <${email}>`)
      console.log(`Subject: ${subject}`)
      console.log(`Message: ${message}`)
      console.log('Set GMAIL_USER and GMAIL_APP_PASSWORD to send real emails.\n')
    }

    return NextResponse.json({ message: 'Message sent successfully.' })
  } catch (err) {
    console.error('[contact]', err)
    return NextResponse.json({ message: 'Unable to send your message. Please try again.' }, { status: 500 })
  }
}
