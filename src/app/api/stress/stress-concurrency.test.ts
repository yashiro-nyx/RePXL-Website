import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as healthCheck } from '../health/route'
import { POST as addToCart } from '../cart/route'
import { POST as addToWishlist } from '../wishlist/route'
import * as authHelpers from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/auth-helpers', () => ({
  getCurrentUser: vi.fn(),
  getCurrentAdmin: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    product: {
      findUnique: vi.fn(),
    },
    cartItem: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    wishlistItem: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

describe('Stress & Concurrency Readiness Tests', () => {
  const mockUser = {
    id: 'usr_stress_123',
    email: 'stress@repixl.com',
    role: 'CUSTOMER',
  }

  const mockProduct = {
    id: 'prod_stress_cam',
    slug: 'sony-cybershot-dsc-t90',
    name: 'Sony Cyber-shot DSC-T90',
    price: 18990,
    stock: 5,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(mockUser as any)
  })

  describe('Health Check Endpoint (GET /api/health)', () => {
    it('returns 200 with healthy status and database metrics when connected', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ '?column?': 1 }])

      const res = await healthCheck()
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.status).toBe('healthy')
      expect(data.database.status).toBe('connected')
      expect(data.database.latencyMs).toBeGreaterThanOrEqual(0)
      expect(data.memory.heapUsedMb).toBeGreaterThan(0)
      expect(typeof data.uptimeSeconds).toBe('number')
    })

    it('returns 503 with degraded status when database is unreachable', async () => {
      vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('Connection terminated'))

      const res = await healthCheck()
      expect(res.status).toBe(503)

      const data = await res.json()
      expect(data.status).toBe('degraded')
      expect(data.database.status).toBe('error')
    })
  })

  describe('Concurrent Add to Cart (POST /api/cart)', () => {
    it('handles race conditions (P2002 conflict) gracefully by updating existing row', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct as any)

      // Initial check returns null (both parallel requests think item is not yet in cart)
      vi.mocked(prisma.cartItem.findUnique)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'cart_1',
          userId: mockUser.id,
          productId: mockProduct.id,
          quantity: 1,
        } as any)

      // First create succeeds, second throws P2002 duplicate key constraint
      const p2002Error: any = new Error('Unique constraint failed')
      p2002Error.code = 'P2002'

      vi.mocked(prisma.cartItem.create)
        .mockRejectedValueOnce(p2002Error)

      vi.mocked(prisma.cartItem.update).mockResolvedValue({
        id: 'cart_1',
        userId: mockUser.id,
        productId: mockProduct.id,
        quantity: 2,
        product: mockProduct,
      } as any)

      const req = new NextRequest('http://localhost:3000/api/cart', {
        method: 'POST',
        body: JSON.stringify({ productId: mockProduct.id, quantity: 1 }),
      })

      const res = await addToCart(req)
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.quantity).toBe(2)
      expect(prisma.cartItem.update).toHaveBeenCalled()
    })
  })

  describe('Concurrent Add to Wishlist (POST /api/wishlist)', () => {
    it('handles race conditions (P2002 conflict) gracefully and returns idempotent 201/200', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct as any)

      // First call check: not in wishlist
      vi.mocked(prisma.wishlistItem.findUnique)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'wish_1',
          userId: mockUser.id,
          productId: mockProduct.id,
          product: mockProduct,
        } as any)

      // Concurrent insert throws P2002
      const p2002Error: any = new Error('Unique constraint failed')
      p2002Error.code = 'P2002'
      vi.mocked(prisma.wishlistItem.create).mockRejectedValueOnce(p2002Error)

      const req = new NextRequest('http://localhost:3000/api/wishlist', {
        method: 'POST',
        body: JSON.stringify({ productId: mockProduct.id }),
      })

      const res = await addToWishlist(req)
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.id).toBe('wish_1')
    })
  })
})
