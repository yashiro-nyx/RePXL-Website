# RePXL Mobile

This is the official Expo/React Native customer app. It is a separate frontend
project and is not compiled or deployed by the root Next.js/Vercel build.

## Architecture

The app calls the public RePXL Next.js origin over HTTPS. Next.js API routes
enforce customer ownership and perform all Prisma, PostgreSQL, PayMongo, and
Cloudinary operations. The app never receives a database URL or provider
secret.

Native email/password authentication uses `/api/mobile/auth/*`. Access and
rotating refresh tokens are random opaque values; the server stores their
SHA-256 hashes and the app stores the token pair in Expo SecureStore. MFA must
be completed before a token pair is issued.

Products are public API data. Authenticated cart, wishlist, profile, addresses,
orders, reviews, and notifications are server-authoritative and shared with
the website. React Context holds only the current fetched view of those
records. Compare selections are temporary UI state.

Checkout creates an order and hosted PayMongo Checkout Session through the
existing server route, then opens the provider URL with Expo WebBrowser. Card,
CVC, OTP, PIN, and GCash credentials are never collected by the app.

## Environment

Copy `.env.example` to an ignored local environment file:

```sh
cp .env.example .env.local
```

- `EXPO_PUBLIC_API_BASE_URL`: public RePXL web origin without `/api`
- `EXPO_PUBLIC_EXPO_PROJECT_ID`: optional EAS project ID for push registration

Only intentionally public Expo variables belong here. Keep `DATABASE_URL`,
`DIRECT_URL`, PayMongo secrets, Cloudinary secrets, `NEXTAUTH_SECRET`, MFA
keys, mail credentials, and webhook secrets in the server environment.

## Commands

```sh
npm install
npm run typecheck
npm run doctor
npm start
```

For an Android emulator, use `http://10.0.2.2:3000` as the local API origin.
For a physical device, use the development machine's reachable LAN address.

## Current limits

Google OAuth uses the website's browser-cookie flow and is not exposed as a
native login button. A future native implementation needs an authorization-code
redirect and secure server-side token exchange.

Address creation/editing, review/return submission with signed image uploads,
payment deep-link return handling, and app-store/EAS configuration remain
future mobile work. Existing records are available read-only where the current
native UI has no safe editing flow.
