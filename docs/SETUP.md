# RePXL — Complete Setup Guide

Everything you need to take RePXL from a fresh clone to a live site with a real
database and working payments. Follow the parts in order. Total time: ~30 min.

- **Part 1** — Local project setup
- **Part 2** — Database (PostgreSQL)
- **Part 3** — Payments (PayMongo)
- **Part 4** — Environment variables reference
- **Part 5** — Deploy to Vercel
- **Part 6** — Automatic migrations (GitHub Actions)
- **Part 7** — Everyday workflow & troubleshooting

> **Good to know:** RePXL has a **localStorage fallback** — if the database or an
> API is briefly unreachable, the storefront keeps working from browser storage.
> And **payments are optional**: with no PayMongo keys, checkout uses a built-in
> demo flow; add the keys and it becomes real hosted payments. Nothing breaks
> while you set things up incrementally.

---

## Part 1 — Local project setup

Requirements: **Node 18+** and **npm**.

```powershell
npm install
Copy-Item .env.local.example .env.local
```

You'll fill in `.env.local` as you go through Parts 2–3. For a quick local run
with no database or payments yet:

```powershell
npm run dev
```

The site runs at http://localhost:3000 using seed data + localStorage.

---

## Part 2 — Database (PostgreSQL)

RePXL uses PostgreSQL via Prisma. On Vercel (serverless) you need **connection
pooling**, so every provider gives you two strings:

| Env var | Which string | Used for |
| --- | --- | --- |
| `DATABASE_URL` | **Pooled** (host has `-pooler`, or Supabase port `6543`) | App at runtime |
| `DIRECT_URL` | **Direct** (no pooler, port `5432`) | Migrations |

### 2.1 Create a database (Neon — recommended)

1. Sign up at **https://neon.tech** → **Create project** named `repixl`, region
   near your users (e.g. Singapore for PH).
2. Open **Connection Details** and copy BOTH strings:
   - the one containing `-pooler` → `DATABASE_URL`
   - the one WITHOUT `-pooler` → `DIRECT_URL`

<details><summary>Prefer Supabase?</summary>

Project Settings → Database → Connection string:
- **Transaction** pooler (port `6543`) + `?pgbouncer=true&connection_limit=1` → `DATABASE_URL`
- **Direct connection** (port `5432`) → `DIRECT_URL`
</details>

### 2.2 Configure and initialize

1. Put the two strings and a secret in `.env.local`:
   ```powershell
   npx auth secret        # copy output into NEXTAUTH_SECRET
   ```
2. The Prisma CLI reads `.env` (not `.env.local`), so mirror it:
   ```powershell
   Copy-Item .env.local .env -Force
   ```
3. Create the tables + load starter data in one command:
   ```powershell
   npm run db:setup
   ```
   This runs `prisma migrate deploy` (builds all tables from
   `prisma/migrations/`) then `prisma db seed` (admin, demo customer, 12 cameras,
   vouchers, reviews).

   **Seeded logins:**
   - Admin: `admin@repxl.com` / `admin123`
   - Customer: `demo@repxl.com` / `customer123`

4. (Optional) Browse the data: `npm run prisma:studio`

---

## Part 3 — Payments (PayMongo)

PayMongo is the Philippine gateway used for card, GCash, Maya, and GrabPay via a
**hosted checkout** page. Flow: your server creates a checkout session → the
customer pays on PayMongo's page → PayMongo redirects back and sends a signed
**webhook** that finalizes the order (marks it paid, decrements stock, clears the
cart).

> Skip this whole part to launch without real payments — checkout falls back to
> the demo flow automatically.

### 3.1 Get your keys

1. Create an account at **https://dashboard.paymongo.com** and stay in **Test mode**.
2. Go to **Developers → API keys**. Copy:
   - **Secret key** (`sk_test_...`) → `PAYMONGO_SECRET_KEY`
   - **Public key** (`pk_test_...`) → `NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY`

### 3.2 Register the webhook

The webhook confirms payment. You need a public URL, so do this **after** your
first Vercel deploy (Part 5), or use a tunnel (e.g. `ngrok http 3000`) for local
testing.

1. Dashboard → **Developers → Webhooks → Create webhook**.
2. URL: `https://your-app.vercel.app/api/webhooks/paymongo`
3. Events: select at least **`checkout_session.payment.paid`**, plus
   **`payment.paid`** and **`payment.failed`**.
4. After creating it, copy the **webhook signing secret** (`whsk_...`) →
   `PAYMONGO_WEBHOOK_SECRET`.

<details><summary>Registering the webhook via API (alternative)</summary>

```bash
curl https://api.paymongo.com/v1/webhooks \
  -u sk_test_your_secret_key: \
  -H "Content-Type: application/json" \
  -d '{"data":{"attributes":{"url":"https://your-app.vercel.app/api/webhooks/paymongo","events":["checkout_session.payment.paid","payment.paid","payment.failed"]}}}'
```
The response includes `attributes.secret_key` — that's your `PAYMONGO_WEBHOOK_SECRET`.
</details>

### 3.3 Enable it

Set these (locally in `.env.local`, and in Vercel for production):

```
PAYMONGO_SECRET_KEY=sk_test_...
NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY=pk_test_...
PAYMONGO_WEBHOOK_SECRET=whsk_...
NEXT_PUBLIC_PAYMONGO_ENABLED=true
```

