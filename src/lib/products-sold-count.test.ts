import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Verifies the REAL sold-count aggregate on GET /api/products/[slug]:
//  - sums OrderItem.quantity (not order records)
//  - only for DELIVERED/COMPLETED orders (cancelled/failed/pending excluded)
//  - returns 0 when a product has never sold
// Uses the same hoisted prisma-mock pattern as reviews.test.ts.

const mock = vi.hoisted(() => ({
  productFindUnique: vi.fn(),
  orderItemAggregate: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: { findUnique: mock.productFindUnique },
    orderItem: { aggregate: mock.orderItemAggregate },
  },
}))

// Auth is only used by the mutation handlers, but the module imports it — stub it.
vi.mock('@/lib/auth-helpers', () => ({
  getCurrentAdmin: vi.fn().mockResolvedValue(null),
}))

import { GET } from '@/app/api/products/[slug]/route'

const params = (slug: string) => ({ params: Promise.resolve({ slug }) })

describe('GET /api/products/[slug] — real sold count', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 404 when the product does not exist', async () => {
    mock.productFindUnique.mockResolvedValue(null)
    const res = await GET(new NextRequest('http://localhost/api/products/missing'), params('missing'))
    expect(res.status).toBe(404)
  })

  it('sums OrderItem.quantity for DELIVERED/COMPLETED orders (2+1+3 = 6)', async () => {
    mock.productFindUnique.mockResolvedValue({ id: 'prod_1', slug: 'canon-ixy', name: 'Canon IXY' })
    mock.orderItemAggregate.mockResolvedValue({ _sum: { quantity: 6 } })

    const res = await GET(new NextRequest('http://localhost/api/products/canon-ixy'), params('canon-ixy'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.soldCount).toBe(6)

    // The aggregate must SUM quantity and be scoped to genuine completed sales.
    expect(mock.orderItemAggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        _sum: { quantity: true },
        where: expect.objectContaining({
          productId: 'prod_1',
          order: { status: { in: ['DELIVERED', 'COMPLETED'] } },
        }),
      })
    )
  })

  it('excludes cancelled/failed/pending orders by construction (status filter)', async () => {
    mock.productFindUnique.mockResolvedValue({ id: 'prod_2', slug: 'nikon-x', name: 'Nikon X' })
    mock.orderItemAggregate.mockResolvedValue({ _sum: { quantity: 4 } })

    await GET(new NextRequest('http://localhost/api/products/nikon-x'), params('nikon-x'))

    const call = mock.orderItemAggregate.mock.calls[0][0]
    const statuses: string[] = call.where.order.status.in
    expect(statuses).toEqual(['DELIVERED', 'COMPLETED'])
    expect(statuses).not.toContain('CANCELLED')
    expect(statuses).not.toContain('PROCESSING')
  })

  it('reports 0 (not null) when the product has never sold', async () => {
    mock.productFindUnique.mockResolvedValue({ id: 'prod_3', slug: 'sony-y', name: 'Sony Y' })
    mock.orderItemAggregate.mockResolvedValue({ _sum: { quantity: null } })

    const res = await GET(new NextRequest('http://localhost/api/products/sony-y'), params('sony-y'))
    const json = await res.json()
    expect(json.data.soldCount).toBe(0)
  })
})
