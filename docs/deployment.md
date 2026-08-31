# RePXL — Deployment Guide (PostgreSQL + Vercel)

This walks you through going from local code to a live site on Vercel with a real
PostgreSQL database. Estimated time: ~20 minutes.

You only do **Part A + B once**. After that, deploys are just `git push`.

---

## Overview

RePXL runs on Vercel (Next.js) and talks to a managed PostgreSQL database through
Prisma. Vercel runs your API as serverless functions, so the database needs
**connection pooling**. Every provider below gives you two connection strings:

| Env var | Which string | Used for |
| --- | --- | --- |
| `DATABASE_URL` | **Pooled** (host has `-pooler`, or Supabase port `6543`) | The app at runtime |
| `DIRECT_URL` | **Direct** (no pooler, port `5432`) | Running migrations |

> The app also has a **localStorage fallback**: if the database is ever
> unreachable, the storefront keeps working from browser storage. But for a real
> deployment you want the DB reachable so orders, accounts, and admin changes
> persist server-side.

---

## Part A — Create the database (Neon, recommended)

1. Go to **https://neon.tech** and sign up (free tier is plenty).
2. **Create a project**. Name it `repixl`, pick the region closest to your Vercel
   region (e.g. `US East`).
3. On the project dashboard, open **Connection Details**. You'll see a connection
   string. Toggle **"Pooled connection"** on and off to get BOTH forms:
   - Pooled (host contains `-pooler`) → this is your **`DATABASE_URL`**
   - Direct (no `-pooler`) → this is your **`DIRECT_URL`**
4. Keep both handy. They look like:
   ```
   postgresql://repixl_owner:npg_xxx@ep-cool-name-pooler.us-east-2.aws.neon.tech/repixl?sslmode=require
   postgresql://repixl_owner:npg_xxx@ep-cool-name.us-east-2.aws.neon.tech/repixl?sslmode=require
   ```

<details>
<summary>Using Supabase instead?</summary>

Project Settings → Database → **Connection string**:
- **Transaction** pooler (port `6543`), then append `?pgbouncer=true&connection_limit=1` → `DATABASE_URL`
- **Direct connection** (port `5432`) → `DIRECT_URL`
</details>

---

## Part B — Set up the schema + seed data (run once, from your machine)

1. Copy the env template and fill in the two Neon strings:
   ```powershell
   Copy-Item .env.local.example .env.local
   ```
   Open `.env.local` and set `DATABASE_URL`, `DIRECT_URL`, and generate a secret:
   ```powershell
   # generates a value for NEXTAUTH_SECRET
   npx auth secret
   ```
   (Or on macOS/Linux/WSL: `openssl rand -base64 32`.)

2. Prisma reads `.env` (not `.env.local`) for CLI commands. Point it at the same
   values by copying:
   ```powershell
   Copy-Item .env.local .env -Force
   ```

3. Create the database tables and load starter data in **one command**:
   ```powershell
   npm install
   npm run db:setup
   ```
   `db:setup` runs `prisma migrate deploy` (creates all tables from the committed
   migration in `prisma/migrations/`) then `prisma db seed` (admin account, a demo
   customer, 12 cameras, vouchers, and reviews).

   Seeded logins:
   - **Admin:** `admin@repxl.com` / `admin123`
   - **Customer:** `demo@repxl.com` / `customer123`

4. (Optional) Inspect the data visually:
   ```powershell
   npm run prisma:studio
   ```

---

## Part C — Deploy to Vercel

