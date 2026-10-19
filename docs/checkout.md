# Phase 4 commerce UX note (2026-10-08)

The existing Information → Shipping → Payment → Review state machine remains the
source of truth. Checkout now adds a compact assurance row for condition grading,
secure payment processing, and the documented 14-day return window. This is
presentational only; payment, order, inventory, and validation logic are unchanged.

# RePXL — Checkout (Multi-Step Flow)

The customer checkout at `/checkout` is a guided four-step flow:

**Information → Shipping → Payment → Review**

with a progress stepper, per-step validation, a sticky desktop order summary /
collapsible mobile summary, and a final review before the order is placed. This
is a **UX restructuring only** — the underlying order creation, PayMongo
integration, server-side revalidation, and dedup/idempotency are unchanged.

---

## 1. Architecture

- `src/app/(storefront)/checkout/page.tsx` — the checkout page. Still ONE client
  component (`CheckoutFlow`), so all entered field state (`useState`) is
  preserved across steps automatically. The default export wraps it in
  `<Suspense>` because it reads `useSearchParams` for `?step=`.
- `src/lib/checkout-steps.ts` — pure, framework-free step machine: step order,
  `parseStep`, `next/prevStep`, per-step validators, completion + navigation
  gating. No business logic; unit-tested without a DOM.
- `src/components/checkout/CheckoutStepper.tsx` — the progress indicator.
- `src/components/checkout/CheckoutOrderSummary.tsx` — `CheckoutOrderSummary`
  (sticky desktop panel) and `MobileOrderSummary` (collapsible disclosure).
- `src/components/checkout/PaymentProcessor.tsx` — unchanged; the embedded
  PayMongo PIPM helper + 3DS/e-wallet auth modal.

The steps are rendered in a single `<form>`; only the active step's panel is
visible (others are `hidden`), so field state never unmounts and nothing resets
when navigating between steps.

---

## 2. The four steps

1. **Information** — contact + delivery address. Reuses the existing saved-address
   picker (`applyAddress`), the PSGC cascading `PHAddressSelect`, email/phone, and
   "enter a new address". A saved address prefills all fields.
2. **Shipping** — the delivery method (the four existing couriers: J&T ₱6, LBC ₱8,
   Ninja Van ₱5, Grab ₱12, with their estimate strings). No new methods/fees were
   invented; the selection flows to the server as `shippingCost` +
   `courierName`/`courierEstimate` exactly as before.
3. **Payment** — the existing payment methods (Credit/Debit Card, GCash, PayPal →
   card via PayMongo, Cash on Delivery), saved-card picker, and card fields. A
   short note accurately explains the PayMongo flow (a secure window opens only
   when 3-D Secure / GCash authorization is required — the customer stays on
   RePXL). The Terms of Service / Privacy agreement is the final gate here.
4. **Review** — a read-only summary of Contact, Delivery Address, Shipping,
   Payment, and the order items + totals, each with an **Edit** link that returns
   to the corresponding step (without clearing any entered data). The
   **Place Order** button is here.

---

## 3. State & transitions

- Active step lives in `step` state and is mirrored to the URL as `?step=`
  (`information` omits the param) via `history.pushState`, so browser
  **Back/Forward** move between steps (a `popstate` listener syncs `step`).
- **No sensitive data in the URL** — only the step name. Card/address/email are
  never placed in the query string.
- All field state persists across steps because it lives in the one component;
  pressing Back keeps everything the customer entered.
- Changing the delivery address or courier updates the totals immediately (the
  summary is display-only; see §5).

Transition rules (`src/lib/checkout-steps.ts`):

- **Forward** (Continue / stepper click to a later step) runs that step's
  validator and is blocked on error, with the error summarized and the first
  invalid field focused.
- **Backward / same** navigation is always allowed and skips validation.
- The stepper only lets you jump forward to a step whose prerequisites are all
  complete (`canNavigateTo` / `computeCompletion`) — you can't skip an unmet step.

---

## 4. Validation

Per-step validators mirror the existing rules exactly:

