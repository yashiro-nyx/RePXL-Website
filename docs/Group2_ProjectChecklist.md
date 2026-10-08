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

- [x] Mobile AI Concierge UI/UX layout improvement & knowledge base expansion (2026-10-02): overhauled the native AI Assistant interface in `react-native/app/support.tsx` with a live status bar, category filter chips with Feather icons, Hero Welcome Card with starter topics, rich markdown-like message formatting (`FormattedAiMessage` with bold headers, red bullet points, callout tip boxes, inline code chips), contextual follow-up chips, assistant action buttons for deep-linking (e.g., Track My Orders, Explore CCD Cameras, Read Return FAQs), message helpfulness feedback (👍/👎), and message bubble timestamps with delivery checkmarks. Expanded the local rule-based response catalog in `react-native/data/ai-concierge.ts` from 7 basic checks to 35+ camera domains (CCD vs CMOS color science, Y2K flash photography, warm/nostalgic film look, beginner recommendations, budget under ₱3,500, slim metal bodies, battery care/NiMH/Li-ion, pre-2007 2GB memory card limits, phone transfer methods, 480p VGA video, blur fixes, humidity care, "Try the Look", 4-tier grading, included accessories, optical inspection, LCD yellowing explanation, delivery times, cancellations, promo vouchers `WELCOME10`, 14-day condition returns, transit damage, trade-in/selling to RePXL, and support contact). Added deep-link shortcuts in `product.tsx` ("Ask AI Concierge About This Camera") and `account.tsx`.
  - Verification: `react-native/` typecheck passed cleanly (`npm run typecheck` exit 0). Root TypeScript check passed (`npx tsc --noEmit`). Tests in `src/lib/mobile-features.test.ts` passed.
  - Limits: rule-based intent matching without an active LLM/backend pipeline; conversation state is local to the mobile session and does not synchronize cross-device with the website chat widget.

- [x] Standard AI support fallback (2026-10-02): identical website/mobile replies
  acknowledge missing information, list supported RePXL topics, suggest rephrasing,
  and provide Contact Support. Topic guards reduce unrelated keyword matches;
  preserved built-in prompts and corrected old mobile response-shape expectations.
  - Verification: root/mobile TypeScript passed; **103 tests across four files
    passed**, covering fallback/parity/widget and the two existing mobile feature
    suites. Root `npm run build` passed (70/70 static pages). Android/iOS production
    exports passed (1,543/1,417 modules), from `react-native` using
    `npx expo export --platform android --output-dir .expo/support-fallback-android`
    and `npx expo export --platform ios --output-dir .expo/support-fallback-ios`.
    These are JavaScript/Hermes bundles, not APK/IPA builds. No full-suite rerun performed.
  - Limits: keyword-based classification, no live knowledge lookup or automatic
    human handoff; ambiguous mixed-topic queries can still match canned replies.
    Browser/device rendering was not checked. No deployment/commit/push performed.

- [x] Mobile return/refund workflow extension (2026-10-02): three-step selection/
  reason-and-evidence/review wizard, discounted item refund estimate, approval
  instructions, customer carrier/tracking entry and correction before receipt,
  actual lifecycle milestones, pending/failed/uncertain refund messaging, explicit
  rejected-case retry, and native support navigation. Existing cancellation and
  shared admin receipt/inspection/refund safeguards remain intact.
  - Verification: root/native `npx tsc --noEmit` passed; **214 tests across 13 files
    passed**, including mobile/web pricing/stage/timeline parity and authenticated
    shipment transport/validation. Android/iOS exports passed (1,543/1,417 modules).
    Web build was not repeated because application changes
    are confined to native sources; prior web build evidence remains below.
  - Limits: physical-device rendering, keyboard/picker behavior, live uploads/
    provider refunds, and actual webhook delivery unverified. Shared migration
    prepared but not applied; backend release required. No deployment, APK/IPA/EAS
    build, commit, or push performed. See [returns.md](./returns.md).

