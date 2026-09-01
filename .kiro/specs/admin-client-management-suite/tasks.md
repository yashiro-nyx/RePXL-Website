# Implementation Plan: Admin & Client Management Suite

## Overview

This plan implements the Admin & Client Management Suite additively on the existing
RePXL Next.js 14 / Prisma / PostgreSQL codebase. Work is ordered **database-first**:
the Prisma schema, migration, and seed defaults land first so every downstream layer
has concrete types and data. Pure-logic libraries (with their fast-check property
tests) come next, followed by the extended external-service helpers (PayMongo refunds,
Nodemailer notifications), then API route handlers with Zod validation and AdminLog
auditing, then admin and storefront UI, and finally integration/E2E flows.

All 39 correctness properties from the design are implemented as individual
fast-check property tests (minimum 100 iterations each), tagged
`Feature: admin-client-management-suite, Property N: ...`. Test sub-tasks are marked
optional with `*`. Files follow structure.md conventions: sources under `src/`, the
`@/` import alias, and kebab-case file names.

Current verified status: the admin and customer API route implementation is complete,
and the project production build succeeds with `npm run build -- --no-lint` (exit code 0).

## Tasks

- [ ] 1. Database foundation: schema, migration, and seed defaults
  - [x] 1.1 Add all schema changes to `prisma/schema.prisma`
    - Add enums `ReturnStatus`, `PageStatus`, `BannerPlacement`, `NotificationEvent`, `NotificationChannel`
    - Add models `ReturnRequest`, `ReturnRequestItem`, `StaticPage`, `Banner`, `HomepageContentBlock`, `PlatformSetting`, `Notification`, `NotificationTemplate` with `@@map` snake_case table names and indexes per design
    - Extend `User` with `promoOptOut Boolean @default(false)` and `notifications` / `returnRequests` relations
    - Extend `Order` with `deliveredAt DateTime?`, `completedAt DateTime?`, and `returnRequests` relation
    - _Requirements: 3.1, 3.2, 3.3, 3.6, 5.1, 5.3, 6.1, 6.2, 6.7, 7.1, 8.1, 8.2, 9.1, 9.3, 9.9_

  - [x] 1.2 Generate and apply the Prisma migration
    - Run `npx prisma migrate dev --name admin_client_management_suite` and `npx prisma generate`
    - Confirm all new columns are nullable or defaulted so the migration is non-destructive
    - _Requirements: 3.3, 5.3, 6.2, 7.1, 8.2, 9.1_

  - [x] 1.3 Seed default notification templates and platform settings in `prisma/seed.ts`
    - Insert one `NotificationTemplate` per `NotificationEvent` (subject/body/channel/enabled)
    - Insert default `PlatformSetting` rows for `currency`, `shippingOptions`, `paymentOptions`
    - _Requirements: 7.1, 8.1, 8.7_

- [x] 2. Invoice & packing-slip formatting library (`src/lib/documents.ts`)
  - [x] 2.1 Implement document builders and money formatting
    - Implement `buildInvoiceModel`, `formatMoney`, `buildPackingSlipModel`, `validatePackingSlip`, and a typed `DocumentError`
    - Line subtotal = unitPrice × quantity; total = subtotal + shipping − discount; packing slip excludes prices/totals; serial "not recorded" indicator
    - _Requirements: 1.2, 1.3, 2.2, 2.3, 2.4, 2.7_

  - [x]* 2.2 Write property test for invoice consistency
    - **Property 1: Invoice totals and required fields are consistent**
    - **Validates: Requirements 1.2**

  - [x]* 2.3 Write property test for money formatting
    - **Property 2: Monetary formatting always has exactly two decimals**
    - **Validates: Requirements 1.3**

  - [x]* 2.4 Write property test for packing-slip required fields
    - **Property 3: Packing slip contains required fulfillment fields per item**
    - **Validates: Requirements 2.2**

  - [x]* 2.5 Write property test for serial-number rendering
    - **Property 4: Serial number presence is rendered explicitly**
    - **Validates: Requirements 2.3**

  - [x]* 2.6 Write property test for price/total exclusion
    - **Property 5: Packing slip never exposes prices or totals**
    - **Validates: Requirements 2.4**

  - [x]* 2.7 Write property test for packing-slip validation
    - **Property 6: Packing slip validation identifies missing required fields**
    - **Validates: Requirements 2.7**

