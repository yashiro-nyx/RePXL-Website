import { describe, expect } from 'vitest'
import { test, fc } from '@fast-check/vitest'
import type { SessionUser } from '@/lib/auth-helpers'
import {
  applySettingsPatch,
  canWriteSettings,
  createInMemorySettingsRepository,
  enabledPaymentOptions,
  getSettings,
  isCheckoutUnavailable,
  updateSettings,
  validateShippingOption,
  SettingsAccessError,
  SHIPPING_NAME_MAX,
  SHIPPING_COST_MAX,
  type PaymentOption,
  type PlatformSettings,
} from '@/lib/settings'

const NUM_RUNS = 200

// ─── Arbitraries ────────────────────────────────────────────────────────────────

/** A small pool of supported currency codes for round-trip checks. */
const currencyArb = fc.constantFrom('PHP', 'USD', 'EUR', 'JPY', 'GBP', 'AUD', 'SGD')

const shippingOptionArb = fc.record({
  name: fc.string({ maxLength: 8 }),
  cost: fc.double({ min: 0, max: 2000, noNaN: true }),
})

const paymentOptionArb = fc.record({
  key: fc.string({ minLength: 1, maxLength: 12 }),
  label: fc.string({ maxLength: 20 }),
  enabled: fc.boolean(),
})

const settingsArb = fc.record({
  currency: currencyArb,
  shippingOptions: fc.array(shippingOptionArb, { maxLength: 5 }),
  paymentOptions: fc.array(paymentOptionArb, { maxLength: 6 }),
})

function makeAdmin(isSuperAdmin: boolean): SessionUser {
  return {
    id: 'admin-1',
    email: 'admin@repxl.test',
    firstName: 'Ada',
    lastName: 'Min',
    role: 'ADMIN',
    isSuperAdmin,
  }
}

const superAdmin = makeAdmin(true)

// ─── Property 22: Currency setting round-trips ──────────────────────────────────

describe('Property 22: Currency setting round-trips', () => {
  // Feature: admin-client-management-suite, Property 22: Currency setting
  // round-trips — For any supported currency, saving it via updateSettings and
  // then reading via getSettings SHALL return the saved currency.
  // Validates: Requirements 7.2
  test.prop([currencyArb, fc.option(settingsArb, { nil: undefined })], {
    numRuns: NUM_RUNS,
  })('saved currency is read back unchanged', async (currency, initial) => {
    const repo = createInMemorySettingsRepository(initial ?? {})
    await updateSettings({ currency }, superAdmin, repo)
    const readBack = await getSettings(repo)
    expect(readBack.currency).toBe(currency)
  })

  test.prop([currencyArb, currencyArb], { numRuns: NUM_RUNS })(
    'the most recently saved currency wins on read',
    async (first, second) => {
      const repo = createInMemorySettingsRepository()
      await updateSettings({ currency: first }, superAdmin, repo)
      const after = await updateSettings({ currency: second }, superAdmin, repo)
      expect(after.currency).toBe(second)
      expect((await getSettings(repo)).currency).toBe(second)
    }
  )
})

// ─── Property 23: Shipping option validation ─────────────────────────────────────

describe('Property 23: Shipping option validation', () => {
  // Feature: admin-client-management-suite, Property 23: Shipping option
  // validation — accept only when the name is 1–60 characters and not a
  // duplicate and the cost is 0.00–999,999.99 inclusive; otherwise reject and
  // report the invalid field.
  // Validates: Requirements 7.3, 7.5, 7.6
  test.prop(
    [
      fc.record({
        name: fc.string({ maxLength: 70 }),
        cost: fc.double({ min: -1000, max: 1_100_000, noNaN: true }),
      }),
      fc.array(fc.record({ name: fc.string({ maxLength: 70 }) }), { maxLength: 5 }),
    ],
    { numRuns: NUM_RUNS }
  )('accepts iff name in range, not duplicate, and cost in range', (option, existing) => {
    const result = validateShippingOption(option, existing)

    const nameLengthOk = option.name.length >= 1 && option.name.length <= SHIPPING_NAME_MAX
    const isDuplicate = existing.some((e) => e.name === option.name)
    const nameOk = nameLengthOk && !isDuplicate
    const costOk =
      Number.isFinite(option.cost) && option.cost >= 0 && option.cost <= SHIPPING_COST_MAX

    expect(result.valid).toBe(nameOk && costOk)
    expect('name' in result.errors).toBe(!nameOk)
    expect('cost' in result.errors).toBe(!costOk)
  })

  test.prop([fc.string({ minLength: 1, maxLength: SHIPPING_NAME_MAX })], {
    numRuns: NUM_RUNS,
  })('a fully valid, non-duplicate option is accepted', (name) => {
    const result = validateShippingOption({ name, cost: 50 }, [])
    expect(result.valid).toBe(true)
    expect(Object.keys(result.errors)).toHaveLength(0)
  })

  test.prop([fc.string({ minLength: 1, maxLength: SHIPPING_NAME_MAX })], {
    numRuns: NUM_RUNS,
  })('a duplicate name is always rejected on the name field', (name) => {
    const result = validateShippingOption({ name, cost: 10 }, [{ name }])
    expect(result.valid).toBe(false)
    expect('name' in result.errors).toBe(true)
  })
})

