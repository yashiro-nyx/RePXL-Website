'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

/**
 * FilmStripLoader — A camera-roll / film-strip loading animation.
 *
 * Shows product-image thumbnails in film-strip frames scrolling
 * horizontally. The center frame is highlighted with a subtle focus
 * ring to mimic a camera viewfinder selecting a frame.
 *
 * Respects `prefers-reduced-motion` — the marquee scroll is disabled
 * and a single static frame with a pulsing opacity is shown instead.
 */

const FRAMES = [
  { src: '/images/product-canon-a520.svg',     alt: 'Canon A520'         },
  { src: '/images/product-fuji-f30.svg',        alt: 'Fuji F30'           },
  { src: '/images/product-kodak-c300.svg',      alt: 'Kodak C300'         },
  { src: '/images/product-nikon-coolpix.svg',   alt: 'Nikon Coolpix'      },
  { src: '/images/product-panasonic-fz7.svg',   alt: 'Panasonic FZ7'      },
  { src: '/images/product-sony-w800.svg',       alt: 'Sony W800'          },
  // duplicate for seamless loop
  { src: '/images/product-canon-a520.svg',     alt: 'Canon A520'         },
  { src: '/images/product-fuji-f30.svg',        alt: 'Fuji F30'           },
  { src: '/images/product-kodak-c300.svg',      alt: 'Kodak C300'         },
  { src: '/images/product-nikon-coolpix.svg',   alt: 'Nikon Coolpix'      },
  { src: '/images/product-panasonic-fz7.svg',   alt: 'Panasonic FZ7'      },
  { src: '/images/product-sony-w800.svg',       alt: 'Sony W800'          },
]

const FRAME_W = 96  // px — width of each frame cell
const FRAME_H = 80  // px — height of each frame cell
const FILM_HOLE_COUNT = 4 // sprocket holes per side per frame

interface FilmStripLoaderProps {
  /** Optional label shown below the strip */
  label?: string
  /** Extra class on the outer wrapper */
  className?: string
}

