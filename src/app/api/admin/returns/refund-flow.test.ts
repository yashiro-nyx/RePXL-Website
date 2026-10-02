import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './[id]/refund/route'
import { PATCH } from './[id]/route'
const mocks = vi.hoisted(() => ({
  admin: vi.fn(),
  find: vi.fn(),
  change: vi.fn(),
  orderUpdate: vi.fn(),
  productUpdate: vi.fn(),
  refund: vi.fn(),
  retrieve: vi.fn(),
  notify: vi.fn(),
  log: vi.fn(),
  state: null as any,
  version: 0,
}))
vi.mock('@/lib/auth-helpers', () => ({ getCurrentAdmin: mocks.admin }))
vi.mock('@/lib/paymongo', () => ({
  createRefundWithTimeout: mocks.refund,
  retrieveRefund: mocks.retrieve,
  withTimeout: (promise: Promise<unknown>) => promise,
}))
vi.mock('@/lib/notifications', () => ({ emitNotification: mocks.notify }))
vi.mock('@/lib/prisma', () => {
  const tx = {
    returnRequest: {
      updateMany: mocks.change,
      findUniqueOrThrow: () => Promise.resolve(structuredClone(mocks.state)),
    },
    order: { update: mocks.orderUpdate },
    product: { update: mocks.productUpdate },
    adminLog: { create: mocks.log },
  }
  return {
    prisma: {
      ...tx,
      returnRequest: { ...tx.returnRequest, findUnique: mocks.find },
      $transaction: (fn: (tx: unknown) => unknown) => fn(tx),
    },
  }
})
const id = 'cl123456789012345678901234'
const refund = (body: object = { includeShipping: true }) =>
  POST(
    new NextRequest(`http://localhost/api/admin/returns/${id}/refund`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) }
  )
