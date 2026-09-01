import { describe, it, expect } from 'vitest'
import { fc } from '@fast-check/vitest'
import {
  buildInvoiceModel,
  buildPackingSlipModel,
  formatMoney,
  validatePackingSlip,
  SERIAL_NOT_RECORDED,
  type AddressSnapshot,
  type ConditionGrade,
  type DocumentOrderItem,
  type OrderWithItems,
  type PackingSlipRequiredField,
} from './documents'

// ─── Arbitraries ─────────────────────────────────────────────────────────────────

const NUM_RUNS = { numRuns: 100 } as const

const conditionArb: fc.Arbitrary<ConditionGrade> = fc.constantFrom(
  'MINT',
  'EXCELLENT',
  'GOOD',
  'FAIR'
)

// Integer-valued money keeps the derived arithmetic (subtotals, totals) exact so
// the consistency property can assert strict equality.
const moneyArb = fc.integer({ min: 0, max: 1_000_000 })
const quantityArb = fc.integer({ min: 1, max: 20 })

const addressArb: fc.Arbitrary<AddressSnapshot> = fc.record({
  fullName: fc.string({ minLength: 1, maxLength: 40 }),
  address: fc.string({ minLength: 1, maxLength: 60 }).filter((s) => s.trim().length > 0),
  barangay: fc.string({ maxLength: 30 }),
  city: fc.string({ minLength: 1, maxLength: 30 }),
  province: fc.string({ maxLength: 30 }),
  postalCode: fc.string({ minLength: 1, maxLength: 10 }),
})

const itemArb: fc.Arbitrary<DocumentOrderItem> = fc.record({
  productName: fc.string({ minLength: 1, maxLength: 40 }),
  condition: conditionArb,
  unitPrice: moneyArb,
  quantity: quantityArb,
  serialNumber: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
})

// A valid order: all required fulfillment fields present, at least one line item.
const validOrderArb: fc.Arbitrary<OrderWithItems> = fc.record({
  orderNumber: fc
    .string({ minLength: 1, maxLength: 20 })
    .filter((s) => s.trim().length > 0),
  orderDate: fc.date({ min: new Date('2000-01-01'), max: new Date('2035-01-01') }),
  customerFullName: fc
    .string({ minLength: 1, maxLength: 40 })
    .filter((s) => s.trim().length > 0),
  shippingAddress: addressArb,
  shippingCost: moneyArb,
  discount: moneyArb,
  courierName: fc.string({ minLength: 1, maxLength: 30 }),
  courierEstimate: fc.string({ minLength: 1, maxLength: 30 }),
  items: fc.array(itemArb, { minLength: 1, maxLength: 8 }),
})

const currencyArb = fc.constantFrom('PHP', 'USD', 'EUR', 'JPY', '₱', '$')

describe('documents — invoice', () => {
  // Feature: admin-client-management-suite, Property 1: Invoice totals and required
  // fields are consistent. For any order with a set of line items, the built invoice
  // model contains the order number, order date, customer full name, and shipping
  // address, one row per line item whose line subtotal equals unit price times
  // quantity, and an order total equal to subtotal plus shipping cost minus discount.
  // Validates: Requirements 1.2
  it('Property 1: invoice totals and required fields are consistent', () => {
    fc.assert(
      fc.property(validOrderArb, currencyArb, (order, currency) => {
        const invoice = buildInvoiceModel(order, currency)

        expect(invoice.orderNumber).toBe(order.orderNumber)
        expect(invoice.orderDate).toBe(order.orderDate)
        expect(invoice.customerFullName).toBe(order.customerFullName)
        expect(invoice.shippingAddress).toEqual(order.shippingAddress)

        expect(invoice.lines).toHaveLength(order.items.length)
        for (let i = 0; i < order.items.length; i++) {
          const item = order.items[i]
          const line = invoice.lines[i]
          expect(line.lineSubtotal).toBe(item.unitPrice * item.quantity)
        }

        const expectedSubtotal = invoice.lines.reduce((s, l) => s + l.lineSubtotal, 0)
        expect(invoice.subtotal).toBe(expectedSubtotal)
        expect(invoice.total).toBe(
          invoice.subtotal + invoice.shippingCost - invoice.discount
        )
      }),
      NUM_RUNS
    )
  })

  // Feature: admin-client-management-suite, Property 2: Monetary formatting always
  // has exactly two decimals. For any non-negative amount and configured currency,
  // formatMoney produces a string whose numeric portion has exactly two decimals.
  // Validates: Requirements 1.3
  it('Property 2: monetary formatting always has exactly two decimals', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1e12, noNaN: true, noDefaultInfinity: true }),
        currencyArb,
        (amount, currency) => {
          const formatted = formatMoney(amount, currency)
          // The numeric portion ends with a dot followed by exactly two digits, and
          // there is exactly one decimal point in the whole string.
          expect(formatted).toMatch(/\.\d{2}$/)
          expect((formatted.match(/\./g) ?? []).length).toBe(1)
        }
      ),
      NUM_RUNS
    )
  })
})

