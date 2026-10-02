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

### Startup diagnostic (2026-10-01)

The installed app dependencies passed `npx.cmd expo install --check` and all
21 `npx.cmd expo-doctor` checks. Mobile `npx.cmd tsc --noEmit` passed. An isolated
`npx.cmd expo start --offline --port 8099` started Metro successfully; Android
production export to `.expo/startup-audit` passed (1,536 modules). This verifies
JavaScript bundling, not APK installation or device execution. No source code
changed; Vitest and the separate root Next.js build were not run.

Because `expo-dev-client` is installed, `npm start` defaults to a development
build. Install the development APK before using that mode. For an Expo Go
preview with a compatible SDK, explicitly run `npx.cmd expo start --go --clear`;
Google OAuth requires the custom build. See the
[Expo CLI launch-target documentation](https://docs.expo.dev/more/expo-cli/).
For the installed development APK, use `npx.cmd expo start --dev-client --clear`.
Use `--tunnel` if the phone cannot reach Metro over the local network.

The inspected machine had no device listed by `adb devices`. Start an Android
emulator or connect and authorize a USB-debugging phone before local installation.
`JAVA_HOME` resolved to JDK 17, but `java` on PATH resolved to Java 8; Gradle's
native execution was not tested. No `react-native/.env` or `.env.local` existed,
so the app used its hosted API fallback. The root website `.env` does not
configure the mobile project. Copy this directory's `.env.example` to
`.env.local` only when selecting a different public API origin, then restart
Metro. Device connectivity, SDK compatibility of the installed Expo Go client,
and the user's exact original failure remain unverified.

### EAS APK installation diagnostic (2026-10-01)

A new standalone Android preview build was submitted at the user's request
with `eas.cmd build --platform android --profile preview --non-interactive
--no-wait`: [build 37422cf1](https://expo.dev/accounts/vaelarr/projects/repxl/builds/37422cf1-4fb7-452e-a0cd-41761aa351d6).
Upload and fingerprinting succeeded; EAS subsequently reported `IN_PROGRESS`,
profile `preview`, package `com.repxl.mobile`, version code 1. Existing remote
signing credentials were reused. No preview environment variables were present,
so the hosted API fallback applies. Mobile `npx.cmd tsc --noEmit` passed and
`npx.cmd expo install --check` reported compatible dependencies. Cloud completion,
APK download/install, and device execution are pending; no source changes,
Vitest run, or separate root Next.js build were required for this submission.

EAS CLI inspection subsequently confirmed that build
`653750f0-8473-4805-997f-76ba679b0e97` finished with profile `development`,
package `com.repxl.mobile`, SDK 57, app version 1.0.0, and version code 1.
Its Expo-style launcher is expected. The five most recent Android builds
included completed production and preview APKs; the latest listed preview was
`2f51f577-aa78-4e6e-a4e8-98a5c1bdb1db`. Build metadata was inspected through
`eas.cmd build:view` / `build:list`; downloading the development APK was stopped
after slow transfer, so its manifest, signature, ZIP integrity, and device
installation were not verified. Partial downloads under `.expo/apk-audit`
are diagnostic artifacts and must not be installed. The failing APK's build
identity and the phone Android version remain unknown. Existing preview
artifacts can be tested before starting a new cloud build.

`eas.json` intentionally enables the Expo development launcher in the
`development` profile. An Expo-style launcher in a RePXL development APK is
expected; it is not evidence that the artifact is Expo Go. The `preview`
profile already produces a standalone APK without enabling the development
client. Build it from this directory with
`npx.cmd eas-cli build --platform android --profile preview` and download the
APK artifact from that completed build. An Android App Bundle (`.aab`) cannot
be installed directly as an APK. See [Expo APK guidance](https://docs.expo.dev/build-reference/apk/).

A reported "parsing failed" installation remains unresolved: no APK was found
in the repository or the machine's Downloads directory, and `adb devices`
listed no device. The actual EAS artifact, phone Android version, package
metadata, and signature must be inspected before attributing the failure.
The installed React Native dependency declares a minimum API level of 24;
the final APK manifest remains unverified. Root `.env` settings and Metro
launch mode do not repair an Android package parsing failure. No source/config
changes, new EAS build, or APK installation were performed for this diagnostic;
TypeScript, tests, and production builds were not rerun for documentation-only
changes.

### Recovery after Expo installs the development client

If installation finishes but the running CLI reports missing
`./utils/autoAddConfigPlugins.js`, retry from a fresh terminal in `react-native`.
On 2026-10-01, npm had relocated `@expo/cli` from the top-level `node_modules`
into `node_modules/expo/node_modules`; the new CLI contained the missing file.
The failed plugin-application step passed when invoked in a fresh Node process.
`expo-dev-client` is already recorded in `package.json` and `package-lock.json`.

```powershell
cd D:\Development\RePXL-Website\react-native
npx.cmd expo install expo-dev-client
npx.cmd eas-cli build --platform android --profile development
```

The second command starts a cloud development build. For a local Android build
with the Android SDK installed, use `npm.cmd run android` instead. The `.cmd`
suffix avoids PowerShell's disabled-script error for npm/npx wrappers.
If a fresh process still reports missing installed files, stop Metro and run
`npm.cmd ci` in this directory to restore dependencies from the existing lockfile.
The deprecation and audit warnings are separate from this CLI error; do not use
`npm audit fix --force` as a missing-module repair.

The SDK compatibility check on 2026-10-01 reported newer patches for `expo`
(`~57.0.26`), `expo-camera` (`~57.0.6`), `expo-constants` (`~57.0.20`), and
`expo-router` (`~57.0.24`). These updates and vulnerability remediation remain
pending; the recovery does not upgrade dependencies or verify an EAS native build.

Verification: the original plugin-application step passed. Mobile
`npx.cmd tsc --noEmit` passed after regenerating the ignored `.expo/types` route
declarations using Expo's installed route generator (the initial check had four
stale-route errors). Android production export passed with 1,536 modules:
`npx.cmd expo export --platform android --output-dir .expo/dev-client-check`
with `EXPO_OFFLINE=1`. No application code changed, so Vitest and the separate
root Next.js production build were not run. Device testing remains pending.

### Local commands

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