- **Information** (`validateInformation`): email always required; for a new
  address — full name, street, region (province only when the region has
  provinces; NCR skips it), city, barangay, postal code (4–6 digits), and PH
  mobile (`09XXXXXXXXX`). A saved address is already complete.
- **Shipping** (`validateShipping`): a known courier must be selected.
- **Payment** (`validatePayment`): for a new card — 16-digit number, non-expired
  MM/YY, 3–4 digit CVC; Terms agreement required.

Before placing the order, `handleConfirmAndPay` runs the full `validate()` once
more as a guard and, if anything is invalid, routes back to the first offending
step.

---

## 5. Order creation, PayMongo & dedup (UNCHANGED)

- The order + PayMongo intent/payment method are created in **exactly one place**:
  `handleConfirmAndPay` → `processPayment()` → `POST /api/checkout/process-payment`.
  This is reachable **only** from the Review step's **Place Order** button.
  Navigating Information → Shipping → Payment → Review → Back → Review creates
  **no** orders or PayMongo sessions — advancing steps only navigates.
- The server remains the source of truth: it re-reads the cart from the DB by
  slug, recomputes subtotal/discount/total from DB prices (client prices are
  never trusted), re-checks stock, and validates the voucher. The client summary
  total is display-only.
- **Dedup/idempotency** is untouched: `finalizePaidOrder`'s atomic
  `updateMany({ where: { paymentStatus: 'PENDING', status: 'PROCESSING' } })`
  claim and `deductInventory`'s conditional stock decrement still guarantee an
  order finalizes exactly once across webhook / verify / direct paths.
- **Duplicate submission** is prevented: Place Order is disabled while
  `submitting || paymentProcessing`, and `handleConfirmAndPay` early-returns if
  already in flight. The button shows a "Placing your order…" spinner.
- 3-D Secure / GCash `AWAITING_NEXT_ACTION` still redirects via
  `window.location.href = nextActionUrl` (and the `authModal` portal is
  preserved). Success still routes to `/checkout/success`, which verifies and
  polls the order — unchanged.

---

## 6. Desktop vs mobile

- **Desktop (lg+):** two columns — the current step on the left, a **sticky**
  `CheckoutOrderSummary` on the right.
- **Mobile:** a single column. The order summary becomes a **collapsible**
  `MobileOrderSummary` ("Order Summary · ₱N ▾") near the top, so it doesn't
  permanently occupy the screen. The stepper uses short labels (Info/Ship/Pay/
  Review) and does not overflow. Continue/Place-Order buttons are full-width.

---

## 7. Accessibility

- Stepper: `aria-current="step"` on the active node; state is conveyed by a ✓
  (completed), a filled dot/number, and a per-node status word in the accessible
  label — not by color alone. Reachable steps are real buttons; unreachable
  future steps are `aria-disabled`.
- Form fields keep their existing `<label>`s; errors use `role="alert"` and are
  associated with fields; the per-step error summary is `aria-live`.
- Focus moves to the step content on step change; the Place Order button
  announces its processing state (`aria-live`).
- The mobile summary disclosure uses `aria-expanded`/`aria-controls`.

---

## 8. Error handling

- **Information/Shipping/Payment:** field-level validation blocks forward
  navigation with clear messages.
- **Payment/Review:** the real server errors surface — insufficient stock (409),
  voucher/price/total recomputation, and PayMongo initialization/decline messages
  are shown in the Review step's error panel (`role="alert"`), advising the
  customer to check order history before retrying if they may have been charged.
- Cash on Delivery still creates a PROCESSING order pending admin approval, as
  before.

---

## 9. Tests & verification

- `src/lib/checkout-steps.test.ts` — step order, `parseStep`, per-step validation
  (email, PH phone, NCR province skip, saved-address skip, courier required, card
  fields for new card only, terms required), completion, and forward/backward
  navigation gating (no skipping unmet steps).
- `src/components/checkout/checkout-flow.test.ts` — structural: stepper + all four
  step panels; centralized step machine; `?step=` URL sync (no sensitive data) +
  popstate; **order/payment created only in `handleConfirmAndPay`** (single
  `processPayment` call site) and never on Continue; duplicate-submission guard;
  PayMongo redirect + authModal + success redirect preserved; Review edit links;
  sticky desktop + collapsible mobile summary; stepper a11y.