- [x] 3. Returns workflow logic library (`src/lib/returns.ts`)
  - [x] 3.1 Implement return-window, transition, eligibility, and submission validation
    - Implement `RETURN_WINDOW_DAYS`, `isWithinReturnWindow`, `canTransition`, `isRefundEligible`, `hasActiveRequest`, and `validateReturnSubmission` (≥1 item, reason 10–1000 chars)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.4, 4.5, 4.6, 4.7, 4.9, 4.10_

  - [x]* 3.2 Write property test for return-window enforcement
    - **Property 7: Return window is enforced by status and date**
    - **Validates: Requirements 3.1, 3.2**

  - [x]* 3.3 Write property test for valid submission creation
    - **Property 8: Valid return submissions create a linked REQUESTED request**
    - **Validates: Requirements 3.3, 3.4**

  - [x]* 3.4 Write property test for invalid submission rejection
    - **Property 9: Invalid return submissions are rejected with offending fields**
    - **Validates: Requirements 3.5**

  - [x]* 3.5 Write property test for single active request
    - **Property 10: At most one active return request per order**
    - **Validates: Requirements 3.6**

  - [x]* 3.6 Write property test for status transitions
    - **Property 11: Return status transitions follow the allowed table**
    - **Validates: Requirements 4.4, 4.5, 4.6**

  - [x]* 3.7 Write property test for whitespace rejection reason
    - **Property 12: Whitespace-only rejection reasons are refused**
    - **Validates: Requirements 4.7**

  - [x]* 3.8 Write property test for refund eligibility
    - **Property 13: Refund eligibility requires APPROVED and PAID**
    - **Validates: Requirements 4.9, 4.10**

- [x] 4. CMS logic library (`src/lib/cms.ts`)
  - [x] 4.1 Implement slug, banner, schedule, and content validation helpers
    - Implement `isValidSlug`, `isBannerVisible`, `validateSchedule`, `validateStaticPage`, `validateBanner`, `validateHomepageBlock`, `sortByUpdatedDesc`, slug-uniqueness check, and draft-visibility predicate
    - _Requirements: 5.1, 5.3, 5.4, 5.5, 5.7, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [x]* 4.2 Write property test for static page ordering
    - **Property 14: Static page and banner lists are ordered**
    - **Validates: Requirements 5.1**

  - [x]* 4.3 Write property test for static page validation
    - **Property 15: Static page validation enforces field rules**
    - **Validates: Requirements 5.3, 5.4**

  - [x]* 4.4 Write property test for slug uniqueness
    - **Property 16: Static page slugs are unique**
    - **Validates: Requirements 5.5**

  - [x]* 4.5 Write property test for draft visibility
    - **Property 17: Draft pages are hidden from non-admins**
    - **Validates: Requirements 5.7**

  - [x]* 4.6 Write property test for banner validation
    - **Property 18: Banner field validation**
    - **Validates: Requirements 6.2, 6.3**

  - [x]* 4.7 Write property test for banner schedule
    - **Property 19: Banner schedule requires start before end**
    - **Validates: Requirements 6.4**

  - [x]* 4.8 Write property test for banner visibility
    - **Property 20: Banner visibility respects active state and schedule**
    - **Validates: Requirements 6.5, 6.6**

  - [x]* 4.9 Write property test for homepage block validation
    - **Property 21: Homepage block validation**
    - **Validates: Requirements 6.7, 6.8**

