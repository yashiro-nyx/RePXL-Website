'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Container } from '@/components/layout/Container'
import { Footer } from '@/components/layout/Footer'
import { Button, PageLoader } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import { useOrderHistoryStore } from '@/stores/orderHistoryStore'

const RETURN_WINDOW_DAYS = 30

function isWithinWindow(order: { status: string; date: string }): boolean {
  if (order.status !== 'Delivered' && order.status !== 'Completed') return false
  const orderDate = new Date(order.date)
  const diffMs = Date.now() - orderDate.getTime()
  return diffMs <= RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000
}

export default function ReturnRequestPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>()
  const router = useRouter()
  const { isLoggedIn, userEmail, hydrate } = useAuthStore()
  const allOrders = useOrderHistoryStore((s) => s.orders)
  const [hydrated, setHydrated] = useState(false)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<{ items?: string; reason?: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    hydrate().then(() => { useOrderHistoryStore.getState().hydrate(); setHydrated(true) })
  }, [hydrate])

  useEffect(() => {
    if (hydrated && !isLoggedIn) router.push('/login')
  }, [hydrated, isLoggedIn, router])

  const order = allOrders.find((o) => o.orderNumber === orderNumber)
  const withinWindow = order ? isWithinWindow(order) : false

  const toggleItem = (slug: string) => {
    setSelectedItems((prev) => prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: { items?: string; reason?: string } = {}
    if (selectedItems.length === 0) errs.items = 'Select at least one item to return.'
    if (reason.length < 10 || reason.length > 1000) errs.reason = `Reason must be 10–1000 characters (currently ${reason.length}).`
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSubmitting(true)
    setSubmitError(null)
    const res = await fetch('/api/returns', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderNumber, selectedItemSlugs: selectedItems, reason }),
    })
    const body = await res.json()
    if (res.ok) { setSuccess(true) }
    else { setSubmitError(body.error || 'Submission failed. Please try again.') }
    setSubmitting(false)
  }

  if (!hydrated || !isLoggedIn) return <PageLoader label="Loading…" />

  if (!order) {
    return (
      <div className="burn-subtle flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-repixl-muted">Order not found.</p>
          <Link href="/account/orders" className="mt-3 inline-block text-sm text-repixl-red hover:underline">← Orders</Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <>
        <div className="burn-subtle flex min-h-screen flex-col items-center justify-center gap-6 px-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-repixl-success/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-repixl-success" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
          <div className="text-center">
            <h1 className="font-display text-display-md text-repixl-text-light">Request Submitted</h1>
            <p className="mt-2 text-sm text-repixl-muted">Your return request has been received. We'll review it and get back to you shortly.</p>
          </div>
          <Link href={`/account/orders/${orderNumber}`}><Button variant="secondary" size="md">Back to Order</Button></Link>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <div className="burn-subtle min-h-screen pb-20 pt-24">
        <Container>
          <div className="mb-8">
            <nav className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
              <Link href="/account/orders" className="hover:text-repixl-text-light">Orders</Link>
              <span>/</span>
              <Link href={`/account/orders/${orderNumber}`} className="hover:text-repixl-text-light">#{orderNumber}</Link>
              <span>/</span>
              <span className="text-repixl-text-light/50">Return</span>
            </nav>
            <h1 className="mt-3 font-display text-display-md text-repixl-text-light">Request Return / Refund</h1>
          </div>

          {!withinWindow ? (
            <div className="rounded-2xl border border-repixl-muted/10 bg-repixl-charcoal p-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-repixl-muted/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-repixl-muted/50" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
              </div>
              <p className="font-display text-lg font-semibold text-repixl-text-light">Return Window Expired</p>
              <p className="mt-2 text-sm text-repixl-muted">
                The 30-day return window for this order has expired. Returns are accepted within {RETURN_WINDOW_DAYS} days of delivery or completion.
              </p>
              <Link href={`/account/orders/${orderNumber}`} className="mt-5 inline-block"><Button variant="secondary" size="md">Back to Order</Button></Link>
            </div>
          ) : (
            <div className="mx-auto max-w-xl">
              {submitError && (
                <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                  <p className="text-sm text-red-400">{submitError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-6">
                {/* Item selection */}
                <div className="rounded-2xl border border-repixl-muted/10 bg-repixl-charcoal p-5">
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-repixl-muted">Select Items to Return</p>
                  <div className="space-y-2">
                    {order.items.map((item, i) => {
                      const slug = item.slug || String(i)
                      const checked = selectedItems.includes(slug)
                      return (
                        <label key={slug} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors ${checked ? 'border-repixl-red/40 bg-repixl-red/5' : 'border-repixl-muted/15 hover:border-repixl-muted/30'}`}>
                          <input type="checkbox" checked={checked} onChange={() => toggleItem(slug)} className="h-4 w-4 rounded border-repixl-muted/30 bg-repixl-bg text-repixl-red focus:ring-repixl-red/30" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-repixl-text-light">{item.name || item.slug}</p>
                            <p className="font-mono text-[10px] text-repixl-muted">×{item.stock} · ${item.price.toFixed(2)} each</p>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                  {errors.items && <p className="mt-2 text-xs text-red-400">{errors.items}</p>}
                </div>

                {/* Reason */}
                <div className="rounded-2xl border border-repixl-muted/10 bg-repixl-charcoal p-5">
                  <label htmlFor="return-reason" className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
                    Reason for Return (10–1000 characters)
                  </label>
                  <textarea
                    id="return-reason"
                    rows={5}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={1000}
                    placeholder="Describe the issue or reason for your return request…"
                    className="w-full resize-y rounded-xl border border-repixl-muted/20 bg-repixl-bg px-4 py-3 text-sm text-repixl-text-light placeholder:text-repixl-muted/40 focus:border-repixl-muted/40 focus:outline-none"
                  />
                  <div className="mt-1.5 flex items-center justify-between">
                    {errors.reason ? <p className="text-xs text-red-400">{errors.reason}</p> : <span />}
                    <p className="font-mono text-[9px] text-repixl-muted">{reason.length}/1000</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button type="submit" variant="primary" size="lg" disabled={submitting} className={submitting ? 'opacity-60 cursor-not-allowed' : ''}>
                    {submitting ? 'Submitting…' : 'Submit Request'}
                  </Button>
                  <Link href={`/account/orders/${orderNumber}`}>
                    <Button variant="secondary" size="lg">Cancel</Button>
                  </Link>
                </div>
              </form>
            </div>
          )}
        </Container>
      </div>
      <Footer />
    </>
  )
}
