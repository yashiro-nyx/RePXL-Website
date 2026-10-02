# RePXL

**Capture the past. Frame the future.**

RePXL is a curated marketplace for vintage digital cameras — condition-graded, serial-verified, and trusted by collectors. Admin-managed inventory with full e-commerce: cart, checkout, PayMongo payments, order management, and customer accounts.

Live at: **https://repxlph.vercel.app**

## Documentation

The `docs/` folder contains seven maintained guides:

| Guide | Covers |
|---|---|
| [Setup and deployment](./docs/SETUP.md) | Local setup, environment, migrations, Vercel and native release prerequisites |
| [System architecture](./docs/system-architecture.md) | Repository map, authentication, database, shared API and integrations |
| [Notifications and email](./docs/communications.md) | In-app pipeline, formatting/preferences, outgoing email system and previews |
| [Navigation and support](./docs/customer-experience.md) | Back-navigation rules and website AI Concierge |
| [Mobile implementation and release](./docs/mobile-app-development-plan.md) | Implemented native workflows and remaining acceptance/release work |
| [Returns and refunds](./docs/returns.md) | Shared cancellation/return/refund flow and verification limits |
| [Project progress checklist](./docs/Group2_ProjectChecklist.md) | Completion status, dated checks and known limitations |

---

## Features

### Storefront
- Film-burn hero, trust strip, featured carousel, Shop by Brand gallery, condition explainer, testimonials, FAQ, newsletter
- Product listing with filters (brand, condition, price range, in-stock only), sort controls, skeleton loading
- Product detail — specs, condition badge, reviews, Add to Cart / Wishlist / Compare, live webcam CSS-filter demo
- Camera comparison tool (up to 3 side-by-side)
- Full-text search

### User Accounts
- Register, Login, Logout (with confirmation), Forgot/Reset Password
- Google OAuth (NextAuth + DB upsert)
- Account dashboard: Profile, Orders, Addresses, Payment Methods, Reviews, Security
- Order history with print receipt
- Guided returns: item selection, reasons/photos, review, approval instructions,
  shipment tracking, receipt/inspection, and refund progress. Admin refunds use
  selected items after discounts and wait for provider confirmation. Apply the
  new return-workflow migration before use; see [returns](docs/returns.md).

### Cart & Checkout
- DB-backed cart per authenticated user
- Voucher/discount code validation
- Courier selection (J&T, LBC, Ninja Van, Grab Express)
- Direct checkout (demo/offline) or PayMongo Hosted Checkout
- Order confirmation email via Gmail SMTP

### Admin Dashboard
- Login at `/admin/login` (separate session, 1-hour expiry)
- Dashboard with real-time stats, inventory alerts, order status
- Camera management (CRUD, stock, condition, serial numbers)
- Order management (status updates, archive/restore)
- Customer management (list, archive/restore)
- Voucher management (create/delete)
- Activity logs (audit trail)
- Admin account management (super-admin only)

### React Native Mobile App
- Expo/React Native customer app in [`react-native/`](./react-native) (earlier prototype in `mobile/` removed)
- Native login, registration, MFA challenge verification, token refresh rotation, and SecureStore session persistence
- Product discovery with search query sync, brand/series filters, price brackets, in-stock toggle, and condition grading modal
- CCD camera color simulation ("Try the Look" modal with vintage profiles for Canon, Kodak, Sony, Nikon, Fujifilm, Panasonic)
- Camera comparison tool with interactive camera picker
- Cart with individual/all checkboxes, live voucher code validation (`/api/vouchers/validate`), and selective checkout
- Checkout with inline Philippine address creation modal and hosted PayMongo payments via Expo WebBrowser
- Account dashboard with full in-app Address Management (CRUD + set default) and dedicated Wishlist sub-view
- Order history with visual multi-step tracking timeline and live refresh
- Website-aligned cancellation and guided native returns: item selection, reasons/photos,
  refund estimate and review, approval instructions, shipment tracking, and receipt/
  inspection/refund milestones ([workflow and verification](docs/returns.md))
