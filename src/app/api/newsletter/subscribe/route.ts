import { NextRequest, NextResponse } from 'next/server'
import { createTransporter, isMailerConfigured } from '@/lib/mailer'
import { prisma } from '@/lib/prisma'

// Simple in-memory rate limiter: max 3 requests per IP per 10 minutes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW = 10 * 60 * 1000

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

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (isRateLimited(ip)) {
      return NextResponse.json({ message: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const body = await req.json()
    const email = (body?.email ?? '').trim().toLowerCase()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: 'Invalid email address.' }, { status: 400 })
    }

    // Persist the subscriber (idempotent) so the list survives regardless of
    // whether the confirmation email can be sent.
    await prisma.newsletterSubscriber.upsert({
      where: { email },
      update: { isSubscribed: true },
      create: { email, isSubscribed: true },
    })

    const now = new Date()
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })

    if (isMailerConfigured()) {
      const transporter = createTransporter()

      // 1. Notify RePXL
      await transporter.sendMail({
        from: `"RePXL" <${process.env.GMAIL_USER}>`,
        to: process.env.GMAIL_USER,
        subject: 'New RePXL Subscriber',
        html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>New Subscriber</title></head>
<body style="margin:0;padding:0;background-color:#0a0806;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#0a0806">
  <tr>
    <td align="center" style="padding:40px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:480px;">
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
            <h2 style="margin:0 0 20px;font-family:Georgia,serif;font-size:20px;color:#f5f1ec;">New Subscriber</h2>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid rgba(140,133,128,0.1);">
                  <span style="font-family:monospace;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;">Email</span><br/>
                  <span style="font-family:monospace;font-size:14px;color:#f5f1ec;">${email}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;">
                  <span style="font-family:monospace;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#8c8580;">Subscribed</span><br/>
                  <span style="font-family:sans-serif;font-size:13px;color:#8c8580;">${dateStr} at ${timeStr}</span>
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
        text: `New RePXL Subscriber\n\nEmail: ${email}\nSubscribed: ${dateStr} at ${timeStr}`,
      })

      // 2. Confirm to subscriber
      await transporter.sendMail({
        from: `"RePXL" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: 'Welcome to RePXL',
        html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>Welcome to RePXL</title></head>
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
                  <span style="font-family:Georgia,serif;font-size:21px;font-weight:700;letter-spacing:-0.4px;color:#f5f1ec;">RePXL</span>
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
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td align="center" style="padding-bottom:20px;">
                        <h1 style="margin:0;font-family:Georgia,serif;font-size:26px;font-weight:700;color:#f5f1ec;letter-spacing:-0.3px;">You&apos;re subscribed.</h1>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding-bottom:32px;">
                        <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#8c8580;text-align:center;max-width:400px;">
                          You&apos;re now subscribed to <strong style="color:#f5f1ec;">RePXL</strong>.<br/>
                          You&apos;ll receive updates about new arrivals, restocks, and collector tips.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="border-top:1px solid rgba(140,133,128,0.12);padding-top:28px;">
                        <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#8c8580;text-align:center;">
                          Thank you for being part of the RePXL community.<br/>
                          <strong style="color:rgba(245,241,236,0.6);font-weight:600;">Vintage Digital Cameras</strong>
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
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:11px;color:rgba(140,133,128,0.3);">Condition-graded &middot; Serial-verified &middot; Trusted by collectors</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`,
        text: `Welcome to RePXL\n\nYou're now subscribed to RePXL.\nYou'll receive updates about new arrivals, restocks, and collector tips.\n\nThank you for being part of the RePXL community.\n\n© ${now.getFullYear()} RePXL`,
      })
    } else {
      // Dev fallback
      console.log('\n[RePXL Newsletter — DEV MODE]')
      console.log(`Subscriber: ${email}`)
      console.log('Set GMAIL_USER and GMAIL_APP_PASSWORD to send real emails.\n')
    }

    return NextResponse.json({ message: 'Subscribed successfully.' })
  } catch (err) {
    console.error('[newsletter/subscribe]', err)
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
