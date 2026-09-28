# RePXL — Repository Onboarding & Analysis

> **Purpose:** A grounded, evidence-based onboarding reference for the RePXL codebase after transfer to a new Windows desktop. Analysis-only — no code, dependencies, schema, or Git state was modified in producing this document.
> **Repository:** https://github.com/yashiro-nyx/RePXL-Website
> **Local path:** `E:\RePIXL Website`
> **Prepared:** September 27, 2026
> **Scope of evidence:** Findings below are derived from reading source files, config, the Prisma schema/migrations, and read-only Git inspection. Where documentation conflicts with code, the discrepancy is called out rather than resolved in favor of either side.

> **Update (documentation audit):** Several discrepancies this report flagged in §12 have since been corrected in the docs — `README.md`/`HANDOFF.md` now say **Next.js 15 / Expo SDK 57**, the seed credentials (`admin@repixl-admin.com` / `RePIXL2026!`) are now stated accurately in `README.md`/`SETUP.md`/`deployment.md`, the birth-date "known issue" was removed (the `dateOfBirth` column exists), and the `.env.local.example` references now point to the real `.env.local.neon.bak`. The Git-status findings in **§10** are point-in-time: local `main` is now level with `origin/main` (no longer one commit behind). The untracked `20260924133000_optimize_rls_policies` migration status should be re-checked directly with Git rather than relied upon from this section.

---

## 1. Executive Project Overview

RePXL is a curated, **admin-managed** e-commerce marketplace for vintage digital cameras ("digicams"). It is not peer-to-peer: the store admin owns all inventory. Core differentiators are condition grading (Mint / Excellent / Good / Fair), serial-number transparency, and a side-by-side camera comparison tool.

The repository is a **monorepo-style layout with two distinct frontends sharing one backend**:

| Component | Location | Role |
|---|---|---|
| Web application (storefront + admin + API) | `src/`, root configs | Next.js 15 App Router app deployed to Vercel. Owns all business logic, database access, and third-party integrations. |
| Mobile application | `react-native/` | Expo/React Native customer app. A thin HTTPS client of the web API. **Not built or deployed by Vercel.** |
| Database & migrations | `prisma/` | PostgreSQL schema (hosted on Supabase) managed by Prisma. |
| Documentation | `docs/`, `README.md`, `HANDOFF.md`, `react-native/README.md` | Setup, handoff, architecture, and checklists. |

**Source of truth for persistent data:** the PostgreSQL database, accessed exclusively server-side via Prisma (`src/lib/prisma.ts`). Both web and mobile clients read/write through the same Next.js API routes; the mobile app never receives a database URL or provider secret.

**Actual stack (verified from `package.json`):** Next.js `15.5.25`, React `18.3.1`, TypeScript `5.6.3` (strict), Prisma `5.22.0`, NextAuth `4.24.x`, Tailwind `3.4.13`, Zustand `5.0.0`, Framer Motion `11.11.1`, PayMongo (custom client), Cloudinary `2.11.0`, Nodemailer `10.x`, `otpauth` + `qrcode` (TOTP MFA), `@aivangogh/ph-address` + Leaflet (PH addressing / maps), Zod, Vitest + fast-check.

> ⚠️ **Documentation drift:** `README.md` and `HANDOFF.md` both state "Next.js 14" and "Expo SDK 51". The code is actually **Next.js 15.5.25** and **Expo SDK 57**. See §12 for the full discrepancy list.

---

## 2. Website Architecture

### 2.1 Framework & entry points
- **Next.js App Router** (`src/app/`). Root layout `src/app/layout.tsx` wraps every page in `AuthProvider`, `ConditionalNavbar`, and `GlobalToast`, and loads fonts Inter + JetBrains Mono (via `next/font/google`) and General Sans (via Fontshare CDN `<link>`).
- Root landing page: `src/app/page.tsx`. Custom 404: `src/app/not-found.tsx`.
- Path alias `@/*` → `src/*` (`tsconfig.json`). Prettier + Tailwind plugin configured; ESLint via `eslint-config-next`.
- `next.config.mjs`: AVIF/WebP image formats, `dangerouslyAllowSVG` with a restrictive CSP for SVGs, and remote image patterns for `res.cloudinary.com`, `**.amazonaws.com`, `**.cloudfront.net`.

### 2.2 Route groups (`src/app/`)
- `(auth)/` — `login`, `register`, `forgot-password`, `reset-password` (+ group `layout.tsx`).
- `(storefront)/` — `about`, `account`, `cart`, `checkout`, `compare`, `condition-grading`, `contact`, `faq`, `newsletter`, `p` (product short-links), `pages` (CMS static pages), `privacy`, `products`, `search`, `shipping-returns`, `terms`, `wishlist` (+ group `layout.tsx`).
- `(admin)/admin/` — admin dashboard SPA area.
- `auth/` — OAuth callback/redirect helpers (e.g. `auth/mobile-google`, `auth/error`).
- `api/` — all backend route handlers (see §6).

### 2.3 Client state (Zustand — `src/stores/`)
`addressStore`, `archivedCustomerStore`, `authStore`, `cartStore`, `compareStore`, `orderHistoryStore`, `paymentStore`, `productStore`, `reviewStore`, `themeStore`, `toastStore`, `voucherStore`, `wishlistStore`.

