'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { Footer } from '@/components/layout/Footer'
import { Button, ConditionBadge, CornerBracket, FilmStripLoader, PasswordInput } from '@/components/ui'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { emptyPHAddress, type PHAddressValue } from '@/components/ui/PHAddressSelect'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/stores/toastStore'
import { useAddressStore, type Address } from '@/stores/addressStore'
import { usePaymentStore, detectBrand, type SavedCard } from '@/stores/paymentStore'
import { useOrderHistoryStore, type Order } from '@/stores/orderHistoryStore'
import { useReviewStore, type Review } from '@/stores/reviewStore'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useCartStore } from '@/stores/cartStore'
import { useProductStore } from '@/stores/productStore'
import { useRevealAnimation } from '@/hooks/useRevealAnimation'
import { useFilteredInput, nameChars, digitsOnly } from '@/hooks/useFilteredInput'
import { validatePHPhone } from '@/components/ui/PhoneInput'
import { CardNumberInput } from '@/components/ui/CardNumberInput'
import { CardExpiryInput } from '@/components/ui/CardExpiryInput'
import { products as allProducts } from '@/data/products'

// Lazy-load the PH address component so the ~840KB address dataset only
// loads when the Addresses tab is opened, not on every account page visit.
const PHAddressSelect = dynamic(
  () => import('@/components/ui/PHAddressSelect').then((m) => ({ default: m.PHAddressSelect })),
  { ssr: false, loading: () => <div className="h-28 animate-pulse rounded-xl bg-repixl-charcoal/40" /> }
)

type Tab = 'dashboard' | 'profile' | 'orders' | 'addresses' | 'payments' | 'reviews' | 'security'

const tabs: { id: Tab; label: string; iconPath: string; extra?: string }[] = [
  { id: 'dashboard', label: 'Dashboard', iconPath: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
  { id: 'profile', label: 'Profile', iconPath: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2', extra: 'circle' },
  { id: 'orders', label: 'Orders', iconPath: 'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z' },
  { id: 'addresses', label: 'Addresses', iconPath: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z', extra: 'dot' },
  { id: 'payments', label: 'Payments', iconPath: 'M2 5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5z' },
  { id: 'reviews', label: 'Reviews', iconPath: 'M12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' },
  { id: 'security', label: 'Security', iconPath: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10' },
]

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const { isLoggedIn, firstName, lastName, userEmail, hydrate, logout } = useAuthStore()
  const router = useRouter()
  const [hydrated, setHydrated] = useState(false)
  const [logoutModalOpen, setLogoutModalOpen] = useState(false)
  const { fadeUp, reducedMotion } = useRevealAnimation()

  useEffect(() => {
    const init = async () => {
      await hydrate()
      useAddressStore.getState().hydrate()
      usePaymentStore.getState().hydrate()
      useOrderHistoryStore.getState().hydrate()
      useReviewStore.getState().hydrate()
      useWishlistStore.getState().hydrate()
      useCartStore.getState().hydrate()
      setHydrated(true)
    }
    void init()
  }, [hydrate])

  useEffect(() => {
    if (!hydrated) return
    if (!isLoggedIn) router.push('/login')
  }, [hydrated, isLoggedIn, router])

  if (!hydrated || !isLoggedIn) return (
    <div className="flex min-h-screen items-center justify-center bg-repixl-bg">
      <FilmStripLoader label="Loading your account…" className="mx-auto max-w-md px-6" />
    </div>
  )

  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?'

  const handleLogout = () => {
    logout()
    signOut({ redirect: false }).catch(() => { /* non-critical */ })
    useToastStore.getState().addToast('You\'ve been logged out. See you next time!', 'info')
    router.push('/')
  }

  return (
    <div className="burn-subtle min-h-screen pb-20 pt-24">
      <Container>
        {/* ── Page header ── */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="mb-8"
        >
          <span className="font-mono text-xs uppercase tracking-widest text-repixl-muted">— Your account</span>
          <h1 className="mt-2 font-display text-display-md text-repixl-text-light">
            Welcome back, {firstName}.
          </h1>
        </motion.div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* ── Sidebar ── */}
          <motion.aside
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: reducedMotion ? 0 : 0.1 }}
            className="w-full shrink-0 lg:w-60"
          >
            <div className="sticky top-24 overflow-hidden rounded-xl border border-repixl-muted/10 bg-repixl-charcoal">
              {/* Profile header */}
              <div className="relative overflow-hidden px-5 py-6">
                {/* Subtle red accent bg */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-repixl-red/5 to-transparent" />
                <div className="relative flex flex-col items-center text-center">
                  <div className="relative">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-repixl-red/15 ring-2 ring-repixl-red/20">
                      <span className="font-display text-xl font-bold text-repixl-red">{initials}</span>
                    </div>
                    <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-repixl-success ring-2 ring-repixl-charcoal" title="Active" />
                  </div>
                  <p className="mt-3 font-display text-sm font-semibold text-repixl-text-light">
                    {firstName} {lastName}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-repixl-muted">{userEmail}</p>
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-repixl-success/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-repixl-success">
                    Verified Collector
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className="mx-5 h-px bg-repixl-muted/10" />

              {/* Nav */}
              <nav className="p-3" aria-label="Account navigation">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all ${
                      activeTab === tab.id
                        ? 'bg-repixl-red/10 font-medium text-repixl-red'
                        : 'text-repixl-text-light/65 hover:bg-repixl-bg/60 hover:text-repixl-text-light'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={tab.iconPath} />
                      {tab.extra === 'circle' && <circle cx="12" cy="7" r="4" />}
                      {tab.extra === 'dot' && <circle cx="12" cy="10" r="3" />}
                    </svg>
                    {tab.label}
                  </button>
                ))}

                {/* Logout */}
                <button
                  type="button"
                  onClick={() => setLogoutModalOpen(true)}
                  className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-repixl-muted/70 transition-all hover:bg-repixl-bg/60 hover:text-repixl-red"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" />
                  </svg>
                  Log Out
                </button>
              </nav>
            </div>
          </motion.aside>

          {/* ── Main content ── */}
          <motion.main
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: reducedMotion ? 0 : 0.15 }}
            className="min-w-0 flex-1"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -5 }}
                transition={{ duration: reducedMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                {activeTab === 'dashboard' && <DashboardTab onNavigate={setActiveTab} />}
                {activeTab === 'profile' && <ProfileTab />}
                {activeTab === 'orders' && <OrdersTab />}
                {activeTab === 'addresses' && <AddressesTab />}
                {activeTab === 'payments' && <PaymentsTab />}
                {activeTab === 'reviews' && <ReviewsTab />}
                {activeTab === 'security' && <SecurityTab />}
              </motion.div>
            </AnimatePresence>
          </motion.main>
        </div>
      </Container>

      {/* Logout modal */}
      {logoutModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm rounded-xl border border-repixl-muted/20 bg-repixl-charcoal p-6 shadow-2xl"
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-repixl-red/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-red" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" />
              </svg>
            </div>
            <h3 className="text-center font-display text-lg font-semibold text-repixl-text-light">Log Out?</h3>
            <p className="mt-1.5 text-center text-sm text-repixl-muted">You'll need to sign in again to access your account.</p>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setLogoutModalOpen(false)} className="flex-1 rounded-lg border border-repixl-muted/20 px-4 py-2.5 text-sm text-repixl-text-light/70 transition-colors hover:bg-repixl-bg hover:text-repixl-text-light">Cancel</button>
              <button type="button" onClick={handleLogout} className="flex-1 rounded-lg bg-repixl-red px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700">Log Out</button>
            </div>
          </motion.div>
        </div>
      )}
      <Footer />
    </div>
  )
}

