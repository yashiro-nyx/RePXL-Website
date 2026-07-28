'use client'

import { useEffect, useState } from 'react'
import { useOrderHistoryStore, type Order } from '@/stores/orderHistoryStore'

const allStatuses = ['Processing', 'Shipped', 'Delivered', 'Completed', 'Cancelled'] as const
type OrderStatus = typeof allStatuses[number]

const statusColors: Record<string, string> = {
  Processing: 'bg-blue-500 text-white',
  Pending: 'bg-amber-600 text-white',
  Shipped: 'bg-cyan-600 text-white',
  Delivered: 'bg-green-600 text-white',
  Completed: 'bg-emerald-600 text-white',
  Cancelled: 'bg-red-600 text-white',
}

function censorName(name: string): string {
  const parts = name.split(' ')
  return parts.map((p) => p[0] + '*'.repeat(Math.max(p.length - 1, 4))).join(' ')
}

export default function AdminOrdersPage() {
  const orders = useOrderHistoryStore((s) => s.orders)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => { useOrderHistoryStore.getState().hydrate() }, [])

  const filtered = orders.filter((o) => {
    if (statusFilter && o.status !== statusFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      if (!o.orderNumber.toLowerCase().includes(q) && !o.fullName.toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <div>
      {/* Header with inline filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z" /><path d="M15 3v4a2 2 0 0 0 2 2h4" /></svg>
        </div>
        <h1 className="text-xl font-semibold text-white">Order Management</h1>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 py-1.5 text-sm text-slate-300 focus:border-blue-500 focus:outline-none">
          <option value="">All Statuses</option>
          {allStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="relative">
          <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search orders..." className="rounded-lg border border-slate-700/50 bg-slate-800/60 py-1.5 pl-3 pr-8 text-sm text-slate-300 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none" />
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-500">{filtered.length} orders found</p>

      {/* Table */}
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-700/50 bg-slate-800/60">
            <tr>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Order ID</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Customer</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Total Amount</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Order Date</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-600">No orders found.</td></tr>
            )}
            {filtered.map((order) => (
              <OrderRow key={order.orderNumber} order={order} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 font-mono text-[10px] text-slate-600">Showing {filtered.length} of {orders.length} orders</p>
    </div>
  )
}

function OrderRow({ order }: { order: Order }) {
  const [statusOpen, setStatusOpen] = useState(false)

  return (
    <tr className="transition-colors hover:bg-slate-700/20">
      <td className="px-4 py-3 font-mono text-sm font-semibold text-slate-300">#{order.orderNumber.replace('RPX-', '')}</td>
      <td className="px-4 py-3 font-mono text-sm text-slate-400">{censorName(order.fullName)}</td>
      <td className="px-4 py-3 font-mono text-sm font-medium text-slate-200">${order.total.toFixed(2)}</td>
      <td className="relative px-4 py-3">
        <button
          onClick={() => setStatusOpen(!statusOpen)}
          className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-bold ${statusColors[order.status] || 'bg-slate-600 text-white'}`}
        >
          {order.status}
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        {statusOpen && (
          <div className="absolute left-4 top-full z-20 mt-1 w-36 rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-xl">
            {allStatuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatusOpen(false)}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-slate-800 ${order.status === s ? 'text-white' : 'text-slate-400'}`}
              >
                {order.status === s && <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
                {order.status !== s && <span className="w-2.5" />}
                {s}
              </button>
            ))}
          </div>
        )}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-slate-500">{order.date}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button className="rounded bg-blue-500/10 px-2.5 py-1 text-[11px] font-medium text-blue-400 transition-colors hover:bg-blue-500/20">View</button>
          <button className="flex h-7 w-7 items-center justify-center rounded bg-amber-500/10 text-amber-400 transition-colors hover:bg-amber-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="5" x="2" y="3" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></svg>
          </button>
        </div>
      </td>
    </tr>
  )
}