describe('documents — packing slip', () => {
  // Feature: admin-client-management-suite, Property 3: Packing slip contains
  // required fulfillment fields per item. For any valid order, the built packing
  // slip model includes the order number, customer full name, shipping address,
  // courier name and estimate, and one row per line item containing the product
  // name, a condition grade in {MINT, EXCELLENT, GOOD, FAIR}, and quantity.
  // Validates: Requirements 2.2
  it('Property 3: packing slip contains required fulfillment fields per item', () => {
    fc.assert(
      fc.property(validOrderArb, (order) => {
        const slip = buildPackingSlipModel(order)

        expect(slip.orderNumber).toBe(order.orderNumber)
        expect(slip.customerFullName).toBe(order.customerFullName)
        expect(slip.shippingAddress).toEqual(order.shippingAddress)
        expect(slip.courierName).toBe(order.courierName)
        expect(slip.courierEstimate).toBe(order.courierEstimate)

        expect(slip.lines).toHaveLength(order.items.length)
        for (let i = 0; i < order.items.length; i++) {
          const item = order.items[i]
          const line = slip.lines[i]
          expect(line.productName).toBe(item.productName)
          expect(['MINT', 'EXCELLENT', 'GOOD', 'FAIR']).toContain(line.condition)
          expect(line.quantity).toBe(item.quantity)
        }
      }),
      NUM_RUNS
    )
  })

  // Feature: admin-client-management-suite, Property 4: Serial number presence is
  // rendered explicitly. For any packing slip line item, the model displays the
  // recorded serial number when one exists and an explicit "not recorded" indicator
  // when none exists.
  // Validates: Requirements 2.3
  it('Property 4: serial number presence is rendered explicitly', () => {
    fc.assert(
      fc.property(validOrderArb, (order) => {
        const slip = buildPackingSlipModel(order)
        for (let i = 0; i < order.items.length; i++) {
          const item = order.items[i]
          const line = slip.lines[i]
          const hasSerial = item.serialNumber != null && item.serialNumber.trim() !== ''
          if (hasSerial) {
            expect(line.serialDisplay).toBe(item.serialNumber)
          } else {
            expect(line.serialDisplay).toBe(SERIAL_NOT_RECORDED)
          }
        }
      }),
      NUM_RUNS
    )
  })

  // Feature: admin-client-management-suite, Property 5: Packing slip never exposes
  // prices or totals. For any order, the built packing slip model contains no
  // per-item price and no order total fields.
  // Validates: Requirements 2.4
  it('Property 5: packing slip never exposes prices or totals', () => {
    fc.assert(
      fc.property(validOrderArb, (order) => {
        const slip = buildPackingSlipModel(order)

        // No total/subtotal/discount/shipping keys anywhere on the model.
        const forbiddenTopLevel = [
          'subtotal',
          'total',
          'discount',
          'shippingCost',
          'price',
          'unitPrice',
        ]
        for (const key of forbiddenTopLevel) {
          expect(slip).not.toHaveProperty(key)
        }
        // No per-line price keys.
        for (const line of slip.lines) {
          expect(line).not.toHaveProperty('price')
          expect(line).not.toHaveProperty('unitPrice')
          expect(line).not.toHaveProperty('lineSubtotal')
        }
        // And nothing numeric-price leaks through JSON serialization of the model.
        const serialized = JSON.parse(JSON.stringify(slip)) as Record<string, unknown>
        expect(serialized).not.toHaveProperty('total')
        expect(serialized).not.toHaveProperty('subtotal')
      }),
      NUM_RUNS
    )
  })

  // Feature: admin-client-management-suite, Property 6: Packing slip validation
  // identifies missing required fields. For any order, validatePackingSlip returns
  // exactly the set of required fulfillment fields (order number, customer full
  // name, shipping address) that are missing, and returns an empty set only when
  // all are present.
  // Validates: Requirements 2.7
  it('Property 6: packing slip validation identifies missing required fields', () => {
    const blankish = fc.constantFrom('', '   ', '\t', '\n')
    const present = fc.string({ minLength: 1, maxLength: 20 }).filter(
      (s) => s.trim().length > 0
    )
    const fieldArb = fc.oneof(present, blankish)

    fc.assert(
      fc.property(
        fieldArb, // order number candidate
        fieldArb, // customer full name candidate
        fc.oneof(addressArb, fc.constant(null)),
        fc.array(itemArb, { maxLength: 5 }),
        (orderNumber, customerFullName, shippingAddress, items) => {
          const order: OrderWithItems = {
            orderNumber,
            orderDate: new Date(),
            customerFullName,
            shippingAddress,
            shippingCost: 0,
            discount: 0,
            courierName: 'Courier',
            courierEstimate: '3 days',
            items,
          }

          const expected: PackingSlipRequiredField[] = []
          if (orderNumber.trim() === '') expected.push('orderNumber')
          if (customerFullName.trim() === '') expected.push('customerFullName')
          const addressPresent =
            shippingAddress != null && shippingAddress.address.trim() !== ''
          if (!addressPresent) expected.push('shippingAddress')

          const missing = validatePackingSlip(order)
          expect(missing.sort()).toEqual(expected.sort())
          // Empty only when everything is present.
          expect(missing.length === 0).toBe(expected.length === 0)
        }
      ),
      NUM_RUNS
    )
  })
})
