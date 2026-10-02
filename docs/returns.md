# Customer returns, cancellation, and refunds

Updated 2026-10-02. Website and maintained React Native app share customer APIs,
return records, admin review, notifications, and PayMongo refunds. The website
now implements request, approval, shipment, receipt, inspection, and refund stages.

## Customer flow

1. Open **Returns & Refunds** from Order Details at
   `/account/orders/[orderNumber]/return`.
2. Select purchased items, choose a reason, attach evidence, and review the
   estimated item refund. Selected lines use purchased quantities; choosing a
   smaller quantity within one line is not exposed.
3. Wait for approval and the actual return address or pickup instructions,
   packaging requirements, and return-shipping terms supplied by the administrator.
4. Follow those instructions and enter return carrier/tracking information.
5. Track actual submission, approval, shipment (when tracking is recorded),
   receipt, inspection, refund processing, and completion milestones. Active
   cases refresh every 15 seconds; manual refresh is available.
6. Completion appears only after PayMongo reports `succeeded`, or an administrator
   records a reference for an already-completed COD repayment. Provider/bank
   posting times vary. Failed or uncertain attempts remain visible.

The existing **30-day** window is measured from `deliveredAt` for DELIVERED orders
or `completedAt` for COMPLETED orders. Missing/future dates, other order states,
and fully refunded orders are ineligible. Non-REJECTED cases block new submissions,
including after partial refund. Rejected cases can be retried within the window.
There is currently one accepted return case per order.

Six reasons are shared across clients. Damage, wrong item, not as described,
missing parts, and physical defect require a photo; other reasons do not.
Optional trimmed details must be 10–1000 characters if supplied. Up to five
JPG/PNG/WebP photos use protected Cloudinary assets via `/api/upload/return-image`,
with server-enforced 5 MB and file-content checks. Unfinished uploads block
submission; failures preserve form entries.

### API and native app

- `POST /api/returns`: ownership, date, item, details, and evidence validation;
  persists selected `ReturnRequestItem` quantities. Legacy omitted selections
  represent all purchased items.
- `GET /api/returns/[orderNumber]`: latest case, lifecycle fields, rejection reason,
  refund state/reference/amount, and quote. Internal attempt keys are omitted.
- `PATCH /api/returns/[orderNumber]`: customer-owned approved shipment tracking;
  denied after receipt/refund start, with guarded updates against stale data.
- Native `react-native/app/return-request.tsx` now matches the guided customer flow:
  item selection, reasons/photos, and a review step with discounted item refund
  estimate, approval instructions, carrier/tracking entry or correction before
  receipt, actual milestones, refund state/amount, and explicit rejected-case retry.
  It polls active cases while focused/foreground, supports manual refresh and native
  support navigation, and preserves inputs on shipment/submission failures.
  `react-native/src/utils/return-workflow.ts` mirrors client-safe web monetary and
  timeline rules; property tests check parity across prices, discounts, and quantities.
- `POST /api/orders/[orderNumber]/cancel`: cancels eligible PROCESSING orders
  before pickup/shipping, preserving paid-order stock restoration. Paid cancellation
  still does **not** automatically refund.

## Admin review and refund

At `/admin/returns/[id]`, review evidence, start review, approve with instructions,
edit instructions before receipt, or decline with a reason before inspection/refund
starts. Receipt must precede inspection. Inspection requires notes; optionally
restock selected quantities once only when fit for resale. Damaged items do not
automatically return to inventory.

`PATCH /api/admin/returns/[id]` accepts `review`, `approve`, `instructions`,
`reject`, `receive`, and `inspect`. Guarded transactions combine case changes,
optional stock updates, and audit entries. Existing five status enums remain;
timestamps distinguish intermediate approved stages. Notifications include
order number and current stage.

`POST /api/admin/returns/[id]/refund` delegates to the main route POST handler:

- Requires APPROVED status, received/inspected items, and a PAID order.
- Calculates selected item value after proportional discounts in centavos.
  Original outbound shipping is a separate administrator choice for whole-order
  returns only. Refunds never exceed the paid order total.
- Partial refunds leave order `paymentStatus` PAID; the case stores its exact
  amount and completion. Whole-total refunds mark the order REFUNDED.
- PayMongo requires a captured `pay_` payment reference; payment-intent IDs are
  refused. Pending/processing responses do not mark cases or orders refunded.
- COD: repay outside the app first, then record the actual transaction/receipt
  reference. Recording that reference does not transfer money.
