'use client'

import { useEffect, useState } from 'react'
import { useOrderHistoryStore, type Order } from '@/stores/orderHistoryStore'

const statusStyles: Record<string, string> = {
  Processing: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Shipped: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Delivered: 'bg-green-500/15 text-green-400 border-green-500/30',
  Completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
}

function censorName(name: string): string {
  return name.split(' ').map((p) => p[0] + '*'.repeat(Math.max(p.length - 1, 4))).join(' ')
}

export default function ArchivedOrdersPage() {
  const archivedOrders = useOrderHistoryStore((s) => s.archivedOrders)
  const restoreOrder = useOrderHistoryStore((s) => s.restoreOrder)
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null)

  useEffect(() => { useOrderHistoryStore.getState().hydrate() }, [])

  const handleRestore = (orderNumber: string) => {
    restoreOrder(orderNumber)
    setConfirmRestore(null)
  }

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-repixl-text-light">Archived Orders</h1>
        <p className="mt-0.5 text-sm text-repixl-muted">{archivedOrders.length} archived orders</p>
      </div>
      <div className="mt-5 overflow-x-auto rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-repixl-muted/10 bg-repixl-bg/50">
            <tr>{['Order ID', 'Customer', 'Total', 'Status', 'Date', 'Actions'].map((h) => <th key={h} className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-repixl-muted">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-repixl-muted/10">
            {archivedOrders.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-repixl-muted">No archived orders.</td></tr>}
            {archivedOrders.map((order) => (
              <tr key={order.orderNumber} className="hover:bg-repixl-bg/60">
                <td className="px-5 py-3.5 font-mono text-sm font-semibold text-repixl-red">#{order.orderNumber.replace('RPX-', '')}</td>
                <td className="px-5 py-3.5 font-mono text-sm text-repixl-text-light/70">{censorName(order.fullName)}</td>
                <td className="px-5 py-3.5 font-mono text-sm font-semibold text-repixl-text-light">${order.total.toFixed(2)}</td>
                <td className="px-5 py-3.5"><span className={`inline-block rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyles[order.status] || 'text-repixl-muted'}`}>{order.status}</span></td>
                <td className="px-5 py-3.5 text-xs text-repixl-muted">{order.date}</td>
                <td className="px-5 py-3.5">
                  <button onClick={() => setConfirmRestore(order.orderNumber)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Restore confirmation */}
      {confirmRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-80 rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-6 shadow-2xl">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-green-400"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </div>
            <p className="text-center font-semibold text-repixl-text-light">Restore this order?</p>
            <p className="mt-1 text-center text-xs text-repixl-muted">It will be moved back to active orders.</p>
            <div className="mt-4 flex gap-3">
              <button onClick={() => handleRestore(confirmRestore)} className="flex-1 rounded-xl bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600">Restore</button>
              <button onClick={() => setConfirmRestore(null)} className="flex-1 rounded-xl border border-repixl-muted/20 px-4 py-2 text-sm text-repixl-muted hover:text-repixl-text-light">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
