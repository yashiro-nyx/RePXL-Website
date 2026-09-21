import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
const mock = vi.hoisted(() => ({
  currentUser: vi.fn(),
  currentAdmin: vi.fn(),
  reviewFindMany: vi.fn(),
  reviewFindUnique: vi.fn(),
  reviewFindFirst: vi.fn(),
  reviewCount: vi.fn(),
  reviewAggregate: vi.fn(),
  reviewCreate: vi.fn(),
  reviewUpdate: vi.fn(),
  reviewDelete: vi.fn(),
  productFindUnique: vi.fn(),
  orderItemFindFirst: vi.fn(),
}))

vi.mock('@/lib/auth-helpers', () => ({
  getCurrentUser: mock.currentUser,
  getCurrentAdmin: mock.currentAdmin,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    review: {
      findMany: mock.reviewFindMany,
      findUnique: mock.reviewFindUnique,
      findFirst: mock.reviewFindFirst,
      count: mock.reviewCount,
      aggregate: mock.reviewAggregate,
      create: mock.reviewCreate,
      update: mock.reviewUpdate,
      delete: mock.reviewDelete,
    },
    product: {
      findUnique: mock.productFindUnique,
    },
    orderItem: {
      findFirst: mock.orderItemFindFirst,
    },
  },
}))

import { GET, POST } from '@/app/api/reviews/route'
import { DELETE } from '@/app/api/reviews/[reviewId]/route'

describe('Reviews API: GET /api/reviews', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('rejects GET ?mine=true when user is unauthenticated', async () => {
    mock.currentUser.mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/reviews?mine=true')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns authenticated customer reviews when ?mine=true', async () => {
    mock.currentUser.mockResolvedValue({
      id: 'cust_123',
      email: 'customer@repxl.com',
      firstName: 'Digicam',
      lastName: 'Enthusiast',
      role: 'CUSTOMER',
      isSuperAdmin: false,
    })

    const sampleReview = {
      id: 'rev_1',
      productId: 'prod_1',
      userId: 'cust_123',
      reviewerName: 'Digicam E.',
      rating: 5,
      comment: 'Super crisp CCD sensor and nostalgic color rendition!',
      verifiedPurchase: true,
      createdAt: new Date().toISOString(),
      product: { slug: 'canon-ixy-digital-510', name: 'Canon IXY Digital 510', image: 'https://img.test' },
      images: [],
    }

    mock.reviewCount.mockResolvedValue(1)
    mock.reviewFindMany.mockResolvedValue([sampleReview])

    const req = new NextRequest('http://localhost/api/reviews?mine=true&limit=50')
    const res = await GET(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(1)
    expect(json.data[0].comment).toContain('CCD sensor')
    expect(mock.reviewFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'cust_123' }),
      })
    )
  })

  it('fetches public product reviews with rating aggregates for product details page', async () => {
    mock.reviewCount.mockResolvedValue(2)
    mock.reviewFindMany.mockResolvedValue([
      {
        id: 'rev_1',
        reviewerName: 'Alice M.',
        rating: 5,
        comment: 'Outstanding build quality.',
        createdAt: '2026-09-01T12:00:00Z',
      },
      {
        id: 'rev_2',
        reviewerName: 'Bob T.',
        rating: 4,
        comment: 'Great compact camera, lens is sharp.',
        createdAt: '2026-09-02T12:00:00Z',
      },
    ])
    mock.reviewAggregate.mockResolvedValue({
      _avg: { rating: 4.5 },
      _count: { _all: 2 },
    })

    const req = new NextRequest('http://localhost/api/reviews?productSlug=canon-ixy-digital-510&limit=50')
    const res = await GET(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(2)
    expect(json.averageRating).toBe(4.5)
    expect(json.totalReviews).toBe(2)
  })
})

