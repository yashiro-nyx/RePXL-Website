'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Container } from '@/components/layout/Container'
import { Footer } from '@/components/layout/Footer'
import { Button, PageLoader } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import { useOrderHistoryStore } from '@/stores/orderHistoryStore'

const statusStyles: Record<string, string> = {
  Processing: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Shipped: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Delivered: 'bg-green-500/15 text-green-400 border-green-500/30',
  Completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
}

export default function OrderHistoryPage() {
  const router = useRouter()
  const { isLoggedIn, userEmail, hydrate } = useAuthStore()
  const allOrders = useOrderHistoryStore((s) => s.orders)
  const [hydrated, setHydrated] = useState(false)
  const [error] = useState<string | null>(null)

  useEffect(() => {
    hydrate().then(() => {
      useOrderHistoryStore.getState().hydrate()
      setHydrated(true)
    })
  }, [hydrate])

  useEffect(() => {
    if (hydrated && !isLoggedIn) router.push('/login')
  }, [hydrated, isLoggedIn, router])

  if (!hydrated || !isLoggedIn) return <PageLoader label="Loading orders…" />

  const orders = [...allOrders]
    .filter((o) => o.userEmail === userEmail)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <>
      <div className="burn-subtle min-h-screen pb-20 pt-24">
        <Container>
          <div className="mb-8 border-b border-repixl-muted/10 pb-6">
            <div className="flex items-center gap-3">
              <Link href="/account" className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted transition-colors hover:text-repixl-text-light">
                ← Account
              </Link>
            </div>
            <h1 className="mt-3 font-display text-display-md text-repixl-text-light">Order History</h1>
            <p className="mt-1 text-sm text-repixl-muted">{orders.length} {orders.length === 1 ? 'order' : 'orders'}</p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {orders.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-repixl-muted/20 py-24 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-repixl-charcoal/50">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-repixl-muted/40" aria-hidden="true">
                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                </svg>
              </div>
              <p className="font-display text-display-sm text-repixl-text-light/60">No orders yet</p>
              <p className="mt-1 text-sm text-repixl-muted">Your order history will appear here after your first purchase.</p>
              <Link href="/products" className="mt-6"><Button variant="primary" size="md">Browse Cameras</Button></Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const first = order.items[0]
                const extra = order.items.length - 1
                const primaryLabel = first?.name ?? 'Order'
                const extraLabel = extra > 0 ? ` + ${extra} more` : ''
                return (
                <div key={order.orderNumber} className="rounded-2xl border border-repixl-muted/10 bg-repixl-charcoal p-5 transition-colors hover:border-repixl-muted/20">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      {/* Item name — primary */}
                      <p className="text-sm font-semibold text-repixl-text-light">
                        {primaryLabel}<span className="text-repixl-muted">{extraLabel}</span>
                      </p>
                      {/* Order number + status — secondary */}
                      <div className="mt-0.5 flex items-center gap-2">
                        <p className="font-mono text-[10px] text-repixl-muted">#{order.orderNumber}</p>
                        <span className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${statusStyles[order.status] ?? 'bg-repixl-muted/10 text-repixl-muted'}`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="mt-0.5 font-mono text-[10px] text-repixl-muted">{order.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-lg font-bold text-repixl-text-light">${order.total.toFixed(2)}</p>
                      <p className="font-mono text-[10px] text-repixl-muted">{order.courierName}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-repixl-muted/10 pt-3">
                    <p className="text-xs text-repixl-muted">{order.items.length} {order.items.length === 1 ? 'item' : 'items'} · {order.paymentMethod}</p>
                    <Link
                      href={`/account/orders/${order.orderNumber}`}
                      className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted transition-colors hover:text-repixl-text-light"
                    >
                      Track Order →
                    </Link>
                  </div>
                </div>
                )
              })}
            </div>
          )}
        </Container>
      </div>
      <Footer />
    </>
  )
}
