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
