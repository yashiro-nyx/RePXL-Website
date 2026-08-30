import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { Resend } from 'resend'
import { storeResetToken } from '@/lib/resetTokens'

const resend = new Resend(process.env.RESEND_API_KEY)

// Always respond with the same message to prevent user enumeration
const SAFE_RESPONSE = {
  message: "If an account with that email exists, we've sent reset instructions.",
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
      // Vercel auto-sets VERCEL_URL for preview deployments (no https:// prefix)
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    const resetUrl = `${siteUrl}/reset-password?token=${token}`

    // Send the reset email
    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'your-resend-api-key') {
      const sendResult = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
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
              If you didn't request this, you can safely ignore this email.
              Your password will not be changed.
            </p>
            <hr style="border: none; border-top: 1px solid #2a2028; margin: 24px 0;" />
            <p style="color: #8c8580; font-size: 11px; margin: 0;">
              © ${new Date().getFullYear()} RePXL. Not your email? Contact us at support@repxl.com
            </p>
          </div>
        `,
      })
      // Log result for debugging (visible in Vercel Functions logs)
      console.log('[forgot-password] Resend result:', JSON.stringify(sendResult))
    } else {
      // Development fallback — log the reset URL to the server console
      console.log('\n[RePXL Password Reset — DEV MODE]')
      console.log(`Email: ${email}`)
      console.log(`Reset URL: ${resetUrl}`)
      console.log('RESEND_API_KEY present:', !!process.env.RESEND_API_KEY)
      console.log('(Set RESEND_API_KEY in .env.local to send real emails)\n')
    }

    return NextResponse.json(SAFE_RESPONSE)
  } catch (err) {
    console.error('[forgot-password]', err)
    // Still return the safe message so errors don't leak info
    return NextResponse.json(SAFE_RESPONSE)
  }
}
