// ─── Unified Order Status Taxonomy & Helpers ─────────────────────────────────────
// Authoritative order status lifecycle states across DB, API, Web Admin,
// Web Storefront, and Mobile App.

export type CanonicalOrderStatus =
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'

export const CANONICAL_ORDER_STATUSES: readonly CanonicalOrderStatus[] = [
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
] as const

export const ORDER_STATUS_LABELS: Record<CanonicalOrderStatus, string> = {
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export const ORDER_STATUS_BADGE_CLASSES: Record<CanonicalOrderStatus, string> = {
  PROCESSING: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  SHIPPED: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  DELIVERED: 'bg-green-500/15 text-green-400 border-green-500/30',
  COMPLETED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  CANCELLED: 'bg-red-500/15 text-red-400 border-red-500/30',
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PAID: 'Paid',
  PENDING: 'Pending',
  FAILED: 'Failed / Expired',
  REFUNDED: 'Refunded',
}

export const PAYMENT_STATUS_BADGE_CLASSES: Record<string, string> = {
  PAID: 'bg-green-500/15 text-green-400 border-green-500/30',
  PENDING: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  FAILED: 'bg-red-500/15 text-red-400 border-red-500/30',
  REFUNDED: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
}

export type UnifiedFulfillmentStatus =
  | 'PROCESSING'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'

export const UNIFIED_FULFILLMENT_STATUSES: readonly UnifiedFulfillmentStatus[] = [
  'PROCESSING',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
] as const

export interface UnifiedStatusMeta {
  key: UnifiedFulfillmentStatus
  label: string
  shortLabel: string
  canonicalStatus: CanonicalOrderStatus
  deliveryStatus: string
  progress: number
  description: string
  mapStage: string
  badgeClass: string
}

export const UNIFIED_STATUS_CONFIG: Record<UnifiedFulfillmentStatus, UnifiedStatusMeta> = {
  PROCESSING: {
    key: 'PROCESSING',
    label: 'Processing (Order Placed)',
    shortLabel: 'Processing',
    canonicalStatus: 'PROCESSING',
    deliveryStatus: 'Order Placed',
    progress: 25,
    description: 'We are preparing your camera gear and checking lens optics.',
    mapStage: 'Preparing at Central Hub',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  IN_TRANSIT: {
    key: 'IN_TRANSIT',
    label: 'In Transit (Dispatched)',
    shortLabel: 'In Transit',
    canonicalStatus: 'SHIPPED',
    deliveryStatus: 'In Transit',
    progress: 50,
    description: 'Your camera has left the warehouse and is on its way to you.',
    mapStage: 'En Route to Regional Hub',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  },
  OUT_FOR_DELIVERY: {
    key: 'OUT_FOR_DELIVERY',
    label: 'Out for Delivery (Courier)',
    shortLabel: 'Out for Delivery',
    canonicalStatus: 'SHIPPED',
    deliveryStatus: 'Out for Delivery',
    progress: 75,
    description: 'Your package is out for delivery and will arrive today.',
    mapStage: 'Final Delivery Approach',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  DELIVERED: {
    key: 'DELIVERED',
    label: 'Delivered (Destination Reached)',
    shortLabel: 'Delivered',
    canonicalStatus: 'DELIVERED',
    deliveryStatus: 'Delivered',
    progress: 100,
    description: 'Your camera has been delivered. Enjoy your new camera!',
    mapStage: 'Delivered to Recipient',
    badgeClass: 'bg-green-500/15 text-green-400 border-green-500/30',
  },
  COMPLETED: {
    key: 'COMPLETED',
    label: 'Completed (Confirmed by Customer)',
    shortLabel: 'Completed',
    canonicalStatus: 'COMPLETED',
    deliveryStatus: 'Delivered',
    progress: 100,
    description: 'Your camera has been delivered and order is completed. Enjoy your new camera!',
    mapStage: 'Order Completed',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  CANCELLED: {
    key: 'CANCELLED',
    label: 'Cancelled',
    shortLabel: 'Cancelled',
    canonicalStatus: 'CANCELLED',
    deliveryStatus: 'Cancelled',
    progress: 0,
    description: 'Order has been cancelled.',
    mapStage: 'Order Cancelled',
    badgeClass: 'bg-red-500/15 text-red-400 border-red-500/30',
  },
}

/**
 * Normalizes any order's status and deliveryStatus into a single, unified fulfillment state.
 */
export function getUnifiedFulfillmentStatus(order: {
  status: unknown
  deliveryStatus?: unknown
}): UnifiedFulfillmentStatus {
  const norm = normalizeOrderStatus(order.status)
  const dNorm = typeof order.deliveryStatus === 'string' ? order.deliveryStatus.trim().toLowerCase() : ''

  if (norm === 'CANCELLED') return 'CANCELLED'
  if (norm === 'COMPLETED') return 'COMPLETED'
  if (norm === 'DELIVERED' || dNorm === 'delivered') return 'DELIVERED'
  if (norm === 'SHIPPED' || dNorm === 'out for delivery' || dNorm === 'in transit') {
    if (dNorm === 'out for delivery') return 'OUT_FOR_DELIVERY'
    return 'IN_TRANSIT'
  }
  return 'PROCESSING'
}

/**
 * Normalizes any string representation (e.g. "Processing", "processing", "PROCESSING")
 * to the canonical UPPERCASE status enum value.
 */
export function normalizeOrderStatus(status: unknown): CanonicalOrderStatus {
  if (typeof status !== 'string') return 'PROCESSING'
  const upper = status.trim().toUpperCase()
  if (upper === 'SHIPPED' || upper === 'IN_TRANSIT' || upper === 'OUT_FOR_DELIVERY') return 'SHIPPED'
  if (upper === 'DELIVERED') return 'DELIVERED'
  if (upper === 'COMPLETED') return 'COMPLETED'
  if (upper === 'CANCELLED' || upper === 'CANCELED') return 'CANCELLED'
  return 'PROCESSING'
}

/**
 * Returns human-readable label for any status string (e.g. "Processing", "Payment Processed", "Awaiting COD Approval").
 * When in PROCESSING status:
 * - COD pending approval → "Awaiting COD Approval"
 * - COD approved → "Order Placed"
 * - PAID → "Payment Processed"
 * - PENDING → "Order Placed"
 */
export function getOrderStatusLabel(
  status: unknown,
  paymentStatus?: unknown,
  deliveryStatus?: unknown,
  paymentMethod?: unknown
): string {
  const isCod =
    typeof paymentMethod === 'string' &&
    (paymentMethod.toLowerCase().includes('cash on delivery') || paymentMethod.toLowerCase() === 'cod')
  const isCodPending =
    isCod &&
    (deliveryStatus === 'Pending COD Approval' || deliveryStatus === 'COD Approval Requested')

  if (isCodPending) {
    return 'Awaiting COD Approval'
  }

  const dNorm = typeof deliveryStatus === 'string' ? deliveryStatus.trim().toLowerCase() : ''
  const norm = normalizeOrderStatus(status)

  if (norm === 'SHIPPED' && dNorm) {
    if (dNorm === 'out for delivery') return 'Out for Delivery'
    if (dNorm === 'in transit') return 'In Transit'
  }

  if (norm === 'PROCESSING') {
    if (isCod) return 'Order Placed'
    if (typeof paymentStatus === 'string') {
      const pUpper = paymentStatus.trim().toUpperCase()
      if (pUpper === 'PAID') return 'Payment Processed'
      if (pUpper === 'PENDING') return 'Order Placed'
    }
  }
  return ORDER_STATUS_LABELS[norm] ?? 'Processing'
}

/**
 * Returns Tailwind badge class string for any status string.
 */
export function getOrderStatusBadgeClass(
  status: unknown,
  paymentStatus?: unknown,
  deliveryStatus?: unknown,
  paymentMethod?: unknown
): string {
  const isCod =
    typeof paymentMethod === 'string' &&
    (paymentMethod.toLowerCase().includes('cash on delivery') || paymentMethod.toLowerCase() === 'cod')
  const isCodPending =
    isCod &&
    (deliveryStatus === 'Pending COD Approval' || deliveryStatus === 'COD Approval Requested')

  if (isCodPending) {
    return 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  }

  const dNorm = typeof deliveryStatus === 'string' ? deliveryStatus.trim().toLowerCase() : ''
  const norm = normalizeOrderStatus(status)

  if (norm === 'SHIPPED' && dNorm === 'out for delivery') {
    return 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  }

  if (norm === 'PROCESSING') {
    if (isCod) return 'bg-blue-500/15 text-blue-400 border-blue-500/30'
    if (typeof paymentStatus === 'string') {
      const pUpper = paymentStatus.trim().toUpperCase()
      if (pUpper === 'PAID') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
      if (pUpper === 'PENDING') return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    }
  }
  return ORDER_STATUS_BADGE_CLASSES[norm] ?? ORDER_STATUS_BADGE_CLASSES.PROCESSING
}


