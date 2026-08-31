# RePXL — Developer Handoff

**Project:** RePIXL: Development of a Vintage Digital Camera (Digicam) E-commerce Website  
**Status:** Production-ready. Live on Vercel at `https://repxlph.vercel.app`  
**Last updated:** August 2026

---

## 1. Project Overview

RePXL is a curated, admin-managed marketplace for buying vintage digital cameras. It is not a peer-to-peer platform — the store admin manages all inventory. Core differentiators: condition grading (Mint/Excellent/Good/Fair), serial number transparency, and a camera comparison tool.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript strict) |
| Styling | Tailwind CSS + custom design tokens |
| Animation | Framer Motion |
| Client state | Zustand (cartStore, wishlistStore, productStore, authStore, etc.) |
| Database | PostgreSQL via **Prisma ORM** (hosted on Neon) |
| Authentication | Custom HTTP-only cookie sessions (bcrypt passwords) + NextAuth for Google OAuth |
| Email | Gmail SMTP via Nodemailer |
| Payments | PayMongo Hosted Checkout (Live mode active) |
| Deployment | Vercel |

---

## 3. Architecture

```
Browser (React / Zustand)
    │
    ├── zustand stores (API-first, localStorage fallback)
    │       ├── productStore.hydrate()  → GET /api/products (ACTIVE only, storefront)
    │       ├── cartStore.hydrate()     → GET /api/cart
    │       ├── wishlistStore           → GET /api/wishlist
    │       ├── authStore               → POST /api/auth/login  (cookie session)
    │       └── orderHistoryStore       → GET /api/orders
    │
    └── Next.js API Routes (server-only, Prisma + PostgreSQL)
            ├── /api/auth/*             — login, register, logout, me, change-password, oauth
            ├── /api/products/*         — CRUD, filtering, stock management
            ├── /api/cart/*             — per-user cart (DB-backed)
            ├── /api/orders/*           — create, list, status, archive
            ├── /api/addresses/*        — CRUD + default
            ├── /api/reviews/*          — create, update, delete
            ├── /api/vouchers/*         — admin CRUD + /validate
            ├── /api/wishlist/*         — add/remove
            ├── /api/checkout/session   — PayMongo Checkout Session creation
            ├── /api/webhooks/paymongo  — payment finalization
            ├── /api/newsletter/subscribe
            ├── /api/contact
            └── /api/admin/*            — stats, customers, logs, accounts
```

**API-first with localStorage fallback:** Every Zustand store calls its service which tries the API first. On network/DB failure it falls back to localStorage so the UI degrades gracefully rather than breaking.

---

## 4. Database (Prisma + PostgreSQL)

**Provider:** Neon (serverless PostgreSQL)  
**ORM:** Prisma 5.22

### Schema models

| Model | Purpose |
|---|---|
| `User` | Customers and admins. `role: CUSTOMER\|ADMIN`, `isSuperAdmin`, `isArchived` |
| `Product` | Cameras. `slug` (unique), `stock`, `status`, `condition`, specs as flat columns |
| `CartItem` | Per-user cart. Unique on `(userId, productId)` |
| `Order` | Orders with `paymentStatus: PENDING\|PAID\|FAILED\|REFUNDED` |
| `OrderItem` | Line items with `quantity` and `price` (unit price snapshot at purchase time) |
| `Address` | Per-user saved addresses with `barangay` and `province` fields |
| `WishlistItem` | Per-user wishlist |
| `Review` | Per user per product. `verifiedPurchase` flag |
| `Voucher` | Discount codes with usage tracking |
| `PasswordResetToken` | SHA-256 hashed, single-use, 1-hour TTL |
| `AdminLog` | Audit trail for admin actions |
| `NewsletterSubscriber` | Email list |

### Key Prisma commands

```bash
npm run prisma:generate    # regenerate Prisma client after schema changes
npm run prisma:migrate     # deploy pending migrations (non-interactive, for CI/Vercel)
npm run prisma:studio      # open Prisma Studio UI
npm run db:seed            # seed admin user, products, reviews, vouchers
npm run db:setup           # migrate + seed (use for fresh database)
npm run db:reset           # reset all data (destructive — dev only)
```

### Seeded data

