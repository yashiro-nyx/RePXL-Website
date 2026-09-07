'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Container } from '@/components/layout/Container'
import { Footer } from '@/components/layout/Footer'
import { FilmStripLoader } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import { useAddressStore } from '@/stores/addressStore'
import { usePaymentStore } from '@/stores/paymentStore'
import { reportActionFailure } from '@/lib/action-error'
import {
  accountNavigation,
  accountSectionActive,
  NAV_GROUPS,
  type NavItem,
} from '@/lib/account-navigation'

// ── Icons ────────────────────────────────────────────────────────────────────

function IconUser()         { return <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
function IconMapPin()       { return <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg> }
function IconLock()         { return <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> }
function IconShield()       { return <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> }
function IconPhone()        { return <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.38 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> }
function IconBell()         { return <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg> }
function IconTag()          { return <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg> }
function IconStar()         { return <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> }
function IconShoppingBag()  { return <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> }
function IconLogOut()       { return <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg> }
function IconChevronDown()  { return <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg> }
function IconSettings()     { return <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg> }
function IconCreditCard()   { return <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg> }

const ICON_MAP: Record<string, React.FC> = {
  '/account/profile':                              IconUser,
  '/account/addresses':                            IconMapPin,
  '/account/security/password':                    IconLock,
  '/account/security':                             IconShield,
  '/account/security/mfa':                         IconPhone,
  '/account/notification-settings':               IconSettings,
  '/account/orders':                               IconShoppingBag,
  '/account/payments':                             IconCreditCard,
  '/account/reviews':                              IconStar,
  '/account/notifications':                        IconBell,
  '/account/notifications/order-updates':          IconShoppingBag,
  '/account/notifications/promotions':             IconTag,
  '/account/notifications/repixl-updates':         IconBell,
  '/account/vouchers':                             IconTag,
}

export default function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isLoggedIn, authStatus, authError, firstName, lastName, userEmail, avatarUrl, hydrate, logout } = useAuthStore()
  const [ready, setReady] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [categoryUnreadCounts, setCategoryUnreadCounts] = useState<Record<string, number>>({})
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    let active = true
    hydrate().finally(() => { if (active) setReady(true) })
    return () => { active = false }
  }, [hydrate])

  useEffect(() => {
    if (ready && authStatus === 'unauthenticated') router.replace('/login')
  }, [ready, authStatus, router])

  // Poll unread counts — single request returns total + per-category breakdown.
  // The extended /api/notifications/unread-count endpoint uses a groupBy query
  // so one DB round-trip covers both the Notifications parent badge and the
  // per-child (Order Updates / Promotions / RePIXL Updates) sidebar badges.
  const refreshUnread = useCallback(async () => {
    if (!isLoggedIn) return
    try {
      const res = await fetch('/api/notifications/unread-count', { credentials: 'include' })
      if (!res.ok) return
      const { data } = await res.json()
      setUnreadCount(data?.count ?? 0)
      // byCategory is keyed by the route path used in the sidebar nav
      // e.g. { '/account/notifications/order-updates': 3, '/account/notifications/promotions': 1 }
      setCategoryUnreadCounts(data?.byCategory ?? {})
    } catch { /* ignore */ }
  }, [isLoggedIn])
  useEffect(() => {
    if (ready && isLoggedIn) {
      refreshUnread()
      const interval = setInterval(refreshUnread, 60_000)
      return () => clearInterval(interval)
    }
  }, [ready, isLoggedIn, refreshUnread])

  async function handleLogout() {
    if (!window.confirm('Log out of your RePIXL account?')) return
    setLoggingOut(true)
    try {
      await logout()
      await signOut({ redirect: false }).catch(() => undefined)
      useAddressStore.getState().reset()
      usePaymentStore.getState().reset()
      router.push('/')
    } catch {
      reportActionFailure()
    } finally {
      setLoggingOut(false)
    }
  }

  if (!ready || !isLoggedIn)
    return (
      <div
        className="burn-subtle flex min-h-[100dvh] items-center justify-center pt-24 overflow-hidden"
        role="status"
        aria-live="polite"
      >
        <div className="flex w-full max-w-[480px] flex-col items-center justify-center px-6">
          {authStatus === 'error' ? (
            <div className="space-y-4 text-center text-repixl-text-light">
              <p>{authError}</p>
              <button className="rounded-lg bg-repixl-red px-4 py-2 text-white" onClick={() => void hydrate()}>Retry</button>
            </div>
          ) : (
            <FilmStripLoader className="w-full" label="Loading your account…" />
          )}
        </div>
      </div>
    )

  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?'

  return (
    <>
      <div className="burn-subtle min-h-screen pb-20 pt-24 print:min-h-0 print:p-0">
        <Container>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start print:block">

            {/* ── Sidebar ───────────────────────────────────────── */}
            <aside className="no-print w-full shrink-0 lg:sticky lg:top-24 lg:w-64">
              <div className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal overflow-hidden">

                {/* Avatar + name */}
                <div className="flex items-center gap-3 border-b border-repixl-muted/10 p-4">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-repixl-bg border border-repixl-muted/20">
                    {avatarUrl ? (
                      <Image src={avatarUrl} alt="Profile" fill className="object-cover" sizes="48px" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-repixl-red/10">
                        <span className="font-display text-base font-bold text-repixl-red/70">{initials}</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-semibold text-repixl-text-light">
                      {firstName} {lastName}
                    </p>
                    <p className="truncate text-xs text-repixl-muted">{userEmail}</p>
                  </div>
                </div>

                {/* Edit profile shortcut */}
                <div className="border-b border-repixl-muted/10 px-3 py-2">
                  <Link
                    href="/account/profile"
                    className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-repixl-muted transition-colors hover:bg-repixl-bg hover:text-repixl-text-light"
                  >
                    <IconUser />
                    Edit Profile
                  </Link>
                </div>

                {/* Navigation — desktop */}
                <nav aria-label="Account navigation" className="hidden p-2 lg:block">
                  <NavGroups
                    pathname={pathname}
                    unreadCount={unreadCount}
                    categoryUnreadCounts={categoryUnreadCounts}
                    onNavigate={() => {}}
                  />
                </nav>

                {/* Navigation — mobile toggle */}
                <div className="p-2 lg:hidden">
                  <button
                    type="button"
                    onClick={() => setMobileNavOpen((v) => !v)}
                    className="flex w-full items-center justify-between rounded-lg bg-repixl-bg px-3 py-2.5 text-sm text-repixl-text-light"
                    aria-expanded={mobileNavOpen}
                    aria-controls="mobile-account-nav"
                  >
                    <span>Account Menu</span>
                    <span className={`transition-transform ${mobileNavOpen ? 'rotate-180' : ''}`}>
                      <IconChevronDown />
                    </span>
                  </button>
                  {mobileNavOpen && (
                    <nav id="mobile-account-nav" aria-label="Account navigation" className="mt-2">
                      <NavGroups
                        pathname={pathname}
                        unreadCount={unreadCount}
                        categoryUnreadCounts={categoryUnreadCounts}
                        onNavigate={() => setMobileNavOpen(false)}
                      />
                    </nav>
                  )}
                </div>

                {/* Logout */}
                <div className="border-t border-repixl-muted/10 p-2">
                  <button
                    disabled={loggingOut}
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-repixl-muted transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                  >
                    <IconLogOut />
                    {loggingOut ? 'Logging out…' : 'Logout'}
                  </button>
                </div>
              </div>
            </aside>

            {/* ── Main content ─────────────────────────────────── */}
            <main className="min-w-0 flex-1 text-repixl-text-light">
              {authError && (
                <div role="alert" className="mb-4 rounded-lg border border-repixl-muted/20 p-4 text-sm">
                  {authError} <button className="underline" onClick={() => void hydrate()}>Retry</button>
                </div>
              )}
              {children}
            </main>
          </div>
        </Container>
      </div>
      <div className="no-print"><Footer /></div>
    </>
  )
}

// ── Grouped navigation renderer ──────────────────────────────────────────────

function NavGroups({
  pathname,
  unreadCount,
  categoryUnreadCounts,
  onNavigate,
}: {
  pathname: string
  unreadCount: number
  categoryUnreadCounts: Record<string, number>
  onNavigate: () => void
}) {
  // Group items by group name preserving NAV_GROUPS order
  const grouped = NAV_GROUPS.map((group) => ({
    group,
    items: accountNavigation.filter((i) => i.group === group),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="space-y-1">
      {grouped.map(({ group, items }) => (
        <div key={group}>
          <p className="px-3 pb-1 pt-3 font-mono text-[9px] uppercase tracking-widest text-repixl-muted/60 first:pt-1">
            {group}
          </p>
          {items.map((item) => (
            <NavItemRow
              key={item.href}
              item={item}
              pathname={pathname}
              unreadCount={unreadCount}
              categoryUnreadCounts={categoryUnreadCounts}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function NavItemRow({
  item,
  pathname,
  unreadCount,
  categoryUnreadCounts,
  onNavigate,
}: {
  item: NavItem
  pathname: string
  unreadCount: number
  /** Per-category unread counts keyed by child href, for notification children */
  categoryUnreadCounts: Record<string, number>
  onNavigate: () => void
}) {
  const Icon = ICON_MAP[item.href]
  const hasChildren = item.children && item.children.length > 0
  const isNotifications = item.href === '/account/notifications'

  // A parent is active if the current path is the parent itself OR any of its children.
  // This keeps Notifications highlighted whenever /order-updates, /promotions, or
  // /repixl-updates is open, even if the parent path itself is not an exact match.
  const childIsActive = hasChildren
    ? item.children!.some((child) => accountSectionActive(pathname, child.href))
    : false
  const isActive = accountSectionActive(pathname, item.href) || childIsActive

  // Children are always visible when the parent or any child is active
  const showChildren = hasChildren && isActive

  return (
    <div>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={isActive ? 'page' : undefined}
        className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
          isActive
            ? 'bg-repixl-red/10 font-medium text-repixl-red'
            : 'text-repixl-text-light/70 hover:bg-repixl-bg hover:text-repixl-text-light'
        }`}
      >
        {Icon && <span className="shrink-0"><Icon /></span>}
        <span className="flex-1">{item.label}</span>
        {/* Total unread badge on the Notifications parent */}
        {isNotifications && !showChildren && unreadCount > 0 && (
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-repixl-red px-1 font-mono text-[8px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {/* Chevron for items with children */}
        {hasChildren && (
          <span className={`transition-transform text-repixl-muted/50 ${showChildren ? 'rotate-180' : ''}`}>
            <IconChevronDown />
          </span>
        )}
      </Link>

      {/* Inline sub-nav — shown when parent or any child is active */}
      {showChildren && item.children && (
        <div className="ml-5 mt-0.5 space-y-0.5 border-l border-repixl-muted/15 pl-3">
          {item.children.map((child) => {
            // Use accountSectionActive so /order-updates matches the child correctly
            const childActive = accountSectionActive(pathname, child.href)
            const ChildIcon = ICON_MAP[child.href]
            const childUnread = categoryUnreadCounts[child.href] ?? 0
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                aria-current={childActive ? 'page' : undefined}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                  childActive
                    ? 'bg-repixl-red/5 font-medium text-repixl-red'
                    : 'text-repixl-muted hover:bg-repixl-bg hover:text-repixl-text-light'
                }`}
              >
                {ChildIcon && <span className="shrink-0"><ChildIcon /></span>}
                <span className="flex-1">{child.label}</span>
                {/* Per-category unread badge */}
                {childUnread > 0 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-repixl-red px-1 font-mono text-[7px] font-bold text-white">
                    {childUnread > 99 ? '99+' : childUnread}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
