'use client'

import { useEffect, useState } from 'react'
import { useOrderHistoryStore, type Order } from '@/stores/orderHistoryStore'
import { Pagination } from '@/components/ui/Pagination'

const allStatuses = ['Processing', 'Shipped', 'Delivered', 'Completed', 'Cancelled'] as const

const statusStyles: Record<string, string> = {
  Processing: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Shipped: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Delivered: 'bg-green-500/15 text-green-400 border-green-500/30',
  Completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
}

function censorName(name: string): string {
  return name.split(' ').map((p) => p[0] + '*'.repeat(Math.max(p.length - 1, 4))).join(' ')
}

export default function AdminOrdersPage() {
  const orders = useOrderHistoryStore((s) => s.orders)
  const updateStatus = useOrderHistoryStore((s) => s.updateStatus)
  const archiveOrder = useOrderHistoryStore((s) => s.archiveOrder)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null)
  const [viewOrder, setViewOrder] = useState<Order | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => { useOrderHistoryStore.getState().hydrate() }, [])

  const filtered = orders.filter((o) => {
    if (statusFilter && o.status !== statusFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      if (!o.orderNumber.toLowerCase().includes(q) && !o.fullName.toLowerCase().includes(q)) return false
    }
    return true
  })

  const ITEMS_PER_PAGE = 10
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const handleArchive = (orderNumber: string) => {
    archiveOrder(orderNumber)
    setConfirmArchive(null)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-repixl-text-light">Order Management</h1>
          <p className="mt-0.5 text-sm text-repixl-muted">{orders.length} total orders</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <div className="relative flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="absolute left-3 top-1/2 -translate-y-1/2 text-repixl-muted"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by order ID or customer..." className="w-full rounded-xl border border-repixl-muted/20 bg-repixl-charcoal py-2 pl-10 pr-4 text-sm text-repixl-text-light/80 placeholder:text-repixl-muted focus:border-repixl-red/30 focus:outline-none focus:ring-1 focus:ring-repixl-red/20 shadow-sm" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-repixl-muted/20 bg-repixl-charcoal px-4 py-2 text-sm text-repixl-text-light/80 shadow-sm focus:border-repixl-red/30 focus:outline-none">
          <option value="">All Statuses</option>
          {allStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-repixl-muted/10 bg-repixl-bg/50">
            <tr>
              {['Order ID', 'Customer', 'Total', 'Status', 'Date', 'Actions'].map((h) => (
                <th key={h} className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-repixl-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-repixl-muted/10">
            {filtered.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-repixl-muted">No orders found.</td></tr>}
            {paginated.map((order) => (
              <OrderRow key={order.orderNumber} order={order} updateStatus={updateStatus} onArchive={() => setConfirmArchive(order.orderNumber)} onView={() => setViewOrder(order)} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-repixl-muted">Showing {paginated.length} of {orders.length} orders</p>
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      {/* Archive confirmation modal */}
      {confirmArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-80 rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-6 shadow-2xl">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber-500"><rect width="20" height="5" x="2" y="3" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></svg>
            </div>
            <p className="text-center font-semibold text-repixl-text-light">Archive this order?</p>
            <p className="mt-1 text-center text-xs text-repixl-muted">It will be moved to Archived Orders and can be restored later.</p>
            <div className="mt-4 flex gap-3">
              <button onClick={() => handleArchive(confirmArchive)} className="flex-1 rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600">Archive</button>
              <button onClick={() => setConfirmArchive(null)} className="flex-1 rounded-xl border border-repixl-muted/20 px-4 py-2 text-sm text-repixl-muted hover:text-repixl-text-light">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* View order detail modal — includes shipping/tracking management */}
      {viewOrder && (
        <OrderDetailModal
          order={viewOrder}
          onClose={() => setViewOrder(null)}
          onStatusChange={(newStatus) => {
            updateStatus(viewOrder.orderNumber, newStatus)
            setViewOrder({ ...viewOrder, status: newStatus })
          }}
        />
      )}
    </div>
  )
}

// ─── Order Row ────────────────────────────────────────────────────────────────

function OrderRow({ order, updateStatus, onArchive, onView }: {
  order: Order
  updateStatus: (orderNumber: string, status: Order['status']) => void
  onArchive: () => void
  onView: () => void
}) {
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as Order['status']
    if (newStatus !== order.status) updateStatus(order.orderNumber, newStatus)
  }

  return (
    <tr className="transition-colors hover:bg-repixl-bg/60">
      <td className="px-5 py-3.5 font-mono text-sm font-semibold text-repixl-red">#{order.orderNumber.replace('RPX-', '')}</td>
      <td className="px-5 py-3.5 font-mono text-sm text-repixl-text-light/70">{censorName(order.fullName)}</td>
      <td className="px-5 py-3.5 font-mono text-sm font-semibold text-repixl-text-light">${order.total.toFixed(2)}</td>
      <td className="px-5 py-3.5">
        <select
          value={order.status}
          onChange={handleStatusChange}
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold cursor-pointer appearance-none pr-6 bg-no-repeat bg-[length:10px] bg-[right_8px_center] ${statusStyles[order.status] || 'bg-repixl-bg text-repixl-text-light/70 border-repixl-muted/20'}`}
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")` }}
        >
          {allStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>
      <td className="px-5 py-3.5 text-xs text-repixl-muted">{order.date}</td>
      <td className="px-5 py-3.5">
        <div className="flex gap-2">
          <button type="button" onClick={onView} className="rounded-lg bg-repixl-red/5 px-2.5 py-1 text-xs font-medium text-repixl-red hover:bg-repixl-red/10">Manage</button>
          <button type="button" onClick={onArchive} className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="5" x="2" y="3" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></svg>
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Order Detail + Shipping Management Modal ─────────────────────────────────

const DELIVERY_STEPS = [
  { step: 'transit',          label: 'Mark In Transit',        icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', statusCode: 'IT', description: 'Your camera has left the warehouse and is on its way to you.' },
  { step: 'out_for_delivery', label: 'Out for Delivery',        icon: 'M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3M9 11h14v10H9zM12 21h0M20 21h0', statusCode: 'OD', description: 'Your package is out for delivery and will arrive today.' },
  { step: 'delivered',        label: 'Mark Delivered',          icon: 'M20 6 9 17l-5-5', statusCode: 'DE', description: 'Your camera has been delivered. Enjoy your new camera!' },
]

const deliveryStatusLabel: Record<string, { label: string; color: string }> = {
  'Order Placed':      { label: 'Order Placed',      color: 'text-repixl-muted' },
  'In Transit':        { label: 'In Transit',         color: 'text-blue-400' },
  'Out for Delivery':  { label: 'Out for Delivery',   color: 'text-amber-400' },
  'Delivered':         { label: 'Delivered',           color: 'text-repixl-success' },
}

function OrderDetailModal({ order, onClose, onStatusChange }: {
  order: Order
  onClose: () => void
  onStatusChange: (status: Order['status']) => void
}) {
  const [firing, setFiring] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)
  const [currentDeliveryStatus, setCurrentDeliveryStatus] = useState('Order Placed')

  const fireStep = async (step: typeof DELIVERY_STEPS[0]) => {
    setFiring(step.step)
    setFeedback(null)
    try {
      const res = await fetch('/api/admin/update-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: order.orderNumber, step: step.step }),
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        setCurrentDeliveryStatus(data.deliveryStatus ?? step.step.replace(/_/g, ' '))
        if (step.step === 'out_for_delivery') onStatusChange('Shipped')
        if (step.step === 'delivered') onStatusChange('Delivered')
        setFeedback({ ok: true, message: `✓ ${step.label} — customer tracking updated` })
      } else {
        const errMsg = data.error ?? 'Update failed'
        console.error('[tracking] update failed:', errMsg)
        setFeedback({ ok: false, message: `✗ Tracking update failed: ${errMsg}` })
      }
    } catch (err) {
      setFeedback({ ok: false, message: `✗ Network error: ${err instanceof Error ? err.message : 'Unknown error'}` })
    } finally {
      setFiring(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-12 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-repixl-muted/10 px-6 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted">Order Management</p>
            <h2 className="mt-0.5 font-display text-lg font-bold text-repixl-text-light">#{order.orderNumber}</h2>
          </div>
          <button onClick={onClose} className="text-repixl-muted transition-colors hover:text-repixl-text-light" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Order info summary */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              { label: 'Customer', value: censorName(order.fullName) },
              { label: 'Date', value: order.date },
              { label: 'Total', value: `$${order.total.toFixed(2)}` },
              { label: 'Courier', value: order.courierName },
              { label: 'Estimate', value: order.courierEstimate },
              { label: 'Payment', value: order.paymentMethod },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-repixl-bg/40 px-3 py-2.5">
                <p className="font-mono text-[9px] uppercase tracking-wider text-repixl-muted">{label}</p>
                <p className="mt-0.5 text-sm text-repixl-text-light truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* Order Status */}
          <div className="rounded-xl border border-repixl-muted/10 bg-repixl-bg/30 p-4">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-repixl-muted">Order Status</p>
            <div className="flex flex-wrap gap-2">
              {allStatuses.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onStatusChange(s)}
                  className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all ${
                    order.status === s
                      ? `${statusStyles[s]} border-current`
                      : 'border-repixl-muted/20 text-repixl-muted hover:border-repixl-muted/40 hover:text-repixl-text-light'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Delivery Tracking Controls */}
          <div className="rounded-xl border border-repixl-muted/10 bg-repixl-bg/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted">Delivery Tracking</p>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-repixl-success" aria-hidden="true" />
                <span className={`font-mono text-[9px] ${deliveryStatusLabel[currentDeliveryStatus]?.color ?? 'text-repixl-muted'}`}>
                  {currentDeliveryStatus}
                </span>
              </div>
            </div>

            <p className="mb-3 text-xs text-repixl-muted/70">
              Updating delivery status notifies the customer in real time — no page refresh needed.
            </p>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {DELIVERY_STEPS.map((step) => (
                <button
                  key={step.step}
                  type="button"
                  onClick={() => void fireStep(step)}
                  disabled={!!firing}
                  className="flex items-center gap-3 rounded-xl border border-repixl-muted/15 bg-repixl-charcoal px-4 py-3 text-left transition-all hover:border-repixl-red/30 hover:bg-repixl-red/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-repixl-red/10">
                    {firing === step.step ? (
                      <svg className="h-3.5 w-3.5 animate-spin text-repixl-red" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-red" aria-hidden="true">
                        <path d={step.icon} />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-repixl-text-light">{step.label}</span>
                </button>
              ))}
            </div>

            {feedback && (
              <div className={`mt-3 rounded-lg px-3 py-2 font-mono text-[10px] ${
                feedback.ok
                  ? 'border border-repixl-success/20 bg-repixl-success/10 text-repixl-success'
                  : 'border border-red-500/20 bg-red-500/10 text-red-400'
              }`}>
                {feedback.message}
              </div>
            )}
          </div>

          {/* Items */}
          <div className="rounded-xl border border-repixl-muted/10 bg-repixl-bg/30 p-4">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-repixl-muted">Items Ordered</p>
            <div className="space-y-2">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-repixl-charcoal/60 px-3 py-2">
                  <span className="text-sm text-repixl-text-light">{item.name}</span>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-xs text-repixl-muted">×{item.stock}</span>
                    <span className="font-mono text-sm text-repixl-text-light">${(item.price * item.stock).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between border-t border-repixl-muted/10 pt-3 font-semibold">
              <span className="text-sm text-repixl-text-light">Total</span>
              <span className="font-mono text-repixl-red">${order.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Shipping address */}
          <div className="rounded-xl border border-repixl-muted/10 bg-repixl-bg/30 p-4">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-repixl-muted">Ship to</p>
            <p className="text-sm text-repixl-text-light">{censorName(order.fullName)}</p>
            <p className="mt-0.5 text-sm text-repixl-text-light/60">{order.address}{order.barangay ? `, ${order.barangay}` : ''}</p>
            <p className="text-sm text-repixl-text-light/60">{order.city}{order.province ? `, ${order.province}` : ''} {order.postalCode}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
