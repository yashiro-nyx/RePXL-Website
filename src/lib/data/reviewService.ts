'use client'

// Client reviews are keyed by productSlug + reviewerEmail; the API keys by
// productId + userId (derived from the session cookie).

import { apiClient } from '@/lib/api-client'
import { getProductId } from './productService'
import {
  apiToClientReview,
  type ApiReview,
  type ApiProduct,
} from '@/lib/mappers'
import type { Review } from '@/stores/reviewStore'

async function resolveProductId(slug: string): Promise<string | undefined> {
  const cached = getProductId(slug)
  if (cached) return cached
  return (
    await apiClient.get<ApiProduct>(`/api/products/${encodeURIComponent(slug)}`)
  ).id
}

export const reviewService = {
  /** Load ALL reviews (client keeps them in memory and filters by slug). */
  async listAll(seed: Review[]): Promise<Review[]> {
    const response = await apiClient.getPaginated<ApiReview>(
      '/api/reviews?limit=100'
    )
    return (response.data ?? []).map((review) => apiToClientReview(review))
  },

  async add(review: Omit<Review, 'id'>): Promise<Review> {
    const productId = await resolveProductId(review.productSlug)
    if (!productId) throw new Error('unknown product')
    const created = await apiClient.post<ApiReview>('/api/reviews', {
      productId,
      rating: review.rating,
      comment: review.comment,
    })
    return apiToClientReview(created, review.productSlug)
  },

  async update(
    id: string,
    data: Partial<Pick<Review, 'rating' | 'comment'>>
  ): Promise<void> {
    await apiClient.put(`/api/reviews/${id}`, data)
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/api/reviews/${id}`)
  },
}
