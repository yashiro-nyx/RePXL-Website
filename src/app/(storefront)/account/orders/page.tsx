'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, PageLoader } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import { useOrderHistoryStore } from '@/stores/orderHistoryStore'
import { purchaseFilters, matchesPurchaseFilter, type PurchaseFilter } from '@/lib/account-navigation'
import { formatPrice } from '@/lib/format'

import {
  getOrderStatusBadgeClass,
  getOrderStatusLabel,
} from '@/lib/order-status-unified'

function OrdersSkeleton() {
  return (
    <div className="min-w-0 animate-pulse" aria-busy="true" aria-label="Loading purchases">
      <div className="mb-8 border-b border-repixl-muted/10 pb-6">
        <div className="mt-3 h-9 w-48 rounded-lg bg-repixl-muted/20" />
        <div className="mt-2 h-4 w-20 rounded bg-repixl-muted/10" />
      </div>

      {/* Filter tabs skeleton */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {[80, 95, 75, 85, 90, 80].map((w, i) => (
          <div
            key={i}
            style={{ width: `${w}px` }}
            className="h-9 shrink-0 rounded-lg border border-repixl-muted/10 bg-repixl-charcoal/60"
          />
        ))}
      </div>

      {/* Cards list skeleton */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-repixl-muted/10 bg-repixl-charcoal p-5 space-y-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="h-4 w-52 rounded bg-repixl-muted/20" />
                <div className="flex items-center gap-2">
                  <div className="h-3 w-16 rounded bg-repixl-muted/10" />
                  <div className="h-4 w-20 rounded-full bg-repixl-muted/15" />
                </div>
                <div className="h-3 w-24 rounded bg-repixl-muted/10" />
              </div>
              <div className="space-y-1.5 text-right">
                <div className="h-6 w-24 rounded bg-repixl-muted/20 ml-auto" />
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-repixl-muted/10 pt-3">
              <div className="h-3 w-36 rounded bg-repixl-muted/10" />
              <div className="h-3 w-32 rounded bg-repixl-muted/15" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function OrderHistoryPage() {
  const router = useRouter()
  const { isLoggedIn, userEmail, hydrate } = useAuthStore()
  const allOrders = useOrderHistoryStore((s) => s.orders)
  const [hydrated, setHydrated] = useState(false)
  const [filter, setFilter] = useState<PurchaseFilter>('All')
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    hydrate().then(() => useOrderHistoryStore.getState().hydrate()).catch(() => setLoadError(true)).finally(() => setHydrated(true))
  }, [hydrate])

  useEffect(() => {
    if (hydrated && !isLoggedIn) router.push('/login')
  }, [hydrated, isLoggedIn, router])

  if (!hydrated || !isLoggedIn) return <OrdersSkeleton />

  if (loadError) return <p role="alert" className="text-red-400">Unable to load purchases. Please refresh to retry.</p>

  const orders = [...allOrders]
    .filter((o) => o.userEmail === userEmail && matchesPurchaseFilter(o, filter))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <>
      <div className="min-w-0">
        <>
          <div className="mb-8 border-b border-repixl-muted/10 pb-6">
            <h1 className="mt-3 font-display text-display-md text-repixl-text-light">My Purchases</h1>
            <p className="mt-1 text-sm text-repixl-muted">{orders.length} {orders.length === 1 ? 'order' : 'orders'}</p>
          </div>

          <div className="mb-6 flex gap-2 overflow-x-auto pb-2" aria-label="Filter purchases">
            {purchaseFilters.map(value => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={`shrink-0 rounded-lg border px-4 py-2 text-sm transition-all ${
                  filter === value
                    ? 'border-repixl-red bg-repixl-red/10 text-repixl-red font-medium shadow-sm shadow-repixl-red/20'
                    : 'border-repixl-muted/20 text-repixl-muted hover:border-repixl-muted/40 hover:text-repixl-text-light'
                }`}
              >
                {value}
              </button>
            ))}
          </div>

          {orders.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-repixl-muted/20 py-24 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-repixl-charcoal/50">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-repixl-muted/40" aria-hidden="true">
                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                </svg>
              </div>
              <p className="font-display text-display-sm text-repixl-text-light/60">{filter === 'All' ? 'No purchases yet' : `No ${filter.toLowerCase()} purchases`}</p>
              <p className="mt-1 text-sm text-repixl-muted">Your purchases appear here with their current order status.</p>
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
                <div
  key={order.orderNumber}
  className="group rounded-2xl border border-repixl-muted/10 bg-repixl-charcoal p-5 transition-all duration-200 hover:border-repixl-muted/30 hover:bg-repixl-charcoal/90 hover:shadow-lg hover:shadow-black/20"
>
  <div className="flex flex-wrap items-start justify-between gap-4">
    <div className="min-w-0">
      {/* Item name — primary */}
      <p className="text-sm font-semibold text-repixl-text-light">
        {primaryLabel}
        <span className="text-repixl-muted">{extraLabel}</span>
      </p>

      {/* Order number + status — secondary */}
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <p className="break-all font-mono text-[10px] text-repixl-muted">
          #{order.orderNumber}
        </p>

        <span
          className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${getOrderStatusBadgeClass(
            order.status,
            order.paymentStatus
          )}`}
        >
          {getOrderStatusLabel(order.status, order.paymentStatus)}
        </span>
      </div>

      <p className="mt-1 font-mono text-[10px] text-repixl-muted">
        {order.date}
      </p>
    </div>

    <div className="text-right">
      <p className="font-display text-lg font-bold text-repixl-text-light">
        {formatPrice(order.total)}
      </p>
      <p className="font-mono text-[10px] text-repixl-muted">
        {order.courierName}
      </p>
    </div>
  </div>

  <div className="mt-3 flex flex-col items-start gap-2 border-t border-repixl-muted/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-xs text-repixl-muted">
      {order.items.length} {order.items.length === 1 ? 'item' : 'items'} ·{' '}
      {order.paymentMethod}
    </p>

    <Link
      href={`/account/orders/${order.orderNumber}`}
      className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-repixl-muted transition-colors hover:text-repixl-text-light"
    >
      <span>View Details & Tracking</span>
      <span className="transition-transform group-hover:translate-x-0.5">
        →
      </span>
    </Link>
  </div>
</div>
                )
              })}
            </div>
          )}
        </>
      </div>
    </>
  )
}
