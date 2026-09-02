'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Container } from '@/components/layout/Container'
import { Footer } from '@/components/layout/Footer'
import { Button, PageLoader } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import { useOrderHistoryStore, type Order } from '@/stores/orderHistoryStore'
import { computeStepperState } from '@/lib/order-tracking'
import { TrackingTimeline } from '@/components/tracking/TrackingTimeline'

// Leaflet requires the browser — lazy-load to avoid SSR crash
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

export default function OrderDetailPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>()
  const router = useRouter()
  const { isLoggedIn, userEmail, hydrate } = useAuthStore()
  const allOrders = useOrderHistoryStore((s) => s.orders)
  const [hydrated, setHydrated] = useState(false)
  const [order, setOrder] = useState<Order | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    hydrate().then(() => {
      useOrderHistoryStore.getState().hydrate()
      setHydrated(true)
    })
  }, [hydrate])

  useEffect(() => {
    if (!hydrated) return
    if (!isLoggedIn) { router.push('/login'); return }
    const found = allOrders.find((o) => o.orderNumber === orderNumber)
    if (!found) { setNotFound(true); return }
    // owner check
    if (found.userEmail && found.userEmail !== userEmail) { setNotFound(true); return }
    setOrder(found)
  }, [hydrated, isLoggedIn, allOrders, orderNumber, userEmail, router])

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

  if (!order) return null

  // Map store status to OrderStatus enum format
  const statusMap: Record<string, string> = {
    Processing: 'PROCESSING', Shipped: 'SHIPPED', Delivered: 'DELIVERED', Completed: 'COMPLETED', Cancelled: 'CANCELLED',
  }
  const enumStatus = statusMap[order.status] as any
  const stepper = computeStepperState(enumStatus)

  return (
    <>
      <div className="burn-subtle min-h-screen pb-20 pt-24">
        <Container>
          {/* Back */}
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
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect width="12" height="8" x="6" y="14" />
                </svg>
                Print Receipt
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left: tracking + items */}
            <div className="space-y-6 lg:col-span-2">
              {/* Status stepper */}
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
                    {/* Connector line */}
                    <div className="absolute left-0 right-0 top-4 h-px bg-repixl-muted/15" aria-hidden="true" />
                    {stepper.steps.map((step, i) => (
                      <div key={step.status} className="relative flex flex-col items-center gap-2 text-center">
                        <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                          step.current
                            ? 'border-repixl-red bg-repixl-red text-white'
                            : step.reached
                              ? 'border-repixl-success bg-repixl-success/20 text-repixl-success'
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

              {/* ── Delivery Tracking ─────────────────────────────────── */}
              {order.status !== 'Cancelled' && (
                <div className="rounded-2xl border border-repixl-muted/10 bg-repixl-charcoal p-5">
                  <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
                    Delivery Tracking
                  </p>

                  {/* Live tracking timeline — connects via SSE */}
                  <TrackingTimeline
                    trackingNumber={order.orderNumber}
                    initialState={{
                      status:
                        order.status === 'Processing' ? 'Order Placed'
                        : order.status === 'Shipped' ? 'In Transit'
                        : order.status === 'Delivered' || order.status === 'Completed' ? 'Delivered'
                        : 'Order Placed',
                      progress:
                        order.status === 'Processing' ? 25
                        : order.status === 'Shipped' ? 50
                        : order.status === 'Delivered' || order.status === 'Completed' ? 100
                        : 25,
                      description:
                        order.status === 'Processing'
                          ? 'We are preparing your camera gear and checking lens optics.'
                          : order.status === 'Shipped'
                          ? 'Your camera is on its way to you.'
                          : 'Your camera has been delivered. Enjoy!',
                    }}
                  />

                  {/* Delivery map — visible for all non-cancelled orders.
                      Shows simulated route when In Transit / Out for Delivery / Delivered.
                      Shows a "preparing" placeholder for Processing orders. */}
                  <TrackingMap
                    status={
                      order.status === 'Delivered' || order.status === 'Completed' ? 'Delivered'
                      : order.status === 'Shipped' ? 'Out for Delivery'
                      : 'Order Placed'
                    }
                    progress={
                      order.status === 'Delivered' || order.status === 'Completed' ? 100
                      : order.status === 'Shipped' ? 75
                      : 25
                    }
                  />
                </div>
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

              {/* Return link — only for Delivered/Completed */}
              {(order.status === 'Delivered' || order.status === 'Completed') && (
                <Link
                  href={`/account/orders/${order.orderNumber}/return`}
                  className="inline-flex items-center gap-2 rounded-xl border border-repixl-muted/20 px-4 py-2.5 font-mono text-sm text-repixl-muted transition-colors hover:border-repixl-muted/40 hover:text-repixl-text-light"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                  Request Return / Refund
                </Link>
              )}
            </div>

            {/* Right: order summary */}
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
                <p className="mt-0.5 text-sm text-repixl-text-light/70">{order.address}, {order.barangay}</p>
                <p className="text-sm text-repixl-text-light/70">{order.city}, {order.province} {order.postalCode}</p>
              </div>
            </aside>
          </div>
        </Container>
      </div>
      <Footer />

      {/* ── PRINT-ONLY RECEIPT ── */}
      {/* Hidden on screen, visible only during window.print() */}
      <div className="receipt-print-area hidden">
        {/* Receipt header */}
        <div style={{ textAlign: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #d0d0d0' }}>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>RePXL</p>
          <p style={{ fontFamily: 'monospace', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', margin: 0, color: '#555' }}>Order Receipt</p>
        </div>

        {/* Order meta */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #d0d0d0' }}>
          {[
            ['Order Number', order.orderNumber],
            ['Order Date', order.date],
            ['Status', order.status],
            ['Payment', order.paymentMethod],
            ['Courier', order.courierName],
            ['Estimate', order.courierEstimate],
          ].map(([label, value]) => (
            <div key={label}>
              <p style={{ fontFamily: 'monospace', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', color: '#555', margin: '0 0 2px' }}>{label}</p>
              <p style={{ fontFamily: 'monospace', fontSize: '12px', margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Shipping address */}
        <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #d0d0d0' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', color: '#555', margin: '0 0 8px' }}>Shipping Address</p>
          <p style={{ fontFamily: 'sans-serif', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
            {order.fullName}<br />
            {order.address}<br />
            {order.barangay && <>{order.barangay}<br /></>}
            {order.city}{order.province ? `, ${order.province}` : ''}<br />
            {order.postalCode}
          </p>
        </div>

        {/* Items table */}
        <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #d0d0d0' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', color: '#555', margin: '0 0 8px' }}>Order Items</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #d0d0d0' }}>
                <th style={{ textAlign: 'left', fontFamily: 'monospace', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', color: '#555', paddingBottom: '6px' }}>Item</th>
                <th style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', color: '#555', paddingBottom: '6px' }}>Qty</th>
                <th style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', color: '#555', paddingBottom: '6px' }}>Unit</th>
                <th style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', color: '#555', paddingBottom: '6px' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #ebebeb', pageBreakInside: 'avoid' }}>
                  <td style={{ padding: '8px 0', fontFamily: 'sans-serif' }}>{item.name || item.slug}</td>
                  <td style={{ padding: '8px 0', fontFamily: 'monospace', textAlign: 'center', color: '#555' }}>{item.stock}</td>
                  <td style={{ padding: '8px 0', fontFamily: 'monospace', textAlign: 'right', color: '#555' }}>${item.price.toFixed(2)}</td>
                  <td style={{ padding: '8px 0', fontFamily: 'monospace', textAlign: 'right' }}>${(item.price * item.stock).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div style={{ marginBottom: '24px' }}>
          {[
            ['Subtotal', `$${order.subtotal.toFixed(2)}`],
            [`Shipping (${order.courierName})`, `$${order.shippingCost.toFixed(2)}`],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontFamily: 'sans-serif', fontSize: '13px', color: '#555' }}>
              <span>{label}</span><span style={{ fontFamily: 'monospace' }}>{value}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #d0d0d0', fontFamily: 'sans-serif', fontSize: '15px', fontWeight: 700 }}>
            <span>Total</span>
            <span style={{ fontFamily: 'monospace' }}>${order.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Receipt footer */}
        <div style={{ textAlign: 'center', paddingTop: '16px', borderTop: '1px solid #d0d0d0' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', color: '#555', margin: '0 0 4px' }}>Thank you for shopping with RePXL</p>
          <p style={{ fontFamily: 'sans-serif', fontSize: '10px', color: '#888', margin: 0 }}>Vintage Digital Cameras · Condition-graded · Serial-verified</p>
        </div>
      </div>
    </>
  )
}
