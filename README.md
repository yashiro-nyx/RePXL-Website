# RePXL

**Capture the past. Frame the future.**

RePXL is a curated marketplace for vintage digital cameras — condition-graded, serial-verified, and trusted by collectors. Admin-managed inventory with full e-commerce: cart, checkout, PayMongo payments, order management, and customer accounts.

Live at: **https://repxlph.vercel.app**

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

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript strict) |
| Styling | Tailwind CSS + custom design tokens |
| Animation | Framer Motion |
| Client state | Zustand (API-first, localStorage fallback) |
| Database | PostgreSQL via **Prisma ORM** (Neon) |
| Auth | Custom HTTP-only cookie sessions + NextAuth (Google) |
| Email | Nodemailer + Gmail SMTP |
| Payments | PayMongo Hosted Checkout |
| Deployment | Vercel |

---

## Requirements

- Node.js 18+
- npm 9+
- PostgreSQL database (Neon recommended)
- PayMongo account (for real payments)
- Gmail account with App Password (for email)
- Google Cloud project (for Google OAuth, optional)

---

## Installation

```bash
git clone https://github.com/yashiro-nyx/RePXL-Website.git
cd "RePXL Website"
npm install
```

---

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in the values. **Never commit `.env.local`** — it is gitignored.

```bash
cp .env.local.example .env.local
```

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | Pooled PostgreSQL connection (Neon pooler endpoint) |
| `DIRECT_URL` | ✅ | Direct PostgreSQL connection (for Prisma migrations) |
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

Seeded accounts:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@repixl-admin.com` | See `ADMIN_PASSWORD` in your team's secure notes |
| Demo customer | `demo@repxl.com` | See seed file |

> ⚠️ Change the admin password immediately after first login in production.

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

**Pending (manual action required):**
- Activate payment methods in PayMongo Dashboard (Live mode)
- Add `birthDate` column to DB if persistent birth date is required
- Move saved payment cards from localStorage to database

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