- [x] 5. Platform settings library (`src/lib/settings.ts`)
  - [x] 5.1 Implement settings accessors, validation, and access control
    - Implement `getSettings`, `updateSettings` (with cache), `validateShippingOption`, enabled-payment-option selector, checkout-unavailable predicate, and `canWriteSettings` (Super_Admin gate)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.10_

  - [x]* 5.2 Write property test for currency round-trip
    - **Property 22: Currency setting round-trips**
    - **Validates: Requirements 7.2**

  - [x]* 5.3 Write property test for shipping option validation
    - **Property 23: Shipping option validation**
    - **Validates: Requirements 7.3, 7.5, 7.6**

  - [x]* 5.4 Write property test for disabled payment exclusion
    - **Property 24: Checkout excludes disabled payment options**
    - **Validates: Requirements 7.4**

  - [x]* 5.5 Write property test for checkout-unavailable warning
    - **Property 25: Checkout-unavailable warning when no payment enabled**
    - **Validates: Requirements 7.7**

  - [x]* 5.6 Write property test for Super_Admin write gate
    - **Property 26: Settings writes require Super_Admin**
    - **Validates: Requirements 7.10**

- [x] 6. Notification template library (`src/lib/notification-templates.ts`)
  - [x] 6.1 Implement token registry, placeholder resolution, and template validation
    - Implement `ALLOWED_TOKENS`, `resolvePlaceholders`, `findUnknownTokens`, and `validateTemplate` (subject 1–200, body 1–10000)
    - _Requirements: 8.2, 8.3, 8.4, 8.5_

  - [x]* 6.2 Write property test for template validation
    - **Property 27: Notification template validation**
    - **Validates: Requirements 8.2, 8.3**

  - [x]* 6.3 Write property test for placeholder resolution
    - **Property 28: Defined placeholder tokens are fully resolved**
    - **Validates: Requirements 8.4**

  - [x]* 6.4 Write property test for unknown token detection
    - **Property 29: Unknown placeholder tokens are detected**
    - **Validates: Requirements 8.5**

- [x] 7. Notification state library (`src/lib/notifications.ts`)
  - [x] 7.1 Implement pure notification helpers
    - Implement `displayUnreadCount`, pure `markRead` / `markAllRead` state transforms, disabled-template suppression predicate, promo-opt-out predicate, and 500-char message truncation for display
    - _Requirements: 8.6, 9.3, 9.4, 9.5, 9.6, 9.7, 9.9_

  - [x]* 7.2 Write property test for disabled-template suppression
    - **Property 30: Disabled templates suppress notifications**
    - **Validates: Requirements 8.6**

  - [x]* 7.3 Write property test for bounded message display
    - **Property 31: Displayed notification message is bounded**
    - **Validates: Requirements 9.3**

  - [x]* 7.4 Write property test for unread-count display
    - **Property 32: Unread count display rule**
    - **Validates: Requirements 9.4**

  - [x]* 7.5 Write property test for mark-read decrement
    - **Property 33: Marking a notification read decrements the unread count by one**
    - **Validates: Requirements 9.5**

  - [x]* 7.6 Write property test for mark-all-read idempotency
    - **Property 34: Mark-all-read clears unread and is idempotent**
    - **Validates: Requirements 9.6**

  - [x]* 7.7 Write property test for in-app retention
    - **Property 35: In-app notification is retained regardless of email outcome**
    - **Validates: Requirements 9.7**

  - [x]* 7.8 Write property test for promo opt-out
    - **Property 36: Promotional opt-out excludes only promotions**
    - **Validates: Requirements 9.9**

- [x] 8. Order tracking logic library (`src/lib/order-tracking.ts`)
  - [x] 8.1 Implement ordering, stepper, and ownership helpers
    - Implement `sortOrdersByDateDesc`, `computeStepperState` (PROCESSING→SHIPPED→DELIVERED→COMPLETED, CANCELLED suppresses), and `canAccessOrder`
    - _Requirements: 10.1, 10.2, 10.4, 10.6_

  - [x]* 8.2 Write property test for order history ordering
    - **Property 37: Order history is ordered by date descending**
    - **Validates: Requirements 10.1**

  - [x]* 8.3 Write property test for status progression
    - **Property 38: Order status progression reflects the current state**
    - **Validates: Requirements 10.2, 10.4**

  - [x]* 8.4 Write property test for owner-only access
    - **Property 39: Order access is restricted to the owner**
    - **Validates: Requirements 10.6**

