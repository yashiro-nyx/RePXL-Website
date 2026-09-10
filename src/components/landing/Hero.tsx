'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useThemeStore } from '@/stores/themeStore'

const HERO_ASSETS = {
  light: {
    background: '/images/lightmodebg.png',
    overlay: '/images/overlaylight.png',
    polaroid: '/images/polaroidlight.png',
  },
  dark: {
    background: '/images/darkmodebg.png',
    overlay: '/images/overlaydark.png',
    polaroid: '/images/polaroiddark.png',
  },
} as const

export function Hero() {
  const theme = useThemeStore((state) => state.theme)
  const reducedMotion = useReducedMotion()
  const assets = HERO_ASSETS[theme]

  const reveal = reducedMotion
    ? { initial: false as const, animate: undefined }
    : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 } }

  return (
    <section className="hero-cinematic relative isolate overflow-hidden">
      {/* 1 — theme-specific photographic environment */}
      <Image
        key={assets.background}
        src={assets.background}
        alt=""
        fill
        priority
        sizes="100vw"
        className="hero-environment z-0 object-cover"
        aria-hidden="true"
      />

      {/* 2 — localized contrast and atmospheric falloff */}
      <div
        className="hero-atmosphere absolute inset-0 z-[1]"
        aria-hidden="true"
      />

      {/* 3 — editorial translucent word behind the terrain and camera */}
      <div
        className="hero-wordmark pointer-events-none absolute z-[2] select-none whitespace-nowrap font-display font-bold uppercase leading-none tracking-normal"
        aria-hidden="true"
      >
        <motion.div
          {...reveal}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          REPIXL
        </motion.div>
      </div>

      {/* 4 — matching foreground terrain creates the type/environment overlap */}
      <Image
        key={assets.overlay}
        src={assets.overlay}
        alt=""
        fill
        loading="eager"
        sizes="100vw"
        className="hero-environment pointer-events-none z-[3] object-cover"
        aria-hidden="true"
      />

      {/* 5 — main camera */}
      <div className="hero-camera absolute z-[4] aspect-[600/525]">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, scale: 0.94, y: 24 }}
          animate={
            reducedMotion ? undefined : { opacity: 1, scale: 1, y: [0, -8, 0] }
          }
          transition={
            reducedMotion
              ? undefined
              : {
                  opacity: { duration: 0.7 },
                  scale: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
                  y: {
                    duration: 7,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 0.9,
                  },
                }
          }
          className="relative h-full w-full"
        >
          <Image
            src="/images/camherosec.png"
            alt="Canon camera featured in the RePXL collection"
            fill
            priority
            sizes="(min-width: 1024px) 47vw, (min-width: 768px) 55vw, 92vw"
            className="object-contain drop-shadow-[0_32px_40px_rgba(0,0,0,0.55)]"
          />
        </motion.div>
      </div>

      {/* 6 — theme-specific editorial print */}
      <div className="hero-secondary absolute z-[5] hidden md:block">
        <div className="hero-polaroid relative aspect-[1/1.08] w-full rotate-[4deg]">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, x: 24, rotate: 3 }}
            animate={
              reducedMotion ? undefined : { opacity: 1, x: 0, rotate: 0 }
            }
            transition={{
              duration: reducedMotion ? 0 : 0.85,
              delay: reducedMotion ? 0 : 0.35,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="relative h-full w-full"
          >
            <Image
              key={assets.polaroid}
              src={assets.polaroid}
              alt="A RePXL photo print of a mountain landscape"
              fill
              sizes="(min-width: 1024px) 14vw, 16vw"
              className="object-contain"
            />
          </motion.div>
        </div>
        <div className="hero-microcopy mt-3 text-center text-white">
          <p className="font-mono text-[9px] uppercase tracking-normal text-white/60">
            Frame / 001
          </p>
          <p className="mt-1 font-display text-sm font-medium tracking-normal text-white/85">
            Different stories. Same passion.
          </p>
        </div>
      </div>

      {/* 7 — viewfinder details */}
      <div
        className="hero-viewfinder pointer-events-none absolute z-[6]"
        aria-hidden="true"
      >
        <span className="hero-corner absolute left-0 top-0 h-10 w-10 border-l border-t sm:h-14 sm:w-14" />
        <span className="hero-corner absolute right-0 top-0 h-10 w-10 border-r border-t sm:h-14 sm:w-14" />
        <span className="hero-corner absolute bottom-0 left-0 h-10 w-10 border-b border-l sm:h-14 sm:w-14" />
        <span className="hero-corner absolute bottom-0 right-0 h-10 w-10 border-b border-r sm:h-14 sm:w-14" />
        <span className="hero-focus absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border" />
      </div>

      {/* 8 — copy and small editorial details */}
      <div className="hero-content relative z-[7] mx-auto flex max-w-container">
        <motion.div
          {...reveal}
          transition={{
            duration: 0.75,
            delay: reducedMotion ? 0 : 0.2,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="hero-copy relative max-w-[19rem] text-white sm:max-w-[23rem] lg:max-w-[27rem]"
        >
          <p className="mb-3 flex items-center gap-3 font-mono text-[10px] font-semibold uppercase tracking-normal text-white/80">
            <span className="h-px w-9 bg-repixl-red" aria-hidden="true" />
            Capture more
          </p>
          <h1 className="font-display text-[clamp(2.35rem,5vw,4.35rem)] font-semibold leading-[0.98] tracking-normal text-white">
            More than just a photo.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/80 sm:text-base">
            Discover vintage digital cameras made for capturing the moments and
            stories you will want to keep.
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex h-12 items-center justify-center rounded bg-repixl-red px-7 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-repixl-red"
          >
            Shop Cameras
            <svg
              viewBox="0 0 20 20"
              className="ml-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M4 10h11M11 6l4 4-4 4" />
            </svg>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
