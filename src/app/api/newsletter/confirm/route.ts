import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashNewsletterToken, siteOrigin } from '@/lib/newsletter'

export const dynamic = 'force-dynamic'

/**
 * GET /api/newsletter/confirm?token=...
 *
 * Handles the confirmation link clicked from the opt-in email.
 * - Hashes the submitted token and looks up the matching PENDING subscriber.
 * - Validates expiry and single-use.
 * - On success: status → CONFIRMED, clears token fields, redirects to /newsletter/confirmed.
 * - On failure: redirects to /newsletter/invalid with a reason query param.
 *
 * The raw token is never stored — only the hash. Submitting the same token twice
 * fails because the hash is cleared on first use.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const rawToken = searchParams.get('token')

  const base = siteOrigin()

  // ── Token format validation ───────────────────────────────────────────────
  if (!rawToken || rawToken.length < 20 || rawToken.length > 200) {
    return NextResponse.redirect(`${base}/newsletter/invalid?reason=malformed`, 302)
  }

  const tokenHash = hashNewsletterToken(rawToken)

  // ── DB lookup ─────────────────────────────────────────────────────────────
  const subscriber = await prisma.newsletterSubscriber.findUnique({
    where: { confirmationTokenHash: tokenHash },
  })

  if (!subscriber) {
    return NextResponse.redirect(`${base}/newsletter/invalid?reason=invalid`, 302)
  }

  // ── Already confirmed ─────────────────────────────────────────────────────
  if (subscriber.status === 'CONFIRMED') {
    return NextResponse.redirect(`${base}/newsletter/confirmed`, 302)
  }

  // ── Expiry check ──────────────────────────────────────────────────────────
  if (!subscriber.confirmationExpiresAt || subscriber.confirmationExpiresAt.getTime() < Date.now()) {
    // Clear the expired token so the user can re-subscribe
    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: {
        confirmationTokenHash: null,
        confirmationExpiresAt: null,
      },
    })
    return NextResponse.redirect(`${base}/newsletter/invalid?reason=expired`, 302)
  }

  // ── Status must be PENDING ────────────────────────────────────────────────
  if (subscriber.status !== 'PENDING') {
    return NextResponse.redirect(`${base}/newsletter/invalid?reason=invalid`, 302)
  }

  // ── Confirm the subscription ──────────────────────────────────────────────
  await prisma.newsletterSubscriber.update({
    where: { id: subscriber.id },
    data: {
      status:                'CONFIRMED',
      isSubscribed:          true,         // keep legacy field in sync
      confirmedAt:           new Date(),
      // Invalidate the confirmation token — single use
      confirmationTokenHash: null,
      confirmationExpiresAt: null,
    },
  })

  return NextResponse.redirect(`${base}/newsletter/confirmed`, 302)
}
