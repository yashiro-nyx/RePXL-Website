# RePXL — Back Navigation

A single, history-aware **Back button**, placed **intentionally** based on page
hierarchy. Back buttons appear only where they add meaningful navigation — on
detail/nested pages and on checkout — and are kept off primary navigation pages
that already have the navbar, sidebar, or tabs.

---

## 1. Guiding principle — intentional, not universal

Every route is classified into one of four buckets:

| Class | Back button? | Why |
|---|---|---|
| **Primary navigation page** | No | Reached via navbar / account sidebar / admin sidebar / tabs. A generic Back adds clutter, not value. |
| **Detail / nested page** | Yes — contextual `PageBackLink` | The user drilled in; returning to the parent is useful. Prefer the actual previous page; fall back to the **parent**, not the homepage. |
| **Checkout / payment (form step)** | Yes — explicit **"Back to Cart"** (`/cart`) | Users need a safe way back to the cart without losing items. |
| **Special flow** (auth, payment result, print, modals) | No / flow-specific | Uses purpose-built controls; a generic Back could break the flow. |

This replaces the earlier "put it almost everywhere" approach, which made primary
pages feel cluttered.

---

## 2. Canonical component (unchanged design)

One component, one look, everywhere:

| Piece | File |
|---|---|
| `PageBackLink` — canonical placement wrapper (block-level, `mb-6`, left-aligned, before the heading) | `src/components/ui/BackButton.tsx` |
| `BackButton` — the shared button (SVG left-arrow, `repixl-*` tokens, hover/active/`focus-visible` ring, `min-h-[40px]`, dark/light aware) | `src/components/ui/BackButton.tsx` |
| `useSafeBack` + `NavigationHistoryProvider` (per-tab history, safe target) | `src/hooks/useNavigationHistory.tsx` |
| Pure rules (`isInternalPath`, `isSafeBackTarget`, `resolveFallback`, `computeBackTarget`, `pushHistoryEntry`) | `src/lib/back-navigation.ts` |

Props: `href` (explicit parent link), `fallback` (direct-visit fallback),
`label`, `className`. The accessible label reads `Back to <label>` — unless the
label already starts with "Back" (e.g. **"Back to Cart"**), in which case it is
used verbatim to avoid "Back to Back to Cart".

**Design is identical on every remaining Back button** — only the label/target
differs. No page-specific variants.

---

## 3. Refined rules by area

### Primary navigation — NO generic Back
- **Account tabs** — the Back button is **no longer injected by `AccountShell`**.
  Profile, Addresses, Reviews, Notifications, Vouchers, Security overview,
  Notification Settings, and the **My Purchases** listing rely on the persistent
  account sidebar.
- **Admin management pages** — the Back button is **no longer injected by the
  admin layout**. Dashboard, Cameras, Customers, Orders, Returns list, Vouchers,
  Logs, Settings, Reports, CMS, Accounts, Archived rely on the admin sidebar.
- **Storefront primary pages** — **Cart**, **Wishlist**, **Search**, **Compare**:
  no generic Back (navbar covers these).

### Detail / nested — contextual Back to the parent
| Page | `PageBackLink` target | Label |
|---|---|---|
| Order details (`/account/orders/[orderNumber]`) | `href="/account/orders"` | "My Purchases" |
| Return request (`/account/orders/[orderNumber]/return`) | ``href={`/account/orders/${orderNumber}`}`` | "Order" |
| MFA management (`/account/security/mfa`) | `href="/account/security"` | "Security" |
| Admin return details (`/admin/returns/[id]`) | `href="/admin/returns"` | "Returns" |

> Other admin "detail/edit" screens (camera edit, customer view, order view) are
> **modals** on their list pages, not separate routes — their own Close controls
> apply, so there is no separate page to add a Back button to. `admin/returns/[id]`
> is the one true nested admin route and carries the contextual Back.

### Explicitly-kept storefront pages
- **Catalog `/products`** — **contextual**. The Back button appears **only when
  the customer arrived through a homepage promotional entry point**, signalled by
  an explicit `from=home` query parameter (see §3a). When visible it returns to
  the homepage (`href="/"`, label "Home"). Navbar/footer/direct visits omit the
  parameter, so no Back appears there.
