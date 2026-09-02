'use client'

/**
 * PaymentProcessor — Embedded PayMongo PIPM flow
 *
 * Card flow: create PM → attach → succeeded or 3DS modal → poll → onSuccess
 * E-wallet:  create PM → attach → next_action.redirect.url → iframe modal
 *            → poll for succeeded/failed → close modal → onSuccess/onError
 *
 * IFRAME GLITCH FIX:
 * When the e-wallet/3DS redirect completes, PayMongo redirects the iframe to
 * our `return_url` (e.g. /checkout/success?order=XXX). Without intervention
 * this briefly renders our own site inside the modal iframe before we close it.
 * Fix: we pass a `returnUrl` to the iframe via its `name` attribute. An
 * `onLoad` handler on the iframe checks whether the frame has navigated to
 * our own origin — if it has, we immediately close the modal and navigate
 * the main window to the success URL instead. We also watch postMessage
 * events for any message from the frame as an additional signal.
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
  onSuccess: (orderNumber: string) => void
  onError: (message: string) => void
  onProcessing?: () => void
}

// ─── PayMongo public-key fetch ────────────────────────────────────────────────

async function pmPublicFetch<T>(path: string, method: 'POST' | 'GET', body?: unknown): Promise<T> {
  const pubKey = process.env.NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY ?? ''
  const auth = 'Basic ' + btoa(pubKey + ':')
  const res = await fetch(`${PAYMONGO_API}${path}`, {
    method,
    headers: { Authorization: auth, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail = json?.errors?.[0]?.detail ?? `PayMongo error (${res.status})`
    throw new Error(detail)
  }
  return json as T
}

// ─── Create Payment Method ────────────────────────────────────────────────────

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
        billing: { name: card.cardholderName, email: card.billingEmail, phone: card.billingPhone },
        metadata: { orderNumber },
      },
    },
  })
}

async function createWalletPaymentMethod(type: WalletType) {
  return pmPublicFetch<{ data: { id: string } }>('/payment_methods', 'POST', {
    data: { attributes: { type, billing: {} } },
  })
}

// ─── Attach to Payment Intent ─────────────────────────────────────────────────

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
  return pmPublicFetch<AttachResponse>(`/payment_intents/${intentId}/attach`, 'POST', {
    data: {
      attributes: { payment_method: paymentMethodId, client_key: clientKey, return_url: returnUrl },
    },
  })
}

// ─── Poll PI status via our backend ──────────────────────────────────────────

async function pollPaymentIntentStatus(intentId: string): Promise<string> {
  const res = await fetch(`/api/checkout/payment-intent/${intentId}`, {
    credentials: 'include',
    cache: 'no-store',
  })
  const json = await res.json()
  if (json.success && json.data?.status) return json.data.status as string
  throw new Error('Failed to poll payment status')
}

// ─── Auth Modal — with return-URL interception ────────────────────────────────
// The iframe's `onLoad` fires both on the initial wallet page load AND when
// the provider redirects back to our `returnUrl`. We detect the latter by
// checking whether the iframe's location matches our own origin — if it does,
// we immediately close the modal and navigate the parent window instead.

function AuthModal({
  url,
  title,
  returnUrl,
  onReturnUrlDetected,
  onClose,
}: {
  url: string
  title: string
  /** The URL that PayMongo will redirect to after auth — must NOT render inside iframe */
  returnUrl: string
  /** Called when the iframe navigates to returnUrl */
  onReturnUrlDetected: () => void
  onClose: () => void
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const returnOrigin = returnUrl ? new URL(returnUrl).origin : ''

  // Intercept iframe navigation to our own origin via onLoad
  const handleIframeLoad = useCallback(() => {
    try {
      const iframeWin = iframeRef.current?.contentWindow
      if (!iframeWin) return
      // If we can read the iframe's href and it matches our return URL — intercept
      const iframeLoc = iframeWin.location.href
      if (
        iframeLoc &&
        iframeLoc !== 'about:blank' &&
        returnOrigin &&
        iframeLoc.startsWith(returnOrigin)
      ) {
        onReturnUrlDetected()
      }
    } catch {
      // Cross-origin frames throw on .location access — that means the iframe
      // is still on the provider's domain, which is fine. Do nothing.
    }
  }, [returnOrigin, onReturnUrlDetected])

  // Also listen for postMessage from the iframe as a fallback signal
  useEffect(() => {
    const handle = (e: MessageEvent) => {
      if (e.origin !== returnOrigin) return
      // Any message from our own origin inside the iframe means auth is done
      onReturnUrlDetected()
    }
    window.addEventListener('message', handle)
    return () => window.removeEventListener('message', handle)
  }, [returnOrigin, onReturnUrlDetected])

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
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* iframe — sandbox allows wallet auth */}
        <div className="flex-1 overflow-hidden">
          <iframe
            ref={iframeRef}
            src={url}
            title={title}
            onLoad={handleIframeLoad}
            className="h-full min-h-[420px] w-full border-0"
            allow="payment"
            sandbox="allow-forms allow-scripts allow-same-origin allow-top-navigation allow-popups"
          />
        </div>

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

