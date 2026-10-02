import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'
import { GET } from './[orderNumber]/route'

const mocks = vi.hoisted(() => ({
  user: vi.fn(), order: vi.fn(), existing: vi.fn(), create: vi.fn(), image: vi.fn(), log: vi.fn(), notify: vi.fn(), deleteImage: vi.fn(),
}))
vi.mock('@/lib/auth-helpers', () => ({ getCurrentUser: mocks.user }))
vi.mock('@/lib/notifications', () => ({ emitNotification: mocks.notify }))
vi.mock('@/lib/cloudinary', () => ({ MAX_IMAGES: 5, deleteFromCloudinary: mocks.deleteImage }))
vi.mock('@/lib/prisma', () => ({ prisma: {
  order: { findUnique: mocks.order }, returnRequest: { findFirst: mocks.existing }, adminLog: { create: mocks.log },
  $transaction: async (fn: (tx: unknown) => unknown) => fn({ returnRequest: { create: mocks.create }, returnRequestImage: { create: mocks.image } }),
} }))
const order = { id: 'order1', orderNumber: 'RPX-1', userId: 'user1', status: 'DELIVERED', paymentStatus: 'PAID', total: 300, discount: 0, shippingCost: 0, deliveredAt: new Date(), completedAt: null, items: [{ id: 'item1', quantity: 2, price: 100 }, { id: 'item2', quantity: 1, price: 100 }] }
const submit = (body: Record<string, unknown> = {}) => POST(new NextRequest('http://localhost/api/returns', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer mobile-access' },
  body: JSON.stringify({ orderNumber: 'RPX-1', reason: 'other', selectedItemIds: ['item1'], ...body }),
}))
beforeEach(() => {
  vi.resetAllMocks()
  mocks.user.mockResolvedValue({ id: 'user1', email: 'customer@example.com' })
  mocks.order.mockResolvedValue(order)
  mocks.existing.mockResolvedValue(null)
  mocks.create.mockResolvedValue({ id: 'return1', status: 'REQUESTED' })
  mocks.notify.mockResolvedValue(true)
})
describe('shared website/mobile returns API', () => {
  it('accepts omitted optional details, persists selected item quantities, and emits the existing notification', async () => {
    expect((await submit()).status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith({ data: expect.objectContaining({ reason: 'Other reason', items: { create: [{ orderItemId: 'item1', quantity: 2 }] } }) })
    expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user1', event: 'RETURN_RECEIVED', channel: 'BOTH' }))
  })
  it('keeps legacy clients compatible by selecting all order items when selections are omitted', async () => {
    expect((await submit({ selectedItemIds: undefined })).status).toBe(201)
    expect(mocks.create.mock.calls[0][0].data.items.create).toHaveLength(2)
  })
  it('requires authentication', async () => { mocks.user.mockResolvedValue(null); expect((await submit()).status).toBe(401) })
  it('conceals another customer order', async () => { mocks.order.mockResolvedValue({ ...order, userId: 'other' }); expect((await submit()).status).toBe(404) })
  it.each([
    { status: 'PROCESSING' }, { status: 'SHIPPED' }, { deliveredAt: null },
    { deliveredAt: new Date(Date.now() - 31 * 86400000) }, { deliveredAt: new Date(Date.now() + 86400000) },
    { paymentStatus: 'REFUNDED' },
  ])('blocks ineligible order %j before creating records', async (change) => {
    mocks.order.mockResolvedValue({ ...order, ...change })
    expect((await submit()).status).toBe(409)
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it('accepts recently completed orders even when delivery was earlier', async () => {
    mocks.order.mockResolvedValue({ ...order, status: 'COMPLETED', deliveredAt: new Date(0), completedAt: new Date() })
    expect((await submit()).status).toBe(201)
  })
  it('blocks any existing non-rejected request', async () => {
    mocks.existing.mockResolvedValue({ status: 'APPROVED' })
    expect((await submit()).status).toBe(400)
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it('rejects empty or foreign selections and short details', async () => {
    expect((await submit({ selectedItemIds: [] })).status).toBe(400)
    expect((await submit({ selectedItemIds: ['foreign'] })).status).toBe(422)
    expect((await submit({ details: 'short' })).status).toBe(400)
  })
  it('requires damage photos and rejects invalid image folders', async () => {
    expect((await submit({ reason: 'damaged' })).status).toBe(422)
    expect((await submit({ reason: 'damaged', imagePublicIds: ['repixl/reviews/image'] })).status).toBe(422)
  })
  it('stores protected evidence images for an eligible request', async () => {
    expect((await submit({ reason: 'damaged', imagePublicIds: ['repixl/returns/image'] })).status).toBe(201)
    expect(mocks.image).toHaveBeenCalledWith({ data: expect.objectContaining({ publicId: 'repixl/returns/image', deliveryType: 'authenticated', returnRequestId: 'return1' }) })
  })
  it.each(['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REFUNDED'])('returns latest %s status with rejection/refund details', async (status) => {
    const request = { status, rejectionReason: 'Explanation', refundId: 're_123', items: [{ orderItemId: 'item1', quantity: 2 }] }
    mocks.existing.mockResolvedValue(request)
    const res = await GET(new NextRequest('http://localhost/api/returns/RPX-1'), { params: Promise.resolve({ orderNumber: 'RPX-1' }) })
    expect((await res.json()).data).toMatchObject(request)
  })
  it('reports no return separately from authorization failures', async () => {
    const res = await GET(new NextRequest('http://localhost/api/returns/RPX-1'), { params: Promise.resolve({ orderNumber: 'RPX-1' }) })
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('No return request found for this order')
  })
})
