import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  verifyWebhookSignature,
  type PaymongoWebhookEvent,
} from '@/lib/paymongo'
import { finalizePaidOrder } from '@/lib/purchase-finalization'

// Webhooks must run per-request and read the raw body for signature verification.
export const dynamic = 'force-dynamic'

// POST /api/webhooks/paymongo
// Receives PayMongo events. On a successful payment, finalizes the matching
// order: marks it PAID, decrements stock, increments voucher usage, clears the
// user's cart — all idempotently. Then sends a confirmation email.
export async function POST(request: NextRequest) {
  // 1) Read the RAW body BEFORE parsing (signature is over the exact bytes).
  const rawBody = await request.text()
  const signature = request.headers.get('paymongo-signature')

  console.log('[paymongo webhook] received event, signature present:', !!signature)
  console.log('[paymongo webhook] webhook secret configured:', !!process.env.PAYMONGO_WEBHOOK_SECRET)

  const verification = verifyWebhookSignature(
    rawBody,
    signature,
    process.env.PAYMONGO_WEBHOOK_SECRET,
    { toleranceSeconds: 15 * 60 } // 15 min — handles clock skew between PayMongo and Vercel
  )
  if (!verification.valid) {
    console.warn('[paymongo webhook] signature rejected:', verification.reason)
    console.warn('[paymongo webhook] raw body preview:', rawBody.slice(0, 100))
    return NextResponse.json({ received: false, reason: verification.reason }, { status: 401 })
  }

  console.log('[paymongo webhook] signature verified OK')

  let event: PaymongoWebhookEvent
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ received: false }, { status: 400 })
  }

  const eventId = event.data?.id
  const type = event.data?.attributes?.type

  console.log(`[paymongo webhook] event id=${eventId} type=${type}`)

  try {
    if (type === 'checkout_session.payment.paid' || type === 'payment.paid') {
      const resource = event.data.attributes.data.attributes
      const orderNumber =
        resource.reference_number ??
        resource.metadata?.orderNumber ??
        resource.payment_intent?.attributes?.metadata?.orderNumber

      if (orderNumber) {
        console.log(`[paymongo webhook] finalizing order from ${type}: ${orderNumber}`)
        await finalizePaidOrder(orderNumber)
      }
    } else if (type === 'payment_intent.succeeded') {
      const resource = event.data.attributes.data.attributes
      const orderNumber =
        resource.metadata?.orderNumber ??
        resource.reference_number

      if (orderNumber) {
        console.log(`[paymongo webhook] finalizing order from payment_intent.succeeded: ${orderNumber}`)
        await finalizePaidOrder(orderNumber)
      }
    } else if (type === 'payment.failed') {
      const resource = event.data.attributes.data.attributes
      const orderNumber = resource.reference_number ?? resource.metadata?.orderNumber
      if (orderNumber) {
        await prisma.order
          .updateMany({
            where: { orderNumber, paymentStatus: 'PENDING' },
            data: { paymentStatus: 'FAILED', status: 'CANCELLED' },
          })
      }
    }
  } catch (err) {
    console.error('[paymongo webhook] processing error:', err)
    return NextResponse.json({ received: false }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