- [x] Web return/refund lifecycle (2026-10-02): guided item/reason/evidence/review
  submission; approval instructions and customer shipment tracking; actual milestone
  progress; admin receipt/inspection and optional one-time restocking; selected-item
  refunds after discounts, optional original shipping for whole returns, COD repayment
  reference recording, provider pending/failure/reconciliation, durable idempotent
  retries, and signed refund webhook handling. Native displays shared instructions,
  refund state, and amount. See [returns.md](./returns.md).
  - Verification: root/native `npx tsc --noEmit`, `npx prisma validate`, and Prisma
    client generation passed; **198 tests across 12 files passed**; root `npm run build`
    passed (70/70 static pages). Financial/database calls in tests are mocked.
    All 49 checked local documentation file destinations exist; whitespace checks passed.
  - Release limits: new migration prepared but not applied; browser/device UI,
    live uploads/refunds/webhook delivery, and database contention unverified.
    Apply migration and deploy API/UI before use. Multiple accepted cases per order,
    per-line quantity selection, exchanges/labels, and paid-cancellation refunds
    remain deferred. No deployment, native build, commit, or push performed.

- [x] Documentation consolidation (2026-10-02): reduced `docs/` from 11 files to seven maintained guides. Combined setup/deployment, notifications/email, and navigation/support; folded durable onboarding material into architecture; shortened the mobile plan; preserved returns and the progress checklist. Updated README, handoff references, and the AGENTS documentation map without changing its operating rules.
  - Verification: 50 local Markdown destinations/anchors across 12 repository Markdown files passed; retained literal source paths, references to removed guides, and whitespace checked. This task changed documentation and one source comment; application tests, TypeScript checks, production builds, browser/device checks, deployments, and provider operations were not rerun. Existing task verification below remains dated evidence, not a new full-suite result.

- [x] Mobile website-flow parity (2026-10-02): cancellation uses the existing customer endpoint; native return requests support purchased-item selection, six reasons, optional details, protected photo evidence, and review/rejection/refund status. Shared API fixes enforce the 30-day delivery/completion window, persist selected items, accept omitted optional details, connect the missing admin `/refund` route, and include order references in return/refund notifications. See [returns.md](./returns.md).
  - Verification: root and mobile `npx tsc --noEmit` passed; targeted Vitest run passed **152 tests across 9 files**; root `npm run build` passed (70/70 static pages); Android and iOS Expo production exports passed (1,542 / 1,416 modules).
  - Historical limitations: native device/UI, live Cloudinary uploads, and real PayMongo refunds remain unverified; native rebuild and backend deployment required. `--platform all` export failed due to existing missing `react-native-web`. Paid cancellations do not automatically refund. Full-order-only refunds at that point were replaced by the expanded web workflow above. No deployment/commit/push performed.

- [x] Mobile FAQ layout fix (2026-09-29): prevent the horizontal category scroller from growing vertically, center category labels with 44-point minimum touch targets, and reserve remaining space for the question list with bottom safe-area padding. Filtering/expansion taps work with the search keyboard open; list dragging dismisses it.
  - Verification: `cd react-native; npx tsc --noEmit` passed. `npx vitest run src/lib/mobile-features.test.ts -t 'Mobile Bundled FAQs Data Integrity'`: 3 passed, 16 skipped. Broader `npx vitest run src/lib/mobile-features.test.ts src/lib/mobile-all-modules.test.ts -t 'FAQ'`: 6 passed, 1 existing AI concierge failure, 39 skipped (the support group name also matches FAQ).
  - Android production export passed: from `react-native`, `npx expo export --platform android --output-dir .expo/support-layout-check` (1,536 modules). Native layout/large-font/keyboard visual checks remain pending; the data tests do not verify rendering. Root `npm run build` was not run because it does not compile the mobile app.

