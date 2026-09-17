'use client'

import { useEffect, useState, useCallback } from 'react'
import { Pagination } from '@/components/ui/Pagination'
import { formatPrice } from '@/lib/format'
import {
  CANONICAL_ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_BADGE_CLASSES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_BADGE_CLASSES,
  normalizeOrderStatus,
  getOrderStatusLabel,
  getOrderStatusBadgeClass,
} from '@/lib/order-status-unified'

const PAGE_SIZE = 10
const allStatuses = CANONICAL_ORDER_STATUSES
const statusLabels = ORDER_STATUS_LABELS
const statusStyles = ORDER_STATUS_BADGE_CLASSES

const paymentStatusStyles = PAYMENT_STATUS_BADGE_CLASSES
const paymentStatusLabels = PAYMENT_STATUS_LABELS

function censorName(name: string): string {
  return name.split(' ').map((p) => p[0] + '*'.repeat(Math.max(p.length - 1, 4))).join(' ')
}

interface ApiOrder {
  id: string
  orderNumber: string
  fullName: string
  total: number
  status: string
  paymentStatus?: string
  createdAt: string
  courierName: string
  courierEstimate: string
  paymentMethod: string
  address: string
  barangay: string
  city: string
  province: string
  postalCode: string
  deliveryStatus: string
  items: { id: string; quantity: number; price: number; product: { name: string; price: number } }[]
  user?: { email: string; firstName: string; lastName: string }
}