- `src/lib/back-navigation.test.ts` — updated to assert the new multi-step back
  navigation (`handleBack`, per-step "Back to …", `popstate`) and the preserved
  "Back to Cart" link.

Results after this change:
- `npx tsc --noEmit` — clean.
- New checkout tests pass (32); `back-navigation.test.ts` passes (90).
- Full `npx vitest run` — **1122 passed / 47 skipped / 9 failed**. The 9 failures
  are the pre-existing mobile AI concierge tests
  (`src/lib/mobile-features.test.ts`, `src/lib/mobile-all-modules.test.ts`) — a
  documented known limitation unrelated to checkout; those files were not touched.
- `npm run build` — succeeds (exit 0); `/checkout` builds as a static client
  shell (~17.6 kB).

**Database-dependent limitation:** `src/lib/purchase-finalization.test.ts` (the
order-creation/dedup concurrency suite) **skipped** because its isolated Postgres
(`TEST_DATABASE_URL`) is unavailable locally (Supabase connectivity down). That
logic was **not modified** by this task. A live browser click-through of the full
payment flow was **not performed**; the multi-step UI was verified via unit +
structural tests, type-check, and a production build only. No database
config/schema/migrations were changed.

---

## 10. Card Payment Testing & Hardening (2026-10-19)

### Fixes applied to card checkout & PayMongo PIPM flow
- **Saved-address `city`/`province`/`barangay` hydration (`src/app/(storefront)/checkout/page.tsx`):**
  `defaultAddress` prefill and `applyAddress` now always populate `phAddr.city`, `phAddr.province`, and `phAddr.barangay` even when `regionCode` is empty (e.g., addresses created on mobile or seeded without PSGC codes), and `handleConfirmAndPay` falls back to the selected saved address record so `POST /api/checkout/process-payment` never fails with a missing `city` validation error on the Review step.
- **Payment method creation before DB order creation (`src/app/api/checkout/process-payment/route.ts`):**
  `createPaymentMethod` now runs *before* `prisma.order.create`, preventing invalid card numbers/expiry/CVC from leaving orphan `PROCESSING` / `PENDING` orders in the database. Raw PayMongo `details.card_number`, `details.exp_month`/`details.exp_year`, and `details.cvc` error strings are translated into customer-safe messages.