- [x] 9. Checkpoint - Ensure all pure-logic tests pass
  - All 68 tests pass across 9 test files (cms, documents, mailer, notification-templates, notifications, order-tracking, paymongo, returns, settings). Ask the user if questions arise.

- [x] 10. Extend external-service helpers
  - [x] 10.1 Extend `src/lib/paymongo.ts` with refund support
    - Add `createRefund` and `retrieveRefund` with a 30-second timeout wrapper returning a typed failure/timeout result
    - _Requirements: 4.9, 4.11, 4.12_

  - [x]* 10.2 Write unit tests for refund helper
    - Cover success, gateway failure, and timeout paths against a mocked PayMongo client
    - _Requirements: 4.11, 4.12_

  - [x] 10.3 Extend `src/lib/mailer.ts` with `sendNotificationEmail` and retry
    - Add `sendNotificationEmail(to, subject, body)` retrying up to 3 attempts, returning success/failure to the caller
    - _Requirements: 8.8, 9.2, 9.7, 9.8_

  - [x]* 10.4 Write unit tests for mailer retry
    - Verify 3-attempt retry then failure reporting against a mocked transport
    - _Requirements: 8.8, 9.8_

- [x] 11. Wire notification dispatch end-to-end
  - [x] 11.1 Implement `emitNotification`, `markRead`, `markAllRead` DB operations in `src/lib/notifications.ts`
    - Create in-app Notification synchronously, dispatch email best-effort via `sendNotificationEmail`, suppress disabled templates and promo opt-outs, and record an AdminLog delivery-failure entry when all email attempts fail
    - _Requirements: 8.6, 8.7, 8.8, 9.1, 9.2, 9.5, 9.6, 9.7, 9.8, 9.9_

  - [ ]* 11.2 Write integration test for notification dispatch
    - Verify in-app creation, email attempt when channel includes email, and retry-then-record on failure with mocked timers/transport
    - _Requirements: 8.7, 8.8, 9.1, 9.2, 9.8_

- [x] 12. Admin API route handlers (role-protected, with AdminLog auditing)
  - [x] 12.1 Implement invoice and packing-slip audit routes
    - `POST /api/admin/orders/[orderNumber]/invoice` and `.../packing-slip`: guard with `getCurrentadmin`, validate order existence and required fields, record AdminLog, return document data or a typed error
    - _Requirements: 1.1, 1.5, 1.6, 1.7, 2.1, 2.5, 2.6, 2.7_

  - [x] 12.2 Implement admin returns routes
    - `/api/admin/returns` `GET` (list desc), `GET /[id]`, `PATCH /[id]` (under-review/approve/reject via `canTransition`, reject reason 1–500), `POST /[id]/refund` (eligibility + PayMongo refund + status/paymentStatus update + notify), each with Zod + AdminLog
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12, 4.13, 4.14_

  - [x] 12.3 Implement CMS static-page routes
    - `/api/admin/cms/pages` `GET`/`POST`/`PATCH /[id]`/`DELETE /[id]` with slug/field validation, uniqueness check, and AdminLog
    - _Requirements: 5.1, 5.3, 5.4, 5.5, 5.6, 5.8, 5.9_

  - [x] 12.4 Implement CMS banner routes
    - `/api/admin/cms/banners` `GET`/`POST`/`PATCH /[id]`/`DELETE /[id]` with banner + schedule validation and AdminLog
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.10_

  - [x] 12.5 Implement CMS homepage routes
    - `/api/admin/cms/homepage` `GET`, `PATCH /[id]`, `POST /publish` with block validation and AdminLog
    - _Requirements: 6.7, 6.8, 6.9, 6.10_

  - [x] 12.6 Implement settings routes
    - `/api/admin/settings` `GET` and `PUT` (Super_Admin-only writes, 403 otherwise), persistence-failure handling that retains prior value, and AdminLog with previous/new values
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.8, 7.9, 7.10_

  - [x] 12.7 Implement notification-template routes
    - `/api/admin/notifications` `GET` (templates) and `PATCH /[event]` with `validateTemplate` + `findUnknownTokens`, retaining persisted values on rejection, and AdminLog
    - _Requirements: 8.1, 8.2, 8.3, 8.5, 8.9_

