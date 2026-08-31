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

      {/* View order detail modal */}
      {viewOrder && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal shadow-2xl">
            <div className="flex items-center justify-between border-b border-repixl-muted/10 px-6 py-4">
              <h2 className="font-bold text-repixl-text-light">Order #{viewOrder.orderNumber.replace('RPX-', '')}</h2>
              <button onClick={() => setViewOrder(null)} className="text-repixl-muted hover:text-repixl-text-light"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-[10px] uppercase tracking-wider text-repixl-muted">Customer</p><p className="mt-1 text-sm text-repixl-text-light">{censorName(viewOrder.fullName)}</p></div>
                <div><p className="text-[10px] uppercase tracking-wider text-repixl-muted">Status</p><p className="mt-1"><span className={`inline-block rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyles[viewOrder.status] || 'text-repixl-muted'}`}>{viewOrder.status}</span></p></div>
                <div><p className="text-[10px] uppercase tracking-wider text-repixl-muted">Date</p><p className="mt-1 text-sm text-repixl-text-light/70">{viewOrder.date}</p></div>
                <div><p className="text-[10px] uppercase tracking-wider text-repixl-muted">Payment</p><p className="mt-1 text-sm text-repixl-text-light/70">{viewOrder.paymentMethod}</p></div>
                <div><p className="text-[10px] uppercase tracking-wider text-repixl-muted">Courier</p><p className="mt-1 text-sm text-repixl-text-light/70">{viewOrder.courierName}</p></div>
                <div><p className="text-[10px] uppercase tracking-wider text-repixl-muted">Estimate</p><p className="mt-1 text-sm text-repixl-text-light/70">{viewOrder.courierEstimate}</p></div>
              </div>
              <div className="border-t border-repixl-muted/10 pt-4">
                <p className="text-[10px] uppercase tracking-wider text-repixl-muted mb-2">Items</p>
                {viewOrder.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-repixl-muted/5 last:border-0">
                    <span className="text-sm text-repixl-text-light">{item.name}</span>
                    <span className="font-mono text-xs text-repixl-muted">×{item.stock}</span>
                    <span className="text-sm font-mono text-repixl-text-light/70">${(item.price * item.stock).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-repixl-muted/10 pt-4 space-y-1">
                <div className="flex justify-between text-sm"><span className="text-repixl-muted">Subtotal</span><span className="text-repixl-text-light/70">${viewOrder.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-repixl-muted">Shipping</span><span className="text-repixl-text-light/70">${viewOrder.shippingCost.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm font-semibold"><span className="text-repixl-text-light">Total</span><span className="text-repixl-red">${viewOrder.total.toFixed(2)}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function OrderRow({ order, updateStatus, onArchive, onView }: { order: Order; updateStatus: (orderNumber: string, status: Order['status']) => void; onArchive: () => void; onView: () => void }) {
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as Order['status']
    if (newStatus !== order.status) {
      updateStatus(order.orderNumber, newStatus)
    }
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
          {allStatuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </td>
      <td className="px-5 py-3.5 text-xs text-repixl-muted">{order.date}</td>
      <td className="px-5 py-3.5">
        <div className="flex gap-2">
          <button type="button" onClick={onView} className="rounded-lg bg-repixl-red/5 px-2.5 py-1 text-xs font-medium text-repixl-red hover:bg-repixl-red/10">View</button>
          <button type="button" onClick={onArchive} className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="5" x="2" y="3" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></svg>
          </button>
        </div>
      </td>
    </tr>
  )
}
