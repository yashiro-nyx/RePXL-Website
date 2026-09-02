import { NextRequest, NextResponse } from 'next/server'

// POST /api/admin/simulate-webhook
// Internal utility: dispatches a mock shipping carrier update to our own webhook.
// Body: { trackingNumber: string, step: "transit" | "out_for_delivery" | "delivered" }

export const dynamic = 'force-dynamic'

const STEP_MAP: Record<string, { status_code: string; status_description: string }> = {
  transit: {
    status_code: 'IT',
    status_description: 'Your camera has left the warehouse and is on its way to you.',
  },
  out_for_delivery: {
    status_code: 'OD',
    status_description: 'Your package is out for delivery and will arrive today.',
  },
  delivered: {
    status_code: 'DE',
    status_description: 'Your camera has been delivered. Enjoy your new camera!',
  },
}

function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  return raw.replace(/\/+$/, '')
}

export async function POST(request: NextRequest) {
  let body: { trackingNumber?: string; step?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const { trackingNumber, step } = body

  if (!trackingNumber || !step || !STEP_MAP[step]) {
    return NextResponse.json(
      {
        success: false,
        error: 'Required: trackingNumber (string) and step ("transit" | "out_for_delivery" | "delivered")',
      },
      { status: 400 }
    )
  }

  const { status_code, status_description } = STEP_MAP[step]

  try {
    const res = await fetch(`${siteUrl()}/api/webhooks/shipping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tracking_number: trackingNumber, status_code, status_description }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: 'Webhook call failed', detail: data },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true, step, status_code, detail: data })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
