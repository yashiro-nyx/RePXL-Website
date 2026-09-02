'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { Container } from '@/components/layout/Container'
import { Footer } from '@/components/layout/Footer'
import { Button, PageLoader } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import { useOrderHistoryStore, type Order } from '@/stores/orderHistoryStore'
import { computeStepperState } from '@/lib/order-tracking'
import { TrackingTimeline } from '@/components/tracking/TrackingTimeline'

// Leaflet requires the browser
const TrackingMap = dynamic(
  () => import('@/components/tracking/TrackingMap').then((m) => ({ default: m.TrackingMap })),
  { ssr: false, loading: () => <div className="mt-4 h-[300px] animate-pulse rounded-2xl bg-repixl-charcoal/40" /> }
)

const STEP_LABELS: Record<string, string> = {
  PROCESSING: 'Order Placed',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
}

const statusStyles: Record<string, string> = {
  Processing: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Shipped: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Delivered: 'bg-green-500/15 text-green-400 border-green-500/30',
  Completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
}

// ─── Rating Stars ────────────────────────────────────────────────────────────
function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1.5" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n)}
          className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40 ${
            n <= value
              ? 'border-repixl-warning/50 bg-repixl-warning/15 text-repixl-warning'
              : 'border-repixl-muted/20 bg-repixl-bg/40 text-repixl-muted/40 hover:border-repixl-muted/40 hover:text-repixl-muted'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
            fill={n <= value ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      ))}
    </div>
  )
}

