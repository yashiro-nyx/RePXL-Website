// ─── PayMongo client (server-only) ──────────────────────────────────────────────
// Hosted Checkout integration for RePXL. PayMongo is the Philippine payment
// gateway used for card + GCash + local methods.
//
// Plug-and-play: if PAYMONGO_SECRET_KEY is not set, isPaymongoConfigured() returns
// false and the app uses its existing direct-order (demo) flow. Add the key and
// the checkout automatically switches to real hosted payments.
//
// NEVER import this from a client component — it uses the secret key.

import { createHmac, timingSafeEqual } from 'crypto'

const PAYMONGO_API = 'https://api.paymongo.com/v1'

export function isPaymongoConfigured(): boolean {
  return Boolean(process.env.PAYMONGO_SECRET_KEY)
}

/** True when using a test-mode secret key (sk_test_...). */
export function isTestMode(): boolean {
  return (process.env.PAYMONGO_SECRET_KEY ?? '').startsWith('sk_test')
}

function authHeader(): string {
  // HTTP Basic auth: secret key as username, empty password → base64("key:").
  const key = process.env.PAYMONGO_SECRET_KEY ?? ''
  return `Basic ${Buffer.from(`${key}:`).toString('base64')}`
}

async function paymongoRequest<T>(
  path: string,
  method: 'GET' | 'POST',
  body?: unknown
): Promise<T> {
  const res = await fetch(`${PAYMONGO_API}${path}`, {
    method,
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail = json?.errors?.[0]?.detail ?? `PayMongo request failed (${res.status})`
    throw new Error(detail)
  }
  return json as T
}

// ─── Payment Intents (PIPM — embedded flow) ──────────────────────────────────────

export interface CreatePaymentIntentInput {
  /** Total amount in centavos (e.g. ₱100.00 → 10000) */
  amount: number
  currency?: 'PHP'
  description?: string
  /** e.g. ['card'] or ['gcash'] or ['card','gcash','grab_pay','paymaya'] */
  paymentMethodAllowed: string[]
  metadata?: Record<string, string>
}

export interface PaymentIntentAttributes {
  status:
    | 'awaiting_payment_method'
    | 'awaiting_next_action'
    | 'processing'
    | 'succeeded'
    | 'failed'
  amount: number
  currency: string
  client_key: string
  description?: string
  last_payment_error?: { failed_code?: string; failed_message?: string }
  next_action?: {
    type: 'redirect'
    redirect?: { url: string; return_url?: string }
  }
  payments?: Array<{ id: string; attributes?: { status?: string } }>
  metadata?: Record<string, string>
}

export interface PaymentIntent {
  id: string
  attributes: PaymentIntentAttributes
}

export async function createPaymentIntent(
  input: CreatePaymentIntentInput
): Promise<PaymentIntent> {
  const payload = {
    data: {
      attributes: {
        amount: input.amount,
        currency: input.currency ?? 'PHP',
        payment_method_allowed: input.paymentMethodAllowed,
        description: input.description,
        metadata: input.metadata,
      },
    },
  }
  const res = await paymongoRequest<{ data: PaymentIntent }>(
    '/payment_intents',
    'POST',
    payload
  )
  return res.data
}

export async function retrievePaymentIntent(id: string): Promise<PaymentIntent> {
  const res = await paymongoRequest<{ data: PaymentIntent }>(
    `/payment_intents/${id}`,
    'GET'
  )
  return res.data
}

// ─── Checkout Sessions ──────────────────────────────────────────────────────────

export interface CheckoutLineItem {
  name: string
  quantity: number
  /** Unit amount in centavos (e.g. ₱89.00 → 8900). */
  amount: number
  currency: 'PHP'
  description?: string
  images?: string[]
}

export interface CreateCheckoutSessionInput {
  lineItems: CheckoutLineItem[]
  /** Extra non-product lines (e.g. shipping, negative for discounts is NOT allowed). */
  successUrl: string
  cancelUrl: string
  referenceNumber: string // our order number, echoed back on the session
  description?: string
  paymentMethodTypes?: string[]
  metadata?: Record<string, string>
}

export interface CheckoutSession {
  id: string
  attributes: {
    checkout_url: string
    reference_number: string
    payment_intent?: { id: string; attributes?: { status?: string } }
    payments?: Array<{ id: string; attributes?: { status?: string } }>
    status?: string
    [k: string]: unknown
  }
}

const DEFAULT_METHODS = ['card', 'gcash', 'paymaya', 'grab_pay', 'qrph']

/**
 * Create a PayMongo Hosted Checkout session and return the session (whose
 * attributes.checkout_url is where the customer pays).
 */
export async function createCheckoutSession(
  input: CreateCheckoutSessionInput
): Promise<CheckoutSession> {
  const payload = {
    data: {
      attributes: {
        line_items: input.lineItems.map((li) => ({
          name: li.name,
          quantity: li.quantity,
          amount: li.amount,
          currency: li.currency,
          description: li.description,
          images: li.images,
        })),
        payment_method_types: input.paymentMethodTypes ?? DEFAULT_METHODS,
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        reference_number: input.referenceNumber,
        description: input.description,
        metadata: input.metadata,
        send_email_receipt: false,
        show_line_items: true,
      },
    },
  }

  const res = await paymongoRequest<{ data: CheckoutSession }>(
    '/checkout_sessions',
    'POST',
    payload
  )
  return res.data
}

export async function retrieveCheckoutSession(id: string): Promise<CheckoutSession> {
  const res = await paymongoRequest<{ data: CheckoutSession }>(
    `/checkout_sessions/${id}`,
    'GET'
  )
  return res.data
}

// ─── Webhook signature verification ──────────────────────────────────────────────
// PayMongo signs each webhook. The `Paymongo-Signature` header looks like:
//   t=<unix_ts>,te=<test_sig>,li=<live_sig>
// The signature is HMAC-SHA256 of `${t}.${rawBody}` using the webhook secret,
// hex-encoded. Compare against `te` in test mode and `li` in live mode.

export interface WebhookVerifyResult {
  valid: boolean
  reason?: string
}

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string | undefined,
  opts: { toleranceSeconds?: number } = {}
): WebhookVerifyResult {
  if (!webhookSecret) return { valid: false, reason: 'missing webhook secret' }
  if (!signatureHeader) return { valid: false, reason: 'missing signature header' }

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((kv) => {
      const [k, v] = kv.split('=')
      return [k?.trim(), v?.trim()]
    })
  ) as { t?: string; te?: string; li?: string }

  if (!parts.t) return { valid: false, reason: 'malformed signature header' }

  // Optional replay protection.
  const tolerance = opts.toleranceSeconds ?? 5 * 60
  const ts = parseInt(parts.t, 10)
  if (!Number.isNaN(ts) && tolerance > 0) {
    const ageSeconds = Math.abs(Date.now() / 1000 - ts)
    if (ageSeconds > tolerance) return { valid: false, reason: 'timestamp outside tolerance' }
  }

  const provided = isTestMode() ? parts.te : parts.li
  if (!provided) return { valid: false, reason: 'no signature for current mode' }

  const expected = createHmac('sha256', webhookSecret)
    .update(`${parts.t}.${rawBody}`)
    .digest('hex')

  const a = Buffer.from(expected)
  const b = Buffer.from(provided)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { valid: false, reason: 'signature mismatch' }
  }
  return { valid: true }
}