Per `HANDOFF.md`, stores are **API-first with a localStorage fallback** — service calls hit the API first and degrade to browser storage on failure so the UI does not break.

### 2.4 Route protection model — important
There is **no Next.js `middleware.ts`** in the project (confirmed: only `node_modules` matches). Authorization is enforced **per route handler** by calling `getCurrentUser()` / `getCurrentAdmin()` from `src/lib/auth-helpers.ts` at the top of each handler.

> 🛠️ **Development implication:** any new API route or server action must call the appropriate guard itself. There is no central gate that will catch a missing check.

### 2.5 Business logic layer (`src/lib/`)
A large, well-factored service layer with **co-located unit tests** (`*.test.ts`). Key modules: `prisma.ts`, `auth-helpers.ts`, `next-auth-options.ts`, `mobile-auth.ts`, `mobile-oauth.ts`, `paymongo.ts`, `cloudinary.ts`, `mailer.ts` / `order-email.ts` / `auth-email.ts`, `notifications.ts` + `notification-templates.ts`, `purchase-finalization.ts`, `order-status*` / `order-tracking.ts` / `order-payment-expiry.ts`, `returns.ts`, `reviews.ts`, `newsletter.ts`, `cms.ts`, `settings.ts`, `sensitive-change.ts`, `mfa/` (`crypto.ts`, `service.ts`, `http.ts`, `security.ts`), `validations.ts` (Zod schemas), `mask.ts`, `guest-shopping.ts`, `delivery-routing.ts`, `shipping-auth.ts`.

---

## 3. React Native Architecture

### 3.1 Platform
- **Expo SDK 57**, React Native `0.86.3`, React `19.2`, **Expo Router** with typed routes (`app.json` → `experiments.typedRoutes`). App scheme `repxl`, dark UI, bundle id `com.repxl.mobile`, EAS `projectId` present, owner `vaelarr`.
- Plugins: `expo-router`, `expo-notifications`, `expo-splash-screen`, `expo-secure-store`, `expo-web-browser`.
- Separate `package.json` / `package-lock.json` / `node_modules`. Root `tsconfig.json` explicitly **excludes** `react-native/**`, and the root Vercel build does not compile it.

### 3.2 Screens (`react-native/app/`)
- Tabs (`app/(tabs)/`): `home`, `browse`, `search`, `cart`, `account`.
- Stack: `index`, `login`, `signup`, `forgot-password`, `product`, `compare`, `checkout`, `order`, `order-confirm`, `notifications`, `support`, plus `app/auth/callback.tsx` (OAuth).
- State: a single `context/AppContext.tsx`. Components: `GoogleAuthButton.tsx`, `TrackingMapCard.tsx`.
- Services (`src/services/`): `api.ts` (typed API client), `session.ts` (SecureStore persistence), `push.ts` (Expo push).

### 3.3 Backend communication (`react-native/src/services/api.ts`)
- Base URL from `EXPO_PUBLIC_API_BASE_URL` (defaults to `https://repxlph.vercel.app`).
- Standard response envelope `{ success, data, error }`; the client unwraps `data`.
- **Auth:** `Authorization: Bearer <accessToken>`. `authorized()` transparently refreshes on a `401` via `/api/mobile/auth/refresh` using a single-flight promise, and only clears the stored session when the refresh is authoritatively rejected (`401`/`403`).
- Session persisted as JSON `{ user, tokens }` in Expo SecureStore under key `repixl.mobile.session` (`session.ts`).
- Timeouts: 30 s default; 60 s for `process-payment`, 45 s for checkout `verify`.
- Endpoints consumed: mobile auth (`login`, `mfa/verify`, `register`, `google/exchange`, `me`, `logout`), shared `/api/auth/*` (`forgot`/`reset`/`change-password`, `me?scope=customer`), `products`, `reviews`, `cart`, `wishlist`, `addresses` (+ default), `vouchers/validate`, `orders` (+ `cancel`, `confirm-receipt`, `PATCH` status), `notifications` (+ read/read-all), `mobile/push-token`, `checkout/session`, `checkout/process-payment`, `checkout/verify`, `checkout/config`, `banners`, `health`, `contact`.

> 🔎 **Data-model caveat:** the mobile product mapper fills many spec fields (`sensor`, `lcd`, `isoRange`, `shutterSpeed`, `battery`, `weight`) with the literal string `"Not listed"` because the API/`Product` model does not carry them. Treat these as placeholders, not real data.

### 3.4 Commands
`npm install`, `npm run typecheck` (`tsc --noEmit`), `npm run doctor` (`expo-doctor`), `npm start` / `npm run android` / `npm run ios`. There are **no unit tests** in the mobile project.

---

## 4. Database Schema & Migration Overview

### 4.1 Datasource
`prisma/schema.prisma`: PostgreSQL, `url = env("DATABASE_URL")` (pooled), `directUrl = env("DIRECT_URL")` (direct, used for migrations). The Prisma client (`src/lib/prisma.ts`) appends `connection_limit=5&pool_timeout=15` when not already present — tuned for Supabase Supavisor/pgBouncer under Vercel serverless — and uses a `globalThis` singleton to avoid pool churn during dev Fast Refresh.

