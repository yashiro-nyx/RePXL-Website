# RePXL ? Setup and Deployment

The canonical guide for local setup, server configuration, database migrations,
Vercel deployment, and native release prerequisites. This combines the former
setup and deployment guides. Implementation status is in the
[progress checklist](./Group2_ProjectChecklist.md); native device instructions
are in [react-native/README.md](../react-native/README.md).

## Local setup

Use Node/npm compatible with both project manifests; the database migration
workflow uses Node 22. Install root dependencies:

```powershell
npm install
```

Create an ignored `.env.local` using the variable names below. There is no tracked
root `.env.local.example`; do not depend on another developer's local backup.
Next.js reads `.env.local`; Prisma CLI reads `.env`, so configure both for the
intended local database. If they should contain the same configuration:

```powershell
Copy-Item .env.local .env -Force
npm run db:setup
npm run dev
```

`db:setup` applies committed migrations and runs the seed script. Seed accounts
are defined in `prisma/seed.ts`; use them only for development and replace default
credentials for a real deployment. The website runs at `http://localhost:3000`.
Account/commerce workflows require a reachable configured database; do not assume
browser storage can replace failed API mutations.

## Server environment

Keep actual values in ignored environment files or hosting/CI secret settings.
The table lists configuration names, not credentials.

| Names | Purpose |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | Pooled runtime and direct/migration PostgreSQL connections |
| `NEXTAUTH_SECRET` | Session/OAuth signing; required in production |
| `NEXTAUTH_URL`, `NEXT_PUBLIC_SITE_URL` | Correct public origin for auth, email, and redirects |
| `PAYMONGO_SECRET_KEY`, `NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY`, `PAYMONGO_WEBHOOK_SECRET`, `NEXT_PUBLIC_PAYMONGO_ENABLED` | Payment configuration and website checkout switch |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | Gmail SMTP |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Product/review uploads and protected return evidence |
| `MFA_ENCRYPTION_KEY` | Customer MFA encryption; 64 hex characters |
| `SHIPPING_WEBHOOK_SECRET` | Shipping webhook authentication |
| `EXPO_PUSH_ENABLED` | Optional server push delivery switch |
| `PRISMA_CONNECTION_LIMIT`, `PRISMA_POOL_TIMEOUT` | Optional Prisma pool tuning |

Additional feature-specific settings are read by their server modules. See
[system architecture](./system-architecture.md) and
[notifications/email](./communications.md) before changing auth or delivery.

## Database and migrations

The schema uses PostgreSQL. For Supabase, use a transaction-pooled connection
for runtime and a migration-capable direct/session connection for Prisma CLI.
Use the connection parameters provided for your project, including the pooler
and SSL requirements; avoid hardcoded hostnames or credentials in docs.

