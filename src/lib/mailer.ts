/**
 * Shared Nodemailer transporter — reused by all email features:
 * - Forgot Password
 * - Newsletter subscribe
 * - Contact Us
 *
 * Credentials are read server-side only from GMAIL_USER / GMAIL_APP_PASSWORD.
 * Never import this from client components.
 */

import nodemailer from 'nodemailer'

export function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

export function isMailerConfigured(): boolean {
  return Boolean(
    process.env.GMAIL_USER &&
    process.env.GMAIL_APP_PASSWORD &&
    process.env.GMAIL_APP_PASSWORD !== 'your-gmail-app-password'
  )
}

/**
 * Notification email delivery (Requirements 8.8, 9.2, 9.7, 9.8).
 *
 * `sendNotificationEmail` is a best-effort channel: it retries a small number of
 * times on transient transport failures and NEVER throws. Callers create the
 * in-app notification independently and keep it regardless of the email outcome,
 * so a failed send here must degrade gracefully rather than propagate.
 *
 * Timing note: the retry/backoff here is intentionally tiny (and injectable) so
 * unit tests run fast. Any longer, human-scale scheduling (e.g. the 60s delivery
 * window) is enforced at the scheduling layer, not inside this helper.
 */

export interface NotificationEmailResult {
  ok: boolean
  attempts: number
  error?: string
}

export interface SendNotificationEmailOptions {
  /** Optional HTML body. When provided it is sent alongside the plain-text body. */
  html?: string
  /** Total number of attempts (>= 1). Defaults to 3. */
  maxAttempts?: number
  /** Base backoff in ms between attempts. Defaults to 50ms. Set to 0 in tests. */
  backoffMs?: number
}

const DEFAULT_MAX_ATTEMPTS = 3
const DEFAULT_BACKOFF_MS = 50

function delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  try {
    return JSON.stringify(err)
  } catch {
    return 'Unknown mailer error'
  }
}

/**
 * Sends a notification email via the shared Nodemailer transporter, retrying up
 * to `maxAttempts` total on failure. Never throws.
 *
 * - Returns `{ ok: true, attempts }` on the first successful send.
 * - Returns `{ ok: false, attempts, error }` after all attempts fail, with the
 *   last error reported.
 * - Returns `{ ok: false, attempts: 0, error }` immediately (without sending)
 *   when the mailer is not configured, so callers degrade gracefully.
 *
 * Supports plain-text and simple HTML bodies.
 */
export async function sendNotificationEmail(
  to: string,
  subject: string,
  body: string,
  options: SendNotificationEmailOptions = {}
): Promise<NotificationEmailResult> {
  if (!isMailerConfigured()) {
    return { ok: false, attempts: 0, error: 'Mailer is not configured' }
  }

  const maxAttempts = Math.max(1, options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS)
  const backoffMs = options.backoffMs ?? DEFAULT_BACKOFF_MS

  const message = {
    from: process.env.GMAIL_USER,
    to,
    subject,
    text: body,
    ...(options.html ? { html: options.html } : {}),
  }

  let transporter: ReturnType<typeof createTransporter>
  try {
    transporter = createTransporter()
  } catch (err) {
    return { ok: false, attempts: 0, error: errorMessage(err) }
  }

  let lastError = 'Unknown mailer error'

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await transporter.sendMail(message)
      return { ok: true, attempts: attempt }
    } catch (err) {
      lastError = errorMessage(err)
      if (attempt < maxAttempts) {
        await delay(backoffMs)
      }
    }
  }

  return { ok: false, attempts: maxAttempts, error: lastError }
}

export interface BrandedEmailOptions {
  title: string
  preheader?: string
  bodyHtml: string
  actionUrl?: string
  actionText?: string
  footerNote?: string
}

export function renderBrandedEmailHtml(options: BrandedEmailOptions): string {
  const { title, preheader, bodyHtml, actionUrl, actionText, footerNote } = options
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  ).replace(/\/+$/, '')

  const buttonHtml =
    actionUrl && actionText
      ? `<!-- BUTTON -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:28px;margin-bottom:28px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td bgcolor="#c22c2c" style="border-radius:4px;">
                <a href="${actionUrl}" target="_blank"
                   style="display:inline-block;padding:14px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;letter-spacing:0.4px;color:#ffffff;background-color:#c22c2c;text-decoration:none;border-radius:4px;">
                  ${actionText}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`
      : ''

  const preheaderHtml = preheader
    ? `<div style="display:none;font-size:1px;color:#0a0806;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>`
    : ''

  const footerNoteHtml = footerNote
    ? `<p style="margin:20px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#8c8580;">
        ${footerNote}
       </p>`
    : ''

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0806;">
${preheaderHtml}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#0a0806">
  <tr>
    <td align="center" style="padding:40px 16px 36px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:580px;">

        <!-- WORDMARK -->
        <tr>
          <td align="center" style="padding-bottom:32px;">
            <a href="${siteUrl}" target="_blank" style="text-decoration:none;display:inline-block;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border:1px solid rgba(245,241,236,0.2);padding:8px 18px;">
                    <span style="font-family:Georgia,'Times New Roman',Times,serif;font-size:22px;font-weight:700;letter-spacing:-0.3px;color:#f5f1ec;line-height:1;">RePXL</span>
                  </td>
                </tr>
              </table>
            </a>
          </td>
        </tr>

        <!-- CARD -->
        <tr>
          <td style="background-color:#16131a;border:1px solid rgba(140,133,128,0.15);border-top:3px solid #c22c2c;border-radius:2px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="padding:40px 36px 36px;">

                  <!-- HEADING -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td style="padding-bottom:20px;">
                        <h1 style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:24px;font-weight:700;color:#f5f1ec;letter-spacing:-0.3px;line-height:1.3;">${title}</h1>
                      </td>
                    </tr>
                  </table>

                  <!-- BODY CONTENT -->
                  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.7;color:#c7c2be;">
                    ${bodyHtml}
                  </div>

                  ${buttonHtml}

                  ${footerNoteHtml}

                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td align="center" style="padding-top:32px;padding-bottom:8px;">
            <p style="margin:0 0 6px;font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:rgba(140,133,128,0.5);">
              &copy; ${new Date().getFullYear()} RePXL
            </p>
            <p style="margin:0 0 5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;color:rgba(140,133,128,0.4);">
              Vintage Digital Cameras &middot; Tokyo &amp; Manila
            </p>
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;color:rgba(140,133,128,0.3);">
              Condition-graded &middot; Serial-verified &middot; Trusted by collectors
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}