### 4.2 Models (grouped)
- **Identity & auth:** `User` (`role: CUSTOMER|ADMIN`, `isSuperAdmin`, `isArchived`, extended profile `username`/`gender`/`dateOfBirth`/`avatarUrl`, `promoOptOut`), `CustomerMfa` (AES-GCM secret ciphertext, recovery-code hashes, `version`, attempt window), `CustomerMfaChallenge`, `RecentAuthRecord`, `SensitiveChangeChallenge` (email/phone/DOB OTP — only code hash stored), `PasswordResetToken` (hash), `RetiredAuthEmail` (email hash), `MobileSession` (token **hashes** only, revocable), `PushToken`.
- **Catalog & commerce:** `Product` (`condition MINT|EXCELLENT|GOOD|FAIR`, `status ACTIVE|INACTIVE|COMING_SOON|DISCONTINUED`, `serialNumber`, flat specs), `CartItem` (unique `userId+productId`), `Order` (`status PROCESSING|SHIPPED|DELIVERED|COMPLETED|CANCELLED`, `paymentStatus PENDING|PAID|FAILED|REFUNDED`, PayMongo `paymentSessionId`/`paymentIntentId`/`paymentReference`, address snapshot, tracking fields), `OrderItem` (unit-price snapshot), `Voucher` (`PERCENTAGE|FIXED`, usage/per-user limits, status), `WishlistItem`.
- **Reviews & returns:** `Review` (unique `userId+productId`, `verifiedPurchase`) + `ReviewImage` (Cloudinary public `upload`), `ReturnRequest` (`REQUESTED|UNDER_REVIEW|APPROVED|REJECTED|REFUNDED`, PayMongo `refundId`) + `ReturnRequestItem` + `ReturnRequestImage` (Cloudinary `authenticated`/signed).
- **CMS & platform:** `StaticPage` (`DRAFT|PUBLISHED`), `Banner` (`HOMEPAGE_HERO|HOMEPAGE_STRIP|SIDEBAR`), `HomepageContentBlock` (`Json`), `PlatformSetting` (`Json` key/value).
- **Notifications:** `UserNotificationPreference` (per-channel toggles; security email intentionally omitted = mandatory), `NotificationTemplate` (per `NotificationEvent`, channel `IN_APP|EMAIL|BOTH`), `Notification`.
- **Auditing:** `AdminLog`. Newsletter: `NewsletterSubscriber` (double-opt-in `PENDING|CONFIRMED|UNSUBSCRIBED`, token hashes).
- **Addresses:** `Address` includes PSGC `regionCode`/`provinceCode`/`cityCode` for cascading PH dropdowns.

### 4.3 Migration history (14 tracked at HEAD)
`prisma/migrations/`: `0_init` → `20260831144555_admin_client_management_suite` → `20260902000000_add_order_tracking` → `20260903060708_add_address_psgc_codes` → `20260904170634_add_review_images_and_return_images` → `20260906000000_customer_mfa` → `20260906120000_customer_profile_and_notif_prefs` → `20260907000000_recent_auth_and_newsletter_doi` → `20260908000000_sensitive_change_challenges` → `20260909000000_retired_auth_emails` → `20260910000000_add_mobile_sessions` → `20260910000001_add_push_tokens` → `20260924120000_enable_supabase_rls` → `20260924130000_add_supabase_rls_policies`. `migration_lock.toml` → `provider = "postgresql"`.

### 4.4 Supabase Row-Level Security
- `20260924120000_enable_supabase_rls`: enables RLS on all `public` tables and installs an event trigger (`auto_enable_rls_trigger` / `pgrst_auto_enable_rls`) so future tables get RLS automatically. This is **defense-in-depth against direct PostgREST/Supabase Data API access** — the app itself uses server-side Prisma over `DATABASE_URL`, which is not subject to these policies.
- `20260924130000_add_supabase_rls_policies`: public read (`anon`, `authenticated`) for `ACTIVE` products, reviews, review images, active banners, `PUBLISHED` pages, published homepage blocks, `ACTIVE` vouchers; user-scoped (`authenticated`, keyed on `auth.uid()::text`) for profile/addresses/cart/wishlist/orders/order items/notifications/preferences/return records.
- **Note on `auth.uid()`:** these authenticated-role policies are Supabase GoTrue-based. The web app's own auth is a **custom HMAC cookie / bearer scheme**, not Supabase Auth, so the user-scoped policies only take effect for a client using a Supabase JWT (the mobile app optionally carries `EXPO_PUBLIC_SUPABASE_*`). Server Prisma traffic bypasses RLS entirely.

See §10 for the untracked follow-up RLS optimization migration.

---

## 5. Authentication & Authorization Architecture

RePXL runs **three cooperating auth mechanisms**:

### 5.1 Custom cookie sessions (primary — `src/lib/auth-helpers.ts`)
- HMAC-SHA256 signed tokens: `base64url(payload).base64url(hmac)`; signature verified in constant time (`timingSafeEqual`).
- Customer cookie `repixl-session-token` (7-day TTL); admin cookie `repixl-admin-session-token` (1-hour TTL). Both `httpOnly`, `secure` in production, `sameSite=lax`.
- Signing secret = `NEXTAUTH_SECRET`. In development it falls back to `repixl-dev-only-insecure-secret`; in production a missing secret **throws**.
- Customer tokens embed `mfaVersion` / `mfaVerified` / `primaryAt`. `getCurrentUser()` rejects a session if the MFA version no longer matches or MFA is enabled but unverified — and, crucially, also accepts a `Bearer` token by delegating to the mobile path.
- **Recent re-authentication gate** for sensitive Security pages: 12-minute window backed by `RecentAuthRecord` (canonical in DB) plus a `sameSite=strict` `repixl-recent-auth` cookie; 5 failed attempts per 10-minute window triggers lockout.

