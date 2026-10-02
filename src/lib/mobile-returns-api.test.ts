import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from '../../react-native/src/services/api'
const session = vi.hoisted(() => ({
  load: vi.fn(),
  save: vi.fn(),
  clear: vi.fn(),
}))
vi.mock('../../react-native/src/services/session', () => ({
  loadSession: session.load,
  saveSession: session.save,
  clearSession: session.clear,
}))
const fetchMock = vi.fn()
const response = (data: unknown, status = 200) => ({
  ok: status < 400,
  status,
  json: async () => data,
})
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('fetch', fetchMock)
  session.load.mockResolvedValue({
    user: {},
    tokens: { accessToken: 'access', refreshToken: 'refresh' },
  })
})
afterEach(() => vi.unstubAllGlobals())
describe('mobile return API transport', () => {
  it('uploads multipart evidence with bearer authentication and lets fetch set its boundary', async () => {
    fetchMock.mockResolvedValue(
      response({ success: true, data: { publicId: 'repixl/returns/photo' } })
    )
    const form = new FormData()
    form.append(
      'file',
      new Blob(['image'], { type: 'image/jpeg' }),
      'photo.jpg'
    )
    expect(await api.uploadReturnImage(form)).toEqual({
      publicId: 'repixl/returns/photo',
    })
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/upload\/return-image$/)
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(
      'Bearer access'
    )
    expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBeUndefined()
    expect(fetchMock.mock.calls[0][1].body).toBe(form)
  })
  it('submits selections and evidence with JSON auth', async () => {
    fetchMock.mockResolvedValue(
      response({ success: true, data: { id: 'return1', status: 'REQUESTED' } })
    )
    const input = {
      orderNumber: 'RPX-1',
      selectedItemIds: ['item1'],
      reason: 'other' as const,
      imagePublicIds: [],
    }
    await api.submitReturn(input)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(input)
    expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBe(
      'application/json'
    )
  })
  it('only treats the explicit no-return response as an empty state', async () => {
    fetchMock.mockResolvedValueOnce(
      response({ error: 'No return request found for this order' }, 404)
    )
    expect(await api.returnRequest('RPX-1')).toBeNull()
    fetchMock.mockResolvedValueOnce(response({ error: 'Order not found' }, 404))
    await expect(api.returnRequest('RPX-1')).rejects.toMatchObject({
      status: 404,
    })
  })
  it('refreshes an expired access token and retries the same multipart upload', async () => {
    fetchMock
      .mockResolvedValueOnce(response({ error: 'Expired' }, 401))
      .mockResolvedValueOnce(
        response({
          success: true,
          data: {
            user: {},
            tokens: { accessToken: 'new-access', refreshToken: 'new-refresh' },
          },
        })
      )
      .mockResolvedValueOnce(
        response({ success: true, data: { publicId: 'repixl/returns/photo' } })
      )
    const form = new FormData()
    await api.uploadReturnImage(form)
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe(
      'Bearer new-access'
    )
    expect(fetchMock.mock.calls[2][1].body).toBe(form)
    expect(session.save).toHaveBeenCalled()
  })
  it('preserves cancellation business errors instead of reporting a timeout', async () => {
    fetchMock.mockResolvedValue(
      response({ error: 'Order cannot be cancelled at this stage.' }, 409)
    )
    await expect(api.cancelOrder('RPX-1')).rejects.toEqual(
      new ApiError('Order cannot be cancelled at this stage.', 409)
    )
  })
  it('records shipment tracking through the shared PATCH endpoint with bearer auth', async () => {
    fetchMock.mockResolvedValue(
      response({ success: true, data: { recorded: true } })
    )
    const input = {
      returnRequestId: 'return1',
      returnCarrier: 'Courier',
      returnTrackingNumber: 'TRACK123',
    }
    expect(await api.recordReturnShipment('RPX/1', input)).toEqual({
      recorded: true,
    })
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/returns\/RPX%2F1$/)
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'PATCH',
      headers: expect.objectContaining({
        Authorization: 'Bearer access',
        'Content-Type': 'application/json',
      }),
    })
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(input)
  })
  it('preserves shipment business errors for retry without inventing success', async () => {
    fetchMock.mockResolvedValue(
      response({ error: 'Return already received.' }, 409)
    )
    await expect(
      api.recordReturnShipment('RPX-1', {
        returnRequestId: 'return1',
        returnCarrier: 'Courier',
        returnTrackingNumber: 'TRACK123',
      })
    ).rejects.toEqual(new ApiError('Return already received.', 409))
  })
})