| Command | Actual behavior |
|---|---|
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:migrate` / `npm run prisma:deploy` | Apply committed migrations with `prisma migrate deploy` |
| `npx prisma migrate dev --name describe_change` | Create/apply a new migration against a development database |
| `npm run db:seed` | Run `prisma/seed.ts` |
| `npm run db:setup` | Deploy migrations and seed |
| `npm run prisma:studio` | Inspect database records |
| `npm run db:reset` | Reset the configured database; destructive |

Keep schema changes and generated migrations together for review. Use development
migration commands against a development database. `prisma:migrate -- --name`
does not create a migration: the npm script runs the deploy command.

## Payments and Google OAuth

Configure PayMongo keys for the intended test/live mode and register the public
`/api/webhooks/paymongo` URL. The handler supports signed
`checkout_session.payment.paid`, `payment.paid`, and `payment.failed` events.
Set the webhook signing secret on the server and enable the configured website
payment flow. Native hosted checkout requires the server payment configuration;
a missing gateway configuration is an API error, not a successful payment.

Test with the provider's test-mode checkout, confirm the order's PAID status,
inventory/cart changes, and webhook delivery. Live account/payment activation
and a real refund require separate verification. Refund limits are documented in
[returns.md](./returns.md).

For Google OAuth, configure the website origin and
`/api/auth/callback/google` redirect URI. The native app first opens the website
bridge, then returns to its registered `repxl` scheme; follow
[react-native/README.md](../react-native/README.md) for local/dev-build setup.

## Deployment

The website deploys on Vercel; the native app is built/released separately.
`vercel.json` selects `npm run vercel-build`, which runs Prisma generation,
`prisma migrate deploy`, and `next build`. Local `npm run build` generates the
client and builds the website without deploying migrations.

1. Configure the target database and hosting environment before deployment.
2. Import the repository into Vercel and use the tracked build configuration.
3. Set the appropriate public origins, server credentials, and webhook settings
   for each environment. Use isolated resources for staging/preview testing.
4. Deploy reviewed code and verify authentication, catalog, checkout/webhooks,
   uploads, and notification delivery against that environment.

The tracked `.github/workflows/db-migrate.yml` also deploys migrations on relevant
`main` pushes (`prisma/**` or workflow changes), and supports manual dispatch.
It validates both `DATABASE_URL` and `DIRECT_URL` repository secrets. A successful
local website build alone does not verify migration or live provider operation.

## Mobile setup and release

Run the website API first when using a local backend. In a second terminal:

```powershell
Set-Location react-native
npm install
Copy-Item .env.example .env.local
npm run typecheck
npm start
```

Set `EXPO_PUBLIC_API_BASE_URL` to the reachable API origin: `http://10.0.2.2:3000`
for an Android emulator, or the development machine's LAN address for a physical
device. `EXPO_PUBLIC_EXPO_PROJECT_ID` enables push-token registration; enable
server push only after physical-device registration/permission checks.

Deploy the mobile-session and push-token migrations before relying on those
features. Mobile uses shared customer APIs and SecureStore; it never needs
PostgreSQL, PayMongo, Gmail, or Cloudinary secrets.

Native dependencies such as the camera and return image picker require a new
native build; Metro reload alone does not add native modules. Build profiles live
in `react-native/eas.json`; the current production Android profile requests an
APK. Store-distribution readiness, signing, payment return handling, provider
checks, and device acceptance remain release work. See the
[mobile plan](./mobile-app-development-plan.md) and
[returns release checks](./returns.md#remaining-limitations-and-release-checks).

## Verification and troubleshooting

The web return workflow requires migration `20261002000000_return_workflow` before
using the updated return APIs/UI. It was prepared but not applied during development.
Apply pending migrations to the intended database with `npx prisma migrate deploy`
as part of release. Configure signed PayMongo refund events (`refund.succeeded`,
and supported `payment.refunded` / `payment.refund.updated` events) on
`/api/webhooks/paymongo`. Test captured payment references and pending/success/failure
refunds in test mode. Existing approved returns need actual receipt and inspection
records before issuing refunds; COD repayments occur outside the application.
See [returns release checks](./returns.md#remaining-limitations-and-release-checks).

For application changes, run the applicable checks:

```powershell
npx tsc --noEmit
npx vitest run
npm run build
```

Run native TypeScript and Expo bundle/build checks from `react-native/` separately.
The latest dated results and known failures live in the
[checklist](./Group2_ProjectChecklist.md). No setup, deployment, database mutation,
provider check, or application build was performed for documentation consolidation.

| Symptom | Check |
|---|---|
| Missing Prisma environment variables | Prisma CLI configuration in `.env`, including both connection URLs |
| Connection failures/exhaustion | Correct project credentials, SSL/pooler parameters, runtime pool limits |
| Login breaks after deployment | Session secret and public origins in the target environment |
| Paid checkout remains pending | Signed webhook URL, mode/secret, and provider delivery logs |
| Upload fails | Cloudinary configuration, image format/size, and customer authorization |
| Email unavailable | Gmail SMTP configuration and server logs; actual delivery requires a live check |
| Native API unreachable | Device-reachable API origin and network configuration |
| Native module missing | Rebuild/install the native app after dependency/configuration changes |
