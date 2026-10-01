import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// Structural/contract tests (node-env, no DOM renderer) — matches the repo's
// catalog-ui.test.ts convention. Step LOGIC is covered by checkout-steps.test.ts.

const page = readFileSync('src/app/(storefront)/checkout/page.tsx', 'utf8')
const stepper = readFileSync('src/components/checkout/CheckoutStepper.tsx', 'utf8')
const summary = readFileSync('src/components/checkout/CheckoutOrderSummary.tsx', 'utf8')

describe('Checkout — 4-step structure', () => {
  it('renders the stepper and all four step panels', () => {
    expect(page).toContain('<CheckoutStepper')
    expect(page).toContain("step === 'information'")
    expect(page).toContain("step === 'shipping'")
    expect(page).toContain("step === 'payment'")
    expect(page).toContain("step === 'review'")
  })
  it('uses the centralized step machine + per-step validators', () => {
    expect(page).toContain("from '@/lib/checkout-steps'")
    expect(page).toContain('validateInformation')
    expect(page).toContain('validateShipping')
    expect(page).toContain('validatePayment')
    expect(page).toContain('canNavigateTo')
  })
  it('mirrors the step in the URL (?step=) without sensitive data', () => {
    expect(page).toContain('writeStepToUrl')
    expect(page).toContain("params.set('step'")
    expect(page).toContain("parseStep(searchParams.get('step'))")
    // Only the step name is stored — no card/address fields in the query.
    expect(page).not.toContain("params.set('card'")
    expect(page).not.toContain("params.set('email'")
  })
  it('follows browser Back/Forward between steps', () => {
    expect(page).toContain("addEventListener('popstate'")
    expect(page).toContain('history.pushState')
  })
})

describe('Checkout — order/payment creation deferred to Review only', () => {
  it('creates the order/payment ONLY in handleConfirmAndPay (Place Order)', () => {
    expect(page).toContain('const handleConfirmAndPay')
    // The order + PayMongo creator is invoked exactly once, in the confirm handler.
    const callSites = page.match(/processPayment\(\{/g) ?? []
    expect(callSites.length).toBe(1)
    // Place Order button is the only trigger for the confirm handler.
    expect(page).toContain('void handleConfirmAndPay()')
  })
  it('advancing steps never calls processPayment (handleContinue only navigates)', () => {
    expect(page).toContain('const handleContinue')
    // Continue advances via getNextStep/goToStep, not payment.
    expect(page).toMatch(/handleContinue[\s\S]{0,200}getNextStep/)
  })
  it('guards against duplicate submission', () => {
    expect(page).toContain('if (submitting || paymentProcessing) return')
    expect(page).toContain('disabled={submitting || paymentProcessing}')
    expect(page).toContain('Placing your order…')
  })
  it('preserves the PayMongo redirect + auth modal + success redirect', () => {
    expect(page).toContain('nextActionUrl')
    expect(page).toContain('{authModal}')
    expect(page).toContain('/checkout/success?order=')
  })
})

describe('Checkout — Review step edit links', () => {
  it('review shows editable sections returning to the right step', () => {
    expect(page).toContain("editLink('information'")
    expect(page).toContain("editLink('shipping'")
    expect(page).toContain("editLink('payment'")
    expect(page).toContain('Place Order')
  })
})

describe('Checkout — order summary (desktop sticky + mobile collapsible)', () => {
  it('uses the sticky desktop summary and the mobile collapsible summary', () => {
    expect(page).toContain('<CheckoutOrderSummary')
    expect(page).toContain('<MobileOrderSummary')
    expect(page).toContain('lg:col-span-1 lg:block')
  })
  it('MobileOrderSummary is a collapsible disclosure', () => {
    expect(summary).toContain('aria-expanded')
    expect(summary).toContain('aria-controls')
    expect(summary).toContain('MobileOrderSummary')
  })
  it('desktop summary is sticky', () => {
    expect(summary).toContain('sticky top-24')
  })
})

describe('CheckoutStepper — a11y + state (not color alone)', () => {
  it('marks the current step and communicates state beyond color', () => {
    expect(stepper).toContain("aria-current={isCurrent ? 'step' : undefined}")
    expect(stepper).toContain('completed')
    expect(stepper).toContain('current')
    expect(stepper).toContain('upcoming')
    // check icon for completed + number for upcoming (not color-only)
    expect(stepper).toContain('isCompleted ?')
  })
  it('gates forward navigation via canNavigate', () => {
    expect(stepper).toContain('canNavigate')
    expect(stepper).toContain('aria-disabled')
  })
  it('uses short labels on mobile to avoid overflow', () => {
    expect(stepper).toContain('sm:hidden')
    expect(stepper).toContain('shortLabel')
  })
})
