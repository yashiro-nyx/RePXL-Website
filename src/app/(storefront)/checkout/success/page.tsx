'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Container } from '@/components/layout/Container'
import { MinimalFooter } from '@/components/layout/MinimalFooter'
import { useCartStore } from '@/stores/cartStore'
import { useProductStore } from '@/stores/productStore'
import { formatPrice } from '@/lib/format'

// ─── Types ──────────────────────────────────────────────────────────────────────

interface OrderItem {
  id: string
  quantity: number
  price: number // unit price snapshot
  product: {
    slug: string
    name: string
    image: string
    brand: string
  } | null
}

interface OrderData {
  orderNumber: string
  createdAt: string
  status: string
  paymentStatus: string
  paymentMethod: string
  deliveryStatus?: string
  subtotal: number
  shippingCost: number
  discount: number
  total: number
  courierName: string
  courierEstimate: string
  voucherCode: string | null
  fullName: string
  address: string
  barangay: string
  city: string
  province: string
  postalCode: string
  items: OrderItem[]
  user?: { email: string; firstName: string; lastName: string } | null
}

// ─── Inner component ─────────────────────────────────────────────────────────────

function SuccessInner() {
  const params = useSearchParams()
  const initialOrderNumber = params.get('order') ?? ''
  const paymentIntentId = params.get('payment_intent_id') ?? ''
  const [order, setOrder] = useState<OrderData | null>(null)
  const [fetchStatus, setFetchStatus] = useState<'loading' | 'found' | 'pending' | 'error'>('loading')

  const isMobile = params.get('mobile') === 'true'
  const redirectScheme = params.get('redirect_scheme') || 'repxl://checkout/callback'
  const mobileRedirectUrl = `${redirectScheme}${redirectScheme.includes('?') ? '&' : '?'}order=${encodeURIComponent(initialOrderNumber || paymentIntentId || '')}`

  useEffect(() => {
    if (isMobile) {
      // Immediately redirect back to the mobile app
      window.location.replace(mobileRedirectUrl)
      return
    }

    // Clear the cart on return from PayMongo.
    useCartStore.getState().hydrate()
    // Re-hydrate product store so the listing immediately shows updated stock.
    useProductStore.getState().hydrate()

    if (!initialOrderNumber && !paymentIntentId) {
      setFetchStatus('error')
      return
    }

    let cancelled = false

    const run = async () => {
      // ── Step 1: Server-side payment verification ──────────────────────────────
      // Call /api/checkout/verify to confirm payment with PayMongo directly and
      // finalize the order (PENDING → PAID, stock decremented, cart cleared).
      let resolvedOrderNum = initialOrderNumber
      try {
        const verifyRes = await fetch('/api/checkout/verify', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderNumber: initialOrderNumber || undefined,
            paymentIntentId: paymentIntentId || undefined,
          }),
          cache: 'no-store',
        })

        if (verifyRes.status === 409) {
          if (!cancelled) setFetchStatus('error')
          return
        }
        if (verifyRes.ok) {
          const vData = await verifyRes.json().catch(() => ({}))
          if (vData?.data?.orderNumber) {
            resolvedOrderNum = vData.data.orderNumber
          }
        }
      } catch (err) {
        // Network error — continue to polling anyway
        console.warn('[success] verify network error:', err)
      }

      if (cancelled) return

      if (!resolvedOrderNum) {
        setFetchStatus('error')
        return
      }

      // Re-hydrate cart/products after finalization
      useCartStore.getState().hydrate()
      useProductStore.getState().hydrate()

      // ── Step 2: Poll GET /api/orders/{resolvedOrderNum} for the receipt data ──
      let tries = 0
      const MAX_TRIES = 10

      const poll = async () => {
        if (cancelled) return
        try {
          const res = await fetch(`/api/orders/${encodeURIComponent(resolvedOrderNum)}`, {
            credentials: 'include',
            cache: 'no-store',
          })

          if (res.ok) {
            const json = await res.json()
            if (json.success && json.data) {
              const gatewayOrder = json.data.paymentIntentId || json.data.paymentSessionId
              if (!gatewayOrder || json.data.paymentStatus === 'PAID') {
                setOrder(json.data)
                setFetchStatus('found')
                return
              }
              if (json.data.status === 'CANCELLED' || json.data.paymentStatus === 'FAILED' || json.data.paymentStatus === 'REFUNDED') {
                setFetchStatus('error')
                return
              }
            }
          }

          tries += 1
          if (tries < MAX_TRIES) {
            setTimeout(poll, 1500)
          } else {
            setFetchStatus('pending')
          }
        } catch {
          tries += 1
          if (tries < MAX_TRIES) setTimeout(poll, 1500)
          else setFetchStatus('pending')
        }
      }

      poll()
    }

    run()

    return () => { cancelled = true }
  }, [initialOrderNumber, paymentIntentId])

  const displayOrderNumber = order?.orderNumber || initialOrderNumber

  const dateStr = order
    ? new Date(order.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''

  if (isMobile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0d0d0d] px-6 text-center text-white">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#161618] p-8 shadow-2xl">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#c62828]" />
          </div>
          <h2 className="font-display text-lg font-bold text-white">Returning to RePXL App</h2>
          <p className="mt-2 text-xs text-neutral-400">Payment completed. Securing your order details…</p>
          <div className="mt-6 border-t border-white/10 pt-4">
            <a
              href={mobileRedirectUrl}
              className="inline-block w-full rounded-xl bg-[#c62828] py-3 text-xs font-bold text-white transition hover:bg-[#b71c1c]"
            >
              Tap here to return to app
            </a>
          </div>
        </div>
      </div>
    )
  }

  // ── Loading state ──────────────────────────────────────────────────────────────
  if (fetchStatus === 'loading') {
    return (
      <div className="burn-subtle min-h-screen pb-16 pt-24">
        <Container>
          <div className="mx-auto flex max-w-lg flex-col items-center justify-center py-24 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-repixl-muted/30 border-t-repixl-red" />
            <p className="mt-6 text-sm text-repixl-muted">Confirming your order…</p>
            {displayOrderNumber && (
              <p className="mt-1 font-mono text-xs text-repixl-muted/60">{displayOrderNumber}</p>
            )}
          </div>
        </Container>
      </div>
    )
  }

  // ── Pending / not yet finalized ────────────────────────────────────────────────
  if (fetchStatus === 'pending' || fetchStatus === 'error' || !order) {
    return (
      <div className="burn-subtle min-h-screen pb-16 pt-24">
        <Container>
          <div className="mx-auto flex max-w-lg flex-col items-center justify-center py-24 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-repixl-success/15">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-success">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h1 className="font-display text-display-md text-repixl-text-light">{fetchStatus === 'error' ? 'Order Not Confirmed' : 'Confirmation Pending'}</h1>
            <p className="mt-3 text-sm text-repixl-muted">
              {displayOrderNumber ? (
                <>Your order <span className="font-mono text-repixl-text-light">{displayOrderNumber}</span> has not yet been confirmed.</>
              ) : (
                'We could not confirm your order.'
              )}
            </p>
            <p className="mt-2 text-xs text-repixl-muted">
              Check your order status before retrying. If you were charged, contact support with your order number.
            </p>
            <div className="no-print mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/account"
                className="rounded bg-repixl-red px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                View My Orders
              </Link>
              <Link
                href="/products"
                className="rounded border border-repixl-muted/20 px-5 py-2.5 text-sm text-repixl-text-light/70 transition-colors hover:border-repixl-muted/40 hover:text-repixl-text-light"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </Container>
        <MinimalFooter />
      </div>
    )
  }

  // ── Order found — full receipt ─────────────────────────────────────────────────
  const isPaid = order.paymentStatus === 'PAID'
  const isCod =
    typeof order.paymentMethod === 'string' &&
    (order.paymentMethod.toLowerCase().includes('cash on delivery') || order.paymentMethod.toLowerCase() === 'cod')
  const isCodPending =
    isCod &&
    (order.deliveryStatus === 'Pending COD Approval' || order.deliveryStatus === 'COD Approval Requested')

  return (
    <div className="burn-subtle min-h-screen pb-16 pt-24">
      <Container>
        <div className="mx-auto max-w-2xl">

          {/* Screen-only header */}
          <div className="no-print mb-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-repixl-success/15">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-success">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h1 className="mt-4 font-display text-display-md text-repixl-text-light">
              {isCodPending ? 'COD Request Received' : isPaid ? 'Payment Successful' : 'Order Confirmed'}
            </h1>
            <p className="mt-2 text-sm text-repixl-text-light/70">
              {isCodPending
                ? `Thank you, ${order.fullName.split(' ')[0]}. Your Cash on Delivery order is awaiting administrator confirmation.`
                : `Thank you, ${order.fullName.split(' ')[0]}. Your order has been placed.`}
            </p>
          </div>

          {/* ─── RECEIPT — visible on screen AND in print ─── */}
          <div className="receipt-print-area rounded-lg border border-repixl-muted/20 bg-repixl-charcoal p-6 md:p-8">

            {/* Receipt header */}
            <div className="mb-6 border-b border-repixl-muted/10 pb-6 text-center">
              <p className="font-display text-2xl font-bold text-repixl-text-light">RePXL</p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-repixl-muted print-muted">Order Receipt</p>
            </div>

            {/* Order meta */}
            <div className="mb-6 grid grid-cols-2 gap-4 border-b border-repixl-muted/10 pb-6">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest text-repixl-muted print-muted">Order Number</p>
                <p className="mt-1 font-mono text-sm font-semibold text-repixl-red print-red">{order.orderNumber}</p>
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest text-repixl-muted print-muted">Order Date</p>
                <p className="mt-1 text-sm text-repixl-text-light">{dateStr}</p>
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest text-repixl-muted print-muted">Payment Status</p>
                <p className={`mt-1 text-sm font-medium ${isPaid ? 'text-repixl-success' : 'text-repixl-warning'}`}>
                  {isPaid ? 'Paid' : isCod ? 'Pending (Pay on Delivery)' : order.paymentStatus}
                </p>
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest text-repixl-muted print-muted">Order Status</p>
                <p className="mt-1 text-sm text-repixl-text-light">
                  {isCodPending ? 'Awaiting COD Approval' : (order.status.charAt(0) + order.status.slice(1).toLowerCase())}
                </p>
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest text-repixl-muted print-muted">Payment Method</p>
                <p className="mt-1 text-sm text-repixl-text-light">{order.paymentMethod}</p>
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest text-repixl-muted print-muted">Courier</p>
                <p className="mt-1 text-sm text-repixl-text-light">{order.courierName}</p>
                <p className="font-mono text-[10px] text-repixl-muted print-muted">{order.courierEstimate}</p>
              </div>
            </div>

            {/* Customer info */}
            <div className="mb-6 border-b border-repixl-muted/10 pb-6">
              <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-repixl-muted print-muted">Customer</p>
              <p className="text-sm text-repixl-text-light">{order.fullName}</p>
              {order.user?.email && (
                <p className="text-sm text-repixl-text-light/70">{order.user.email}</p>
              )}
            </div>

            {/* Shipping address */}
            <div className="mb-6 border-b border-repixl-muted/10 pb-6">
              <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-repixl-muted print-muted">Shipping Address</p>
              <p className="text-sm text-repixl-text-light">{order.fullName}</p>
              <p className="text-sm text-repixl-text-light/70">{order.address}</p>
              {order.barangay && <p className="text-sm text-repixl-text-light/70">{order.barangay}</p>}
              <p className="text-sm text-repixl-text-light/70">{order.city}{order.province ? `, ${order.province}` : ''}</p>
              <p className="text-sm text-repixl-text-light/70">{order.postalCode}</p>
            </div>

            {/* Order items */}
            <div className="mb-6 border-b border-repixl-muted/10 pb-6">
              <p className="mb-3 font-mono text-[9px] uppercase tracking-widest text-repixl-muted print-muted">Order Items</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-repixl-muted/10">
                    <th className="pb-2 text-left font-mono text-[9px] uppercase tracking-wider text-repixl-muted print-muted">Item</th>
                    <th className="pb-2 text-center font-mono text-[9px] uppercase tracking-wider text-repixl-muted print-muted">Qty</th>
                    <th className="pb-2 text-right font-mono text-[9px] uppercase tracking-wider text-repixl-muted print-muted">Unit Price</th>
                    <th className="pb-2 text-right font-mono text-[9px] uppercase tracking-wider text-repixl-muted print-muted">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-repixl-muted/10">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2 text-repixl-text-light">
                        {item.product?.name ?? 'Product'}
                      </td>
                      <td className="py-2 text-center font-mono text-repixl-text-light/70">{item.quantity}</td>
                      <td className="py-2 text-right font-mono text-repixl-text-light/70">{formatPrice(item.price)}</td>
                      <td className="py-2 text-right font-mono text-repixl-text-light">{formatPrice(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Order totals */}
            <div className="mb-6">
              <dl className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <dt className="text-repixl-text-light/70">Subtotal</dt>
                  <dd className="font-mono text-repixl-text-light">{formatPrice(order.subtotal)}</dd>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <dt className="text-repixl-success">
                      Discount{order.voucherCode ? ` (${order.voucherCode})` : ''}
                    </dt>
                    <dd className="font-mono text-repixl-success">−{formatPrice(order.discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <dt className="text-repixl-text-light/70">Shipping ({order.courierName})</dt>
                  <dd className="font-mono text-repixl-text-light">{formatPrice(order.shippingCost)}</dd>
                </div>
                <div className="flex justify-between border-t border-repixl-muted/10 pt-2">
                  <dt className="font-semibold text-repixl-text-light">Total</dt>
                  <dd className="font-display text-xl font-bold text-repixl-text-light">{formatPrice(order.total)}</dd>
                </div>
              </dl>
            </div>

            {/* Receipt footer */}
            <div className="border-t border-repixl-muted/10 pt-4 text-center">
              <p className="font-mono text-[9px] uppercase tracking-widest text-repixl-muted print-muted">
                Thank you for shopping with RePXL
              </p>
              <p className="mt-1 font-mono text-[9px] text-repixl-muted/60 print-muted">
                Vintage Digital Cameras · Condition-graded · Serial-verified
              </p>
            </div>
          </div>

          {/* Action buttons — hidden when printing */}
          <div className="no-print mt-6 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded bg-repixl-red px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect width="12" height="8" x="6" y="14" />
              </svg>
              Print Receipt
            </button>
            <Link
              href="/account"
              className="rounded border border-repixl-muted/20 px-5 py-2.5 text-sm text-repixl-text-light/70 transition-colors hover:border-repixl-muted/40 hover:text-repixl-text-light"
            >
              View My Orders
            </Link>
            <Link href="/products" className="text-sm text-repixl-muted hover:text-repixl-text-light">
              Continue Shopping
            </Link>
          </div>

        </div>
      </Container>
      <MinimalFooter />
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-repixl-muted/30 border-t-repixl-red" />
      </div>
    }>
      <SuccessInner />
    </Suspense>
  )
}
