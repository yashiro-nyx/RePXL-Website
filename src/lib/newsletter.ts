/**
 * Newsletter double opt-in utilities — pure functions for token generation,
 * hashing, email HTML building, and marketing eligibility checks.
 * No I/O — safe to test without DB or mailer.
 */

import { randomBytes, createHash } from 'crypto'

// ── Marketing eligibility ─────────────────────────────────────────────────────

/**
 * Minimum subscriber shape required to evaluate marketing eligibility.
 * Real Prisma `NewsletterSubscriber` rows satisfy this interface.
 */
export interface SubscriberEligibilityInput {
  status: string        // 'PENDING' | 'CONFIRMED' | 'UNSUBSCRIBED'
  isSubscribed: boolean
}

/**
 * Determine whether a subscriber is eligible to receive optional
 * marketing/newsletter emails (e.g. promotions, new arrivals, bulk campaigns).
 *
 * Eligibility requires ALL of:
 *   1. status === 'CONFIRMED'  (completed double opt-in)
 *   2. isSubscribed === true   (has not been manually unsubscribed)
 *
 * PENDING and UNSUBSCRIBED subscribers must never receive marketing email.
 *
 * This function intentionally does NOT cover transactional messages such as:
 *   - subscription confirmation emails
 *   - password reset / security alerts
 *   - required order / payment receipts
 * Those are sent regardless of marketing eligibility.
 */
export function isMarketingEligible(subscriber: SubscriberEligibilityInput): boolean {
  return subscriber.status === 'CONFIRMED' && subscriber.isSubscribed === true
}

/**
 * Prisma `where` filter clause that selects only marketing-eligible subscribers.
 * Use this in any bulk-send query so the eligibility rule is never re-implemented
 * inline and cannot silently drift out of sync with `isMarketingEligible`.
 *
 * Example:
 *   const eligible = await prisma.newsletterSubscriber.findMany({
 *     where: marketingEligibleWhere(),
 *   })
 */
export function marketingEligibleWhere() {
  return { status: 'CONFIRMED', isSubscribed: true } as const
}

// ── Token helpers ─────────────────────────────────────────────────────────────

export const CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000  // 24 hours
export const UNSUBSCRIBE_TOKEN_BYTES = 32

/**
 * Generate a cryptographically random URL-safe token.
 * The raw token is given to the user; only the hash is stored.
 */
export function generateNewsletterToken(): string {
  return randomBytes(UNSUBSCRIBE_TOKEN_BYTES).toString('base64url')
}

/**
 * SHA-256 hash a token for safe storage. Single-pass; tokens are random enough
 * that HMAC/salt is not required here (unlike passwords).
 */
export function hashNewsletterToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

// ── Site URL helper ───────────────────────────────────────────────────────────

/**
 * Derive the canonical site origin for building confirmation/unsubscribe links.
 * Uses NEXT_PUBLIC_SITE_URL or NEXTAUTH_URL — never hardcodes localhost or prod.
 */
export function siteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  return raw.replace(/\/$/, '')
}

// ── Email HTML templates ──────────────────────────────────────────────────────

const year = new Date().getFullYear()

export function confirmationEmailHtml(confirmUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Confirm your RePIXL subscription</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0806;font-family:sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#0a0806">
  <tr>
    <td align="center" style="padding:40px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;">
        <!-- Logo -->
        <tr>
          <td align="center" style="padding-bottom:28px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border:1px solid rgba(245,241,236,0.2);padding:6px 14px;">
                  <span style="font-family:Georgia,serif;font-size:18px;font-weight:700;color:#f5f1ec;">RePIXL</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Card -->
        <tr>
          <td style="background-color:#16131a;border:1px solid rgba(140,133,128,0.15);border-top:3px solid #c22c2c;padding:36px 32px;">
            <h2 style="margin:0 0 12px;font-family:Georgia,serif;font-size:22px;color:#f5f1ec;">
              Confirm your subscription
            </h2>
            <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#8c8580;">
              Someone (hopefully you) requested a subscription to the
              <strong style="color:#f5f1ec;">RePIXL</strong> newsletter —
              your source for new vintage camera arrivals, exclusive deals, and collector news.
            </p>
            <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#8c8580;">
              Click the button below to confirm. This link expires in <strong style="color:#f5f1ec;">24 hours</strong>.
            </p>
            <!-- CTA -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background-color:#c22c2c;border-radius:8px;">
                  <a href="${confirmUrl}"
                     style="display:inline-block;padding:14px 32px;font-family:sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                    Confirm Subscription
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:28px 0 0;font-size:12px;color:rgba(140,133,128,0.6);">
              If you didn't request this, you can safely ignore this email —
              you will not be subscribed.
            </p>
            <p style="margin:12px 0 0;font-size:11px;color:rgba(140,133,128,0.4);word-break:break-all;">
              Or copy this link: ${confirmUrl}
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top:24px;">
            <p style="margin:0;font-family:monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(140,133,128,0.4);">&copy; ${year} RePIXL</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

export function alreadyConfirmedEmailHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>RePIXL Newsletter</title></head>
<body style="margin:0;padding:0;background-color:#0a0806;font-family:sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#0a0806">
  <tr>
    <td align="center" style="padding:40px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;">
        <tr>
          <td style="background-color:#16131a;border:1px solid rgba(140,133,128,0.15);border-top:3px solid #c22c2c;padding:36px 32px;">
            <h2 style="margin:0 0 12px;font-family:Georgia,serif;font-size:20px;color:#f5f1ec;">You're already subscribed</h2>
            <p style="margin:0;font-size:14px;color:#8c8580;">
              This email address is already confirmed for the RePIXL newsletter. No action needed.
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
