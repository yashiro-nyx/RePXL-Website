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

let hydrateInFlight: Promise<void> | null = null
let lastHydrated = 0
const REVIEWS_FRESHNESS_MS = 30_000

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

  hydrate: () => {
    // If reviews are already loaded and within freshness TTL, skip refetching
    if (get().reviews.length > 0 && Date.now() - lastHydrated < REVIEWS_FRESHNESS_MS) {
      return Promise.resolve()
    }
    // Share identical in-flight fetch across concurrent component mounts (e.g. FeaturedCarousel + BestSellers)
    if (hydrateInFlight) return hydrateInFlight

    const commit = scopedAccountUpdate<Partial<ReviewState>>(set)
    hydrateInFlight = reviewService
      .listAll([])
      .then((reviews) => {
        lastHydrated = Date.now()
        commit({ reviews })
      })
      .catch(() => {
        commit({ reviews: [] })
        reportActionFailure()
      })
      .finally(() => {
        hydrateInFlight = null
      })

    return hydrateInFlight
  },
}))

useAuthStore.subscribe((state, previous) => {
  if (state.userEmail !== previous.userEmail || state.role !== previous.role) {
    lastHydrated = 0
    useReviewStore.setState({ reviews: [] })
  }
})
