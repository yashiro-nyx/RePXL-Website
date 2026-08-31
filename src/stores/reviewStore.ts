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
  localStorage.setItem('repixl-reviews', JSON.stringify(reviews))
}

// Seed reviews for initial data
const seedReviews: Review[] = [
  {
    id: 'seed-1', productSlug: 'canon-powershot-a520', reviewerName: 'Mia R.',
    reviewerEmail: 'mia@example.com', rating: 5,
    comment: 'The condition grading is legit — arrived exactly as described. That warm 2004 sensor look is unmatched.',
    date: 'June 15, 2026', verifiedPurchase: true,
  },
  {
    id: 'seed-2', productSlug: 'canon-powershot-a520', reviewerName: 'Jordan T.',
    reviewerEmail: 'jordan@example.com', rating: 4,
    comment: 'Great little camera. Only minor scuff on the battery door that wasn\'t visible in photos, but functionally perfect.',
    date: 'May 28, 2026', verifiedPurchase: true,
  },
  {
    id: 'seed-3', productSlug: 'nikon-coolpix-3200', reviewerName: 'Alyssa K.',
    reviewerEmail: 'alyssa@example.com', rating: 5,
    comment: 'Mint condition means mint condition here. Looks like it was never used. The colors from this sensor are chef\'s kiss.',
    date: 'June 2, 2026', verifiedPurchase: true,
  },
  {
    id: 'seed-4', productSlug: 'sony-cybershot-w800', reviewerName: 'Sam D.',
    reviewerEmail: 'sam@example.com', rating: 3,
    comment: 'Decent camera for the price. The "Good" condition rating was accurate — visible wear but works fine.',
    date: 'May 10, 2026', verifiedPurchase: false,
  },
  {
    id: 'seed-5', productSlug: 'sony-cybershot-w800', reviewerName: 'Chris L.',
    reviewerEmail: 'chris@example.com', rating: 4,
    comment: 'Really impressed by the 20MP sensor on a digicam this old. Great for social media content.',
    date: 'April 22, 2026', verifiedPurchase: true,
  },
  {
    id: 'seed-6', productSlug: 'fujifilm-finepix-f30', reviewerName: 'Taylor M.',
    reviewerEmail: 'taylor@example.com', rating: 5,
    comment: 'The legendary F30 — ISO performance that cameras twice the price couldn\'t match in 2006. Still holds up.',
    date: 'June 8, 2026', verifiedPurchase: true,
  },
  {
    id: 'seed-7', productSlug: 'panasonic-lumix-dmc-fz7', reviewerName: 'Riley N.',
    reviewerEmail: 'riley@example.com', rating: 4,
    comment: '12x zoom in a compact body is wild. The Leica-branded lens produces lovely images. Shipping was fast too.',
    date: 'May 18, 2026', verifiedPurchase: true,
  },
  {
    id: 'seed-8', productSlug: 'panasonic-lumix-dmc-fz7', reviewerName: 'Morgan P.',
    reviewerEmail: 'morgan@example.com', rating: 5,
    comment: 'This was my first digicam in high school. Bought it again for nostalgia and it\'s in better shape than my original.',
    date: 'April 30, 2026', verifiedPurchase: false,
  },
]

export const useReviewStore = create<ReviewState>((set, get) => ({
  reviews: seedReviews,

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
    try {
      const reviews = await reviewService.listAll(seedReviews)
      if (reviews.length > 0) set({ reviews })
    } catch {
      // keep current (seed) data
    }
  },
}))
