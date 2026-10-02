import { randomUUID } from 'crypto'
import type { Prisma, ReturnRequest, ReturnStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  createRefundWithTimeout,
  retrieveRefund,
  withTimeout,
} from '@/lib/paymongo'
import { emitNotification } from '@/lib/notifications'
import { calculateReturnQuote, getReturnStage } from '@/lib/return-workflow'

export class ReturnFlowError extends Error {
  constructor(
    message: string,
    public readonly status = 409
  ) {
    super(message)
  }
}
export const returnInclude = {
  order: { include: { items: { include: { product: true } } } },
  user: { select: { id: true, email: true, firstName: true, lastName: true } },
  items: true,
} satisfies Prisma.ReturnRequestInclude
type Detail = Prisma.ReturnRequestGetPayload<{ include: typeof returnInclude }>
type Admin = { id: string; firstName: string; lastName: string }
export async function loadReturn(id: string): Promise<Detail> {
  const request = await prisma.returnRequest.findUnique({
    where: { id },
    include: returnInclude,
  })
  if (!request) throw new ReturnFlowError('Return request not found', 404)
  return request
}
export function describeReturn(request: Detail) {
  return {
    ...request,
    refundAttemptKey: undefined,
    refundQuote: calculateReturnQuote(request.order, request.items),
  }
}
function audit(
  tx: Prisma.TransactionClient,
  admin: Admin,
  request: ReturnRequest,
  action: string,
  details: string
) {
  return tx.adminLog.create({
    data: {
      adminId: admin.id,
      adminName: `${admin.firstName} ${admin.lastName}`.trim(),
      action,
      details: `Return ${request.id}: ${details}`,
    },
  })
}
export function notifyReturn(request: Detail, completed = false) {
  const status = getReturnStage(request)
  return emitNotification({
    userId: request.userId,
    event: completed ? 'REFUND_COMPLETED' : 'RETURN_STATUS_CHANGE',
    subject: `${status} — ${request.order.orderNumber}`,
    body: completed
      ? `Your refund of ₱${request.refundAmount?.toFixed(2)} has been processed to your original payment method.`
      : `Your return for ${request.order.orderNumber}: ${status}. Open the return to see the next steps.`,
    channel: 'BOTH',
    recipientEmail: request.user.email,
    context: {
      orderNumber: request.order.orderNumber,
      returnId: request.id,
      status,
      reason: request.rejectionReason ?? request.reason,
      refundAmount:
        request.refundAmount != null
          ? `₱${request.refundAmount.toFixed(2)}`
          : '',
    },
  }).catch((err) =>
    console.error(
      '[return] notification failed:',
      err instanceof Error ? err.name : 'Unknown error'
    )
  )
}
export type AdminReturnAction =
  | { action: 'review' }
  | { action: 'approve'; returnInstructions: string }
  | { action: 'instructions'; returnInstructions: string }
  | { action: 'reject'; rejectionReason: string }
  | { action: 'receive' }
  | { action: 'inspect'; inspectionNotes: string; restock: boolean }

