import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHmac } from 'crypto'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  cookies: new Map<string, string>(),
  user: vi.fn(),
  findFirst: vi.fn(),
  updateMany: vi.fn(),
  groupBy: vi.fn(),
  count: vi.fn(),
  findMany: vi.fn(),
  fetch: vi.fn(),
}))
vi.mock('next/headers', () => ({ cookies: () => ({
  get: (name: string) => {
    const value = mocks.cookies.get(name)
    return value ? { value } : undefined
  },
}) }))
vi.mock('@/lib/prisma', () => ({ prisma: {
  user: { findUnique: mocks.user },
  order: { findFirst: mocks.findFirst, updateMany: mocks.updateMany, groupBy: mocks.groupBy, count: mocks.count, findMany: mocks.findMany },
} }))

import { POST as shipping } from '@/app/api/webhooks/shipping/route'
import { POST as simulate } from '@/app/api/admin/simulate-webhook/route'
import { GET as diagnostics } from '@/app/api/diagnostics/checkout/route'
import { GET as orderDiagnostics } from '@/app/api/diagnostics/orders/route'
import { GET as tracking } from '@/app/api/track/stream/route'

const customer = { id: 'owner', role: 'CUSTOMER', isArchived: false }
const admin = { id: 'admin', role: 'ADMIN', isArchived: false }
const order = {
  id: 'order-id', userId: customer.id,
  deliveryStatus: 'In Transit', trackingProgress: 50,
  trackingDescription: 'On the way', updatedAt: new Date('2026-09-01'),
}
const payload = { tracking_number: 'TRACK-1', status_code: 'DE', status_description: 'Delivered' }

function session(id: string, adminCookie = false, ageMs = 0) {
  const value = Buffer.from(JSON.stringify({ userId: id, iat: Date.now() - ageMs })).toString('base64url')
  const signature = createHmac('sha256', 'test-session-secret').update(value).digest('base64url')
  mocks.cookies.set(adminCookie ? 'repixl-admin-session-token' : 'repixl-session-token', `${value}.${signature}`)
}
function post(body: unknown, authorization?: string) {
  return new NextRequest('http://localhost/api/test', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(authorization ? { Authorization: authorization } : {}) },
    body: JSON.stringify(body),
  })
}
function track(number = 'TRACK-1', signal?: AbortSignal) {
  return tracking(new NextRequest(`http://localhost/api/track/stream?tracking=${number}`, { signal }))
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.cookies.clear()
  vi.stubEnv('NEXTAUTH_SECRET', 'test-session-secret')
  vi.stubEnv('SHIPPING_WEBHOOK_SECRET', 'test-shipping-secret')
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://store.example.com')
  vi.stubGlobal('fetch', mocks.fetch)
  mocks.user.mockImplementation(async ({ where }) => where.id === 'admin' ? admin : { ...customer, id: where.id })
  mocks.findFirst.mockImplementation(async ({ where }) =>
    where.userId && where.userId !== order.userId ? null : order)
  mocks.updateMany.mockResolvedValue({ count: 1 })
  mocks.count.mockResolvedValue(2)
  mocks.findMany.mockResolvedValue([{ userId: customer.id }])
  mocks.groupBy.mockResolvedValue([])
  mocks.fetch.mockResolvedValue(Response.json({ success: true }))
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('shipping webhook authentication', () => {
  it.each([undefined, 'Bearer wrong-secret', 'test-shipping-secret'])('rejects missing or invalid authorization (%s)', async (header) => {
    expect((await shipping(post(payload, header))).status).toBe(401)
    expect(mocks.updateMany).not.toHaveBeenCalled()
  })
  it('does not allow an admin cookie to replace the sender secret', async () => {
    session('admin', true)
    expect((await shipping(post(payload))).status).toBe(401)
    expect(mocks.updateMany).not.toHaveBeenCalled()
  })
  it('fails closed when the secret is unconfigured', async () => {
    vi.stubEnv('SHIPPING_WEBHOOK_SECRET', '')
    expect((await shipping(post(payload, 'Bearer test-shipping-secret'))).status).toBe(503)
    expect(mocks.updateMany).not.toHaveBeenCalled()
  })
  it('accepts the trusted sender and preserves delivery updates', async () => {
    expect((await shipping(post(payload, 'Bearer test-shipping-secret'))).status).toBe(200)
    expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { trackingNumber: 'TRACK-1' },
      data: expect.objectContaining({ deliveryStatus: 'Delivered', status: 'DELIVERED', trackingProgress: 100 }),
    }))
  })
})

describe.each([
  ['simulation', () => simulate(post({ trackingNumber: 'TRACK-1', step: 'delivered' }))],
  ['diagnostics', () => diagnostics()],
  ['order diagnostics', () => orderDiagnostics()],
] as const)('admin-only %s', (_name, run) => {
  it.each(['anonymous', 'customer', 'forged', 'expired', 'archived', 'customer-in-admin-cookie'])('rejects %s access', async (kind) => {
    if (kind === 'customer') session('owner')
    if (kind === 'forged') mocks.cookies.set('repixl-admin-session-token', 'forged.signature')
    if (kind === 'expired') session('admin', true, 3600001)
    if (kind === 'archived') {
      session('admin', true)
      mocks.user.mockResolvedValue({ ...admin, isArchived: true })
    }
    if (kind === 'customer-in-admin-cookie') session('owner', true)
    expect((await run()).status).toBe(401)
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(mocks.groupBy).not.toHaveBeenCalled()
    expect(mocks.findMany).not.toHaveBeenCalled()
    expect(mocks.count).not.toHaveBeenCalled()
    expect(mocks.updateMany).not.toHaveBeenCalled()
  })
})

