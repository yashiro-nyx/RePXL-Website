import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from './[orderNumber]/route'

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  find: vi.fn(),
  update: vi.fn(),
  saved: vi.fn(),
  notify: vi.fn(),
}))
vi.mock('@/lib/auth-helpers', () => ({ getCurrentUser: mocks.user }))
vi.mock('@/lib/return-service', () => ({
  returnInclude: {},
  notifyReturn: mocks.notify,
}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    returnRequest: { findFirst: mocks.find },
    $transaction: async (fn: (tx: unknown) => unknown) =>
      fn({
        returnRequest: {
          updateMany: mocks.update,
          findUniqueOrThrow: mocks.saved,
        },
      }),
  },
}))
const id = 'cm000000000000000000000001'
const current = {
  id,
  status: 'APPROVED',
  receivedAt: null,
  refundStartedAt: null,
  shippedAt: null,
  updatedAt: new Date(),
}
const submit = (body = {}) =>
  PATCH(
    new NextRequest('http://localhost/api/returns/RPX-1', {
      method: 'PATCH',
      body: JSON.stringify({
        returnRequestId: id,
        returnCarrier: 'Courier',
        returnTrackingNumber: 'TRACK123',
        ...body,
      }),
    }),
    { params: Promise.resolve({ orderNumber: 'RPX-1' }) }
  )
beforeEach(() => {
  vi.resetAllMocks()
  mocks.user.mockResolvedValue({ id: 'user1' })
  mocks.find.mockResolvedValue(current)
  mocks.update.mockResolvedValue({ count: 1 })
  mocks.saved.mockResolvedValue(current)
  mocks.notify.mockResolvedValue(true)
})
describe('customer return shipment', () => {
  it('requires authentication', async () => {
    mocks.user.mockResolvedValue(null)
    expect((await submit()).status).toBe(401)
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it('scopes the request to the customer and order', async () => {
    mocks.find.mockResolvedValue(null)
    expect((await submit()).status).toBe(404)
    expect(mocks.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id, userId: 'user1', order: { orderNumber: 'RPX-1' } },
      })
    )
  })
  it.each([
    { status: 'REQUESTED' },
    { receivedAt: new Date() },
    { refundStartedAt: new Date() },
  ])('blocks shipment updates after an invalid stage %j', async (change) => {
    mocks.find.mockResolvedValue({ ...current, ...change })
    expect((await submit()).status).toBe(409)
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it('records tracking with stage and concurrency guards', async () => {
    expect((await submit()).status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'APPROVED',
          receivedAt: null,
          refundStartedAt: null,
        }),
        data: expect.objectContaining({
          returnCarrier: 'Courier',
          returnTrackingNumber: 'TRACK123',
          shippedAt: expect.any(Date),
        }),
      })
    )
    expect(mocks.notify).toHaveBeenCalledOnce()
  })
  it('preserves the first shipment date when correcting tracking', async () => {
    const shippedAt = new Date(0)
    mocks.find.mockResolvedValue({ ...current, shippedAt })
    await submit()
    expect(mocks.update.mock.calls[0][0].data.shippedAt).toEqual(shippedAt)
  })
  it('rejects stale updates without notifying', async () => {
    mocks.update.mockResolvedValue({ count: 0 })
    expect((await submit()).status).toBe(409)
    expect(mocks.notify).not.toHaveBeenCalled()
  })
  it('rejects empty tracking', async () => {
    expect((await submit({ returnTrackingNumber: ' ' })).status).toBe(422)
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