const action = (body: object) =>
  PATCH(
    new NextRequest(`http://localhost/api/admin/returns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) }
  )
beforeEach(() => {
  vi.resetAllMocks()
  mocks.version = 0
  mocks.state = {
    id,
    orderId: 'order1',
    userId: 'user1',
    status: 'APPROVED',
    reason: 'Damaged item',
    createdAt: new Date(),
    updatedAt: new Date(),
    approvedAt: new Date(),
    receivedAt: new Date(),
    inspectedAt: new Date(),
    refundStartedAt: null,
    refundAttemptKey: null,
    refundAmount: null,
    refundId: null,
    refundStatus: null,
    order: {
      id: 'order1',
      orderNumber: 'RPX-1',
      paymentStatus: 'PAID',
      paymentMethod: 'Card',
      paymentReference: 'pay_123',
      total: 1500,
      discount: 0,
      shippingCost: 500,
      items: [
        {
          id: 'item1',
          productId: 'prod1',
          price: 1000,
          quantity: 1,
          product: { name: 'Camera' },
        },
      ],
    },
    items: [{ orderItemId: 'item1', quantity: 1 }],
    user: { id: 'user1', email: 'customer@example.com' },
  }
  mocks.admin.mockResolvedValue({
    id: 'admin1',
    firstName: 'Admin',
    lastName: 'User',
  })
  mocks.find.mockImplementation(() =>
    Promise.resolve(structuredClone(mocks.state))
  )
  mocks.change.mockImplementation(({ where, data }) => {
    const matches = Object.entries(where).every(
      ([key, expected]: [string, any]) =>
        expected && typeof expected === 'object' && 'notIn' in expected
          ? !expected.notIn.includes(mocks.state[key])
          : expected instanceof Date
            ? expected.getTime() === mocks.state[key]?.getTime()
            : mocks.state[key] === expected
    )
    if (!matches) return Promise.resolve({ count: 0 })
    Object.assign(mocks.state, data, {
      updatedAt: new Date(Date.now() + ++mocks.version),
    })
    return Promise.resolve({ count: 1 })
  })
  mocks.orderUpdate.mockImplementation(({ data }) => {
    Object.assign(mocks.state.order, data)
    return Promise.resolve(mocks.state.order)
  })
  mocks.refund.mockResolvedValue({ id: 're_123', status: 'succeeded' })
  mocks.retrieve.mockResolvedValue({ id: 're_123', status: 'succeeded' })
  mocks.notify.mockResolvedValue(true)
})
describe('standard return and refund admin flow', () => {
  it('refunds received/inspected items and optional original shipping, marking full payment refunded', async () => {
    const res = await refund()
    expect(res.status).toBe(200)
    expect(mocks.refund).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: 'pay_123',
        amount: 150000,
        idempotencyKey: expect.any(String),
      })
    )
    expect(mocks.orderUpdate).toHaveBeenCalledWith({
      where: { id: 'order1' },
      data: { paymentStatus: 'REFUNDED' },
    })
    expect((await res.json()).data).toMatchObject({
      status: 'REFUNDED',
      refundId: 're_123',
      refundAmount: 1500,
    })
    expect(mocks.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'REFUND_COMPLETED',
        context: expect.objectContaining({
          orderNumber: 'RPX-1',
          refundAmount: '\u20b11500.00',
        }),
      })
    )
  })
  it('requires admin authentication', async () => {
    mocks.admin.mockResolvedValue(null)
    expect((await refund()).status).toBe(401)
    expect(mocks.refund).not.toHaveBeenCalled()
  })
  it.each(['REQUESTED', 'UNDER_REVIEW', 'REJECTED'])(
    'blocks %s requests',
    async (status) => {
      mocks.state.status = status
      expect((await refund()).status).toBe(409)
      expect(mocks.refund).not.toHaveBeenCalled()
    }
  )
  it.each(['receivedAt', 'inspectedAt'])(
    'blocks refunds before %s',
    async (field) => {
      mocks.state[field] = null
      expect((await refund()).status).toBe(409)
    }
  )
  it('blocks unpaid orders and payment-intent-only references', async () => {
    mocks.state.order.paymentStatus = 'PENDING'
    expect((await refund()).status).toBe(409)
    mocks.state.order.paymentStatus = 'PAID'
    mocks.state.order.paymentReference = 'pi_123'
    expect((await refund()).status).toBe(422)
    expect(mocks.refund).not.toHaveBeenCalled()
  })
  it('refunds a subset without marking the entire payment refunded', async () => {
    mocks.state.order.items.push({ id: 'item2', price: 1000, quantity: 1 })
    mocks.state.order.total = 2500
    expect((await refund({ includeShipping: true })).status).toBe(422)
    expect((await refund({ includeShipping: false })).status).toBe(200)
    expect(mocks.refund).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 100000 })
    )
    expect(mocks.orderUpdate).not.toHaveBeenCalled()
  })
  it('keeps pending provider refunds processing until status reconciliation succeeds', async () => {
    mocks.refund.mockResolvedValue({ id: 're_123', status: 'pending' })
    expect((await refund()).status).toBe(200)
    expect(mocks.state.status).toBe('APPROVED')
    expect(mocks.state.refundStatus).toBe('pending')
    expect(mocks.orderUpdate).not.toHaveBeenCalled()
    await refund({ checkOnly: true })
    expect(mocks.retrieve).toHaveBeenCalledWith('re_123')
    expect(mocks.state.status).toBe('REFUNDED')
    expect(mocks.refund).toHaveBeenCalledTimes(1)
  })
  it('is idempotent after successful refund and notifies completion once', async () => {
    await refund()
    await refund()
    expect(mocks.refund).toHaveBeenCalledTimes(1)
    expect(mocks.orderUpdate).toHaveBeenCalledTimes(1)
    expect(
      mocks.notify.mock.calls.filter(
        ([notice]) => notice.event === 'REFUND_COMPLETED'
      )
    ).toHaveLength(1)
  })
  it('reuses the same reserved amount and idempotency key after an uncertain provider failure', async () => {
    mocks.refund.mockRejectedValueOnce(new Error('Network lost'))
    expect((await refund()).status).toBe(502)
    expect(mocks.state.status).toBe('APPROVED')
    expect(mocks.state.refundStatus).toBe('unknown')
    expect(mocks.orderUpdate).not.toHaveBeenCalled()
    expect((await refund({ includeShipping: false })).status).toBe(409)
    await refund()
    expect(mocks.refund.mock.calls[0][0]).toEqual(mocks.refund.mock.calls[1][0])
  })
  it('blocks unsafe retries after the provider idempotency window', async () => {
    mocks.state.refundAttemptKey = 'original'
    mocks.state.refundAmount = 1500
    mocks.state.refundStartedAt = new Date(Date.now() - 24 * 3600000)
    mocks.state.refundStatus = 'unknown'
    expect((await refund()).status).toBe(409)
    expect(mocks.refund).not.toHaveBeenCalled()
  })
  it('allows a new attempt only after a provider-confirmed failure', async () => {
    mocks.refund.mockResolvedValueOnce({ id: 're_123', status: 'failed' })
    await refund()
    const firstKey = mocks.state.refundAttemptKey
    await refund()
    expect(mocks.refund).toHaveBeenCalledTimes(2)
    expect(mocks.state.refundAttemptKey).not.toBe(firstKey)
  })
  it('records a completed COD repayment with a reference without contacting PayMongo', async () => {
    mocks.state.order.paymentMethod = 'Cash on Delivery'
    mocks.state.order.paymentReference = null
    expect((await refund()).status).toBe(422)
    expect(
      (await refund({ includeShipping: true, manualReference: 'receipt-456' }))
        .status
    ).toBe(200)
    expect(mocks.state.refundId).toBe('manual:receipt-456')
    expect(mocks.state.status).toBe('REFUNDED')
    expect(mocks.refund).not.toHaveBeenCalled()
  })
  it('rejects missing approval instructions and accepts the guided approval action', async () => {
    mocks.state.status = 'REQUESTED'
    mocks.state.receivedAt = null
    mocks.state.inspectedAt = null
    expect((await action({ action: 'approve' })).status).toBe(422)
    expect(
      (
        await action({
          action: 'approve',
          returnInstructions:
            'Return to the address provided by our service team.',
        })
      ).status
    ).toBe(200)
    expect(mocks.state.status).toBe('APPROVED')
    expect(mocks.state.returnInstructions).toContain('address')
  })
  it('records receipt then inspection and restocks once only when explicitly fit for resale', async () => {
    mocks.state.receivedAt = null
    mocks.state.inspectedAt = null
    expect(
      (
        await action({
          action: 'inspect',
          inspectionNotes: 'Inspected and fit for resale.',
          restock: true,
        })
      ).status
    ).toBe(409)
    await action({ action: 'receive' })
    expect(
      (
        await action({
          action: 'inspect',
          inspectionNotes: 'Inspected and fit for resale.',
          restock: true,
        })
      ).status
    ).toBe(200)
    expect(mocks.productUpdate).toHaveBeenCalledWith({
      where: { id: 'prod1' },
      data: { stock: { increment: 1 } },
    })
    expect(
      (
        await action({
          action: 'inspect',
          inspectionNotes: 'Inspected and fit for resale.',
          restock: true,
        })
      ).status
    ).toBe(409)
    expect(mocks.productUpdate).toHaveBeenCalledTimes(1)
  })
  it('keeps stock unchanged for damaged items and requires receipt before inspection', async () => {
    mocks.state.inspectedAt = null
    await action({
      action: 'inspect',
      inspectionNotes: 'Damage confirmed; cannot resell.',
      restock: false,
    })
    expect(mocks.productUpdate).not.toHaveBeenCalled()
  })
  it('rejects outdated concurrent mutations before inventory or financial side effects', async () => {
    mocks.state.inspectedAt = null
    mocks.change.mockResolvedValue({ count: 0 })
    expect(
      (
        await action({
          action: 'inspect',
          inspectionNotes: 'Inspected and fit for resale.',
          restock: true,
        })
      ).status
    ).toBe(409)
    expect(mocks.productUpdate).not.toHaveBeenCalled()
    expect(mocks.refund).not.toHaveBeenCalled()
  })
})
