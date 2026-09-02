'use client'

/**
 * PaymentProcessor — Embedded PayMongo PIPM flow
 *
 * Handles card and e-wallet payments entirely within the checkout page.
 * No full-page redirect to PayMongo for the happy path.
 *
 * ── Card flow ──────────────────────────────────────────────────────────────
 *  1. Parent calls startPayment(intentId, clientKey, 'card', cardDetails)
 *  2. We create a Payment Method via PayMongo's API (public key, client-side)
 *  3. We attach it to the Payment Intent (client_key auth)
 *  4. Status checks:
 *     • succeeded → onSuccess(orderNumber)
 *     • awaiting_next_action → open 3DS iframe modal, poll until done
 *     • awaiting_payment_method → onError(message) so user can retry
 *
 * ── E-wallet flow ──────────────────────────────────────────────────────────
 *  1. Parent calls startPayment(intentId, clientKey, 'gcash' | 'grab_pay' | 'paymaya', {})
 *  2. We create a Payment Method with the wallet type
 *  3. We attach it — response includes next_action.redirect.url
 *  4. Open that URL in an iframe modal on our page
 *  5. Poll /api/checkout/payment-intent/[id] while modal is open
 *  6. On succeeded/failed: close modal, call onSuccess/onError
 *
 * ── Notes ──────────────────────────────────────────────────────────────────
 *  • Card details are sent DIRECTLY from the browser to PayMongo's API
 *    using our PUBLIC key. They never touch our own backend.
 *  • The secret key only lives in the server-side create-payment-intent route.
 *  • 3DS iframe: some wallet/bank providers may block iframe embedding.
 *    If the modal fails to load, user can still complete via the opened URL
 *    and we poll until the PI resolves.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

const PAYMONGO_API = 'https://api.paymongo.com/v1'

export interface CardDetails {
  cardNumber: string
  expMonth: number
  expYear: number
  cvc: string
  cardholderName: string
  billingEmail: string
  billingPhone: string
}

type WalletType = 'gcash' | 'grab_pay' | 'paymaya'
type PaymentMethodType = 'card' | WalletType

interface PaymentProcessorProps {
  /**
   * Called with the return_url after 3DS or wallet auth so the parent can
   * navigate (or we can use it internally).
   */
  onSuccess: (orderNumber: string) => void
  onError: (message: string) => void
  onProcessing?: () => void
}

export interface PaymentProcessorHandle {
  startPayment: (params: {
    intentId: string
    clientKey: string
    orderNumber: string
    returnUrl: string
    type: PaymentMethodType
    card?: CardDetails
  }) => Promise<void>
}

// ─── Internal helper — call PayMongo API with the public key (client-side) ──────