### 5.2 Mobile bearer sessions (`src/lib/mobile-auth.ts`)
- Opaque random tokens (`randomBytes(32)`), stored **only as SHA-256 hashes** in `MobileSession`. Access TTL 15 min, refresh TTL 30 days; both rotate on refresh. Throttled `lastUsedAt` touch.
- Restricted to `role === CUSTOMER`; archived users rejected.

### 5.3 NextAuth v4 — Google OAuth only (`src/lib/next-auth-options.ts`)
- Single `GoogleProvider`, JWT strategy, 30-day max age, sign-in/error pages `/login`. After the Google round-trip, a sync step (`useOAuthSync` + `/api/auth/oauth`) upserts the user into PostgreSQL and issues the custom cookie so `/api/auth/me` works. `RetiredAuthEmail` blocks reuse of retired email-only Google identities.

### 5.4 Admin authorization
Admin-only routes call `getCurrentAdmin()` (requires the admin cookie **and** `role === ADMIN`). Super-admin-only actions (e.g. creating admin accounts, writing platform settings) additionally check `isSuperAdmin`. `/api/admin/provision` is gated by `ADMIN_PROVISION_SECRET`.

### 5.5 MFA (`src/lib/mfa/`)
TOTP via `otpauth`, QR via `qrcode`. Secrets are AES-256-GCM ciphertext using `MFA_ENCRYPTION_KEY` (64 hex chars, validated by `crypto.ts`); recovery codes stored as hashes. Same-origin enforcement in `mfa/http.ts`.

---

## 6. API & Third-Party Integrations

### 6.1 API surface (`src/app/api/`)
Top-level groups: `account`, `addresses`, `admin`, `auth`, `banners`, `cart`, `checkout`, `cms`, `contact`, `diagnostics`, `health`, `mobile`, `newsletter`, `notifications`, `orders`, `pages`, `products`, `returns`, `reviews`, `stress`, `track`, `upload`, `vouchers`, `webhooks`, `wishlist`.

Representative handlers (method → path → guard):
- **Auth:** `/api/auth/{login,register,logout,me,change-password,forgot-password,reset-password,validate-reset-token,set-password,oauth,recent-auth,notification-preferences,mfa/*,[...nextauth]}`.
- **Mobile:** `/api/mobile/auth/{login,register,refresh,logout,me,mfa/verify,google/exchange,google/finalize}`, `/api/mobile/push-token` (POST/DELETE).
- **Catalog/commerce:** `/api/products` (GET public; POST admin) and `/api/products/[slug]` (GET; PUT/PATCH/DELETE admin); `/api/cart` (+ `[itemId]`); `/api/orders` (+ `[orderNumber]`, `cancel`, `confirm-receipt`, `archive`); `/api/addresses` (+ `[id]`, `default`); `/api/wishlist` (+ `[productId]`); `/api/reviews` (+ `[reviewId]`); `/api/vouchers` (admin) + `/api/vouchers/validate` + `/api/vouchers/available`.
- **Checkout:** `/api/checkout/{session,process-payment,verify,config}`.
- **Admin:** `stats`, `logs`, `customers` (+ `[id]/archive`), `accounts`, `settings`, `returns` (+ `[id]` refund), `orders/[orderNumber]/{invoice,packing-slip}`, `products/brands`, `notifications` (+ `[event]`, `broadcast`), `cms/{pages,homepage,banners}` (+ `publish`), `provision`, `backfill-payments`, `update-tracking`, `simulate-webhook`, `normalize-defaults`.
- **Webhooks:** `/api/webhooks/paymongo`, `/api/webhooks/shipping`.
- **Ops:** `/api/health`, `/api/diagnostics`, `/api/track/stream` (SSE), `/api/stress`.
- **Uploads:** `/api/upload/{avatar,review-image,return-image,return-image/signed}`.

### 6.2 PayMongo (`src/lib/paymongo.ts`) — fully implemented
Payment Intents, Payment Methods (`card`/`gcash`/`paymaya`/`grab_pay`), Hosted Checkout Sessions (default methods `card, gcash, paymaya, grab_pay, qrph`), refunds with a 30 s timeout wrapper (`createRefundWithTimeout`, `TimeoutError`), and multi-path status verification (`checkPaymongoPaymentStatus`). Webhook signature verification is HMAC-SHA256 over `${t}.${rawBody}` (header `t=,te=,li=`) with mode-aware `te`/`li` selection and a configurable timestamp tolerance. `isPaymongoConfigured()` (presence of `PAYMONGO_SECRET_KEY`) and `NEXT_PUBLIC_PAYMONGO_ENABLED` gate the real hosted flow vs. the built-in demo/direct-order flow.

**Order finalization (`src/lib/purchase-finalization.ts`)** is robust and idempotent: an atomic conditional claim (`paymentStatus PENDING` + `status PROCESSING` → `PAID`) prevents double-processing; `deductInventory` uses `updateMany WHERE stock >= qty` with deterministic lock ordering to avoid deadlocks; voucher usage is incremented and the cart cleaned up inside the same transaction; notifications and the confirmation email are fired **non-blocking** afterward.

