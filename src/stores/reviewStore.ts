'use client'

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
  updateReview: (id: string, data: Partial<Pick<Review, 'rating' | 'comment'>>) => Promise<void>
  deleteReview: (id: string) => Promise<void>
  getProductReviews: (slug: string) => Review[]
  getUserReviews: (email: string) => Review[]
  getUserReviewForProduct: (email: string, slug: string) => Review | undefined
  getAverageRating: (slug: string) => number
  getReviewCount: (slug: string) => number
  hydrate: () => Promise<void>
}

function persist(reviews: Review[]) {
  try {
    localStorage.setItem('repixl-reviews', JSON.stringify(reviews))
  } catch { /* ignore */ }
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  // Empty initial state — no seed/fake reviews. Real data loads via hydrate()
  // or the API-backed components (Account Reviews, Product Details).
  reviews: [],

  addReview: async (review) => {
    // Optimistic insert with a temp id; reconcile with the service result.
    const tempId = `review-${Date.now().toString(36)}`
    const optimistic: Review = { ...review, id: tempId }
    set({ reviews: [optimistic, ...get().reviews] })
    persist(get().reviews)
    const created = await reviewService.add(review)
    // Preserve the reviewerEmail locally (API doesn't return it) so the
    // "your review" lookups keep working this session.
    const merged: Review = { ...created, reviewerEmail: review.reviewerEmail || created.reviewerEmail }
    set({ reviews: get().reviews.map((r) => (r.id === tempId ? merged : r)) })
    persist(get().reviews)
  },

  updateReview: async (id, data) => {
    set({ reviews: get().reviews.map((r) => (r.id === id ? { ...r, ...data } : r)) })
    persist(get().reviews)
    await reviewService.update(id, data)
  },

  deleteReview: async (id) => {
    set({ reviews: get().reviews.filter((r) => r.id !== id) })
    persist(get().reviews)
    await reviewService.remove(id)
  },

  getProductReviews: (slug) => get().reviews.filter((r) => r.productSlug === slug),
  getUserReviews: (email) => get().reviews.filter((r) => r.reviewerEmail === email),
  getUserReviewForProduct: (email, slug) => get().reviews.find((r) => r.reviewerEmail === email && r.productSlug === slug),
  getAverageRating: (slug) => {
    const pr = get().reviews.filter((r) => r.productSlug === slug)
    if (pr.length === 0) return 0
    return pr.reduce((sum, r) => sum + r.rating, 0) / pr.length
  },
  getReviewCount: (slug) => get().reviews.filter((r) => r.productSlug === slug).length,

  hydrate: async () => {
    // Hydrate from localStorage cache only — the API-backed components
    // (Account → Reviews, Product Detail → Reviews) fetch directly from
    // /api/reviews and do not depend on this store for authoritative data.
    try {
      const stored = localStorage.getItem('repixl-reviews')
      if (stored) {
        const parsed: Review[] = JSON.parse(stored)
        // Only restore user-written reviews (never restore seed/fake ones)
        const real = parsed.filter((r) => !r.id.startsWith('seed-'))
        if (real.length > 0) set({ reviews: real })
      }
    } catch { /* ignore */ }
  },
}))