describe('Reviews API: POST /api/reviews', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('requires authentication to post a review', async () => {
    mock.currentUser.mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ productId: 'prod_1', rating: 5, comment: 'Nice!' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('rejects invalid review payload (e.g. empty comment or rating out of bounds)', async () => {
    mock.currentUser.mockResolvedValue({ id: 'user_1', firstName: 'A', lastName: 'B' })

    const req = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ productId: 'prod_1', rating: 6, comment: '' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(422)
  })

  it('rejects review if product does not exist (404)', async () => {
    mock.currentUser.mockResolvedValue({ id: 'user_1', firstName: 'A', lastName: 'B' })
    mock.productFindUnique.mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ productId: 'nonexistent', rating: 5, comment: 'Great!' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it('prevents duplicate reviews from the same user on the same product (409)', async () => {
    mock.currentUser.mockResolvedValue({ id: 'user_1', firstName: 'A', lastName: 'B' })
    mock.productFindUnique.mockResolvedValue({ id: 'prod_1', name: 'Camera' })
    mock.reviewFindUnique.mockResolvedValue({ id: 'existing_review' })

    const req = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ productId: 'prod_1', rating: 5, comment: 'Duplicate attempt' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toBe('You have already reviewed this product')
  })

  it('creates review and marks verifiedPurchase: true when customer has purchased the item', async () => {
    const user = { id: 'cust_777', firstName: 'Jane', lastName: 'Doe' }
    mock.currentUser.mockResolvedValue(user)
    mock.productFindUnique.mockResolvedValue({ id: 'prod_1', name: 'Canon IXY' })
    mock.reviewFindUnique.mockResolvedValue(null) // no duplicate
    mock.orderItemFindFirst.mockResolvedValue({ id: 'order_item_1' }) // verified purchase
    mock.reviewCreate.mockImplementation(async ({ data }) => ({
      id: 'new_rev_123',
      ...data,
      createdAt: new Date().toISOString(),
      product: { slug: 'canon-ixy', name: 'Canon IXY' },
    }))

    const req = new NextRequest('http://localhost/api/reviews', {
      method: 'POST',
      body: JSON.stringify({
        productId: 'prod_1',
        rating: 5,
        comment: 'Colors straight out of the camera are stunning!',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.verifiedPurchase).toBe(true)
    expect(json.data.reviewerName).toBe('Jane D.')
  })
})

describe('Reviews API: DELETE /api/reviews/[reviewId]', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('blocks unauthenticated delete attempts (401)', async () => {
    mock.currentUser.mockResolvedValue(null)
    mock.currentAdmin.mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/reviews/rev_1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ reviewId: 'rev_1' }) })
    expect(res.status).toBe(401)
  })

  it('blocks users from deleting other users reviews (401)', async () => {
    mock.currentUser.mockResolvedValue({ id: 'cust_other' })
    mock.currentAdmin.mockResolvedValue(null)
    mock.reviewFindUnique.mockResolvedValue({ id: 'rev_1', userId: 'cust_owner' })

    const req = new NextRequest('http://localhost/api/reviews/rev_1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ reviewId: 'rev_1' }) })
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('You can only delete your own reviews')
  })

  it('allows author to delete their own review (200)', async () => {
    const ownerId = 'cust_owner'
    mock.currentUser.mockResolvedValue({ id: ownerId })
    mock.currentAdmin.mockResolvedValue(null)
    mock.reviewFindUnique.mockResolvedValue({ id: 'rev_1', userId: ownerId })
    mock.reviewDelete.mockResolvedValue({})

    const req = new NextRequest('http://localhost/api/reviews/rev_1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ reviewId: 'rev_1' }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.message).toBe('Review deleted')
    expect(mock.reviewDelete).toHaveBeenCalledWith({ where: { id: 'rev_1' } })
  })
})

describe('Mobile App Reviews Mapping and Contract Compatibility', () => {
  it('maps backend review response to ProductReview shape', () => {
    const backendReviews = [
      {
        id: 'rev_1',
        reviewerName: 'Sarah K.',
        rating: 5,
        comment: 'Looks and shoots like new.',
        createdAt: '2026-09-15T08:00:00Z',
      },
    ]

    const mapped = backendReviews.map((r) => ({
      id: r.id,
      author: r.reviewerName || 'Anonymous',
      rating: r.rating || 5,
      body: r.comment || '',
      date: r.createdAt,
    }))

    expect(mapped[0]).toEqual({
      id: 'rev_1',
      author: 'Sarah K.',
      rating: 5,
      body: 'Looks and shoots like new.',
      date: '2026-09-15T08:00:00Z',
    })
  })
})

