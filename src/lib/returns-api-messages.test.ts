import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Verifies the customer-facing Returns API returns SAFE messages — no raw Zod
// JSON, paths, or metadata — for the exact scenarios in the task. Prisma-mock
// pattern (as in reviews.test.ts).

const mock = vi.hoisted(() => ({
  currentUser: vi.fn(),
  orderFindUnique: vi.fn(),
  returnFindFirst: vi.fn(),
}))

vi.mock('@/lib/auth-helpers', () => ({ getCurrentUser: mock.currentUser }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: { findUnique: mock.orderFindUnique },
    returnRequest: { findFirst: mock.returnFindFirst, findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
    returnRequestImage: { create: vi.fn() },
    adminLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}))
vi.mock('@/lib/notifications', () => ({ emitNotification: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/cloudinary', () => ({ deleteFromCloudinary: vi.fn(), MAX_IMAGES: 5 }))

import { POST } from '@/app/api/returns/route'

function req(body: unknown) {
  return new NextRequest('http://localhost/api/returns', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

// Raw Zod/validation metadata that must never appear in the response body.
// (The stable machine `code` like "VALIDATION" is part of the SAFE contract and
// is intentionally allowed.)
const TECHNICAL = ['too_small', 'invalid_enum_value', '"minimum"', '"path"', 'ZodError', 'Validation error: [']

async function expectSafe(res: Response) {
  const json = await res.json()
  const serialized = JSON.stringify(json)
  for (const t of TECHNICAL) expect(serialized).not.toContain(t)
  return json
}

describe('POST /api/returns — safe validation messages', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mock.currentUser.mockResolvedValue({ id: 'cust_1', email: 'c@repxl.com' })
  })

  it('details shorter than 10 chars → friendly field message, no raw Zod', async () => {
    const res = await POST(req({ orderNumber: 'RPX-1', reason: 'damaged', details: 'too short' }))
    expect(res.status).toBe(422)
    const json = await expectSafe(res)
    expect(json.code).toBe('VALIDATION')
    expect(json.fieldErrors?.details).toBe('Please describe the issue in at least 10 characters.')
  })

  it('invalid reason enum → friendly message, no enum internals', async () => {
    const res = await POST(req({ orderNumber: 'RPX-1', reason: 'NOT_A_REASON', details: 'a valid long description of the issue' }))
    expect(res.status).toBe(422)
    const json = await expectSafe(res)
    expect(json.fieldErrors?.reason).toBe('Please select a valid return reason.')
  })

  it('unauthenticated → 401 with a safe message', async () => {
    mock.currentUser.mockResolvedValue(null)
    const res = await POST(req({ orderNumber: 'RPX-1', reason: 'DAMAGED' }))
    expect(res.status).toBe(401)
    await expectSafe(res)
  })
})