The seed creates:
- Admin account: `admin@repixl-admin.com` (password in `.env.local`)
- Demo customer: `demo@repxl.com`
- 12 vintage camera products
- 8 sample reviews across multiple products
- 3 voucher codes (WELCOME10, SUMMER15, FLAT5)

---

## 5. Authentication

### Customer auth
- Endpoint: `POST /api/auth/login` — bcrypt verify → issues HTTP-only cookie (`repixl-session-token`, 7 days)
- `GET /api/auth/me` — returns current user from cookie session
- `POST /api/auth/logout` — clears both customer and admin cookies
- `POST /api/auth/register` — creates DB user, sets cookie
- `POST /api/auth/change-password` — bcrypt verify old → hash new
- `POST /api/auth/forgot-password` — stores hashed reset token in DB, sends Gmail email
- `POST /api/auth/reset-password` — consumes token atomically, updates DB password
- `POST /api/auth/oauth` — upserts Google OAuth user in DB, sets same HTTP-only cookie

### Admin auth
- Separate cookie: `repixl-admin-session-token` (1 hour TTL)
- `POST /api/auth/login` — same endpoint; if `role === ADMIN` also sets admin cookie
- Admin pages guarded by `getCurrentAdmin()` which reads the admin cookie

### Google OAuth
- NextAuth v4 with Google provider
- After NextAuth redirects back, `useOAuthSync` hook calls `POST /api/auth/oauth` to create/find the user in PostgreSQL and set the HTTP-only cookie
- Without this step, `GET /api/auth/me` would return 401 for OAuth users

### Session cookies
- Signed HMAC-SHA256 using `NEXTAUTH_SECRET`
- HTTP-only, Secure in production, SameSite=Lax
- `getCurrentUser()` / `getCurrentAdmin()` in `src/lib/auth-helpers.ts`

---

## 6. Main API Routes

```
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/logout
GET    /api/auth/me
PUT    /api/auth/me                        # profile update (name, email, phone)
POST   /api/auth/change-password
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
POST   /api/auth/validate-reset-token
POST   /api/auth/oauth                     # Google OAuth → DB upsert + cookie

GET    /api/products                       # filter by status, brand, condition, price
POST   /api/products                       # admin: create
GET    /api/products/[slug]
PUT    /api/products/[slug]                # admin: update
DELETE /api/products/[slug]                # admin: delete + log

GET    /api/cart
POST   /api/cart
PUT    /api/cart/[itemId]
DELETE /api/cart/[itemId]
DELETE /api/cart                           # clear entire cart

GET    /api/orders
POST   /api/orders                         # direct checkout (non-PayMongo)
GET    /api/orders/[orderNumber]
PATCH  /api/orders/[orderNumber]           # admin: update status
POST   /api/orders/[orderNumber]/archive
DELETE /api/orders/[orderNumber]/archive   # restore
POST   /api/orders/confirmation            # send confirmation email (direct flow)

GET    /api/addresses
POST   /api/addresses
PUT    /api/addresses/[addressId]
DELETE /api/addresses/[addressId]
PUT    /api/addresses/[addressId]/default  # PATCH also works

GET    /api/reviews
POST   /api/reviews
PUT    /api/reviews/[reviewId]
DELETE /api/reviews/[reviewId]

GET    /api/vouchers                       # admin only
POST   /api/vouchers                       # admin only
DELETE /api/vouchers/[voucherId]           # admin only
PATCH  /api/vouchers/[voucherId]           # admin: update status
POST   /api/vouchers/validate              # customer: check code + discount

GET    /api/wishlist
POST   /api/wishlist
DELETE /api/wishlist/[productId]

POST   /api/checkout/session               # create PayMongo checkout session
POST   /api/webhooks/paymongo             # PayMongo webhook → finalize order
GET    /api/webhooks/paymongo             # (not used, PayMongo calls POST)

POST   /api/newsletter/subscribe
POST   /api/contact

GET    /api/admin/customers
POST   /api/admin/customers/[id]/archive
DELETE /api/admin/customers/[id]/archive
GET    /api/admin/accounts
POST   /api/admin/accounts
GET    /api/admin/stats
GET    /api/admin/logs
```

---

## 7. Customer Features

