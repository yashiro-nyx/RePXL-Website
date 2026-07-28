'use client'

import { motion } from 'framer-motion'
import { Button, CornerBracket } from '@/components/ui'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export function Hero() {
  const reducedMotion = useReducedMotion()

  const container = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reducedMotion ? 0 : 0.15,
        delayChildren: reducedMotion ? 0 : 0.2,
      },
    },
  }

  const fadeSlideUp = {
    hidden: reducedMotion
      ? { opacity: 1, y: 0 }
      : { opacity: 0, y: 30 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reducedMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] },
    },
  }

  const fadeIn = {
    hidden: reducedMotion ? { opacity: 1 } : { opacity: 0 },
    show: {
      opacity: 1,
      transition: { duration: reducedMotion ? 0 : 1, ease: 'easeOut' },
    },
  }

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Gradient background: dusty rose → charcoal */}
      <div
        className="absolute inset-0 -z-20"
        style={{
          background:
            'linear-gradient(175deg, #EBD3CE 0%, #6b4a4a 35%, #16131a 70%, #121012 100%)',
        }}
      />

      {/* Oversized semi-transparent background type */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 flex select-none items-center justify-center"
        aria-hidden="true"
      >
        <span
          className="whitespace-nowrap font-display font-bold uppercase leading-none tracking-tighter text-white/[0.04]"
          style={{ fontSize: 'clamp(12rem, 22vw, 26rem)' }}
        >
          VINTAGE
        </span>
      </div>

      {/* Content layer */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto flex w-full max-w-container flex-col items-center px-6 py-32 md:flex-row md:px-10 lg:px-16"
      >
        {/* Left column: text + CTAs */}
        <div className="flex flex-col items-center text-center md:w-1/2 md:items-start md:text-left">
          {/* Logo with corner bracket */}
          <motion.div variants={fadeSlideUp}>
            <CornerBracket size={10} color="rgba(245, 241, 236, 0.4)" className="mb-8 inline-block px-3 py-1.5">
              <span className="font-display text-xl font-semibold tracking-tight text-repixl-text-light">
                RePIXL
              </span>
            </CornerBracket>
          </motion.div>

          <motion.h1
            variants={fadeSlideUp}
            className="font-display text-display-lg leading-tight text-repixl-text-light md:text-display-xl"
          >
            Capture the past.
            <br />
            <span className="text-repixl-rose">Frame the future.</span>
          </motion.h1>

          <motion.p
            variants={fadeSlideUp}
            className="mt-5 max-w-md text-base text-repixl-text-light/70"
          >
            The curated marketplace for vintage digital cameras — condition-graded,
            serial-verified, and trusted by collectors worldwide.
          </motion.p>

          <motion.div
            variants={fadeSlideUp}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <Button variant="primary" size="lg">
              Shop the Collection
            </Button>
            <Button variant="secondary" size="lg">
              Sell With Us
            </Button>
          </motion.div>

          {/* Social proof cluster */}
          <motion.div
            variants={fadeSlideUp}
            className="mt-10 flex items-center gap-3"
          >
            {/* Stacked avatar circles */}
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-8 w-8 rounded-full border-2 border-repixl-charcoal bg-repixl-muted/40"
                  aria-hidden="true"
                />
              ))}
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-repixl-charcoal bg-repixl-red text-xs font-medium text-white">
                +
              </div>
            </div>
            <span className="font-mono text-xs text-repixl-muted">
              [ Join 2,400+ collectors ]
            </span>
          </motion.div>
        </div>

        {/* Right column: hero camera + polaroid accent */}
        <div className="relative mt-16 flex items-center justify-center md:mt-0 md:w-1/2">
          {/* Main camera product shot — tilted, explicit sizing container */}
          <motion.div
            variants={fadeIn}
            className="relative z-10 h-[320px] w-[320px] md:h-[420px] md:w-[420px] lg:h-[480px] lg:w-[480px]"
            style={{ transform: 'rotate(-4deg)' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/hero-camera.svg"
              alt="Vintage digital camera — featured product"
              className="h-full w-full drop-shadow-2xl"
            />
          </motion.div>

          {/* Polaroid-style sample photo accent — floats offset */}
          <motion.div
            variants={fadeSlideUp}
            className="absolute -bottom-6 -right-2 z-20 md:-right-8 md:bottom-4"
            style={{ transform: 'rotate(6deg)' }}
          >
            <div className="overflow-hidden rounded-sm bg-white p-2 shadow-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/hero-sample-photo.svg"
                alt="Sample photo taken with a vintage digicam"
                className="h-28 w-28 object-cover md:h-36 md:w-36"
              />
              <p className="mt-1 text-center font-mono text-[9px] text-repixl-text-dark/50">
                Shot on CyberShot · ISO 100
              </p>
            </div>
          </motion.div>

          {/* REC indicator accent — top-right of camera */}
          <motion.div
            variants={fadeIn}
            className="absolute right-4 top-4 z-20 flex items-center gap-1.5 md:right-12 md:top-8"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-repixl-red" />
            <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-repixl-red">
              REC
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* Bottom fade into next section */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32"
        style={{
          background: 'linear-gradient(to bottom, transparent, #121012)',
        }}
      />
    </section>
  )
}
