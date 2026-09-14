// ─── Order history & tracking pure logic ─────────────────────────────────────────
// Pure, I/O-free helpers backing the storefront order-history list and the order
// tracking view. Isolated here so the ordering, stepper, and ownership rules can be
// property-tested independently of Prisma / route handlers (design.md §6).

import { OrderStatus } from '@prisma/client'

/** Ordered progression of fulfillment states shown in the tracking stepper. */
export const TRACKING_PROGRESSION: readonly OrderStatus[] = [
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
  OrderStatus.COMPLETED,
] as const

/** A single step in the tracking stepper. */
export interface StepperStep {
  status: OrderStatus
  /** True when this state is the current one or has already been passed. */
  reached: boolean
  /** True when this state is exactly the order's current state. */
  current: boolean
}

/** Result of computing the tracking stepper for an order. */
export interface StepperState {
  /** True when the order is CANCELLED and the progression is suppressed. */
  cancelled: boolean
  /** Ordered steps; empty when the order is cancelled (Req 10.4). */
  steps: StepperStep[]
}

/**
 * Sort orders by order date in non-increasing (descending) order (Req 10.1).
 * Returns a new array; the input is not mutated. Ties preserve input order
 * (stable sort).
 */
export function sortOrdersByDateDesc<T extends { orderDate: Date }>(orders: T[]): T[] {
  return [...orders].sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime())
}

/**
 * Compute the tracking stepper state for an order status (Req 10.2, 10.4).
 *
 * For the progression PROCESSING → SHIPPED → DELIVERED → COMPLETED, every state up
 * to and including the current state is marked `reached`, and every later state is
 * not. When the status is CANCELLED, the progression is suppressed entirely: an
 * empty step list with `cancelled: true`.
 */
export function computeStepperState(status: OrderStatus): StepperState {
  if (status === OrderStatus.CANCELLED) {
    return { cancelled: true, steps: [] }
  }

  const currentIndex = TRACKING_PROGRESSION.indexOf(status)

  const steps: StepperStep[] = TRACKING_PROGRESSION.map((stepStatus, index) => ({
    status: stepStatus,
    reached: currentIndex >= 0 && index <= currentIndex,
    current: index === currentIndex,
  }))

  return { cancelled: false, steps }
}

/**
 * Ownership check for order detail access (Req 10.6). Returns true if and only if
 * the requester owns the order.
 */
export function canAccessOrder(requesterUserId: string, orderOwnerUserId: string): boolean {
  return requesterUserId === orderOwnerUserId
}

export type LifecycleStepKey =
  | 'ORDER_PLACED'
  | 'PAYMENT_PROCESSED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'

export interface LifecycleStep {
  key: LifecycleStepKey
  label: string
  reached: boolean
  current: boolean
}

export const LIFECYCLE_STEP_LABELS: Record<LifecycleStepKey, string> = {
  ORDER_PLACED: 'Order Placed',
  PAYMENT_PROCESSED: 'Payment Processed',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
}

export interface LifecycleStepperState {
  cancelled: boolean
  steps: LifecycleStep[]
}

/**
 * Computes the 5-step order lifecycle stepper:
 * Order Placed → Payment Processed → Shipped → Delivered → Completed
 */
export function computeLifecycleStepperState(
  status: OrderStatus | string,
  paymentStatus?: string | null
): LifecycleStepperState {
  const normStatus = typeof status === 'string' ? status.trim().toUpperCase() : ''
  if (normStatus === 'CANCELLED' || normStatus === 'CANCELED') {
    return { cancelled: true, steps: [] }
  }

  const isPaid = paymentStatus?.trim().toUpperCase() === 'PAID'
  const isShipped = normStatus === 'SHIPPED'
  const isDelivered = normStatus === 'DELIVERED'
  const isCompleted = normStatus === 'COMPLETED'
  const isPastShipped = isShipped || isDelivered || isCompleted

  const steps: LifecycleStep[] = [
    {
      key: 'ORDER_PLACED',
      label: LIFECYCLE_STEP_LABELS.ORDER_PLACED,
      reached: true,
      current: normStatus === 'PROCESSING' && !isPaid,
    },
    {
      key: 'PAYMENT_PROCESSED',
      label: LIFECYCLE_STEP_LABELS.PAYMENT_PROCESSED,
      reached: isPaid || isPastShipped,
      current: normStatus === 'PROCESSING' && isPaid,
    },
    {
      key: 'SHIPPED',
      label: LIFECYCLE_STEP_LABELS.SHIPPED,
      reached: isPastShipped,
      current: isShipped,
    },
    {
      key: 'DELIVERED',
      label: LIFECYCLE_STEP_LABELS.DELIVERED,
      reached: isDelivered || isCompleted,
      current: isDelivered,
    },
    {
      key: 'COMPLETED',
      label: LIFECYCLE_STEP_LABELS.COMPLETED,
      reached: isCompleted,
      current: isCompleted,
    },
  ]

  return { cancelled: false, steps }
}