- **Product detail `/products/[slug]`** — keeps Back (fallback `/products`), in
  both the loaded and "not found" states.
- **Footer informational pages** — FAQ, Contact, Condition Grading,
  Shipping & Returns, Terms, Privacy — keep Back (label "Home", fallback `/`).
  **About is intentionally excluded** — it has **no** generic Back button,
  regardless of entry point.
- **CMS pages** (`/pages/[slug]`) via `CmsPageLayout` — keep Back.

### 3a. Explicit navigation context for the Cameras catalog

The Cameras Back button is driven by the user's **entry point**, not by browser
history (`window.history.length` cannot tell where the user came from and breaks
on refresh / new tab). Instead we use a small, explicit, validated query
parameter:

| Piece | Value |
|---|---|
| Param name (`HOME_CONTEXT_PARAM`) | `from` |
| Accepted value (`HOME_CONTEXT_VALUE`) | `home` |
| Example link | `/products?brand=canon&from=home` |

- **`withHomeContext(href)`** (in `src/lib/back-navigation.ts`) appends
  `from=home` to an internal `/products` link, preserving existing catalog params
  (brand, sort, search) and any hash, and never duplicating the param. It no-ops
  on non-`/products` or external hrefs.
- **`hasHomeNavContext(searchParams)`** returns true only for the exact
  `from=home` value. `/products` renders the `PageBackLink` only when this is true.
- **Eligible homepage promotional links** call `withHomeContext`: the Hero CTA,
  Deal banner, Promo duo (deals + staff pick), Find Your Era / brand gallery
  cards and spotlight CTAs, New Arrivals "view all", and Best Sellers "view all".
- **Navbar and footer** Cameras links deliberately do **not** use it, so standard
  navigation opens the catalog **without** the promotional context. This also
  prevents stale context: navigating promo-catalog → navbar Cameras clears it.
- The parameter is a **UX hint only** — never an auth/security mechanism — and it
  does not interfere with catalog filters or product queries (filters read
  `brand`, `sort`, etc. independently; `from` is ignored by the filter logic).
- **Refresh** preserves the intended context because the parameter lives in the
  URL (client-side filtering never rewrites it away).

### Checkout — explicit "Back to Cart"
- The **form step** of `/checkout` renders `PageBackLink href="/cart"
  label="Back to Cart"` in its header.
- It is a **plain link to `/cart`** — it does **not** clear the cart, cancel
  payment, cancel an order, or create a duplicate order/session (no order or
  payment session exists yet at the form step; the cart is server/DB-backed and
  untouched by navigation).
- The existing multi-step **"← Back to Edit"** control on the order-review step is
  **preserved** and unaffected.
- The **order-confirmed** screen and `/checkout/success` (payment result) get
  **no** Back button.

### Special flows — no generic Back
Auth pages (login/register/forgot/reset/mfa-login), `/checkout/success`, admin
login, admin dashboard root, print invoice/packing-slip (own print-safe links),
newsletter result pages, and all modals/pagination/lightbox/PaymentProcessor.

---

## 4. Navigation behavior (unchanged safety model)

- Contextual detail-page buttons use an explicit `href` to the **parent** section
  (so they never fall back to the homepage), and the value is still
  safety-validated.
- The history-aware buttons (catalog, footer pages) return to the **actual
  previous page**, preserving its query string, and fall back to a
  section-appropriate route on direct entry.
- Never navigates to an external URL, `/api/*`, `/auth/*` (OAuth callback),
  auth pages, `/checkout/success|processing`, or `/admin/login`; never loops.
- Purely client-side navigation — it cannot bypass the per-route server guards
  and never mutates cart/order/payment state.

---

## 5. Route classification matrix

