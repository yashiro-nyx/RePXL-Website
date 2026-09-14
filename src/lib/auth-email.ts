/**
 * src/lib/auth-email.ts
 *
 * Security and authentication email handlers:
 * - Password Changed Security Confirmation
 *
 * Emits branded security notices upon password update or reset.
 * Degrades gracefully in dev mode when mailer is unconfigured.
 */

import { createTransporter, isMailerConfigured, renderBrandedEmailHtml } from '@/lib/mailer'

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

  const subject = 'Security Alert: Your RePXL password was changed'
  const preheader = `Your RePXL account password was successfully updated on ${timeFormatted}.`

  const bodyHtml = `
    <p style="margin:0 0 16px;color:#f5f1ec;font-weight:600;font-size:15px;">
      Hello ${displayName},
    </p>
    <p style="margin:0 0 16px;">
      This email is to confirm that the password for your <strong>RePXL</strong> account (<code>${email}</code>) was changed on <strong>${timeFormatted} (PHT)</strong>.
    </p>
    <div style="background-color:rgba(194,44,44,0.08);border-left:3px solid #c22c2c;padding:12px 16px;margin:20px 0;border-radius:2px;">
      <p style="margin:0;font-size:13px;line-height:1.6;color:#f5f1ec;">
        <strong>Did you make this change?</strong><br />
        If you made this update, you can safely disregard this notice. No further action is required.
      </p>
    </div>
    <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#8c8580;">
      <strong style="color:#e05252;">Did NOT change your password?</strong><br />
      If you did not make this change, your account may have been compromised. Please immediately reset your password using the link below and contact support at <a href="mailto:support@repxl.com" style="color:#f5f1ec;text-decoration:underline;">support@repxl.com</a>.
    </p>
  `

  const html = renderBrandedEmailHtml({
    title: 'Password Changed',
    preheader,
    bodyHtml,
    actionUrl: forgotUrl,
    actionText: 'Secure My Account',
    footerNote: 'This is an automated security notification sent to protect your RePXL account.',
  })

  const text = `SECURITY ALERT: PASSWORD CHANGED\n\nHello ${displayName},\n\nThe password for your RePXL account (${email}) was changed on ${timeFormatted} (PHT).\n\nIf you made this change, no further action is required.\n\nIF YOU DID NOT MAKE THIS CHANGE:\nYour account may be compromised. Please reset your password immediately at:\n${forgotUrl}\n\nNeed assistance? Contact support@repxl.com\n\n---\n© ${new Date().getFullYear()} RePXL`

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

