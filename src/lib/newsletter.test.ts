/**
 * Unit tests for the newsletter double opt-in system (Part 2).
 * Pure-function tests + file-content contract assertions.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  generateNewsletterToken,
  hashNewsletterToken,
  CONFIRMATION_TTL_MS,
  siteOrigin,
  confirmationEmailHtml,
  isMarketingEligible,
  marketingEligibleWhere,
} from './newsletter'

// ── Marketing eligibility ─────────────────────────────────────────────────────

describe('isMarketingEligible', () => {
  it('CONFIRMED + isSubscribed=true is eligible', () => {
    expect(isMarketingEligible({ status: 'CONFIRMED', isSubscribed: true })).toBe(true)
  })

  it('PENDING is NOT eligible regardless of isSubscribed', () => {
    expect(isMarketingEligible({ status: 'PENDING', isSubscribed: true })).toBe(false)
    expect(isMarketingEligible({ status: 'PENDING', isSubscribed: false })).toBe(false)
  })

  it('UNSUBSCRIBED is NOT eligible regardless of isSubscribed', () => {
    expect(isMarketingEligible({ status: 'UNSUBSCRIBED', isSubscribed: true })).toBe(false)
    expect(isMarketingEligible({ status: 'UNSUBSCRIBED', isSubscribed: false })).toBe(false)
  })

  it('CONFIRMED + isSubscribed=false is NOT eligible', () => {
    expect(isMarketingEligible({ status: 'CONFIRMED', isSubscribed: false })).toBe(false)
  })

  it('unknown status is NOT eligible', () => {
    expect(isMarketingEligible({ status: 'ACTIVE', isSubscribed: true })).toBe(false)
  })
})

describe('marketingEligibleWhere', () => {
  it('returns a where clause requiring CONFIRMED status', () => {
    const where = marketingEligibleWhere()
    expect(where.status).toBe('CONFIRMED')
  })

  it('returns a where clause requiring isSubscribed=true', () => {
    const where = marketingEligibleWhere()
    expect(where.isSubscribed).toBe(true)
  })

  it('where clause is consistent with isMarketingEligible', () => {
    const where = marketingEligibleWhere()
    // An object satisfying the where clause must pass isMarketingEligible
    expect(isMarketingEligible({ status: where.status, isSubscribed: where.isSubscribed })).toBe(true)
  })
})

// ── Token generation ──────────────────────────────────────────────────────────

describe('generateNewsletterToken', () => {
  it('returns a non-empty URL-safe string', () => {
    const t = generateNewsletterToken()
    expect(t).toBeTruthy()
    expect(/^[A-Za-z0-9_-]+$/.test(t)).toBe(true)
  })

  it('generates unique tokens on each call', () => {
    const tokens = Array.from({ length: 10 }, generateNewsletterToken)
    const unique  = new Set(tokens)
    expect(unique.size).toBe(10)
  })

  it('generates sufficiently long tokens (>= 40 chars for 32 bytes base64url)', () => {
    const t = generateNewsletterToken()
    expect(t.length).toBeGreaterThanOrEqual(40)
  })
})

// ── Token hashing ─────────────────────────────────────────────────────────────

describe('hashNewsletterToken', () => {
  it('returns a consistent hex string for the same input', () => {
    const token = 'test-token-abc123'
    const h1 = hashNewsletterToken(token)
    const h2 = hashNewsletterToken(token)
    expect(h1).toBe(h2)
    expect(/^[0-9a-f]{64}$/.test(h1)).toBe(true) // SHA-256 → 64 hex chars
  })

  it('different tokens produce different hashes', () => {
    const h1 = hashNewsletterToken('token-a')
    const h2 = hashNewsletterToken('token-b')
    expect(h1).not.toBe(h2)
  })

  it('raw token does NOT appear in the hash (hash is irreversible)', () => {
    const token = 'my-secret-token'
    const hash  = hashNewsletterToken(token)
    expect(hash).not.toContain(token)
  })
})

// ── TTL ───────────────────────────────────────────────────────────────────────

describe('CONFIRMATION_TTL_MS', () => {
  it('is 24 hours in milliseconds', () => {
    expect(CONFIRMATION_TTL_MS).toBe(24 * 60 * 60 * 1000)
  })
})

// ── siteOrigin ────────────────────────────────────────────────────────────────

describe('siteOrigin', () => {
  it('returns a string without a trailing slash', () => {
    const origin = siteOrigin()
    expect(origin).not.toMatch(/\/$/)
  })

  it('returns a non-empty string', () => {
    expect(siteOrigin().length).toBeGreaterThan(0)
  })
})

// ── Email HTML ────────────────────────────────────────────────────────────────

describe('confirmationEmailHtml', () => {
  const url  = 'https://repixl.test/api/newsletter/confirm?token=abc'
  const html = confirmationEmailHtml(url)

  it('contains the confirmation URL', () => {
    expect(html).toContain(url)
  })

  it('mentions 24 hours expiry', () => {
    expect(html).toContain('24 hours')
  })

  it('contains a Confirm Subscription CTA', () => {
    expect(html).toContain('Confirm Subscription')
  })

  it('explains that ignoring the email will not subscribe the user', () => {
    expect(html).toContain("didn't request this")
  })
})

// ── Subscribe route contracts ─────────────────────────────────────────────────

describe('subscribe route — double opt-in contracts', () => {
  it('creates subscriber with PENDING status, not CONFIRMED', () => {
    const src = readFileSync('src/app/api/newsletter/subscribe/route.ts', 'utf8')
    expect(src).toContain("status:                 'PENDING'")
    expect(src).not.toContain("status: 'CONFIRMED'")
    expect(src).toContain("isSubscribed:           false")
  })

  it('stores token hash, not raw token', () => {
    const src = readFileSync('src/app/api/newsletter/subscribe/route.ts', 'utf8')
    expect(src).toContain('hashNewsletterToken')
    expect(src).toContain('confirmationTokenHash:  tokenHash')
    // Raw token must not be stored in the DB field
    expect(src).not.toContain('confirmationTokenHash:  rawToken')
  })

  it('generates a cryptographically random confirmation token', () => {
    const src = readFileSync('src/app/api/newsletter/subscribe/route.ts', 'utf8')
    expect(src).toContain('generateNewsletterToken')
  })

  it('sets a 24-hour expiry on the confirmation token', () => {
    const src = readFileSync('src/app/api/newsletter/subscribe/route.ts', 'utf8')
    expect(src).toContain('CONFIRMATION_TTL_MS')
  })

  it('builds the confirmation URL using siteOrigin, not hardcoded domain', () => {
    const src = readFileSync('src/app/api/newsletter/subscribe/route.ts', 'utf8')
    expect(src).toContain('siteOrigin()')
    expect(src).not.toContain('localhost:3000')
    expect(src).not.toContain('vercel.app')
  })

  it('sends a confirmation email, not a welcome email', () => {
    const src = readFileSync('src/app/api/newsletter/subscribe/route.ts', 'utf8')
    expect(src).toContain('Confirm your RePIXL subscription')
  })

  it('returns a generic message that does not leak subscriber status', () => {
    const src = readFileSync('src/app/api/newsletter/subscribe/route.ts', 'utf8')
    expect(src).toContain('GENERIC_OK')
    expect(src).toContain("eligible, we've sent")
  })

  it('handles already-CONFIRMED subscribers without duplicate creation', () => {
    const src = readFileSync('src/app/api/newsletter/subscribe/route.ts', 'utf8')
    expect(src).toContain("status === 'CONFIRMED'")
    expect(src).toContain('GENERIC_OK')
  })
})

// ── Confirm route contracts ───────────────────────────────────────────────────

describe('confirm route — token validation contracts', () => {
  it('hashes the submitted token before DB lookup (never stores raw token)', () => {
    const src = readFileSync('src/app/api/newsletter/confirm/route.ts', 'utf8')
    expect(src).toContain('hashNewsletterToken')
    expect(src).toContain('confirmationTokenHash: tokenHash')
  })

  it('rejects tokens that have expired', () => {
    const src = readFileSync('src/app/api/newsletter/confirm/route.ts', 'utf8')
    expect(src).toContain('confirmationExpiresAt')
    expect(src).toContain('expired')
  })

  it('rejects malformed/short tokens', () => {
    const src = readFileSync('src/app/api/newsletter/confirm/route.ts', 'utf8')
    expect(src).toContain('malformed')
  })

  it('clears the confirmation token after use (single-use)', () => {
    const src = readFileSync('src/app/api/newsletter/confirm/route.ts', 'utf8')
    expect(src).toContain('confirmationTokenHash: null')
    expect(src).toContain('confirmationExpiresAt: null')
  })

  it('sets status to CONFIRMED and isSubscribed to true on success', () => {
    const src = readFileSync('src/app/api/newsletter/confirm/route.ts', 'utf8')
    expect(src).toContain("status:                'CONFIRMED'")
    expect(src).toContain('isSubscribed:          true')
    expect(src).toContain('confirmedAt:           new Date()')
  })

  it('redirects to /newsletter/confirmed on success', () => {
    const src = readFileSync('src/app/api/newsletter/confirm/route.ts', 'utf8')
    expect(src).toContain('/newsletter/confirmed')
  })
})

// ── Unsubscribe route contracts ───────────────────────────────────────────────

describe('unsubscribe route — GET does not mutate state', () => {
  it('GET handler exists and does NOT call prisma update/updateMany', () => {
    const src = readFileSync('src/app/api/newsletter/unsubscribe/route.ts', 'utf8')
    // GET must be exported
    expect(src).toContain('export async function GET')
    // GET must NOT contain any Prisma mutation calls
    // We assert that update/updateMany don't appear inside the GET function body.
    // Strategy: extract the text of the GET function and check it contains no mutations.
    const getStart = src.indexOf('export async function GET')
    const postStart = src.indexOf('export async function POST')
    const getBody = postStart > getStart
      ? src.slice(getStart, postStart)
      : src.slice(getStart)
    expect(getBody).not.toContain('.update(')
    expect(getBody).not.toContain('.updateMany(')
  })

  it('GET redirects to confirmation page (not /newsletter/unsubscribed)', () => {
    const src = readFileSync('src/app/api/newsletter/unsubscribe/route.ts', 'utf8')
    const getStart = src.indexOf('export async function GET')
    const postStart = src.indexOf('export async function POST')
    const getBody = postStart > getStart ? src.slice(getStart, postStart) : src.slice(getStart)
    expect(getBody).toContain('unsubscribe-confirm')
  })

  it('GET still validates token format and rejects malformed tokens', () => {
    const src = readFileSync('src/app/api/newsletter/unsubscribe/route.ts', 'utf8')
    const getStart = src.indexOf('export async function GET')
    const postStart = src.indexOf('export async function POST')
    const getBody = postStart > getStart ? src.slice(getStart, postStart) : src.slice(getStart)
    expect(getBody).toContain('malformed')
    expect(getBody).toContain('hashNewsletterToken')
  })
})

describe('unsubscribe route — POST performs the mutation', () => {
  it('POST handler exists and hashes the token before DB lookup', () => {
    const src = readFileSync('src/app/api/newsletter/unsubscribe/route.ts', 'utf8')
    expect(src).toContain('export async function POST')
    const postStart = src.indexOf('export async function POST')
    const postBody = src.slice(postStart)
    expect(postBody).toContain('hashNewsletterToken')
    expect(postBody).toContain('unsubscribeTokenHash: tokenHash')
  })

  it('POST sets status to UNSUBSCRIBED and isSubscribed to false', () => {
    const src = readFileSync('src/app/api/newsletter/unsubscribe/route.ts', 'utf8')
    const postStart = src.indexOf('export async function POST')
    const postBody = src.slice(postStart)
    expect(postBody).toContain("status: 'UNSUBSCRIBED'")
    expect(postBody).toContain('isSubscribed: false')
  })

  it('POST is idempotent — already-unsubscribed passes without error', () => {
    const src = readFileSync('src/app/api/newsletter/unsubscribe/route.ts', 'utf8')
    const postStart = src.indexOf('export async function POST')
    const postBody = src.slice(postStart)
    expect(postBody).toContain("status !== 'UNSUBSCRIBED'")
    // Must return success even if already unsubscribed
    expect(postBody).toContain('{ success: true }')
  })

  it('POST does NOT clear the unsubscribe token (stays valid for repeated use)', () => {
    const src = readFileSync('src/app/api/newsletter/unsubscribe/route.ts', 'utf8')
    const postStart = src.indexOf('export async function POST')
    const postBody = src.slice(postStart)
    expect(postBody).not.toContain('unsubscribeTokenHash: null')
  })

  it('POST rejects malformed tokens with 400', () => {
    const src = readFileSync('src/app/api/newsletter/unsubscribe/route.ts', 'utf8')
    const postStart = src.indexOf('export async function POST')
    const postBody = src.slice(postStart)
    expect(postBody).toContain('MALFORMED')
    expect(postBody).toContain('400')
  })

  it('POST rejects unknown tokens with 404', () => {
    const src = readFileSync('src/app/api/newsletter/unsubscribe/route.ts', 'utf8')
    const postStart = src.indexOf('export async function POST')
    const postBody = src.slice(postStart)
    expect(postBody).toContain('INVALID')
    expect(postBody).toContain('404')
  })

  it('POST includes an origin / CSRF check', () => {
    const src = readFileSync('src/app/api/newsletter/unsubscribe/route.ts', 'utf8')
    const postStart = src.indexOf('export async function POST')
    const postBody = src.slice(postStart)
    expect(postBody).toContain('origin')
    expect(postBody).toContain('403')
  })

  it('POST does not expose internal subscriber IDs in the success response', () => {
    const src = readFileSync('src/app/api/newsletter/unsubscribe/route.ts', 'utf8')
    // The JSON response returned to the client must only be { success: true }
    // Verify the success response contains no id field
    expect(src).toContain('{ success: true }')
    // The full JSON.stringify of the response must not include an id key
    // (subscriber.id is only used in the Prisma where clause, not echoed back)
    const responseMatch = src.match(/NextResponse\.json\(\{[^}]+\}\)/g) ?? []
    const successResponses = responseMatch.filter(r => r.includes('success: true'))
    for (const r of successResponses) {
      expect(r).not.toContain('id:')
      expect(r).not.toContain('email:')
    }
  })
})

describe('unsubscribe confirmation page', () => {
  it('exists at the correct path', () => {
    const src = readFileSync(
      'src/app/(storefront)/newsletter/unsubscribe-confirm/page.tsx', 'utf8'
    )
    expect(src).toBeTruthy()
  })

  it('sends a POST to /api/newsletter/unsubscribe — not a GET', () => {
    const src = readFileSync(
      'src/app/(storefront)/newsletter/unsubscribe-confirm/page.tsx', 'utf8'
    )
    expect(src).toContain("method: 'POST'")
    expect(src).not.toContain("method: 'GET'")
  })

  it('sends token in JSON body — not as a URL param to the POST', () => {
    const src = readFileSync(
      'src/app/(storefront)/newsletter/unsubscribe-confirm/page.tsx', 'utf8'
    )
    expect(src).toContain('JSON.stringify({ token })')
    expect(src).toContain("'Content-Type': 'application/json'")
  })

  it('has a Keep my subscription link so users can cancel', () => {
    const src = readFileSync(
      'src/app/(storefront)/newsletter/unsubscribe-confirm/page.tsx', 'utf8'
    )
    expect(src).toContain('Keep my subscription')
  })
})

// ── DB schema ─────────────────────────────────────────────────────────────────

describe('NewsletterSubscriber DB schema', () => {
  it('has SubscriberStatus enum with PENDING, CONFIRMED, UNSUBSCRIBED', () => {
    const src = readFileSync('prisma/schema.prisma', 'utf8')
    expect(src).toContain('SubscriberStatus')
    expect(src).toContain('PENDING')
    expect(src).toContain('CONFIRMED')
    expect(src).toContain('UNSUBSCRIBED')
  })

  it('has confirmationTokenHash as a unique nullable field', () => {
    const src = readFileSync('prisma/schema.prisma', 'utf8')
    expect(src).toContain('confirmationTokenHash')
    expect(src).toContain('confirmation_token_hash')
  })

  it('has confirmationExpiresAt for TTL enforcement', () => {
    const src = readFileSync('prisma/schema.prisma', 'utf8')
    expect(src).toContain('confirmationExpiresAt')
  })

  it('has unsubscribeTokenHash for one-click unsubscribe', () => {
    const src = readFileSync('prisma/schema.prisma', 'utf8')
    expect(src).toContain('unsubscribeTokenHash')
  })

  it('default status is PENDING (not CONFIRMED)', () => {
    const src = readFileSync('prisma/schema.prisma', 'utf8')
    // default should be PENDING
    expect(src).toContain("@default(PENDING)")
  })
})
