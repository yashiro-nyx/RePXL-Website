# RePXL ? Navigation and Customer Support

This guide documents current website navigation and the floating AI Concierge.
It replaces the separate back-navigation and chat-widget guides. Checkout,
returns, notification delivery, and mobile release details have their own guides.

- [Back navigation](#back-navigation)
- [AI Concierge](#ai-concierge)
- [Returns](./returns.md)
- [Notifications](./communications.md#in-app-notifications)

## Back navigation

A single, history-aware **Back button**, placed **intentionally** based on page
hierarchy. Back buttons appear only where they add meaningful navigation — on
detail/nested pages and on checkout — and are kept off primary navigation pages
that already have the navbar, sidebar, or tabs.

---

### 1. Guiding principle — intentional, not universal

Every route is classified into one of four buckets:

| Class | Back button? | Why |
|---|---|---|
| **Primary navigation page** | No | Reached via navbar / account sidebar / admin sidebar / tabs. A generic Back adds clutter, not value. |
| **Detail / nested page** | Yes — contextual `PageBackLink` | The user drilled in; returning to the parent is useful. Prefer the actual previous page; fall back to the **parent**, not the homepage. |
| **Checkout / payment (form step)** | Yes — explicit **"Back to Cart"** (`/cart`) | Users need a safe way back to the cart without losing items. |
| **Special flow** (auth, payment result, print, modals) | No / flow-specific | Uses purpose-built controls; a generic Back could break the flow. |


---

### 2. Shared component

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

### 3. Rules by area

#### Primary navigation — NO generic Back
- **Account tabs** — the Back button is **no longer injected by `AccountShell`**.
  Profile, Addresses, Reviews, Notifications, Vouchers, Security overview,
  Notification Settings, and the **My Purchases** listing rely on the persistent
  account sidebar.
- **Admin management pages** — the Back button is **no longer injected by the
  admin layout**. Dashboard, Cameras, Customers, Orders, Returns list, Vouchers,
  Logs, Settings, Reports, CMS, Accounts, Archived rely on the admin sidebar.
- **Storefront primary pages** — **Cart**, **Wishlist**, **Search**, **Compare**:
  no generic Back (navbar covers these).

#### Detail / nested — contextual Back to the parent
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

#### Explicitly-kept storefront pages
- **Catalog `/products`** — **contextual**. The Back button appears **only when
  the customer arrived through a homepage promotional entry point**, signalled by
  an explicit `from=home` query parameter (see the catalog context section). When visible it returns to
  the homepage (`href="/"`, label "Home"). Navbar/footer/direct visits omit the
  parameter, so no Back appears there.
- **Product detail `/products/[slug]`** — keeps Back (fallback `/products`), in
  both the loaded and "not found" states.
- **Footer informational pages** — FAQ, Contact, Condition Grading,
  Shipping & Returns, Terms, Privacy — keep Back (label "Home", fallback `/`).
  **About is intentionally excluded** — it has **no** generic Back button,
  regardless of entry point.
- **CMS pages** (`/pages/[slug]`) via `CmsPageLayout` — keep Back.

#### 3a. Explicit navigation context for the Cameras catalog

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

#### Checkout — explicit "Back to Cart"
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

#### Special flows — no generic Back
Auth pages (login/register/forgot/reset/mfa-login), `/checkout/success`, admin
login, admin dashboard root, print invoice/packing-slip (own print-safe links),
newsletter result pages, and all modals/pagination/lightbox/PaymentProcessor.

---

### 4. Navigation behavior

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

### 5. Route classification matrix

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

### Verification and remaining checks

`src/lib/back-navigation.test.ts` covers route hierarchy, parent destinations,
checkout controls, catalog context helpers, and promotional links. Previous
implementation checks passed, but the old browser observations predated the
About/catalog refinements and have been removed to avoid presenting them as
current behavior. Logged-in account/admin navigation and hydrated catalog/
checkout interactions still require a browser check. No browser checks or
application tests were rerun for this documentation-only cleanup.

## AI Concierge

A floating support widget on the customer storefront that reuses the mobile
app's existing **AI Concierge** logic. This documents what is implemented today
and what is intentionally out of scope.

---

### 1. What it is (and is not)

- **It is** an *automated* AI concierge — a pure, local, rule-based responder.
  The UI labels it "Automated assistant" and never implies a live human is
  online. When a question needs a person, it routes the customer to **Contact**
  (`/contact`) / `support@repxl.com`.
- **It is not** human live chat, and there is **no chat backend, database table,
  network call, or message queue**. Responses are generated client-side.

### 2. Reuse of the mobile chat

The mobile Support screen (`react-native/app/support.tsx`) generates replies with
`generateAiResponse()` from `react-native/data/ai-concierge.ts` — a dependency-free,
rule-based function returning `{ text, suggestedFollowUps?, action? }`.

Because that logic is pure and framework-agnostic, the website reuses it via a
**faithful port**, `src/lib/ai-concierge.ts` (same prompts, same branches, same
copy). The web build does not import across the `react-native/` boundary; instead
a parity test (`src/lib/ai-concierge.test.ts`) imports **both** modules and
asserts identical output for a broad query set, so the two can't silently drift.

> If you change the concierge copy/branches, change **both** files (or extract
> them into a shared package). The parity test will fail otherwise.

The concierge's platform-neutral `action.type` is mapped to real storefront
routes by `webActionHref()`:

| action.type | Web route |
|---|---|
| `orders` | `/account/orders` |
| `browse` | `/products` |
| `faq` | `/faq` |
| `contact` | `/contact` |
| `compare` | `/compare` |

Order/account destinations are protected by their own pages/APIs — the widget
only produces a link and never bypasses authentication or ownership checks. The
concierge never fabricates order/tracking/account data; order questions return
guidance that points to the authenticated Orders page.

### 3. Components

| File | Role |
|---|---|
| `src/lib/ai-concierge.ts` | Shared concierge logic (port) + `webActionHref` |
| `src/components/chat/ChatWidget.tsx` | Floating launcher + expandable panel, messages, input, states |
| `src/components/chat/ConditionalChatWidget.tsx` | Route gate (where the widget shows) |
| `src/app/layout.tsx` | Mounts `<ConditionalChatWidget />` once (root layout) |
| `src/app/globals.css` | `chatIn` panel entrance keyframe |

### 4. Where it appears

Mounted once in the root layout and shown on the storefront, **hidden** on:
`/admin/*`, `/login`, `/register`, `/forgot-password`, `/reset-password`,
`/checkout/success`, `/checkout/processing`. It remains available on the checkout
form step so shoppers can ask questions mid-purchase. It uses `z-[60]` and
`env(safe-area-inset-*)` padding so it doesn't obstruct the navbar or sticky UI.

### 5. Conversation behavior & persistence

- Unknown or unrelated questions use the same standard reply on website/mobile:
  "Thanks for your question. I don't have enough information to answer that
  accurately. I can help with RePXL cameras, condition grading, orders, shipping,
  payments, and returns. Please rephrase your question or choose a suggested
  topic. If you still need help, contact our support team through Contact Us."
  It offers grading, order, and payment follow-ups plus a Contact Support action.
- A topic-context check prevents broad words such as `good`, `code`, `where is`,
  or `how long` in unrelated questions from triggering store answers. Unmatched
  questions about RePXL also fall back rather than inventing the missing detail.
  Generic `code` no longer matches vouchers; refund/return plurals and the existing
  Canon IXY vs Sony prompt and arrival-damage prompt are recognized explicitly.
- Matching remains local, stateless, and based on keywords, not semantic knowledge
  retrieval. Ambiguous mixed-topic questions can still hit a canned answer; the
  classifier does not verify every detail of a question or perform live lookup.

- Messages send without a page refresh (client-side). **Enter** sends;
  **Shift+Enter** inserts a newline. Empty messages are rejected and duplicate
  submissions are blocked while a reply is pending.
- A short typing indicator precedes each reply; the view auto-scrolls to the
  newest message. An error state with **Retry** re-sends the last user message.
- The conversation is stored in **`sessionStorage`** under `repixl:chat`, so it
  survives storefront navigation and minimize, and clears when the browser tab
  closes. Only non-sensitive support Q&A is stored — no tokens, PII, or order
  data. `localStorage` is intentionally not used.

### 6. Accessibility & responsiveness

- Launcher and close/minimize buttons have ARIA labels; the panel is a labeled
  `role="dialog"` with `aria-modal="false"` (non-trapping overlay); the message
  list is an `aria-live="polite"` region; **Escape** closes and returns focus to
  the launcher; visible `focus-visible` rings throughout; honors
  `prefers-reduced-motion` (global reduced-motion CSS + `motion-reduce:` classes).
- Sizing is viewport-bounded (`min(23rem, 100vw−2rem)` × `min(34rem, 100vh−7rem)`)
  so the panel fits mobile viewports without horizontal overflow, and uses RePXL
  `repixl-*` design tokens (theme-aware).

### 7. Cross-platform conversation continuity — NOT available

There is **no shared conversation history across web and mobile.** Neither
platform persists chat to a backend: the mobile app keeps messages in in-memory
React state (lost on screen unmount), and the website keeps them in per-tab
`sessionStorage`. They share the same *response logic*, not the same
*conversation store*. Implementing cross-device history would require a new
persistence backend (chat model + APIs) and explicit approval — it is out of
scope here and is not implied anywhere in the UI.

### 8. Tests

- `src/lib/ai-concierge.test.ts` — parity with the mobile source, content
  expectations (greeting, human-escalation → Contact, order guidance without
  fabricated data), and `webActionHref` route mapping.
- `src/components/chat/chat-widget.test.ts` — reuse of the shared brain (no
  backend), honest AI identity, Enter/Shift+Enter, empty/duplicate guards,
  typing/error/retry, sessionStorage persistence (not localStorage), a11y
  wiring, responsive/safe placement, single mount, and route gating.

The 2026-10-02 fallback task passed root/mobile TypeScript and **103 tests across
four files**: `src/lib/ai-concierge.test.ts`, `src/components/chat/chat-widget.test.ts`,
`src/lib/mobile-features.test.ts`, and `src/lib/mobile-all-modules.test.ts`.
Tests cover web/mobile fallback parity, unrelated/unknown questions, supported
prompt preservation, action routes, and the existing chat-widget behavior.
Older mobile tests now read the structured response's `.text`/`.action` fields
and assert current guidance instead of obsolete exact copy; those previously
reported nine failures are resolved in this targeted run. This is not a new
full-suite result. Root production build passed (70/70 static pages); Android/iOS
production exports passed (1,543/1,417 modules). Browser/device rendering and live
human support were not exercised. No deployment, commit, or push was performed.

### 9. Limitations / possible future work

- Rule-based (keyword) responses, not a generative LLM.
- No cross-device history (see the conversation continuity section).
- No unread/proactive messaging; the launcher shows a one-time attention dot only.
- Not verified in a real browser session here (logic, structure, build verified).