// ─── Webhook event typing ────────────────────────────────────────────────────────

export interface PaymongoWebhookEvent {
  data: {
    id: string // evt_...
    attributes: {
      type: string // e.g. "checkout_session.payment.paid", "payment.paid", "payment.failed"
      data: {
        id: string
        attributes: {
          reference_number?: string
          status?: string
          payments?: Array<{ id: string; attributes?: { status?: string } }>
          payment_intent?: { attributes?: { metadata?: Record<string, string> } }
          metadata?: Record<string, string>
          [k: string]: unknown
        }
      }
    }
  }
}

// ─── Refunds (Requirement 4) ─────────────────────────────────────────────────────
// Full/partial refund of a captured payment. Used by the admin returns workflow
// once a return request is APPROVED and the order's payment status is PAID.

export interface RefundInput {
  /** PayMongo payment id (from Order.paymentReference / payments[].id). */
  paymentId: string
  /** Amount to refund, in centavos (e.g. ₱89.00 → 8900). */
  amount: number
  /** PayMongo-accepted refund reason. Defaults to requested_by_customer. */
  reason?: 'requested_by_customer' | 'others'
  /** Optional free-text note stored on the refund. */
  notes?: string
}

export interface RefundResult {
  id: string
  status: string
}

/**
 * Create a refund for a captured PayMongo payment.
 * Throws with the PayMongo error detail on a non-ok response (gateway failure).
 * Callers that need the 30s bound (Req 4.12) should use `createRefundWithTimeout`.
 */
export async function createRefund(input: RefundInput): Promise<RefundResult> {
  const payload = {
    data: {
      attributes: {
        amount: input.amount,
        payment_id: input.paymentId,
        reason: input.reason ?? 'requested_by_customer',
        ...(input.notes ? { notes: input.notes } : {}),
      },
    },
  }

  const res = await paymongoRequest<{
    data: { id: string; attributes: { status: string } }
  }>('/refunds', 'POST', payload)

  return { id: res.data.id, status: res.data.attributes.status }
}

/** Retrieve a previously-created refund by id. */
export async function retrieveRefund(id: string): Promise<RefundResult> {
  const res = await paymongoRequest<{
    data: { id: string; attributes: { status: string } }
  }>(`/refunds/${id}`, 'GET')

  return { id: res.data.id, status: res.data.attributes.status }
}

// ─── Timeout wrapper (Req 4.12) ──────────────────────────────────────────────────
// A caller-facing timeout so the refund call can't hang the admin request. A
// timeout is surfaced as a typed `TimeoutError` so it is distinguishable from a
// gateway error (which is a plain `Error` carrying the PayMongo detail).

export const REFUND_TIMEOUT_MS = 30_000

/** Thrown when a wrapped promise does not settle within the allotted time. */
export class TimeoutError extends Error {
  readonly isTimeout = true as const
  constructor(ms: number) {
    super(`Operation timed out after ${ms}ms`)
    this.name = 'TimeoutError'
  }
}

/** Type guard so callers can branch on timeout vs. gateway failure. */
export function isTimeoutError(err: unknown): err is TimeoutError {
  return err instanceof TimeoutError || (typeof err === 'object' && err !== null && (err as { isTimeout?: boolean }).isTimeout === true)
}

/**
 * Race `promise` against a timer. Rejects with `TimeoutError` if `ms` elapses
 * first; otherwise resolves/rejects exactly as the wrapped promise does.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number = REFUND_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(ms)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>
}

/**
 * Create a refund bounded by a 30s timeout (Req 4.12). On timeout, rejects with
 * a `TimeoutError`; on gateway failure, rejects with the PayMongo error detail.
 */
export function createRefundWithTimeout(
  input: RefundInput,
  ms: number = REFUND_TIMEOUT_MS
): Promise<RefundResult> {
  return withTimeout(createRefund(input), ms)
}
