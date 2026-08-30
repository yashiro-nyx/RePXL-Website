import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import nodemailer from 'nodemailer'
import { storeResetToken } from '@/lib/resetTokens'

// Always respond with the same message to prevent user enumeration
const SAFE_RESPONSE = {
  message: "If an account with that email exists, we've sent reset instructions.",
}

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = (body?.email ?? '').trim().toLowerCase()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: 'Invalid email address.' }, { status: 400 })
    }

    // Generate a cryptographically secure token (32 bytes = 64 hex chars)
    const token = randomBytes(32).toString('hex')
    storeResetToken(token, email)

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    const resetUrl = `${siteUrl}/reset-password?token=${token}`

    const gmailConfigured =
      process.env.GMAIL_USER &&
      process.env.GMAIL_APP_PASSWORD &&
      process.env.GMAIL_APP_PASSWORD !== 'your-gmail-app-password'

    if (gmailConfigured) {
      const transporter = createTransporter()
      const result = await transporter.sendMail({
        from: `"RePXL" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: 'Reset your RePXL password',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; background: #0a0806; color: #f5f1ec; padding: 40px 32px; border-radius: 8px;">
            <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 8px;">Reset your password</h1>
            <p style="color: #8c8580; font-size: 14px; margin: 0 0 24px;">
              You requested a password reset for your RePXL account. Click the button below to set a new password.
              This link expires in <strong style="color: #f5f1ec;">1 hour</strong>.
            </p>
            <a href="${resetUrl}"
               style="display: inline-block; background: #c22c2c; color: #fff; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 4px; text-decoration: none;">
              Reset Password
            </a>
            <p style="color: #8c8580; font-size: 12px; margin: 24px 0 0;">
              If you didn't request this, you can safely ignore this email. Your password won't be changed.
            </p>
            <hr style="border: none; border-top: 1px solid #2a2028; margin: 24px 0;" />
            <p style="color: #8c8580; font-size: 11px; margin: 0;">
              © ${new Date().getFullYear()} RePXL &nbsp;·&nbsp; support@repxl.com
            </p>
          </div>
        `,
        text: `Reset your RePXL password\n\nClick the link below to set a new password (expires in 1 hour):\n\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
      })
      console.log('[forgot-password] Email sent:', result.messageId)
    } else {
      // Dev fallback — print reset URL to server console
      console.log('\n[RePXL Password Reset — DEV MODE]')
      console.log(`Email : ${email}`)
      console.log(`URL   : ${resetUrl}`)
      console.log('Set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local to send real emails.\n')
    }

    return NextResponse.json(SAFE_RESPONSE)
  } catch (err) {
    console.error('[forgot-password] Error:', err)
    // Return safe message even on error — don't leak details
    return NextResponse.json(SAFE_RESPONSE)
  }
}