// ─── Inline spinner ──────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export default function OrderDetailPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>()
  const router = useRouter()
  const { isLoggedIn, userEmail, hydrate } = useAuthStore()
  const updateStatus = useOrderHistoryStore((s) => s.updateStatus)
  const [hydrated, setHydrated] = useState(false)
  const [order, setOrder] = useState<Order | null>(null)
  const [notFound, setNotFound] = useState(false)

  // ── Cancel order state ──
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  // ── Confirm receipt + review state ──
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [reviewStep, setReviewStep] = useState(false) // false = confirm dialog, true = feedback form
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [reviewErrors, setReviewErrors] = useState<{ rating?: string; comment?: string }>({})
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewSubmitError, setReviewSubmitError] = useState<string | null>(null)

  useEffect(() => {
    hydrate().then(() => {
      useOrderHistoryStore.getState().hydrate()
      setHydrated(true)
    })
  }, [hydrate])

  useEffect(() => {
    if (!hydrated) return
    if (!isLoggedIn) { router.push('/login'); return }
    // Don't attempt to fetch until auth has resolved the user's email.
    // userEmail starts as '' and is populated after auth hydration.
    // Fetching before it's populated causes a false ownership-check failure.
    if (!userEmail) return

    // Fetch the specific order directly from the API so we always get the
    // latest tracking fields (deliveryStatus, trackingProgress, etc.)
    // rather than relying on the potentially-stale store list.
    const fetchOrder = async () => {
      // Reset notFound so a retry (e.g. after userEmail populates) doesn't
      // stay stuck showing the not-found screen.
      setNotFound(false)

      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderNumber ?? '')}`, {
          credentials: 'include',
          cache: 'no-store',
        })
        if (res.status === 401 || res.status === 403) {
          router.push('/login')
          return
        }
        if (res.status === 404) {
          setNotFound(true)
          return
        }
        if (!res.ok) {
          setNotFound(true)
          return
        }
        const json = await res.json().catch(() => null)
        if (!json?.success || !json?.data) {
          setNotFound(true)
          return
        }

        // Map the raw API order to the client Order shape using the existing mapper
        const { apiToClientOrder } = await import('@/lib/mappers')
        const mapped = apiToClientOrder(json.data)

        // Ownership check — the server already scopes GET /api/orders/[orderNumber]
        // to the authenticated user, so a 404 means it's not theirs. The client
        // check here is a secondary guard using the email field. Only reject if
        // userEmail is populated AND it doesn't match — never reject on empty string.
        if (mapped.userEmail && userEmail && mapped.userEmail !== userEmail) {
          setNotFound(true)
          return
        }

        setOrder(mapped)
      } catch {
        setNotFound(true)
      }
    }

    void fetchOrder()
  }, [hydrated, isLoggedIn, orderNumber, userEmail, router])

  // ── Cancel order handler ──
  const handleCancelConfirm = async () => {
    if (!order) return
    setCancelling(true)
    setCancelError(null)
    try {
      const res = await fetch(`/api/orders/${order.orderNumber}/cancel`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setCancelModalOpen(false)
        await updateStatus(order.orderNumber, 'Cancelled')
        setOrder((prev) => prev ? { ...prev, status: 'Cancelled' } : prev)
      } else {
        setCancelError(data.error ?? 'Cancellation failed. Please try again.')
      }
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Network error.')
    } finally {
      setCancelling(false)
    }
  }

  // ── Submit review + confirm receipt ──
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: { rating?: string; comment?: string } = {}
    if (rating < 1 || rating > 5) errs.rating = 'Please select a rating (1–5 stars).'
    const trimmed = comment.trim()
    if (trimmed.length < 5) errs.comment = 'Feedback must be at least 5 characters.'
    if (trimmed.length > 2000) errs.comment = 'Feedback must be 2000 characters or fewer.'
    setReviewErrors(errs)
    if (Object.keys(errs).length > 0) return

    if (!order) return
    setSubmittingReview(true)
    setReviewSubmitError(null)
    try {
      const res = await fetch(`/api/orders/${order.orderNumber}/confirm-receipt`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: trimmed }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setConfirmModalOpen(false)
        await updateStatus(order.orderNumber, 'Completed')
        setOrder((prev) => prev ? { ...prev, status: 'Completed' } : prev)
      } else {
        setReviewSubmitError(data.error ?? 'Submission failed. Please try again.')
      }
    } catch (err) {
      setReviewSubmitError(err instanceof Error ? err.message : 'Network error.')
    } finally {
      setSubmittingReview(false)
    }
  }

  if (!hydrated || !isLoggedIn) return <PageLoader label="Loading order…" />
  if (!order) return null

  if (notFound) {
    return (
      <div className="burn-subtle flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="font-display text-display-md text-repixl-text-light">Order not found</p>
          <p className="mt-2 text-sm text-repixl-muted">This order doesn't exist or you don't have access to it.</p>
          <Link href="/account/orders" className="mt-6 inline-block"><Button variant="primary" size="md">View Orders</Button></Link>
        </div>
      </div>
    )
  }

  const statusMap: Record<string, string> = {
    Processing: 'PROCESSING', Shipped: 'SHIPPED', Delivered: 'DELIVERED', Completed: 'COMPLETED', Cancelled: 'CANCELLED',
  }
  const enumStatus = statusMap[order.status] as any
  const stepper = computeStepperState(enumStatus)

  // Map status → tracking map props — use real DB deliveryStatus if available
  const dbDeliveryStatus = order.deliveryStatus ?? ''
  const mapStatus =
    dbDeliveryStatus === 'Delivered' || order.status === 'Delivered' || order.status === 'Completed' ? 'Delivered'
    : dbDeliveryStatus === 'Out for Delivery' ? 'Out for Delivery'
    : dbDeliveryStatus === 'In Transit' || order.status === 'Shipped' ? 'In Transit'
    : 'Order Placed'

  const mapProgress =
    dbDeliveryStatus === 'Delivered' || order.status === 'Delivered' || order.status === 'Completed' ? 100
    : dbDeliveryStatus === 'Out for Delivery' ? 75
    : dbDeliveryStatus === 'In Transit' || order.status === 'Shipped' ? 50
    : 25

  const cancellable = order.status === 'Processing'
  const awaitingReceipt = order.status === 'Delivered'
  const completed = order.status === 'Completed'
  const cancelled = order.status === 'Cancelled'

  return (
    <>
      <div className="burn-subtle min-h-screen pb-20 pt-24">
        <Container>
          {/* Breadcrumb + actions bar */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <nav className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
              <Link href="/account" className="hover:text-repixl-text-light">Account</Link>
              <span>/</span>
              <Link href="/account/orders" className="hover:text-repixl-text-light">Orders</Link>
              <span>/</span>
              <span className="text-repixl-text-light/50">{order.orderNumber}</span>
            </nav>
            <div className="flex items-center gap-3">
              <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${statusStyles[order.status] ?? ''}`}>
                {order.status}
              </span>
              <button
                type="button"
                onClick={() => window.print()}
                className="no-print flex items-center gap-1.5 rounded-lg border border-repixl-muted/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-repixl-muted transition-colors hover:border-repixl-muted/40 hover:text-repixl-text-light"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect width="12" height="8" x="6" y="14" />
                </svg>
                Print Receipt
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left column */}
            <div className="space-y-6 lg:col-span-2">

              {/* Order status stepper */}
              <div className="rounded-2xl border border-repixl-muted/10 bg-repixl-charcoal p-5">
                <p className="mb-5 font-mono text-[10px] uppercase tracking-widest text-repixl-muted">Order Status</p>
                {stepper.cancelled ? (
                  <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-red-400" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </div>
                    <p className="text-sm font-medium text-red-400">Order Cancelled</p>
                  </div>
                ) : (
                  <div className="relative flex items-center justify-between">
                    <div className="absolute left-0 right-0 top-4 h-px bg-repixl-muted/15" aria-hidden="true" />
                    {stepper.steps.map((step, i) => (
                      <div key={step.status} className="relative flex flex-col items-center gap-2 text-center">
                        <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                          step.current ? 'border-repixl-red bg-repixl-red text-white'
                          : step.reached ? 'border-repixl-success bg-repixl-success/20 text-repixl-success'
                          : 'border-repixl-muted/30 bg-repixl-bg text-repixl-muted/40'
                        }`}>
                          {step.reached && !step.current ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                          ) : (
                            <span className="font-mono text-[10px] font-bold">{i + 1}</span>
                          )}
                        </div>
                        <p className={`font-mono text-[9px] uppercase tracking-wider ${step.current ? 'text-repixl-red' : step.reached ? 'text-repixl-success' : 'text-repixl-muted/50'}`}>
                          {STEP_LABELS[step.status] ?? step.status}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Delivery Tracking (always shown for non-cancelled) ── */}
              {!cancelled && (
                <div className="space-y-0">
                  <TrackingTimeline
                    trackingNumber={order.orderNumber}
                    initialState={{
                      // Prefer real DB tracking fields; fall back to status-derived values
                      // so orders placed before the tracking system existed still show
                      // a sensible initial state.
                      status: order.deliveryStatus ?? (
                        order.status === 'Processing' ? 'Order Placed'
                        : order.status === 'Shipped' ? 'In Transit'
                        : order.status === 'Delivered' || order.status === 'Completed' ? 'Delivered'
                        : 'Order Placed'
                      ),
                      progress: order.trackingProgress ?? (
                        order.status === 'Processing' ? 25
                        : order.status === 'Shipped' ? 50
                        : order.status === 'Delivered' || order.status === 'Completed' ? 100
                        : 25
                      ),
                      description: order.trackingDescription ?? (
                        order.status === 'Processing'
                          ? 'We are preparing your camera gear and checking lens optics.'
                          : order.status === 'Shipped'
                          ? 'Your camera is on its way to you.'
                          : 'Your camera has been delivered. Enjoy!'
                      ),
                    }}
                  />
                  <TrackingMap status={mapStatus} progress={mapProgress} />
                </div>
              )}

              {/* ── Context-sensitive action cards ── */}

              {/* PROCESSING: Cancel Order */}
              {cancellable && (
                <div className="rounded-2xl border border-repixl-muted/10 bg-repixl-charcoal p-5">
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-repixl-muted">Order Actions</p>
                  <p className="mb-4 text-sm text-repixl-text-light/70">
                    Your order is being processed. You can cancel it before it ships.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCancelModalOpen(true)}
                    className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    Cancel Order
                  </button>
                </div>
              )}

              {/* DELIVERED: Confirm Received */}
              {awaitingReceipt && (
                <div className="rounded-2xl border border-repixl-success/20 bg-repixl-success/5 p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-repixl-success/20">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-success" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-display text-sm font-semibold text-repixl-text-light">Your order has been delivered!</p>
                      <p className="mt-1 text-xs text-repixl-text-light/60">
                        Confirm you received it and share your experience to complete your order.
                      </p>
                      <button
                        type="button"
                        onClick={() => { setConfirmModalOpen(true); setReviewStep(false) }}
                        className="mt-3 rounded-xl bg-repixl-success px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-repixl-success/80"
                      >
                        Confirm Received
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* COMPLETED: Thank you */}
              {completed && (
                <div className="rounded-2xl border border-repixl-muted/10 bg-repixl-charcoal p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-repixl-text-light">Order Completed</p>
                      <p className="font-mono text-[10px] text-repixl-muted">Thank you for your feedback!</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Return / refund link (Delivered or Completed) */}
              {(awaitingReceipt || completed) && (
                <Link
                  href={`/account/orders/${order.orderNumber}/return`}
                  className="inline-flex items-center gap-2 rounded-xl border border-repixl-muted/20 px-4 py-2.5 font-mono text-sm text-repixl-muted transition-colors hover:border-repixl-muted/40 hover:text-repixl-text-light"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                  Request Return / Refund
                </Link>
              )}

              {/* Items */}
              <div className="rounded-2xl border border-repixl-muted/10 bg-repixl-charcoal p-5">
                <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-repixl-muted">Items Ordered</p>
                <div className="space-y-3">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-repixl-bg/50 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-repixl-text-light">{item.name || item.slug}</p>
                        <p className="font-mono text-[10px] text-repixl-muted">×{item.stock}</p>
                      </div>
                      <p className="font-mono text-sm text-repixl-text-light">${(item.price * item.stock).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right sidebar */}
            <aside className="space-y-4">
              <div className="rounded-2xl border border-repixl-muted/10 bg-repixl-charcoal p-5">
                <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-repixl-muted">Order Info</p>
                <dl className="space-y-3">
                  {[
                    { label: 'Order #', value: order.orderNumber },
                    { label: 'Date', value: order.date },
                    { label: 'Courier', value: order.courierName },
                    { label: 'Estimate', value: order.courierEstimate },
                    { label: 'Payment', value: order.paymentMethod },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between gap-4">
                      <dt className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted">{label}</dt>
                      <dd className="font-mono text-xs text-repixl-text-light/80 text-right">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="rounded-2xl border border-repixl-muted/10 bg-repixl-charcoal p-5">
                <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-repixl-muted">Summary</p>
                <dl className="space-y-2">
                  <div className="flex justify-between text-sm"><dt className="text-repixl-text-light/60">Subtotal</dt><dd className="font-mono text-repixl-text-light">${order.subtotal.toFixed(2)}</dd></div>
                  <div className="flex justify-between text-sm"><dt className="text-repixl-text-light/60">Shipping</dt><dd className="font-mono text-repixl-text-light">${order.shippingCost.toFixed(2)}</dd></div>
                  <div className="flex justify-between border-t border-repixl-muted/10 pt-2 font-semibold"><dt className="text-repixl-text-light">Total</dt><dd className="font-display text-lg text-repixl-text-light">${order.total.toFixed(2)}</dd></div>
                </dl>
              </div>

              <div className="rounded-2xl border border-repixl-muted/10 bg-repixl-charcoal p-5">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-repixl-muted">Shipping Address</p>
                <p className="text-sm text-repixl-text-light">{order.fullName}</p>
                <p className="mt-0.5 text-sm text-repixl-text-light/70">{order.address}{order.barangay ? `, ${order.barangay}` : ''}</p>
                <p className="text-sm text-repixl-text-light/70">{order.city}{order.province ? `, ${order.province}` : ''} {order.postalCode}</p>
              </div>
            </aside>
          </div>
        </Container>
      </div>
      <Footer />

      {/* ── Cancel Order Modal ── */}
      {cancelModalOpen && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-6 shadow-2xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </div>
            <h3 className="text-center font-display text-lg font-semibold text-repixl-text-light">Cancel Order?</h3>
            <p className="mt-2 text-center text-sm text-repixl-muted">
              Are you sure you want to cancel order <span className="font-mono text-repixl-text-light/80">{order.orderNumber}</span>? This cannot be undone.
            </p>
            {cancelError && (
              <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-center text-xs text-red-400">{cancelError}</p>
            )}
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => { setCancelModalOpen(false); setCancelError(null) }}
                disabled={cancelling}
                className="flex-1 rounded-xl border border-repixl-muted/20 px-4 py-2.5 text-sm text-repixl-text-light/70 transition-colors hover:bg-repixl-bg hover:text-repixl-text-light disabled:opacity-50">
                Keep Order
              </button>
              <button type="button" onClick={() => void handleCancelConfirm()} disabled={cancelling}
                className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60 flex items-center justify-center gap-2">
                {cancelling ? <><Spinner /> Cancelling…</> : 'Cancel Order'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Confirm Receipt + Feedback Modal ── */}
      {confirmModalOpen && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-6 shadow-2xl">

            {!reviewStep ? (
              /* Step 1: Confirm receipt */
              <>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-repixl-success/15">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-repixl-success" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                </div>
                <h3 className="text-center font-display text-lg font-semibold text-repixl-text-light">Confirm Order Received</h3>
                <p className="mt-2 text-center text-sm text-repixl-muted">
                  Have you received your order? Once you confirm, you&apos;ll be asked to leave feedback for your purchase.
                </p>
                <div className="mt-5 flex gap-3">
                  <button type="button" onClick={() => setConfirmModalOpen(false)}
                    className="flex-1 rounded-xl border border-repixl-muted/20 px-4 py-2.5 text-sm text-repixl-text-light/70 transition-colors hover:bg-repixl-bg hover:text-repixl-text-light">
                    Not Yet
                  </button>
                  <button type="button" onClick={() => setReviewStep(true)}
                    className="flex-1 rounded-xl bg-repixl-success px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-repixl-success/80">
                    Yes, I Received It
                  </button>
                </div>
              </>
            ) : (
              /* Step 2: Feedback form */
              <form onSubmit={(e) => void handleReviewSubmit(e)} noValidate>
                <h3 className="mb-1 font-display text-lg font-semibold text-repixl-text-light">Rate Your Purchase</h3>
                <p className="mb-5 text-xs text-repixl-muted">
                  {order.items[0]?.name ?? 'Your camera'} — share your experience to help other collectors.
                </p>

                {/* Rating */}
                <div className="mb-5">
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-repixl-muted">
                    Rating <span className="text-repixl-red">*</span>
                  </p>
                  <StarRating value={rating} onChange={setRating} />
                  {reviewErrors.rating && <p className="mt-1.5 text-xs text-red-400">{reviewErrors.rating}</p>}
                </div>

                {/* Written feedback */}
                <div className="mb-5">
                  <label htmlFor="review-comment" className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-repixl-muted">
                    Feedback <span className="text-repixl-red">*</span>
                  </label>
                  <textarea
                    id="review-comment"
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={2000}
                    placeholder="Tell us about your experience with this camera…"
                    className="w-full resize-y rounded-xl border border-repixl-muted/20 bg-repixl-bg/40 px-4 py-3 text-sm text-repixl-text-light placeholder:text-repixl-muted/40 focus:border-repixl-muted/40 focus:outline-none"
                  />
                  <div className="mt-1.5 flex items-center justify-between">
                    {reviewErrors.comment ? <p className="text-xs text-red-400">{reviewErrors.comment}</p> : <span />}
                    <p className="font-mono text-[9px] text-repixl-muted">{comment.length}/2000</p>
                  </div>
                </div>

                {reviewSubmitError && (
                  <p className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">{reviewSubmitError}</p>
                )}

                <div className="flex gap-3">
                  <button type="button" onClick={() => setReviewStep(false)} disabled={submittingReview}
                    className="flex-1 rounded-xl border border-repixl-muted/20 px-4 py-2.5 text-sm text-repixl-text-light/70 transition-colors hover:bg-repixl-bg hover:text-repixl-text-light disabled:opacity-50">
                    Back
                  </button>
                  <button type="submit" disabled={submittingReview}
                    className="flex-1 rounded-xl bg-repixl-red px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-2">
                    {submittingReview ? <><Spinner /> Submitting…</> : 'Submit Feedback & Complete Order'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ── Print-only receipt ── */}
      <div className="receipt-print-area hidden">
        <div style={{ textAlign: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #d0d0d0' }}>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>RePXL</p>
          <p style={{ fontFamily: 'monospace', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', margin: 0, color: '#555' }}>Order Receipt</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #d0d0d0' }}>
          {[['Order Number', order.orderNumber], ['Order Date', order.date], ['Status', order.status], ['Payment', order.paymentMethod], ['Courier', order.courierName], ['Estimate', order.courierEstimate]].map(([label, value]) => (
            <div key={label}>
              <p style={{ fontFamily: 'monospace', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', color: '#555', margin: '0 0 2px' }}>{label}</p>
              <p style={{ fontFamily: 'monospace', fontSize: '12px', margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>
        <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #d0d0d0' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', color: '#555', margin: '0 0 8px' }}>Shipping Address</p>
          <p style={{ fontFamily: 'sans-serif', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
            {order.fullName}<br />{order.address}<br />
            {order.barangay && <>{order.barangay}<br /></>}
            {order.city}{order.province ? `, ${order.province}` : ''}<br />{order.postalCode}
          </p>
        </div>
        <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #d0d0d0' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', color: '#555', margin: '0 0 8px' }}>Order Items</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #d0d0d0' }}>
                {['Item','Qty','Unit','Total'].map((h) => <th key={h} style={{ textAlign: h === 'Item' ? 'left' : 'right', fontFamily: 'monospace', fontSize: '9px', textTransform: 'uppercase', color: '#555', paddingBottom: '6px' }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #ebebeb', pageBreakInside: 'avoid' }}>
                  <td style={{ padding: '8px 0', fontFamily: 'sans-serif' }}>{item.name || item.slug}</td>
                  <td style={{ padding: '8px 0', fontFamily: 'monospace', textAlign: 'right', color: '#555' }}>{item.stock}</td>
                  <td style={{ padding: '8px 0', fontFamily: 'monospace', textAlign: 'right', color: '#555' }}>${item.price.toFixed(2)}</td>
                  <td style={{ padding: '8px 0', fontFamily: 'monospace', textAlign: 'right' }}>${(item.price * item.stock).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginBottom: '24px' }}>
          {[['Subtotal', `$${order.subtotal.toFixed(2)}`], [`Shipping (${order.courierName})`, `$${order.shippingCost.toFixed(2)}`]].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontFamily: 'sans-serif', fontSize: '13px', color: '#555' }}>
              <span>{l}</span><span style={{ fontFamily: 'monospace' }}>{v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #d0d0d0', fontFamily: 'sans-serif', fontSize: '15px', fontWeight: 700 }}>
            <span>Total</span><span style={{ fontFamily: 'monospace' }}>${order.total.toFixed(2)}</span>
          </div>
        </div>
        <div style={{ textAlign: 'center', paddingTop: '16px', borderTop: '1px solid #d0d0d0' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', color: '#555', margin: '0 0 4px' }}>Thank you for shopping with RePXL</p>
          <p style={{ fontFamily: 'sans-serif', fontSize: '10px', color: '#888', margin: 0 }}>Vintage Digital Cameras · Condition-graded · Serial-verified</p>
        </div>
      </div>
    </>
  )
}
