# RePXL React Native App Development Plan

## 1. Objective

Build a production-ready React Native customer app for iOS and Android that uses the existing RePXL backend and database. Customers should be able to browse products, authenticate, manage their account, purchase products, track orders, and receive notifications. The existing web admin dashboard remains the operational interface for products, inventory, customers, orders, vouchers, CMS content, and tracking.

The PostgreSQL database remains the single source of truth. The mobile app must communicate with the Next.js API and must never connect directly to PostgreSQL.

## Current Implementation Status

The maintained integration is implemented in `react-native/`. The deprecated `mobile/` prototype folder has been completely removed from the repository. Completed slices include:
- Native login/registration, MFA challenge verification, token refresh, and SecureStore session persistence.
- Shared bearer access to all customer APIs with automatic 401 token refresh queue.
- Product catalog browsing, full-text search with query parameter handling, brand/series category filters, price brackets, and "In Stock Only" toggles.
- Product detail with condition grading explainer modal, brand CCD color profile previews ("Try the Look" simulation for Canon, Kodak, Sony, Nikon, Fujifilm, Panasonic), and camera comparison tool.
- Cart with individual and select-all checkboxes, live voucher code validation (`/api/vouchers/validate`) with real-time discount calculation, clear cart confirmation, and selective checkout forwarding.
- Checkout with inline Philippine address creation modal, default address selection, voucher discounts, and hosted PayMongo checkout session creation.
- Account dashboard with full in-app Address Management (CRUD + set default), dedicated Wishlist sub-view with direct "Add to Cart" and "Remove" actions, and logout confirmation modal.
- Order history with detailed view and visual multi-step tracking status timeline.
- In-app review creation with star ratings and review deletion.
- In-app notification polling and optional Expo push-token registration.

The next work is return request submission, image uploads for mobile reviews/returns, deep-link payment return handling, offline/cache strategy, device testing, and app-store release configuration.

## 2. Recommended Architecture

```text
React Native / Expo app
        |
        | HTTPS JSON API, SSE where supported, push notifications
        v
Next.js API routes and business logic
        |
        v
Prisma -> PostgreSQL
        ^
        |
Next.js customer website and admin dashboard
```

### Mobile stack

- Expo and React Native with TypeScript
- Expo navigation surface with a typed API client for the initial shell
- Server state currently uses the typed fetch client; TanStack Query can be introduced as the screen count grows
- Local React state for the current shell; Zustand remains optional for future offline/UI state
- Expo SecureStore for access and refresh tokens
- Zod schemas generated or shared from a common contracts package where practical
- Expo Notifications for push notifications
- Existing Cloudinary, payment, email, and shipping integrations through the backend

Keep the app in the separate `react-native/` project. Shared API types and validation schemas can move into `packages/contracts/` once the mobile endpoints are stable.

## 3. Scope

### Version 1 customer features

- Email/password registration, login, logout, password reset, and MFA
- Optional Google sign-in using a mobile OAuth flow
- Product catalog, search, filtering, product detail, images, and reviews
- Wishlist and cart synchronization across web and mobile
- Address management
- Voucher validation
- Checkout and payment redirect/deep-link handling
- Order history and order detail
- Delivery tracking and order status updates
- Returns and review submission, including image upload
- Customer profile, security settings, and notification preferences
- Push notifications for order, payment, shipping, and account events
- Loading, empty, offline, expired-session, and error states

### Explicitly out of scope for the first release

- Native admin application
- Direct database access from the device
- Fully offline checkout or offline order creation
- Replacing the existing web storefront
- A second independent business-logic implementation in the mobile app

## 4. Backend Preparation

The current API already covers products, carts, orders, reviews, wishlist, addresses, vouchers, notifications, returns, uploads, checkout, and admin operations. Before building the complete mobile UI:

1. Define a versioned mobile API contract, preferably under `/api/v1/` or through a documented compatibility policy.
2. Add mobile access and refresh-token authentication. The current customer authentication in `src/lib/auth-helpers.ts` is HTTP-only-cookie based and should remain for web while supporting bearer tokens for native clients.
3. Store refresh-token hashes, device metadata, expiration, revocation, and last-used timestamps in the database.
4. Add token rotation and revoke-all-sessions functionality to account security.
5. Ensure every customer endpoint derives ownership from the authenticated identity rather than accepting a client-supplied user ID.
6. Standardize response and error formats, pagination, validation errors, and HTTP status codes.
7. Add idempotency keys for checkout and payment-finalization requests.
8. Confirm webhook processing is idempotent for payment and shipping updates.
9. Add CORS and rate-limit rules appropriate for native clients without weakening server-side authorization.
10. Add push-token registration and removal endpoints linked to the customer account and device.

## 5. Synchronization Design

Synchronization means all clients read and write the same backend state:

- Product and inventory changes made by admins are returned to mobile on the next query or cache refresh.
- Cart and wishlist mutations invalidate the corresponding TanStack Query cache.
- Checkout is finalized only by the backend transaction and payment webhook flow.
- Order status changes made in the admin dashboard are visible through order refetching and push notifications.
- The existing tracking SSE endpoint can support live tracking where the mobile networking layer supports it; polling is the fallback when the app is backgrounded or SSE is unavailable.
- Push notifications should trigger a targeted refetch, not be treated as the canonical order data.

