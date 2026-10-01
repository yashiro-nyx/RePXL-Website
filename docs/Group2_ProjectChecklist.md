**TECHNOLOGICAL INSTITUTE OF THE PHILIPPINES**  
**Quezon City**  
**College of Computer Studies**  
**Information Technology Department**

**IT 009- SYSTEMS INTEGRATION AND ARCHITECTURE 1**

| Leader: TUPAEN, ARIANNE KAYE E. Member 1: ROMUALDO, JERVIN PAUL C. Member 2: ROSARIO, ARIANE JOY P. Member 3: SEVILLA, MA. ROSA CAMILLA S. Member 4: SOSTEA, JOANA MARIE A. | Date: August 3, 2026 |
| :---- | :---- |
| **Section:** IT31S2 | **Instructor: Ms. Arceli F. Salo** |

**Project Title:**  RePIXL: Development of a Vintage Digital Camera (Digicam) E-commerce Website

**Web Application Link:** [https://repxlph.vercel.app/](https://repxlph.vercel.app/) 

**PROJECT CHECKLIST**

### Expo development-client CLI recovery (2026-10-01)

- [x] Verified the installed SDK 57 CLI contains `autoAddConfigPlugins.js` in
  `react-native/node_modules/expo/node_modules/@expo/cli`. The old top-level CLI
  path in the error no longer exists; relocation during npm installation is the
  likely cause. Re-ran the failed plugin-application step successfully in a
  fresh Node process; preserved the existing development-client dependency edits.
- [x] Mobile TypeScript check passed after regenerating ignored Expo route types
  (initial check: four stale-route errors). Android production export passed:
  1,536 modules in `.expo/dev-client-check`, with `EXPO_OFFLINE=1`.
- [x] Documented recovery and Windows `.cmd` commands in `react-native/README.md`.
- [ ] SDK compatibility check reports four newer patches: Expo 57.0.26, camera
  57.0.6, constants 57.0.20, router 57.0.24. Updates and audit remediation pending.
- [ ] EAS native build and device runtime verification remain pending. Vitest
  and root `npm run build` were not run: no app logic changed and the website
  build does not compile the mobile app.

## I. Core Application Architecture 

- [x] ~~Modular Design~~  
- [x] ~~API Communication: Internal APIs for communication between modules.~~  
- [x] ~~Database Design~~  
- [x] ~~Deployment Strategy~~

## II. Customer/Buyer Site (User-Facing) Modules & Functions

- [x] ~~1\. Home Page & Discovery~~  
      - [x] ~~Visually appealing landing page with dynamic content (promotions, new arrivals, popular products).~~  
      - [x] ~~Clear navigation to product categories, search, login, cart.~~  
- [x] ~~2\. User Management~~  
      - [x] ~~Registration/Login: Secure sign-up and authentication for customer accounts.~~  
      - [x] ~~User Profile: View/edit personal information, shipping addresses, billing details.~~  
      - [x] ~~Wishlist/Favorites: Ability to save products for later viewing or purchase.~~  
      - [x] ~~Notifications: Alerts for order status, promotions, etc.~~  
- [x] ~~3\. Product Catalog & Search:~~  
      - [x] ~~Product Listing Page: Displays all available products.~~  
      - [x] ~~Search Functionality: Ability to search for products by keywords.~~  
      - [x] ~~Filtering Options: Filter products by categories, price range, attributes (e.g., size, color).~~  
      - [x] ~~Sorting Options: Sort products by price, name, popularity, newness.~~  
      - [x] ~~Product Details Page:~~  
            - [x] ~~Comprehensive product information, multiple images/videos.~~  
            - [x] ~~Detailed description, specifications, and pricing.~~  
            - [x] ~~"Add to Cart" button.~~  
- [x] ~~4\. Cart & Checkout~~  
      - [x] ~~Add to Cart Functionality: Adds selected product to the shopping cart.~~  
      - [x] ~~View Cart Page: Displays all items in the cart, allows quantity adjustment, removal of items, and shows subtotal.~~  
      - [x] ~~Checkout Process: Step-by-step flow (e.g., Shipping Information, Payment Information, Order Review).~~  
      - [x] ~~Payment Integration: Secure processing (simulated or sandbox integration with a payment gateway like Stripe, PayPal).~~  
- [x] ~~5\. Order History & Tracking~~  
      - [x] ~~Customers can view a list of their past orders.~~  
      - [x] ~~Ability to view details of each order, including items purchased, total cost, and current status.~~  
      - [x] ~~Order tracking.~~  
- [x] ~~6\. Customer Support/Contact~~  
      - [x] ~~Ways for customers to contact support (e.g., contact form, or LiveChat).~~  
- [x] ~~7\. Review & Rating System~~   
      - [x] ~~Customers can submit reviews and ratings for purchased products.~~

## III. Admin Site (Backend Management) Modules & Functions

- [x] ~~1\. Admin Login: Secure access for platform administrators.~~  
- [x] ~~2\. Product Management:~~  
      - [x] ~~Add Product Functionality: Forms to input all product details (name, description, price, categories, images, stock).~~  
      - [x] ~~Edit Product Functionality: Ability to modify existing product details.~~  
      - [x] ~~Delete Product Functionality: Ability to remove products from the catalog.~~  
      - [x] ~~Product Status: (e.g., active, inactive, out of stock).~~  
- [x] ~~3\. Order Management~~  
      - [x] ~~View All Orders: List of all customer orders.~~  
      - [x] ~~Order Details View: Comprehensive view of each order.~~  
      - [x] ~~Update Order Status: (e.g., "Pending," "Processing," "Shipped," "Delivered," "Cancelled").~~  
      - [x] ~~Print Invoices/Packing Slips.~~  
      - [x] ~~Manage Returns/Refunds.~~  
- [x] ~~4\. Inventory Management~~  
      - [x] ~~Track stock levels for all products.~~  
      - [x] ~~Low stock alerts.~~  
- [x] ~~5\. User Management~~  
      - [x] ~~Manage customer accounts (view, edit, suspend).~~  
      - [x] ~~Manage admin accounts (view, add, edit, delete).~~  
- [x] ~~6\. Sales & Analytics Reports~~  
      - [x] ~~Access to sales data, revenue, product performance reports.~~  
      - [x] ~~Customer insights.~~  
- [x] ~~7\. Content Management System (CMS)~~  
      - [x] ~~Manage static pages (About Us, Contact, FAQs, Privacy Policy).~~  
      - [x] ~~Manage promotions, banners, and homepage content.~~  
- [x] ~~8\. Settings & Configuration:~~  
      - [x] ~~Manage platform-wide settings (e.g., currency, shipping options, payment options).~~  
- [x] ~~9\. Notification Management~~  
      - [x] ~~Configure and send automated notifications (e.g., order confirmation emails).~~  
- [x] ~~10\. Audit Trail~~

## IV. Mobile Application (Customer Side) 

- [x] ~~1\. Mobile User Authentication~~  
      - [x] ~~Customer Registration and Login~~  
      - [x] ~~Secure Authentication~~  
      - [x] ~~Forgot Password / Password Reset~~  
      - [x] ~~Session Management~~  
- [x] ~~2\. Mobile Home Screen~~  
      - [x] ~~Display featured products and promotions~~  
      - [x] ~~Product Categories~~  
      - [x] ~~Search Bar~~  
      - [x] ~~Recommended Products~~  
- [x] ~~3\. Product Browsing~~  
      - [x] ~~Product Listing~~  
      - [x] ~~Product Details with Images~~  
      - [x] ~~Product Search~~  
      - [x] ~~Product Filtering~~  
      - [x] ~~Product Sorting~~  
- [x] ~~4\. Shopping Cart~~  
      - [x] ~~Add to Cart~~  
      - [x] ~~Update Quantity~~  
      - [x] ~~Remove Item~~  
      - [x] ~~Cart Summary~~  
- [x] ~~5\. Mobile Checkout~~  
      - [x] ~~Shipping Address Selection~~  
      - [x] ~~Payment Method Selection~~  
      - [x] ~~Order Review~~  
      - [x] ~~Place Order~~  
- [x] ~~6\. Order Management~~  
      - [x] ~~View Current Orders~~  
      - [x] ~~Order History~~  
      - [x] ~~Order Tracking~~  
      - [x] ~~Order Status Updates~~  
- [x] ~~7\. Customer Profile~~  
      - [x] ~~View/Edit Profile~~  
      - [x] ~~Change Password~~  
      - [x] ~~Manage Delivery Addresses~~  
- [x] ~~8\. Wishlist~~  
      - [x] ~~Add to Wishlist~~  
      - [x] ~~Remove from Wishlist~~  
      - [x] ~~Move Wishlist Item to Cart~~  
- [x] ~~9\. Notifications~~  
      - [x] ~~Push Notifications for Order Updates~~  
      - [x] ~~Promotional Notifications~~  
      - [x] ~~Order Confirmation Notification~~  
- [x] ~~10\. Reviews and Ratings~~  
      - [x] ~~Submit Product Reviews~~  
      - [x] ~~Give Product Ratings~~  
      - [x] ~~View Existing Reviews~~  
- [x] ~~11\. Customer Support~~   
      - [x] ~~Contact Support~~  
      - [x] ~~FAQs~~  
      - [x] ~~Live Chat or AI~~


---

## V. Implementation Status & Verification

_Maintained per the documentation-synchronization rule in [`AGENTS.md`](../AGENTS.md). The checklist items above reflect the delivered academic project scope; the notes below record the current verified engineering status so the checklist stays honest._

### Verification snapshot (latest documentation audit)

- **Requested standalone APK rebuild (2026-10-01):** EAS preview build
  `37422cf1-4fb7-452e-a0cd-41761aa351d6` uploaded and submitted successfully;
  last checked cloud status `IN_PROGRESS`, package `com.repxl.mobile`, version
  code 1. Existing signing credentials reused. Mobile TypeScript passed and
  Expo dependency compatibility check passed. No source changes, Vitest run,
  or root Next.js build; cloud completion and APK/device installation pending.

- **EAS APK installation follow-up (2026-10-01):** inspected `app.json` and
  `eas.json`; development builds intentionally include the Expo launcher,
  while preview builds already request standalone APKs. User-reported parsing
  failure remains unresolved without the actual artifacts and phone details;
  no local APK or adb device was available. No source/config changes, EAS
  builds, installs, or repeated automated checks were performed. Instructions
  and verification limits are recorded in `react-native/README.md`.
  Subsequent EAS CLI inspection confirmed supplied build
  `653750f0-8473-4805-997f-76ba679b0e97` is FINISHED, development profile,
  `com.repxl.mobile`, version code 1. The latest five Android builds include
  finished preview/production APKs. Slow artifact download was stopped;
  APK manifest/signature/integrity and phone installation remain unverified.
  No new cloud build, source change, or repeated automated checks performed.

- **Mobile startup audit (2026-10-01):** mobile `npx.cmd tsc --noEmit`
  passed; `npx.cmd expo install --check` reported compatible dependencies;
  Expo Doctor passed **21/21** checks; isolated offline Metro startup on port
  8099 succeeded; Android production export to `.expo/startup-audit` passed
  (**1,536 modules**). `expo-dev-client` makes the default launch target an
  installed development APK; Expo Go requires explicit `--go`. No Android
  device was visible to adb; no mobile environment file existed, so the hosted
  API fallback applied. JDK 17 was available through `JAVA_HOME`, despite Java 8
  on PATH. No application code changed; Vitest and root Next.js build were not
  run. APK build/install, device execution, and the original reported failure
  remain unverified. See `react-native/README.md` for startup instructions.

| Check | Command | Result |
|---|---|---|
| Type check | `npx tsc --noEmit` | ✅ Clean |
| Production build | `npm run build` | ✅ Succeeds — 68/68 static pages generated |
| Test suite | `npx vitest run` | ⚠️ **1232 passed, 9 failed, 47 skipped** (1288 tests across 79 files) |

Deployment: live on Vercel at `https://repxlph.vercel.app`; database on Supabase (PostgreSQL) with 14 tracked Prisma migrations applied on deploy.

### Recent refinements (verified in code)

- [x] Mobile FAQ layout fix (2026-09-29): prevent the horizontal category scroller from growing vertically, center category labels with 44-point minimum touch targets, and reserve remaining space for the question list with bottom safe-area padding. Filtering/expansion taps work with the search keyboard open; list dragging dismisses it.
  - Verification: `cd react-native; npx tsc --noEmit` passed. `npx vitest run src/lib/mobile-features.test.ts -t 'Mobile Bundled FAQs Data Integrity'`: 3 passed, 16 skipped. Broader `npx vitest run src/lib/mobile-features.test.ts src/lib/mobile-all-modules.test.ts -t 'FAQ'`: 6 passed, 1 existing AI concierge failure, 39 skipped (the support group name also matches FAQ).
  - Android production export passed: from `react-native`, `npx expo export --platform android --output-dir .expo/support-layout-check` (1,536 modules). Native layout/large-font/keyboard visual checks remain pending; the data tests do not verify rendering. Root `npm run build` was not run because it does not compile the mobile app.

- Context-aware Back navigation on the Cameras catalog + About Back button removed — `docs/back-navigation.md`.
- Navbar avatar synchronization from `authStore`.
- Payment success navigation reads the real order from the API.
- In-app notification redesign (concise content, shared dropdown/page components, category system) — `docs/notifications.md`.
- Notification content sanitization for legacy/malformed records — `docs/notifications.md`.
- Gmail email redesign onto a shared, Gmail-compatible design system with an offline preview generator — `docs/emails.md`.
- Floating website AI Concierge chat widget reusing the mobile app's local rule-based concierge logic (automated assistant, no chat backend) — `docs/chat-widget.md`. Note: this addresses the storefront side of the "Live Chat or AI" item; no cross-device conversation history (see doc).
- Cameras catalog (`/products`) UI/UX redesign **V2** — centered premium brand discovery, custom Sort listbox, **dual-handle price range slider** (dynamic bounds, draft → Apply, synced inputs), filter facet counts, **real-review** Rating filter, Clear All, active-filter chips, **pagination** (12/page, `?page=`), improved empty state, editorial layout; centralized filter+pagination logic; `from=home` Back and wishlist/compare preserved — `docs/catalog.md`.
- [x] Cameras catalog (`/products`) **brand + filter refinement** (2026-09-30):
  - "Shop cameras by brand" now reuses each brand's **existing product image** (one representative product per brand, chosen in-stock→newest→slug from catalog data) instead of separate logo assets — no new/duplicate brand-sample assets, no image inspection.
  - **Brand group removed from the filter sidebar** to eliminate a redundant control; brand is a single centralized state driven by the selector, shown as a removable chip (`Canon ×`) that Clear All also clears. "All Cameras" remains a distinct reset (not a fake brand).
  - Added two extra filters backed by **real structured spec fields only**: **Resolution** (`specs.megapixels` buckets) and **Release era** (`specs.year` buckets), with data-derived options (empty bands hidden), facet counts, and chips. Category/type, sensor/format, and lens mount were **not** added — those fields don't exist in the Prisma `Product` model, so nothing was fabricated.
  - Preserved: dual-handle price slider, min/max inputs, Apply Price, Clear All, chips, Sort, product count, pagination, mobile drawer, `from=home` Back, wishlist, compare, cart, product navigation, AI Assistant.
  - Verification: `npx tsc --noEmit` clean; `npx vitest run src/lib/catalog-filters.test.ts src/components/product/catalog/catalog-ui.test.ts` → **87 passed**; `npm run build` succeeded (`/products` static, ≈10.1 kB). The build does not touch the database, so local Supabase being unreachable did not affect it. No schema/migration/`.env`/DB changes were made. Interactive/visual click-through was NOT performed (no image tooling used); a manual desktop+mobile pass is recommended. — `docs/catalog.md`.

- [x] Product **ratings/reviews enhancement + Compare heading** (2026-09-30):
  - PDP rating summary beside the product info now reads `4.9 ★★★★★ (128 ratings) · 342 sold` with an explicit **"No ratings yet"** unrated state (never `0.0`). One-decimal average, correct singular/plural counts.
  - **Customer Reviews** section redesigned: prominent `X / 5` summary, restrained per-star **distribution** bars (counts shown as text too), modern **segmented star filters** with REAL per-star counts (`All (128)`, `5 Star (105)`, …), **paginated 5/page** with the pipeline **ALL → FILTER → PAGINATE** (filter change resets to page 1), `?rating=`/`?reviewPage=` URL state via `history.replaceState`, both empty states, and a11y (accessible stars, `aria-pressed` pills, labeled Prev/Next, announced page).
  - **Centralized rating aggregation** in `src/lib/rating-aggregate.ts` — ProductCard, the Cameras `ratingBySlug`, the review store selectors (Compare), and the PDP all compute a product's average the same way, so values match everywhere.
  - **Real sold count** = `SUM(OrderItem.quantity)` for `Order.status ∈ {DELIVERED, COMPLETED}`, via a single Prisma aggregate in `GET /api/products/[slug]` (no schema change, no N+1). Cancelled/failed/processing and cart/checkout attempts excluded; quantities summed; 0 when never sold.
  - **Compare** page heading centered to match the Cameras page; comparison tables/cards unchanged.
  - Verification: `npx tsc --noEmit` clean; new unit + structural tests pass (`rating-aggregate.test.ts`, `products-sold-count.test.ts`, `pdp-reviews.test.ts`); full `npx vitest run` → **1091 passed, 47 skipped, 9 failed** (the 9 are the pre-existing mobile AI concierge failures below — unrelated, untouched files); `npm run build` exit 0. Sold-count query + review aggregates verified via mocked Prisma + build only, **not** against a live DB (local Supabase unavailable; no DB config changed). Docs: `docs/product-detail-and-reviews.md` (new), `docs/catalog.md`, `AGENTS.md` map.

- [x] **Multi-step checkout redesign** (2026-09-30): converted `/checkout` from one long form into a guided four-step flow **Information → Shipping → Payment → Review** with a progress stepper, per-step validation gating (can't skip unmet steps), `?step=` URL sync + browser Back/Forward, a sticky desktop order summary + collapsible mobile summary, and a final editable Review before **Place Order**.
  - **Business logic preserved (UX-only change):** order + PayMongo intent/payment are still created in exactly one place (`handleConfirmAndPay` → `/api/checkout/process-payment`), reachable only from Review — advancing steps creates nothing; server-side cart/price/stock/voucher revalidation, `finalizePaidOrder` dedup/idempotency, `deductInventory`, saved addresses/PSGC, saved cards, couriers, terms gate, 3DS/GCash `authModal` + `nextActionUrl` redirect, and the success/verify flow are all untouched. Added a duplicate-submission guard.
  - New: `src/lib/checkout-steps.ts` (pure step machine), `src/components/checkout/CheckoutStepper.tsx`, `src/components/checkout/CheckoutOrderSummary.tsx`; rewired `src/app/(storefront)/checkout/page.tsx` (one component, so entered data persists across steps).
  - Verification: `npx tsc --noEmit` clean; new tests pass (`checkout-steps.test.ts`, `checkout-flow.test.ts`) + `back-navigation.test.ts` updated; full `npx vitest run` → **1122 passed, 47 skipped, 9 failed** (the 9 are the pre-existing mobile AI concierge failures below — unrelated, untouched); `npm run build` exit 0 (`/checkout` static ~17.6 kB). `purchase-finalization.test.ts` **skipped** (no `TEST_DATABASE_URL`; Supabase down) — that logic was not modified. No live browser click-through performed; no DB/schema/migration/`.env` changes. Docs: `docs/checkout.md` (new), `AGENTS.md` map.

- [x] **Human-friendly errors & message system** (2026-09-30): fixed the Return/Refund page exposing raw Zod validation JSON to customers and established a reusable customer-facing error/message system.
  - **Root cause:** `POST /api/returns` returned `Validation error: ${zodError.message}` (the full issues JSON), rendered verbatim by the page. Now returns safe field-level messages (e.g. *"Please describe the issue in at least 10 characters."*).
  - New `src/lib/errors/` (framework-free): canonical messages by category/HTTP status, `looksTechnical` guard, `zodToSafeBody`/`toSafeErrorResponse` (server), `toUserMessage`/`messageFromApiBody`/`getFieldErrors` (client). `src/lib/api.ts` `validationError` now emits `{ code, error, fieldErrors, details }` with humanized text (no paths/`too_small`/metadata).
  - Hardened customer-facing routes: returns, notifications, and all checkout payment routes (no `error.message` leaks; gateway messages shown only when non-technical). Return/Refund page: friendly field + banner messages, clearer "Describe the issue" label + helper text, real file limits (JPG/PNG/WebP, 5 MB, up to 5), and a11y (`aria-invalid`/`aria-describedby`/`role="alert"`/icon+text).
  - **Business rules preserved** (details ≥ 10 chars, photo/eligibility/window/refund/auth unchanged). Admin-only `api/admin/**` Zod formatting left as-is (not customer-facing) — noted for a follow-up.
  - Added project rule to `AGENTS.md`: *customer-facing interfaces must never expose raw validation objects, stack traces, DB errors, internal status messages, or exception text.*
  - Verification: `npx tsc --noEmit` clean; new tests pass (`errors.test.ts`, `returns-api-messages.test.ts`, `return-page.test.ts`); full `npx vitest run` → **1145 passed, 47 skipped, 9 failed** (the 9 are the pre-existing mobile AI concierge failures below — unrelated, untouched); `npm run build` exit 0. Live browser reproduction not performed. Docs: `docs/error-handling.md` (new), `AGENTS.md`.

- [x] **Security verification groundwork** (2026-09-30, status corrected 2026-10-01): added recent-auth and ownership verification, but the original MFA service still had a conflicting password/Google-login-time guard. Earlier “WORKING” claims were premature; the repair and remaining live verification are recorded below.

- [x] **Font loading + Next.js Image optimization** (2026-09-30): audited RePXL font loading and fixed the display-font delivery + converted customer-facing product images to `next/image` (warnings fixed, not suppressed).
  - **Font audit:** body **Inter** + mono **JetBrains Mono** are self-hosted via `next/font/google` (no runtime Google request, no `@import`, no duplicate loaders). Display **General Sans** is loaded at runtime from the **Fontshare** CDN (it is not on Google Fonts). Fix: added `preconnect` to `api.fontshare.com`/`cdn.fontshare.com`, gave `--font-general-sans` a size-similar system fallback stack (headings never blank / minimal CLS if Fontshare is slow/unreachable), kept `display=swap`, and corrected a misleading comment. **No typography/weights/hierarchy changed.**
  - **Self-hosting limitation (reported):** General Sans can't move to `next/font/google` (not on Google Fonts) or `next/font/local` (no licensed font files in `public/fonts/`; must not download from unofficial sources). Preserved via Fontshare with the resilience improvements above.
  - **Images:** converted product `<img>` → `next/image`, removing the `eslint-disable` suppressions: PDP main image (`fill`+`priority`+`sizes`, LCP), cart, compare (×2), checkout review, and `CheckoutOrderSummary` (fixed dimensions, no layout change). Left user-content/decorative/admin `<img>` as-is (noted). Optimization not disabled globally.
  - **Emails unchanged** — email templates keep their own email-safe font stacks.
  - Verification: `npx tsc --noEmit` clean; `npm run build` exit 0 with **0 warnings** (no font/image errors); customer pages build. No browser/network verification performed (no browser tooling). No deps added, no Next.js upgrade, no DB changes. Docs: `docs/fonts-and-images.md` (new), `AGENTS.md`.

- [x] **Account Security consolidation**: Password and Two-Factor Auth remain under Security; status is view-only. The MFA page now verifies on action rather than page entry. Prior claims that its backend was already correct are superseded by the findings below.

- [x] **Password step-up / MFA guard repair** (2026-10-01, implementation + automated verification): the identified development account now has Password **YES**, Google **YES**. It began as passwordless, then the first live `POST /api/auth/set-password` succeeded (200); a repeated request returned the intentional 409 because the password already existed. Removed the second `manageMfa` password/Google-time guard; both API and locked service require the same password-scoped, signed, session-bound recent-auth record. Password accounts cannot substitute Google/email/TOTP step-up. Normal Google login remains unchanged.
- [x] **Ownership / Set Password protections**: same-origin and session-bound ownership proof; conditional empty-password update; email-code attempts, consumption and cooldown persist in the existing database record. The Password panel now disables Set Password while its request is pending, preventing a duplicate browser submit. No migration/schema/environment changes.
- [x] **MFA 503 source repair**: captured the original server exception: Prisma `P2028` at the pending-secret `customerMfa.update`, after the interactive transaction exceeded Prisma's five-second default while the Supabase pooler was reachable but slow. All serialized MFA transactions now use bounded `{ maxWait: 10_000, timeout: 30_000 }` options. Encryption, recent-auth, row locking, attempt budgets, secret encryption, confirmation, and anti-replay checks remain intact. The customer still receives only the approved safe 503 message. No database configuration, schema, migration, or secret changed.
- [x] **Next.js smooth-scroll warning**: preserved global smooth scrolling and added the installed Next.js 15 compatibility marker, `data-scroll-behavior="smooth"`, to the root `<html>`. Local `/login` and `/login/mfa` render checks returned 200.
- [x] **Recent-auth 403 / origin repair**: reproduced the exact port behavior. With local `NEXTAUTH_URL` set to localhost:3000, a POST from localhost:3001 returned 403 before session lookup; matching port 3000 reached authentication. `GET /api/auth/recent-auth` itself returns 200 with `verified: false` for an authenticated unverified customer, and 401 only without a session. The origin helper now accepts only explicit localhost:3000/3001 in development, requires Origin to match the request origin, rejects cross-port/cross-site/unlisted origins, restricts production to the configured canonical origin, and fails closed on malformed configuration. Raw `Forbidden` was replaced with customer-safe guidance. No UI redesign, CSRF bypass, wildcard, cookie weakening, `.env` edit, migration, or credential change.
- [ ] **Production recent-auth configuration**: Vercel contains `NEXTAUTH_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXTAUTH_SECRET`, Google client variables, and `MFA_ENCRYPTION_KEY`, but runtime logs prove production `NEXTAUTH_URL` is malformed because it lacks `https://`. Current deployed POST requests throw `ERR_INVALID_URL`; GET correctly returns 401 without a session. The application publishes the expected Google callback URL, but the Google Console allowlist was not inspected. Correct `NEXTAUTH_URL`, deploy the source fix, then re-run authenticated production password step-up and MFA end-to-end.
- [x] **Six-box OTP behavior**: corrected stale-state auto-submit, middle-position deletion, full-code paste from any box, and autofill input length; management separates authenticator and recovery modes. Shared numeric input, paste, backspace, arrows and mobile layout browser-checked.
- [x] **Login blank-page investigation and repair**: confirmed `/_next/static/chunks/app/(auth)/login/page.js` returned 404 while referenced by 200 HTML; generated chunk was missing. Form was initially hidden awaiting JS. Removed that visibility dependency, rebuilt only generated output, and isolated `.next-dev` from `.next`. All seven login script resources returned 200 after restart.
- [x] **Automated verification**: focused auth/security/MFA suite **152 passed, 23 skipped**; full suite **1232 passed, 47 skipped, 9 pre-existing mobile AI concierge failures**. Coverage includes authenticated/unverified/verified/expired GET semantics, wrong/correct passwords, recent-auth creation, MFA enforcement, explicit development origins, production rejection, malformed-config fail-closed behavior, and customer-safe 403 messaging. `npx tsc --noEmit` and `npm run build` both passed (exit 0). Commands and environment limits are recorded in `docs/security-step-up.md`.
- [ ] **Live MFA sequence**: ownership proof and Set Password succeeded; live current-password verification returned 200. After the transaction fix, QR rendering, real authenticator scan/confirmation, logout/login wrong+valid challenge, and fresh-verification disable still require an authenticated manual retest. A later standalone Prisma recheck encountered a transient initialization/connectivity failure, so the repaired POST was not claimed live-passed.
- [ ] **Live normal Google OAuth regression**: a provider callback (302) and subsequent session requests (200) appear in the captured development log, and automated bridge tests pass. A deliberate post-fix provider-hosted click-through was not performed. PostgreSQL security tests remain skipped without a disposable test database; no database was created or migrated.

### Known limitations / pending (not marked complete)

- **Mobile AI concierge tests failing (9):** `src/lib/mobile-features.test.ts` (8) and `src/lib/mobile-all-modules.test.ts` (1) — the "Live Chat or AI" support assistant's `generateAiResponse` output no longer matches expected support copy. This is the one area above whose automated tests do not currently pass and should be treated as in-progress.
- **PayMongo (Live):** at least one payment method must be activated in the PayMongo Dashboard; a live end-to-end payment has not been re-verified here.
- **Live Gmail rendering:** not verified in a real email client (built to Gmail-safe spec only).
- **Mobile push notifications:** require `EXPO_PUBLIC_EXPO_PROJECT_ID` + `EXPO_PUSH_ENABLED=true` and physical-device permission testing.
- **Native returns with image upload** and **EAS/app-store release config:** future mobile work.
- **Saved payment cards:** stored in localStorage, not the database.

> Status is based on the actual codebase and the verification commands above — not on plans or unverified reports. Re-run the commands after any change and update this section (per `AGENTS.md`).