- In-app review submission with star ratings and review deletion
- In-app notification polling and optional Expo push-token registration

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript strict) |
| Styling | Tailwind CSS + custom design tokens |
| Animation | Framer Motion |
| Client state | Zustand (API-first, localStorage fallback) |
| Database | PostgreSQL via **Prisma ORM** (Supabase) |
| Auth | Custom HTTP-only cookie sessions + NextAuth (Google) + mobile bearer sessions; customer MFA (TOTP) |
| Email | Nodemailer + Gmail SMTP (shared branded email design system) |
| Payments | PayMongo Hosted Checkout |
| Deployment | Vercel |
| Mobile | Expo SDK 57, Expo Router, React Native, TypeScript, Expo SecureStore |

---

## Requirements

- Node.js 18+
- npm 9+
- PostgreSQL database (Supabase recommended)
- PayMongo account (for real payments)
- Gmail account with App Password (for email)
- Google Cloud project (for Google OAuth, optional)
- Expo CLI/dev client for mobile development (optional for web-only work)

---

## Installation

```bash
git clone https://github.com/yashiro-nyx/RePXL-Website.git
cd "RePXL Website"
npm install
```

The mobile app has its own dependencies:

```powershell
Set-Location react-native
npm install
Set-Location ..
```

---

## Environment Variables

Create `.env.local` and fill in the values below. **Never commit `.env.local`** — all `.env*` files are gitignored (except `react-native/.env.example`). There is no tracked `.env.local.example`; a reference backup exists at `.env.local.neon.bak`, or copy the variable names from the table below.

```bash
# Start from the reference backup, then edit values:
cp .env.local.neon.bak .env.local
```

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | Pooled PostgreSQL connection (Supabase Transaction pooler, port 6543) |
| `DIRECT_URL` | ✅ | Direct PostgreSQL connection (Supabase Session pooler / direct, port 5432) |
| `NEXTAUTH_SECRET` | ✅ | 32-byte random string for session signing and NextAuth JWT |
| `NEXTAUTH_URL` | ✅ | Base URL (`http://localhost:3000` local, `https://...` production) |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Same as `NEXTAUTH_URL`. Used in emails and PayMongo redirects. No trailing slash |
| `GOOGLE_CLIENT_ID` | optional | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | optional | Google OAuth client secret |
| `PAYMONGO_SECRET_KEY` | optional | `sk_live_...` or `sk_test_...` — server-only, never exposed to client |
| `NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY` | optional | `pk_live_...` — client-safe key |
| `PAYMONGO_WEBHOOK_SECRET` | optional | `whsk_...` — for webhook signature verification |
| `NEXT_PUBLIC_PAYMONGO_ENABLED` | optional | Set to `true` to activate PayMongo hosted checkout |
| `GMAIL_USER` | optional | Gmail address for sending emails |
| `GMAIL_APP_PASSWORD` | optional | Gmail App Password (not your login password) |
| `EXPO_PUSH_ENABLED` | optional | Server-side Expo push dispatch switch; set to `true` after configuring push tokens |

Mobile-only variables are supplied to Expo at runtime/build time:

| Variable | Required | Purpose |
|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | ✅ for mobile | Public website origin, such as `http://localhost:3000` |
| `EXPO_PUBLIC_EXPO_PROJECT_ID` | push only | Expo project ID used to request push tokens |

> Generate `NEXTAUTH_SECRET` with: `openssl rand -base64 32`

---

## Database Setup

```bash
# 1. Run migrations (creates all tables)
npm run prisma:migrate

# 2. Seed initial data (admin user, 12 products, reviews, vouchers)
npm run db:seed

# Or do both in one step:
npm run db:setup
```

