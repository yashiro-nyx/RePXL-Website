'use client'

import { Suspense, createContext, useContext, useEffect, useRef } from 'react'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import {
  computeBackTarget,
  resolveFallback,
  pushHistoryEntry,
  MAX_HISTORY_ENTRIES,
} from '@/lib/back-navigation'

// ─── Navigation history tracking ────────────────────────────────────────────────
// RePXL uses the Next.js App Router. `router.back()` alone is unreliable for a
// product-quality Back button because it can:
//   - leave the app entirely (browser history predates our site)
//   - land on an OAuth/payment-processing/auth route
//   - do nothing on a direct visit / new tab / hard refresh
//
// Instead we track the *previous in-app URL* (pathname + query) in sessionStorage,
// scoped per browser tab. On every client navigation we push the URL we are
// leaving into a short stack. The Back button then navigates to the last safe
// entry, or a section-appropriate fallback when none exists.
//
// sessionStorage (not localStorage) is deliberate: it is per-tab, so a newly
// opened tab starts with an empty history (correct — there is no in-app
// "previous" page) and two tabs cannot corrupt each other's back target.

const STORAGE_KEY = 'repixl:nav-history'

interface NavHistoryContextValue {
  /** The URL (path + query) the user was on immediately before the current page. */
  getPrevious: () => string | null
}

const NavHistoryContext = createContext<NavHistoryContextValue | null>(null)

function readStack(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function writeStack(stack: string[]): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stack.slice(-MAX_HISTORY_ENTRIES)))
  } catch {
    // sessionStorage may be unavailable (privacy mode); fail silently — the
    // Back button will fall back to a section-appropriate destination.
  }
}

function HistoryTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // The URL we are *currently* on. We only append the PREVIOUS url to the stack
  // once we navigate away from it, so `lastUrlRef` holds the page we will push.
  const lastUrlRef = useRef<string | null>(null)

  useEffect(() => {
    const query = searchParams?.toString()
    const currentUrl = query ? `${pathname}?${query}` : pathname

    const previousUrl = lastUrlRef.current
    if (previousUrl && previousUrl !== currentUrl) {
      // pushHistoryEntry handles dedup + capping (shared pure logic, unit-tested).
      writeStack(pushHistoryEntry(readStack(), previousUrl))
    }
    lastUrlRef.current = currentUrl
  }, [pathname, searchParams])

  return null
}

/**
 * Mounts the client-side history tracker. Place once, high in the tree (root
 * layout). Wrapped in Suspense because useSearchParams() requires it in the App
 * Router. Renders nothing.
 */
export function NavigationHistoryProvider({ children }: { children: React.ReactNode }) {
  const value: NavHistoryContextValue = {
    getPrevious: () => {
      const stack = readStack()
      return stack.length > 0 ? stack[stack.length - 1] : null
    },
  }

  return (
    <NavHistoryContext.Provider value={value}>
      <Suspense fallback={null}>
        <HistoryTracker />
      </Suspense>
      {children}
    </NavHistoryContext.Provider>
  )
}

/**
 * Returns a `goBack` function and the resolved back `href` (for progressive
 * enhancement / prefetch). The target is the previous in-app page when it is
 * safe, otherwise a section-appropriate fallback.
 *
 * @param options.href      explicit destination — always used when provided (still validated for safety)
 * @param options.fallback  explicit fallback when there is no safe previous page
 */
export function useSafeBack(options: { href?: string; fallback?: string } = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const ctx = useContext(NavHistoryContext)

  // Compute the target lazily at click time so it reflects the freshest history,
  // but also expose a best-effort href for the anchor fallback / prefetch.
  const resolveTarget = (): string => {
    // An explicit href takes precedence, but is still validated so a bad prop
    // can never send users to an unsafe/external route.
    if (options.href) {
      return computeBackTarget({ previous: options.href, current: pathname, fallback: options.fallback })
    }
    const previous = ctx?.getPrevious() ?? null
    return computeBackTarget({ previous, current: pathname, fallback: options.fallback })
  }

  const goBack = () => {
    router.push(resolveTarget())
  }

  // For the initial render (SSR / pre-hydration) we cannot read sessionStorage,
  // so the href reflects the explicit href or the safe fallback. After hydration
  // the click handler always recomputes from live history.
  const staticHref = options.href
    ? computeBackTarget({ previous: options.href, current: pathname, fallback: options.fallback })
    : resolveFallback(pathname, options.fallback)

  return { goBack, href: staticHref }
}
