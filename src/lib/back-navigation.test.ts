import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  isInternalPath,
  isSafeBackTarget,
  resolveFallback,
  computeBackTarget,
  pushHistoryEntry,
  MAX_HISTORY_ENTRIES,
  UNSAFE_BACK_PREFIXES,
  hasHomeNavContext,
  withHomeContext,
  HOME_CONTEXT_PARAM,
  HOME_CONTEXT_VALUE,
} from './back-navigation'

// ─── isInternalPath: external-URL avoidance ──────────────────────────────────────
describe('isInternalPath — never treat external/untrusted values as internal', () => {
  it('accepts same-origin absolute paths (with query preserved)', () => {
    expect(isInternalPath('/products')).toBe(true)
    expect(isInternalPath('/products?brand=canon&sort=price-asc')).toBe(true)
    expect(isInternalPath('/account/orders/RPX-123')).toBe(true)
    expect(isInternalPath('/')).toBe(true)
  })

  it('rejects absolute external URLs', () => {
    expect(isInternalPath('http://evil.com')).toBe(false)
    expect(isInternalPath('https://evil.com/products')).toBe(false)
    expect(isInternalPath('https://repxlph.vercel.app/products')).toBe(false)
  })

  it('rejects protocol-relative and backslash tricks', () => {
    expect(isInternalPath('//evil.com')).toBe(false)
    expect(isInternalPath('/\\evil.com')).toBe(false)
    expect(isInternalPath('/\tfoo')).toBe(false)
  })

  it('rejects non-path schemes and empty/nullish values', () => {
    expect(isInternalPath('javascript:alert(1)')).toBe(false)
    expect(isInternalPath('mailto:a@b.com')).toBe(false)
    expect(isInternalPath('products')).toBe(false)
    expect(isInternalPath('')).toBe(false)
    expect(isInternalPath('   ')).toBe(false)
    expect(isInternalPath(null)).toBe(false)
    expect(isInternalPath(undefined)).toBe(false)
  })
})

// ─── isSafeBackTarget: auth/callback exclusions + loop avoidance ──────────────────
describe('isSafeBackTarget — respects auth/callback boundaries and avoids loops', () => {
  it('accepts ordinary internal pages, preserving query strings', () => {
    expect(isSafeBackTarget('/products?brand=canon', '/products/xyz')).toBe(true)
    expect(isSafeBackTarget('/search?q=leica', '/products/leica-m9')).toBe(true)
    expect(isSafeBackTarget('/account/orders', '/account/orders/RPX-1')).toBe(true)
  })

  it('rejects auth, OAuth callback, and API routes', () => {
    expect(isSafeBackTarget('/login', '/account')).toBe(false)
    expect(isSafeBackTarget('/register', '/account')).toBe(false)
    expect(isSafeBackTarget('/forgot-password', '/login')).toBe(false)
    expect(isSafeBackTarget('/reset-password?token=x', '/login')).toBe(false)
    expect(isSafeBackTarget('/auth/callback/google', '/account')).toBe(false)
    expect(isSafeBackTarget('/auth/mobile-google', '/account')).toBe(false)
    expect(isSafeBackTarget('/api/auth/callback/google', '/account')).toBe(false)
    expect(isSafeBackTarget('/admin/login', '/admin')).toBe(false)
  })

  it('rejects payment result / processing routes', () => {
    expect(isSafeBackTarget('/checkout/success?order=RPX-1', '/account')).toBe(false)
    expect(isSafeBackTarget('/checkout/processing', '/account')).toBe(false)
  })

  it('does not let an unsafe prefix match a legitimately-named sibling route', () => {
    // "/loginary" or "/registerions" must NOT be treated as the auth routes.
    expect(isSafeBackTarget('/loginary', '/x')).toBe(true)
    expect(isSafeBackTarget('/registered-cameras', '/x')).toBe(true)
  })

  it('rejects returning to the exact same URL (no-op loop)', () => {
    expect(isSafeBackTarget('/products?brand=canon', '/products?brand=canon')).toBe(false)
    expect(isSafeBackTarget('/account', '/account')).toBe(false)
  })

  it('allows same pathname with different query (filter/pagination change is desired)', () => {
    expect(isSafeBackTarget('/products?brand=canon', '/products?brand=nikon')).toBe(true)
  })

  it('rejects external targets outright', () => {
    expect(isSafeBackTarget('https://evil.com', '/account')).toBe(false)
    expect(isSafeBackTarget('//evil.com', '/account')).toBe(false)
  })

  it('every declared UNSAFE_BACK_PREFIX is actually rejected', () => {
    for (const prefix of UNSAFE_BACK_PREFIXES) {
      const sample = prefix.endsWith('/') ? `${prefix}something` : prefix
      expect(isSafeBackTarget(sample, '/somewhere-else')).toBe(false)
    }
  })
})

