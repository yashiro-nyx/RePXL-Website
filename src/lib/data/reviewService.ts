'use client'

// Review data service: API-first with localStorage fallback.
// Client reviews are keyed by productSlug + reviewerEmail; the API keys by
// productId + userId (derived from the session cookie).

import { apiClient } from '@/lib/api-client'
import { withFallback } from './fallback'
import { getProductId } from './productService'
import { apiToClientReview, type ApiReview, type ApiProduct } from '@/lib/mappers'
import type { Review } from '@/stores/reviewStore'

const LS_KEY = 'repixl-reviews'

function readLocal(): Review[] {
  try {
    const stored = localStorage.getItem(LS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function writeLocal(reviews: Review[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(reviews))
  } catch {
    /* ignore */
  }
}

async function resolveProductId(slug: string): Promise<string | undefined> {
  const cached = getProductId(slug)
  if (cached) return cached
  try {
    const p = await apiClient.get<ApiProduct>(`/api/products/${slug}`)
    return p.id
  } catch {
    return undefined
  }
}

interface ReviewsEnvelope {
  success: boolean
  data: ApiReview[]
}

export const reviewService = {
  /** Load ALL reviews (client keeps them in memory and filters by slug). */
  async listAll(seed: Review[]): Promise<Review[]> {
    return withFallback<Review[]>(
      async () => {
        // No global "all reviews" endpoint; fetch a wide page. The API returns
        // reviews with nested product{slug}, so slugs are preserved.
        const res = await fetch('/api/reviews?limit=100', { credentials: 'include' })
        if (!res.ok) {
          const status = res.status
          throw Object.assign(new Error('reviews fetch failed'), { status })
        }
        const json: ReviewsEnvelope = await res.json()
        return (json.data ?? []).map((r) => apiToClientReview(r))
      },
      () => {
        const local = readLocal()
        return local.length > 0 ? local : seed
      },
      { mirror: (reviews) => writeLocal(reviews) }
    )
  },

  async add(review: Omit<Review, 'id'>): Promise<Review> {
    return withFallback<Review>(
      async () => {
        const productId = await resolveProductId(review.productSlug)
        if (!productId) throw new Error('unknown product')
        const created = await apiClient.post<ApiReview>('/api/reviews', {
          productId,
          rating: review.rating,
          comment: review.comment,
        })
        return apiToClientReview(created, review.productSlug)
      },
      () => {
        const id = `review-${Date.now().toString(36)}`
        const withId: Review = { ...review, id }
        writeLocal([withId, ...readLocal()])
        return withId
      }
    )
  },

  async update(
    id: string,
    data: Partial<Pick<Review, 'rating' | 'comment'>>
  ): Promise<void> {
    await withFallback<void>(
      async () => {
        await apiClient.put(`/api/reviews/${id}`, data)
      },
      () => {
        writeLocal(readLocal().map((r) => (r.id === id ? { ...r, ...data } : r)))
      }
    )
  },

  async remove(id: string): Promise<void> {
    await withFallback<void>(
      async () => {
        await apiClient.delete(`/api/reviews/${id}`)
      },
      () => {
        writeLocal(readLocal().filter((r) => r.id !== id))
      }
    )
  },
}