The PayMongo webhook (`src/app/api/webhooks/paymongo/route.ts`) is `force-dynamic`, reads the raw body before parsing, verifies the signature (15-min tolerance for clock skew), and handles `checkout_session.payment.paid`, `payment.paid`, `payment_intent.succeeded` → `finalizePaidOrder`, and `payment.failed` → mark `FAILED`/`CANCELLED`.

### 6.3 Cloudinary (`src/lib/cloudinary.ts`) — server-only
Buffer uploads with 5 MB cap, JPG/PNG/WebP only, EXIF stripped. Two delivery types: public `upload` (review images) and `authenticated` (return-evidence images, delivered through genuinely time-limited `private_download_url`, default 90 s). Includes an explicit note that `cloudinary.url()` with `expires_at` does *not* actually expire — the signed download URL is used instead.

### 6.4 Email (`src/lib/mailer.ts`, `order-email.ts`, `auth-email.ts`)
Nodemailer over **Gmail** (`service: 'gmail'`) using `GMAIL_USER` / `GMAIL_APP_PASSWORD`; `isMailerConfigured()` guards and the system logs to console in dev when unset. Used for password reset, order confirmation (from the webhook), newsletter double-opt-in, contact form, and security notifications.

> 🔎 `resend` is listed as a dependency but no `resend` usage was found in `src/`; the active mail transport is Gmail/Nodemailer. Treat `resend` as unused/aspirational unless a later reference is confirmed.

### 6.5 Supabase
`@supabase/supabase-js` is a dependency, but **no `createClient` usage exists in `src/`** — Supabase functions purely as the managed PostgreSQL host reached via Prisma. Optional client-side Supabase usage is scaffolded only for mobile (`EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`).

### 6.6 Shipping webhook / tracking
`/api/webhooks/shipping` authenticates with a Bearer `SHIPPING_WEBHOOK_SECRET` and **fails closed** (returns `503`) when the secret is unconfigured; an admin cookie cannot substitute for the sender secret (covered by `shipping-security.test.ts`). Order tracking is exposed over SSE at `/api/track/stream` with per-poll ownership rechecks.

### 6.7 Notifications & push
`src/lib/notifications.ts` fans out to in-app records, email (honoring templates + preferences), and **Expo push** (gated by `EXPO_PUSH_ENABLED=true`) to registered `PushToken`s.

---

## 7. Feature Inventory & Implementation Status

Legend: ✅ implemented & wired · ⚠️ implemented with caveat · 🧪 present, needs live verification.

### Web storefront
| Feature | Status | Evidence / notes |
|---|---|---|
| Register / Login / Logout | ✅ | `/api/auth/*`, cookie sessions |
| Google OAuth | ✅ | NextAuth + `/api/auth/oauth` upsert |
| Forgot / Reset / Change password | ✅ | hashed reset tokens, bcrypt |
| MFA (TOTP + recovery codes) | ✅ | `src/lib/mfa/*`, `CustomerMfa` |
| Sensitive profile changes (email/phone/DOB via OTP) | ✅ | `sensitive-change.ts`, `SensitiveChangeChallenge` |
| Product listing / detail / search / compare | ✅ | `(storefront)/products`, `search`, `compare` |
| Cart / Wishlist (DB-backed) | ✅ | `/api/cart`, `/api/wishlist` |
| Addresses (CRUD + default, PSGC) | ✅ | `/api/addresses`, `@aivangogh/ph-address` |
| Vouchers | ✅ | `/api/vouchers/validate`, admin CRUD |
| Checkout — direct/demo flow | ✅ | `/api/orders` transactional |
| Checkout — PayMongo hosted | ✅ | `/api/checkout/session` + webhook |
| Reviews (+ images) | ✅ | `/api/reviews`, `ReviewImage` (Cloudinary) |
| Returns (+ signed evidence images, refunds) | ✅ | `/api/returns`, `/api/admin/returns/[id]` refund |
| Newsletter (double opt-in) | ✅ | `/api/newsletter/*` |
| Contact | ✅ | `/api/contact` (email, no persistence) |
| Order tracking timeline / SSE | ✅ | `/api/track/stream`, `order-tracking.ts` |

### Admin
| Feature | Status | Evidence |
|---|---|---|
| Separate admin session (1 h) | ✅ | `getCurrentAdmin()` |
| Dashboard stats / logs | ✅ | `/api/admin/stats`, `/api/admin/logs` |
| Product/inventory management | ✅ | `/api/products` (admin); UI at `/admin/cameras` |
| Order management + invoice/packing-slip | ✅ | `/api/admin/orders/*` |
| Customer management (archive/restore) | ✅ | `/api/admin/customers/*` |
| Returns review + refund | ✅ | `/api/admin/returns/[id]` |
| Voucher management | ✅ | `/api/vouchers` |
| CMS: static pages / homepage blocks / banners | ✅ | `/api/admin/cms/*` |
| Admin accounts (super-admin) | ✅ | `/api/admin/accounts` |
| Platform settings (super-admin) | ✅ | `/api/admin/settings` |
| Notification templates + broadcast | ✅ | `/api/admin/notifications/*` |
| One-off ops (provision/backfill/normalize/simulate) | ⚠️ | maintenance endpoints; guard-gated, run deliberately |

