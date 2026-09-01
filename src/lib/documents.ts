// ─── Invoice & Packing-Slip formatting library ──────────────────────────────────
// Pure, side-effect-free document builders for the Admin Order Management System.
// These functions turn an order (+ its line items) into printable invoice /
// packing-slip models and format currency. They perform no I/O so they can be
// property-tested in isolation.
//
// Design: admin-client-management-suite, "Components and Interfaces" §1.
// Requirements: 1.2, 1.3, 2.2, 2.3, 2.4, 2.7.

export type ConditionGrade = 'MINT' | 'EXCELLENT' | 'GOOD' | 'FAIR'

/** Explicit indicator rendered when a line item has no recorded serial number. */
export const SERIAL_NOT_RECORDED = 'not recorded'

/** Required fulfillment fields a packing slip cannot be rendered without (Req 2.7). */
export type PackingSlipRequiredField =
  | 'orderNumber'
  | 'customerFullName'
  | 'shippingAddress'

/**
 * A typed error thrown when a document cannot be built (missing order, missing
 * required fulfillment fields, or a render failure). Callers surface the message
 * without mutating order data (Req 1.5, 1.6, 2.6, 2.7).
 */
export class DocumentError extends Error {
  readonly missingFields: PackingSlipRequiredField[]

  constructor(message: string, missingFields: PackingSlipRequiredField[] = []) {
    super(message)
    this.name = 'DocumentError'
    this.missingFields = missingFields
    // Restore prototype chain for instanceof checks when targeting ES5-ish output.
    Object.setPrototypeOf(this, DocumentError.prototype)
  }
}

/** Snapshot of a shipping address captured at order time. */
export interface AddressSnapshot {
  fullName: string
  address: string
  barangay?: string
  city: string
  province?: string
  postalCode: string
}

/** A single line item of an order, as consumed by the document builders. */
export interface DocumentOrderItem {
  productName: string
  condition: ConditionGrade
  /** Per-unit price at time of purchase. */
  unitPrice: number
  quantity: number
  /** Recorded serial number, or null when none was recorded. */
  serialNumber: string | null
}

/** Normalized order shape the builders operate on (Prisma Order + items). */
export interface OrderWithItems {
  orderNumber: string
  orderDate: Date
  customerFullName: string
  shippingAddress: AddressSnapshot | null
  shippingCost: number
  discount: number
  courierName: string
  courierEstimate: string
  items: DocumentOrderItem[]
}

// ─── Invoice ─────────────────────────────────────────────────────────────────────

export interface InvoiceLine {
  productName: string
  condition: ConditionGrade
  unitPrice: number
  quantity: number
  /** unitPrice * quantity */
  lineSubtotal: number
}

export interface InvoiceModel {
  orderNumber: string
  orderDate: Date
  customerFullName: string
  shippingAddress: AddressSnapshot
  lines: InvoiceLine[]
  subtotal: number
  shippingCost: number
  discount: number
  total: number
  /** Currency configured in the Settings_Manager. */
  currency: string
}

/**
 * Build a printable invoice model from an order and the resolved currency.
 *
 * Each line's subtotal is `unitPrice * quantity`; the invoice subtotal is the sum
 * of line subtotals; the total is `subtotal + shippingCost - discount` (Req 1.2).
 *
 * @throws {DocumentError} when the order is missing.
 */
export function buildInvoiceModel(order: OrderWithItems, currency: string): InvoiceModel {
  if (!order) {
    throw new DocumentError('Order not found')
  }

  const lines: InvoiceLine[] = order.items.map((item) => ({
    productName: item.productName,
    condition: item.condition,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    lineSubtotal: item.unitPrice * item.quantity,
  }))

  const subtotal = lines.reduce((sum, line) => sum + line.lineSubtotal, 0)
  const total = subtotal + order.shippingCost - order.discount

  return {
    orderNumber: order.orderNumber,
    orderDate: order.orderDate,
    customerFullName: order.customerFullName,
    shippingAddress: order.shippingAddress ?? {
      fullName: order.customerFullName,
      address: '',
      city: '',
      postalCode: '',
    },
    lines,
    subtotal,
    shippingCost: order.shippingCost,
    discount: order.discount,
    total,
    currency,
  }
}

/**
 * Format a monetary amount as a currency string with exactly two decimal places
 * (Req 1.3). Thousands are separated with commas; the numeric portion always ends
 * in a decimal point followed by exactly two digits.
 */
export function formatMoney(amount: number, currency: string): string {
  const safe = Number.isFinite(amount) ? amount : 0
  const negative = safe < 0
  const fixed = Math.abs(safe).toFixed(2) // exactly two decimals
  const [intPart, decPart] = fixed.split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const sign = negative ? '-' : ''
  const prefix = currency ? `${currency} ` : ''
  return `${prefix}${sign}${grouped}.${decPart}`
}

// ─── Packing slip ─────────────────────────────────────────────────────────────────

export interface PackingSlipLine {
  productName: string
  condition: ConditionGrade
  quantity: number
  /** Raw serial number (null when none recorded). */
  serialNumber: string | null
  /** Rendered serial: the value when present, else "not recorded" (Req 2.3). */
  serialDisplay: string
}

export interface PackingSlipModel {
  orderNumber: string
  customerFullName: string
  shippingAddress: AddressSnapshot
  courierName: string
  courierEstimate: string
  lines: PackingSlipLine[]
}

function isBlank(value: string | null | undefined): boolean {
  return value == null || value.trim() === ''
}

function isAddressPresent(address: AddressSnapshot | null): boolean {
  return address != null && !isBlank(address.address)
}

/**
 * Return the required fulfillment fields that are missing from an order.
 * An empty array means all required fields (order number, customer full name,
 * shipping address) are present (Req 2.7).
 */
export function validatePackingSlip(order: OrderWithItems): PackingSlipRequiredField[] {
  const missing: PackingSlipRequiredField[] = []
  if (!order || isBlank(order.orderNumber)) missing.push('orderNumber')
  if (!order || isBlank(order.customerFullName)) missing.push('customerFullName')
  if (!order || !isAddressPresent(order.shippingAddress)) missing.push('shippingAddress')
  return missing
}

/**
 * Build a printable packing slip model. The model includes fulfillment details
 * (courier + serials) and one row per line item, and deliberately excludes all
 * per-item prices and order totals (Req 2.2, 2.3, 2.4).
 *
 * @throws {DocumentError} when a required fulfillment field is missing (Req 2.7).
 */
export function buildPackingSlipModel(order: OrderWithItems): PackingSlipModel {
  const missing = validatePackingSlip(order)
  if (missing.length > 0) {
    throw new DocumentError(
      `Packing slip could not be generated: missing ${missing.join(', ')}`,
      missing
    )
  }

  const lines: PackingSlipLine[] = order.items.map((item) => ({
    productName: item.productName,
    condition: item.condition,
    quantity: item.quantity,
    serialNumber: item.serialNumber,
    serialDisplay: isBlank(item.serialNumber)
      ? SERIAL_NOT_RECORDED
      : (item.serialNumber as string),
  }))

  return {
    orderNumber: order.orderNumber,
    customerFullName: order.customerFullName,
    // Non-null: validatePackingSlip guarantees a present address above.
    shippingAddress: order.shippingAddress as AddressSnapshot,
    courierName: order.courierName,
    courierEstimate: order.courierEstimate,
    lines,
  }
}
