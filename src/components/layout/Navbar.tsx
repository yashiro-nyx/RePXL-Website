'use client'

import { reportActionFailure } from '@/lib/action-error'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { LoginRequiredModal } from '@/components/ui'
import { LogoutConfirmModal } from '@/components/ui/LogoutConfirmModal'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useAuthStore } from '@/stores/authStore'
import { useCartStore } from '@/stores/cartStore'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useToastStore } from '@/stores/toastStore'

export function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [logoutModalOpen, setLogoutModalOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [authHydrated, setAuthHydrated] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const { isLoggedIn, firstName, lastName, userEmail, logout, hydrate } = useAuthStore()
  const addToast = useToastStore((s) => s.addToast)

  const cartCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0))
  const wishlistCount = useWishlistStore((s) => s.slugs.length)

  // Await auth hydration before revealing auth-dependent UI — prevents the
  // logged-out flash on page refresh while the session is still being read.
  useEffect(() => {
    const init = async () => {
      await hydrate()
      useCartStore.getState().hydrate()
      useWishlistStore.getState().hydrate()
      setAuthHydrated(true)
    }
    void init()
  }, [hydrate])

  // Re-hydrate per-user stores when login state changes
  useEffect(() => {
    if (isLoggedIn) {
      useCartStore.getState().hydrate()
      useWishlistStore.getState().hydrate()
    } else {
      // Clear in-memory state on logout
      useCartStore.setState({ items: [] })
      useWishlistStore.setState({ slugs: [] })
    }
  }, [isLoggedIn])

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
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
      <header className="fixed left-0 right-0 top-0 z-50 bg-gradient-to-b from-repixl-bg/80 to-transparent backdrop-blur-sm">
        <nav className="mx-auto flex max-w-container items-center justify-between px-6 py-4 md:px-10 lg:px-16">
          {/* Logo */}
          <Link href="/" className="text-repixl-text-light">
            <Logo size="md" />
          </Link>

          {/* Nav links */}
          <ul className="hidden items-center gap-8 md:flex">
            <li><Link href="/" className="text-sm text-repixl-text-light/80 transition-colors hover:text-repixl-text-light">Home</Link></li>
            <li><Link href="/products" className="text-sm text-repixl-text-light/80 transition-colors hover:text-repixl-text-light">Cameras</Link></li>
            <li><Link href="/compare" className="text-sm text-repixl-text-light/80 transition-colors hover:text-repixl-text-light">Compare</Link></li>
            <li><Link href="/about" className="text-sm text-repixl-text-light/80 transition-colors hover:text-repixl-text-light">About</Link></li>
          </ul>

          {/* Icon cluster */}
          <div className="flex items-center gap-4">
            {/* Theme toggle */}
            <ThemeToggle />

            {/* Search */}
            <div className="relative flex items-center">
              {searchOpen && (
                <form onSubmit={handleSearchSubmit} className="absolute right-8 top-1/2 -translate-y-1/2">
                  <label htmlFor="nav-search" className="sr-only">Search cameras</label>
                  <input
                    ref={inputRef}
                    id="nav-search"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onBlur={() => { if (!query.trim()) setSearchOpen(false) }}
                    onKeyDown={(e) => { if (e.key === 'Escape') { setSearchOpen(false); setQuery('') } }}
                    placeholder="Search cameras..."
                    className="w-48 rounded border border-repixl-muted/30 bg-repixl-bg/90 px-3 py-1.5 text-sm text-repixl-text-light placeholder:text-repixl-muted/60 backdrop-blur-md focus:border-repixl-muted/50 focus:outline-none md:w-56"
                  />
                </form>
              )}
              <button type="button" aria-label="Search" onClick={() => setSearchOpen((prev) => !prev)} className="text-repixl-text-light/80 transition-colors hover:text-repixl-text-light">
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
              className="relative text-repixl-text-light/80 transition-colors hover:text-repixl-text-light"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
              {wishlistCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-repixl-red text-[9px] font-bold text-white">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Cart */}
            <button
              type="button"
              aria-label="Cart"
              onClick={() => {
                if (!isLoggedIn) setLoginModalOpen(true)
                else router.push('/cart')
              }}
              className="relative text-repixl-text-light/80 transition-colors hover:text-repixl-text-light"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" /></svg>
              {cartCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-repixl-red text-[9px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Profile / Account — neutral placeholder until auth hydrates */}
            <div className="relative" ref={profileRef}>
              {!authHydrated ? (
                // Neutral skeleton — prevents logged-out icon flash on refresh
                <div className="h-8 w-8 rounded-full bg-repixl-muted/10" aria-hidden="true" />
              ) : (
                <button
                  type="button"
                  aria-label={isLoggedIn ? 'Account menu' : 'Sign in'}
                  onClick={handleProfileClick}
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                    isLoggedIn
                      ? 'bg-repixl-red/20'
                      : 'text-repixl-text-light/80 hover:text-repixl-text-light'
                  }`}
                >
                  {isLoggedIn ? (
                    <span className="font-display text-xs font-bold text-repixl-red">
                      {`${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?'}
                    </span>
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
                  <div className="mb-3 border-b border-repixl-muted/10 pb-3">
                    <p className="text-sm font-medium text-repixl-text-light">{firstName} {lastName}</p>
                    <p className="font-mono text-[10px] text-repixl-muted">{userEmail}</p>
                  </div>
                  <ul className="space-y-1">
                    <li>
                      <Link href="/account" onClick={() => setProfileOpen(false)} className="block rounded px-2 py-1.5 text-sm text-repixl-text-light/80 hover:bg-repixl-charcoal hover:text-repixl-text-light">
                        My Account
                      </Link>
                    </li>
                    <li>
                      <button
                        type="button"
                        onClick={() => { setProfileOpen(false); setLogoutModalOpen(true) }}
                        className="block w-full rounded px-2 py-1.5 text-left text-sm text-repixl-red hover:bg-repixl-charcoal"
                      >
                        Log Out
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button type="button" aria-label="Menu" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-repixl-text-light/80 transition-colors hover:text-repixl-text-light md:hidden">
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
          <div className="border-t border-repixl-muted/10 bg-repixl-charcoal px-6 py-4 md:hidden">
            <ul className="space-y-3">
              <li><Link href="/" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-repixl-text-light/80 transition-colors hover:text-repixl-text-light">Home</Link></li>
              <li><Link href="/products" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-repixl-text-light/80 transition-colors hover:text-repixl-text-light">Cameras</Link></li>
              <li><Link href="/compare" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-repixl-text-light/80 transition-colors hover:text-repixl-text-light">Compare</Link></li>
              <li><Link href="/about" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-repixl-text-light/80 transition-colors hover:text-repixl-text-light">About</Link></li>
            </ul>
            {isLoggedIn && (
              <div className="mt-4 border-t border-repixl-muted/10 pt-4">
                <Link href="/account" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-repixl-text-light/80 hover:text-repixl-text-light">My Account</Link>
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
