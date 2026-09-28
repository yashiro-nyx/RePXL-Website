import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createTransporter, isMailerConfigured } from '@/lib/mailer'
import { storeResetToken } from '@/lib/resetTokens'
import { buildPasswordResetEmail } from '@/lib/email'

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

    const token = randomBytes(32).toString('hex')
    await storeResetToken(token, email)

    const siteUrl = (
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    ).replace(/\/+$/, '')
    const resetUrl = `${siteUrl}/reset-password?token=${token}`

    const gmailConfigured = isMailerConfigured()

    if (gmailConfigured) {
      const { subject, html, text } = buildPasswordResetEmail({ resetUrl, expiresInLabel: '1 hour' })
      const transporter = createTransporter()
      const result = await transporter.sendMail({
        from: `"RePXL" <${process.env.GMAIL_USER}>`,
        to: email,
        subject,
        html,
        text,
      })
      console.log('[forgot-password] Email sent:', result.messageId)
    } else {
      console.log('\n[RePXL Password Reset — DEV MODE]')
      console.log(`Email : ${email}`)
      console.log(`URL   : ${resetUrl}`)
      console.log('Set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local to send real emails.\n')
    }

    return NextResponse.json(SAFE_RESPONSE)
  } catch (err) {
    console.error('[forgot-password] Error:', err)
    return NextResponse.json(SAFE_RESPONSE)
  }
}
