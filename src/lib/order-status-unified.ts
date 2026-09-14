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

/**
 * Normalizes any string representation (e.g. "Processing", "processing", "PROCESSING")
 * to the canonical UPPERCASE status enum value.
 */
export function normalizeOrderStatus(status: unknown): CanonicalOrderStatus {
  if (typeof status !== 'string') return 'PROCESSING'
  const upper = status.trim().toUpperCase()
  if (upper === 'SHIPPED') return 'SHIPPED'
  if (upper === 'DELIVERED') return 'DELIVERED'
  if (upper === 'COMPLETED') return 'COMPLETED'
  if (upper === 'CANCELLED' || upper === 'CANCELED') return 'CANCELLED'
  return 'PROCESSING'
}

/**
 * Returns human-readable label for any status string (e.g. "Processing", "Payment Processed").
 * When in PROCESSING status and paymentStatus is provided:
 * - PAID → "Payment Processed"
 * - PENDING → "Order Placed"
 */
export function getOrderStatusLabel(status: unknown, paymentStatus?: unknown): string {
  const norm = normalizeOrderStatus(status)
  if (norm === 'PROCESSING' && typeof paymentStatus === 'string') {
    const pUpper = paymentStatus.trim().toUpperCase()
    if (pUpper === 'PAID') return 'Payment Processed'
    if (pUpper === 'PENDING') return 'Order Placed'
  }
  return ORDER_STATUS_LABELS[norm] ?? 'Processing'
}

/**
 * Returns Tailwind badge class string for any status string.
 */
export function getOrderStatusBadgeClass(status: unknown, paymentStatus?: unknown): string {
  const norm = normalizeOrderStatus(status)
  if (norm === 'PROCESSING' && typeof paymentStatus === 'string') {
    const pUpper = paymentStatus.trim().toUpperCase()
    if (pUpper === 'PAID') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    if (pUpper === 'PENDING') return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
  }
  return ORDER_STATUS_BADGE_CLASSES[norm] ?? ORDER_STATUS_BADGE_CLASSES.PROCESSING
}


