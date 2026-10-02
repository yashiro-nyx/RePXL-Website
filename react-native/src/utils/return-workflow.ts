// Pure customer/admin presentation and monetary rules. Safe for client imports.
type Timestamp = string | Date | null
export interface ReturnWorkflow {
  status: string
  createdAt: Timestamp
  updatedAt?: Timestamp
  approvedAt?: Timestamp
  shippedAt?: Timestamp
  receivedAt?: Timestamp
  inspectedAt?: Timestamp
  refundedAt?: Timestamp
  refundStartedAt?: Timestamp
  returnInstructions?: string | null
  returnCarrier?: string | null
  returnTrackingNumber?: string | null
  inspectionNotes?: string | null
  rejectionReason?: string | null
  refundId?: string | null
  refundStatus?: string | null
  refundAmount?: number | null
}
export function getReturnStage(request: ReturnWorkflow): string {
  if (request.status === 'REJECTED') return 'Request declined'
  if (request.status === 'REFUNDED') return 'Refund completed'
  if (request.refundStatus === 'failed') return 'Refund needs attention'
  if (request.refundStartedAt) return 'Refund processing'
  if (request.inspectedAt) return 'Inspection complete'
  if (request.receivedAt) return 'Items received'
  if (request.shippedAt) return 'Return on its way'
  if (request.status === 'APPROVED') return 'Return approved'
  if (request.status === 'UNDER_REVIEW') return 'Under review'
  return 'Request received'
}
export function getReturnTimeline(request: ReturnWorkflow) {
  return [
    { label: 'Request submitted', date: request.createdAt },
    { label: 'Return approved', date: request.approvedAt },
    { label: 'Return shipped', date: request.shippedAt },
    { label: 'Items received', date: request.receivedAt },
    { label: 'Inspection complete', date: request.inspectedAt },
    { label: 'Refund processing', date: request.refundStartedAt },
    {
      label: 'Refund completed',
      date:
        request.refundedAt ??
        (request.status === 'REFUNDED' ? request.updatedAt : null),
    },
  ]
}
export interface RefundOrder {
  total: number
  discount: number
  shippingCost: number
  items: { id: string; productId?: string; price: number; quantity: number }[]
}
export function calculateReturnQuote(
  order: RefundOrder,
  selected: { orderItemId: string; quantity: number }[]
) {
  if (
    !order.items.length ||
    order.items.some(
      (item) =>
        !Number.isFinite(item.price) ||
        item.price < 0 ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1
    )
  )
    throw new Error('Invalid order items.')
  // Legacy cases without item records represent the original whole-order return.
  const selections = selected.length
    ? selected
    : order.items.map((item) => ({
        orderItemId: item.id,
        quantity: item.quantity,
      }))
  const ids = new Set<string>()
  let selectedCents = 0
  let allItems = selections.length === order.items.length
  for (const selection of selections) {
    const item = order.items.find((entry) => entry.id === selection.orderItemId)
    if (
      !item ||
      ids.has(selection.orderItemId) ||
      !Number.isInteger(selection.quantity) ||
      selection.quantity < 1 ||
      selection.quantity > item.quantity
    ) {
      throw new Error('Invalid returned item or quantity.')
    }
    ids.add(selection.orderItemId)
    selectedCents += Math.round(item.price * 100) * selection.quantity
    allItems = allItems && selection.quantity === item.quantity
  }
  const subtotalCents = order.items.reduce(
    (sum, item) => sum + Math.round(item.price * 100) * item.quantity,
    0
  )
  const totalCents = Math.round(order.total * 100)
  const shippingCents = Math.round(order.shippingCost * 100)
  if (
    !Number.isSafeInteger(totalCents) ||
    totalCents <= 0 ||
    !Number.isSafeInteger(subtotalCents) ||
    subtotalCents <= 0 ||
    !Number.isSafeInteger(selectedCents) ||
    !Number.isFinite(order.discount) ||
    !Number.isSafeInteger(shippingCents) ||
    shippingCents < 0
  )
    throw new Error('Invalid order amounts.')
  const discountCents = Math.max(
    0,
    Math.min(subtotalCents, Math.round(order.discount * 100))
  )
  const itemsCents = Math.max(
    0,
    Math.min(
      totalCents,
      selectedCents -
        Math.round((discountCents * selectedCents) / subtotalCents)
    )
  )
  const refundableShippingCents = allItems
    ? Math.max(0, Math.min(shippingCents, totalCents - itemsCents))
    : 0
  return {
    itemsAmount: itemsCents / 100,
    shippingAmount: refundableShippingCents / 100,
    maxAmount: (itemsCents + refundableShippingCents) / 100,
    includesAllItems: allItems,
  }
}
