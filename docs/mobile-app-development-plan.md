# RePXL ? Mobile Implementation and Release Plan

The maintained customer app is `react-native/`. It uses the same Next.js API,
PostgreSQL records, authentication/ownership rules, and web admin operations as
the website. This guide records implementation and remaining release work;
local setup is in [SETUP.md](./SETUP.md#mobile-setup-and-release), and device/native
build instructions are in [react-native/README.md](../react-native/README.md).

## Current implementation

- Native login/registration, Google OAuth bridge, MFA challenge verification,
  rotating tokens, and Expo SecureStore session persistence.
- Shared customer bearer access with a single refresh queue for expired tokens.
- Product catalog/search, brand/series and price filters, stock filtering,
  condition grading, product details, wishlist, and camera comparison.
- Camera-based brand color previews and in-app review creation/deletion.
- Selective cart checkout, live voucher validation, account/address management,
  and inline Philippine address creation during checkout.
- Hosted PayMongo checkout through Expo WebBrowser and the shared server API.
- Order detail/receipt, tracking timeline, cancellation, and receipt confirmation.
- Native return requests with selected purchased items, website-aligned reasons,
  protected photo evidence, rejection/review/refund status, and refresh behavior.
  See [returns.md](./returns.md) for rules and actual verification.
- In-app notification polling and optional Expo push-token registration.
- Support FAQ and a local rule-based AI Concierge; response logic matches the
  website through parity tests. Unknown/unrelated questions get a standard missing-
  information reply, supported follow-ups, and a Contact Support action.

Implementation does not imply App Store/Google Play readiness or completed device
acceptance. Historical audit results record **9 mobile AI Concierge failures**
(`src/lib/mobile-features.test.ts`: 8; `src/lib/mobile-all-modules.test.ts`: 1).
Those old response-shape/copy expectations were corrected in the 2026-10-02
fallback task: 103 targeted tests across four files, including both mobile suites,
now pass. Root/mobile TypeScript passed; native export results are recorded in
the checklist. Browser/device acceptance and a full-suite rerun remain unverified.

## Architecture and synchronization

Expo Router screens live in `react-native/app/`; tabs include shopping, cart,
and account views. `react-native/context/AppContext.tsx` holds session state and fetched
customer records. `react-native/src/services/api.ts` unwraps shared JSON responses, attaches
bearer tokens, refreshes 401 sessions, and surfaces API failures.
`react-native/src/services/session.ts` persists raw tokens securely; only token hashes reach
the server's `MobileSession` table. `react-native/src/services/push.ts` handles registration.

Screen transitions/foreground behavior trigger shared data synchronization through
`react-native/src/hooks/useScreenSync.ts`. Screen-specific refresh/polling supplements that
mechanism; the return screen polls nonterminal cases while focused and active.
The server remains authoritative for cart, wishlist, orders, addresses, inventory,
reviews, and notifications. Offline caches must not fabricate successful mutations.

Root TypeScript and Vercel builds exclude native sources. Root Vitest suites
exercise imported native pure logic and transport contracts; native build and
UI/device checks run separately. Product spec fields marked `Not listed` by the
mobile mapper are placeholders when the API lacks those values.

## Remaining work

The native customer return screen now mirrors the web wizard, including discounted
refund review, approval instructions, shipment tracking, and actual receipt/
inspection/refund milestones. The shared backend provides inspection/refund guards
and provider reconciliation. Root/native TypeScript and 214 tests across 13 files
passed; Android/iOS exports passed (1,543/1,417 modules).
Device/provider checks remain pending. Apply the prepared shared return-workflow
migration and deploy the backend before use. See [returns.md](./returns.md).

| Area | Pending work |
|---|---|
| Payments | Verify deep-link return, cancellation/interruption recovery, duplicate attempts, and cross-client final state |
| Returns/refunds | Device picker/permissions, live uploads, shipment/keyboard/milestone UI, admin receipt/inspection/refund, and notification navigation; paid-cancellation refunds remain deferred |
| Reviews | Mobile review image uploads |
| Support | Verify fallback/supported replies, FAQ layout, keyboard, and accessibility on devices; keyword matching remains limited for ambiguous questions |
| Network/cache | Define offline/cache behavior; test slow networks, session expiry/revocation, foreground resume, and app upgrades |
| Push | Physical-device permission/registration/delivery checks |
| Release | Native signing, supported platform checks, privacy/store metadata, screenshots, monitoring, and staged rollout |

The first release is customer-focused. Native admin workflows, direct PostgreSQL
access, a separate mobile backend, and shared chat history are outside that scope.
Website/mobile concierge conversation histories are currently separate and local.

## Release environments and builds

Use a development API/database for local testing, isolated staging resources for
payment/upload acceptance, and production credentials only on the production
server. Only intentionally public `EXPO_PUBLIC_*` configuration goes into the app.
Never bundle database, provider, mail, session-signing, or MFA secrets.

`react-native/eas.json` defines development, preview, and production profiles;
the current production Android profile produces an APK. A profile existing does
not verify signing, store acceptance, or successful release. Rebuild native
binaries when dependencies/plugins such as camera or image picker change, and
deploy corresponding backend contracts/migrations alongside mobile changes.

## Acceptance and verification

The release candidate must pass device journeys for registration/login/Google/MFA,
shopping/cart/address/voucher workflows, checkout/payment return, order tracking,
cancellation, returns/refunds, notification opening, and logout. Also check
cross-account access, revoked/expired tokens, upload authorization, slow-network
retry, duplicate actions, accessibility, and supported platform upgrades.

Use backend contract/unit tests, native type and bundle checks, and actual device
interaction. A successful bundle does not prove native permissions, UI behavior,
payment/provider delivery, or store distribution.

The 2026-10-02 return-flow task passed root/mobile TypeScript, **152 targeted tests
across 9 files**, the website production build (70 static pages), and Android/iOS
production exports. Device/live-provider checks remain pending. The all-platform
Expo export failed on the existing missing `react-native-web` dependency; native
exports succeeded. Detailed commands and limits are in [returns.md](./returns.md).
Documentation consolidation reran only document/reference checks. The
[progress checklist](./Group2_ProjectChecklist.md) is the source for dated checks
and known failures; it should not be read as a new full-suite verification.
