/**
 * Shared return reason definitions.
 * Used by both the API route (server-side validation) and the return form (client-side).
 */

export const EVIDENCE_REQUIRED_REASONS = [
  'damaged',
  'wrong_item',
  'not_as_described',
  'missing_parts',
  'defective',
] as const

export type ReturnReason = (typeof EVIDENCE_REQUIRED_REASONS)[number] | 'other'

export const REASON_LABELS: Record<ReturnReason, string> = {
  damaged: 'Damaged item',
  wrong_item: 'Wrong item received',
  not_as_described: 'Item not as described',
  missing_parts: 'Missing parts or accessories',
  defective: 'Physical defect',
  other: 'Other reason',
}

export const ALL_REASONS = [...EVIDENCE_REQUIRED_REASONS, 'other'] as const

export function requiresEvidence(reason: string): boolean {
  return EVIDENCE_REQUIRED_REASONS.includes(reason as typeof EVIDENCE_REQUIRED_REASONS[number])
}

export const REASON_OPTIONS = [
  { value: 'damaged',          label: REASON_LABELS.damaged,          evidenceRequired: true },
  { value: 'wrong_item',       label: REASON_LABELS.wrong_item,       evidenceRequired: true },
  { value: 'not_as_described', label: REASON_LABELS.not_as_described, evidenceRequired: true },
  { value: 'missing_parts',    label: REASON_LABELS.missing_parts,    evidenceRequired: true },
  { value: 'defective',        label: REASON_LABELS.defective,        evidenceRequired: true },
  { value: 'other',            label: REASON_LABELS.other,            evidenceRequired: false },
] as const
