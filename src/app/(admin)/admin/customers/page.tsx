'use client'

import { useState, useEffect } from 'react'
import { useOrderHistoryStore } from '@/stores/orderHistoryStore'
import { adminService, type AdminCustomer } from '@/lib/data/adminService'
import { Pagination } from '@/components/ui/Pagination'
import { formatPrice } from '@/lib/format'

const statusStyles: Record<string, string> = {
  Processing: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Shipped: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Delivered: 'bg-green-500/15 text-green-400 border-green-500/30',
  Completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
}

function censorName(name: string) {
  return name.split(' ').map((p) => p[0] + '*'.repeat(Math.max(p.length - 1, 4))).join(' ')
}
function censorEmail(email: string) {
  const [local, domain] = email.split('@')
  const dp = domain.split('.')
  return `${local[0]}${'*'.repeat(Math.max(local.length - 2, 4))}${local[local.length - 1]}@${dp[0][0]}${'***'}${dp[0][dp[0].length - 1]}.${dp.slice(1).join('.')}`
}

function getInitials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

// Deterministic avatar color from name string
const AVATAR_COLORS = [
  'bg-blue-500/20 text-blue-400',
  'bg-violet-500/20 text-violet-400',
  'bg-emerald-500/20 text-emerald-400',
  'bg-amber-500/20 text-amber-400',
  'bg-pink-500/20 text-pink-400',
  'bg-cyan-500/20 text-cyan-400',
]
function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
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

  const filtered = customers.filter(
    (c) => !searchQuery.trim() ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const ITEMS_PER_PAGE = 10
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
  const customerOrders = ordersModal
    ? orders.filter((o) => o.fullName.toLowerCase().includes(
        customers.find((c) => c.id === ordersModal)?.name.split(' ')[0].toLowerCase() || ''
      ))
    : []

  const handleArchive = async (id: string) => {
    await adminService.archiveCustomer(id)
    const fresh = await adminService.listCustomers()
    setCustomers(fresh)
    setConfirmArchive(null)
  }

  // Stats
  const totalCustomers = customers.length
  const customersWithOrders = new Set(orders.map((o) => o.userEmail)).size
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">— Customer management</p>
          <h1 className="mt-1 text-2xl font-bold text-repixl-text-light">Account List</h1>
          <p className="mt-0.5 text-sm text-repixl-muted">{customers.length} registered customers</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: 'Total Customers',
            value: totalCustomers,
            icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2',
            iconExtra: <circle cx="9" cy="7" r="4" />,
            color: 'text-blue-400',
            bg: 'bg-blue-400/10',
          },
          {
            label: 'With Orders',
            value: customersWithOrders,
            icon: 'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z',
            color: 'text-emerald-400',
            bg: 'bg-emerald-400/10',
          },
          {
            label: 'Total Orders',
            value: orders.length,
            icon: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2',
            color: 'text-violet-400',
            bg: 'bg-violet-400/10',
          },
          {
            label: 'Total Revenue',
            value: formatPrice(totalRevenue),
            icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
            color: 'text-repixl-warning',
            bg: 'bg-repixl-warning/10',
          },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-repixl-muted/10 bg-repixl-charcoal p-4">
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${stat.bg}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={stat.color} aria-hidden="true">
                <path d={stat.icon} />
                {stat.iconExtra}
              </svg>
            </div>
            <p className="font-display text-2xl font-bold text-repixl-text-light">{stat.value}</p>
            <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-repixl-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-repixl-muted" aria-hidden="true">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
          placeholder="Search by name or email…"
          className="w-full rounded-xl border border-repixl-muted/20 bg-repixl-charcoal py-2.5 pl-10 pr-4 text-sm text-repixl-text-light placeholder:text-repixl-muted/50 shadow-sm focus:border-repixl-red/30 focus:outline-none"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-repixl-muted/15 bg-repixl-charcoal shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-repixl-muted/10 bg-repixl-bg/40">
            <tr>
              {['Customer', 'Email', 'Role', 'Actions'].map((h) => (
                <th key={h} className="px-5 py-3.5 font-mono text-[9px] uppercase tracking-widest text-repixl-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-repixl-muted/8">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-14 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-repixl-muted/30" aria-hidden="true">
                      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                    </svg>
                    <p className="text-sm text-repixl-muted">No customers found.</p>
                  </div>
                </td>
              </tr>
            )}
            {paginated.map((c) => {
              const initials = getInitials(c.name)
              const color = avatarColor(c.name)
              return (
                <tr key={c.id} className="group transition-colors hover:bg-repixl-bg/40">
                  {/* Customer (avatar + censored name) */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${color}`}>
                        {initials}
                      </div>
                      <span className="font-mono text-sm font-medium text-repixl-text-light">{censorName(c.name)}</span>
                    </div>
                  </td>
                  {/* Email */}
                  <td className="px-5 py-3.5 font-mono text-sm text-repixl-muted">{censorEmail(c.email)}</td>
                  {/* Role */}
                  <td className="px-5 py-3.5">
                    <span className="rounded-full bg-repixl-muted/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-repixl-text-light/70">
                      {c.role}
                    </span>
                  </td>
                  {/* Actions */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setOrdersModal(c.id)}
                        className="rounded-lg border border-repixl-red/20 bg-repixl-red/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-repixl-red transition-colors hover:bg-repixl-red/10"
                      >
                        Orders
                      </button>
                      <button
                        onClick={() => setConfirmArchive(c.id)}
                        aria-label="Archive customer"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/8 text-amber-500 transition-colors hover:bg-amber-500/20"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <rect width="20" height="5" x="2" y="3" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-repixl-muted">Showing {paginated.length} of {filtered.length} customers</p>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>

      {/* Archive confirmation */}
      {confirmArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-80 rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-6 shadow-2xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber-500" aria-hidden="true">
                <rect width="20" height="5" x="2" y="3" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" />
              </svg>
            </div>
            <p className="text-center font-semibold text-repixl-text-light">Archive this customer?</p>
            <p className="mt-1 text-center text-xs text-repixl-muted">They will be moved to Archived Users and can be restored later.</p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setConfirmArchive(null)} className="flex-1 rounded-xl border border-repixl-muted/20 px-4 py-2.5 text-sm text-repixl-muted transition-colors hover:text-repixl-text-light">Cancel</button>
              <button onClick={() => void handleArchive(confirmArchive)} className="flex-1 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-600">Archive</button>
            </div>
          </div>
        </div>
      )}

      {/* Orders modal */}
      {ordersModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-20 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal shadow-2xl">
            <div className="flex items-center justify-between border-b border-repixl-muted/10 px-6 py-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">Order history</p>
                <h2 className="mt-0.5 font-bold text-repixl-text-light">
                  {censorName(customers.find((c) => c.id === ordersModal)?.name || '')}
                </h2>
              </div>
              <button onClick={() => setOrdersModal(null)} className="flex h-8 w-8 items-center justify-center rounded-full text-repixl-muted transition-colors hover:bg-repixl-bg hover:text-repixl-text-light" aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>
            <div className="p-6">
              {customerOrders.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <p className="text-sm text-repixl-muted">No orders found for this customer.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b border-repixl-muted/10">
                    <tr>
                      {['Order ID', 'Total', 'Status', 'Date'].map((h) => (
                        <th key={h} className="pb-2.5 text-left font-mono text-[9px] uppercase tracking-wider text-repixl-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-repixl-muted/8">
                    {customerOrders.map((o) => (
                      <tr key={o.orderNumber} className="transition-colors hover:bg-repixl-bg/40">
                        <td className="py-2.5 font-mono text-xs font-semibold text-repixl-red">#{o.orderNumber.replace('RPXL-', '').slice(0, 12)}</td>
                        <td className="py-2.5 font-mono text-sm font-semibold text-repixl-text-light">{formatPrice(o.total)}</td>
                        <td className="py-2.5">
                          <span className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${statusStyles[o.status] || 'text-repixl-muted'}`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="py-2.5 font-mono text-xs text-repixl-muted">{o.date}</td>
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