### Mobile (per `react-native/README.md`, `HANDOFF.md`, and `api.ts`)
| Feature | Status | Notes |
|---|---|---|
| Native email/password login, register, MFA, refresh | ✅ | `/api/mobile/auth/*` |
| Google OAuth (native) | ⚠️ | `GoogleAuthButton.tsx` + `/api/mobile/auth/google/{exchange,finalize}` exist and `origin/main` commit enhances this flow, **but** `react-native/README.md` still says it is "not exposed as a native login button" — docs lag the code |
| Product discovery / compare / CCD "Try the Look" | ✅ | per README |
| Cart + selective checkout + voucher validation | ✅ | `/api/vouchers/validate` |
| Checkout via hosted PayMongo (WebBrowser) + `process-payment` | ✅ | app never collects card/OTP |
| Addresses CRUD + default (in-app + checkout) | ✅ | |
| Orders + tracking timeline + confirm receipt | ✅ | |
| In-app reviews (+ delete) | ✅ | |
| Notifications + Expo push registration | ✅ | needs `EXPO_PUBLIC_EXPO_PROJECT_ID` + `EXPO_PUSH_ENABLED` |
| Return submission with image upload (native) | 🧪 | README lists as future mobile work |
| App-store / EAS build config | 🧪 | future work |

---

## 8. Environment Variables (names only — no values)

> All `.env*` files are gitignored (`.gitignore`: `.env*`, with `!react-native/.env.example` re-included). None are tracked. **Do not read or print secret values.**

### Web / server
| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | Pooled Postgres (Supabase transaction pooler, 6543) — runtime |
| `DIRECT_URL` | ✅ | Direct Postgres (5432) — migrations |
| `NEXTAUTH_SECRET` | ✅ | Signs custom cookie HMAC **and** NextAuth JWT |
| `NEXTAUTH_URL` | ✅ | Base URL for NextAuth / same-origin checks |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Emails + PayMongo redirects (no trailing slash) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional | Google OAuth |
| `PAYMONGO_SECRET_KEY` | payments | Server-only PayMongo key |
| `NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY` | payments | Client-safe key |
| `PAYMONGO_WEBHOOK_SECRET` | payments | Webhook signature verification |
| `NEXT_PUBLIC_PAYMONGO_ENABLED` | payments | `"true"` activates hosted checkout |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | optional | Gmail SMTP transport |
| `MFA_ENCRYPTION_KEY` | MFA | AES-256-GCM key, 64 hex chars |
| `SHIPPING_WEBHOOK_SECRET` | tracking | Bearer auth for shipping webhook (fails closed) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | uploads | Cloudinary server config |
| `ADMIN_PROVISION_SECRET` | optional | Gates `/api/admin/provision` |
| `ORDER_PAYMENT_EXPIRY_HOURS` | optional | Pending-order expiry (default 24) |
| `PRISMA_CONNECTION_LIMIT` / `PRISMA_POOL_TIMEOUT` | optional | Override Prisma pool tuning (defaults 5 / 15) |
| `EXPO_PUSH_ENABLED` | optional | `"true"` enables server-side Expo push dispatch |
| `VERCEL_URL` | auto | Provided by Vercel; used for URL fallback |
| `TEST_MFA_DATABASE_URL` | tests only | Enables DB-backed MFA tests (otherwise skipped) |

### Mobile (`react-native/.env.example`)
| Variable | Required | Purpose |
|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | ✅ (mobile) | Public web origin, no `/api` |
| `EXPO_PUBLIC_EXPO_PROJECT_ID` | push only | Expo push token registration |
| `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` | optional | Client Supabase Storage/Realtime (not required today) |

---

## 9. Development, Testing & Build Commands (Windows / PowerShell)

> In PowerShell, chain with `;` (not `&&`). Prefer running dev servers and Expo in a dedicated terminal, not through automation.

### Web
```powershell
npm install            # runs postinstall: prisma generate
npm run dev            # local dev server (http://localhost:3000)
npm run build          # prisma generate ; next build
npm run start          # production server
npm run lint           # eslint (next lint)
npm test               # vitest run (unit + property tests)
npm run test:watch     # vitest watch
npm run test:stress    # node scripts/stress-test.mjs
```

### Prisma / database
```powershell
npm run prisma:generate   # regenerate client
npm run prisma:migrate    # prisma migrate deploy (apply pending)
npm run prisma:studio     # visual DB browser
npm run db:seed           # tsx prisma/seed.ts
npm run db:setup          # migrate deploy + seed
npm run db:reset          # DESTRUCTIVE — dev only (do not run here)
```
> Prisma CLI reads `.env` (not `.env.local`). Per `docs/SETUP.md`, teams mirror `.env.local` → `.env` for CLI use.

### Vercel & CI
- Vercel build (`vercel.json` → `npm run vercel-build`): `prisma generate ; prisma migrate deploy ; next build` — **migrations auto-apply on every deploy.**
- GitHub Actions `.github/workflows/db-migrate.yml`: runs `prisma migrate deploy` on pushes to `main` touching `prisma/**`; requires repo secrets `DATABASE_URL` and `DIRECT_URL`. (Its comments reference Neon — stale; the DB is Supabase, but both are plain Postgres so it still works.)

