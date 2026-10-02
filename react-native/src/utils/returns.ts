import type { Order } from '../../types'
import type { ReturnWorkflow, calculateReturnQuote } from './return-workflow'

// Keep these customer choices aligned with src/lib/returnReasons.ts.
export const REASON_OPTIONS = [
  { value: 'damaged', label: 'Damaged item', evidenceRequired: true },
  { value: 'wrong_item', label: 'Wrong item received', evidenceRequired: true },
  {
    value: 'not_as_described',
    label: 'Item not as described',
    evidenceRequired: true,
  },
  {
    value: 'missing_parts',
    label: 'Missing parts or accessories',
    evidenceRequired: true,
  },
  { value: 'defective', label: 'Physical defect', evidenceRequired: true },
  { value: 'other', label: 'Other reason', evidenceRequired: false },
] as const
export type ReturnReason = (typeof REASON_OPTIONS)[number]['value']
export interface ReturnInput {
  orderNumber: string
  selectedItemIds: string[]
  reason: ReturnReason
  details?: string
  imagePublicIds: string[]
}
export interface ReturnRequest extends ReturnWorkflow {
  id: string
  status: 'REQUESTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'REFUNDED'
  reason: string
  rejectionReason: string | null
  refundId: string | null
  returnInstructions?: string | null
  refundStatus?: string | null
  refundAmount?: number | null
  createdAt: string
  updatedAt: string
  items?: { orderItemId: string; quantity: number }[]
  refundQuote?: ReturnType<typeof calculateReturnQuote>
}
export interface ReturnShipment {
  returnRequestId: string
  returnCarrier: string
  returnTrackingNumber: string
}
export function canRecordReturnShipment(request: ReturnRequest): boolean {
  return (
    request.status === 'APPROVED' &&
    !request.receivedAt &&
    !request.refundStartedAt
  )
}
export function validateReturnShipment(input: ReturnShipment): string | null {
  if (
    input.returnCarrier.trim().length < 2 ||
    input.returnCarrier.trim().length > 100
  )
    return 'Enter a carrier name between 2 and 100 characters.'
  if (
    input.returnTrackingNumber.trim().length < 3 ||
    input.returnTrackingNumber.trim().length > 150
  )
    return 'Enter a tracking number between 3 and 150 characters.'
  return null
}
export const RETURN_STATUS_LABELS: Record<ReturnRequest['status'], string> = {
  REQUESTED: 'Request received',
  UNDER_REVIEW: 'Under review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  REFUNDED: 'Refund processed',
}
export function isWithinReturnWindow(
  order: Pick<Order, 'status' | 'deliveredAt' | 'completedAt'>,
  now = Date.now()
): boolean {
  const date =
    order.status === 'DELIVERED'
      ? order.deliveredAt
      : order.status === 'COMPLETED'
        ? order.completedAt
        : null
  if (!date) return false
  const elapsed = now - new Date(date).getTime()
  return elapsed >= 0 && elapsed <= 30 * 86400000
}
export function validateReturnInput(input: ReturnInput): string | null {
  if (!input.selectedItemIds.length)
    return 'Select at least one item to return.'
  const reason = REASON_OPTIONS.find((option) => option.value === input.reason)
  if (!reason) return 'Please select a return reason.'
  if (reason.evidenceRequired && !input.imagePublicIds.length)
    return 'Upload at least one photo for this reason.'
  if (input.imagePublicIds.length > 5) return 'Maximum 5 images allowed.'
  const details = input.details?.trim()
  if (details && (details.length < 10 || details.length > 1000))
    return 'Additional details must be between 10 and 1000 characters.'
  return null
}
