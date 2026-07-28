'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { useOrderHistoryStore } from '@/stores/orderHistoryStore'

const navSections = [
  {
    title: 'Main',
    items: [
      { href: '/admin', label: 'Dashboard', icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>) },
      { href: '/admin/cameras', label: 'Cameras', icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>) },
      { href: '/admin/customers', label: 'Customers', icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>) },
      { href: '/admin/orders', label: 'Orders', icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z" /><path d="M15 3v4a2 2 0 0 0 2 2h4" /></svg>) },
      { href: '/admin/vouchers', label: 'Vouchers', icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" /></svg>) },
    ],
  },
  {
    title: 'Archived Data',
    items: [
      { href: '/admin/archived/cameras', label: 'Archived Cameras', icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="5" x="2" y="3" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></svg>) },
      { href: '/admin/archived/customers', label: 'Archived Users', icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="5" x="2" y="3" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></svg>) },
      { href: '/admin/archived/orders', label: 'Archived Orders', icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="5" x="2" y="3" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></svg>) },
    ],
  },
  {
    title: 'System',
    items: [
      { href: '/admin/logs', label: 'Activity Logs', icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>) },
      { href: '/admin/settings', label: 'Settings', icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>) },
    ],
  },
]

const superAdminSection = {
  title: 'Super Admin',
  items: [
    { href: '/admin/accounts', label: 'Admin Management', icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" x2="19" y1="8" y2="14" /><line x1="22" x2="16" y1="11" y2="11" /></svg>) },
  ],
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, role, isSuperAdmin, firstName, lastName, userEmail, hydrate, logout } = useAuthStore()
  const orders = useOrderHistoryStore((s) => s.orders)
  const [hydrated, setHydrated] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    hydrate()
    useOrderHistoryStore.getState().hydrate()
    setHydrated(true)
  }, [hydrate])

  useEffect(() => {
    if (!hydrated) return
    if (pathname === '/admin/login') return
    if (!isLoggedIn || role !== 'admin') router.push('/admin/login')
  }, [hydrated, isLoggedIn, role, router, pathname])

  if (!hydrated) return null
  if (pathname === '/admin/login') return <>{children}</>
  if (!isLoggedIn || role !== 'admin') return null

  const allSections = isSuperAdmin
    ? [...navSections.slice(0, 2), superAdminSection, navSections[2]]
    : navSections
  const pendingOrders = orders.filter((o) => o.status === 'Processing').length
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'A'

  const handleLogout = () => { logout(); router.push('/admin/login') }

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-300">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-slate-800 bg-slate-950">
        {/* Brand */}
        <div className="flex h-14 items-center gap-2 border-b border-slate-800 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
          </div>
          <span className="font-mono text-sm font-bold text-white">RePIXL Admin</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {allSections.map((section) => (
            <div key={section.title} className="mb-5">
              <p className="mb-2 px-3 font-mono text-[9px] uppercase tracking-widest text-slate-600">{section.title}</p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = pathname === item.href
                  return (
                    <li key={item.href}>
                      <Link href={item.href} className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${active ? 'bg-blue-500/15 text-blue-400 shadow-sm shadow-blue-500/10' : 'text-slate-400 hover:bg-slate-800/80 hover:text-white hover:translate-x-0.5'}`}>
                        <span className="transition-transform duration-150 group-hover:scale-110">{item.icon}</span>
                        {item.label}
                        {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400" />}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-slate-800/50">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-xs font-bold text-white shadow-sm shadow-blue-500/20">{initials}</div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-xs font-medium text-slate-200">{firstName} {lastName}</p>
              <p className="truncate font-mono text-[10px] text-slate-500">{isSuperAdmin ? 'Super Admin' : 'Admin'}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] text-slate-500 transition-all hover:bg-red-500/10 hover:text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
            Log Out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="ml-60 flex-1">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-800 bg-slate-900/95 px-6 backdrop-blur-sm">
          <div />
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <div className="relative">
              <button onClick={() => setNotifOpen(!notifOpen)} className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-800 hover:text-white hover:shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
                {pendingOrders > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm shadow-red-500/30">{pendingOrders}</span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-slate-700/50 bg-slate-900/95 p-4 shadow-xl backdrop-blur-md">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-2 text-sm font-semibold text-white"><span>🔔</span> Notifications</p>
                    <button onClick={() => setNotifOpen(false)} className="rounded px-2 py-0.5 text-[10px] text-slate-500 hover:bg-slate-800 hover:text-slate-300">Clear</button>
                  </div>
                  {pendingOrders === 0 ? (
                    <p className="mt-4 text-center text-xs text-slate-600">No new notifications.</p>
                  ) : (
                    <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                      {orders.filter((o) => o.status === 'Processing').slice(0, 5).map((o) => (
                        <div key={o.orderNumber} className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-3 transition-colors hover:bg-slate-800">
                          <p className="text-xs text-slate-300">🛒 New order <span className="font-mono font-semibold text-blue-400">{o.orderNumber}</span></p>
                          <p className="mt-0.5 font-mono text-[10px] text-slate-500">{o.fullName} · ${o.total} · {o.items.length} items</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Back to storefront */}
            <Link href="/" className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-700/50 px-3 text-[11px] text-slate-400 transition-all hover:border-blue-500/30 hover:bg-blue-500/5 hover:text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" x2="21" y1="14" y2="3" /></svg>
              View Store
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