- [x] 13. Customer API route handlers (auth-protected)
  - [x] 13.1 Implement customer returns routes
    - `/api/returns` `POST` (validate submission, single-active guard in a transaction, create ReturnRequest + items, emit RETURN_RECEIVED notification) and `GET /[orderNumber]` (owner-only status)
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [x] 13.2 Implement customer notifications routes
    - `/api/notifications` `GET` (list + unread count), `PATCH /[id]/read`, `POST /read-all`, `PATCH /preferences` (promo opt-out)
    - _Requirements: 9.3, 9.4, 9.5, 9.6, 9.9_

- [x] 14. Update existing order flow to integrate the suite
  - [x] 14.1 Update the order-status update handler
    - Set `deliveredAt` when transitioning to DELIVERED and `completedAt` when transitioning to COMPLETED, and emit ORDER_STATUS_CHANGE (and ORDER_CONFIRMATION) notifications
    - _Requirements: 3.1, 3.2, 8.7, 9.1, 10.5_

  - [x] 14.2 Read platform settings in checkout and money formatting
    - Wire checkout shipping/payment options and storefront currency formatting to `getSettings`
    - _Requirements: 7.2, 7.3, 7.4_

- [x] 15. Checkpoint - Ensure API and logic tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Admin UI: printable documents (utilitarian style, monospace IDs)
  - [x] 16.1 Build invoice printable page
    - `src/app/(admin)/admin/orders/[orderNumber]/invoice/page.tsx` with A4/Letter print box, ≥10 mm inset print stylesheet, monospace order number, client Print button, and audit POST on load
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7_

  - [x] 16.2 Build packing-slip printable page
    - `.../packing-slip/page.tsx` showing courier + serials ("not recorded" indicator), excluding prices/totals, with missing-field error banner
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7_

  - [ ]* 16.3 Write component tests for print layout
    - Assert A4/Letter box and 10 mm inset classes are present
    - _Requirements: 1.4_

- [x] 17. Admin UI: returns queue and detail
  - [x] 17.1 Build `ReturnQueueTable` and returns list page
    - `src/app/(admin)/admin/returns/page.tsx` sorted desc with empty state
    - _Requirements: 4.1, 4.2_

  - [x] 17.2 Build `ReturnDetailPanel` and detail page
    - `.../returns/[id]/page.tsx` with order/items/reason, transition buttons gated by `canTransition`, reject modal (1–500 chars), and refund control shown only when APPROVED with failure-reason surfacing
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.10, 4.12_

- [x] 18. Admin UI: CMS management
  - [x] 18.1 Build static-page management
    - `StaticPageTable` + `StaticPageForm` and `src/app/(admin)/admin/cms/pages/...` with field-level validation retaining values and slug-in-use messaging
    - _Requirements: 5.1, 5.2, 5.4, 5.5_

  - [x] 18.2 Build banner management
    - `BannerTable` + `BannerForm` and `.../cms/banners/...` with validation and schedule error messaging
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 18.3 Build homepage content editor
    - `HomepageBlockEditor` and `.../cms/homepage/...` with content/display-order validation and publish action
    - _Requirements: 6.7, 6.8, 6.9_

- [x] 19. Admin UI: settings and notification templates
  - [x] 19.1 Extend the settings page
    - Update `src/app/(admin)/admin/settings/page.tsx` to render currency/shipping/payment editors, read-only for non-Super_Admins, checkout-unavailable warning, and save confirmation/error messaging
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.9, 7.10_

  - [x] 19.2 Build notification templates page
    - `src/app/(admin)/admin/notifications/page.tsx` listing templates (event/subject/channel/enabled) with edit form, validation messaging, and enable/disable toggle
    - _Requirements: 8.1, 8.2, 8.3, 8.5, 8.6_

