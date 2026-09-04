'use client'

import { useState } from 'react'
import { ImageLightbox } from './ImageLightbox'

interface ReviewImageThumbnailsProps {
  images: { src: string; alt?: string }[]
}

/**
 * Renders a row of review image thumbnails that open a lightbox when clicked.
 * Used in Account → Reviews and Product Details → Customer Reviews.
 */
export function ReviewImageThumbnails({ images }: ReviewImageThumbnailsProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (!images || images.length === 0) return null

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        {images.map((img, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setLightboxIndex(i)}
            aria-label={`View photo ${i + 1}`}
            className="h-16 w-16 overflow-hidden rounded-lg border border-repixl-muted/20 bg-repixl-bg transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.src} alt={img.alt ?? `Photo ${i + 1}`} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>

      <ImageLightbox
        images={images}
        activeIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />
    </>
  )
}