The app should display cached data while offline, clearly mark stale data, and queue only safe mutations such as wishlist changes. Checkout and payment must require a confirmed online connection.

## 6. Delivery Phases

### Phase 0: Decisions and baseline

- Confirm iOS/Android targets, branding, payment provider behavior, analytics, crash reporting, and app-store accounts.
- Freeze the initial customer feature list.
- Document current endpoint behavior and identify endpoints needing mobile changes.
- Maintain the `react-native/` Expo project (the deprecated `mobile/` prototype folder has been removed) and CI environments.

**Exit criteria:** app launches on iOS simulator and Android emulator; development, staging, and production API URLs are configurable.

### Phase 1: API and authentication foundation (Completed)

- Implement access/refresh-token flow alongside web cookies.
- Add mobile login, registration, logout, token refresh, MFA, password reset, and session revocation.
- Add device push-token registration.
- Add contract tests for authentication and customer authorization.

**Exit criteria:** a native client can authenticate, refresh an expired access token, sign out, and access only its own customer data.

### Phase 2: App shell and read-only shopping (Completed)

- Implement navigation, theme, typography, API client, query provider, secure storage, and global error handling.
- Build home/catalog, search, filters, product detail, image gallery, condition grading explainer, brand CCD color profiles ("Try the Look"), and camera comparison tool.
- Add loading, empty, retry, and offline states.

**Exit criteria:** customers can browse the same active product inventory as the website.

### Phase 3: Cart, account, wishlist, and addresses (Completed)

- Implement cart operations, individual/select-all checkboxes, clear cart confirmation, and cross-device invalidation.
- Implement dedicated wishlist sub-view with direct cart moves, customer profile, address CRUD (create, update, delete, set default) with full Philippine fields, notification preferences, and account security with logout confirmation.
- Add optimistic updates only for low-risk operations and reconcile with the server response.

**Exit criteria:** a cart or wishlist change made on web is visible in mobile after refresh, and vice versa. Full address CRUD functions seamlessly.

### Phase 4: Checkout and payments (Substantially Complete)

- Implement shipping selection, default and inline address creation, live voucher validation in cart & checkout, order review, selective item checkout, and payment initiation.
- Implement payment-provider deep links and return handling via Expo WebBrowser.
- Add idempotent finalization and recovery for canceled, interrupted, or duplicate payment attempts.
- Verify stock and totals on the server immediately before finalization.

**Exit criteria:** a test customer can complete payment in staging and receive exactly one order with correctly deducted inventory.

### Phase 5: Orders, tracking, returns, and notifications (Partially Complete)

- Implement order history, order detail, receipt, visual status tracking timeline, cancellation, confirm receipt, and return requests (order history, detail, receipt, and tracking timeline completed; return requests pending).
- Integrate tracking polling and live refresh.
- Add push notification registration, permission handling, deep links, and in-app notification polling.
- Add review submission with star ratings and review deletion (completed; image uploads for reviews/returns pending).

**Exit criteria:** an admin tracking update is reflected in the customer app and generates the expected notification without exposing another customer's order.

### Phase 6: Hardening and release

- Run unit, API contract, integration, accessibility, and device tests.
- Test slow networks, token expiry, offline resume, duplicate taps, interrupted payments, and app upgrades.
- Configure signed builds, environment secrets, privacy policy, terms, app icons, screenshots, and store metadata.
- Release to internal testers, then staged production rollout.

**Exit criteria:** release candidate passes the acceptance checklist on supported iOS and Android devices and has monitoring for crashes, failed payments, API errors, and notification delivery.

## 7. Testing Strategy

- **Backend:** preserve existing Vitest coverage and add auth, authorization, idempotency, webhook, and mobile-contract tests.
- **Mobile unit tests:** reducers, validation, token storage behavior, query transformations, and checkout state transitions.
- **Component tests:** forms, cart, product detail, order states, and error handling.
- **Device/E2E tests:** registration, login/MFA, browse, cart, checkout, payment return, order tracking, returns, and logout.
- **Security tests:** cross-account resource access, revoked tokens, expired tokens, replayed idempotency keys, upload authorization, and rate limits.
- **Compatibility tests:** verify that web and mobile mutations produce the same database state and business outcomes.

## 8. Release Environments

- **Development:** local Expo app against a local or development API/database.
- **Staging:** separate database, payment credentials, Cloudinary configuration, notification project, and test accounts.
- **Production:** protected secrets, production database migrations, production payment webhooks, monitoring, backups, and rollback procedure.

Never ship development secrets, database URLs, admin credentials, or server-only payment keys in the mobile bundle.

## 9. Initial Milestone Breakdown

The first implementation milestone should be:

1. Maintain the Expo TypeScript app in `react-native/`.
2. Add environment configuration and a typed API client.
3. Add mobile token endpoints and persistent secure token storage.
4. Implement login, registration, logout, and session hydration.
5. Add one protected smoke flow: fetch products, fetch the current user, and log out.
6. Add backend and mobile tests for token expiry, refresh, revocation, and customer scoping.

This milestone validates the highest-risk integration boundary before significant UI work begins.

## 10. Definition Of Done

The project is complete when the mobile app can perform all Version 1 customer workflows against the production API, uses the same database and business rules as the website, handles token and payment failures safely, receives order notifications, reflects admin changes, passes cross-account security tests, and is distributable through the Apple App Store and Google Play.