Seeded accounts (defined in `prisma/seed.ts`):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@repixl-admin.com` | `RePIXL2026!` |
| Demo customer | `demo@repxl.com` | `customer123` |

> ⚠️ The admin password is hardcoded in the seed script. Change it immediately after first login in any real deployment.

---

## Authentication Setup

### Email/password
Works out of the box after database setup. Sessions are HTTP-only cookies signed with `NEXTAUTH_SECRET`.

### Google OAuth (optional)
1. Create a project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable Google+ API → Credentials → OAuth 2.0 Client ID (Web application)
3. Authorized redirect URIs: `https://repxlph.vercel.app/api/auth/callback/google`
4. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to env

---

## PayMongo Setup

### Test Mode
1. Sign up at [dashboard.paymongo.com](https://dashboard.paymongo.com)
2. Stay in Test mode. Copy **Secret key** (`sk_test_...`) and **Public key** (`pk_test_...`)
3. Register a webhook: URL = `https://your-app.vercel.app/api/webhooks/paymongo`, events: `checkout_session.payment.paid`, `payment.paid`, `payment.failed`
4. Copy the **Webhook signing secret** (`whsk_...`)
5. Set all four env vars + `NEXT_PUBLIC_PAYMONGO_ENABLED=true`

### Live Mode
Same steps in Live mode with `sk_live_` / `pk_live_` keys.

> ⚠️ After switching to Live mode, go to **Settings → Payment Methods** and activate at least one method (e.g. GCash, Card). The Checkout Session API accepts any methods in `payment_method_types` without error, but the hosted checkout page only renders methods that are active on your account.

---

## Email Setup

1. Enable 2-Step Verification on your Gmail account
2. Go to Google Account → Security → App Passwords → create one for "Mail"
3. Set `GMAIL_USER` and `GMAIL_APP_PASSWORD` in your env
4. If not set, emails log to the server console instead of being sent (safe for dev)

---

## npm / Prisma Commands

```bash
npm run dev              # Start development server
npm run build            # prisma generate + next build
npm run start            # Start production server
npm run lint             # ESLint

npm run prisma:generate  # Regenerate Prisma client
npm run prisma:migrate   # Deploy pending migrations (non-interactive)
npm run prisma:push      # Push schema changes without migration (dev only)
npm run prisma:studio    # Open Prisma Studio (visual DB browser)
npm run db:seed          # Run seed script
npm run db:setup         # migrate deploy + seed (fresh database)
npm run db:reset         # Reset all data (destructive — dev only)
```

---

## Running Locally

```bash
npm run dev
```

- Storefront: [http://localhost:3000](http://localhost:3000)
- Admin: [http://localhost:3000/admin](http://localhost:3000/admin)

To run the mobile customer app, keep the website API running and use another
terminal:

```powershell
Set-Location react-native
$env:EXPO_PUBLIC_API_BASE_URL = "http://localhost:3000"
npm run start
```

Use `http://10.0.2.2:3000` for an Android emulator or the development machine's
LAN IP for a physical device. The mobile app never connects directly to Prisma
or PostgreSQL.

The app runs in offline/demo mode if `DATABASE_URL` is not set — Zustand stores fall back to localStorage and seed data. Set `DATABASE_URL` and `DIRECT_URL` to use the real database.

---

## Vercel Deployment

The project deploys automatically on push to `main`.

**Build command (set automatically via `package.json`):**
```
prisma generate && prisma migrate deploy && next build
```

**Required Vercel env vars:** All variables from the table above must be set in Vercel Dashboard → Project Settings → Environment Variables. `NEXT_PUBLIC_*` variables are baked into the client bundle at build time — redeploy after changing them.

**Database migrations** run automatically on every Vercel deployment (`prisma migrate deploy` is non-interactive and only applies pending migrations).

---

## Project Status

**Live in production.** Core e-commerce flow is complete and tested:

- ✅ Registration, login, Google OAuth, forgot/reset password
- ✅ Product catalog with live DB stock
- ✅ Cart, wishlist, compare
- ✅ Checkout (direct + PayMongo hosted)
- ✅ Order management, confirmation email, print receipt
- ✅ Admin dashboard with real DB data
- ✅ Negative stock prevention
- ✅ PayMongo webhook with idempotency guard
- ✅ Returns & refunds, customer MFA (TOTP), OTP-guarded sensitive profile changes
- ✅ React Native customer app with shared API/database integration

**Recent refinements (completed):**
- Mobile FAQ layout: content-sized category row, centered touch targets, and a question list with bottom safe-area padding. Mobile typecheck and 3 focused FAQ data tests passed; native visual verification remains pending. See [`react-native/README.md`](./react-native/README.md#customer-support-layout).
- ✅ Context-aware Back navigation on the Cameras catalog (`from=home`) and removed the generic About Back button — see [`docs/customer-experience.md#back-navigation`](./docs/customer-experience.md#back-navigation)
- ✅ Navbar avatar synchronization from `authStore`
- ✅ Payment success navigation (success page fetches the real order from the API)
- ✅ In-app notification redesign with concise, human-readable content and shared dropdown/page components — see [`docs/communications.md#in-app-notifications`](./docs/communications.md#in-app-notifications)
- ✅ Notification content sanitization (legacy malformed records rendered safely; no raw tokens/JSON reach customers)
- ✅ Gmail email redesign onto a shared, light, Gmail-compatible email design system with an offline preview generator — see [`docs/communications.md#outgoing-email`](./docs/communications.md#outgoing-email)
- ✅ Floating website AI Concierge chat widget that reuses the mobile app's local rule-based concierge logic (automated assistant, not human live-chat; no chat backend) — see [`docs/customer-experience.md#ai-concierge`](./docs/customer-experience.md#ai-concierge)
- Standard unknown-information reply on web/mobile: acknowledges missing details,
  suggests supported topics, and offers Contact Support. Broad unrelated keywords
  no longer automatically trigger store guidance. See the support guide above.

**Pending / manual action required:**
- Activate payment methods in PayMongo Dashboard (Live mode)
- Deploy the mobile session and push-token migrations before native production testing
- Configure an Expo project ID and test push permissions on physical devices
- Move saved payment cards from localStorage to database
- Verify AI support visually in browser/device; matching remains keyword-based.

### Verification snapshot (last audit)
- `npx tsc --noEmit` — clean
- `npm run build` — succeeds (68/68 static pages)
- Historical `npx vitest run` — **957 passed, 9 failed, 47 skipped** (1013 tests,
  60 files). The old mobile concierge failures were corrected in the 2026-10-02
  fallback task: **103 targeted tests across four files now pass**. The full suite
  was not rerun. Live Gmail rendering and PayMongo operations remain untested here.

For full developer context, see [`HANDOFF.md`](./HANDOFF.md).

---

## Design System

### Film-burn aesthetic
Dark default theme with warm red/orange edges echoing CRT-era hardware. Controlled by `--burn-opacity` CSS variable. Light mode adapts to a soft warm vignette. Admin is dark-only.

### Key design tokens

| Token | Dark | Light |
|---|---|---|
| `repixl-bg` | `#121012` | `#f5f0ea` |
| `repixl-charcoal` | `#16131a` | `#ffffff` |
| `repixl-red` | `#C22C2C` | `#b52a2a` |
| `repixl-text-light` | `#F5F1EC` | `#1a1610` |
| `repixl-muted` | `#8C8580` | `#6b6357` |

### Typography
- `font-display` → General Sans (headings, hero)
- `font-body` → Inter (body text, forms)
- `font-mono` → JetBrains Mono (prices, specs, badges)

### Burn intensity classes
| Class | Context | Intensity |
|---|---|---|
| *(default)* | Home, product pages | Full |
| `.burn-subtle` | Account, checkout, auth | ~40% |
| `.burn-minimal` | Admin login | ~15% |