- Context-aware Back navigation on the Cameras catalog + About Back button removed — `docs/customer-experience.md#back-navigation`.
- Navbar avatar synchronization from `authStore`.
- Payment success navigation reads the real order from the API.
- In-app notification redesign (concise content, shared dropdown/page components, category system) — `docs/communications.md#in-app-notifications`.
- Notification content sanitization for legacy/malformed records — `docs/communications.md#in-app-notifications`.
- Gmail email redesign onto a shared, Gmail-compatible design system with an offline preview generator — `docs/communications.md#outgoing-email`.
- Floating website AI Concierge chat widget reusing the mobile app's local rule-based concierge logic (automated assistant, no chat backend) — `docs/customer-experience.md#ai-concierge`. Note: this addresses the storefront side of the "Live Chat or AI" item; no cross-device conversation history (see doc).
- Cameras catalog (`/products`) UI/UX redesign **V2** — centered premium brand discovery, custom Sort listbox, **dual-handle price range slider** (dynamic bounds, draft → Apply, synced inputs), filter facet counts, **real-review** Rating filter, Clear All, active-filter chips, **pagination** (12/page, `?page=`), improved empty state, editorial layout; centralized filter+pagination logic; `from=home` Back and wishlist/compare preserved — `docs/catalog.md`.
- [x] **Shared RePXL UI/UX refinement** (2026-10-08): preserved the existing dark/light camera-darkroom identity and refined shared theme tokens, raised/inset/control surfaces, keyboard focus treatment, button hierarchy, responsive container gutters, navbar framing, and product-card silhouette. Homepage, catalog, detail, cart, checkout, account, and modal surfaces inherit the shared system without changing product, payment, authentication, or checkout logic. — `docs/ui-ux-design-system.md`
  - Verification: `npx tsc --noEmit` passed; `npm run build` passed with all 68 static pages generated. Follow-up desktop/mobile browser QA is recorded in the item below.
- [x] **Visual QA of shared UI refinement** (2026-10-08): headless Chrome click-through at 1440×1000 and 390×844 checked storefront, utility, account, wishlist, compare, and admin-login routes; verified header search, mobile menu, catalog filter reachability, no horizontal overflow, no broken images, and no runtime/hydration errors on available states. Product detail was requested but local API/database returned `Camera not found`, so populated purchase-state QA remains pending. Existing Next.js image quality/LCP guidance warnings remain documented, not introduced or fixed in this pass.
- [x] **UI/UX audit and phased improvement plan** (2026-10-08): analysis-only review of the established RePXL visual identity, tokens, typography, photography, navigation, product discovery, search, filtering, checkout, account flows, mobile behavior, accessibility, interaction states, loading/error/empty states, and React/Next.js UI performance. No application redesign or code implementation was performed. Findings and phased plan: `docs/ui-ux-audit-2026-10.md`. Verification for this audit was source inspection plus focused local UI/UX guidance searches; TypeScript, tests, build, and a new browser pass were not rerun because no application code changed. Existing browser-QA and build results remain documented in `docs/ui-ux-design-system.md`.
- [x] **Phase 1 accessibility and interaction fundamentals** (2026-10-08): added shared keyboard focus trapping/restoration for the mobile catalog filter drawer, login-required dialog, logout confirmation, and image lightbox; added active desktop/mobile navigation states with `aria-current`; added mobile menu semantics and 44px touch targets; raised shared small buttons to a 44px minimum without changing their visual identity or business logic. Verification: `npx tsc --noEmit` passed; focused catalog/account/notification tests passed (**57 tests**); `npm run build` passed with **68/68 static pages**. Follow-up headless Chrome QA at **1440×1000** and **390×844** verified navbar/catalog keyboard traversal, filter/login focus containment and restoration, visible focus styling, navigation ARIA state, touch-target sizing, no tested overflow, and no console/runtime errors. The seeded browser state did not expose a review-photo trigger and authenticated logout UI did not reach a stable session, so lightbox/logout browser click-through remains pending; no screen-reader support is claimed as verified. Details: `docs/ui-ux-audit-2026-10.md`.
- [x] **Phase 2 search and product discovery** (2026-10-08): added active-product-backed navbar suggestions using existing name/brand/series/slug data, accessible combobox/listbox semantics, ArrowUp/ArrowDown navigation, Enter selection, Escape dismissal, safe normal query submission, and 44px suggestion targets. Added search loading, retry/error, empty-query, no-match, result-count, clear, and browse recovery states without exposing technical errors or changing product taxonomy/backend behavior. Verification: `npx tsc --noEmit` passed; focused search/catalog tests passed (**35 tests**); `npm run build` passed with **68/68 static pages**; `git diff --check` passed; headless Chrome QA at **1440×1000** and **390×844** verified search activation, mobile sizing, Escape behavior, no horizontal overflow, and no browser console/runtime errors. The local product API returned HTTP 500 from the unavailable database-backed product query, so populated suggestions, product-card result rendering, product-detail transition, and completed no-match recovery remain pending with healthy inventory data. Details: `docs/ui-ux-audit-2026-10.md`.
- [x] **Phase 3 loading, error, empty, and retry states** (2026-10-08): added shared `FeedbackState` semantics for loading/error/empty surfaces; improved catalog, search, product detail/reviews, wishlist, compare, cart, orders, addresses, account reviews, and checkout/payment error presentation with safe messages and actual retry actions where supported. Preserved payment, authentication/MFA, order, inventory, shipping, schema, and migration behavior. Verification: `npx tsc --noEmit` passed; focused UI/state tests passed (**64 tests**); `npm run build` passed with **68/68 static pages**; `git diff --check` passed; Chrome QA at **1440×1000** and **390×844** verified reachable search/catalog loading/error shells, mobile sizing, Escape behavior, no horizontal overflow, and no browser console/runtime errors. Supabase was unavailable, so populated-data and authenticated route states remain pending; no database reset, schema/migration, credential, or fake-data changes were made. Details: `docs/ui-ux-audit-2026-10.md`.
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
- [x] **Security/MFA diagnostic validation** (2026-10-08): re-audited the current recent-auth, password step-up, MFA, CSRF/origin, session-binding, and error-mapping paths against the historical 403/409/503 reports. Confirmed the GET contract is 401 without a session and 200 with authenticated verified/not-verified state; no further security code change was required. Focused suite: **105 passed, 23 skipped**; TypeScript, production build (68/68 pages), and diff check passed. Live MFA enrollment/login/disable remains unverified because the authenticated browser/database test environment was unavailable.
- [x] **Live MFA verification preflight** (2026-10-08): required local configuration was present and the MFA key format was valid, but `TEST_MFA_DATABASE_URL` was missing and a read-only Prisma connectivity check was unavailable. Live MFA mutation testing was therefore stopped before enrollment; no account, database, schema, migration, credential, or secret changes were made.
- [x] **Return/refund API validation compatibility fix** (2026-10-08): corrected the shared returns schema so omitted optional details default to an empty value without triggering the supplied-details minimum-length rule. Preserved the 10–1000 character rule when details are supplied and aligned stale route-test expectations with the established `422` validation contract. Route suite: **21/21 passed**; TypeScript and diff check passed.

