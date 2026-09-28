// ─── Back-navigation safety rules ───────────────────────────────────────────────
// Pure, framework-agnostic helpers that decide whether a stored "previous page"
// is a safe internal destination for the Back button, and how to derive a
// sensible fallback when it is not.
//
// These functions are intentionally free of React / Next.js imports so they can
// be unit-tested in the node vitest environment and reused by both the
// NavigationHistoryProvider and the useSafeBack hook.

/**
 * Route prefixes that the Back button must NEVER navigate to. These are
 * transient auth/OAuth/payment-processing routes where landing "back" would be
 * confusing, would re-trigger a side effect, or could create a loop.
 *
 * Matching is prefix-based on the pathname (case-insensitive), so
 * "/api/auth/callback/google" and "/auth/mobile-google" are both excluded.
 */
export const UNSAFE_BACK_PREFIXES: readonly string[] = [
  '/api/', // never "go back" into an API route
  '/auth/', // NextAuth callback / error / mobile-google bridge routes
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/checkout/success', // payment result / processing page
  '/checkout/processing',
  '/admin/login',
]

/**
 * A destination is only ever considered valid if it is a same-origin, absolute
 * path (starts with a single "/"). This rejects:
 *   - external URLs (http://evil.com, //evil.com, https:evil.com)
 *   - protocol-relative URLs (//host)
 *   - non-path values (mailto:, javascript:, empty strings)
 */
export function isInternalPath(value: string | null | undefined): value is string {
  if (typeof value !== 'string') return false
  const v = value.trim()
  if (v.length === 0) return false
  // Must start with a single slash and not be protocol-relative "//".
  if (!v.startsWith('/')) return false
  if (v.startsWith('//')) return false
  // Reject control chars / whitespace that could smuggle a scheme.
  if (/[\u0000-\u001F\u007F]/.test(v)) return false
  // Reject backslashes — some browsers treat "/\evil.com" as protocol-relative.
  if (v.includes('\\')) return false
  return true
}

/** Normalize a path for comparison: strip trailing slash (except root), lowercase host-insensitive path. */
function normalizePath(path: string): string {
  const [pathname] = path.split('?')
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1)
  return pathname
}

/**
 * True when `target` is a safe internal destination to navigate back to,
 * given the `current` location we are navigating away from.
 *
 * Rules:
 *  - Must be an internal absolute path (see isInternalPath).
 *  - Must not match any UNSAFE_BACK_PREFIXES.
 *  - Must not be the same page we're already on (prevents a no-op / loop).
 */
export function isSafeBackTarget(
  target: string | null | undefined,
  current?: string | null
): target is string {
  if (!isInternalPath(target)) return false

  const targetPath = normalizePath(target).toLowerCase()

  for (const prefix of UNSAFE_BACK_PREFIXES) {
    // Exact match or path-segment prefix match (avoid "/loginary" matching "/login").
    if (targetPath === prefix || targetPath.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`)) {
      return false
    }
    if (targetPath === prefix) return false
  }

  if (current) {
    const currentPath = normalizePath(current).toLowerCase()
    const currentFull = current.split('#')[0]
    // Same path+query as where we are → not useful, would look like nothing happened.
    if (target.split('#')[0] === currentFull) return false
    // Same pathname (ignoring query) is still allowed, because returning to a
    // catalog with different filters/params IS the desired behavior.
    void currentPath
  }

  return true
}

/**
 * Choose a sensible, guaranteed-safe fallback destination based on the section
 * of the site the user is currently in. Used when there is no valid stored
 * previous page (direct visit, refresh, new tab, or an unsafe previous page).
 *
 * @param currentPath  the pathname the user is currently on
 * @param explicitFallback  an optional caller-provided fallback (validated)
 */
export function resolveFallback(
  currentPath: string | null | undefined,
  explicitFallback?: string | null
): string {
  // A caller-provided fallback wins, but only if it is itself safe.
  if (isSafeBackTarget(explicitFallback, currentPath)) return explicitFallback

  const path = (currentPath ?? '/').toLowerCase()

  if (path.startsWith('/admin')) {
    // Admin section → admin dashboard (never the customer homepage).
    return '/admin'
  }
  if (path.startsWith('/account')) {
    return '/account'
  }
  if (
    path.startsWith('/products') ||
    path.startsWith('/search') ||
    path.startsWith('/compare') ||
    path.startsWith('/p/')
  ) {
    return '/products'
  }
  // Everything else (CMS, storefront info pages, cart, wishlist) → homepage.
  return '/'
}

/**
 * Given a stored previous location and the current location, produce the URL the
 * Back button should navigate to. Returns the previous page when it is safe,
 * otherwise the resolved fallback. Preserves query strings on the previous URL.
 */
export function computeBackTarget(args: {
  previous?: string | null
  current?: string | null
  fallback?: string | null
}): string {
  const { previous, current, fallback } = args
  if (isSafeBackTarget(previous, current)) return previous
  return resolveFallback(current, fallback)
}

/** Maximum number of entries retained in the per-tab history stack. */
export const MAX_HISTORY_ENTRIES = 10

/**
 * Append `entry` to the history `stack`, returning a NEW capped stack.
 * - Skips no-op consecutive duplicates (same URL as the current top).
 * - Caps the length at MAX_HISTORY_ENTRIES (drops oldest).
 * Pure so the sessionStorage-backed tracker can be unit-tested.
 */
export function pushHistoryEntry(stack: readonly string[], entry: string): string[] {
  if (!isInternalPath(entry)) return stack.slice(-MAX_HISTORY_ENTRIES)
  if (stack.length > 0 && stack[stack.length - 1] === entry) {
    return stack.slice(-MAX_HISTORY_ENTRIES)
  }
  return [...stack, entry].slice(-MAX_HISTORY_ENTRIES)
}
