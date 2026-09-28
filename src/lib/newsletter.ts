/**
 * Newsletter double opt-in utilities — pure functions for token generation,
 * hashing, email HTML building, and marketing eligibility checks.
 * No I/O — safe to test without DB or mailer.
 */

import { randomBytes, createHash } from 'crypto'
import { buildNewsletterConfirmationEmail } from '@/lib/email/templates'
import { renderEmailLayout } from '@/lib/email/layout'
import { paragraph } from '@/lib/email/components'

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
// These delegate to the shared RePXL email design system (src/lib/email) so the
// newsletter opt-in matches every other outgoing email.

/** Double opt-in confirmation email HTML for the given confirmation URL. */
export function confirmationEmailHtml(confirmUrl: string): string {
  return buildNewsletterConfirmationEmail({ confirmUrl, expiresInLabel: '24 hours' }).html
}

/** Informational "already subscribed" email HTML. */
export function alreadyConfirmedEmailHtml(): string {
  return renderEmailLayout({
    title: "You're already subscribed",
    heading: "You're already subscribed",
    preheader: 'No action needed — your subscription is already active.',
    bodyHtml: paragraph(
      'This email address is already confirmed for the RePXL newsletter, so there is nothing more to do.',
      { muted: true }
    ),
  })
}