// ─── resolveFallback: section-appropriate, never external ─────────────────────────
describe('resolveFallback — safe, section-appropriate defaults', () => {
  it('admin pages fall back to the admin dashboard (never the customer homepage)', () => {
    expect(resolveFallback('/admin/returns/abc')).toBe('/admin')
    expect(resolveFallback('/admin/cameras')).toBe('/admin')
  })

  it('account pages fall back to the account root', () => {
    expect(resolveFallback('/account/orders/RPX-1')).toBe('/account')
  })

  it('catalog family falls back to /products', () => {
    expect(resolveFallback('/products/leica-m9')).toBe('/products')
    expect(resolveFallback('/search?q=x')).toBe('/products')
    expect(resolveFallback('/compare')).toBe('/products')
    expect(resolveFallback('/p/leica-m9')).toBe('/products')
  })

  it('everything else falls back to home', () => {
    expect(resolveFallback('/faq')).toBe('/')
    expect(resolveFallback('/cart')).toBe('/')
    expect(resolveFallback(null)).toBe('/')
  })

  it('honours a caller-provided fallback only when it is safe', () => {
    expect(resolveFallback('/faq', '/products')).toBe('/products')
    // Unsafe explicit fallback is ignored in favour of the safe default.
    expect(resolveFallback('/faq', 'https://evil.com')).toBe('/')
    expect(resolveFallback('/admin/x', '/login')).toBe('/admin')
  })
})

// ─── computeBackTarget: previous-page-first, else fallback ────────────────────────
describe('computeBackTarget — returns previous in-app page or a safe fallback', () => {
  it('returns the actual previous page (with its params) when safe', () => {
    expect(
      computeBackTarget({ previous: '/products?brand=canon&sort=price-asc', current: '/products/canon-a1' })
    ).toBe('/products?brand=canon&sort=price-asc')
  })

  it('falls back when there is no previous page (direct visit / new tab)', () => {
    expect(computeBackTarget({ previous: null, current: '/products/canon-a1' })).toBe('/products')
    expect(computeBackTarget({ previous: undefined, current: '/admin/returns/x' })).toBe('/admin')
  })

  it('falls back when the previous page is unsafe (auth/callback)', () => {
    expect(computeBackTarget({ previous: '/login', current: '/account' })).toBe('/account')
    expect(computeBackTarget({ previous: '/auth/callback/google', current: '/account/profile' })).toBe('/account')
  })

  it('never returns an external URL through the previous entry', () => {
    const target = computeBackTarget({ previous: 'https://evil.com', current: '/account' })
    expect(isInternalPath(target)).toBe(true)
    expect(target).toBe('/account')
  })
})

