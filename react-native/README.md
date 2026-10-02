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

## Customer Support layout

The FAQ category row in `app/support.tsx` sizes to its content instead of
expanding into the question list's space. Categories scroll horizontally with
centered labels and a minimum 44-point touch height. The question list fills
the remaining space and includes bottom safe-area padding. Filters and FAQ
cards respond while the search keyboard is open; dragging the list dismisses it.

Verification (2026-09-29): mobile `npx tsc --noEmit` passed; the focused FAQ
data suite passed (3 tests, 16 skipped). The broader `-t 'FAQ'` run selected
the whole support group as well (6 passed, 1 existing AI concierge failure,
39 skipped). These tests cover data/filtering, not native layout rendering.
Android production export passed with `npx expo export --platform android
--output-dir .expo/support-layout-check` (1,536 modules). The root website
build was not run because it does not compile this app. Visual checks on a
refreshed native build remain pending.

## Development commands

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

"Try the Look" requests camera access when opened and previews the selected
brand-inspired color tint over the live phone camera. It supports front/back
switching, original comparison, and a Settings link when permission is blocked.
The camera stops when the sheet closes or the app leaves the foreground.
These are tint approximations, not calibrated reproductions of each model's
built-in modes; the preset CSS filters are not applied to native camera frames.
No photos are captured or uploaded. After adding the camera dependency, rebuild
the native app with `npm run android`; a Metro reload alone is insufficient.

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

On Windows, if Gradle reports `SDK location not found`, point it to your
installed Android SDK. For the default Android Studio location, run this in
PowerShell from `react-native`:

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
```

If `android` has already been generated, you can also create
`android/local.properties` with `sdk.dir=C:/Users/YOUR_USER/AppData/Local/Android/Sdk`
(use your actual SDK path and forward slashes). This machine-specific file is
ignored by Git. Then run `npm run android`. The first build may take longer
while Gradle downloads the required SDK and NDK packages.

Deploy the website callback changes alongside the app. Set `EXPO_PUBLIC_API_BASE_URL`
to the same public origin as the server's `NEXTAUTH_URL`. Google Cloud must have
`<NEXTAUTH_URL origin>/api/auth/callback/google` as an authorized redirect URI;
Google returns to the website first, which then returns the ticket to the app.

## AI support fallback

Unknown or unrelated questions now receive the same standard missing-information
reply as the website, supported follow-up questions, and a Contact Support button.
The button opens the existing Contact Us tab; no ticket or human handoff is created
automatically. A topic guard reduces false answers caused by generic words such as
`good`, `code`, or `how long`. This remains a local keyword responder, with no live
knowledge lookup. Root/native TypeScript and 103 tests across four support suites
passed; device rendering was not checked. Native export results are in the
[checklist](../docs/Group2_ProjectChecklist.md).

## Returns, cancellations, and refunds

Order Details opens `app/return-request.tsx` for native item selection, return
reasons, optional details, and photo evidence. The app uses the same customer
APIs and admin review/refund workflow as the website. Return status refreshes
on focus, foreground, manually, and every 15 seconds while a nonterminal
request is visible. Rejected requests can be resubmitted within the return window.

Photo selection uses `expo-image-picker`; rebuild the native app after pulling
this dependency/configuration change (`npm run android` locally, or a new EAS
build). Deploy shared APIs alongside the mobile update and apply the new
`20261002000000_return_workflow` migration before use. The app displays return
instructions, refund status, and actual amount. Native now includes the three-step
request wizard and discounted estimate/review, shipment tracking entry/correction,
and actual submission/approval/shipment/receipt/inspection/refund milestones.
Rejected cases offer an explicit revised request. Refunds cover selected items after
discounts and require receipt/inspection; pending provider responses remain pending.
Root/native TypeScript and 214 targeted tests passed. Android/iOS exports passed
(1,543/1,417 modules). Device UI/live provider checks remain
pending. These exports are Hermes bundles, not APK/IPA releases. The live
deployment was not changed by this task.

See [the shared workflow](../docs/returns.md) for verification and the remaining
physical-device, Cloudinary, and PayMongo checks. Payment deep-link return
handling, review image uploads, and app-store/EAS configuration remain future work.