- [x] **About Page Design Assets & Homepage Consistency** (2026-10-02): aligned the About page (`/about`) design assets, framing elements, and visual language with the homepage for seamless brand consistency.
  - **Replaced placeholder vector mockups:** removed `editorial-1.svg` and `hero-sample-photo.svg` raw `<img>` tags (which previously relied on eslint suppression). Upgraded to authentic photographic assets using Next.js `<Image />`: the Canon PowerShot 2003 archival card (`digicamera1.png`, width 1374, height 1145) with red ambient drop-shadows, and an authentic 2004 CCD direct-flash photo (`canonsample.png`, showing authentic 2004 date stamp and color tone) in an archival polaroid mount with subtitle "First camera graded · 2024 · CANON A520".
  - **Archival metadata framing:** added the signature metadata elements from the homepage `EditorialSection`: `DIGICAM ARCHIVE // REF. 01 — CANON A520` with pulsing red dot, responsive corner brackets, and `HISTORIC PROVENANCE [4.0MP · CCD · 2004]` with `+` crosshair mark.
  - **Hero photographic environment & viewfinder:** upgraded `AboutHero` with theme-aware atmospheric mountain backdrops (`lightmodebg.png` / `darkmodebg.png` with soft gradient masks), viewfinder corner accents (`hero-corner`), red accent bars (`h-px w-8 bg-repixl-red`), and `REPIXL` background watermark echoing the homepage hero and deal banner.
  - **Trust strip integration:** rendered `<TrustStrip />` immediately after `AboutHero`, replicating the signature trust/authenticity ticker ribbon that anchors the homepage.
  - **Design system accent unification:** added red accent line indicators to all section eyebrows (`Our Process`, `What We Believe`, `Milestones`, `The Team`, `Where We're Headed`). Added process step icons to `HowWeGrade` matching the visual style of `WhyUs`. Updated return window note in `WhatWeBelieve` to 14 days.
  - **Brand catalog lineage strip:** integrated the 6 catalogued brand badges (Canon, Nikon, Sony, Kodak, Panasonic, Fujifilm) with their official accent colors and series tags into `StatsRow`, connecting directly to `/products?brand=...` filters.
  - **Homepage CTA pill button:** upgraded the CTA in `WhereHeaded` to the rounded pill button with arrow circle and red hover glow matching `PromoDuo` and `BrandGallery`.
  - **Verification:** `npx tsc --noEmit` clean (exit 0); `npx vitest run src/lib/back-navigation.test.ts` (90 passed); `npm run build` exit 0 with 0 warnings (`/about` static route ~4.1 kB, 153 kB). Docs: `docs/fonts-and-images.md`, `docs/Group2_ProjectChecklist.md`.

