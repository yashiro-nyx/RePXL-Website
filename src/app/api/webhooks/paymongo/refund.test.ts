import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'
const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  reconcile: vi.fn(),
  finalize: vi.fn(),
}))
vi.mock('@/lib/paymongo', () => ({ verifyWebhookSignature: mocks.verify }))
vi.mock('@/lib/return-service', () => ({
  reconcileReturnRefund: mocks.reconcile,
}))
vi.mock('@/lib/purchase-finalization', () => ({
  finalizePaidOrder: mocks.finalize,
}))
vi.mock('@/lib/prisma', () => ({ prisma: {} }))
const send = (
  type = 'refund.succeeded',
  data = { id: 're_123', attributes: {} }
) =>
  POST(
    new NextRequest('http://localhost/api/webhooks/paymongo', {
      method: 'POST',
      headers: { 'paymongo-signature': 'signature' },
      body: JSON.stringify({
        data: { id: 'evt_123', attributes: { type, data } },
      }),
    })
  )
beforeEach(() => {
  vi.resetAllMocks()
  mocks.verify.mockReturnValue({ valid: true })
  mocks.reconcile.mockResolvedValue(undefined)
})
describe('signed refund webhooks', () => {
  it('rejects unsigned or invalid events before reconciliation', async () => {
    mocks.verify.mockReturnValue({ valid: false, reason: 'Invalid signature' })
    expect((await send()).status).toBe(401)
    expect(mocks.reconcile).not.toHaveBeenCalled()
  })
  it.each(['refund.succeeded', 'payment.refunded', 'payment.refund.updated'])(
    'reconciles %s using the provider resource',
    async (type) => {
      expect((await send(type)).status).toBe(200)
      expect(mocks.reconcile).toHaveBeenCalledWith('re_123')
      expect(mocks.finalize).not.toHaveBeenCalled()
    }
  )
  it('reconciles refund IDs from a payment resource', async () => {
    expect(
      (
        await send('payment.refunded', {
          id: 'pay_123',
          attributes: { refunds: [{ id: 're_456' }] },
        })
      ).status
    ).toBe(200)
    expect(mocks.reconcile).toHaveBeenCalledWith('re_456')
  })
  it('returns a retryable error when reconciliation fails', async () => {
    mocks.reconcile.mockRejectedValue(new Error('Unavailable'))
    expect((await send()).status).toBe(500)
  })
})