// ─── pushHistoryEntry: per-tab stack behavior (refresh / dedup / cap) ─────────────
describe('pushHistoryEntry — dedup, cap, and internal-only stack', () => {
  it('appends a new internal entry', () => {
    expect(pushHistoryEntry([], '/products')).toEqual(['/products'])
    expect(pushHistoryEntry(['/a'], '/b')).toEqual(['/a', '/b'])
  })

  it('skips consecutive duplicate entries', () => {
    expect(pushHistoryEntry(['/products'], '/products')).toEqual(['/products'])
  })

  it('never stores external/invalid entries', () => {
    expect(pushHistoryEntry(['/a'], 'https://evil.com')).toEqual(['/a'])
    expect(pushHistoryEntry(['/a'], '//evil.com')).toEqual(['/a'])
    expect(pushHistoryEntry([], '')).toEqual([])
  })

  it('caps the stack length at MAX_HISTORY_ENTRIES (drops oldest)', () => {
    let stack: string[] = []
    for (let i = 0; i < MAX_HISTORY_ENTRIES + 5; i++) {
      stack = pushHistoryEntry(stack, `/page-${i}`)
    }
    expect(stack).toHaveLength(MAX_HISTORY_ENTRIES)
    // Oldest dropped; newest retained.
    expect(stack[stack.length - 1]).toBe(`/page-${MAX_HISTORY_ENTRIES + 4}`)
    expect(stack[0]).toBe('/page-5')
  })
})

// ─── Homepage-promo navigation context (Cameras Back button gate) ─────────────────
describe('hasHomeNavContext — explicit, validated homepage-promo context', () => {
  it('is true only for the exact from=home value (via URLSearchParams)', () => {
    expect(hasHomeNavContext(new URLSearchParams('from=home'))).toBe(true)
    expect(hasHomeNavContext(new URLSearchParams('brand=canon&from=home'))).toBe(true)
    expect(hasHomeNavContext(new URLSearchParams('from=home&sort=newest'))).toBe(true)
  })

  it('is false for a missing, empty, or non-matching context value', () => {
    expect(hasHomeNavContext(new URLSearchParams(''))).toBe(false)
    expect(hasHomeNavContext(new URLSearchParams('brand=canon'))).toBe(false)
    expect(hasHomeNavContext(new URLSearchParams('from=foo'))).toBe(false)
    expect(hasHomeNavContext(new URLSearchParams('from='))).toBe(false)
    expect(hasHomeNavContext(new URLSearchParams('from=HOME'))).toBe(false)
  })

  it('accepts a plain object map as well as URLSearchParams-like objects', () => {
    expect(hasHomeNavContext({ from: 'home' })).toBe(true)
    expect(hasHomeNavContext({ from: 'home', brand: 'canon' })).toBe(true)
    expect(hasHomeNavContext({ from: ['home'] })).toBe(true)
    expect(hasHomeNavContext({ brand: 'canon' })).toBe(false)
    expect(hasHomeNavContext({ from: 'nope' })).toBe(false)
  })

  it('is false for nullish params', () => {
    expect(hasHomeNavContext(null)).toBe(false)
    expect(hasHomeNavContext(undefined)).toBe(false)
  })

  it('uses the documented param name/value constants', () => {
    expect(HOME_CONTEXT_PARAM).toBe('from')
    expect(HOME_CONTEXT_VALUE).toBe('home')
  })
})

describe('withHomeContext — tag catalog links without harming filters', () => {
  it('adds from=home to a bare /products link', () => {
    expect(withHomeContext('/products')).toBe('/products?from=home')
  })

  it('preserves existing catalog params (brand, sort, search) exactly', () => {
    expect(withHomeContext('/products?brand=canon')).toBe('/products?brand=canon&from=home')
    expect(withHomeContext('/products?sort=newest')).toBe('/products?sort=newest&from=home')
    expect(hasHomeNavContext(new URLSearchParams(withHomeContext('/products?brand=canon').split('?')[1]))).toBe(true)
    // The pre-existing brand filter survives untouched.
    expect(withHomeContext('/products?brand=canon')).toContain('brand=canon')
  })

  it('does not duplicate an already-present context', () => {
    expect(withHomeContext('/products?from=home')).toBe('/products?from=home')
    expect(withHomeContext('/products?brand=canon&from=home')).toBe('/products?brand=canon&from=home')
  })

  it('preserves a hash fragment', () => {
    expect(withHomeContext('/products?brand=canon#grid')).toBe('/products?brand=canon&from=home#grid')
  })

  it('only tags the Cameras catalog — leaves other internal routes unchanged', () => {
    expect(withHomeContext('/products/leica-m9')).toBe('/products/leica-m9')
    expect(withHomeContext('/compare')).toBe('/compare')
    expect(withHomeContext('/')).toBe('/')
  })

  it('never tags an external/unsafe href', () => {
    expect(withHomeContext('https://evil.com/products')).toBe('https://evil.com/products')
    expect(withHomeContext('//evil.com')).toBe('//evil.com')
  })
})

