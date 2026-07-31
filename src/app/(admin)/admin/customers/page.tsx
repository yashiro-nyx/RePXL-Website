'use client'

import { useState, useEffect } from 'react'
import { useOrderHistoryStore } from '@/stores/orderHistoryStore'

const mockCustomers = [
  { id: '1', name: 'Mia Rodriguez', email: 'mia.rodriguez@gmail.com', role: 'User' },
  { id: '2', name: 'Jordan Torres', email: 'jordan.torres@yahoo.com', role: 'User' },
  { id: '3', name: 'Alyssa Kim', email: 'alyssa.kim@outlook.com', role: 'User' },
  { id: '4', name: 'Sam Davis', email: 'sam.davis@gmail.com', role: 'User' },
  { id: '5', name: 'Chris Lee', email: 'chris.lee@hotmail.com', role: 'User' },
  { id: '6', name: 'Taylor Morgan', email: 'taylor.morgan@gmail.com', role: 'User' },
  { id: '7', name: 'Riley Nash', email: 'riley.nash@yahoo.com', role: 'User' },
  { id: '8', name: 'Casey Flores', email: 'casey.flores@gmail.com', role: 'User' },
  { id: '9', name: 'Morgan Park', email: 'morgan.park@outlook.com', role: 'User' },
  { id: '10', name: 'Avery Chen', email: 'avery.chen@gmail.com', role: 'User' },
]

function censorName(name: string) { return name.split(' ').map((p) => p[0] + '*'.repeat(Math.max(p.length - 1, 4))).join(' ') }
function censorEmail(email: string) {
  const [local, domain] = email.split('@')
  const dp = domain.split('.')
  return `${local[0]}${'*'.repeat(Math.max(local.length - 2, 4))}${local[local.length - 1]}@${dp[0][0]}${'***'}${dp[0][dp[0].length - 1]}.${dp.slice(1).join('.')}`
}

export default function AdminCustomersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [ordersModal, setOrdersModal] = useState<string | null>(null)
  const orders = useOrderHistoryStore((s) => s.orders)

  useEffect(() => { useOrderHistoryStore.getState().hydrate() }, [])

  const filtered = mockCustomers.filter((c) => !searchQuery.trim() || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.email.toLowerCase().includes(searchQuery.toLowerCase()))
  const customerOrders = ordersModal ? orders.filter((o) => o.fullName.toLowerCase().includes(mockCustomers.find((c) => c.id === ordersModal)?.name.split(' ')[0].toLowerCase() || '')) : []

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-repixl-text-dark">Account List</h1>
          <p className="mt-0.5 text-sm text-gray-500">{mockCustomers.length} registered customers</p>
        </div>
      </div>

      <div className="mt-5 relative max-w-sm">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
        <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search customers..." className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm text-gray-700 placeholder:text-gray-400 shadow-sm focus:border-repixl-red/30 focus:outline-none" />
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/70">
            <tr>{['Name', 'Email', 'Password', 'Role', 'Actions'].map((h) => <th key={h} className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((c) => (
              <tr key={c.id} className="transition-colors hover:bg-gray-50/60">
                <td className="px-5 py-3.5 font-mono text-sm font-medium text-gray-800">{censorName(c.name)}</td>
                <td className="px-5 py-3.5 font-mono text-sm text-gray-500">{censorEmail(c.email)}</td>
                <td className="px-5 py-3.5 font-mono tracking-widest text-gray-400">••••••••</td>
                <td className="px-5 py-3.5"><span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600">{c.role}</span></td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setOrdersModal(c.id)} className="rounded-lg bg-repixl-red/5 px-2.5 py-1 text-xs font-medium text-repixl-red hover:bg-repixl-red/10">Orders</button>
                    <button className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-500 hover:bg-amber-100">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="5" x="2" y="3" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-gray-400">Showing {filtered.length} of {mockCustomers.length} users</p>

      {ordersModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="font-bold text-repixl-text-dark">Orders for {censorName(mockCustomers.find((c) => c.id === ordersModal)?.name || '')}</h2>
              <button onClick={() => setOrdersModal(null)} className="text-gray-400 hover:text-gray-600"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></button>
            </div>
            <div className="p-6">
              {customerOrders.length === 0 ? <p className="py-8 text-center text-sm text-gray-400">No orders found.</p> : (
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100"><tr>{['ID', 'Total', 'Status', 'Date'].map((h) => <th key={h} className="pb-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {customerOrders.map((o) => <tr key={o.orderNumber} className="hover:bg-gray-50"><td className="py-2 font-mono text-xs font-semibold text-repixl-red">#{o.orderNumber.replace('RPX-', '')}</td><td className="py-2 font-mono text-sm text-gray-800">${o.total}</td><td className="py-2"><span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-600">{o.status}</span></td><td className="py-2 text-xs text-gray-400">{o.date}</td></tr>)}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