async function pmPublicFetch<T>(path: string, method: 'POST' | 'GET', body?: unknown): Promise<T> {
  const pubKey = process.env.NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY ?? ''
  const auth = 'Basic ' + btoa(pubKey + ':')
  const res = await fetch(`${PAYMONGO_API}${path}`, {
    method,
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail = json?.errors?.[0]?.detail ?? `PayMongo error (${res.status})`
    throw new Error(detail)
  }
  return json as T
}

// ─── Create a Payment Method (client-side, public key) ──────────────────────────

async function createCardPaymentMethod(card: CardDetails, orderNumber: string) {
  return pmPublicFetch<{ data: { id: string } }>('/payment_methods', 'POST', {
    data: {
      attributes: {
        type: 'card',
        details: {
          card_number: card.cardNumber.replace(/\s/g, ''),
          exp_month: card.expMonth,
          exp_year: card.expYear,
          cvc: card.cvc,
        },
        billing: {
          name: card.cardholderName,
          email: card.billingEmail,
          phone: card.billingPhone,
        },
        metadata: { orderNumber },
      },
    },
  })
}

async function createWalletPaymentMethod(type: WalletType, returnUrl: string) {
  return pmPublicFetch<{ data: { id: string } }>('/payment_methods', 'POST', {
    data: {
      attributes: {
        type,
        billing: {},
      },
    },
  })
}

// ─── Attach Payment Method to Payment Intent (client-side, public key) ──────────

interface AttachResponse {
  data: {
    id: string
    attributes: {
      status: string
      client_key: string
      next_action?: { type: string; redirect?: { url: string; return_url?: string } }
      last_payment_error?: { failed_message?: string }
    }
  }
}

async function attachPaymentMethod(
  intentId: string,
  paymentMethodId: string,
  clientKey: string,
  returnUrl: string
): Promise<AttachResponse> {
  return pmPublicFetch<AttachResponse>(
    `/payment_intents/${intentId}/attach`,
    'POST',
    {
      data: {
        attributes: {
          payment_method: paymentMethodId,
          client_key: clientKey,
          return_url: returnUrl,
        },
      },
    }
  )
}

// ─── Poll our backend for PI status (server-side fetch via our API) ──────────────

async function pollPaymentIntentStatus(intentId: string): Promise<string> {
  const res = await fetch(`/api/checkout/payment-intent/${intentId}`, {
    credentials: 'include',
    cache: 'no-store',
  })
  const json = await res.json()
  if (json.success && json.data?.status) return json.data.status as string
  throw new Error('Failed to poll payment status')
}

// ─── Auth Modal (3DS or e-wallet redirect) ───────────────────────────────────────

function AuthModal({
  url,
  title,
  onClose,
}: {
  url: string
  title: string
  onClose: () => void
}) {
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal shadow-2xl">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-repixl-muted/10 px-5 py-4">
          <div>
            <h2 className="font-display text-base font-semibold text-repixl-text-light">{title}</h2>
            <p className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted">
              Complete authentication to finish payment
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication window"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-repixl-muted transition-colors hover:bg-repixl-bg hover:text-repixl-text-light"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* iframe */}
        <div className="flex-1 overflow-hidden">
          <iframe
            src={url}
            title={title}
            className="h-full min-h-[420px] w-full border-0"
            allow="payment"
            sandbox="allow-forms allow-scripts allow-same-origin allow-top-navigation allow-popups"
          />
        </div>

        {/* Footer hint */}
        <div className="flex-shrink-0 border-t border-repixl-muted/10 px-5 py-3 text-center">
          <p className="font-mono text-[10px] text-repixl-muted/50">
            This window will close automatically once authentication is complete.
          </p>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── Main hook ───────────────────────────────────────────────────────────────────

/**
 * usePaymentProcessor — returns a `startPayment` function that runs the
 * full PIPM flow and calls onSuccess/onError when done.
 *
 * Also returns `authModal` (a portal to render) and `isProcessing`.
 */
export function usePaymentProcessor({
  onSuccess,
  onError,
  onProcessing,
}: PaymentProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [authModalUrl, setAuthModalUrl] = useState<string | null>(null)
  const [authModalTitle, setAuthModalTitle] = useState('Payment Authentication')
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (pollRef.current) clearTimeout(pollRef.current)
    }
  }, [])

  const stopPolling = useCallback(() => {
    if (pollRef.current) clearTimeout(pollRef.current)
    pollRef.current = null
  }, [])

  const pollUntilResolved = useCallback(
    (intentId: string, orderNumber: string, attempts = 0) => {
      const MAX_ATTEMPTS = 40 // 40 × 2.5s = 100s timeout
      const poll = async () => {
        if (!mountedRef.current) return
        try {
          const status = await pollPaymentIntentStatus(intentId)
          if (status === 'succeeded') {
            stopPolling()
            setAuthModalUrl(null)
            setIsProcessing(false)
            onSuccess(orderNumber)
          } else if (status === 'failed' || status === 'awaiting_payment_method') {
            stopPolling()
            setAuthModalUrl(null)
            setIsProcessing(false)
            onError('Payment failed. Please check your details and try again.')
          } else if (attempts < MAX_ATTEMPTS) {
            // processing / awaiting_next_action — keep polling
            pollRef.current = setTimeout(() => pollUntilResolved(intentId, orderNumber, attempts + 1), 2500)
          } else {
            stopPolling()
            setAuthModalUrl(null)
            setIsProcessing(false)
            onError('Payment timed out. Please check your order status or try again.')
          }
        } catch {
          if (attempts < MAX_ATTEMPTS) {
            pollRef.current = setTimeout(() => pollUntilResolved(intentId, orderNumber, attempts + 1), 3000)
          } else {
            stopPolling()
            setAuthModalUrl(null)
            setIsProcessing(false)
            onError('Could not verify payment status. Check your order history.')
          }
        }
      }
      poll()
    },
    [onSuccess, onError, stopPolling]
  )

  const startPayment = useCallback(
    async ({
      intentId,
      clientKey,
      orderNumber,
      returnUrl,
      type,
      card,
    }: {
      intentId: string
      clientKey: string
      orderNumber: string
      returnUrl: string
      type: PaymentMethodType
      card?: CardDetails
    }) => {
      setIsProcessing(true)
      onProcessing?.()

      try {
        // Step 1 — Create Payment Method (client-side, public key only)
        let paymentMethodId: string
        if (type === 'card') {
          if (!card) throw new Error('Card details are required.')
          const pm = await createCardPaymentMethod(card, orderNumber)
          paymentMethodId = pm.data.id
        } else {
          const pm = await createWalletPaymentMethod(type, returnUrl)
          paymentMethodId = pm.data.id
        }

        // Step 2 — Attach Payment Method to Intent (client-side, public key + client_key)
        const attachRes = await attachPaymentMethod(intentId, paymentMethodId, clientKey, returnUrl)
        const intent = attachRes.data.attributes

        // Step 3 — Handle status
        if (intent.status === 'succeeded') {
          setIsProcessing(false)
          onSuccess(orderNumber)
        } else if (intent.status === 'awaiting_next_action' && intent.next_action?.redirect?.url) {
          // 3DS or e-wallet redirect — open in modal
          const redirectUrl = intent.next_action.redirect.url
          const modalTitle = type === 'card'
            ? '3D Secure Authentication'
            : type === 'gcash' ? 'GCash Authorization'
            : type === 'grab_pay' ? 'GrabPay Authorization'
            : type === 'paymaya' ? 'Maya Authorization'
            : 'Payment Authorization'

          setAuthModalTitle(modalTitle)
          setAuthModalUrl(redirectUrl)
          // Start polling while modal is open
          pollUntilResolved(intentId, orderNumber)
        } else if (intent.status === 'awaiting_payment_method') {
          const msg = intent.last_payment_error?.failed_message ?? 'Payment was declined. Please try a different card or payment method.'
          setIsProcessing(false)
          onError(msg)
        } else {
          // processing — poll for resolution
          pollUntilResolved(intentId, orderNumber)
        }
      } catch (err) {
        setIsProcessing(false)
        onError(err instanceof Error ? err.message : 'Payment failed. Please try again.')
      }
    },
    [onSuccess, onError, onProcessing, pollUntilResolved]
  )

  const closeAuthModal = useCallback(() => {
    // User manually closed the modal — keep polling in case they completed auth
    setAuthModalUrl(null)
    // Poll a few more times to catch completion
  }, [])

  const authModal = authModalUrl
    ? (
      <AuthModal
        url={authModalUrl}
        title={authModalTitle}
        onClose={closeAuthModal}
      />
    )
    : null

  return { startPayment, isProcessing, authModal }
}