// ─── Component / integration source assertions ────────────────────────────────────
describe('BackButton component — design, a11y, and history-aware wiring', () => {
  const src = readFileSync('src/components/ui/BackButton.tsx', 'utf8')

  it('uses the shared history-aware hook, not a blind router.back()', () => {
    expect(src).toContain('useSafeBack')
    expect(src).not.toContain('router.back()')
  })

  it('renders an accessible left-arrow SVG icon (no emoji)', () => {
    expect(src).toContain('<svg')
    expect(src).toContain('aria-hidden="true"')
    // The arrow path (points left) is present.
    expect(src).toContain('M19 12H5')
    // No emoji arrow characters.
    expect(src).not.toMatch(/[\u2190\u2B05\uD83D]/)
  })

  it('exposes an accessible label and visible keyboard focus ring', () => {
    expect(src).toContain('aria-label')
    expect(src).toContain('focus-visible:ring')
  })

  it('meets a minimum touch-target height and uses themeable design tokens', () => {
    expect(src).toContain('min-h-[40px]')
    // repixl-* tokens automatically adapt to light theme via globals.css.
    expect(src).toContain('text-repixl-muted')
    expect(src).toContain('bg-repixl-charcoal')
  })

  it('keeps the href path as a real anchor (keyboard/middle-click/prefetch)', () => {
    expect(src).toContain('<Link')
  })
})

// ─── Canonical placement wrapper ─────────────────────────────────────────────────
describe('PageBackLink — single canonical placement wrapper', () => {
  const src = readFileSync('src/components/ui/BackButton.tsx', 'utf8')

  it('is defined and renders the shared BackButton (one visual identity)', () => {
    expect(src).toContain('export function PageBackLink')
    // Its body renders the same BackButton — no bespoke button markup.
    expect(src).toMatch(/PageBackLink[\s\S]*<BackButton/)
  })

  it('applies consistent block-level placement with standard bottom spacing', () => {
    // The wrapper provides the shared spacing/alignment so pages never hand-roll it.
    expect(src).toMatch(/PageBackLink[\s\S]*mb-6 flex/)
  })

  it('is exported from the ui barrel alongside BackButton', () => {
    const barrel = readFileSync('src/components/ui/index.ts', 'utf8')
    expect(barrel).toContain("export { BackButton, PageBackLink } from './BackButton'")
  })
})

