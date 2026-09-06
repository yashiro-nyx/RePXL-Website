'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button, ImageLightbox } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import { type Review } from '@/stores/reviewStore'

export default function ReviewsPanel() {
  const { userEmail } = useAuthStore()
  const [dbReviews, setDbReviews] = useState<{
    id: string
    rating: number
    comment: string
    createdAt: string
    verifiedPurchase: boolean
    product: { slug: string; name: string; image: string }
    images: { id: string; secureUrl: string }[]
  }[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [lightboxReviewId, setLightboxReviewId] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  useEffect(() => {
    // ?mine=true — server enforces WHERE userId = session.user.id
    // Never fetches another user's reviews
    fetch('/api/reviews?mine=true&limit=100', { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        setDbReviews(json.data ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = searchQuery.trim()
    ? dbReviews.filter((r) => r.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    : dbReviews

  const lightboxImages = lightboxReviewId
    ? (dbReviews.find((r) => r.id === lightboxReviewId)?.images ?? []).map((img, i) => ({
        src: img.secureUrl,
        alt: `Review photo ${i + 1}`,
      }))
    : []

  return (
    <div className="space-y-4">
      <div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">— Community</span>
        <h2 className="mt-1 font-display text-lg font-semibold text-repixl-text-light">My Reviews</h2>
      </div>

      <input
        type="search"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search reviews by camera name…"
        className="w-full rounded-xl border border-repixl-muted/20 bg-repixl-charcoal px-4 py-3 text-sm text-repixl-text-light placeholder:text-repixl-muted/40 focus:border-repixl-muted/40 focus:outline-none"
      />

      {loading && (
        <div className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-8 text-center">
          <p className="text-sm text-repixl-muted">Loading reviews…</p>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-10 text-center">
          <p className="text-sm text-repixl-text-light/60">No reviews yet.</p>
          <Link href="/products" className="mt-3 inline-block"><Button variant="secondary" size="md">Browse Cameras</Button></Link>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((review) => (
            <div key={review.id} className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={`/products/${review.product?.slug}`} className="text-sm font-medium text-repixl-text-light hover:underline">
                    {review.product?.name ?? review.product?.slug}
                  </Link>
                  <div className="mt-1 flex gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <svg key={i} xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill={i < review.rating ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" className={i < review.rating ? 'text-repixl-warning' : 'text-repixl-muted/40'} aria-hidden="true">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    ))}
                  </div>
                </div>
                <span className="font-mono text-[10px] text-repixl-muted shrink-0">
                  {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <p className="mt-2 text-sm text-repixl-text-light/70">{review.comment}</p>

              {/* Review images */}
              {review.images && review.images.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {review.images.map((img, i) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => { setLightboxReviewId(review.id); setLightboxIndex(i) }}
                      aria-label={`View review photo ${i + 1}`}
                      className="h-16 w-16 overflow-hidden rounded-lg border border-repixl-muted/20 bg-repixl-bg transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.secureUrl} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {review.verifiedPurchase && (
                <span className="mt-2 inline-block rounded-full bg-repixl-success/15 px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-repixl-success">
                  Verified Purchase
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Review image lightbox */}
      <ImageLightbox
        images={lightboxImages}
        activeIndex={lightboxIndex}
        onClose={() => { setLightboxReviewId(null); setLightboxIndex(null) }}
        onNavigate={setLightboxIndex}
      />
    </div>
  )
}