// ─── Main hook ────────────────────────────────────────────────────────────────

export function usePaymentProcessor({
  onSuccess,
  onError,
  onProcessing,
}: PaymentProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [authModalUrl, setAuthModalUrl] = useState<string | null>(null)
  const [authModalTitle, setAuthModalTitle] = useState('Payment Authentication')
  const [authReturnUrl, setAuthReturnUrl] = useState('')
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  // Keep intentId and orderNumber accessible in callbacks without stale closure
  const intentRef = useRef<{ intentId: string; orderNumber: string } | null>(null)

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
      const MAX_ATTEMPTS = 40
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
      intentRef.current = { intentId, orderNumber }

      try {
        let paymentMethodId: string
        if (type === 'card') {
          if (!card) throw new Error('Card details are required.')
          const pm = await createCardPaymentMethod(card, orderNumber)
          paymentMethodId = pm.data.id
        } else {
          const pm = await createWalletPaymentMethod(type)
          paymentMethodId = pm.data.id
        }

        const attachRes = await attachPaymentMethod(intentId, paymentMethodId, clientKey, returnUrl)
        const intent = attachRes.data.attributes

        if (intent.status === 'succeeded') {
          setIsProcessing(false)
          onSuccess(orderNumber)
        } else if (intent.status === 'awaiting_next_action' && intent.next_action?.redirect?.url) {
          const redirectUrl = intent.next_action.redirect.url
          const modalTitle =
            type === 'card' ? '3D Secure Authentication'
            : type === 'gcash' ? 'GCash Authorization'
            : type === 'grab_pay' ? 'GrabPay Authorization'
            : type === 'paymaya' ? 'Maya Authorization'
            : 'Payment Authorization'

          setAuthModalTitle(modalTitle)
          setAuthReturnUrl(returnUrl)
          setAuthModalUrl(redirectUrl)
          pollUntilResolved(intentId, orderNumber)
        } else if (intent.status === 'awaiting_payment_method') {
          const msg = intent.last_payment_error?.failed_message
            ?? 'Payment was declined. Please try a different card or payment method.'
          setIsProcessing(false)
          onError(msg)
        } else {
          pollUntilResolved(intentId, orderNumber)
        }
      } catch (err) {
        setIsProcessing(false)
        onError(err instanceof Error ? err.message : 'Payment failed. Please try again.')
      }
    },
    [onSuccess, onError, onProcessing, pollUntilResolved]
  )

  // Called when the iframe detects navigation back to our own origin —
  // close the modal immediately and navigate the main window to success.
  const handleReturnUrlDetected = useCallback(() => {
    const ref = intentRef.current
    if (!ref) return
    stopPolling()
    setAuthModalUrl(null)
    // Immediately poll once more to confirm final status,
    // then navigate on success. If still processing, keep polling briefly.
    pollUntilResolved(ref.intentId, ref.orderNumber)
  }, [stopPolling, pollUntilResolved])

  const closeAuthModal = useCallback(() => {
    setAuthModalUrl(null)
    // Keep polling after manual close in case auth was actually completed
    const ref = intentRef.current
    if (ref) pollUntilResolved(ref.intentId, ref.orderNumber)
  }, [pollUntilResolved])

  const authModal = authModalUrl
    ? (
      <AuthModal
        url={authModalUrl}
        title={authModalTitle}
        returnUrl={authReturnUrl}
        onReturnUrlDetected={handleReturnUrlDetected}
        onClose={closeAuthModal}
      />
    )
    : null

  return { startPayment, isProcessing, authModal }
}