`NEXT_PUBLIC_PAYMONGO_ENABLED=true` is the switch that tells the checkout page to
redirect to PayMongo. Leave it `false` (or unset) to keep the demo flow.

### 3.4 Test a payment

1. Add an item to the cart and go through checkout → you're redirected to PayMongo.
2. Use a **test card**: `4343 4343 4343 4345`, any future expiry, any CVC.
   (GCash/Maya test flows have an "Authorize/Success" button on the test page.)
3. After paying you land on `/checkout/success`; the webhook marks the order
   paid, decrements stock, and clears your cart.

**Go live later:** switch the dashboard to Live mode, swap in `sk_live_`/`pk_live_`
keys, and register a live webhook — no code changes.

---

## Part 4 — Environment variables reference

| Name | Required | Example / notes |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Pooled Postgres string |
| `DIRECT_URL` | ✅ | Direct Postgres string (migrations) |
| `NEXTAUTH_SECRET` | ✅ | `npx auth secret` |
| `NEXTAUTH_URL` | ✅ | `http://localhost:3000` / `https://your-app.vercel.app` |
| `NEXT_PUBLIC_SITE_URL` | ✅ | same as `NEXTAUTH_URL` (used in emails + payment redirects) |
| `PAYMONGO_SECRET_KEY` | payments | `sk_test_...` / `sk_live_...` |
| `NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY` | payments | `pk_test_...` |
| `PAYMONGO_WEBHOOK_SECRET` | payments | `whsk_...` |
| `NEXT_PUBLIC_PAYMONGO_ENABLED` | payments | `true` to turn on the redirect flow |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional | Google sign-in |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | optional | reset/newsletter/contact emails |

Files: `.env.local` (local dev), `.env` (Prisma CLI — mirror of `.env.local`),
Vercel Environment Variables (production). All `.env*` files are gitignored.

---

## Part 5 — Deploy to Vercel

1. Push to GitHub:
   ```powershell
   git add .
   git commit -m "chore: setup db + paymongo"
   git branch -M main
   git remote add origin https://github.com/<you>/repixl.git
   git push -u origin main
   ```
2. **https://vercel.com → Add New → Project** → import the repo. Vercel detects
   Next.js; `vercel.json` sets the build to `npm run vercel-build`
   (`prisma generate && prisma migrate deploy && next build`), so **migrations
   apply automatically on every deploy**.
3. **Settings → Environment Variables** → add everything from Part 4 for
   **Production**, **Preview**, and **Development**. Set the URL vars to your real
   `https://your-app.vercel.app`.
4. **Deploy.**
5. Now finish **Part 3.2** (register the webhook against your live URL) and add
   `PAYMONGO_WEBHOOK_SECRET` + set `NEXT_PUBLIC_PAYMONGO_ENABLED=true` in Vercel,
   then redeploy.

---

## Part 6 — Automatic migrations (GitHub Actions)

`.github/workflows/db-migrate.yml` also runs `prisma migrate deploy` on every push
to `main` that changes `prisma/**`. This is complementary to the Vercel build
(both are idempotent). One-time setup:

- GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**
- Name: `DIRECT_URL`, Value: your direct Postgres string.

If you skip it, the Actions job fails but deploys still work (Vercel migrates too).

---

## Part 7 — Everyday workflow & troubleshooting

**Ship code:** `git push` — Vercel rebuilds, migrates, and redeploys.

**Change the schema:**
```powershell
# edit prisma/schema.prisma, then:
npm run prisma:migrate -- --name your_change   # create migration locally
git add prisma/migrations && git commit -m "db: your_change" && git push
```

**Reset the DB (wipes data!):** `npm run db:reset`

### Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Environment variable not found: DIRECT_URL` | Copy `.env.local` → `.env` (Prisma CLI reads `.env`). |
| `Can't reach database server` | Check host/password; string must end with `?sslmode=require`. |
| `too many connections` in production | `DATABASE_URL` must be the **pooled** string, not the direct one. |
| Login/session breaks after deploy | `NEXTAUTH_SECRET` + `NEXTAUTH_URL` must be set in Vercel. |
| Checkout uses demo flow, not PayMongo | Set `NEXT_PUBLIC_PAYMONGO_ENABLED=true` **and** the `PAYMONGO_*` keys. |
| Paid but order not confirmed | Webhook not reaching you: check the URL, that `PAYMONGO_WEBHOOK_SECRET` matches, and PayMongo Dashboard → Webhooks → delivery logs. |
| Webhook returns 401 | `PAYMONGO_WEBHOOK_SECRET` is wrong, or test/live mode mismatch with your keys. |
| Emails not sending | Expected without `GMAIL_USER`/`GMAIL_APP_PASSWORD`; the message logs to the server console instead. |

### How payment confirmation works (reference)

1. Checkout → `POST /api/checkout/session` creates a **PENDING** order (no stock
   change yet) and a PayMongo session; returns the `checkout_url`.
2. Customer pays on PayMongo → redirected to `/checkout/success?order=RPX-…`.
3. PayMongo sends a signed webhook to `POST /api/webhooks/paymongo`. The handler
   verifies the signature, then (idempotently) marks the order **PAID**,
   decrements stock, increments voucher usage, and clears the cart.

This means stock is never reduced for unpaid orders, and duplicate webhook
deliveries are safe.