// ─── Dashboard Tab ───────────────────────────────────────────────────────────
function DashboardTab({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const { firstName, lastName, userEmail } = useAuthStore()
  const allOrders = useOrderHistoryStore((s) => s.orders)
  const orders = allOrders.filter((o) => o.userEmail === userEmail)
  const wishlistSlugs = useWishlistStore((s) => s.slugs)
  const cartItems = useCartStore((s) => s.items)
  const allProductsStore = useProductStore((s) => s.products)

  const activeOrders = orders.filter((o) => o.status === 'Processing' || o.status === 'Shipped')
  const recentOrders = orders.slice(0, 3)

  const statusColor: Record<string, string> = {
    Processing: 'bg-repixl-warning/15 text-repixl-warning',
    Shipped: 'bg-blue-400/15 text-blue-400',
    Delivered: 'bg-repixl-success/15 text-repixl-success',
    Completed: 'bg-repixl-success/15 text-repixl-success',
    Cancelled: 'bg-repixl-red/15 text-repixl-red',
  }

  const stats: { label: string; value: number; icon: string; color: string; bg: string; tab: Tab | null; href?: string; extra?: string }[] = [
    { label: 'Total Orders', value: orders.length, icon: 'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z', color: 'text-blue-400', bg: 'bg-blue-400/10', tab: 'orders' as Tab },
    { label: 'Active Orders', value: activeOrders.length, icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z', color: 'text-repixl-warning', bg: 'bg-repixl-warning/10', tab: 'orders' as Tab },
    { label: 'Wishlist', value: wishlistSlugs.length, icon: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z', color: 'text-repixl-red', bg: 'bg-repixl-red/10', tab: null, href: '/wishlist' },
    { label: 'Cart Items', value: cartItems.reduce((s, i) => s + i.quantity, 0), icon: 'M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12', color: 'text-repixl-success', bg: 'bg-repixl-success/10', tab: null, href: '/cart' },
  ]

  const quickActions = [
    { label: 'Browse Cameras', icon: 'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z', href: '/products', extra: 'circle-3' },
    { label: 'My Wishlist', icon: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z', href: '/wishlist' },
    { label: 'View Cart', icon: 'M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12', href: '/cart', extra: 'circles' },
    { label: 'Compare Cameras', icon: 'M3 3h18M3 9h18M3 15h18M3 21h18', href: '/compare' },
  ]

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => {
          const inner = (
            <div className={`rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-4 transition-all hover:border-repixl-muted/25 hover:bg-repixl-charcoal/80`}>
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${stat.bg}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={stat.color} aria-hidden="true">
                  <path d={stat.icon} />
                  {stat.extra === 'circle-3' && <circle cx="12" cy="13" r="3" />}
                  {stat.extra === 'circles' && <><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /></>}
                </svg>
              </div>
              <p className="font-display text-2xl font-bold text-repixl-text-light">{stat.value}</p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-repixl-muted">{stat.label}</p>
            </div>
          )
          if (stat.href) {
            return <Link key={stat.label} href={stat.href}>{inner}</Link>
          }
          return (
            <button key={stat.label} type="button" onClick={() => stat.tab && onNavigate(stat.tab)} className="text-left">
              {inner}
            </button>
          )
        })}
      </div>

      {/* Recent Orders */}
      <div className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">— Recent activity</span>
            <h2 className="mt-1 font-display text-base font-semibold text-repixl-text-light">Order History</h2>
          </div>
          <button type="button" onClick={() => onNavigate('orders')} className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted transition-colors hover:text-repixl-text-light">
            View all →
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-repixl-muted/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-repixl-muted/50" aria-hidden="true">
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              </svg>
            </div>
            <p className="text-sm text-repixl-text-light/60">No orders yet</p>
            <Link href="/products" className="mt-3 font-mono text-[10px] uppercase tracking-wider text-repixl-red hover:underline">Browse cameras →</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentOrders.map((order) => {
              const first = order.items[0]
              const extra = order.items.length - 1
              return (
              <div key={order.orderNumber} className="flex items-center justify-between rounded-lg border border-repixl-muted/8 bg-repixl-bg/50 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-repixl-text-light">
                    {first?.name ?? 'Order'}
                    {extra > 0 && <span className="text-repixl-muted"> +{extra}</span>}
                  </p>
                  <p className="font-mono text-[10px] text-repixl-muted">#{order.orderNumber} · {order.date}</p>
                </div>
                <div className="ml-3 flex items-center gap-3">
                  <span className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${statusColor[order.status] ?? 'bg-repixl-muted/15 text-repixl-muted'}`}>
                    {order.status}
                  </span>
                  <span className="font-display text-sm font-semibold text-repixl-text-light">${order.total}</span>
                </div>
              </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-5">
        <div className="mb-4">
          <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">— Quick access</span>
          <h2 className="mt-1 font-display text-base font-semibold text-repixl-text-light">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex flex-col items-center gap-2 rounded-lg border border-repixl-muted/10 bg-repixl-bg/50 px-3 py-4 text-center transition-all hover:border-repixl-muted/25 hover:bg-repixl-bg"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-repixl-muted/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-text-light/70" aria-hidden="true">
                  <path d={action.icon} />
                  {action.extra === 'circle-3' && <circle cx="12" cy="13" r="3" />}
                  {action.extra === 'circles' && <><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /></>}
                </svg>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-repixl-text-light/70">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Account overview */}
      <div className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-5">
        <div className="mb-4">
          <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">— Account</span>
          <h2 className="mt-1 font-display text-base font-semibold text-repixl-text-light">Your Profile</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-repixl-bg/50 px-4 py-3">
            <p className="font-mono text-[9px] uppercase tracking-wider text-repixl-muted">Name</p>
            <p className="mt-1 text-sm font-medium text-repixl-text-light">{firstName} {lastName}</p>
          </div>
          <div className="rounded-lg bg-repixl-bg/50 px-4 py-3">
            <p className="font-mono text-[9px] uppercase tracking-wider text-repixl-muted">Email</p>
            <p className="mt-1 truncate text-sm font-medium text-repixl-text-light">{userEmail}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('profile')}
          className="mt-3 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-repixl-muted transition-colors hover:text-repixl-text-light"
        >
          Edit profile
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  )
}

// ─── Profile Tab ─────────────────────────────────────────────────────────────
function ProfileTab() {
  const { firstName, lastName, userEmail, userPhone, updateProfile } = useAuthStore()
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [origBirthDate, setOrigBirthDate] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const nameFilter = useFilteredInput(nameChars)

  useEffect(() => {
    setFirst(firstName); setLast(lastName); setEmail(userEmail); setPhone(userPhone)
    if (userEmail) {
      try {
        const stored = localStorage.getItem(`repixl-birthdate-${userEmail}`) ?? ''
        setBirthDate(stored); setOrigBirthDate(stored)
      } catch { setBirthDate(''); setOrigBirthDate('') }
    }
  }, [firstName, lastName, userEmail, userPhone])

  const hasChanges = first !== firstName || last !== lastName || email !== userEmail || phone !== userPhone || birthDate !== origBirthDate

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!first.trim()) errs.first = 'First name is required.'
    if (!last.trim()) errs.last = 'Last name is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email address.'
    if (phone.trim() && !validatePHPhone(phone.replace(/\D/g, ''))) {
      errs.phone = 'Enter a valid PH mobile number (09XXXXXXXXX).'
    }
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    updateProfile(first.trim(), last.trim(), email.trim(), phone.trim())
    if (email.trim()) {
      try {
        if (birthDate) localStorage.setItem(`repixl-birthdate-${email.trim()}`, birthDate)
        else localStorage.removeItem(`repixl-birthdate-${email.trim()}`)
      } catch { /* ignore */ }
    }
    setOrigBirthDate(birthDate)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-6">
      <div className="mb-5">
        <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">— Edit your info</span>
        <h2 className="mt-1 font-display text-lg font-semibold text-repixl-text-light">Profile Information</h2>
      </div>
      <form onSubmit={handleSave} noValidate className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="p-first" className="mb-1.5 block text-xs text-repixl-text-light/70">First Name</label>
            <input id="p-first" type="text" value={first} onChange={(e) => setFirst(e.target.value)} className={inputClass(errors.first)} {...nameFilter} />
            {errors.first && <p className="mt-1 text-xs text-red-400">{errors.first}</p>}
          </div>
          <div>
            <label htmlFor="p-last" className="mb-1.5 block text-xs text-repixl-text-light/70">Last Name</label>
            <input id="p-last" type="text" value={last} onChange={(e) => setLast(e.target.value)} className={inputClass(errors.last)} {...nameFilter} />
            {errors.last && <p className="mt-1 text-xs text-red-400">{errors.last}</p>}
          </div>
        </div>
        <div>
          <label htmlFor="p-email" className="mb-1.5 block text-xs text-repixl-text-light/70">Email Address</label>
          <input id="p-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass(errors.email)} />
          {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
        </div>
        <div>
          <label htmlFor="p-phone" className="mb-1.5 block text-xs text-repixl-text-light/70">Phone Number</label>
          <PhoneInput
            id="p-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={errors.phone}
            autoComplete="tel"
          />
        </div>
        <div>
          <label htmlFor="p-birth" className="mb-1.5 block text-xs text-repixl-text-light/70">Birth Date</label>
          <input id="p-birth" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={`${inputClass()} [color-scheme:dark]`} />
        </div>
        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" variant="primary" size="md" disabled={!hasChanges} className={!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}>
            Save Changes
          </Button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-repixl-success" role="status">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
              Saved
            </span>
          )}
        </div>
      </form>
    </div>
  )
}

// ─── Orders Tab ──────────────────────────────────────────────────────────────
function OrdersTab() {
  const allOrders = useOrderHistoryStore((s) => s.orders)
  const userEmail = useAuthStore((s) => s.userEmail)
  const orders = allOrders.filter((o) => o.userEmail === userEmail)

  const statusColor: Record<string, string> = {
    Processing: 'bg-repixl-warning/15 text-repixl-warning',
    Shipped: 'bg-blue-400/15 text-blue-400',
    Delivered: 'bg-repixl-success/15 text-repixl-success',
    Completed: 'bg-repixl-success/15 text-repixl-success',
    Cancelled: 'bg-repixl-red/15 text-repixl-red',
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-repixl-muted/10">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-repixl-muted/50" aria-hidden="true">
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          </svg>
        </div>
        <p className="font-display text-lg font-semibold text-repixl-text-light">No orders yet</p>
        <p className="mt-1 text-sm text-repixl-muted">Your order history will appear here.</p>
        <Link href="/products" className="mt-5 inline-block"><Button variant="primary" size="sm">Browse Cameras</Button></Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="mb-1">
        <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">— {orders.length} {orders.length === 1 ? 'order' : 'orders'}</span>
        <h2 className="mt-1 font-display text-lg font-semibold text-repixl-text-light">Order History</h2>
      </div>
      {orders.map((order) => {
        const firstItem = order.items[0]
        const extraCount = order.items.length - 1
        return (
        <div key={order.orderNumber} className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              {/* Item name — primary */}
              <p className="text-sm font-semibold text-repixl-text-light">
                {firstItem?.name ?? 'Order'}
                {extraCount > 0 && <span className="text-repixl-muted"> +{extraCount} more</span>}
              </p>
              {/* Order number — secondary */}
              <p className="mt-0.5 font-mono text-[10px] text-repixl-muted">#{order.orderNumber} · {order.date}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider ${statusColor[order.status] ?? 'bg-repixl-muted/15 text-repixl-muted'}`}>
                {order.status}
              </span>
              <span className="font-display text-lg font-bold text-repixl-text-light">${order.total}</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-repixl-muted/10 pt-3">
            <p className="text-xs text-repixl-muted">{order.courierName} · {order.courierEstimate}</p>
            <Link
              href={`/account/orders/${order.orderNumber}`}
              className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted transition-colors hover:text-repixl-text-light"
            >
              View Details →
            </Link>
          </div>
        </div>
        )
      })}
    </div>
  )
}