### Mobile
```powershell
Set-Location react-native
npm install
$env:EXPO_PUBLIC_API_BASE_URL = "http://localhost:3000"   # 10.0.2.2 for Android emulator; LAN IP for device
npm run start        # or: npm run android / npm run ios
npm run typecheck    # tsc --noEmit
npm run doctor       # expo-doctor
```

### Windows compatibility notes
- No blocking issues found. Scripts use portable `node`/`npx`/`prisma` invocations; `db:seed` calls `node_modules/.bin/tsx` (resolves on Windows).
- `next build` writes `.incremental`/`tsconfig.tsbuildinfo`; both present and benign.
- Node **18+** required for web (README); the CI workflow pins Node **22**. Mobile expects a matching Expo-supported Node. Confirm the local Node version aligns.

---

## 10. Git Status & Untracked Migration Findings

Read-only Git inspection results:

- **Branch:** `main`. **HEAD:** `222e062` — *"feat(mobile): add homepage banners, background screen sync, and session optimizations"*.
- **`origin/main`:** `94bc621` — *"feat(auth): enhance mobile OAuth flow and error handling"*.
- **Divergence:** local `main` is **1 commit behind `origin/main`** and fast-forwardable.

> ⚠️ **Correction to the briefing:** the task described local `main` as "synchronized with `origin/main` at `222e062`." That is no longer accurate — `origin/main` has advanced to `94bc621`, so `HEAD` (`222e062`) trails origin by one commit. No merge/pull was performed. The incoming commit `94bc621` touches mobile OAuth files (`src/lib/mobile-oauth-redirect.ts` + test, `src/lib/next-auth-options.ts`, `src/hooks/useOAuthSync.ts`, `src/app/auth/*`, and several `react-native/` screens) — which explains why native Google OAuth already appears in the working tree while `react-native/README.md` still describes it as future work.

### Untracked migration: `prisma/migrations/20260924133000_optimize_rls_policies/`
- **Working-tree status:** untracked (`git status` lists the directory). It is **not gitignored** (`git check-ignore` returns non-zero).
- **Presence in history:** **absent from both `HEAD` and `origin/main`** (`git ls-tree` returns nothing for the path on either ref). The tracked migration chain ends at `20260924130000_add_supabase_rls_policies`.
- **Contents:** it re-creates the same user-scoped RLS policies from the `130000` migration but wraps the auth function as `(select auth.uid())` instead of `auth.uid()`. This is the well-known **Supabase/Postgres "InitPlan" optimization** — evaluating `auth.uid()` once per statement instead of once per row — a legitimate performance follow-up to the prior policy migration.
- **Assessment:** it appears to be a **genuine, valid Prisma migration that was created locally but never committed or pushed** — i.e., missing from GitHub. It is not an accidental artifact and not ignored by Git config.
- **Action taken:** none. Per instructions, it was **not** deleted, committed, applied, or modified. Whether to commit it (and apply it to the database) is a decision for the owner.

---

## 11. Existing Tests & Verification Coverage

- **Framework:** Vitest (`vitest.config.ts`, `environment: 'node'`, `include: ['src/**/*.test.ts']`) with property-based testing via `fast-check` / `@fast-check/vitest`.
- **Count:** **50** `*.test.ts` files under `src/` (co-located with the code they cover).
- **Notable coverage:** PayMongo (`paymongo`, `paymongo-verify`, `paymongo-process-payment`), auth lifecycle & email, MFA crypto/security, notifications (static + dynamic), order status/tracking/payment-expiry, returns, reviews, sensitive-profile (client + server), settings (documented "Property 22–26"), shipping security (webhook auth + tracking ownership + aggregate-only diagnostics), CMS, newsletter, masking, documents, delivery routing, account navigation, guest shopping / purchase finalization, admin product security, and mobile modules/features.
- **Gaps / caveats:**
  - Some MFA tests require `TEST_MFA_DATABASE_URL` and are skipped without it.
  - There is a stress script (`scripts/stress-test.mjs`) but **no end-to-end/browser tests** despite `tech.md` mentioning Playwright.
  - The **mobile project has no unit tests** — only `tsc --noEmit` typechecking.
- **Verification note:** tests were **not executed** during this onboarding (analysis-only). Coverage above is inferred from reading the test files. Run `npm test` to confirm the suite passes on this machine before relying on it.

---

## 12. Known Issues, Risks & Recommended Investigation

### Documentation ↔ code discrepancies (report, don't assume)
1. **Framework versions:** `README.md`/`HANDOFF.md` say "Next.js 14" / "Expo SDK 51"; actual is **Next.js 15.5.25** / **Expo SDK 57** (React 19, RN 0.86).
2. **Seed credentials:** `docs/SETUP.md` lists `admin@repxl.com` / `admin123`. Actual `prisma/seed.ts` seeds **`admin@repixl-admin.com` / `RePIXL2026!`** (hardcoded) and `demo@repxl.com` / `customer123`. `HANDOFF.md` claims the admin password is "in `.env.local`" — it is not; it is hardcoded in the seed.
3. **Birth date:** `HANDOFF.md` "Known Issues" says birth date is localStorage-only with no DB column. **Stale** — the schema has `dateOfBirth` (plus `gender`, `username`, `avatarUrl`) via migration `20260906120000`, with a full OTP-guarded sensitive-change flow.
4. **`.env.local.example` missing:** `README.md`/`SETUP.md` instruct copying `.env.local.example`, but that file **does not exist** in the repo (present: root `.env`, `.env.local.neon.bak`, and `react-native/.env.example`).
5. **Neon vs Supabase:** `SETUP.md` and the CI workflow comments reference Neon; the DB is now Supabase. Functionally fine (both Postgres), but confusing.
6. **Mobile Google OAuth:** `react-native/README.md` says native OAuth is not exposed; the code (and `origin/main`) already implement it.
7. **`resend` dependency:** declared but unused in `src/`; active email is Gmail/Nodemailer.

