/**
 * Checkout step machine — pure, framework-free helpers for the multi-step
 * checkout (Information → Shipping → Payment → Review).
 *
 * This module owns ONLY step ordering, per-step field validation, and
 * can-advance/skip gating. It contains NO business logic: order creation,
 * PayMongo, inventory, dedup, and totals all remain in the existing server
 * routes and `handleConfirmAndPay`. Keeping this pure means the step gating is
 * unit-testable without a DOM.
 */

export type CheckoutStep = 'information' | 'shipping' | 'payment' | 'review'

/** Canonical order of the steps. */
export const CHECKOUT_STEPS: CheckoutStep[] = ['information', 'shipping', 'payment', 'review']

export const STEP_META: Record<CheckoutStep, { index: number; label: string; shortLabel: string }> = {
  information: { index: 0, label: 'Information', shortLabel: 'Info' },
  shipping: { index: 1, label: 'Shipping', shortLabel: 'Ship' },
  payment: { index: 2, label: 'Payment', shortLabel: 'Pay' },
  review: { index: 3, label: 'Review', shortLabel: 'Review' },
}

export function stepIndex(step: CheckoutStep): number {
  return STEP_META[step].index
}

/** Parse a raw `?step=` value into a valid step (defaults to information). */
export function parseStep(raw: string | null | undefined): CheckoutStep {
  const s = (raw ?? '').toLowerCase()
  return (CHECKOUT_STEPS as string[]).includes(s) ? (s as CheckoutStep) : 'information'
}

export function nextStep(step: CheckoutStep): CheckoutStep | null {
  const i = stepIndex(step)
  return i < CHECKOUT_STEPS.length - 1 ? CHECKOUT_STEPS[i + 1] : null
}

export function prevStep(step: CheckoutStep): CheckoutStep | null {
  const i = stepIndex(step)
  return i > 0 ? CHECKOUT_STEPS[i - 1] : null
}

// ─── Field validation inputs (mirror the existing page state) ────────────────

export interface PHAddressLike {
  regionCode: string
  provinceCode: string
  cityCode: string
  barangay: string
}

export interface InformationInput {
  email: string
  /** null = entering a new address; a saved address is otherwise fully populated. */
  selectedAddressId: string | null
  fullName: string
  streetAddress: string
  postalCode: string
  phone: string
  phAddr: PHAddressLike
}

export interface PaymentInput {
  /** null = entering a new payment method. */
  selectedCardId: string | null
  paymentMethod: 'card' | 'gcash' | 'paypal' | 'cod'
  cardNumber: string
  cardExpiry: string
  cardCvc: string
  agreeTerms: boolean
}

// These validators reuse the SAME rules the page already enforces; they're
// factored here so gating and tests share one implementation. Field-error keys
// match the page's existing `FormErrors` shape.
export type StepErrors = Record<string, string>

export function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}
export function isValidPostalCode(v: string): boolean {
  return /^\d{4,6}$/.test(v.replace(/\s/g, ''))
}
export function isValidPHPhone(v: string): boolean {
  // 09XXXXXXXXX (11 digits) — matches validatePHPhone's contract.
  return /^09\d{9}$/.test(v.replace(/\D/g, ''))
}
export function isValidCardNumber(v: string): boolean {
  return /^\d{16}$/.test(v.replace(/\s/g, ''))
}
export function isValidExpiry(v: string): boolean {
  const m = v.replace(/\s/g, '').match(/^(\d{2})\/(\d{2})$/)
  if (!m) return false
  const month = parseInt(m[1], 10)
  const year = parseInt(m[2], 10) + 2000
  if (month < 1 || month > 12) return false
  return new Date(year, month) > new Date()
}
export function isValidCvc(v: string): boolean {
  return /^\d{3,4}$/.test(v.trim())
}
function nonEmpty(v: string): boolean {
  return v.trim().length > 0
}

/**
 * Step 1 (Information): email always required; when entering a NEW address,
 * validate the full delivery address. A saved address is already complete.
 */