export async function advanceReturn(
  id: string,
  input: AdminReturnAction,
  admin: Admin
) {
  const current = await loadReturn(id)
  const data: Prisma.ReturnRequestUpdateManyMutationInput = {}
  switch (input.action) {
    case 'review':
      if (current.status !== 'REQUESTED')
        throw new ReturnFlowError('Only a new request can enter review.')
      data.status = 'UNDER_REVIEW'
      break
    case 'approve':
      if (!['REQUESTED', 'UNDER_REVIEW'].includes(current.status))
        throw new ReturnFlowError(
          'Only a request awaiting review can be approved.'
        )
      data.status = 'APPROVED'
      data.approvedAt = new Date()
      data.returnInstructions = input.returnInstructions
      break
    case 'reject':
      if (
        !['REQUESTED', 'UNDER_REVIEW', 'APPROVED'].includes(current.status) ||
        current.refundStartedAt ||
        current.inspectedAt
      )
        throw new ReturnFlowError('This return can no longer be declined.')
      data.status = 'REJECTED'
      data.rejectionReason = input.rejectionReason
      break
    case 'instructions':
      if (current.status !== 'APPROVED' || current.receivedAt)
        throw new ReturnFlowError(
          'Instructions can only be updated before an approved return is received.'
        )
      data.returnInstructions = input.returnInstructions
      break
    case 'receive':
      if (current.status !== 'APPROVED' || current.receivedAt)
        throw new ReturnFlowError(
          'Approve the return before recording receipt. Receipt can only be recorded once.'
        )
      data.receivedAt = new Date()
      break
    case 'inspect':
      if (
        current.status !== 'APPROVED' ||
        !current.receivedAt ||
        current.inspectedAt
      )
        throw new ReturnFlowError(
          'Receive the items before recording their inspection. Inspection can only be recorded once.'
        )
      data.inspectedAt = new Date()
      data.inspectionNotes = input.inspectionNotes
      if (input.restock) data.restockedAt = new Date()
      break
  }
  const updated = await prisma.$transaction(async (tx) => {
    const changed = await tx.returnRequest.updateMany({
      where: {
        id,
        updatedAt: current.updatedAt,
        status: current.status,
        receivedAt: current.receivedAt,
        inspectedAt: current.inspectedAt,
        refundAttemptKey: current.refundAttemptKey,
      },
      data,
    })
    if (changed.count !== 1)
      throw new ReturnFlowError(
        'This return changed. Refresh before trying again.'
      )
    if (input.action === 'inspect' && input.restock) {
      const selections = current.items.length
        ? current.items
        : current.order.items.map((item) => ({
            orderItemId: item.id,
            quantity: item.quantity,
          }))
      // Validates quantities before inventory is touched.
      calculateReturnQuote(current.order, selections)
      for (const selected of selections) {
        const item = current.order.items.find(
          (entry) => entry.id === selected.orderItemId
        )!
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: selected.quantity } },
        })
      }
    }
    await audit(
      tx,
      admin,
      current,
      `RETURN_${input.action.toUpperCase()}`,
      JSON.stringify(input)
    )
    return tx.returnRequest.findUniqueOrThrow({
      where: { id },
      include: returnInclude,
    })
  })
  void notifyReturn(updated)
  return describeReturn(updated)
}

async function recordRefundResult(
  current: Detail,
  result: { id: string; status: string },
  admin: Admin
) {
  if (!['pending', 'processing', 'succeeded', 'failed'].includes(result.status))
    throw new ReturnFlowError(
      'Unrecognized provider status. Reconcile this refund before retrying.',
      502
    )
  const completed = result.status === 'succeeded'
  if (current.refundId === result.id && current.refundStatus === result.status)
    return describeReturn(current)
  let changed = false
  const updated = await prisma.$transaction(async (tx) => {
    const update = await tx.returnRequest.updateMany({
      where: {
        id: current.id,
        status: 'APPROVED',
        refundAttemptKey: current.refundAttemptKey,
        refundStatus: { notIn: ['failed', 'succeeded'] },
      },
      data: {
        refundId: result.id,
        refundStatus: result.status,
        ...(completed
          ? { status: 'REFUNDED' as ReturnStatus, refundedAt: new Date() }
          : {}),
      },
    })
    changed = update.count === 1
    if (changed) {
      // A partial refund leaves the order's payment PAID; the exact case amount is visible separately.
      if (
        completed &&
        Math.round((current.refundAmount ?? 0) * 100) >=
          Math.round(current.order.total * 100)
      ) {
        await tx.order.update({
          where: { id: current.orderId },
          data: { paymentStatus: 'REFUNDED' },
        })
      }
      await audit(
        tx,
        admin,
        current,
        completed ? 'REFUND_COMPLETED' : 'REFUND_STATUS',
        `${result.status}; ${result.id}; amount ${current.refundAmount}`
      )
    }
    return tx.returnRequest.findUniqueOrThrow({
      where: { id: current.id },
      include: returnInclude,
    })
  })
  if (changed) void notifyReturn(updated, completed)
  return describeReturn(updated)
}

export async function reconcileReturnRefund(refundId: string) {
  const request = await prisma.returnRequest.findFirst({
    where: { refundId, status: 'APPROVED' },
    include: returnInclude,
  })
  if (!request) return
  // Look up the provider resource; do not trust a client or webhook's claimed status.
  const result = await withTimeout(retrieveRefund(refundId))
  return recordRefundResult(request, result, {
    id: 'system',
    firstName: 'Payment',
    lastName: 'Webhook',
  })
}