### Security-sensitive areas (handle with care in future changes)
- **`NEXTAUTH_SECRET`** signs both cookie sessions and NextAuth JWTs; the dev fallback secret is insecure by design and throws in production if unset. Never log it.
- **No central middleware** — every protected route/action must call `getCurrentUser()`/`getCurrentAdmin()` (and `isSuperAdmin`/recent-auth where relevant). Easy to forget on new endpoints.
- **Hardcoded seed admin password** (`RePIXL2026!`) — must be rotated immediately on any real deployment.
- **Webhook trust boundaries:** PayMongo (HMAC signature) and shipping (`SHIPPING_WEBHOOK_SECRET`, fail-closed) are correctly verified; preserve raw-body handling and signature checks when editing.
- **Cloudinary private assets:** return-evidence images rely on short-lived signed download URLs — do not switch them to public `upload` delivery.
- **MFA / sensitive-change / password-reset / mobile tokens:** all persist only hashes/ciphertext. Maintain that invariant.
- **RLS:** enabled as defense-in-depth; server Prisma bypasses it. If the mobile app ever talks to Supabase directly with a Supabase JWT, the untracked `optimize_rls_policies` migration becomes relevant to both correctness and performance.

### Incomplete / needs live verification
- PayMongo **live** payment methods must be activated in the PayMongo dashboard (account config, not code).
- Expo **push** requires `EXPO_PUBLIC_EXPO_PROJECT_ID`, `EXPO_PUSH_ENABLED=true`, and physical-device permission testing.
- Native **return submission with image upload** and **EAS/app-store** config are listed as future mobile work.
- `HANDOFF.md` flags: navbar logout skips the confirmation modal; `/admin/products` is a stub (real UI at `/admin/cameras`); compare dialog lacks full focus-trap/`aria-modal`. Verify current state before acting.
- The untracked RLS optimization migration (§10) is unpushed — decide whether to commit/apply.

### Architectural dependencies to keep in mind
- One backend, two clients: **any API contract change affects both web and mobile.** The mobile `api.ts` envelope (`{ success, data, error }`) and field names must stay in sync.
- Order integrity depends on the **idempotent transactional finalizer** (`purchase-finalization.ts`); changes to order/payment status handling should route through it.
- Prisma pool tuning (`connection_limit=5`) is intentional for Supabase + Vercel; raising it risks pooler exhaustion (P2024).

---

## 13. Key Files & Directories to Consult for Future Development

| Area | Path |
|---|---|
| DB schema | `prisma/schema.prisma` |
| Migrations (+ untracked RLS opt.) | `prisma/migrations/` |
| Seed / default accounts | `prisma/seed.ts` |
| Prisma client (pool tuning) | `src/lib/prisma.ts` |
| Auth (cookie/HMAC, recent-auth, guards) | `src/lib/auth-helpers.ts` |
| Mobile bearer sessions | `src/lib/mobile-auth.ts` |
| NextAuth (Google) | `src/lib/next-auth-options.ts` |
| MFA | `src/lib/mfa/` |
| PayMongo client | `src/lib/paymongo.ts` |
| Order finalization (idempotent) | `src/lib/purchase-finalization.ts` |
| PayMongo webhook | `src/app/api/webhooks/paymongo/route.ts` |
| Shipping webhook / tracking | `src/app/api/webhooks/shipping/route.ts`, `src/lib/order-tracking.ts`, `src/app/api/track/stream/route.ts` |
| Cloudinary | `src/lib/cloudinary.ts`, `src/app/api/upload/*` |
| Email | `src/lib/mailer.ts`, `src/lib/order-email.ts`, `src/lib/auth-email.ts` |
| Notifications | `src/lib/notifications.ts`, `src/lib/notification-templates.ts` |
| Validation schemas | `src/lib/validations.ts` |
| Zustand stores | `src/stores/` |
| App routes | `src/app/(auth)`, `src/app/(storefront)`, `src/app/(admin)/admin`, `src/app/api` |
| Mobile app | `react-native/app/`, `react-native/src/services/` |
| Mobile ↔ backend contract | `react-native/src/services/api.ts` |
| Build/deploy config | `package.json`, `vercel.json`, `next.config.mjs`, `.github/workflows/db-migrate.yml` |
| Test config | `vitest.config.ts`, `src/**/*.test.ts`, `scripts/stress-test.mjs` |
| Docs | `README.md`, `HANDOFF.md`, `docs/SETUP.md`, `docs/system-architecture.md`, `docs/deployment.md`, `docs/mobile-app-development-plan.md`, `react-native/README.md` |
| Design/product steering | `.kiro/steering/` (`ui-design`, `product`, `tech`, `structure`) |

---

*End of onboarding report. All findings are analysis-only; no application code, dependencies, configuration, schema, or Git state was modified. The untracked migration `prisma/migrations/20260924133000_optimize_rls_policies/` was left exactly as found.*
