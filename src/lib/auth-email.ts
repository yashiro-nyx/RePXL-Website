/**
 * src/lib/auth-email.ts
 *
 * Security and authentication email handlers:
 * - Password Changed Security Confirmation
 *
 * Emits branded security notices upon password update or reset.
 * Degrades gracefully in dev mode when mailer is unconfigured.
 */

import { createTransporter, isMailerConfigured } from '@/lib/mailer'
import { buildPasswordChangedEmail } from '@/lib/email'

export interface PasswordChangedEmailData {
  email: string
  name?: string
  changedAt?: Date
  ipAddress?: string
  userAgent?: string
}

export async function sendPasswordChangedEmail(data: PasswordChangedEmailData): Promise<{ ok: boolean; error?: string }> {
  const { email, name, changedAt = new Date() } = data
  const displayName = name?.trim() || 'Customer'
  const timeFormatted = changedAt.toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  ).replace(/\/+$/, '')

  const forgotUrl = `${siteUrl}/forgot-password`

  if (!isMailerConfigured()) {
    console.log('\n[RePXL Security Alert — DEV MODE]')
    console.log(`Event   : Password Changed`)
    console.log(`To      : ${email} (${displayName})`)
    console.log(`Time    : ${timeFormatted} (PHT)`)
    console.log(`Action  : If unauthorized, reset at ${forgotUrl}\n`)
    return { ok: true }
  }

  const { subject, html, text } = buildPasswordChangedEmail({
    email,
    name: displayName,
    changedAtLabel: `${timeFormatted} (PHT)`,
    resetUrl: forgotUrl,
  })

  try {
    const transporter = createTransporter()
    await transporter.sendMail({
      from: `"RePXL Security" <${process.env.GMAIL_USER}>`,
      to: email,
      subject,
      text,
      html,
    })
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[auth-email] Failed to send password changed email:', msg)
    return { ok: false, error: msg }
  }
}

