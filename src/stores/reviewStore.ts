'use client'

import { scopedAccountUpdate } from '@/lib/account-scope'

import { useAuthStore } from './authStore'
import { reportActionFailure } from '@/lib/action-error'
import { create } from 'zustand'
import { reviewService } from '@/lib/data/reviewService'

export interface Review {
  id: string
  productSlug: string
  reviewerName: string
  reviewerEmail: string
  rating: number // 1-5
  comment: string
  date: string
  verifiedPurchase: boolean
}

interface ReviewState {
  reviews: Review[]
  addReview: (review: Omit<Review, 'id'>) => Promise<void>
  updateReview: (
    id: string,
    data: Partial<Pick<Review, 'rating' | 'comment'>>
  ) => Promise<void>
  deleteReview: (id: string) => Promise<void>
  getProductReviews: (slug: string) => Review[]
  getUserReviews: (email: string) => Review[]
  getUserReviewForProduct: (email: string, slug: string) => Review | undefined
  getAverageRating: (slug: string) => number
  getReviewCount: (slug: string) => number
  hydrate: () => Promise<void>
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  // Empty initial state — no seed/fake reviews. Real data loads via hydrate()
  // or the API-backed components (Account Reviews, Product Details).
  reviews: [],

  addReview: async (review) => {
    const commit = scopedAccountUpdate<Partial<ReviewState>>(set)
    const created = await reviewService.add(review)
    commit({
      reviews: [
        {
          ...created,
          reviewerEmail: review.reviewerEmail || created.reviewerEmail,
        },
        ...get().reviews,
      ],
    })
  },

  updateReview: async (id, data) => {
    const commit = scopedAccountUpdate<Partial<ReviewState>>(set)
    await reviewService.update(id, data)
    commit({
      reviews: get().reviews.map((r) => (r.id === id ? { ...r, ...data } : r)),
    })
  },

  deleteReview: async (id) => {
    const commit = scopedAccountUpdate<Partial<ReviewState>>(set)
    await reviewService.remove(id)
    commit({ reviews: get().reviews.filter((r) => r.id !== id) })
  },

  getProductReviews: (slug) =>
    get().reviews.filter((r) => r.productSlug === slug),
  getUserReviews: (email) =>
    get().reviews.filter((r) => r.reviewerEmail === email),
  getUserReviewForProduct: (email, slug) =>
    get().reviews.find(
      (r) => r.reviewerEmail === email && r.productSlug === slug
    ),
  getAverageRating: (slug) => {
    const pr = get().reviews.filter((r) => r.productSlug === slug)
    if (pr.length === 0) return 0
    return pr.reduce((sum, r) => sum + r.rating, 0) / pr.length
  },
  getReviewCount: (slug) =>
    get().reviews.filter((r) => r.productSlug === slug).length,

  hydrate: async () => {
    const commit = scopedAccountUpdate<Partial<ReviewState>>(set)
    try {
      commit({ reviews: await reviewService.listAll([]) })
    } catch {
      commit({ reviews: [] })
      reportActionFailure()
    }
  },
}))

useAuthStore.subscribe((state, previous) => {
  if (state.userEmail !== previous.userEmail || state.role !== previous.role)
    useReviewStore.setState({ reviews: [] })
})