export async function processReturnRefund(
  id: string,
  input: {
    includeShipping: boolean
    manualReference?: string
    checkOnly?: boolean
  },
  admin: Admin
) {
  let current = await loadReturn(id)
  if (current.status === 'REFUNDED') return describeReturn(current)
  if (
    current.status !== 'APPROVED' ||
    !current.receivedAt ||
    !current.inspectedAt ||
    current.order.paymentStatus !== 'PAID'
  ) {
    throw new ReturnFlowError(
      'Refunds require an approved return, received and inspected items, and a paid order.'
    )
  }
  if (current.refundId && current.refundStatus !== 'failed') {
    if (current.refundId.startsWith('manual:'))
      throw new ReturnFlowError(
        'This manual refund needs reconciliation before any further action.'
      )
    return recordRefundResult(
      current,
      await withTimeout(retrieveRefund(current.refundId)),
      admin
    )
  }
  if (input.checkOnly) return describeReturn(current)
  const quote = calculateReturnQuote(current.order, current.items)
  if (input.includeShipping && !quote.includesAllItems)
    throw new ReturnFlowError(
      'Original shipping can only be refunded when all order items are returned.',
      422
    )
  const amount =
    quote.itemsAmount + (input.includeShipping ? quote.shippingAmount : 0)
  if (!Number.isFinite(amount) || amount <= 0 || amount > current.order.total)
    throw new ReturnFlowError('No valid refundable amount is available.', 422)
  const isCod = /^(cod|cash on delivery)$/i.test(
    current.order.paymentMethod.trim()
  )
  if (!isCod && !current.order.paymentReference?.startsWith('pay_'))
    throw new ReturnFlowError(
      'A captured PayMongo payment reference is required. Reconcile the payment first.',
      422
    )
  if (isCod && !input.manualReference)
    throw new ReturnFlowError(
      'Record the completed COD repayment reference before confirming a manual refund.',
      422
    )
  if (current.refundAttemptKey && current.refundStatus !== 'failed') {
    if (
      Math.round((current.refundAmount ?? 0) * 100) !== Math.round(amount * 100)
    )
      throw new ReturnFlowError(
        'An existing refund attempt has a fixed amount. Retry with its original shipping choice.'
      )
    if (
      !current.refundStartedAt ||
      Date.now() - current.refundStartedAt.getTime() >= 23 * 3600000
    )
      throw new ReturnFlowError(
        'The refund outcome is uncertain and the retry window has elapsed. Reconcile it in PayMongo before further action.'
      )
  } else {
    const key = randomUUID()
    const reserved = await prisma.$transaction(async (tx) => {
      const update = await tx.returnRequest.updateMany({
        where: {
          id,
          updatedAt: current.updatedAt,
          status: 'APPROVED',
          refundAttemptKey: current.refundAttemptKey,
          refundStatus: current.refundStatus,
        },
        data: {
          refundAmount: amount,
          refundAttemptKey: key,
          refundStartedAt: new Date(),
          refundStatus: 'processing',
          refundId: null,
        },
      })
      if (update.count !== 1)
        throw new ReturnFlowError(
          'Another refund action is in progress. Refresh this return.'
        )
      await audit(
        tx,
        admin,
        current,
        'REFUND_STARTED',
        `Amount ${amount}; shipping ${input.includeShipping}`
      )
      return tx.returnRequest.findUniqueOrThrow({
        where: { id },
        include: returnInclude,
      })
    })
    current = reserved
  }
  if (isCod)
    return recordRefundResult(
      current,
      { id: `manual:${input.manualReference}`, status: 'succeeded' },
      admin
    )
  try {
    const result = await createRefundWithTimeout({
      paymentId: current.order.paymentReference!,
      amount: Math.round(current.refundAmount! * 100),
      reason: 'requested_by_customer',
      notes: `Return ${id}`,
      idempotencyKey: current.refundAttemptKey!,
    })
    return await recordRefundResult(current, result, admin)
  } catch (err) {
    // A timeout or lost response can still have created a refund. Keep the key and amount.
    await prisma.returnRequest.updateMany({
      where: {
        id,
        status: 'APPROVED',
        refundAttemptKey: current.refundAttemptKey,
        refundId: null,
      },
      data: { refundStatus: 'unknown' },
    })
    throw new ReturnFlowError(
      'Refund outcome is awaiting confirmation. Refresh or retry the same amount; do not issue another refund in the provider dashboard until reconciled.',
      502
    )
  }
}
