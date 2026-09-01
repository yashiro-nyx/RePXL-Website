'use client'

/**
 * AuthLayout — split-screen layout for Login and Register pages.
 *
 * LEFT: form panel (scrollable on tall forms)
 * RIGHT: decorative RePXL camera-inspired visual panel (hidden on mobile)
 *
 * The right panel uses the same color language as the Hero — deep charcoal
 * background with the red burn gradient, a large camera SVG, corner-bracket
 * motifs, and a film-grain texture — bringing the brand to the auth experience
 * without copying any third-party design.
 */

import Link from 'next/link'
import { motion } from 'framer-motion'
import { CornerBracket } from '@/components/ui'

interface AuthLayoutProps {
  children: React.ReactNode
  /** Tagline shown on the visual panel. Varies between Login and Register. */
  tagline: string
  /** Sub-copy below the tagline */
  subcopy: string
  /** Which camera image to feature on the panel */
  cameraImage?: string
}

const features = [
  { icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', label: 'Condition-graded listings' },
  { icon: 'M9 12l2 2 4-4M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', label: 'Serial number verified' },
  { icon: 'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2 2.09-4.2.58-5.71c-1.51-1.51-4.45-.93-3.58.71zM12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2', label: '2,400+ verified collectors' },
]

export function AuthLayout({ children, tagline, subcopy, cameraImage = '/images/hero-camera.svg' }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* ── Left: form panel ── */}
      <div className="relative flex w-full flex-col justify-center overflow-y-auto bg-repixl-bg px-6 py-12 md:px-10 lg:w-[52%] lg:px-16 xl:px-20">
        {/* Subtle left-side burn */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          aria-hidden="true"
          style={{
            background:
              'linear-gradient(135deg, rgba(200,20,10,0.06) 0%, transparent 40%)',
          }}
        />

        {/* Logo */}
        <div className="mb-10">
          <Link href="/" aria-label="Go to RePXL home">
            <CornerBracket
              size={8}
              color="rgba(245,241,236,0.25)"
              className="inline-block px-3 py-1.5 transition-opacity hover:opacity-75"
            >
              <span className="font-display text-lg font-semibold tracking-tight text-repixl-text-light">
                RePXL
              </span>
            </CornerBracket>
          </Link>
        </div>

        {/* Form slot */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          {children}
        </motion.div>
      </div>

      {/* ── Right: visual panel (hidden on mobile) ── */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden bg-repixl-charcoal lg:flex lg:w-[48%]"
        aria-hidden="true"
      >
        {/* Background gradient — matches Hero's red burn language */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 15% 10%, rgba(194,44,44,0.18) 0%, transparent 55%),
              radial-gradient(ellipse 60% 50% at 85% 90%, rgba(235,211,206,0.08) 0%, transparent 50%),
              linear-gradient(180deg, #16131a 0%, #0e0c10 100%)
            `,
          }}
        />

        {/* Film-grain texture overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Top-left corner bracket */}
        <div className="absolute left-8 top-8 h-12 w-12 border-l border-t border-repixl-muted/20" />

        {/* Bottom-right corner bracket */}
        <div className="absolute bottom-8 right-8 h-12 w-12 border-b border-r border-repixl-muted/20" />

        {/* REC indicator */}
        <div className="relative z-10 flex items-start justify-end p-8">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-repixl-red" />
            <span className="font-mono text-[9px] uppercase tracking-widest text-repixl-red">REC</span>
          </div>
        </div>

        {/* Main camera visual */}
        <div className="relative z-10 flex flex-1 items-center justify-center px-12">
          <motion.div
            initial={{ opacity: 0, y: 20, rotate: -3 }}
            animate={{ opacity: 1, y: 0, rotate: -3 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            style={{
              filter:
                'drop-shadow(0 0 50px rgba(194,44,44,0.12)) drop-shadow(0 24px 48px rgba(0,0,0,0.6))',
            }}
            className="w-full max-w-xs"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cameraImage}
              alt="Vintage digital camera"
              className="h-auto w-full"
            />
          </motion.div>

          {/* Polaroid accent */}
          <motion.div
            initial={{ opacity: 0, rotate: 6 }}
            animate={{ opacity: 1, rotate: 6 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
            className="absolute bottom-16 right-12"
          >
            <div className="rounded bg-white p-2 shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/hero-sample-photo.svg"
                alt=""
                className="h-20 w-20 object-cover"
              />
              <p className="mt-1 text-center font-mono text-[7px] text-repixl-text-dark/50">
                ISO 100 · f/2.8
              </p>
            </div>
          </motion.div>
        </div>

        {/* Bottom copy */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.35 }}
          className="relative z-10 p-10"
        >
          {/* Divider */}
          <div className="mb-5 h-px w-12 bg-repixl-red/40" />

          <p className="font-display text-xl font-semibold leading-snug text-repixl-text-light">
            {tagline}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-repixl-muted">
            {subcopy}
          </p>

          {/* Trust features */}
          <ul className="mt-6 space-y-2">
            {features.map((f) => (
              <li key={f.label} className="flex items-center gap-2.5">
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-repixl-red/15 text-repixl-red">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted/80">
                  {f.label}
                </span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </div>
  )
}