- [x] 20. Storefront UI (RePXL design language)
  - [x] 20.1 Build order history and tracking views
    - Extend `src/app/(storefront)/account/orders/page.tsx` (desc list, empty state, load-error handling) and add `.../[orderNumber]/page.tsx` tracking stepper, courier display, CANCELLED handling, and owner-only 403
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

  - [x] 20.2 Build return request form and status badge
    - `ReturnRequestForm` (item multi-select + reason 10–1000, inline validation retaining data) and `ReturnStatusBadge` at `.../[orderNumber]/return/page.tsx`, with window-expired disabled state
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 3.8_

  - [x] 20.3 Build notification bell and center
    - `NotificationBell` (unread count, "99+") and `NotificationCenter` at `.../account/notifications/page.tsx` with mark-read on open and mark-all-read
    - _Requirements: 9.3, 9.4, 9.5, 9.6_

  - [x] 20.4 Build dynamic CMS static page route
    - `src/app/(storefront)/pages/[slug]/page.tsx` serving published pages with corner-bracket framing and `notFound()` for draft pages to non-admins
    - _Requirements: 5.6, 5.7, 5.8_

  - [x] 20.5 Render homepage content blocks and visible banners
    - Read `HomepageContentBlock` rows ordered by `displayOrder` (published only) and filter banners through `isBannerVisible`
    - _Requirements: 6.5, 6.6, 6.9_

- [x] 21. Checkpoint - Ensure UI and integration tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 22. Integration and end-to-end tests
  - [ ]* 22.1 Write integration tests for refund, CMS publish, and email retry
    - Refund success/failure/timeout (mocked PayMongo), published static page + homepage served after publish, email retry-then-record
    - _Requirements: 4.11, 4.12, 5.6, 5.8, 6.9, 8.8, 9.8_

  - [ ]* 22.2 Write E2E test for the return/refund flow
    - Customer submits within window → admin under-review → approve → refund → order REFUNDED + status notification
    - _Requirements: 3.3, 3.7, 4.5, 4.11, 4.13_

  - [ ]* 22.3 Write E2E test for the notification flow
    - Admin changes order status → customer sees in-app notification, unread updates, open marks read, mark-all-read clears badge
    - _Requirements: 9.1, 9.4, 9.5, 9.6_

  - [ ]* 22.4 Write E2E test for the CMS flow
    - Admin creates + publishes a static page reachable at its slug; draft page 404s for anonymous visitors
    - _Requirements: 5.6, 5.7_

- [x] 23. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional (property, unit, integration, and E2E tests) and can be skipped for a faster MVP, though the 39 property tests directly validate the design's correctness properties.
- Each task references specific granular requirement clauses for traceability.
- Work is database-first: schema/migration/seed (Task 1) unblock all downstream layers.
- Pure-logic libraries (Tasks 2–8) are isolated so their properties can be tested without I/O.
- External-service and dispatch wiring (Tasks 10–11) precede API handlers that depend on them.
- Checkpoints (Tasks 9, 15, 21, 23) provide incremental validation points.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3", "2.1", "3.1", "4.1", "5.1", "6.1", "7.1", "8.1", "10.1", "10.3"] },
    { "id": 3, "tasks": ["2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7", "4.8", "4.9", "5.2", "5.3", "5.4", "5.5", "5.6", "6.2", "6.3", "6.4", "7.2", "7.3", "7.4", "7.5", "7.6", "7.7", "7.8", "8.2", "8.3", "8.4", "10.2", "10.4", "11.1"] },
    { "id": 4, "tasks": ["11.2", "12.1", "12.2", "12.3", "12.4", "12.5", "12.6", "12.7", "13.1", "13.2", "14.1", "14.2"] },
    { "id": 5, "tasks": ["16.1", "16.2", "17.1", "17.2", "18.1", "18.2", "18.3", "19.1", "19.2", "20.1", "20.2", "20.3", "20.4", "20.5"] },
    { "id": 6, "tasks": ["16.3", "22.1", "22.2", "22.3", "22.4"] }
  ]
}
```
