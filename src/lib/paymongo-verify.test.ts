import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { checkPaymongoPaymentStatus } from './paymongo'

describe('checkPaymongoPaymentStatus', () => {
  const originalEnv = process.env.PAYMONGO_SECRET_KEY

  beforeEach(() => {
    process.env.PAYMONGO_SECRET_KEY = 'sk_test_mock_key'
  })

  afterEach(() => {
    process.env.PAYMONGO_SECRET_KEY = originalEnv
    vi.restoreAllMocks()
  })

  it('returns unconfigured if PAYMONGO_SECRET_KEY is missing', async () => {
    delete process.env.PAYMONGO_SECRET_KEY
    const res = await checkPaymongoPaymentStatus({ paymentSessionId: 'cs_123' })
    expect(res).toEqual({ isPaid: false, status: 'unconfigured' })
  })

  it('returns isPaid: true when checkout session has payments array with paid status', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          id: 'cs_test_session',
          attributes: {
            status: 'active',
            payments: [
              {
                id: 'pay_12345',
                attributes: {
                  status: 'paid',
                  amount: 15000,
                },
              },
            ],
          },
        },
      }),
    } as Response)

    const res = await checkPaymongoPaymentStatus({ paymentSessionId: 'cs_test_session' })
    expect(res.isPaid).toBe(true)
    expect(res.status).toBe('paid')
    expect(res.paymentId).toBe('pay_12345')
  })

  it('returns isPaid: true when checkout session has payment_intent succeeded', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          id: 'cs_test_session_2',
          attributes: {
            status: 'active',
            payment_intent: {
              id: 'pi_test_intent',
              attributes: {
                status: 'succeeded',
              },
            },
          },
        },
      }),
    } as Response)

    const res = await checkPaymongoPaymentStatus({ paymentSessionId: 'cs_test_session_2' })
    expect(res.isPaid).toBe(true)
    expect(res.status).toBe('succeeded')
    expect(res.paymentId).toBe('pi_test_intent')
  })

  it('returns isPaid: false when checkout session is still pending / unpaid', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          id: 'cs_test_session_unpaid',
          attributes: {
            status: 'active',
            payments: [],
            payment_intent: {
              id: 'pi_test_intent_pending',
              attributes: {
                status: 'awaiting_payment_method',
              },
            },
          },
        },
      }),
    } as Response)

    const res = await checkPaymongoPaymentStatus({ paymentSessionId: 'cs_test_session_unpaid' })
    expect(res.isPaid).toBe(false)
    expect(res.status).toBe('awaiting_payment_method')
  })

  it('returns isPaid: true for paymentIntent with status succeeded', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          id: 'pi_succeeded_direct',
          attributes: {
            status: 'succeeded',
            payments: [{ id: 'pay_pi_direct', attributes: { status: 'paid' } }],
          },
        },
      }),
    } as Response)

    const res = await checkPaymongoPaymentStatus({ paymentIntentId: 'pi_succeeded_direct' })
    expect(res.isPaid).toBe(true)
    expect(res.status).toBe('succeeded')
    expect(res.paymentId).toBe('pay_pi_direct')
  })

  it('returns isPaid: false when neither ID is provided', async () => {
    const res = await checkPaymongoPaymentStatus({})
    expect(res).toEqual({ isPaid: false, status: 'none' })
  })
})