| Feature | Status | Notes |
|---|---|---|
| Register / Login / Logout | ✅ | DB-backed, HTTP-only cookie sessions |
| Google OAuth | ✅ | `POST /api/auth/oauth` upserts user, sets cookie |
| Forgot / Reset Password | ✅ | Gmail SMTP, hashed token in DB |
| Change Password | ✅ | bcrypt verify old → hash new |
| Profile update (name, email, phone) | ✅ | Persists to DB via `PUT /api/auth/me` |
| Birth date field | ✅ | Stored in localStorage (no DB column). UI shows dirty state correctly |
| Logout confirmation modal | ✅ | Account page sidebar |
| Navbar logout | ⚠️ | Navbar logout skips confirmation modal (logs out directly) |
| Product listing | ✅ | ACTIVE products only, live DB stock, In Stock filter |
| Product detail | ✅ | Stock from DB, `<= 0` treated as Out of Stock |
| Search | ✅ | Filters by name/brand/series in productStore |
| Compare | ✅ | Up to 3 cameras, side-by-side specs |
| Webcam filter demo | ✅ | Per-brand CSS filter profiles |
| Cart (add/update/remove) | ✅ | DB-backed, user-scoped |
| Cart persistence after refresh | ✅ | Auth hydrates before cart to avoid race condition |
| Wishlist | ✅ | DB-backed, user-scoped |
| Addresses (CRUD + default + barangay) | ✅ | DB-backed |
| Voucher validation | ✅ | Server-side via `/api/vouchers/validate` |
| Terms & Conditions checkbox | ✅ | Clicking checkbox opens modal; I Agree sets it checked |
| Checkout (direct flow) | ✅ | `POST /api/orders` with stock decrement in transaction |
| Checkout (PayMongo) | ✅ | Live mode active; `POST /api/checkout/session` |
| Order quantity accuracy | ✅ | `OrderItem.quantity` from DB; mapper uses `item.stock` for qty |
| Negative stock prevention | ✅ | `updateMany WHERE stock >= qty` + floor at 0 |
| Duplicate webhook safety | ✅ | `paymentStatus === PAID` guard inside transaction |
| Order confirmation email | ✅ | Sent from webhook after finalization |
| Checkout success / receipt page | ✅ | Fetches order from API, not localStorage |
| Print receipt (checkout) | ✅ | `.receipt-print-area` CSS class |
| Order history | ✅ | Filtered by `userEmail` from DB |
| Order details modal | ✅ | Shows DB quantity + snapshot price |
| Print receipt (account) | ✅ | Order Details modal has Print Receipt button |
| Reviews | ✅ | One per user per product, verified purchase |
| Newsletter subscribe | ✅ | Prisma upsert + Gmail SMTP |
| Contact Us | ✅ | Gmail SMTP, no DB persistence needed |

---

## 8. Admin Features

| Feature | Status | Notes |
|---|---|---|
| Admin login (separate) | ✅ | `admin@repixl-admin.com` / see `.env.local` |
| Admin session (1-hour expiry) | ✅ | Separate `repixl-admin-session-token` cookie |
| Dashboard stats | ✅ | Live counts from DB; customer count from API |
| Camera/product management | ✅ | CRUD with condition, serial, specs |
| Stock management | ✅ | Live DB stock, negative-safe updates |
| Customer management | ✅ | List from DB, archive/restore |
| Archived customers | ✅ | Fetched from DB (`isArchived=true`), not localStorage |
| Order management | ✅ | Status updates, archive/restore, view modal |
| Voucher management | ✅ | Reads/writes DB via voucherStore → API |
| Review management | ✅ | Admin can delete any review |
| Activity logs | ✅ | `AdminLog` table, filterable |
| Admin settings (password change) | ✅ | Calls `POST /api/auth/change-password` |
| Admin settings (profile update) | ✅ | Calls `PUT /api/auth/me` |
| Admin accounts | ✅ | Super-admin only, `POST /api/admin/accounts` |

---

## 9. Checkout / PayMongo Flow

