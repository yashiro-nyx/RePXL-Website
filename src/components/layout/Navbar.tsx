'use client'

import { reportActionFailure } from '@/lib/action-error'
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { LoginRequiredModal } from '@/components/ui'
import { LogoutConfirmModal } from '@/components/ui/LogoutConfirmModal'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { NavBellDropdown } from '@/components/layout/NavBellDropdown'
import { useAuthStore } from '@/stores/authStore'
import { useCartStore } from '@/stores/cartStore'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useToastStore } from '@/stores/toastStore'
import { useProductStore } from '@/stores/productStore'
import { useNotificationCount } from '@/hooks/useNotificationCount'

export function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [logoutModalOpen, setLogoutModalOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [highlightedSuggestion, setHighlightedSuggestion] = useState(-1)
  const [suggestionsOpen, setSuggestionsOpen] = useState(true)
  const [authHydrated, setAuthHydrated] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  const { isLoggedIn, firstName, lastName, userEmail, avatarUrl, logout, hydrate } = useAuthStore()
  const addToast = useToastStore((s) => s.addToast)

  const cartCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0))
  const wishlistCount = useWishlistStore((s) => s.slugs.length)
  const products = useProductStore((s) => s.products)
  const productsLoading = useProductStore((s) => s.loading)
  const productsError = useProductStore((s) => s.error)

  // Shared notification count — eliminates a second independent 60-second poller
  const { state: notifState, refresh: refreshUnreadCount, decrementCount: decrementNavCount } =
    useNotificationCount(isLoggedIn)
  const navUnreadCount = notifState.count

  // Await auth hydration before revealing auth-dependent UI
  useEffect(() => {
    let isMounted = true
    const init = async () => {
      if (useAuthStore.getState().authStatus === 'idle') {
        await hydrate()
      }
      if (isMounted) setAuthHydrated(true)
    }
    void init()
    return () => {
      isMounted = false
    }
  }, [hydrate])

  // Re-hydrate per-user stores once auth settles or login state changes
  useEffect(() => {
    if (!authHydrated) return
    useCartStore.getState().hydrate()
    useWishlistStore.getState().hydrate()
  }, [authHydrated, isLoggedIn])

  // Close profile dropdown on outside click
  useEffect(() => {
    if (!profileOpen) return
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [profileOpen])

  useEffect(() => {
    if (searchOpen && inputRef.current) inputRef.current.focus()
  }, [searchOpen])

  useEffect(() => {
    if (searchOpen && products.length === 0 && !productsLoading && !productsError) {
      void useProductStore.getState().hydrate()
    }
  }, [searchOpen, products.length, productsLoading, productsError])

  const searchSuggestions = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (normalized.length < 2) return []

    return products
      .filter((product) => product.status === 'active')
      .filter((product) => [product.name, product.brand, product.series].some((value) => value.toLowerCase().includes(normalized)))
      .slice(0, 6)
  }, [products, query])

  useEffect(() => {
    setHighlightedSuggestion(-1)
    setSuggestionsOpen(true)
  }, [query, searchOpen])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const suggestion = searchSuggestions[highlightedSuggestion]
    if (suggestion) {
      router.push(`/products/${suggestion.slug}`)
      setSearchOpen(false)
      setQuery('')
      return
    }
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
      setSearchOpen(false)
      setQuery('')
    }
  }

  const handleProfileClick = () => {
    if (isLoggedIn) {
      setProfileOpen((prev) => !prev)
    } else {
      setLoginModalOpen(true)
    }
  }

  const isNavActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const navLinkClass = (href: string) => [
    'relative inline-flex min-h-11 items-center text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50',
    isNavActive(href)
      ? 'text-repixl-text-light'
      : 'text-repixl-text-light/80 hover:text-repixl-text-light',
  ].join(' ')

  /**
   * Called when the user confirms logout in the modal.
   * 1. Calls the Zustand logout (clears HTTP-only cookie + localStorage session
   *    + writes the `repixl-oauth-logged-out` flag).
   * 2. Calls NextAuth signOut to clear the 30-day Google JWT cookie so the
   *    OAuth sync hook doesn't restore the session on the next page load.
   */
  const handleConfirmLogout = async () => {
    try {
      setLogoutModalOpen(false)
      setProfileOpen(false)
      setMobileMenuOpen(false)
      await logout()
      // Clear the NextAuth JWT cookie — must happen client-side.
      // redirect:false keeps us on the current page; we navigate manually.
      signOut({ redirect: false }).catch(() => {
        /* non-critical */
      })
      addToast("You've been logged out. See you next time!", 'info')
      router.push('/')
    } catch {
      reportActionFailure()
    }
  }

  return (
    <>
      <header className="site-header fixed left-0 right-0 top-0 z-50">
        <nav className="mx-auto flex max-w-container items-center justify-between px-4 py-4 sm:px-6 md:px-10 lg:px-16">
          {/* Logo */}
          <Link href="/" className="rounded text-repixl-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50">
            <span className="sm:hidden"><Logo size="sm" accentXL /></span>
            <span className="hidden sm:inline-flex"><Logo size="md" accentXL /></span>
          </Link>

          {/* Nav links */}
          <ul className="hidden items-center gap-8 md:flex">
            <li><Link href="/" className={navLinkClass('/')} aria-current={isNavActive('/') ? 'page' : undefined}>Home</Link></li>
            <li><Link href="/products" className={navLinkClass('/products')} aria-current={isNavActive('/products') ? 'page' : undefined}>Cameras</Link></li>
            <li><Link href="/compare" className={navLinkClass('/compare')} aria-current={isNavActive('/compare') ? 'page' : undefined}>Compare</Link></li>
            <li><Link href="/about" className={navLinkClass('/about')} aria-current={isNavActive('/about') ? 'page' : undefined}>About</Link></li>
          </ul>

          {/* Icon cluster */}
          <div className="flex items-center gap-0 sm:gap-2 lg:gap-4">
            {/* Theme toggle */}
            <div className="hidden sm:block"><ThemeToggle /></div>

            {/* Search */}
            <div className="relative flex items-center">
              {searchOpen && (
                <form onSubmit={handleSearchSubmit} className="fixed left-4 right-4 top-[4.5rem] z-10 sm:absolute sm:left-auto sm:right-10 sm:top-1/2 sm:w-56 sm:-translate-y-1/2 md:w-64" role="search">
                  <label htmlFor="nav-search" className="sr-only">Search cameras</label>
                  <input
                    ref={inputRef}
                    id="nav-search"
                    type="search"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setSuggestionsOpen(true) }}
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={suggestionsOpen && searchSuggestions.length > 0}
                    aria-controls="nav-search-suggestions"
                    aria-activedescendant={highlightedSuggestion >= 0 ? `nav-search-option-${highlightedSuggestion}` : undefined}
                    onBlur={() => { if (!query.trim()) setSearchOpen(false) }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown' && searchSuggestions.length > 0) {
                        e.preventDefault()
                        setHighlightedSuggestion((current) => (current + 1) % searchSuggestions.length)
                      } else if (e.key === 'ArrowUp' && searchSuggestions.length > 0) {
                        e.preventDefault()
                        setHighlightedSuggestion((current) => (current <= 0 ? searchSuggestions.length - 1 : current - 1))
                      } else if (e.key === 'Escape') {
                        e.preventDefault()
                        if (searchSuggestions.length > 0) { setHighlightedSuggestion(-1); setSuggestionsOpen(false) }
                        else { setSearchOpen(false); setQuery('') }
                      }
                    }}
                    placeholder="Search cameras..."
                    className="w-full rounded border border-repixl-muted/30 bg-repixl-bg/95 px-3 py-2.5 text-sm text-repixl-text-light shadow-xl placeholder:text-repixl-muted/60 backdrop-blur-md focus:border-repixl-muted/50 focus:outline-none focus:ring-2 focus:ring-repixl-red/40 sm:py-2 sm:shadow-none"
                  />
                  {suggestionsOpen && searchSuggestions.length > 0 && (
                    <ul id="nav-search-suggestions" role="listbox" aria-label="Camera suggestions" className="mt-2 max-h-72 overflow-y-auto rounded border border-repixl-muted/20 bg-repixl-bg/95 p-1 shadow-xl backdrop-blur-md">
                      {searchSuggestions.map((product, index) => (
                        <li key={product.slug} id={`nav-search-option-${index}`} role="option" aria-selected={index === highlightedSuggestion}>
                          <button
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              router.push(`/products/${product.slug}`)
                              setSearchOpen(false)
                              setQuery('')
                            }}
                            className={`flex min-h-11 w-full items-center justify-between gap-3 rounded px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50 ${index === highlightedSuggestion ? 'bg-repixl-charcoal text-repixl-text-light' : 'text-repixl-text-light/85 hover:bg-repixl-charcoal/70'}`}
                          >
                            <span className="min-w-0 truncate">{product.name}</span>
                            <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-repixl-muted">{product.brand}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </form>
              )}
              <button type="button" aria-label="Search" onClick={() => setSearchOpen((prev) => !prev)} className="flex h-11 w-11 items-center justify-center text-repixl-text-light/80 transition-colors hover:text-repixl-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
              </button>
            </div>

            {/* Wishlist */}
            <button
              type="button"
              aria-label="Wishlist"
              onClick={(e) => {
                if (!isLoggedIn) { e.preventDefault(); setLoginModalOpen(true) }
                else router.push('/wishlist')
              }}
              className="relative hidden h-11 w-11 items-center justify-center text-repixl-text-light/80 transition-colors hover:text-repixl-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50 sm:inline-flex"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
              {wishlistCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-repixl-red text-[9px] font-bold text-white">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Notifications bell — dropdown, authenticated only */}
            <NavBellDropdown
              unreadCount={navUnreadCount}
              isLoggedIn={isLoggedIn}
              authHydrated={authHydrated}
              onUnreadCountChange={(delta) => decrementNavCount(-delta)}
              onOpen={refreshUnreadCount}
            />

            {/* Cart */}
            <button
              type="button"
              aria-label="Cart"
              onClick={() => {
                if (!isLoggedIn) setLoginModalOpen(true)
                else router.push('/cart')
              }}
              className="relative flex h-11 w-11 items-center justify-center text-repixl-text-light/80 transition-colors hover:text-repixl-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" /></svg>
              {cartCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-repixl-red text-[9px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Profile / Account — neutral placeholder until auth hydrates */}
              <div className="relative flex h-11 w-11 items-center justify-center" ref={profileRef}>
              {!authHydrated ? (
                // Neutral skeleton — prevents logged-out icon flash on refresh
                <div className="h-8 w-8 rounded-full bg-repixl-muted/10" aria-hidden="true" />
              ) : (
                <button
                  type="button"
                  aria-label={isLoggedIn ? 'Account menu' : 'Sign in'}
                  onClick={handleProfileClick}
                  className={`relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50 ${
                    isLoggedIn
                      ? 'bg-repixl-red/20'
                      : 'text-repixl-text-light/80 hover:text-repixl-text-light'
                  }`}
                >
                  {isLoggedIn ? (
                    avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt="Your profile photo"
                        fill
                        className="object-cover"
                        sizes="32px"
                      />
                    ) : (
                      <span className="font-display text-xs font-bold text-repixl-red">
                        {`${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?'}
                      </span>
                    )
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                </button>
              )}

              {/* Dropdown — only visible after hydration + login */}
              {authHydrated && profileOpen && isLoggedIn && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-repixl-muted/20 bg-repixl-bg p-3 shadow-xl">
                  <div className="mb-3 flex items-center gap-2.5 border-b border-repixl-muted/10 pb-3">
                    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-repixl-red/20">
                      {avatarUrl ? (
                        <Image src={avatarUrl} alt="Your profile photo" fill className="object-cover" sizes="36px" />
                      ) : (
                        <span className="font-display text-xs font-bold text-repixl-red">
                          {`${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-repixl-text-light">{firstName} {lastName}</p>
                      <p className="truncate font-mono text-[10px] text-repixl-muted">{userEmail}</p>
                    </div>
                  </div>
                  <ul className="space-y-1">
                    <li>
                      <Link href="/account" onClick={() => setProfileOpen(false)} className="flex min-h-11 items-center rounded px-2 py-1.5 text-sm text-repixl-text-light/80 hover:bg-repixl-charcoal hover:text-repixl-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50">
                        My Account
                      </Link>
                    </li>
                    <li>
                      <Link href="/account/orders" onClick={() => setProfileOpen(false)} className="flex min-h-11 items-center rounded px-2 py-1.5 text-sm text-repixl-text-light/80 hover:bg-repixl-charcoal hover:text-repixl-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50">
                        My Purchases
                      </Link>
                    </li>
                    <li>
                      <Link href="/account/notifications" onClick={() => setProfileOpen(false)} className="flex min-h-11 items-center justify-between rounded px-2 py-1.5 text-sm text-repixl-text-light/80 hover:bg-repixl-charcoal hover:text-repixl-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50">
                        Notifications
                        {navUnreadCount > 0 && (
                          <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-repixl-red px-1 font-mono text-[8px] font-bold text-white">
                            {navUnreadCount > 99 ? '99+' : navUnreadCount}
                          </span>
                        )}
                      </Link>
                    </li>
                    <li>
                      <Link href="/account/vouchers" onClick={() => setProfileOpen(false)} className="flex min-h-11 items-center rounded px-2 py-1.5 text-sm text-repixl-text-light/80 hover:bg-repixl-charcoal hover:text-repixl-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50">
                        My Vouchers
                      </Link>
                    </li>
                    <li className="border-t border-repixl-muted/10 pt-1">
                      <button
                        type="button"
                        onClick={() => { setProfileOpen(false); setLogoutModalOpen(true) }}
                        className="flex min-h-11 w-full items-center rounded px-2 py-1.5 text-left text-sm text-repixl-red hover:bg-repixl-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50"
                      >
                        Log Out
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button type="button" aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileMenuOpen} aria-controls="mobile-navigation" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="flex h-11 w-11 items-center justify-center text-repixl-text-light/80 transition-colors hover:text-repixl-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50 md:hidden">
              {mobileMenuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>
              )}
            </button>
          </div>
        </nav>

        {/* Mobile menu drawer */}
        {mobileMenuOpen && (
          <div id="mobile-navigation" className="border-t border-repixl-muted/10 bg-repixl-charcoal px-6 py-4 md:hidden">
            <ul className="space-y-3">
              <li><Link href="/" onClick={() => setMobileMenuOpen(false)} aria-current={isNavActive('/') ? 'page' : undefined} className={`${navLinkClass('/')} w-full`}>Home</Link></li>
              <li><Link href="/products" onClick={() => setMobileMenuOpen(false)} aria-current={isNavActive('/products') ? 'page' : undefined} className={`${navLinkClass('/products')} w-full`}>Cameras</Link></li>
              <li><Link href="/compare" onClick={() => setMobileMenuOpen(false)} aria-current={isNavActive('/compare') ? 'page' : undefined} className={`${navLinkClass('/compare')} w-full`}>Compare</Link></li>
              <li><Link href="/about" onClick={() => setMobileMenuOpen(false)} aria-current={isNavActive('/about') ? 'page' : undefined} className={`${navLinkClass('/about')} w-full`}>About</Link></li>
              <li className="flex items-center justify-between text-sm text-repixl-text-light/80 sm:hidden">
                <span>Appearance</span>
                <ThemeToggle />
              </li>
            </ul>
            {isLoggedIn && (
              <div className="mt-4 border-t border-repixl-muted/10 pt-4 space-y-2">
                <div className="mb-1 flex items-center gap-2.5">
                  <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-repixl-red/20">
                    {avatarUrl ? (
                      <Image src={avatarUrl} alt="Your profile photo" fill className="object-cover" sizes="36px" />
                    ) : (
                      <span className="font-display text-xs font-bold text-repixl-red">
                        {`${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-repixl-text-light">{firstName} {lastName}</p>
                    <p className="truncate font-mono text-[10px] text-repixl-muted">{userEmail}</p>
                  </div>
                </div>
                <Link href="/account" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-repixl-text-light/80 hover:text-repixl-text-light">My Account</Link>
                <Link href="/account/orders" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-repixl-text-light/80 hover:text-repixl-text-light">My Purchases</Link>
                <Link href="/wishlist" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-repixl-text-light/80 hover:text-repixl-text-light">Wishlist</Link>
                <Link href="/account/notifications" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-between text-sm text-repixl-text-light/80 hover:text-repixl-text-light">
                  Notifications
                  {navUnreadCount > 0 && (
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-repixl-red px-1 font-mono text-[8px] font-bold text-white">
                      {navUnreadCount > 99 ? '99+' : navUnreadCount}
                    </span>
                  )}
                </Link>
                <Link href="/account/vouchers" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-repixl-text-light/80 hover:text-repixl-text-light">My Vouchers</Link>
                <button type="button" onClick={() => { setMobileMenuOpen(false); setLogoutModalOpen(true) }} className="mt-2 block text-sm text-repixl-red">Log Out</button>
              </div>
            )}
            {!isLoggedIn && (
              <div className="mt-4 border-t border-repixl-muted/10 pt-4">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-repixl-text-light/80 hover:text-repixl-text-light">Log In</Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="mt-2 block text-sm text-repixl-red">Register</Link>
              </div>
            )}
          </div>
        )}
      </header>

      <LoginRequiredModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
      <LogoutConfirmModal
        isOpen={logoutModalOpen}
        onCancel={() => setLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
      />
    </>
  )
}
