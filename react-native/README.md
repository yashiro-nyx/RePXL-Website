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

Address creation, editing, deletion, and default selection are fully supported
in-app (both in Account settings and directly during checkout). In-app review
submission, real-time voucher validation, selective cart checkout, interactive
CCD color profile previews ("Try the Look"), dedicated wishlist browsing, and
synchronized camera comparison are also active.

Google sign-in and sign-up open the website's `/auth/mobile-google` bridge,
then return to `repxl://auth/callback` with a short-lived, single-use ticket.
The app exchanges that ticket for a mobile session and completes MFA when required.
Provider errors return through the same bridge instead of leaving the user on
the website login page.

Google OAuth requires an installed development or release build, not Expo Go
(https://docs.expo.dev/guides/authentication/). For local Android testing with
the Android SDK installed, run `npx expo run:android` from `react-native` to
build and install the app with its registered `repxl` scheme. Email/password
authentication remains available in Expo Go.

Deploy the website callback changes alongside the app. Set `EXPO_PUBLIC_API_BASE_URL`
to the same public origin as the server's `NEXTAUTH_URL`. Google Cloud must have
`<NEXTAUTH_URL origin>/api/auth/callback/google` as an authorized redirect URI;
Google returns to the website first, which then returns the ticket to the app.

Return submission with signed
image uploads, payment deep-link return handling, and app-store/EAS configuration
remain future mobile work.