```
1. Customer fills checkout form → clicks Place Order
2. isPaymongoEnabled() checks NEXT_PUBLIC_PAYMONGO_ENABLED === 'true'
   ├── TRUE  → POST /api/checkout/session
   │           ├── Creates Order with paymentStatus=PENDING (no stock change yet)
   │           ├── Creates PayMongo Checkout Session
   │           └── Redirects customer to checkout.paymongo.com
   │
   └── FALSE → POST /api/orders (direct demo flow)
               ├── Creates order, decrements stock, clears cart in one transaction
               └── Shows inline receipt on checkout page

PayMongo payment success:
3. Customer completes payment on PayMongo hosted page
4. Redirected to: https://repxlph.vercel.app/checkout/success?order=RPX-...
5. PayMongo sends POST /api/webhooks/paymongo with event checkout_session.payment.paid
6. finalizePaidOrder():
   ├── Checks paymentStatus !== PAID (idempotency guard)
   ├── Transaction: sets PAID, decrements stock safely, clears cart
   └── Sends confirmation email (non-blocking, won't fail the order)
7. Success page polls GET /api/orders/[orderNumber] until order appears
```

### PayMongo config

- **Mode:** Live (`sk_live_` key active in Vercel env)
- **Webhook endpoint:** `https://repxlph.vercel.app/api/webhooks/paymongo`
- **Events subscribed:** `checkout_session.payment.paid`, `payment.paid`, `payment.failed`
- **Signature:** verified using `PAYMONGO_WEBHOOK_SECRET` (HMAC-SHA256, timing-safe)
- **Payment methods sent:** `['card', 'gcash', 'paymaya', 'grab_pay', 'qrph']`
- **⚠️ Important:** PayMongo Dashboard → Settings → Payment Methods must have at least one method **Active** in Live mode. The API accepts the session even if no methods are enabled, but the checkout page shows "No payment methods available."

---

## 10. Email (Gmail SMTP)

- Transport: Nodemailer via `src/lib/mailer.ts`
- Sender: `GMAIL_USER` env var
- Used for: forgot-password reset links, order confirmation (webhook), newsletter confirmation, contact form notifications
- If `GMAIL_USER` / `GMAIL_APP_PASSWORD` are not set, emails log to console (dev mode)
- Gmail App Password required (not the account password) — generate at Google Account → Security → App Passwords

---

## 11. Required Environment Variables

Never commit values. Set in Vercel Dashboard → Project Settings → Environment Variables.

```
# Database
DATABASE_URL         # Pooled connection string (Neon pooler endpoint)
DIRECT_URL           # Direct connection string (Neon direct endpoint, for migrations)

# Auth
NEXTAUTH_SECRET      # 32-byte random string (openssl rand -base64 32)
NEXTAUTH_URL         # https://repxlph.vercel.app (production)

# Google OAuth (optional)
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET

# PayMongo (required for payment)
PAYMONGO_SECRET_KEY              # sk_live_... (server-only)
NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY  # pk_live_... (client-safe)
PAYMONGO_WEBHOOK_SECRET          # whsk_... (server-only)
NEXT_PUBLIC_PAYMONGO_ENABLED     # "true" to activate hosted checkout

# Site URL (used in emails + PayMongo redirect URLs)
NEXT_PUBLIC_SITE_URL             # https://repxlph.vercel.app (no trailing slash)

# Gmail SMTP
GMAIL_USER           # your-gmail@gmail.com
GMAIL_APP_PASSWORD   # 16-character App Password (not your Gmail login password)
```

---

## 12. Recent Fixes (completed)

These are confirmed in the current codebase and do not need revisiting:

- **Database/Prisma** — migration applied, seed runs, all tables created on Neon
- **Admin credentials** — seeded as `admin@repixl-admin.com` with correct hashed password
- **Google OAuth** — `POST /api/auth/oauth` creates DB user + sets HTTP-only cookie; redirect works after login
- **Cart race condition** — auth hydrates before cart in `cart/page.tsx` and `checkout/page.tsx`
- **Cart empty on navigation** — `cartStore.hydrate()` guards against overwriting non-empty cart with empty API response
- **Negative stock** — `updateMany WHERE stock >= qty` + floor-at-0 fallback; 3 affected products corrected in DB
- **Order quantity (was hardcoded 1)** — now reads `item.stock` (mapper encodes qty there) and `item.price` (snapshot)
- **Order confirmation email** — sent from webhook after `finalizePaidOrder()`, non-blocking
- **Checkout success page** — fetches real order from API, shows full receipt, Print Receipt works
- **Print receipt (account)** — Order Details modal has receipt-print-area + Print button
- **Terms checkbox** — clicks open modal; "I Agree" sets the checkbox
- **Logout confirmation** — account page sidebar shows confirmation modal
- **Birth date** — loaded from / saved to localStorage per user; `hasChanges` includes it
- **Profile update (PUT /api/auth/me)** — phone no longer overwritten with empty string
- **Wishlist hydrate** — no longer clears on network error
- **Reset password** — no longer writes plaintext password to localStorage
- **Admin settings** — password change calls real API; profile update persists to DB
- **Admin dashboard** — duplicate "Pending" row fixed; real customer count from API; async hydration
- **Admin vouchers** — reads/writes voucherStore (DB-backed), not hardcoded React state
- **Archived customers** — fetched from DB, not localStorage
- **Product listing** — awaits DB hydration before showing results; "In Stock Only" filter added; count reflects filtered set
- **PayMongo redirect URLs** — trailing slash stripped from `NEXT_PUBLIC_SITE_URL`