// ─── Property 24: Checkout excludes disabled payment options ─────────────────────

describe('Property 24: Checkout excludes disabled payment options', () => {
  // Feature: admin-client-management-suite, Property 24: Checkout excludes
  // disabled payment options — the checkout payment selection SHALL contain
  // exactly the options whose enabled state is true.
  // Validates: Requirements 7.4
  test.prop([fc.array(paymentOptionArb, { maxLength: 10 })], { numRuns: NUM_RUNS })(
    'selection is exactly the enabled options, in order',
    (options: PaymentOption[]) => {
      const selected = enabledPaymentOptions(options)
      // Every selected option is enabled.
      expect(selected.every((o) => o.enabled)).toBe(true)
      // No enabled option is dropped.
      expect(selected.length).toBe(options.filter((o) => o.enabled).length)
      // No disabled option is included.
      expect(selected.some((o) => !o.enabled)).toBe(false)
      // Relative order is preserved.
      expect(selected).toEqual(options.filter((o) => o.enabled))
    }
  )
})

// ─── Property 25: Checkout-unavailable warning when no payment enabled ──────────

describe('Property 25: Checkout-unavailable warning when no payment enabled', () => {
  // Feature: admin-client-management-suite, Property 25: Checkout-unavailable
  // warning when no payment enabled — the settings view SHALL display the
  // checkout-unavailable warning if and only if no payment option is enabled.
  // Validates: Requirements 7.7
  test.prop([fc.array(paymentOptionArb, { maxLength: 10 })], { numRuns: NUM_RUNS })(
    'unavailable iff no option is enabled',
    (options: PaymentOption[]) => {
      const anyEnabled = options.some((o) => o.enabled)
      expect(isCheckoutUnavailable(options)).toBe(!anyEnabled)
    }
  )
})

// ─── Property 26: Settings writes require Super_Admin ───────────────────────────

describe('Property 26: Settings writes require Super_Admin', () => {
  // Feature: admin-client-management-suite, Property 26: Settings writes require
  // Super_Admin — a settings write SHALL be permitted iff the admin's
  // isSuperAdmin flag is true; otherwise settings are presented read-only.
  // Validates: Requirements 7.10
  test.prop([fc.boolean()], { numRuns: NUM_RUNS })(
    'canWriteSettings is true iff isSuperAdmin is true',
    (isSuperAdmin) => {
      expect(canWriteSettings(makeAdmin(isSuperAdmin))).toBe(isSuperAdmin)
    }
  )

  test.prop([fc.constantFrom(null, undefined)], { numRuns: 100 })(
    'an absent session can never write',
    (admin) => {
      expect(canWriteSettings(admin as null | undefined)).toBe(false)
    }
  )

  test.prop([fc.boolean(), currencyArb], { numRuns: NUM_RUNS })(
    'updateSettings persists iff Super_Admin, otherwise throws and persists nothing',
    async (isSuperAdmin, currency) => {
      const initial: PlatformSettings = {
        currency: 'PHP',
        shippingOptions: [],
        paymentOptions: [],
      }
      const repo = createInMemorySettingsRepository(initial)
      const admin = makeAdmin(isSuperAdmin)

      if (isSuperAdmin) {
        const result = await updateSettings({ currency }, admin, repo)
        expect(result.currency).toBe(currency)
      } else {
        await expect(updateSettings({ currency }, admin, repo)).rejects.toBeInstanceOf(
          SettingsAccessError
        )
        // Nothing changed in the store.
        expect((await getSettings(repo)).currency).toBe('PHP')
      }
    }
  )
})