const DELIVERY_STEPS = [
  { step: 'transit',          label: 'Mark In Transit',   icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' },
  { step: 'out_for_delivery', label: 'Out for Delivery',  icon: 'M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3M9 11h14v10H9zM12 21h0M20 21h0' },
  { step: 'delivered',        label: 'Mark Delivered',    icon: 'M20 6 9 17l-5-5' },
]

const deliveryStatusColor: Record<string, string> = {
  'Order Placed': 'text-repixl-muted',
  'In Transit': 'text-blue-400',
  'Out for Delivery': 'text-amber-400',
  'Delivered': 'text-repixl-success',
  'Cancelled': 'text-red-400',
  'COD Request Declined': 'text-red-400',
}

function getDeliveryStatusForOrderStatus(status: string, currentDeliveryStatus?: string): string {
  switch (status) {
    case 'SHIPPED':
      return currentDeliveryStatus === 'Out for Delivery' ? 'Out for Delivery' : 'In Transit'
    case 'DELIVERED':
    case 'COMPLETED':
      return 'Delivered'
    case 'CANCELLED':
      return currentDeliveryStatus === 'COD Request Declined' ? 'COD Request Declined' : 'Cancelled'
    case 'PROCESSING':
    default:
      return currentDeliveryStatus === 'Pending COD Approval' || currentDeliveryStatus === 'COD Approval Requested'
        ? currentDeliveryStatus
        : 'Order Placed'
  }
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null)
  const [viewOrder, setViewOrder] = useState<ApiOrder | null>(null)

  const load = useCallback(async (page: number, status: string, search: string, showFullLoading = true) => {
    if (showFullLoading) {
      setLoading(true)
    } else {
      setIsRefreshing(true)
    }
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
      if (status) params.set('status', status)
      if (search.trim()) params.set('search', search.trim())
      const res = await fetch(`/api/orders?${params}`, { credentials: 'include' })
      if (!res.ok) return
      const json = await res.json()
      setOrders(json.data ?? [])
      setTotal(json.pagination?.total ?? 0)
      setTotalPages(json.pagination?.totalPages ?? 1)
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load(currentPage, statusFilter, searchQuery, true)
    // Background polling every 8s to immediately reflect external updates/orders
    const interval = setInterval(() => {
      void load(currentPage, statusFilter, searchQuery, false)
    }, 8000)

    const handleFocus = () => {
      void load(currentPage, statusFilter, searchQuery, false)
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [currentPage, statusFilter, searchQuery, load])

  // Reset to page 1 when filters change
  const handleStatusChange = (s: string) => { setStatusFilter(s); setCurrentPage(1) }
  const handleSearch = (q: string) => { setSearchQuery(q); setCurrentPage(1) }

  const handleStatusUpdate = async (orderNumber: string, newStatus: string) => {
    if (newStatus === 'COMPLETED') return // blocked — customer only
    const canonical = normalizeOrderStatus(newStatus)
    const nextDeliveryStatus = getDeliveryStatusForOrderStatus(canonical, viewOrder?.deliveryStatus)

    // Optimistic UI update
    setOrders((prev) =>
      prev.map((o) =>
        o.orderNumber === orderNumber
          ? { ...o, status: canonical, deliveryStatus: getDeliveryStatusForOrderStatus(canonical, o.deliveryStatus) }
          : o
      )
    )
    if (viewOrder?.orderNumber === orderNumber) {
      setViewOrder((o) => (o ? { ...o, status: canonical, deliveryStatus: nextDeliveryStatus } : o))
    }

    try {
      const res = await fetch(`/api/orders/${orderNumber}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: canonical }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data.error ?? 'Failed to update order status')
        void load(currentPage, statusFilter, searchQuery, false)
        return
      }
      if (data.data) {
        setOrders((prev) =>
          prev.map((o) => (o.orderNumber === orderNumber ? { ...o, ...data.data } : o))
        )
        if (viewOrder?.orderNumber === orderNumber) {
          setViewOrder((o) => (o ? { ...o, ...data.data } : o))
        }
      }
      void load(currentPage, statusFilter, searchQuery, false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Network error')
      void load(currentPage, statusFilter, searchQuery, false)
    }
  }

  const handleApproveCod = async (orderNumber: string) => {
    if (!confirm(`Approve Cash on Delivery request for order #${orderNumber}? This will officially place the order.`)) return
    try {
      const res = await fetch(`/api/orders/${orderNumber}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ approveCod: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data.error ?? 'Failed to approve COD order')
        return
      }
      setOrders((prev) =>
        prev.map((o) => (o.orderNumber === orderNumber ? { ...o, deliveryStatus: 'Order Placed' } : o))
      )
      if (viewOrder?.orderNumber === orderNumber) {
        setViewOrder((o) => (o ? { ...o, deliveryStatus: 'Order Placed' } : o))
      }
      void load(currentPage, statusFilter, searchQuery, false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Network error')
    }
  }

  const handleArchive = async (orderNumber: string) => {
    try {
      await fetch(`/api/orders/${orderNumber}/archive`, { method: 'POST', credentials: 'include' })
      setConfirmArchive(null)
      void load(currentPage, statusFilter, searchQuery, false)
    } catch { setConfirmArchive(null) }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-repixl-text-light">Order Management</h1>
          <p className="mt-0.5 text-sm text-repixl-muted">{total} total orders</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-repixl-muted">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                isRefreshing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
              }`}
            />
            {isRefreshing ? 'Syncing...' : lastUpdated ? 'Live sync' : 'Live'}
          </span>
          <button
            type="button"
            onClick={() => void load(currentPage, statusFilter, searchQuery, false)}
            disabled={loading || isRefreshing}
            className="flex items-center gap-1.5 rounded-xl border border-repixl-muted/20 bg-repixl-charcoal px-3 py-1.5 text-xs font-medium text-repixl-text-light/80 shadow-sm transition-colors hover:border-repixl-muted/40 hover:text-white"
          >
            <svg
              className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <div className="relative flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="absolute left-3 top-1/2 -translate-y-1/2 text-repixl-muted" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by order ID or customer…"
            className="w-full rounded-xl border border-repixl-muted/20 bg-repixl-charcoal py-2 pl-10 pr-4 text-sm text-repixl-text-light/80 placeholder:text-repixl-muted focus:border-repixl-red/30 focus:outline-none focus:ring-1 focus:ring-repixl-red/20 shadow-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="rounded-xl border border-repixl-muted/20 bg-repixl-charcoal px-4 py-2 text-sm text-repixl-text-light/80 shadow-sm focus:border-repixl-red/30 focus:outline-none"
        >
          <option value="">All Statuses</option>
          {allStatuses.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-repixl-muted/10 bg-repixl-bg/50">
            <tr>
              {['Order ID', 'Customer', 'Total', 'Payment', 'Order Status', 'Date', 'Actions'].map((h) => (
                <th key={h} className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-repixl-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-repixl-muted/10">
            {loading && (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-repixl-muted">Loading…</td></tr>
            )}
            {!loading && orders.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-repixl-muted">No orders found.</td></tr>
            )}
            {!loading && orders.map((order) => {
              const isPaid = order.paymentStatus === 'PAID'
              const isCod =
                order.paymentMethod === 'Cash on Delivery' ||
                order.paymentMethod?.toLowerCase().includes('cash on delivery')
              const isCodPending =
                isCod &&
                (order.deliveryStatus === 'Pending COD Approval' ||
                  order.deliveryStatus === 'COD Approval Requested')
              const canEditStatus = isPaid || isCod

              return (
                <tr key={order.id} className="transition-colors hover:bg-repixl-bg/60">
                  <td className="px-5 py-3.5 font-mono text-sm font-semibold text-repixl-red">#{order.orderNumber.replace('RPX-', '')}</td>
                  <td className="px-5 py-3.5 font-mono text-sm text-repixl-text-light/70">{censorName(order.fullName)}</td>
                  <td className="px-5 py-3.5 font-mono text-sm font-semibold text-repixl-text-light">{formatPrice(order.total)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold ${paymentStatusStyles[order.paymentStatus ?? 'PENDING'] ?? 'bg-repixl-bg text-repixl-muted border-repixl-muted/20'}`}>
                      {order.paymentStatus === 'PAID' && <span>✓</span>}
                      {(!order.paymentStatus || order.paymentStatus === 'PENDING') && <span>⏳</span>}
                      {order.paymentStatus === 'FAILED' && <span>✗</span>}
                      {order.paymentStatus === 'REFUNDED' && <span>↩</span>}
                      {paymentStatusLabels[order.paymentStatus ?? 'PENDING'] ?? (order.paymentStatus || 'Pending')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {isCodPending ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-amber-300">
                          Awaiting COD Approval
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleApproveCod(order.orderNumber)}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300 hover:bg-emerald-500/30 transition-colors shadow-sm"
                          title="Approve Cash on Delivery Order"
                        >
                          ✓ Approve
                        </button>
                      </div>
                    ) : !canEditStatus ? (
                      <div className="group relative inline-block">
                        <select
                          disabled
                          value={order.status}
                          className="cursor-not-allowed rounded-full border border-repixl-muted/20 bg-repixl-bg/50 px-2.5 py-1 text-[11px] font-semibold text-repixl-muted/50 opacity-60"
                        >
                          {allStatuses.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
                        </select>
                        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/90 px-2 py-1 text-[10px] text-amber-300 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-10">
                          🔒 Payment must be completed first
                        </span>
                      </div>
                    ) : (
                      <select
                        value={normalizeOrderStatus(order.status)}
                        onChange={(e) => {
                          if (e.target.value === 'COMPLETED' && normalizeOrderStatus(order.status) === 'DELIVERED') {
                            alert('Completed status can only be set by the customer after confirming receipt.')
                            e.target.value = normalizeOrderStatus(order.status)
                            return
                          }
                          void handleStatusUpdate(order.orderNumber, e.target.value)
                        }}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold cursor-pointer appearance-none pr-6 bg-no-repeat bg-[length:10px] bg-[right_8px_center] ${getOrderStatusBadgeClass(order.status, order.paymentStatus, order.deliveryStatus, order.paymentMethod)}`}
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")` }}
                      >
                        {allStatuses.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-repixl-muted">
                    {new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setViewOrder(order)} className="rounded-lg bg-repixl-red/5 px-2.5 py-1 text-xs font-medium text-repixl-red hover:bg-repixl-red/10">Manage</button>
                      <button type="button" onClick={() => setConfirmArchive(order.orderNumber)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20" aria-label="Archive order">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="5" x="2" y="3" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={total}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
        itemLabel="orders"
      />

      {/* Archive confirmation */}
      {confirmArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-80 rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-6 shadow-2xl">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber-500" aria-hidden="true"><rect width="20" height="5" x="2" y="3" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></svg>
            </div>
            <p className="text-center font-semibold text-repixl-text-light">Archive this order?</p>
            <p className="mt-1 text-center text-xs text-repixl-muted">It will be moved to Archived Orders and can be restored later.</p>
            <div className="mt-4 flex gap-3">
              <button onClick={() => void handleArchive(confirmArchive)} className="flex-1 rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600">Archive</button>
              <button onClick={() => setConfirmArchive(null)} className="flex-1 rounded-xl border border-repixl-muted/20 px-4 py-2 text-sm text-repixl-muted hover:text-repixl-text-light">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {viewOrder && (
        <OrderDetailModal
          order={viewOrder}
          onClose={() => setViewOrder(null)}
          onStatusChange={(newStatus) => {
            void handleStatusUpdate(viewOrder.orderNumber, newStatus)
            const nextDeliveryStatus = getDeliveryStatusForOrderStatus(newStatus, viewOrder.deliveryStatus)
            setViewOrder((o) => o ? { ...o, status: newStatus, deliveryStatus: nextDeliveryStatus } : o)
          }}
          onPaymentCompleted={() => {
            void load(currentPage, statusFilter, searchQuery)
            setViewOrder((o) => o ? { ...o, paymentStatus: 'PAID' } : o)
          }}
        />
      )}
    </div>
  )
}

// ─── Order Detail + Shipping Management Modal ─────────────────────────────────

function OrderDetailModal({
  order,
  onClose,
  onStatusChange,
  onPaymentCompleted,
}: {
  order: ApiOrder
  onClose: () => void
  onStatusChange: (status: string) => void
  onPaymentCompleted: () => void
}) {
  const [firing, setFiring] = useState<string | null>(null)
  const [markingPaid, setMarkingPaid] = useState(false)
  const [approvingCod, setApprovingCod] = useState(false)
  const [rejectingCod, setRejectingCod] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)
  const [currentDeliveryStatus, setCurrentDeliveryStatus] = useState(order.deliveryStatus ?? 'Order Placed')

  useEffect(() => {
    setCurrentDeliveryStatus(order.deliveryStatus ?? 'Order Placed')
  }, [order.deliveryStatus])

  const isCod =
    order.paymentMethod === 'Cash on Delivery' ||
    order.paymentMethod?.toLowerCase().includes('cash on delivery')
  const isCodPending =
    isCod &&
    (currentDeliveryStatus === 'Pending COD Approval' ||
      currentDeliveryStatus === 'COD Approval Requested')
  const isPaid = order.paymentStatus === 'PAID'
  const isLocked = !isPaid && !isCod
  const isDeliveryLocked = !isPaid && !isCod

  const handleApproveCodModal = async () => {
    if (!confirm(`Approve Cash on Delivery order #${order.orderNumber}? This will officially place the order.`)) return
    setApprovingCod(true)
    setFeedback(null)
    try {
      const res = await fetch(`/api/orders/${order.orderNumber}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ approveCod: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setCurrentDeliveryStatus('Order Placed')
        onPaymentCompleted()
        setFeedback({ ok: true, message: '✓ Cash on Delivery approved! Order is now officially placed.' })
      } else {
        setFeedback({ ok: false, message: `✗ Failed to approve COD: ${data.error ?? 'Unknown error'}` })
      }
    } catch (err) {
      setFeedback({ ok: false, message: `✗ Network error: ${err instanceof Error ? err.message : 'Unknown error'}` })
    } finally {
      setApprovingCod(false)
    }
  }

  const handleRejectCodModal = async () => {
    if (!confirm(`Decline Cash on Delivery request for order #${order.orderNumber}? The order will be cancelled and items returned to stock.`)) return
    setRejectingCod(true)
    setFeedback(null)
    try {
      const res = await fetch(`/api/orders/${order.orderNumber}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rejectCod: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setCurrentDeliveryStatus('COD Request Declined')
        onStatusChange('CANCELLED')
        setFeedback({ ok: true, message: '✓ COD request declined and order cancelled.' })
      } else {
        setFeedback({ ok: false, message: `✗ Failed to decline COD: ${data.error ?? 'Unknown error'}` })
      }
    } catch (err) {
      setFeedback({ ok: false, message: `✗ Network error: ${err instanceof Error ? err.message : 'Unknown error'}` })
    } finally {
      setRejectingCod(false)
    }
  }

  const handleMarkPaid = async () => {
    if (!confirm(`Mark payment as completed for order #${order.orderNumber}?`)) return
    setMarkingPaid(true)
    setFeedback(null)
    try {
      const res = await fetch(`/api/orders/${order.orderNumber}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ markPaymentCompleted: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        onPaymentCompleted()
        setFeedback({ ok: true, message: '✓ Payment marked as completed. Status editing is now unlocked.' })
      } else {
        setFeedback({ ok: false, message: `✗ Failed to mark payment completed: ${data.error ?? 'Unknown error'}` })
      }
    } catch (err) {
      setFeedback({ ok: false, message: `✗ Network error: ${err instanceof Error ? err.message : 'Unknown error'}` })
    } finally {
      setMarkingPaid(false)
    }
  }

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
        if (step.step === 'transit' || step.step === 'out_for_delivery') onStatusChange('SHIPPED')
        if (step.step === 'delivered') onStatusChange('DELIVERED')
        setFeedback({ ok: true, message: `✓ ${step.label} — customer tracking updated` })
      } else {
        setFeedback({ ok: false, message: `✗ Tracking update failed: ${data.error ?? 'Unknown error'}` })
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
        <div className="flex items-center justify-between border-b border-repixl-muted/10 px-6 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted">Order Management</p>
            <h2 className="mt-0.5 font-display text-lg font-bold text-repixl-text-light">#{order.orderNumber}</h2>
          </div>
          <button onClick={onClose} className="text-repixl-muted transition-colors hover:text-repixl-text-light" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* COD Approval Request Card */}
          {isCodPending && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/25 font-mono text-xs font-bold text-amber-300">
                      ⏳
                    </span>
                    <h3 className="font-display text-sm font-bold text-amber-200">
                      Cash on Delivery Request — Approval Required
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-amber-300/80">
                    This order was submitted via Cash on Delivery and is awaiting store approval before being officially placed and dispatched.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    disabled={approvingCod || rejectingCod}
                    onClick={() => void handleApproveCodModal()}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 shadow-md"
                  >
                    {approvingCod ? 'Approving…' : '✓ Approve COD'}
                  </button>
                  <button
                    type="button"
                    disabled={approvingCod || rejectingCod}
                    onClick={() => void handleRejectCodModal()}
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                  >
                    {rejectingCod ? 'Declining…' : 'Decline'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Order summary */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              { label: 'Customer', value: censorName(order.fullName) },
              { label: 'Date', value: new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) },
              { label: 'Total', value: formatPrice(order.total) },
              { label: 'Courier', value: order.courierName },
              { label: 'Estimate', value: order.courierEstimate },
              { label: 'Payment Method', value: order.paymentMethod },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-repixl-bg/40 px-3 py-2.5">
                <p className="font-mono text-[9px] uppercase tracking-wider text-repixl-muted">{label}</p>
                <p className="mt-0.5 truncate text-sm text-repixl-text-light">{value}</p>
              </div>
            ))}
          </div>

          {/* Payment Status & Expiry Card */}
          <div className="rounded-xl border border-repixl-muted/10 bg-repixl-bg/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted">Payment Processing</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs font-semibold ${paymentStatusStyles[order.paymentStatus ?? 'PENDING'] ?? 'bg-repixl-bg text-repixl-muted border-repixl-muted/20'}`}>
                    {order.paymentStatus === 'PAID' && <span>✓</span>}
                    {(!order.paymentStatus || order.paymentStatus === 'PENDING') && <span>⏳</span>}
                    {order.paymentStatus === 'FAILED' && <span>✗</span>}
                    {order.paymentStatus === 'REFUNDED' && <span>↩</span>}
                    {paymentStatusLabels[order.paymentStatus ?? 'PENDING'] ?? (order.paymentStatus || 'Pending')}
                  </span>
                  {order.paymentStatus !== 'PAID' && (
                    <span className="text-xs text-amber-400 font-medium">
                      {order.paymentStatus === 'FAILED'
                        ? '• Payment processing expired / failed'
                        : isCod
                        ? isCodPending
                          ? '• Awaiting COD Approval'
                          : '• Cash collection due on delivery'
                        : '• Status editing locked until paid'}
                    </span>
                  )}
                </div>
              </div>
              {order.paymentStatus !== 'PAID' && order.status !== 'CANCELLED' && (
                <button
                  type="button"
                  disabled={markingPaid}
                  onClick={() => void handleMarkPaid()}
                  className="flex items-center gap-1.5 rounded-xl border border-green-500/30 bg-green-500/15 px-3.5 py-2 text-xs font-semibold text-green-400 hover:bg-green-500/25 transition-all disabled:opacity-50 shadow-sm"
                >
                  {markingPaid ? (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-green-400 border-t-transparent" />
                      Processing…
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
                      Mark Payment Completed
                    </>
                  )}
                </button>
              )}
            </div>
            {isCod ? (
              <p className="mt-2 text-[11px] text-repixl-muted/80">
                {isCodPending
                  ? 'Cash on Delivery request is awaiting administrator approval. Once approved, the order will be prepared for courier pickup.'
                  : 'Cash on Delivery order is approved. Collect total amount in cash upon courier delivery, then click Mark Payment Completed.'}
              </p>
            ) : (!order.paymentStatus || order.paymentStatus === 'PENDING') && (
              <p className="mt-2 text-[11px] text-repixl-muted/80">
                Payment processing expires within 24 hours of order placement. Unpaid orders will auto-cancel and release stock.
              </p>
            )}
          </div>

          {/* Order Status */}
          <div className="rounded-xl border border-repixl-muted/10 bg-repixl-bg/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted">Order Status</p>
              {isLocked && (
                <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                  <span>🔒</span> {isCodPending ? 'Locked (Awaiting COD Approval)' : 'Locked (Payment Pending)'}
                </span>
              )}
            </div>

            {isLocked && (
              <div className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber-400 flex items-center gap-2">
                <span>🔒</span>
                <span>
                  {isCodPending
                    ? 'Order status cannot be updated until the Cash on Delivery request is approved.'
                    : 'Order status cannot be updated until payment has been marked completed.'}
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {allStatuses.map((s) => {
                const isBlockedTransition = s === 'COMPLETED' && order.status === 'DELIVERED'
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={isLocked}
                    onClick={() => {
                      if (isBlockedTransition) {
                        setFeedback({ ok: false, message: '✗ Completed can only be set by the customer after confirming receipt.' })
                        return
                      }
                      onStatusChange(s)
                    }}
                    title={
                      isLocked
                        ? isCodPending
                          ? 'Approve COD request first'
                          : 'Payment must be marked completed first'
                        : isBlockedTransition
                        ? 'Customer must confirm receipt to complete this order'
                        : undefined
                    }
                    className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all ${
                      order.status === s
                        ? `${statusStyles[s]} border-current`
                        : isLocked
                        ? 'cursor-not-allowed border-repixl-muted/10 text-repixl-muted/30 opacity-50'
                        : isBlockedTransition
                        ? 'cursor-not-allowed border-repixl-muted/10 text-repixl-muted/30'
                        : 'border-repixl-muted/20 text-repixl-muted hover:border-repixl-muted/40 hover:text-repixl-text-light'
                    }`}
                  >
                    {statusLabels[s]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Delivery Tracking */}
          <div className="rounded-xl border border-repixl-muted/10 bg-repixl-bg/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted">Delivery Tracking</p>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-repixl-success" aria-hidden="true" />
                <span className={`font-mono text-[9px] ${deliveryStatusColor[currentDeliveryStatus] ?? 'text-repixl-muted'}`}>{currentDeliveryStatus}</span>
              </div>
            </div>
            {isDeliveryLocked ? (
              <p className="mb-3 text-xs text-amber-400/90 font-medium">
                🔒 Delivery tracking updates require completed payment.
              </p>
            ) : (
              <p className="mb-3 text-xs text-repixl-muted/70">
                {isCod && !isPaid
                  ? 'Cash on Delivery: delivery tracking can be updated while payment is pending collection upon delivery.'
                  : 'Updating delivery status notifies the customer in real time.'}
              </p>
            )}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {DELIVERY_STEPS.map((step) => {
                return (
                  <button
                    key={step.step}
                    type="button"
                    onClick={() => void fireStep(step)}
                    disabled={isDeliveryLocked || !!firing}
                    className="flex items-center gap-3 rounded-xl border border-repixl-muted/15 bg-repixl-charcoal px-4 py-3 text-left transition-all hover:border-repixl-red/30 hover:bg-repixl-red/5 disabled:cursor-not-allowed disabled:opacity-40"
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
                )
              })}
            </div>
            {feedback && (
              <div className={`mt-3 rounded-lg px-3 py-2 font-mono text-[10px] ${feedback.ok ? 'border border-repixl-success/20 bg-repixl-success/10 text-repixl-success' : 'border border-red-500/20 bg-red-500/10 text-red-400'}`}>
                {feedback.message}
              </div>
            )}
          </div>

          {/* Items */}
          <div className="rounded-xl border border-repixl-muted/10 bg-repixl-bg/30 p-4">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-repixl-muted">Items Ordered</p>
            <div className="space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg bg-repixl-charcoal/60 px-3 py-2">
                  <span className="text-sm text-repixl-text-light">{item.product?.name ?? 'Product'}</span>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-xs text-repixl-muted">×{item.quantity}</span>
                    <span className="font-mono text-sm text-repixl-text-light">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between border-t border-repixl-muted/10 pt-3 font-semibold">
              <span className="text-sm text-repixl-text-light">Total</span>
              <span className="font-mono text-repixl-red">{formatPrice(order.total)}</span>
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
