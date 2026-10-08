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