// ─── Addresses Tab ───────────────────────────────────────────────────────────
function AddressesTab() {
  const addresses = useAddressStore((s) => s.addresses)
  const addAddress = useAddressStore((s) => s.addAddress)
  const updateAddress = useAddressStore((s) => s.updateAddress)
  const removeAddress = useAddressStore((s) => s.removeAddress)
  const setDefault = useAddressStore((s) => s.setDefault)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleSave = async (data: Omit<Address, 'id'>) => {
    setSaveError(null)
    try {
      if (editingId) {
        await updateAddress(editingId, data)
      } else {
        await addAddress(data)
      }
      setFormOpen(false)
      setEditingId(null)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save address. Please try again.')
    }
  }

  const editingAddress = editingId ? addresses.find((a) => a.id === editingId) : undefined

  return (
    <div className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">— Delivery</span>
          <h2 className="mt-1 font-display text-lg font-semibold text-repixl-text-light">Saved Addresses</h2>
        </div>
        {!formOpen && <Button variant="secondary" size="sm" onClick={() => { setEditingId(null); setFormOpen(true) }}>+ Add Address</Button>}
      </div>
      {addresses.length === 0 && !formOpen && (
        <div className="flex flex-col items-center py-8 text-center">
          <p className="text-sm text-repixl-muted">No saved addresses yet.</p>
        </div>
      )}
      {addresses.length > 0 && !formOpen && (
        <ul className="space-y-3">
          {addresses.map((addr) => (
            <li key={addr.id} className="rounded-lg border border-repixl-muted/10 bg-repixl-bg p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-repixl-text-light">{addr.fullName}</p>
                    {addr.isDefault && <span className="rounded-full bg-repixl-success/15 px-2 py-0.5 font-mono text-[9px] uppercase text-repixl-success">Default</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-repixl-text-light/60">{addr.address}, {addr.barangay}, {addr.city} {addr.postalCode}</p>
                  {addr.phone && <p className="font-mono text-[10px] text-repixl-muted">{addr.phone}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  {!addr.isDefault && <button type="button" onClick={() => setDefault(addr.id)} className="font-mono text-[9px] uppercase tracking-wider text-repixl-muted hover:text-repixl-text-light">Default</button>}
                  <button type="button" onClick={() => { setEditingId(addr.id); setFormOpen(true) }} className="font-mono text-[9px] uppercase tracking-wider text-repixl-muted hover:text-repixl-text-light">Edit</button>
                  <button type="button" onClick={() => removeAddress(addr.id)} className="font-mono text-[9px] uppercase tracking-wider text-repixl-muted hover:text-repixl-red">Delete</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {formOpen && (
        <AddressForm
          initial={editingAddress}
          onSave={handleSave}
          onCancel={() => { setFormOpen(false); setEditingId(null) }}
          serverError={saveError}
        />
      )}
    </div>
  )
}

function AddressForm({
  initial,
  onSave,
  onCancel,
  serverError,
}: {
  initial?: Address
  onSave: (d: Omit<Address, 'id'>) => Promise<void>
  onCancel: () => void
  serverError?: string | null
}) {
  const [fullName, setFullName] = useState(initial?.fullName ?? '')
  const [streetAddress, setStreetAddress] = useState(initial?.address ?? '')
  const [postalCode, setPostalCode] = useState(initial?.postalCode ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const nameFilter = useFilteredInput(nameChars)
  const postalFilter = useFilteredInput(digitsOnly)

  // PHAddressSelect state
  const [phAddr, setPhAddr] = useState<PHAddressValue>({
    ...emptyPHAddress,
    // Pre-fill names from existing address (codes will be empty — user must re-select)
    region: '', province: initial?.province ?? '', city: initial?.city ?? '', barangay: initial?.barangay ?? '',
    regionCode: '', provinceCode: '', cityCode: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!fullName.trim()) errs.fullName = 'Required.'
    if (!streetAddress.trim()) errs.address = 'Required.'
    // Phone is required by the server schema — enforce on client too
    if (!phone.trim()) {
      errs.phone = 'Phone number is required.'
    } else if (!validatePHPhone(phone.replace(/\D/g, ''))) {
      errs.phone = 'Enter a valid PH mobile number (09XXXXXXXXX).'
    }
    if (!phAddr.city) errs.city = 'Required.'
    if (!phAddr.province) errs.province = 'Required.'
    if (!phAddr.barangay) errs.barangay = 'Required.'
    if (!/^\d{4,6}$/.test(postalCode.replace(/\s/g, ''))) errs.postalCode = '4–6 digits required.'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSaving(true)
    try {
      await onSave({
        fullName: fullName.trim(),
        address: streetAddress.trim(),
        barangay: phAddr.barangay,
        city: phAddr.city,
        province: phAddr.province,
        postalCode: postalCode.trim(),
        phone: phone.trim(),
        isDefault,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} noValidate className="mt-5 space-y-3 rounded-lg border border-repixl-muted/10 bg-repixl-bg p-4">
      <div>
        <label htmlFor="a-name" className="mb-1 block text-xs text-repixl-text-light/70">Full Name</label>
        <input id="a-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass(errors.fullName)} {...nameFilter} />
        {errors.fullName && <p className="mt-1 text-xs text-red-400">{errors.fullName}</p>}
      </div>
      <div>
        <label htmlFor="a-phone2" className="mb-1 block text-xs text-repixl-text-light/70">Phone Number</label>
        <PhoneInput
          id="a-phone2"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.phone}
          className="rounded-lg"
        />
      </div>
      <div>
        <label htmlFor="a-street" className="mb-1 block text-xs text-repixl-text-light/70">Street Address / House No.</label>
        <input id="a-street" type="text" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} className={inputClass(errors.address)} />
        {errors.address && <p className="mt-1 text-xs text-red-400">{errors.address}</p>}
      </div>

      {/* Cascading PH address dropdowns */}
      <PHAddressSelect
        value={phAddr}
        onChange={setPhAddr}
        errors={{
          province: errors.province,
          city: errors.city,
          barangay: errors.barangay,
        }}
      />

      <div>
        <label htmlFor="a-zip" className="mb-1 block text-xs text-repixl-text-light/70">Postal Code</label>
        <input
          id="a-zip"
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          className={inputClass(errors.postalCode)}
          {...postalFilter}
        />
        {errors.postalCode && <p className="mt-1 text-xs text-red-400">{errors.postalCode}</p>}
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="h-3.5 w-3.5 rounded border-repixl-muted/30 bg-repixl-charcoal text-repixl-red" />
        <span className="text-xs text-repixl-text-light/70">Set as default</span>
      </label>

      {/* Server-side error (e.g. validation rejection, network error) */}
      {serverError && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400" role="alert">
          {serverError}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="primary" size="sm" disabled={saving}>
          {saving ? 'Saving…' : initial ? 'Update Address' : 'Save Address'}
        </Button>
        <button type="button" onClick={onCancel} disabled={saving} className="text-xs text-repixl-muted hover:text-repixl-text-light disabled:opacity-50">Cancel</button>
      </div>
    </form>
  )
}

// ─── Payments Tab ────────────────────────────────────────────────────────────
function PaymentsTab() {
  const cards = usePaymentStore((s) => s.cards)
  const addCard = usePaymentStore((s) => s.addCard)
  const removeCard = usePaymentStore((s) => s.removeCard)
  const setDefault = usePaymentStore((s) => s.setDefault)
  const [formOpen, setFormOpen] = useState(false)

  return (
    <div className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">— Payment</span>
          <h2 className="mt-1 font-display text-lg font-semibold text-repixl-text-light">Payment Methods</h2>
        </div>
        {!formOpen && <Button variant="secondary" size="sm" onClick={() => setFormOpen(true)}>+ Add Card</Button>}
      </div>
      {cards.length === 0 && !formOpen && (
        <div className="flex flex-col items-center py-8 text-center">
          <p className="text-sm text-repixl-muted">No saved payment methods yet.</p>
        </div>
      )}
      {cards.length > 0 && !formOpen && (
        <ul className="space-y-3">
          {cards.map((card) => (
            <li key={card.id} className="flex items-center justify-between rounded-lg border border-repixl-muted/10 bg-repixl-bg p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-14 items-center justify-center rounded-lg border border-repixl-muted/20 bg-repixl-charcoal">
                  <span className="font-mono text-[9px] font-bold text-repixl-text-light/70">{card.brand}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm text-repixl-text-light">•••• {card.last4}</p>
                    {card.isDefault && <span className="rounded-full bg-repixl-success/15 px-2 py-0.5 font-mono text-[9px] uppercase text-repixl-success">Default</span>}
                  </div>
                  <p className="text-xs text-repixl-muted">{card.cardholderName} · {card.expiry}</p>
                </div>
              </div>
              <div className="flex gap-3">
                {!card.isDefault && <button type="button" onClick={() => setDefault(card.id)} className="font-mono text-[9px] uppercase tracking-wider text-repixl-muted hover:text-repixl-text-light">Default</button>}
                <button type="button" onClick={() => removeCard(card.id)} aria-label={`Remove card ending in ${card.last4}`} className="font-mono text-[9px] uppercase tracking-wider text-repixl-muted hover:text-repixl-red">Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {formOpen && <CardForm onSave={(d) => { addCard(d); setFormOpen(false) }} onCancel={() => setFormOpen(false)} />}
    </div>
  )
}

function CardForm({ onSave, onCancel }: { onSave: (d: Omit<SavedCard, 'id'>) => void; onCancel: () => void }) {
  // cardNumber holds RAW digits only (no spaces) — matches CardNumberInput contract
  const [cardNumber, setCardNumber] = useState('')
  // expiry holds the formatted display string e.g. "12/28" — matches CardExpiryInput contract
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [name, setName] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const nameFilter = useFilteredInput(nameChars)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}

    // Validate card number (raw digits from CardNumberInput)
    if (!/^\d{16}$/.test(cardNumber)) errs.cardNumber = '16 digits required.'

    // Validate expiry (formatted MM/YY from CardExpiryInput)
    const m = expiry.trim().match(/^(\d{2})\/(\d{2})$/)
    if (!m) {
      errs.expiry = 'MM/YY format required.'
    } else {
      const mo = parseInt(m[1], 10)
      const yr = parseInt(m[2], 10) + 2000
      if (mo < 1 || mo > 12 || new Date(yr, mo) <= new Date()) {
        errs.expiry = 'Invalid or expired date.'
      }
    }

    // Validate CVC — 3 or 4 digits
    if (!/^\d{3,4}$/.test(cvc.trim())) errs.cvc = '3 or 4-digit CVC required.'

    if (!name.trim()) errs.name = 'Cardholder name is required.'

    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    // Only store safe metadata — never the full card number or CVC
    onSave({
      last4: cardNumber.slice(-4),
      brand: detectBrand(cardNumber[0]),
      expiry: expiry.trim(),
      cardholderName: name.trim(),
      isDefault,
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-3 rounded-lg border border-repixl-muted/10 bg-repixl-bg p-4">
      {/* Card number — uses CardNumberInput for formatting + digit-only restriction */}
      <div>
        <label htmlFor="c-num" className="mb-1 block text-xs text-repixl-text-light/70">Card Number</label>
        <CardNumberInput
          id="c-num"
          value={cardNumber}
          onChange={setCardNumber}
          error={errors.cardNumber}
          className={`font-mono ${inputClass(errors.cardNumber)}`}
          autoComplete="cc-number"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Expiry — uses CardExpiryInput for MM/YY formatting */}
        <div>
          <label htmlFor="c-exp" className="mb-1 block text-xs text-repixl-text-light/70">Expiry (MM/YY)</label>
          <CardExpiryInput
            id="c-exp"
            value={expiry}
            onChange={setExpiry}
            error={errors.expiry}
            className={`font-mono ${inputClass(errors.expiry)}`}
            autoComplete="cc-exp"
          />
        </div>

        {/* CVC — digits-only, max 4, never stored */}
        <div>
          <label htmlFor="c-cvc" className="mb-1 block text-xs text-repixl-text-light/70">CVC</label>
          <input
            id="c-cvc"
            type="text"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
            maxLength={4}
            value={cvc}
            onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className={`font-mono ${inputClass(errors.cvc)}`}
          />
          {errors.cvc && <p className="mt-1 text-xs text-red-400">{errors.cvc}</p>}
        </div>
      </div>

      {/* Cardholder name */}
      <div>
        <label htmlFor="c-name" className="mb-1 block text-xs text-repixl-text-light/70">Name on Card</label>
        <input
          id="c-name"
          type="text"
          autoComplete="cc-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass(errors.name)}
          {...nameFilter}
        />
        {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="h-3.5 w-3.5 rounded border-repixl-muted/30 bg-repixl-charcoal text-repixl-red" />
        <span className="text-xs text-repixl-text-light/70">Set as default payment method</span>
      </label>

      <p className="font-mono text-[9px] uppercase tracking-wider text-repixl-muted/50">
        Card details are not stored — only the last 4 digits and expiry are saved for display.
      </p>

      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="primary" size="sm">Save Card</Button>
        <button type="button" onClick={onCancel} className="text-xs text-repixl-muted hover:text-repixl-text-light">Cancel</button>
      </div>
    </form>
  )
}

// ─── Reviews Tab ─────────────────────────────────────────────────────────────
function ReviewsTab() {
  const { userEmail } = useAuthStore()
  const allReviews = useReviewStore((s) => s.reviews)
  const reviews = allReviews.filter((r) => r.reviewerEmail === userEmail)
  const deleteReview = useReviewStore((s) => s.deleteReview)
  const [searchQuery, setSearchQuery] = useState('')

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '0'
  const filteredReviews = searchQuery.trim() ? reviews.filter((r) => {
    const product = allProducts.find((p) => p.slug === r.productSlug)
    return product?.name.toLowerCase().includes(searchQuery.toLowerCase())
  }) : reviews

  return (
    <div className="space-y-4">
      <div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">— Community</span>
        <h2 className="mt-1 font-display text-lg font-semibold text-repixl-text-light">My Reviews</h2>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: 'Total Reviews', value: reviews.length },
          { label: 'Avg Rating Given', value: avgRating },
          { label: 'Latest', value: reviews.length > 0 ? reviews[0].date : '—' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-4 text-center">
            <p className="font-display text-xl font-bold text-repixl-text-light">{s.value}</p>
            <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-repixl-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search reviews by camera name…" className="w-full rounded-xl border border-repixl-muted/20 bg-repixl-charcoal px-4 py-3 text-sm text-repixl-text-light placeholder:text-repixl-muted/40 focus:border-repixl-muted/40 focus:outline-none" />

      {filteredReviews.length === 0 ? (
        <div className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-10 text-center">
          <p className="text-sm text-repixl-text-light/60">No reviews yet.</p>
          <Link href="/products" className="mt-3 inline-block"><Button variant="secondary" size="sm">Browse Cameras</Button></Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReviews.map((review) => {
            const product = allProducts.find((p) => p.slug === review.productSlug)
            return (
              <div key={review.id} className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/products/${review.productSlug}`} className="text-sm font-medium text-repixl-text-light hover:underline">{product?.name || review.productSlug}</Link>
                    <div className="mt-1 flex gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <svg key={i} xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill={i < review.rating ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" className={i < review.rating ? 'text-repixl-warning' : 'text-repixl-muted/40'} aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-[10px] text-repixl-muted">{review.date}</span>
                    <button type="button" onClick={() => deleteReview(review.id)} className="font-mono text-[9px] uppercase tracking-wider text-repixl-muted hover:text-repixl-red">Delete</button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-repixl-text-light/70">{review.comment}</p>
                {review.verifiedPurchase && <span className="mt-2 inline-block rounded-full bg-repixl-success/15 px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-repixl-success">Verified Purchase</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Security Tab ────────────────────────────────────────────────────────────
function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const changePassword = useAuthStore((s) => s.changePassword)

  // Detect whether the account has a RePXL password by calling /api/auth/me.
  // hasPassword=false means it's a Google-only account (password field is '').
  const [hasPassword, setHasPassword] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => { if (typeof j?.data?.hasPassword === 'boolean') setHasPassword(j.data.hasPassword) })
      .catch(() => setHasPassword(true)) // conservative default: show change-password form
  }, [])

  const passwordRequirements = [
    { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
    { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
    { label: 'One number', test: (p: string) => /\d/.test(p) },
    { label: 'One special character (!@#$%^&*)', test: (p: string) => /[!@#$%^&*]/.test(p) },
  ]
  const allMet = passwordRequirements.every((r) => r.test(newPassword))

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!currentPassword.trim()) { setError('Enter your current password.'); return }
    if (!allMet) { setError('New password does not meet requirements.'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return }
    const success = await changePassword(currentPassword, newPassword)
    if (!success) { setError('Current password is incorrect.'); return }
    setSaved(true)
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    setTimeout(() => setSaved(false), 3000)
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!allMet) { setError('Password does not meet requirements.'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return }
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword, confirmPassword }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setSaved(true)
        setNewPassword(''); setConfirmPassword('')
        setHasPassword(true) // account now has a password
        setTimeout(() => setSaved(false), 3000)
      } else {
        setError(data.error ?? 'Failed to set password. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">— Account security</span>
        <h2 className="mt-1 font-display text-lg font-semibold text-repixl-text-light">
          {hasPassword === false ? 'Set a RePXL Password' : 'Change Password'}
        </h2>
      </div>

      {/* Google-only account notice */}
      {hasPassword === false && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
          <div className="flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0 text-blue-400" aria-hidden="true">
              <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
            </svg>
            <div>
              <p className="text-sm font-medium text-repixl-text-light">Your account uses Google Sign-In</p>
              <p className="mt-1 text-xs text-repixl-text-light/60">
                Your RePXL account is authenticated through Google. Your Google password is managed by Google and is not stored or accessed by RePXL.
              </p>
              <p className="mt-2 text-xs text-repixl-text-light/60">
                You can optionally set a separate RePXL password below. This password is completely independent from your Google account and will allow you to sign in with your email and this password in addition to Google.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-6">
        <form onSubmit={hasPassword === false ? handleSetPassword : handleChangePassword} className="space-y-4">
          {/* Only show "Current Password" for accounts that already have one */}
          {hasPassword !== false && (
            <div>
              <label htmlFor="sec-current" className="mb-1.5 block text-xs text-repixl-text-light/70">Current Password</label>
              <PasswordInput id="sec-current" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
          )}

          <div>
            <label htmlFor="sec-new" className="mb-1.5 block text-xs text-repixl-text-light/70">
              {hasPassword === false ? 'New RePXL Password' : 'New Password'}
            </label>
            <PasswordInput id="sec-new" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
              {passwordRequirements.map((req) => {
                const met = req.test(newPassword)
                return (
                  <div key={req.label} className="flex items-center gap-1.5">
                    <div className={`h-1.5 w-1.5 flex-shrink-0 rounded-full transition-colors ${met ? 'bg-repixl-success' : 'bg-repixl-muted/30'}`} />
                    <span className={`text-[10px] transition-colors ${met ? 'text-repixl-success' : 'text-repixl-muted/50'}`}>{req.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <label htmlFor="sec-confirm" className="mb-1.5 block text-xs text-repixl-text-light/70">Confirm Password</label>
            <PasswordInput id="sec-confirm" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>

          {error && <p className="text-xs text-red-400" role="alert">{error}</p>}

          <div className="flex items-center gap-3 pt-1">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={hasPassword === null || !allMet}
              className={!allMet ? 'opacity-50 cursor-not-allowed' : ''}
            >
              {hasPassword === false ? 'Set RePXL Password' : 'Update Password'}
            </Button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-repixl-success" role="status">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                {hasPassword === false ? 'Password set' : 'Updated'}
              </span>
            )}
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-6">
        <h3 className="mb-4 font-mono text-[10px] uppercase tracking-widest text-repixl-muted">Recent Activity</h3>
        <dl className="space-y-2.5">
          {[
            { label: 'Last Login', value: 'Today' },
            { label: 'Account Created', value: new Date().toLocaleDateString() },
            { label: 'Profile Last Updated', value: new Date().toLocaleDateString() },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-lg bg-repixl-bg/50 px-3 py-2.5">
              <dt className="text-xs text-repixl-text-light/60">{item.label}</dt>
              <dd className="font-mono text-xs text-repixl-text-light">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}

// ─── Shared input style ───────────────────────────────────────────────────────
function inputClass(error?: string): string {
  return `w-full rounded-xl border px-3 py-2.5 text-sm text-repixl-text-light placeholder:text-repixl-muted/50 focus:outline-none transition-colors ${
    error ? 'border-red-400/60 bg-red-400/5 focus:border-red-400' : 'border-repixl-muted/20 bg-repixl-bg focus:border-repixl-muted/40'
  }`
}
