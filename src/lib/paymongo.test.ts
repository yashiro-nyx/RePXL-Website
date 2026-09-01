import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createRefund,
  retrieveRefund,
  createRefundWithTimeout,
  withTimeout,
  TimeoutError,
  isTimeoutError,
  REFUND_TIMEOUT_MS,
} from './paymongo'

// A secret key is required so authHeader() produces a value; test-mode key.
process.env.PAYMONGO_SECRET_KEY = 'sk_test_dummy'

function mockFetchOnce(response: { ok: boolean; status: number; json: unknown }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status,
    json: async () => response.json,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('paymongo refunds', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  // Req 4.9 / 4.11: successful refund returns id + status and posts to /refunds.
  it('createRefund returns the refund id and status on success', async () => {
    const fetchMock = mockFetchOnce({
      ok: true,
      status: 200,
      json: { data: { id: 're_abc123', attributes: { status: 'pending' } } },
    })

    const result = await createRefund({ paymentId: 'pay_1', amount: 8900 })

    expect(result).toEqual({ id: 're_abc123', status: 'pending' })

    // Verify the request shape: POST /refunds with amount + payment_id.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.paymongo.com/v1/refunds')
    expect(opts.method).toBe('POST')
    const body = JSON.parse(opts.body as string)
    expect(body.data.attributes).toMatchObject({
      amount: 8900,
      payment_id: 'pay_1',
      reason: 'requested_by_customer',
    })
  })

  it('createRefund includes notes and custom reason when provided', async () => {
    const fetchMock = mockFetchOnce({
      ok: true,
      status: 200,
      json: { data: { id: 're_x', attributes: { status: 'succeeded' } } },
    })

    await createRefund({
      paymentId: 'pay_2',
      amount: 100,
      reason: 'others',
      notes: 'damaged in transit',
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body.data.attributes.reason).toBe('others')
    expect(body.data.attributes.notes).toBe('damaged in transit')
  })

  it('retrieveRefund fetches the refund by id via GET', async () => {
    const fetchMock = mockFetchOnce({
      ok: true,
      status: 200,
      json: { data: { id: 're_get', attributes: { status: 'succeeded' } } },
    })

    const result = await retrieveRefund('re_get')

    expect(result).toEqual({ id: 're_get', status: 'succeeded' })
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.paymongo.com/v1/refunds/re_get')
    expect(opts.method).toBe('GET')
  })

  // Req 4.12: gateway failure surfaces the PayMongo error detail as a thrown Error.
  it('createRefund throws with the PayMongo error detail on a non-ok response', async () => {
    mockFetchOnce({
      ok: false,
      status: 400,
      json: { errors: [{ detail: 'The payment cannot be refunded.' }] },
    })

    await expect(createRefund({ paymentId: 'pay_bad', amount: 500 })).rejects.toThrow(
      'The payment cannot be refunded.'
    )
  })

  it('createRefund gateway failure is not a timeout error', async () => {
    mockFetchOnce({
      ok: false,
      status: 500,
      json: { errors: [{ detail: 'internal error' }] },
    })

    const err = await createRefund({ paymentId: 'p', amount: 1 }).catch((e) => e)
    expect(isTimeoutError(err)).toBe(false)
    expect(err).toBeInstanceOf(Error)
  })
})

describe('paymongo refund timeout (Req 4.12)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('createRefundWithTimeout rejects with a TimeoutError when the gateway hangs', async () => {
    // fetch never settles → the request hangs.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => new Promise(() => {}))
    )

    const promise = createRefundWithTimeout({ paymentId: 'pay_hang', amount: 1000 })
    // Attach rejection handler before advancing timers to avoid unhandled rejection.
    const settled = promise.catch((e) => e)

    await vi.advanceTimersByTimeAsync(REFUND_TIMEOUT_MS)

    const err = await settled
    expect(isTimeoutError(err)).toBe(true)
    expect(err).toBeInstanceOf(TimeoutError)
  })

  it('withTimeout resolves normally when the promise settles before the bound', async () => {
    const fast = Promise.resolve('ok')
    await expect(withTimeout(fast, 1000)).resolves.toBe('ok')
  })

  it('withTimeout does not time out a promise that settles just before the deadline', async () => {
    const p = new Promise<string>((resolve) => setTimeout(() => resolve('done'), 100))
    const wrapped = withTimeout(p, 1000)
    await vi.advanceTimersByTimeAsync(100)
    await expect(wrapped).resolves.toBe('done')
  })
})
