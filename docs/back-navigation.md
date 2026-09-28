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
- **Catalog `/products`** (the **Find Your Era** destination) — keeps Back
  (history-aware, fallback `/`), so `Homepage → Find Your Era → Catalog → Back`
  returns to the homepage.
- **Product detail `/products/[slug]`** — keeps Back (fallback `/products`), in
  both the loaded and "not found" states.
- **Footer informational pages** — About, FAQ, Contact, Condition Grading,
  Shipping & Returns, Terms, Privacy — keep Back (label "Home", fallback `/`).
- **CMS pages** (`/pages/[slug]`) via `CmsPageLayout` — keep Back.

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
| `/products` (catalog / Find Your Era dest) | Kept storefront | ✅ (fallback `/`) |
| `/products/[slug]` | Detail | ✅ (fallback `/products`) |
| `/search` | Primary browse | — |
| `/compare` | Primary browse | — |
| `/cart` | Primary nav | — |
| `/wishlist` | Primary nav | — |
| `/checkout` (form step) | Checkout | ✅ **Back to Cart** → `/cart` |
| `/checkout` (review step) | Checkout multi-step | "Back to Edit" (existing) |
| `/checkout` (confirmed) / `/checkout/success` | Payment result | — |
| `/about`, `/faq`, `/contact`, `/condition-grading`, `/shipping-returns`, `/terms`, `/privacy` | Footer info | ✅ (label "Home") |
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

_Kept unchanged:_ catalog `/products`, product detail, footer info pages
(`about`/`faq`/`contact`/`condition-grading`/`shipping-returns`/`terms`/`privacy`),
`CmsPageLayout`, and the core (`useNavigationHistory.tsx`, `back-navigation.ts`,
root-layout provider mount).
