'use client'

import { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface LightboxImage {
  src: string
  alt?: string
}

interface ImageLightboxProps {
  images: LightboxImage[]
  /** Index of the currently open image, or null if closed */
  activeIndex: number | null
  onClose: () => void
  onNavigate?: (index: number) => void
}

export function ImageLightbox({ images, activeIndex, onClose, onNavigate }: ImageLightboxProps) {
  const isOpen = activeIndex !== null
  const hasMultiple = images.length > 1

  const goNext = useCallback(() => {
    if (activeIndex === null || !hasMultiple) return
    onNavigate?.((activeIndex + 1) % images.length)
  }, [activeIndex, hasMultiple, images.length, onNavigate])

  const goPrev = useCallback(() => {
    if (activeIndex === null || !hasMultiple) return
    onNavigate?.((activeIndex - 1 + images.length) % images.length)
  }, [activeIndex, hasMultiple, images.length, onNavigate])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    document.addEventListener('keydown', handleKey)
    // Prevent background scroll
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose, goNext, goPrev])

  if (!isOpen || activeIndex === null) return null
  const current = images[activeIndex]
  if (!current) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close image viewer"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 6 6 18" /><path d="m6 6 12 12" />
        </svg>
      </button>

      {/* Counter */}
      {hasMultiple && (
        <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 font-mono text-[10px] text-white/70">
          {activeIndex + 1} / {images.length}
        </div>
      )}

      {/* Prev button */}
      {hasMultiple && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); goPrev() }}
          aria-label="Previous image"
          className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      )}

      {/* Image */}
      <div
        className="max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.src}
          alt={current.alt ?? `Image ${activeIndex + 1}`}
          className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
        />
      </div>

      {/* Next button */}
      {hasMultiple && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); goNext() }}
          aria-label="Next image"
          className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      )}
    </div>,
    document.body
  )
}