- **Declined card attach handling (`src/app/api/checkout/process-payment/route.ts`):**
  When `attachPaymentMethod` returns `status === 'awaiting_payment_method'` (PayMongo's status when a card attach is declined) or `'failed'`, or throws, the order is marked `paymentStatus: 'FAILED'` and `status: 'CANCELLED'` and a 400 error with the decline reason is returned instead of redirecting to `/checkout/success`.
- **Captured `pay_...` payment reference (`src/app/api/checkout/process-payment/route.ts`, `src/app/api/checkout/verify/route.ts`, `src/app/api/orders/[orderNumber]/route.ts`, `src/app/api/webhooks/paymongo/route.ts`, `src/lib/paymongo.ts`):**
  Direct non-3DS card payments and post-3DS/webhook verification now replace the placeholder `orderNumber` reference with the actual PayMongo `pay_...` payment ID for downstream refund compatibility, and `checkPaymongoPaymentStatus` skips calling `/v1/checkout_sessions` when `paymentSessionId` is a `pi_` Payment Intent ID.
- **Card input UX (`src/components/ui/CardExpiryInput.tsx`, `src/components/ui/CardNumberInput.tsx`):**
  Fixed Backspace across `/` in `CardExpiryInput` (pressing Backspace on `"MM/"` now removes the second month digit instead of re-appending `'/'`) and allowed typing over selected text when inputs are at max length.

### Official PayMongo Test Cards (`sk_test_` mode)
PayMongo rejects non-PayMongo test numbers (such as `1234 5678 9012 3456`, `4343 4343 4343 4343`, or Stripe's `4242 4242 4242 4242`). Use any future `MM/YY` (e.g., `12/28`) and any 3-digit CVC (`123`):
- **Non-3DS Card (Immediate Paid):** `4343 4343 4343 4345`
- **3D Secure (3DS) Visa:** `4111 1111 1111 1111` or `4408 0400 0000 0041`
- **3D Secure (3DS) Mastercard:** `5555 5555 5555 4444`

### Live PayMongo API Verification (2026-10-19)
Executed gateway-level tests against `src/lib/paymongo.ts` using `node --env-file=.env` (website order/browser verification is recorded separately in section 11):
- **Non-3DS Visa (`4343 4343 4343 4345`, `12/29`, CVC `123`):** `createPaymentIntent` → `createPaymentMethod` → `attachPaymentMethod` returned `status: "succeeded"` with a captured `pay_...` payment ID; `checkPaymongoPaymentStatus({ paymentSessionId: pi.id })` and `checkPaymongoPaymentStatus({ paymentIntentId: pi.id })` both returned `{"isPaid":true,"status":"succeeded","paymentId":"pay_..."}` without hitting `/checkout_sessions/pi_...`.
- **3DS Visa (`4111 1111 1111 1111`, `12/29`, CVC `123`):** `attachPaymentMethod` returned `status: "awaiting_next_action"` with a valid 3DS `next_action.redirect.url`, and `checkPaymongoPaymentStatus({ paymentSessionId: pi.id })` returned `{"isPaid":false,"status":"awaiting_next_action"}`.
- **Invalid / Non-PayMongo / Expired Cards (`1234 5678 9012 3456`, `4000 0000 0000 0002`, and `4343 4343 4343 4345` with `01/24`):** Rejected at `createPaymentMethod` before any database order is created, returning `details.card_number format is invalid.`, `Please use PayMongo test cards only...`, and `details.exp_year must be at least this year...` (which `POST /api/checkout/process-payment` translates into customer-safe messages).
- **Post-capture `finalizePaidOrder` transaction timeout (`P2028`) & resilience (`src/lib/purchase-finalization.ts`, `src/app/api/checkout/process-payment/route.ts`):** Added `{ maxWait: 10_000, timeout: 30_000 }` to interactive `prisma.$transaction` calls in `finalizePaidOrder` and the COD order creation flow so multi-item carts over the remote Supabase connection pooler do not hit Prisma's 5-second default timeout (`P2028`), wrapped post-capture `finalizePaidOrder` in `POST /api/checkout/process-payment` in `try/catch` (re-throwing only `InsufficientStockError`) so transient DB timeouts after `attachedStatus === 'succeeded'` still return `200 PAID` and let `/checkout/success` (`POST /api/checkout/verify` / `GET /api/orders/[orderNumber]`) reconcile the order, and normalized `siteUrl()` to always include `http://` or `https://`.
- **Build, TypeScript & Test Verification:** Restored `package.json` and `package-lock.json` to `tailwindcss@3.4.13`, `next@15.5.25`, and `eslint-config-next@15.5.25` (reverting the accidental Tailwind v4 upgrade in `9bd798c` that broke PostCSS on Vercel) and added an ambient declaration in `src/types/expo-secure-store.d.ts` so root TypeScript checks succeed when `react-native/node_modules` is absent on Vercel CI. Verified with `npx tsc --noEmit` (clean, exit 0), `npx vitest run src/lib/paymongo-process-payment.test.ts src/lib/paymongo-verify.test.ts src/lib/checkout-steps.test.ts src/components/checkout/checkout-flow.test.ts` (**50/50 passed** across 4 test files), and `npm run build` (exit 0, 68/68 static pages).

---

## 11. Card payment simulation audit (2026-10-19)

### Repeatable real sandbox check

Run `npm run test:paymongo` from the repository root after installing dependencies
using Node 24 (the version used in this audit; the command uses `--env-file`).
It loads `.env` and runs `scripts/test-paymongo-cards.ts` using the existing
application client in `src/lib/paymongo.ts`. A missing or non-`sk_test_` secret
stops execution before any network call. The live-key refusal was also exercised
with a dummy live-prefixed value and passed.

This runner makes real calls to PayMongo's test API with a PHP 100.00 intent
and a future expiry, and logs no credentials, client keys, CVCs or full card
numbers. It creates sandbox gateway records, but does not create website orders
or write to the application database. **9/9 scenarios passed:**

| Scenario | Test card/input | Observed result |
|---|---|---|
| Immediate Visa capture | `4343 4343 4343 4345` | `succeeded`, `pay_` reference; both intent-ID and session-ID verification return paid |
| Mastercard 3DS handoff | `5555 5555 5555 4444` | HTTPS authentication URL; unpaid before authorization |
| Visa 3DS handoff | `4120 0000 0000 0007` | HTTPS authentication URL; unpaid before authorization |
| Expired-card decline | `4200 0000 0000 0018` | Attach rejected; intent remains unpaid / `awaiting_payment_method` |
| CVC decline | `4300 0000 0000 0017` | Attach rejected; intent remains unpaid / `awaiting_payment_method` |
| Insufficient funds | `5100 0000 0000 0198` | Attach rejected; intent remains unpaid / `awaiting_payment_method` |
| Invalid card number | `1234 5678 9012 3456` | Rejected during payment-method creation |
| Expired input | Immediate-capture Visa with expiry year 2020 | Rejected during payment-method creation |
| Short CVC | Immediate-capture Visa with two-digit CVC | Rejected during payment-method creation |

The actual gateway can reject a declined attach as an HTTP error; it need not
return a successful attach response with `awaiting_payment_method`. The runner
accepts the expected decline reason and then independently verifies the intent
is unpaid. Unexpected errors still fail the scenario.

The [current PayMongo testing guide](https://docs.paymongo.com/docs/payment-acceptance-testing)
was checked for the test cases. Its listed immediate Mastercard number
`5123 0000 0000 0002` was rejected by the current API as an invalid card number.
It is not treated as a successful Mastercard test. The accepted Mastercard
above was verified to require 3DS. The older Visa `4111 1111 1111 1111` was
accepted for payment-method creation, but this audit uses `4120…0007` for 3DS.

### Website and database checks

Browser checks use a temporary customer with a saved Manila address lacking
PSGC codes, a private INACTIVE PHP 100.00 product and a one-item cart. The
browser's catalog response alone includes that private product, so it does not
appear in the public active catalog. Authentication, checkout requests, payment
requests, orders, verification and database finalization are real. Test orders
total PHP 106.00 including J&T shipping.

- Immediate Visa: the four checkout steps reach **Payment Successful**; the DB
  order is PAID with a `pay_` reference, stock decreases by one and the cart is
  cleared. Two repeat verification calls leave stock and notification count
  unchanged.
- Expired-card, CVC and insufficient-funds declines: the Review step displays the
  specific safe message, the order is FAILED/CANCELLED, stock is unchanged and
  the cart is retained. The alert contains no raw provider paths or stack traces.
- Further browser outcomes are recorded after the current run completes.

The browser driver must wait for cart/catalog hydration before advancing steps.
An initial attempt that submitted before data was ready received the safe
"Select at least one item" validation message; it did not exercise a gateway
decline and is not counted as a successful payment scenario.

### Build and regression verification

- Focused Vitest run: **99 passed across 7 files** — PayMongo process-payment,
  status verification, refunds, checkout steps/structure, order payment guards
  and payment expiry.
- `npx tsc --noEmit`: **passed** on the final workspace dependency/type state.
- The new sandbox runner also passes a separate strict TypeScript check (it is
  outside the root tsconfig's `src`/`prisma` includes).
- `npm run build`: **passed**, including **68/68 static pages**. An earlier
  attempt was blocked by missing `expo-secure-store` types; the workspace now
  includes the ambient declaration described in section 10.
- Full Vitest suite and isolated `TEST_DATABASE_URL` concurrency suite were
  not run for this audit. Existing focused tests use mocks; the separate sandbox
  and browser checks above supply the real-provider evidence.

Remaining limits: PayMongo webhook delivery was not exercised (no local webhook
secret configured), and production/live-key payments, Gmail inbox rendering,
mobile checkout and real-bank OTP delivery were not tested. Test-mode records
remain in the PayMongo dashboard. Application test fixtures are removed after
each browser run; existing customers, products and inventory are untouched.