export function validateInformation(input: InformationInput): StepErrors {
  const errs: StepErrors = {}
  if (!isValidEmail(input.email)) errs.email = 'Enter a valid email address.'

  if (input.selectedAddressId === null) {
    if (!nonEmpty(input.fullName)) errs.fullName = 'Full name is required.'
    if (!nonEmpty(input.streetAddress)) errs.address = 'Street address is required.'
    if (!nonEmpty(input.phAddr.regionCode)) {
      errs.region = 'Please select a Region.'
    } else {
      // Province required only when the region has provinces (NCR: provinceCode = regionCode).
      if (input.phAddr.provinceCode !== input.phAddr.regionCode && !nonEmpty(input.phAddr.provinceCode)) {
        errs.province = 'Please select a Province / District.'
      }
      if (!nonEmpty(input.phAddr.cityCode)) errs.city = 'Please select a City / Municipality.'
      if (!nonEmpty(input.phAddr.barangay)) errs.barangay = 'Please select a Barangay.'
    }
    if (!isValidPostalCode(input.postalCode)) errs.postalCode = 'Enter a valid postal code (4–6 digits).'
    if (!isValidPHPhone(input.phone)) errs.phone = 'Enter a valid PH mobile number (09XXXXXXXXX).'
  }
  return errs
}

/**
 * Step 2 (Shipping): a delivery method must be selected. `courierId` is one of
 * the known couriers, or empty/unknown → error.
 */
export function validateShipping(courierId: string, knownCourierIds: readonly string[]): StepErrors {
  const errs: StepErrors = {}
  if (!courierId || !knownCourierIds.includes(courierId)) {
    errs.courier = 'Please select a delivery method.'
  }
  return errs
}

/**
 * Step 3 (Payment): when entering a NEW card, validate card fields. Terms must
 * be agreed before leaving Payment for Review (the final gate before placing
 * the order).
 */
export function validatePayment(input: PaymentInput): StepErrors {
  const errs: StepErrors = {}
  if (input.selectedCardId === null && input.paymentMethod === 'card') {
    if (!isValidCardNumber(input.cardNumber)) errs.cardNumber = 'Enter a valid 16-digit card number.'
    if (!isValidExpiry(input.cardExpiry)) errs.cardExpiry = 'Enter a valid, non-expired date (MM/YY).'
    if (!isValidCvc(input.cardCvc)) errs.cardCvc = 'Enter a valid 3 or 4-digit CVC.'
  }
  if (!input.agreeTerms) errs.agreeTerms = 'You must agree to the Terms of Service and Privacy Policy.'
  return errs
}

/**
 * Which steps are currently "complete" (their prerequisites are met). Used to
 * decide which stepper nodes are clickable and to prevent skipping ahead into a
 * step whose prerequisites are unmet.
 */
export interface StepCompletion {
  information: boolean
  shipping: boolean
  payment: boolean
}

export function computeCompletion(
  info: InformationInput,
  courierId: string,
  knownCourierIds: readonly string[],
  payment: PaymentInput
): StepCompletion {
  const information = Object.keys(validateInformation(info)).length === 0
  const shipping = information && Object.keys(validateShipping(courierId, knownCourierIds)).length === 0
  const payment2 = shipping && Object.keys(validatePayment(payment)).length === 0
  return { information, shipping, payment: payment2 }
}

/**
 * Can the user navigate DIRECTLY to `target` from the stepper? Going backward is
 * always allowed; going to the current step is a no-op-allowed; going forward is
 * only allowed when every earlier step is complete (no skipping unmet steps).
 */
export function canNavigateTo(target: CheckoutStep, current: CheckoutStep, completion: StepCompletion): boolean {
  const ti = stepIndex(target)
  const ci = stepIndex(current)
  if (ti <= ci) return true // backward or same — always safe
  // Forward: every step strictly before the target must be complete.
  if (ti >= 1 && !completion.information) return false
  if (ti >= 2 && !completion.shipping) return false
  if (ti >= 3 && !completion.payment) return false
  return true
}