| Route | Class | Back? |
|---|---|---|
| `/` | Primary (entry) | — |
| `/products` (Cameras catalog) | Contextual | ✅ **only** when `from=home` (→ homepage); ❌ otherwise |
| `/products/[slug]` | Detail | ✅ (fallback `/products`) |
| `/search` | Primary browse | — |
| `/compare` | Primary browse | — |
| `/cart` | Primary nav | — |
| `/wishlist` | Primary nav | — |
| `/checkout` (form step) | Checkout | ✅ **Back to Cart** → `/cart` |
| `/checkout` (review step) | Checkout multi-step | "Back to Edit" (existing) |
| `/checkout` (confirmed) / `/checkout/success` | Payment result | — |
| `/faq`, `/contact`, `/condition-grading`, `/shipping-returns`, `/terms`, `/privacy` | Footer info | ✅ (label "Home") |
| `/about` | Footer info | — (generic Back removed) |
| `/pages/[slug]` | CMS | ✅ |
| `/account`, `/account/profile`, `/addresses`, `/reviews`, `/notifications*`, `/notification-settings`, `/vouchers`, `/payments`, `/security`, `/security/password`, `/orders` (My Purchases) | Primary (account sidebar) | — |
| `/account/orders/[orderNumber]` | Detail | ✅ → "My Purchases" |
| `/account/orders/[orderNumber]/return` | Detail | ✅ → "Order" |
| `/account/security/mfa` | Detail | ✅ → "Security" |
| `/admin`, `/admin/cameras`, `/customers`, `/orders`, `/returns`, `/vouchers`, `/logs`, `/settings`, `/reports`, `/notifications`, `/accounts`, `/cms/*`, `/archived/*`, `/products` | Primary (admin sidebar) | — |
| `/admin/returns/[id]` | Detail | ✅ → "Returns" |
| `/admin/orders/[orderNumber]/invoice`, `/packing-slip` | Print | own print link |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/login/mfa`, `/admin/login` | Auth | — |

---

## 6. Verification results

**Automated:** `tsc --noEmit` clean; `next build` compiled successfully (68/68
static pages); `src/lib/back-navigation.test.ts` = **69 tests passing**. The suite
now asserts the hierarchy directly: an `it.each` list of pages that **must** show
Back (catalog, product detail, footer info, order detail, return request, MFA,
admin return detail) and an `it.each` list that **must not** (cart, wishlist,
search, compare, homepage, My Purchases list, `AccountShell`, auth pages,
`/checkout/success`), plus parent-target assertions and the checkout "Back to
Cart" checks.

**Browser (dev server, rendered HTML):** verified via the button's unique
`aria-label`:

| Journey / page | Expected | Observed |
|---|---|---|
| Account → Profile | no Back | ✅ none (`AccountShell` clean) |
| Profile → Addresses | no Back | ✅ none |
| Wishlist | no Back | ✅ none (0) |
| Cart | no Back | ✅ none (0) |
| Search / Compare | no Back | ✅ none (0) |
| `/checkout/success` (completed) | no Back | ✅ none (0) |
| Homepage | no Back | ✅ none (0) |
| Product detail | Back | ✅ present (1) |
| About / FAQ / Terms / Privacy | Back | ✅ present (1 each) |
| My Purchases → Order Details | Back → My Purchases | ✅ source + tests (`href="/account/orders"`) |
| Cart → Checkout | "Back to Cart" | ✅ ships in client bundle + tests |
| Find Your Era → Catalog | Back | ✅ source + tests |
| Admin listing → Return Details | Back → Returns | ✅ source + tests |

**Honest verification note.** `/products` (Suspense-gated) and `/checkout`
(client-gated on a `hydrated` flag, and auth-gated) render their content **after
client hydration**, so their Back button is not present in the raw server HTML a
`fetch` sees — it appears once the page hydrates in a real browser. Their presence
was confirmed by source, the production build, unit tests, and by finding the
literal **"Back to Cart"** string in the served client bundle. These two, plus the
authenticated **account/admin detail** DOM, were **not** observed in a real logged-in
browser session here (no headless browser / interactive session was available) and
should be spot-checked manually. Everything else was confirmed in rendered HTML.

---

## 7. Files changed in this refinement

| File | Change |
|---|---|
| `src/components/ui/BackButton.tsx` | Smarter `aria-label` (verbatim when label starts with "Back"). |
| `src/components/account/AccountShell.tsx` | **Removed** shell-level Back (primary account tabs stay clean). |
| `src/app/(admin)/admin/layout.tsx` | **Removed** shell-level Back (primary admin pages stay clean). |
| `src/app/(storefront)/cart/page.tsx` | **Removed** Back (primary nav). |
| `src/app/(storefront)/wishlist/page.tsx` | **Removed** Back (primary nav). |
| `src/app/(storefront)/search/page.tsx` | **Removed** Back (primary browse). |
| `src/app/(storefront)/compare/page.tsx` | **Removed** Back (primary browse). |
| `src/app/(storefront)/account/orders/[orderNumber]/page.tsx` | **Added** contextual Back → "My Purchases". |
| `src/app/(storefront)/account/orders/[orderNumber]/return/page.tsx` | **Added** contextual Back → parent order. |
| `src/app/(storefront)/account/security/mfa/page.tsx` | **Added** contextual Back → "Security". |
| `src/app/(admin)/admin/returns/[id]/page.tsx` | **Added** contextual Back → "Returns". |
| `src/app/(storefront)/checkout/page.tsx` | **Added** "Back to Cart" (`/cart`) on the form step; review-step "Back to Edit" preserved. |
| `src/lib/back-navigation.test.ts` | Rewritten to assert the refined hierarchy (69 tests). |

_Kept unchanged:_ product detail, footer info pages
(`faq`/`contact`/`condition-grading`/`shipping-returns`/`terms`/`privacy`),
`CmsPageLayout`, and the core (`useNavigationHistory.tsx`, root-layout provider
mount).

---

## 8. Follow-up refinement — contextual Cameras Back button

The Cameras catalog (`/products`) Back button was made **context-aware** so it
depends on the user's entry point, and the generic Back button was **removed from
About**.

### Behaviour

| Journey | Back button |
|---|---|
| Homepage → Find Your Era → Cameras | ✅ visible → homepage |
| Homepage → Promotional banner → Cameras | ✅ visible → homepage |
| Homepage → Featured camera/brand collection → Cameras | ✅ visible → homepage |
| Navbar → Cameras | ❌ hidden |
| Direct visit to `/products` | ❌ hidden |
| Refresh a promotional catalog view | ✅ preserved (context is in the URL) |
| Apply a filter within a promotional catalog view | ✅ context preserved (client-side filtering keeps the URL) |
| Promotional catalog → Navbar Cameras | ❌ context cleared (navbar link is context-free) |

The mechanism is the explicit `from=home` query parameter (see §3a) — **not**
`window.history.length`. Catalog filters, brand params, sorting and search are
fully preserved (`/products?brand=canon` still applies the Canon filter, and the
promo variant is simply `/products?brand=canon&from=home`).

### Files changed in this refinement

| File | Change |
|---|---|
| `src/lib/back-navigation.ts` | Added `HOME_CONTEXT_PARAM`, `HOME_CONTEXT_VALUE`, `hasHomeNavContext()`, `withHomeContext()`. |
| `src/app/(storefront)/products/page.tsx` | Renders `PageBackLink href="/" label="Home"` **only** when `hasHomeNavContext(searchParams)`. |
| `src/components/landing/Hero.tsx` | Hero CTA catalog link tagged via `withHomeContext`. |
| `src/components/landing/DealBanner.tsx` | Internal deal link tagged via `withHomeContext`. |
| `src/components/landing/PromoDuo.tsx` | Deal + staff-pick links tagged via `withHomeContext`. |
| `src/components/landing/BrandGallery.tsx` | Find Your Era brand card + spotlight CTAs tagged via `withHomeContext`. |
| `src/components/landing/NewArrivals.tsx` | "View all" link tagged via `withHomeContext`. |
| `src/components/landing/BestSellers.tsx` | "View all" CTA tagged via `withHomeContext`. |
| `src/app/(storefront)/about/page.tsx` | **Removed** the generic `PageBackLink` (and its import). |
| `src/lib/back-navigation.test.ts` | Added `hasHomeNavContext`/`withHomeContext` unit tests; moved `/products` to a context-gated assertion; moved `/about` to the "no back" list; added promo-link + navbar/footer context assertions. |

_Kept unchanged:_ `PageBackLink`/`BackButton` design, `Navbar`, `Footer`, the
history core (`useNavigationHistory.tsx`), and all other pages' back behaviour.
