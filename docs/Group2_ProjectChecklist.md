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

| Check | Command | Result |
|---|---|---|
| Type check | `npx tsc --noEmit` | ✅ Clean |
| Production build | `npm run build` | ✅ Succeeds — 68/68 static pages generated |
| Test suite | `npx vitest run` | ⚠️ **957 passed, 9 failed, 47 skipped** (1013 tests across 60 files) |

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

### Known limitations / pending (not marked complete)

- **Mobile AI concierge tests failing (9):** `src/lib/mobile-features.test.ts` (8) and `src/lib/mobile-all-modules.test.ts` (1) — the "Live Chat or AI" support assistant's `generateAiResponse` output no longer matches expected support copy. This is the one area above whose automated tests do not currently pass and should be treated as in-progress.
- **PayMongo (Live):** at least one payment method must be activated in the PayMongo Dashboard; a live end-to-end payment has not been re-verified here.
- **Live Gmail rendering:** not verified in a real email client (built to Gmail-safe spec only).
- **Mobile push notifications:** require `EXPO_PUBLIC_EXPO_PROJECT_ID` + `EXPO_PUSH_ENABLED=true` and physical-device permission testing.
- **Native returns with image upload** and **EAS/app-store release config:** future mobile work.
- **Saved payment cards:** stored in localStorage, not the database.

> Status is based on the actual codebase and the verification commands above — not on plans or unverified reports. Re-run the commands after any change and update this section (per `AGENTS.md`).
