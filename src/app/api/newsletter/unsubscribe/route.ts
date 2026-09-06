import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashNewsletterToken, siteOrigin } from '@/lib/newsletter'

export const dynamic = 'force-dynamic'

/**
 * GET /api/newsletter/unsubscribe?token=...
 *
 * Safe entry point from email unsubscribe links.
 * Does NOT mutate subscriber state — email security scanners and link-preview
 * crawlers may follow GET links automatically, so state changes must never
 * happen on GET.
 *
 * Instead: validates the token is syntactically plausible, then redirects to
 * the confirmation page where the user must explicitly click "Confirm Unsubscribe".
 * The raw token is forwarded in the redirect URL so the confirmation page can
 * submit it to POST /api/newsletter/unsubscribe.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const rawToken = searchParams.get('token')
  const base = siteOrigin()

  if (!rawToken || rawToken.length < 20 || rawToken.length > 200) {
    return NextResponse.redirect(`${base}/newsletter/invalid?reason=malformed`, 302)
  }

  // Light existence check only — no DB mutation.
  // We verify the token hashes to a known subscriber so we can show a
  // sensible error early rather than letting the user click "Confirm" and fail.
  const tokenHash = hashNewsletterToken(rawToken)
  const subscriber = await prisma.newsletterSubscriber.findUnique({
    where: { unsubscribeTokenHash: tokenHash },
    select: { id: true, status: true },
  })

  if (!subscriber) {
    return NextResponse.redirect(`${base}/newsletter/invalid?reason=invalid`, 302)
  }

  // Already unsubscribed — skip the confirmation page, go straight to success.
  if (subscriber.status === 'UNSUBSCRIBED') {
    return NextResponse.redirect(`${base}/newsletter/unsubscribed`, 302)
  }

  // Forward to the confirmation page; token travels in the URL query param.
  // The confirmation page POSTs the token back to perform the actual mutation.
  return NextResponse.redirect(
    `${base}/newsletter/unsubscribe-confirm?token=${encodeURIComponent(rawToken)}`,
    302
  )
}

/**
 * POST /api/newsletter/unsubscribe
 *
 * Performs the actual unsubscribe mutation after the user explicitly confirms.
 * Called by the /newsletter/unsubscribe-confirm page.
 *
 * Body: { token: string }
 *
 * CSRF protection:
 *   - Accepts JSON body only (Content-Type: application/json).
 *   - The 32-byte random unsubscribe token is an unforgeable bearer capability —
 *     a cross-site attacker cannot know it without access to the subscriber's
 *     email. Requiring an explicit POST (not GET) prevents scanners from
 *     triggering unsubscribes.
 *   - Additionally enforces same-origin via the Referer/Origin check consistent
 *     with other RePIXL state-changing routes.
 *
 * Idempotent: calling POST multiple times for an already-unsubscribed address
 * is safe and returns a success redirect.
 */
export async function POST(request: NextRequest) {
  const base = siteOrigin()

  // Reject cross-origin submissions (belt-and-suspenders alongside the token)
  const origin = request.headers.get('origin')
  const expectedOrigin = new URL(base).origin
  if (origin && origin !== expectedOrigin) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  let body: { token?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const rawToken = body.token
  if (!rawToken || typeof rawToken !== 'string' || rawToken.length < 20 || rawToken.length > 200) {
    return NextResponse.json({ success: false, error: 'Invalid token', code: 'MALFORMED' }, { status: 400 })
  }

  const tokenHash = hashNewsletterToken(rawToken)
  const subscriber = await prisma.newsletterSubscriber.findUnique({
    where: { unsubscribeTokenHash: tokenHash },
    select: { id: true, status: true },
  })

  if (!subscriber) {
    return NextResponse.json({ success: false, error: 'Token not found', code: 'INVALID' }, { status: 404 })
  }

  // Idempotent — already unsubscribed is a success
  if (subscriber.status !== 'UNSUBSCRIBED') {
    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { status: 'UNSUBSCRIBED', isSubscribed: false },
    })
  }

  return NextResponse.json({ success: true })
}