it('allows an admin to simulate a shipping update with the server credential', async () => {
  session('admin', true)
  const response = await simulate(post({ trackingNumber: 'TRACK-1', step: 'delivered' }))
  expect(response.status).toBe(200)
  const [url, options] = mocks.fetch.mock.calls[0]
  expect(url).toBe('https://store.example.com/api/webhooks/shipping')
  expect(options.headers.Authorization).toBe('Bearer test-shipping-secret')
  expect(options.redirect).toBe('error')
  expect(JSON.parse(options.body)).toEqual(payloadWithDescription())
  expect(await response.text()).not.toContain('test-shipping-secret')
})
function payloadWithDescription() {
  return { tracking_number: 'TRACK-1', status_code: 'DE', status_description: 'Your camera has been delivered. Enjoy your new camera!' }
}

it('fails closed for admin simulation without webhook configuration', async () => {
  session('admin', true)
  vi.stubEnv('SHIPPING_WEBHOOK_SECRET', '')
  expect((await simulate(post({ trackingNumber: 'TRACK-1', step: 'delivered' }))).status).toBe(503)
  expect(mocks.fetch).not.toHaveBeenCalled()
})

it('returns only aggregate diagnostics to admins', async () => {
  session('admin', true)
  mocks.groupBy.mockResolvedValueOnce([{ status: 'PROCESSING', _count: { _all: 2 } }])
    .mockResolvedValueOnce([{ paymentStatus: 'PENDING', _count: { _all: 2 } }])
  const response = await diagnostics()
  expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toContain('no-store')
  expect(await response.json()).toEqual({
    ordersByStatus: [{ status: 'PROCESSING', count: 2 }],
    ordersByPaymentStatus: [{ paymentStatus: 'PENDING', count: 2 }],
  })
  expect(mocks.findFirst).not.toHaveBeenCalled()
})

it('does not expose database error details in diagnostics', async () => {
  session('admin', true)
  mocks.groupBy.mockRejectedValue(new Error('sensitive connection string'))
  const response = await diagnostics()
  expect(response.status).toBe(500)
  expect(await response.text()).not.toContain('sensitive')
})

describe('tracking ownership', () => {
  it('rejects anonymous requests before order lookup', async () => {
    expect((await track()).status).toBe(401)
    expect(mocks.findFirst).not.toHaveBeenCalled()
  })
  it.each(['ORDER-1', 'TRACK-1'])('rejects a different customer using %s', async (number) => {
    session('other-user')
    expect((await track(number)).status).toBe(404)
    expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: {
      userId: 'other-user', OR: [{ orderNumber: number }, { trackingNumber: number }],
    } }))
  })
  it('returns the same response for an unknown order', async () => {
    session('owner')
    mocks.findFirst.mockResolvedValue(null)
    expect((await track()).status).toBe(404)
  })
  it.each(['owner', 'admin'])('streams only delivery information to %s', async (id) => {
    session(id, id === 'admin')
    const response = await track()
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toContain('private, no-store')
    const reader = response.body!.getReader()
    try {
      const { value } = await reader.read()
      expect(new TextDecoder().decode(value)).toBe('data: {"status":"In Transit","progress":50,"description":"On the way"}\n\n')
    } finally { await reader.cancel() }
  })
  it('rechecks ownership while polling and stops if ownership changes', async () => {
    vi.useFakeTimers()
    session('owner')
    const response = await track()
    const reader = response.body!.getReader()
    await reader.read()
    mocks.findFirst.mockResolvedValue(null)
    await vi.advanceTimersByTimeAsync(3000)
    expect(mocks.findFirst).toHaveBeenLastCalledWith(expect.objectContaining({ where: { id: 'order-id', userId: 'owner' } }))
    expect((await reader.read()).done).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })
  it('closes an open stream when the account is archived', async () => {
    vi.useFakeTimers()
    session('owner')
    const response = await track()
    const reader = response.body!.getReader()
    await reader.read()
    mocks.user.mockResolvedValue({ ...customer, isArchived: true })
    await vi.advanceTimersByTimeAsync(3000)
    expect((await reader.read()).done).toBe(true)
    expect(mocks.findFirst).toHaveBeenCalledTimes(1)
  })
  it('continues streaming changes for the owner and cleans up on disconnect', async () => {
    vi.useFakeTimers()
    session('owner')
    const abort = new AbortController()
    const response = await track('TRACK-1', abort.signal)
    const reader = response.body!.getReader()
    await reader.read()
    mocks.findFirst.mockResolvedValue({ ...order, trackingProgress: 100, updatedAt: new Date('2026-09-02') })
    await vi.advanceTimersByTimeAsync(3000)
    expect(new TextDecoder().decode((await reader.read()).value)).toContain('"progress":100')
    abort.abort()
    expect((await reader.read()).done).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })
})


it('keeps order diagnostics aggregate-only even for admins', async () => {
  session('admin', true)
  const response = await orderDiagnostics()
  expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toContain('no-store')
  expect(await response.json()).toEqual({ summary: {
    totalOrders: 2, uniqueUserCount: 1, byStatus: {}, byPaymentStatus: {}, byArchived: {},
  } })
  expect(mocks.findMany).toHaveBeenCalledWith({ distinct: ['userId'], select: { userId: true } })
})
