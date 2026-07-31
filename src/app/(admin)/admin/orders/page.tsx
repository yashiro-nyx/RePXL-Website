'use client'

import { useEffect, useState } from 'react'
import { useOrderHistoryStore, type Order } from '@/stores/orderHistoryStore'

const allStatuses = ['Processing', 'Shipped', 'Delivered', 'Completed', 'Cancelled'] as const

const statusStyles: Record<string, string> = {
  Processing: 'bg-amber-50 text-amber-700 border-amber-200',
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Shipped: 'bg-blue-50 text-blue-700 border-blue-200',
  Delivered: 'bg-green-50 text-green-700 border-green-200',
  Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Cancelled: 'bg-red-50 text-red-600 border-red-200',
}

function censorName(name: string): string {
  return name.split(' ').map((p) => p[0] + '*'.repeat(Math.max(p.length - 1, 4))).join(' ')
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-repixl-text-dark">Order Management</h1>
          <p className="mt-0.5 text-sm text-gray-500">{orders.length} total orders</p>
        </div>
      </div>

      <div className="mt-5 flex gap-3">
        <div className="relative flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by order ID or customer..." className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm text-gray-700 placeholder:text-gray-400 focus:border-repixl-red/30 focus:outline-none focus:ring-1 focus:ring-repixl-red/20 shadow-sm" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm focus:border-repixl-red/30 focus:outline-none">
          <option value="">All Statuses</option>
          {allStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/70">
            <tr>
              {['Order ID', 'Customer', 'Total', 'Status', 'Date', 'Actions'].map((h) => (
                <th key={h} className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400">No orders found.</td></tr>}
            {filtered.map((order) => (
              <OrderRow key={order.orderNumber} order={order} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-gray-400">Showing {filtered.length} of {orders.length} orders</p>
    </div>
  )
}

function OrderRow({ order }: { order: Order }) {
  const [statusOpen, setStatusOpen] = useState(false)
  return (
    <tr className="transition-colors hover:bg-gray-50/60">
      <td className="px-5 py-3.5 font-mono text-sm font-semibold text-repixl-red">#{order.orderNumber.replace('RPX-', '')}</td>
      <td className="px-5 py-3.5 font-mono text-sm text-gray-600">{censorName(order.fullName)}</td>
      <td className="px-5 py-3.5 font-mono text-sm font-semibold text-gray-900">${order.total.toFixed(2)}</td>
      <td className="relative px-5 py-3.5">
        <button onClick={() => setStatusOpen(!statusOpen)} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyles[order.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
          {order.status}
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        {statusOpen && (
          <div className="absolute left-5 top-full z-20 mt-1 w-40 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
            {allStatuses.map((s) => <button key={s} onClick={() => setStatusOpen(false)} className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-gray-50 ${order.status === s ? 'font-semibold text-repixl-red' : 'text-gray-600'}`}>{order.status === s && '✓ '}{s}</button>)}
          </div>
        )}
      </td>
      <td className="px-5 py-3.5 text-xs text-gray-400">{order.date}</td>
      <td className="px-5 py-3.5">
        <div className="flex gap-2">
          <button className="rounded-lg bg-repixl-red/5 px-2.5 py-1 text-xs font-medium text-repixl-red hover:bg-repixl-red/10">View</button>
          <button className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-500 hover:bg-amber-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="5" x="2" y="3" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></svg>
          </button>
        </div>
      </td>
    </tr>
  )
}