- Reserves amount/key before PayMongo, sends `Idempotency-Key`, and reuses the
  same key/amount after uncertain responses. Unknown outcomes block new amounts/
  keys. After 23 hours, retries stop for manual reconciliation, before PayMongo's
  24-hour idempotency retention expires. Confirmed failures permit a new attempt.
- Existing refund IDs are retrieved instead of recreated. `checkOnly` refreshes
  provider state; admin auto-checks known pending IDs every 15 seconds.
- Signed `refund.succeeded`, `payment.refunded`, and `payment.refund.updated`
  webhooks retrieve authoritative state and reconcile matched cases. Completion
  notifications, audits, and order updates are guarded against duplication.

References: [Shopify return management](https://help.shopify.com/en/manual/fulfillment/managing-orders/returns/self-serve-returns/management),
[PayMongo refund resource](https://docs.paymongo.com/reference/refund-resource),
[PayMongo idempotency](https://docs.paymongo.com/reference/idempotent-requests).

## Database and release prerequisites

Migration `prisma/migrations/20261002000000_return_workflow/migration.sql` adds
nullable instructions, shipment/receipt/inspection/restock dates, inspection notes,
refund amount/provider state/attempt key, and refund start/completion dates to
`return_requests`. No enum values change. Prepared and Prisma client regenerated;
**not applied to any database**.

Before use, apply `npx prisma migrate deploy` to the intended database, deploy
API/UI together, and configure refund events on the signed PayMongo webhook.
Existing approved cases require actual receipt/inspection records before refunding.
Completed cases remain readable. Rebuild native apps for the previously added
`expo-image-picker` dependency.

## Verification

Current web-flow verification on 2026-10-02:

- Root and native `npx tsc --noEmit`: passed.
- `npx prisma validate`: passed; Prisma client generation passed.
- **198 tests passed across 12 files**: quote/lifecycle, shared submission/window/
  ownership/evidence/status, shipment stage/concurrency guards, approval/receipt/
  inspection/restock/refund/COD/retry, signed refund webhooks, PayMongo headers,
  mobile policy/transport, cancellation, payment-expiry/stock, and notifications.
  Database/provider calls are mocked. This is a targeted run, not the full suite.
- Root `npm run build`: passed, 70/70 static pages generated.
- Browser rendering, device UI, live uploads, real refunds, production webhook
  delivery, and migration application were not exercised.

Earlier mobile task: Android/iOS Expo exports passed (1,542/1,416 modules), plus
152 tests before this expanded workflow. All-platform export failed on existing
missing `react-native-web`. Historical exports were not rerun for the small
native copy/status changes in that web task. Current native exports are recorded below.

### Mobile workflow extension (2026-10-02)

- Root/native `npx tsc --noEmit`: passed.
- **214 tests across 13 files passed** in the expanded targeted run, including
  mobile/web monetary/stage/timeline parity, shipment validation and eligibility,
  bearer-authenticated PATCH transport and server-error preservation, plus the
  existing shared backend/refund/cancellation tests. Database/provider calls are mocked.
- Android production export passed (1,543 modules): from `react-native`,
  `npx expo export --platform android --output-dir .expo/return-workflow-android`.
- iOS production export passed (1,417 modules): from `react-native`,
  `npx expo export --platform ios --output-dir .expo/return-workflow-ios`.
- Web production build was not repeated for this native-only change; the prior
  70/70-page web build above remains dated evidence. Root type checking passed.
- Physical-device UI/keyboard/picker permissions, live uploads/refunds, migration
  application, and provider webhook delivery were not tested. No APK/IPA/EAS build
  or deployment was performed. The prepared shared migration still needs release.

## Remaining limitations and release checks

- No deployment, APK/IPA/EAS build, commit, or push performed.
- Real transaction contention and provider behavior need test-mode E2E checks.
  Submission-level concurrent duplicate creation is not redesigned.
- Unknown provider refunds without a returned ID require manual reconciliation
  if same-key retries cannot recover them; no automatic dashboard search exists.
- Paid cancellation refunds, exchanges, labels/pickup integrations, multiple
  accepted cases per order, and per-line partial quantity UI remain deferred.
- Public policy/FAQ copy sometimes says 14 days; enforced 30-day eligibility is
  retained pending a business decision.
- Abandoned forms can leave unattached evidence uploads, as before.

Before release, test real instructions/tracking, receipt/inspection, fit/unfit
restocking, item/whole-total refunds, provider pending/failure/lost-response/retry/
webhook, COD repayment, rejection/retry, mobile updates, and notification navigation.