1. Push your code to GitHub (see "Git" below if you haven't yet).
2. Go to **https://vercel.com → Add New → Project** and import your repo.
   Vercel auto-detects Next.js. Leave the build settings as-is (`vercel.json`
   sets the build command to `npm run vercel-build`, which runs
   `prisma generate && prisma migrate deploy && next build` — so **Vercel applies
   any pending migrations automatically on every deploy**).
3. Before the first deploy, open **Settings → Environment Variables** and add the
   following for **Production**, **Preview**, and **Development**:

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | your Neon **pooled** string |
   | `DIRECT_URL` | your Neon **direct** string |
   | `NEXTAUTH_SECRET` | the secret you generated |
   | `NEXTAUTH_URL` | `https://your-app.vercel.app` |
   | `NEXT_PUBLIC_SITE_URL` | `https://your-app.vercel.app` |
   | `GMAIL_USER` | *(optional)* your Gmail address |
   | `GMAIL_APP_PASSWORD` | *(optional)* Gmail app password |

4. Click **Deploy**. Done — your site is live.

> You already ran the schema + seed in Part B, so the deployed app connects to a
> ready database. From now on, migrations are applied **automatically** (see
> Part D), so you never have to run them by hand for a deploy.

---

## Part D — Automatic migrations (already set up)

Migrations now run automatically in **two** complementary places. Both use
`prisma migrate deploy`, which is idempotent (it only applies migrations that
haven't run yet), so running them together is safe.

1. **Vercel build** — `vercel.json` runs `npm run vercel-build`, which applies
   pending migrations before building. Nothing extra to configure; it uses the
   `DATABASE_URL` / `DIRECT_URL` you already added to Vercel.

2. **GitHub Actions** — `.github/workflows/db-migrate.yml` applies migrations on
   every push to `main` that touches `prisma/**`. This runs the migration up front
   (before/independently of the Vercel deploy) and can also be triggered manually
   from the repo's **Actions** tab.

   **One-time setup:** add the direct connection string as a repository secret:
   - GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `DIRECT_URL`
   - Value: your Neon/Supabase **direct** connection string

   > Only this one secret is needed. If you skip it, the workflow will fail but
   > the Vercel build will still apply migrations, so deploys keep working.

---

## Everyday workflow after setup

- **Ship code changes:** just `git push` — Vercel rebuilds and redeploys.
- **Change the database schema:** edit `prisma/schema.prisma`, then:
  ```powershell
  npm run prisma:migrate -- --name describe_your_change   # creates the migration locally
  git add prisma/migrations
  git commit -m "db: describe_your_change"
  git push                                                # migrations auto-apply (Actions + Vercel)
  ```
  You no longer need to run `prisma:deploy` by hand — the push handles it.
- **Reload seed data (wipes the DB!):** `npm run db:reset`

---

## Troubleshooting

- **`Environment variable not found: DIRECT_URL`** — Prisma CLI reads `.env`.
  Make sure you copied `.env.local` → `.env` (Part B step 2).
- **Local `npm run build` should NOT hit the database** — use `npm run build`
  locally (it's `prisma generate && next build`, no DB needed). Only Vercel runs
  `vercel-build`, which also applies migrations.
- **GitHub Actions "migrate" job fails** — add the `DIRECT_URL` repository secret
  (Part D). Deploys still succeed because Vercel applies migrations too.
- **`Can't reach database server`** — check the host/password, and that the string
  ends with `?sslmode=require`. Managed Postgres requires SSL.
- **`too many connections` on Vercel** — you're using the *direct* string at
  runtime. `DATABASE_URL` must be the **pooled** one; `DIRECT_URL` is only for
  migrations.
- **Login/session issues after deploy** — `NEXTAUTH_SECRET` must be set in Vercel
  (production throws if it's missing) and `NEXTAUTH_URL` must match your real URL.
- **Emails not sending** — that's expected without `GMAIL_USER` /
  `GMAIL_APP_PASSWORD`; the reset link / message is logged to the server console
  instead. Set both to enable real email.

---

## Git (if you haven't pushed yet)

```powershell
git add .
git commit -m "chore: prisma migration + deployment setup"
git branch -M main
git remote add origin https://github.com/<you>/repixl.git
git push -u origin main
```

`.env`, `.env.local`, and `node_modules` are already gitignored, so no secrets get
committed. The `prisma/migrations/` folder **is** committed — that's what lets
`prisma migrate deploy` build the tables.