describe('Back navigation integration — intentional, hierarchy-based placement', () => {
  it('history provider is mounted once in the root layout', () => {
    const layout = readFileSync('src/app/layout.tsx', 'utf8')
    expect(layout).toContain('NavigationHistoryProvider')
    expect(layout.match(/<NavigationHistoryProvider>/g)).toHaveLength(1)
  })

  it('CmsPageLayout uses the shared history-aware back control with a safe fallback', () => {
    const cms = readFileSync('src/components/layout/CmsPageLayout.tsx', 'utf8')
    expect(cms).toContain('BackButton')
    expect(cms).toContain('fallback={backHref}')
    expect(cms).not.toContain('←')
  })

  // ── DETAIL / NESTED + explicitly-kept storefront pages: MUST render a back control ──
  const pagesThatShouldHaveBack: Array<[label: string, file: string]> = [
    ['/products/[slug] (product details)', 'src/app/(storefront)/products/[slug]/page.tsx'],
    ['/faq (footer info)', 'src/app/(storefront)/faq/page.tsx'],
    ['/contact (footer info)', 'src/app/(storefront)/contact/page.tsx'],
    ['/condition-grading (footer info)', 'src/app/(storefront)/condition-grading/page.tsx'],
    ['/shipping-returns (footer info)', 'src/app/(storefront)/shipping-returns/page.tsx'],
    ['/terms (footer info)', 'src/app/(storefront)/terms/page.tsx'],
    ['/privacy (footer info)', 'src/app/(storefront)/privacy/page.tsx'],
    ['order details (nested)', 'src/app/(storefront)/account/orders/[orderNumber]/page.tsx'],
    ['return request (nested)', 'src/app/(storefront)/account/orders/[orderNumber]/return/page.tsx'],
    ['MFA management (nested)', 'src/app/(storefront)/account/security/mfa/page.tsx'],
    ['admin return details (nested)', 'src/app/(admin)/admin/returns/[id]/page.tsx'],
  ]

  it.each(pagesThatShouldHaveBack)('renders a back control on %s', (_label, file) => {
    const src = readFileSync(file, 'utf8')
    expect(src).toMatch(/<(PageBackLink|BackButton)\b/)
  })

  // ── PRIMARY NAVIGATION pages: MUST NOT render a generic back control ───────────
  const primaryNavPagesWithoutBack: Array<[label: string, file: string]> = [
    ['cart', 'src/app/(storefront)/cart/page.tsx'],
    ['wishlist', 'src/app/(storefront)/wishlist/page.tsx'],
    ['search', 'src/app/(storefront)/search/page.tsx'],
    ['compare', 'src/app/(storefront)/compare/page.tsx'],
    ['homepage', 'src/app/page.tsx'],
    ['about (no generic back — removed)', 'src/app/(storefront)/about/page.tsx'],
    ['account: My Purchases list', 'src/app/(storefront)/account/orders/page.tsx'],
    ['account: profile shell', 'src/components/account/AccountShell.tsx'],
    ['auth: login', 'src/app/(auth)/login/page.tsx'],
    ['auth: register', 'src/app/(auth)/register/page.tsx'],
    ['auth: forgot-password', 'src/app/(auth)/forgot-password/page.tsx'],
    ['auth: reset-password', 'src/app/(auth)/reset-password/page.tsx'],
    ['checkout: order-confirmed success page', 'src/app/(storefront)/checkout/success/page.tsx'],
  ]

  it.each(primaryNavPagesWithoutBack)('does NOT render a generic back control on %s', (_label, file) => {
    const src = readFileSync(file, 'utf8')
    expect(src).not.toMatch(/<(PageBackLink|BackButton)\b/)
  })

  it('AccountShell no longer injects a shell-level back button (primary account tabs stay clean)', () => {
    const shell = readFileSync('src/components/account/AccountShell.tsx', 'utf8')
    expect(shell).not.toMatch(/<(PageBackLink|BackButton)\b/)
  })

  it('admin layout no longer injects a shell-level back button (primary admin pages stay clean)', () => {
    const layout = readFileSync('src/app/(admin)/admin/layout.tsx', 'utf8')
    expect(layout).not.toMatch(/<(PageBackLink|BackButton)\b/)
  })

  // ── Detail pages return to their PARENT, not the homepage ──────────────────────
  it('order details returns to My Purchases (parent), not homepage', () => {
    const src = readFileSync('src/app/(storefront)/account/orders/[orderNumber]/page.tsx', 'utf8')
    expect(src).toMatch(/<PageBackLink[^>]*href="\/account\/orders"/)
  })

  it('MFA management returns to the Security overview (parent)', () => {
    const src = readFileSync('src/app/(storefront)/account/security/mfa/page.tsx', 'utf8')
    expect(src).toMatch(/<PageBackLink[^>]*href="\/account\/security"/)
  })

  it('return request returns to its order-detail page (parent)', () => {
    const src = readFileSync('src/app/(storefront)/account/orders/[orderNumber]/return/page.tsx', 'utf8')
    expect(src).toMatch(/<PageBackLink[^>]*href=\{`\/account\/orders\/\$\{orderNumber\}`\}/)
  })

  it('admin return details returns to the Returns list (parent)', () => {
    const src = readFileSync('src/app/(admin)/admin/returns/[id]/page.tsx', 'utf8')
    expect(src).toMatch(/<PageBackLink[^>]*href="\/admin\/returns"/)
  })

  // ── Checkout: explicit "Back to Cart" ──────────────────────────────────────────
  it('checkout form step has an explicit "Back to Cart" linking to /cart', () => {
    const src = readFileSync('src/app/(storefront)/checkout/page.tsx', 'utf8')
    expect(src).toMatch(/<PageBackLink[^>]*href="\/cart"[^>]*label="Back to Cart"/)
  })

  it('the Back to Cart link cannot clear the cart or change order state (it is a plain link)', () => {
    const src = readFileSync('src/app/(storefront)/checkout/page.tsx', 'utf8')
    // The PageBackLink uses href (a Link) — it has no onClick that mutates cart/order.
    expect(src).toMatch(/<PageBackLink href="\/cart" label="Back to Cart" \/>/)
    // Sanity: the destructive cart op is not wired to the back control.
    expect(src).not.toMatch(/PageBackLink[^>]*clearCart/)
  })

  it('checkout keeps its multi-step "Back to Edit" navigation intact', () => {
    const src = readFileSync('src/app/(storefront)/checkout/page.tsx', 'utf8')
    expect(src).toContain('Back to Edit')
  })
})