### Known limitations / pending (not marked complete)

- **Historical mobile concierge failures:** the nine response-contract/copy
  expectations in the older audit were updated and verified by the fallback task
  above. Both mobile feature suites now pass in the targeted run; the historical
  full-suite snapshot has not been rerun.
- **PayMongo (Live):** at least one payment method must be activated in the PayMongo Dashboard; a live end-to-end payment has not been re-verified here.
- **Live Gmail rendering:** not verified in a real email client (built to Gmail-safe spec only).
- **Mobile push notifications:** require `EXPO_PUBLIC_EXPO_PROJECT_ID` + `EXPO_PUSH_ENABLED=true` and physical-device permission testing.
- **Native returns with image upload:** implemented and covered by targeted tests/native bundle checks; physical-device and provider E2E checks pending (see [returns.md](./returns.md)). **EAS/app-store release config:** future mobile work.
- **Saved payment cards:** stored in localStorage, not the database.

> Status is based on the actual codebase and the verification commands above — not on plans or unverified reports. Re-run the commands after any change and update this section (per `AGENTS.md`).

### Phase 4 — Information architecture and mobile-first commerce UX (2026-10-08)

- [x] Kept editorial brand cards text-led with their existing catalog camera photography; removed the Phase 4 SVG logo rendering. Homepage New Arrivals and local recently-viewed/Continue browsing rails, sticky catalog filter/sort context, desktop-sticky product purchase context, a mobile floating cart, safe-area-aware mobile Add to Cart, and checkout assurance cues remain unchanged.
- [x] Preserved existing filters, pagination, related cameras, checkout step machine, RePXL palette, typography, photography, product-card signature, and all business logic. Trending and People also bought were not added because no supported API metrics exist.
- [x] Verification: `npx tsc --noEmit` passed; focused catalog/checkout/search/feedback tests passed (**53 tests**); `npm run build` passed with **68/68 static pages**; `git diff --check` passed. Headless Google Chrome rendered `/` at **1440×1000** and `/products` at **390×844** and exposed the new route landmarks in the DOM. Interactive keyboard/focus-trap/touch-target/accessibility-tree checks were not completed because no usable Playwright runtime is installed; populated catalog/product/cart/checkout states remain database-dependent on local Supabase connectivity.
- [x] Correction pass: removed the Phase 4-only dynamic `brand-*.svg` rendering from `BrandGallery`; no SVG assets were added, deleted, converted, or hotlinked. Existing text brand labels and catalog camera photography remain. Re-ran TypeScript, focused tests, production build, diff checks, and desktop/mobile Chrome smoke rendering.
- [x] Focused homepage visual refinement (2026-10-08): removed the persistent navbar active trail while retaining `aria-current` and focus states; changed New Arrivals to a compact up-to-four-product real-data grid using an opt-in compact ProductCard mode; reused the shared reveal/stagger variants for New Arrivals and Continue Browsing with reduced-motion support. Verification: TypeScript passed, focused tests **53 passed**, build passed with **68/68 static pages**, diff check passed, and headless Chrome smoke-rendered 1440×1000 and 390×844. Populated product states remain limited by unavailable local Supabase.
- [x] Focused light-mode contrast and theme consistency (2026-10-08): made account film loading surfaces theme-aware, removed the catalog sticky toolbar’s hardcoded dark background, applied shared control tokens to filter/sort surfaces, and corrected the All Cameras icon foreground in light mode. Navbar `aria-current` and focus behavior were preserved. Verification: TypeScript passed, focused tests **52 passed**, build passed with **68/68 static pages**, diff check passed, and headless Chrome smoke-rendered catalog/account routes at 1440×1000 and 390×844 without captured hydration/runtime signatures. Full interactive theme inspection remains limited by unavailable Playwright runtime and local Supabase data.
- [x] Focused navbar/account loading correction (2026-10-08): traced the apparent navbar dimming to the interaction between the account `burn-subtle` backdrop and the prior `bg-repixl-bg/55` navbar surface; no overlay, parent opacity, or z-index bug was found. Added the shared theme-token translucent navbar surface with restrained blur, preserving fixed positioning, focus rings, `aria-current`, and the removed active underline. Account loading remains below and independent of the navbar. Verification: TypeScript passed, focused tests **52 passed**, build passed with **68/68 static pages**, diff check passed, and Chrome smoke QA ran at 1440×1000 and 390×844. Populated account interaction remains limited by Playwright/Supabase availability.
- [x] Phase 5 performance and perceived-performance pass (2026-10-08): audited existing `next/image` usage, hero priority/sizes, product imagery, client hydration, and homepage motion. Added an explicit Next.js image quality allowlist for the existing `quality={90}` editorial images and changed homepage reveal triggers from repeat-on-scroll to once-per-page-visit while preserving RePXL motion and reduced-motion behavior. No assets, product fetching, navbar behavior, or business logic changed. Verification: TypeScript passed, focused tests **52 passed**, build passed with **68/68 static pages**, diff check passed, and headless Chrome smoke QA rendered `/` at 1440×1000 and `/products` at 390×844 without captured hydration/runtime error signatures. Core Web Vitals and populated Supabase performance benchmarking remain outstanding.
- [x] Phase 6 information architecture and navigation clarity (2026-10-08): preserved the four-item primary navigation and existing `from=home`/history-aware Back architecture; added subtle active navbar text emphasis without restoring the red trail, marked the current product breadcrumb with `aria-current="page"`, named the catalog results region, and strengthened mobile account navigation targets/focus rings. Security remains the single home for password and MFA. Verification: TypeScript passed, focused catalog/search/checkout/account tests **64 passed**, build passed with **68/68 static pages**, diff check passed, route smoke checks returned HTTP 200, and headless Chrome smoke QA ran at 1440×1000 and 390×844. Populated authenticated/product/checkout interaction remains limited by Playwright/Supabase availability.
- [x] Final UI/UX regression and polish pass (2026-10-08): found and corrected remaining 32–40px customer-facing interactive controls across Back, pagination, image lightbox, modal close, carousel, cart quantity, notification, and account/profile-menu surfaces. Preserved RePXL styling, focus behavior, routes, and business logic. No new raw storefront error rendering, motion regression, theme regression, unsupported taxonomy, or unconditional Back button was found. Verification: TypeScript passed, focused tests **67 passed**, build passed with **68/68 static pages**, diff check passed, required route smoke checks returned HTTP 200, and Chrome smoke QA ran at 1440×1000 and 390×844 without captured hydration/runtime signatures. Full interactive and populated-data verification remains limited by Playwright/Supabase availability.
- [x] Back navigation full-suite regression correction (2026-10-08): updated only the stale structural test expectation from `min-h-[40px]` to the existing `min-h-11` Tailwind token, preserving the intentional 44px BackButton touch target. Focused BackButton tests **90/90 passed**; full suite **1411 passed, 47 skipped**; TypeScript and diff check passed.
