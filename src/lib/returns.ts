import { OrderStatus, PaymentStatus, ReturnStatus } from '@prisma/client'

/**
 * Returns workflow pure logic.
 *
 * These functions contain no I/O so they can be property-tested independently
 * of the database. They implement the return-window check, the return-status
 * transition table, refund eligibility, the single-active-request rule, and
 * submission / rejection-reason validation described in the design document
 * ("Components and Interfaces" section 2).
 */

/** Length of the return window, in calendar days, measured from delivery/completion. */
export const RETURN_WINDOW_DAYS = 30

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Reason length bounds for a customer return submission (Req 3.4, 3.5). */
export const REASON_MIN_LENGTH = 10
export const REASON_MAX_LENGTH = 1000

/** Rejection-reason length bounds for an admin rejection (Req 4.6, 4.7). */
export const REJECTION_REASON_MIN_LENGTH = 1
export const REJECTION_REASON_MAX_LENGTH = 500

/**
 * Req 3.1 / 3.2: Is the order inside the 30-day return window as of `now`?
 *
 * Returns true if and only if the order status is DELIVERED or COMPLETED and
 * the relevant date (deliveredAt for DELIVERED, completedAt for COMPLETED) is
 * present and falls within the 30 calendar days preceding `now` (inclusive of
 * both boundaries, and never in the future relative to `now`).
 */
export function isWithinReturnWindow(
  order: {
    status: OrderStatus
    deliveredAt: Date | null
    completedAt: Date | null
  },
  now: Date
): boolean {
  let relevant: Date | null
  if (order.status === OrderStatus.DELIVERED) {
    relevant = order.deliveredAt
  } else if (order.status === OrderStatus.COMPLETED) {
    relevant = order.completedAt
  } else {
    return false
  }

  if (!relevant) {
    return false
  }

  const diffMs = now.getTime() - relevant.getTime()
  if (diffMs < 0) {
    // Relevant date is in the future relative to `now`; not within the window.
    return false
  }

  return diffMs <= RETURN_WINDOW_DAYS * MS_PER_DAY
}

/**
 * Allowed return-status transitions.
 *
 * REQUESTED    → UNDER_REVIEW | APPROVED | REJECTED
 * UNDER_REVIEW → APPROVED | REJECTED
 * APPROVED     → REFUNDED
 * REJECTED / REFUNDED are terminal.
 */
const ALLOWED_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  [ReturnStatus.REQUESTED]: [
    ReturnStatus.UNDER_REVIEW,
    ReturnStatus.APPROVED,
    ReturnStatus.REJECTED,
  ],
  [ReturnStatus.UNDER_REVIEW]: [ReturnStatus.APPROVED, ReturnStatus.REJECTED],
  [ReturnStatus.APPROVED]: [ReturnStatus.REFUNDED],
  [ReturnStatus.REJECTED]: [],
  [ReturnStatus.REFUNDED]: [],
}

/**
 * Req 4.4 / 4.5 / 4.6: Is the requested transition allowed from the current
 * status? A status is never allowed to transition to itself.
 */
export function canTransition(from: ReturnStatus, to: ReturnStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

/**
 * Req 4.9 / 4.10: A refund may be processed only when the return is APPROVED
 * and the order's payment status is PAID.
 */
export function isRefundEligible(
  returnStatus: ReturnStatus,
  paymentStatus: PaymentStatus
): boolean {
  return returnStatus === ReturnStatus.APPROVED && paymentStatus === PaymentStatus.PAID
}

/**
 * Req 3.6: An order may have at most one "active" return request. A request is
 * active when its status is REQUESTED or UNDER_REVIEW.
 */
export function hasActiveRequest(existingStatuses: ReturnStatus[]): boolean {
  return existingStatuses.some(
    (status) => status === ReturnStatus.REQUESTED || status === ReturnStatus.UNDER_REVIEW
  )
}

/**
 * Req 4.6 / 4.7: A rejection reason is valid only when it is not empty or
 * whitespace-only and its trimmed length is within the allowed bounds.
 */
export function isValidRejectionReason(reason: string): boolean {
  const trimmed = reason.trim()
  return (
    trimmed.length >= REJECTION_REASON_MIN_LENGTH &&
    trimmed.length <= REJECTION_REASON_MAX_LENGTH
  )
}

export type ReturnSubmissionField = 'items' | 'reason'

export interface ReturnSubmissionError {
  field: ReturnSubmissionField
  message: string
}

export interface ReturnSubmissionInput {
  orderId: string
  userId: string
  /** Order-item ids the customer selected to return (at least one required). */
  selectedItemIds: string[]
  reason: string
}

export interface ReturnRequestDraft {
  orderId: string
  userId: string
  selectedItemIds: string[]
  reason: string
  status: typeof ReturnStatus.REQUESTED
}

export type ReturnSubmissionResult =
  | { ok: true; request: ReturnRequestDraft }
  | { ok: false; errors: ReturnSubmissionError[] }

/**
 * Req 3.3 / 3.4 / 3.5: Validate a customer return submission.
 *
 * A valid submission has at least one selected order item and a reason whose
 * length is between {@link REASON_MIN_LENGTH} and {@link REASON_MAX_LENGTH}
 * inclusive. On success a REQUESTED return-request draft is produced containing
 * exactly the selected items and the provided reason. On failure every
 * offending field is reported and no draft is produced.
 */
export function validateReturnSubmission(
  input: ReturnSubmissionInput
): ReturnSubmissionResult {
  const errors: ReturnSubmissionError[] = []

  if (!input.selectedItemIds || input.selectedItemIds.length < 1) {
    errors.push({
      field: 'items',
      message: 'Select at least one item to return.',
    })
  }

  const reasonLength = input.reason.length
  if (reasonLength < REASON_MIN_LENGTH || reasonLength > REASON_MAX_LENGTH) {
    errors.push({
      field: 'reason',
      message: `Reason must be between ${REASON_MIN_LENGTH} and ${REASON_MAX_LENGTH} characters.`,
    })
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    request: {
      orderId: input.orderId,
      userId: input.userId,
      selectedItemIds: [...input.selectedItemIds],
      reason: input.reason,
      status: ReturnStatus.REQUESTED,
    },
  }
}
