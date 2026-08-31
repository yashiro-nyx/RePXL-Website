'use client'

import { useState, useEffect } from 'react'
import { useOrderHistoryStore } from '@/stores/orderHistoryStore'
import { adminService, type AdminCustomer } from '@/lib/data/adminService'
import { Pagination } from '@/components/ui/Pagination'

const statusStyles: Record<string, string> = {
  Processing: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Shipped: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Delivered: 'bg-green-500/15 text-green-400 border-green-500/30',
  Completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
}

function censorName(name: string) { return name.split(' ').map((p) => p[0] + '*'.repeat(Math.max(p.length - 1, 4))).join(' ') }
function censorEmail(email: string) {
  const [local, domain] = email.split('@')
  const dp = domain.split('.')
  return `${local[0]}${'*'.repeat(Math.max(local.length - 2, 4))}${local[local.length - 1]}@${dp[0][0]}${'***'}${dp[0][dp[0].length - 1]}.${dp.slice(1).join('.')}`
}

export default function AdminCustomersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [ordersModal, setOrdersModal] = useState<string | null>(null)
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const orders = useOrderHistoryStore((s) => s.orders)
  const [customers, setCustomers] = useState<AdminCustomer[]>([])

  useEffect(() => {
    useOrderHistoryStore.getState().hydrate()
    adminService.listCustomers().then(setCustomers)
  }, [])

  const filtered = customers.filter((c) => !searchQuery.trim() || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.email.toLowerCase().includes(searchQuery.toLowerCase()))
  const ITEMS_PER_PAGE = 10
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
  const customerOrders = ordersModal ? orders.filter((o) => o.fullName.toLowerCase().includes(customers.find((c) => c.id === ordersModal)?.name.split(' ')[0].toLowerCase() || '')) : []

  const handleArchive = async (id: string) => {
    await adminService.archiveCustomer(id)
    // Refresh from DB after archiving
    const fresh = await adminService.listCustomers()
    setCustomers(fresh)
    setConfirmArchive(null)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-repixl-text-light">Account List</h1>
          <p className="mt-0.5 text-sm text-repixl-muted">{customers.length} registered customers</p>
        </div>
      </div>

      <div className="mt-5 relative max-w-sm">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="absolute left-3 top-1/2 -translate-y-1/2 text-repixl-muted"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
        <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search customers..." className="w-full rounded-xl border border-repixl-muted/20 bg-repixl-charcoal py-2 pl-10 pr-4 text-sm text-repixl-text-light/80 placeholder:text-repixl-muted shadow-sm focus:border-repixl-red/30 focus:outline-none" />
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-repixl-muted/10 bg-repixl-bg/50">
            <tr>{['Name', 'Email', 'Password', 'Role', 'Actions'].map((h) => <th key={h} className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-repixl-muted">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-repixl-muted/10">
            {filtered.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-repixl-muted">No customers found.</td></tr>}
            {paginated.map((c) => (
              <tr key={c.id} className="transition-colors hover:bg-repixl-bg/60">
                <td className="px-5 py-3.5 font-mono text-sm font-medium text-repixl-text-light">{censorName(c.name)}</td>
                <td className="px-5 py-3.5 font-mono text-sm text-repixl-muted">{censorEmail(c.email)}</td>
                <td className="px-5 py-3.5 font-mono tracking-widest text-repixl-muted">••••••••</td>
                <td className="px-5 py-3.5"><span className="rounded-full bg-repixl-muted/15 px-2.5 py-1 text-[11px] font-medium text-repixl-text-light">{c.role}</span></td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setOrdersModal(c.id)} className="rounded-lg bg-repixl-red/5 px-2.5 py-1 text-xs font-medium text-repixl-red hover:bg-repixl-red/10">Orders</button>
                    <button onClick={() => setConfirmArchive(c.id)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="5" x="2" y="3" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-repixl-muted">Showing {paginated.length} of {customers.length} users</p>
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      {/* Archive confirmation */}
      {confirmArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-80 rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-6 shadow-2xl">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber-500"><rect width="20" height="5" x="2" y="3" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></svg>
            </div>
            <p className="text-center font-semibold text-repixl-text-light">Archive this user?</p>
            <p className="mt-1 text-center text-xs text-repixl-muted">They will be moved to Archived Users and can be restored later.</p>
            <div className="mt-4 flex gap-3">
              <button onClick={() => void handleArchive(confirmArchive)} className="flex-1 rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600">Archive</button>
              <button onClick={() => setConfirmArchive(null)} className="flex-1 rounded-xl border border-repixl-muted/20 px-4 py-2 text-sm text-repixl-muted hover:text-repixl-text-light">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {ordersModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal shadow-2xl">
            <div className="flex items-center justify-between border-b border-repixl-muted/10 px-6 py-4">
              <h2 className="font-bold text-repixl-text-light">Orders for {censorName(customers.find((c) => c.id === ordersModal)?.name || '')}</h2>
              <button onClick={() => setOrdersModal(null)} className="text-repixl-muted hover:text-repixl-text-light/70"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></button>
            </div>
            <div className="p-6">
              {customerOrders.length === 0 ? <p className="py-8 text-center text-sm text-repixl-muted">No orders found.</p> : (
                <table className="w-full text-sm">
                  <thead className="border-b border-repixl-muted/10"><tr>{['ID', 'Total', 'Status', 'Date'].map((h) => <th key={h} className="pb-2 text-left text-[10px] font-semibold uppercase tracking-wider text-repixl-muted">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-repixl-muted/10">
                    {customerOrders.map((o) => <tr key={o.orderNumber} className="hover:bg-repixl-bg"><td className="py-2 font-mono text-xs font-semibold text-repixl-red">#{o.orderNumber.replace('RPX-', '')}</td><td className="py-2 font-mono text-sm text-repixl-text-light">${o.total.toFixed(2)}</td><td className="py-2"><span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusStyles[o.status] || 'text-repixl-muted'}`}>{o.status}</span></td><td className="py-2 text-xs text-repixl-muted">{o.date}</td></tr>)}
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
