'use client'

import { useState, useEffect } from 'react'
import { useOrderHistoryStore } from '@/stores/orderHistoryStore'

const mockCustomers = [
  { id: '1', name: 'Mia Rodriguez', email: 'mia.rodriguez@gmail.com', password: 'SecurePass1!', role: 'User' },
  { id: '2', name: 'Jordan Torres', email: 'jordan.torres@yahoo.com', password: 'JTorres2026!', role: 'User' },
  { id: '3', name: 'Alyssa Kim', email: 'alyssa.kim@outlook.com', password: 'AlyssaK99#', role: 'User' },
  { id: '4', name: 'Sam Davis', email: 'sam.davis@gmail.com', password: 'SamDavis!!1', role: 'User' },
  { id: '5', name: 'Chris Lee', email: 'chris.lee@hotmail.com', password: 'ChrisL33#!', role: 'User' },
  { id: '6', name: 'Taylor Morgan', email: 'taylor.morgan@gmail.com', password: 'TayMorg26!', role: 'User' },
  { id: '7', name: 'Riley Nash', email: 'riley.nash@yahoo.com', password: 'RileyN2026', role: 'User' },
  { id: '8', name: 'Casey Flores', email: 'casey.flores@gmail.com', password: 'CaseyF!23', role: 'User' },
  { id: '9', name: 'Morgan Park', email: 'morgan.park@outlook.com', password: 'MorganP99!', role: 'User' },
  { id: '10', name: 'Avery Chen', email: 'avery.chen@gmail.com', password: 'AveryCh3n!', role: 'User' },
]

function censorName(name: string): string {
  const parts = name.split(' ')
  return parts.map((p) => p[0] + '*'.repeat(Math.max(p.length - 1, 4))).join(' ')
}

function censorEmail(email: string): string {
  const [local, domain] = email.split('@')
  const cl = local[0] + '*'.repeat(Math.max(local.length - 2, 4)) + local[local.length - 1]
  const dp = domain.split('.')
  const cd = dp[0][0] + '***' + dp[0][dp[0].length - 1] + '.' + dp.slice(1).join('.')
  return `${cl}@${cd}`
}

export default function AdminCustomersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [ordersModal, setOrdersModal] = useState<string | null>(null)
  const orders = useOrderHistoryStore((s) => s.orders)

  useEffect(() => { useOrderHistoryStore.getState().hydrate() }, [])

  const filtered = mockCustomers.filter((c) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
  })

  const customerOrders = ordersModal ? orders.filter((o) => o.fullName.toLowerCase().includes(mockCustomers.find((c) => c.id === ordersModal)?.name.split(' ')[0].toLowerCase() || '')) : []

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
        </div>
        <h1 className="text-xl font-semibold text-white">Account List</h1>
      </div>

      <div className="mt-5">
        <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search customers..." className="w-full max-w-sm rounded-lg border border-slate-700/50 bg-slate-800/40 px-3 py-2 text-sm text-slate-300 placeholder:text-slate-600 backdrop-blur-sm focus:border-blue-500 focus:outline-none" />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-700/50 bg-slate-800/60">
            <tr>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Name</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Email</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Password</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Role</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {filtered.map((c) => (
              <tr key={c.id} className="transition-colors hover:bg-slate-700/20">
                <td className="px-4 py-3 font-mono text-sm text-slate-300">{censorName(c.name)}</td>
                <td className="px-4 py-3 font-mono text-sm text-slate-400">{censorEmail(c.email)}</td>
                <td className="px-4 py-3 font-mono text-sm tracking-wider text-slate-500">••••••••</td>
                <td className="px-4 py-3 text-sm text-slate-400">{c.role}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setOrdersModal(c.id)} className="rounded bg-blue-500/10 px-2.5 py-1 text-[11px] font-medium text-blue-400 transition-colors hover:bg-blue-500/20">Orders</button>
                    <button className="flex h-7 w-7 items-center justify-center rounded bg-amber-500/10 text-amber-400 transition-colors hover:bg-amber-500/20" aria-label={`Archive ${c.name}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="5" x="2" y="3" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 font-mono text-[10px] text-slate-600">Showing {filtered.length} of {mockCustomers.length} users</p>

      {/* Orders Modal */}
      {ordersModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-16 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-slate-700/50 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700/50 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Orders for {censorName(mockCustomers.find((c) => c.id === ordersModal)?.name || '')}</h2>
              <button onClick={() => setOrdersModal(null)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>
            <div className="p-6">
              {customerOrders.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-600">No orders found for this customer.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-700/50">
                    <tr>
                      <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-slate-500">ID</th>
                      <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-slate-500">Total</th>
                      <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-slate-500">Status</th>
                      <th className="px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-slate-500">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {customerOrders.map((o) => (
                      <tr key={o.orderNumber} className="hover:bg-slate-800/30">
                        <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-300">#{o.orderNumber.replace('RPX-', '')}</td>
                        <td className="px-3 py-2 font-mono text-sm font-medium text-slate-200">${o.total.toFixed(2)}</td>
                        <td className="px-3 py-2"><span className="rounded bg-slate-700 px-2 py-0.5 text-[10px] font-medium text-slate-300">{o.status}</span></td>
                        <td className="px-3 py-2 font-mono text-[10px] text-slate-500">{o.date}</td>
                      </tr>
                    ))}
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
