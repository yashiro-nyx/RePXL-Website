import { describe, it, expect } from 'vitest'
import {
  CHECKOUT_STEPS,
  parseStep,
  nextStep,
  prevStep,
  stepIndex,
  validateInformation,
  validateShipping,
  validatePayment,
  computeCompletion,
  canNavigateTo,
  isValidPHPhone,
  type InformationInput,
  type PaymentInput,
} from './checkout-steps'

const COURIER_IDS = ['jnt', 'lbc', 'ninja', 'grab']

const goodInfoNew: InformationInput = {
  email: 'buyer@repxl.com',
  selectedAddressId: null,
  fullName: 'Jervin R',
  streetAddress: '123 Main St',
  postalCode: '1600',
  phone: '09171234567',
  phAddr: { regionCode: '13', provinceCode: '13', cityCode: '1376', barangay: 'Barangay 1' },
}

const goodPaymentCard: PaymentInput = {
  selectedCardId: null,
  paymentMethod: 'card',
  cardNumber: '4111111111111111',
  cardExpiry: '12/30',
  cardCvc: '123',
  agreeTerms: true,
}

describe('step order helpers', () => {
  it('has the canonical 4-step order', () => {
    expect(CHECKOUT_STEPS).toEqual(['information', 'shipping', 'payment', 'review'])
  })
  it('parseStep defaults invalid/empty to information', () => {
    expect(parseStep('shipping')).toBe('shipping')
    expect(parseStep('REVIEW')).toBe('review')
    expect(parseStep('bogus')).toBe('information')
    expect(parseStep(null)).toBe('information')
  })
  it('next/prev step traversal with null at the ends', () => {
    expect(nextStep('information')).toBe('shipping')
    expect(nextStep('review')).toBeNull()
    expect(prevStep('information')).toBeNull()
    expect(prevStep('payment')).toBe('shipping')
    expect(stepIndex('payment')).toBe(2)
  })
})

describe('Step 1 — Information validation', () => {
  it('accepts a complete new address', () => {
    expect(validateInformation(goodInfoNew)).toEqual({})
  })
  it('blocks progression on invalid email', () => {
    expect(validateInformation({ ...goodInfoNew, email: 'nope' }).email).toBeTruthy()
  })
  it('requires address fields for a new address', () => {
    const errs = validateInformation({ ...goodInfoNew, streetAddress: '', phAddr: { regionCode: '', provinceCode: '', cityCode: '', barangay: '' } })
    expect(errs.address).toBeTruthy()
    expect(errs.region).toBeTruthy()
  })
  it('validates PH phone (09XXXXXXXXX)', () => {
    expect(isValidPHPhone('09171234567')).toBe(true)
    expect(isValidPHPhone('12345')).toBe(false)
    expect(validateInformation({ ...goodInfoNew, phone: '12345' }).phone).toBeTruthy()
  })
  it('requires province only when the region has provinces (NCR skips it)', () => {
    // NCR: provinceCode === regionCode → province not required.
    const ncr = validateInformation({ ...goodInfoNew, phAddr: { regionCode: '13', provinceCode: '13', cityCode: '1376', barangay: 'B1' } })
    expect(ncr.province).toBeUndefined()
    // Provincial region with empty provinceCode → province required.
    const prov = validateInformation({ ...goodInfoNew, phAddr: { regionCode: '01', provinceCode: '', cityCode: '', barangay: '' } })
    expect(prov.province).toBeTruthy()
  })
  it('skips address validation when a saved address is selected (email still required)', () => {
    const saved: InformationInput = { ...goodInfoNew, selectedAddressId: 'addr_1', streetAddress: '', phAddr: { regionCode: '', provinceCode: '', cityCode: '', barangay: '' } }
    expect(validateInformation(saved)).toEqual({}) // address fields not checked
    expect(validateInformation({ ...saved, email: 'bad' }).email).toBeTruthy()
  })
})

describe('Step 2 — Shipping validation', () => {
  it('requires a known courier selection', () => {
    expect(validateShipping('jnt', COURIER_IDS)).toEqual({})
    expect(validateShipping('', COURIER_IDS).courier).toBeTruthy()
    expect(validateShipping('unknown', COURIER_IDS).courier).toBeTruthy()
  })
})

describe('Step 3 — Payment validation', () => {
  it('accepts a valid new card + agreed terms', () => {
    expect(validatePayment(goodPaymentCard)).toEqual({})
  })
  it('validates card fields only for a NEW card payment', () => {
    expect(validatePayment({ ...goodPaymentCard, cardNumber: '123' }).cardNumber).toBeTruthy()
    expect(validatePayment({ ...goodPaymentCard, cardExpiry: '01/20' }).cardExpiry).toBeTruthy()
    // Saved card → card fields not validated.
    expect(validatePayment({ ...goodPaymentCard, selectedCardId: 'card_1', cardNumber: '', cardExpiry: '', cardCvc: '' })).toEqual({})
    // Non-card method → card fields not validated.
    expect(validatePayment({ ...goodPaymentCard, paymentMethod: 'gcash', cardNumber: '', cardExpiry: '', cardCvc: '' })).toEqual({})
  })
  it('requires agreeing to terms before Review', () => {
    expect(validatePayment({ ...goodPaymentCard, agreeTerms: false }).agreeTerms).toBeTruthy()
  })
})

describe('completion + navigation gating', () => {
  it('computes cumulative completion', () => {
    const all = computeCompletion(goodInfoNew, 'jnt', COURIER_IDS, goodPaymentCard)
    expect(all).toEqual({ information: true, shipping: true, payment: true })
  })
  it('shipping/payment are incomplete until earlier steps pass', () => {
    const badInfo = { ...goodInfoNew, email: 'bad' }
    const c = computeCompletion(badInfo, 'jnt', COURIER_IDS, goodPaymentCard)
    expect(c.information).toBe(false)
    expect(c.shipping).toBe(false) // gated by information
    expect(c.payment).toBe(false)
  })

  it('backward/same navigation is always allowed', () => {
    const none = { information: false, shipping: false, payment: false }
    expect(canNavigateTo('information', 'payment', none)).toBe(true) // backward
    expect(canNavigateTo('shipping', 'shipping', none)).toBe(true) // same
  })

  it('forward navigation requires all earlier steps complete (no skipping)', () => {
    // From information, cannot jump to payment/review unless info+shipping done.
    expect(canNavigateTo('payment', 'information', { information: true, shipping: false, payment: false })).toBe(false)
    expect(canNavigateTo('payment', 'information', { information: true, shipping: true, payment: false })).toBe(true)
    expect(canNavigateTo('review', 'information', { information: true, shipping: true, payment: false })).toBe(false)
    expect(canNavigateTo('review', 'information', { information: true, shipping: true, payment: true })).toBe(true)
  })
})
