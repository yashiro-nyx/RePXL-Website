import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendNotificationEmail } from '@/lib/mailer'
import {
  generateNewsletterToken,
  hashNewsletterToken,
  siteOrigin,
  confirmationEmailHtml,
  CONFIRMATION_TTL_MS,
} from '@/lib/newsletter'

// Simple in-memory rate limiter: max 3 requests per IP per 10 minutes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW = 10 * 60 * 1000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return false
  }
  if (record.count >= RATE_LIMIT_MAX) return true
  record.count++
  return false
}

// Generic response that avoids leaking whether an address is registered
const GENERIC_OK = { message: "If this address is eligible, we've sent the appropriate subscription email." }

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (isRateLimited(ip)) {
      return NextResponse.json({ message: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const body = await req.json()
    const email = (body?.email ?? '').trim().toLowerCase()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: 'Invalid email address.' }, { status: 400 })
    }

    // ── Look up existing subscriber ──────────────────────────────────────────
    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } })

    if (existing?.status === 'CONFIRMED') {
      // Already confirmed — do not create duplicate, return generic response to
      // avoid leaking subscriber status to an attacker
      return NextResponse.json(GENERIC_OK, { status: 200 })
    }

    if (existing?.status === 'UNSUBSCRIBED') {
      // Allow re-subscription via a fresh confirmation flow
    }
    // PENDING → re-send a fresh confirmation link (invalidates previous token)

    // ── Generate confirmation token ──────────────────────────────────────────
    const rawToken     = generateNewsletterToken()
    const tokenHash    = hashNewsletterToken(rawToken)
    const expiresAt    = new Date(Date.now() + CONFIRMATION_TTL_MS)

    // Also create a stable unsubscribe token if not already present
    const rawUnsub  = generateNewsletterToken()
    const unsubHash = hashNewsletterToken(rawUnsub)

    await prisma.newsletterSubscriber.upsert({
      where:  { email },
      create: {
        email,
        status:                 'PENDING',
        isSubscribed:           false,
        confirmationTokenHash:  tokenHash,
        confirmationExpiresAt:  expiresAt,
        unsubscribeTokenHash:   unsubHash,
      },
      update: {
        status:                 'PENDING',
        isSubscribed:           false,
        confirmationTokenHash:  tokenHash,
        confirmationExpiresAt:  expiresAt,
        // Keep existing unsubscribeTokenHash if already set; only set on first creation
        ...(!existing?.unsubscribeTokenHash ? { unsubscribeTokenHash: unsubHash } : {}),
      },
    })

    // ── Send confirmation email (transactional — not marketing) ─────────────
    const confirmUrl = `${siteOrigin()}/api/newsletter/confirm?token=${encodeURIComponent(rawToken)}`

    await sendNotificationEmail(
      email,
      'Confirm your RePIXL subscription',
      `You requested to subscribe to the RePIXL newsletter.\n\nConfirm your subscription by visiting:\n${confirmUrl}\n\nThis link expires in 24 hours. If you did not request this, please ignore this email.`,
      { html: confirmationEmailHtml(confirmUrl) }
    )

    return NextResponse.json(GENERIC_OK, { status: 200 })
  } catch (error) {
    console.error('Newsletter subscribe error:', error)
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