// ─── Contextual Cameras (/products) Back button — depends on entry point ──────────
describe('Cameras catalog Back button — shown only for homepage-promo entry', () => {
  const catalog = readFileSync('src/app/(storefront)/products/page.tsx', 'utf8')

  it('gates the PageBackLink on the explicit home-nav context (not history.length)', () => {
    // The back control is rendered conditionally on the context flag.
    expect(catalog).toContain('hasHomeNavContext')
    expect(catalog).toMatch(/cameFromHome\s*&&\s*<PageBackLink/)
    // It must NOT decide visibility from browser history length.
    expect(catalog).not.toContain('history.length')
  })

  it('returns to the homepage when visible', () => {
    expect(catalog).toMatch(/<PageBackLink[^>]*href="\/"/)
  })

  it('still reads the brand filter from the query (context does not replace filters)', () => {
    expect(catalog).toContain("searchParams.get('brand')")
  })

  // Eligible homepage promotional entry points must tag the catalog link.
  const promoEntryPoints: Array<[label: string, file: string]> = [
    ['Hero CTA', 'src/components/landing/Hero.tsx'],
    ['Deal banner', 'src/components/landing/DealBanner.tsx'],
    ['Promo duo (deals + staff pick)', 'src/components/landing/PromoDuo.tsx'],
    ['Find Your Era / brand gallery', 'src/components/landing/BrandGallery.tsx'],
    ['New arrivals', 'src/components/landing/NewArrivals.tsx'],
    ['Best sellers', 'src/components/landing/BestSellers.tsx'],
  ]

  it.each(promoEntryPoints)('%s applies the home-nav context to its catalog link', (_label, file) => {
    const src = readFileSync(file, 'utf8')
    expect(src).toContain('withHomeContext')
  })

  it('the navbar Cameras link stays context-free (standard navigation)', () => {
    const navbar = readFileSync('src/components/layout/Navbar.tsx', 'utf8')
    expect(navbar).toContain('href="/products"')
    expect(navbar).not.toContain('withHomeContext')
    expect(navbar).not.toContain('from=home')
  })

  it('the footer Cameras links stay context-free (standard navigation)', () => {
    const footer = readFileSync('src/components/layout/Footer.tsx', 'utf8')
    expect(footer).not.toContain('withHomeContext')
    expect(footer).not.toContain('from=home')
  })
})