export function FilmStripLoader({
  label = 'Loading…',
  className = '',
}: FilmStripLoaderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [centerIdx, setCenterIdx] = useState(2)
  const animFrameRef = useRef<number | null>(null)

  // Detect prefers-reduced-motion once on mount
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Animate via requestAnimationFrame for smooth, JS-driven motion.
  // CSS animation alternative would work too but rAF gives us control over
  // highlighting the center frame without coupling CSS to component state.
  useEffect(() => {
    if (reducedMotion) return

    const track = trackRef.current
    if (!track) return

    const totalW = FRAME_W * (FRAMES.length / 2) // half the duplicated set width
    let offset = 0
    const SPEED = 0.5 // px per frame (~30px/s at 60fps)

    const tick = () => {
      offset += SPEED
      if (offset >= totalW) offset = 0
      if (track) {
        track.style.transform = `translateX(-${offset}px)`
      }

      // Determine which frame is closest to the center of the container
      const containerW = track.parentElement?.clientWidth ?? 400
      const centerX = containerW / 2
      const visibleOffset = offset % totalW
      const rawIdx = Math.round((visibleOffset + centerX - FRAME_W / 2) / FRAME_W) % (FRAMES.length / 2)
      setCenterIdx((rawIdx + (FRAMES.length / 2)) % (FRAMES.length / 2))

      animFrameRef.current = requestAnimationFrame(tick)
    }

    animFrameRef.current = requestAnimationFrame(tick)
    return () => {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current)
    }
  }, [reducedMotion])

  // Sprocket holes row
  const holes = Array.from({ length: FRAMES.length * FILM_HOLE_COUNT })

  return (
    <div
      className={`flex flex-col items-center gap-4 ${className}`}
      role="status"
      aria-label={label}
      aria-live="polite"
    >
      {/* Film strip wrapper */}
      <div
        className="relative overflow-hidden rounded"
        style={{ width: '100%', maxWidth: 480, height: FRAME_H + 32 /* holes top+bottom */ }}
      >
        {/* ── Gradient fade masks on left/right edges ── */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12"
          style={{ background: 'linear-gradient(to right, #121012 0%, transparent 100%)' }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12"
          style={{ background: 'linear-gradient(to left, #121012 0%, transparent 100%)' }}
          aria-hidden="true"
        />

        {/* Center-frame focus bracket overlay */}
        <div
          className="pointer-events-none absolute inset-y-0 left-1/2 z-20 -translate-x-1/2"
          style={{ width: FRAME_W + 8 }}
          aria-hidden="true"
        >
          {/* Corner bracket TL */}
          <span className="absolute left-0 top-0 h-4 w-4 border-l-2 border-t-2 border-repixl-red opacity-90" />
          {/* Corner bracket TR */}
          <span className="absolute right-0 top-0 h-4 w-4 border-r-2 border-t-2 border-repixl-red opacity-90" />
          {/* Corner bracket BL */}
          <span className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-repixl-red opacity-90" />
          {/* Corner bracket BR */}
          <span className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-repixl-red opacity-90" />
        </div>

        {/* Scrolling track */}
        <div
          ref={trackRef}
          className="flex will-change-transform"
          style={{
            width: FRAME_W * FRAMES.length,
            // Static fallback for reduced-motion: show all frames without motion
            ...(reducedMotion ? {} : {}),
          }}
        >
          {FRAMES.map((frame, i) => {
            // Determine if this frame is in focus (center)
            const frameIdx = i % (FRAMES.length / 2)
            const isFocused = !reducedMotion && frameIdx === centerIdx

            return (
              <div
                key={i}
                className="relative flex-shrink-0 select-none"
                style={{ width: FRAME_W, height: FRAME_H + 32 }}
                aria-hidden="true"
              >
                {/* Top sprocket holes row */}
                <div className="flex h-4 items-center justify-around bg-[#0a0809] px-1">
                  {Array.from({ length: FILM_HOLE_COUNT }).map((_, h) => (
                    <div
                      key={h}
                      className="rounded-sm bg-[#1e1a1e]"
                      style={{ width: 10, height: 8 }}
                    />
                  ))}
                </div>

                {/* Photo frame */}
                <div
                  className={`relative overflow-hidden transition-all duration-300`}
                  style={{
                    width: FRAME_W,
                    height: FRAME_H,
                    background: '#1a1618',
                    outline: isFocused ? '2px solid rgba(194,44,44,0.5)' : '1px solid rgba(140,133,128,0.12)',
                    outlineOffset: -1,
                    opacity: reducedMotion
                      ? 1
                      : isFocused
                        ? 1
                        : 0.55,
                    transform: isFocused ? 'scale(1.04)' : 'scale(1)',
                  }}
                >
                  <Image
                    src={frame.src}
                    alt={frame.alt}
                    fill
                    className="object-contain p-2"
                    sizes="96px"
                    priority={i < 6}
                  />
                </div>

                {/* Bottom sprocket holes row */}
                <div className="flex h-4 items-center justify-around bg-[#0a0809] px-1">
                  {Array.from({ length: FILM_HOLE_COUNT }).map((_, h) => (
                    <div
                      key={h}
                      className="rounded-sm bg-[#1e1a1e]"
                      style={{ width: 10, height: 8 }}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Reduced-motion fallback: single pulsing frame */}
        {reducedMotion && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#121012]">
            <div
              className="animate-pulse rounded"
              style={{ width: FRAME_W, height: FRAME_H, background: '#1a1618' }}
            >
              <Image
                src={FRAMES[0].src}
                alt="Loading"
                width={FRAME_W}
                height={FRAME_H}
                className="object-contain p-2 opacity-60"
              />
            </div>
          </div>
        )}
      </div>

      {/* Label */}
      {label && (
        <p className="font-mono text-xs tracking-widest text-repixl-muted">
          {label}
        </p>
      )}

      {/* Screen-reader only spinner text */}
      <span className="sr-only">{label}</span>
    </div>
  )
}