---

## 13. Known Issues / Needs Verification

- **Navbar logout** — the dropdown "Log Out" button logs out immediately without a confirmation modal (the modal only exists on the Account page sidebar)
- **PayMongo payment methods** — at least one method must be activated in PayMongo Dashboard → Settings → Payment Methods (Live mode). If none are active, the checkout page shows "No payment methods available" — this is a PayMongo account configuration issue, not a code bug
- **Birth date** — stored in localStorage per user email key (`repixl-birthdate-{email}`), not in the PostgreSQL database (no `birthDate` column in the `User` model). Changing email breaks the birthdate lookup
- **Saved payment cards** — stored in localStorage per user (`repixl-payments-{email}`), not in the database
- **Admin `/products` page** — renders a stub "Product management coming soon" — the actual camera management is at `/admin/cameras`
- **Compare page keyboard accessibility** — picker dialog lacks `aria-modal` and a complete focus trap
- **`setHydrated` timing in admin dashboard** — now fixed with `await` but the `customerCount` fetch is fire-and-forget; in slow networks the count shows `—` briefly

---

## 14. Important Developer Notes

1. **`productService.listActive()` vs `list()`** — storefront pages use `listActive()` (ACTIVE products, live DB stock). Admin pages use `productService.list()` directly via dynamic import to get all statuses.

2. **`NEXT_PUBLIC_SITE_URL` must not have a trailing slash** — the `siteUrl()` helper strips it, but set the env var without a trailing slash to be safe.

3. **Vercel env vars vs `.env.local`** — `.env.local` is for local dev only (gitignored). Production values must be set in Vercel Dashboard. The `NEXT_PUBLIC_*` variables are baked into the client bundle at build time, so a redeploy is required after changing them in Vercel.

4. **Prisma on Vercel** — `package.json` has `"vercel-build": "prisma generate && prisma migrate deploy && next build"` and `"postinstall": "prisma generate"`. Migrations run automatically on every Vercel deployment.

5. **Session signing** — `NEXTAUTH_SECRET` is used for both NextAuth JWT sessions AND the custom HTTP-only cookie HMAC. It must be set in production. The fallback (`repixl-dev-only-insecure-secret`) is only for local development and will throw in production if not set.

6. **Order item quantity encoding** — `apiToClientOrder` in `mappers.ts` stores the purchased quantity in `product.stock` and snapshot unit price in `product.price` on the `Product` objects in `Order.items`. This is a design convention — not actual product stock.

---

## 15. Recommended Next Steps

1. **Enable PayMongo payment methods** — in PayMongo Dashboard (Live mode) → Settings → Payment Methods → activate Card and/or GCash
2. **Add birthDate to the User DB schema** — add `birthDate DateTime?` column to Prisma schema, migrate, update `PUT /api/auth/me` to accept and store it
3. **Move saved cards to DB** — add a `SavedCard` model to Prisma (store payment provider token, not raw card data)
4. **Navbar logout confirmation** — add a state + modal to `Navbar.tsx` mirroring the Account page implementation
5. **Admin /products page** — the stub at `/admin/products` confuses navigation; either redirect to `/admin/cameras` or build it out
6. **Run live payment test** — activate at least one payment method in PayMongo Dashboard, then do an end-to-end test purchase in live mode
7. **Monitor webhook delivery** — check PayMongo Dashboard → Developers → Webhooks for any failed deliveries after go-live
