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
    <section className="hero-cinematic relative isolate min-h-[46rem] overflow-hidden sm:min-h-[50rem] lg:min-h-[min(56rem,100svh)]">
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
      <div className="hero-atmosphere absolute inset-0 z-[1]" aria-hidden="true" />

      {/* 3 — editorial translucent word behind the terrain and camera */}
      <div className="hero-wordmark pointer-events-none absolute left-1/2 top-[24%] z-[2] -translate-x-1/2 select-none whitespace-nowrap font-display text-[clamp(5rem,18vw,16.5rem)] font-bold uppercase leading-none tracking-[-0.075em]" aria-hidden="true">
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
      <div className="absolute left-1/2 top-[25%] z-[4] aspect-[600/525] w-[min(84vw,35rem)] -translate-x-[45%] sm:top-[22%] sm:w-[min(66vw,38rem)] lg:left-[54%] lg:top-[20%] lg:w-[min(45vw,40rem)]">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, scale: 0.94, y: 24 }}
          animate={reducedMotion ? undefined : { opacity: 1, scale: 1, y: [0, -8, 0] }}
          transition={reducedMotion
            ? undefined
            : { opacity: { duration: 0.7 }, scale: { duration: 0.9, ease: [0.22, 1, 0.36, 1] }, y: { duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.9 } }}
          className="relative h-full w-full"
        >
          <Image
            src="/images/camherosec.png"
            alt="Canon camera featured in the RePXL collection"
            fill
            priority
            sizes="(min-width: 1024px) 45vw, (min-width: 640px) 66vw, 84vw"
            className="object-contain drop-shadow-[0_32px_40px_rgba(0,0,0,0.55)]"
          />
        </motion.div>
      </div>

      {/* 6 — theme-specific editorial print */}
      <div className="absolute right-[3%] top-[23%] z-[5] hidden aspect-[1/1.08] w-[clamp(10rem,18vw,16rem)] rotate-[4deg] drop-shadow-[0_20px_30px_rgba(0,0,0,0.42)] sm:block lg:right-[4%] lg:top-[25%]">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, x: 24, rotate: 3 }}
          animate={reducedMotion ? undefined : { opacity: 1, x: 0, rotate: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.85, delay: reducedMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative h-full w-full"
        >
          <Image
            key={assets.polaroid}
            src={assets.polaroid}
            alt="A RePXL photo print of a mountain landscape"
            fill
            sizes="(min-width: 1024px) 18vw, 24vw"
            className="object-contain"
          />
        </motion.div>
      </div>

      {/* 7 — viewfinder details */}
      <div className="pointer-events-none absolute inset-x-5 top-24 z-[6] h-[54%] sm:inset-x-9 sm:top-28 lg:inset-x-[7%] lg:top-[15%] lg:h-[55%]" aria-hidden="true">
        <span className="hero-corner absolute left-0 top-0 h-10 w-10 border-l border-t sm:h-14 sm:w-14" />
        <span className="hero-corner absolute right-0 top-0 h-10 w-10 border-r border-t sm:h-14 sm:w-14" />
        <span className="hero-corner absolute bottom-0 left-0 h-10 w-10 border-b border-l sm:h-14 sm:w-14" />
        <span className="hero-corner absolute bottom-0 right-0 h-10 w-10 border-b border-r sm:h-14 sm:w-14" />
        <span className="hero-focus absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border" />
      </div>

      {/* 8 — copy and small editorial details */}
      <div className="relative z-[7] mx-auto flex min-h-[46rem] max-w-container items-end px-6 pb-16 pt-28 sm:min-h-[50rem] sm:px-10 sm:pb-20 lg:min-h-[min(56rem,100svh)] lg:px-16 lg:pb-[8vh]">
        <motion.div
          {...reveal}
          transition={{ duration: 0.75, delay: reducedMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="hero-copy max-w-[22rem] rounded-sm bg-black/10 p-1 text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.72)] sm:max-w-[25rem] lg:max-w-[27rem]"
        >
          <p className="mb-3 flex items-center gap-3 font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-white/80">
            <span className="h-px w-9 bg-repixl-red" aria-hidden="true" />
            Capture more
          </p>
          <h1 className="font-display text-[clamp(2.35rem,5vw,4.6rem)] font-semibold leading-[0.96] tracking-[-0.04em] text-white">
            More than just a photo.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/80 sm:text-base">
            Discover vintage digital cameras made for capturing the moments and stories you will want to keep.
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex h-12 items-center justify-center rounded bg-repixl-red px-7 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-repixl-red"
          >
            Shop Cameras
            <svg viewBox="0 0 20 20" className="ml-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M4 10h11M11 6l4 4-4 4" />
            </svg>
          </Link>
        </motion.div>

        <div className="absolute bottom-16 right-6 hidden text-right text-white sm:block sm:bottom-20 sm:right-10 lg:bottom-[8vh] lg:right-16">
          <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-white/60">Frame / 001</p>
          <p className="mt-1 font-display text-sm font-medium tracking-wide text-white/85">Different stories. Same passion.</p>
        </div>
      </div>
    </section>
  )
}
