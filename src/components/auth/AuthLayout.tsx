'use client'

/**
 * AuthLayout — Login / Register split-screen.
 *
 * LEFT  — centered form block, max-w-[420px], comfortable padding
 * RIGHT — visual brand panel, fully centered content:
 *         soft radial glow + ONE floating verification card + tagline + trust stats
 *
 * All backgrounds use Tailwind token classes (no inline hex style= props)
 * so [data-theme="light"] overrides apply instantly.
 * No camera image — removed permanently per design direction.
 */

import Link from 'next/link'
import { motion } from 'framer-motion'
import { CornerBracket } from '@/components/ui'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface AuthLayoutProps {
  children: React.ReactNode
  tagline: string
  subcopy: string
  cardCameraName?: string
  cardCondition?: string
  cardYear?: string
  cardMegapixels?: string
}

const conditionClass: Record<string, string> = {
  mint: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  excellent: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  good: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
}

const trustStats = [
  { value: '2,400+', label: 'Verified collectors' },
  { value: '100%', label: 'Serial-verified' },
  { value: '4-tier', label: 'Condition graded' },
]

export function AuthLayout({
  children,
  tagline,
  subcopy,
  cardCameraName = 'Canon PowerShot A520',
  cardCondition = 'mint',
  cardYear = '2004',
  cardMegapixels = '4.0',
}: AuthLayoutProps) {
  const reducedMotion = useReducedMotion()

  return (
    <div className="flex min-h-screen">

      {/* ══════════════════════════════════════
          LEFT — form panel
          ══════════════════════════════════════ */}
      <div className="relative flex w-full flex-col overflow-y-auto bg-repixl-bg lg:w-[46%]">

        {/* Faint red burn */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          aria-hidden="true"
          style={{ background: 'linear-gradient(140deg, rgba(194,44,44,0.05) 0%, transparent 42%)' }}
        />

        {/* Centered content wrapper */}
        <div className="flex min-h-full flex-col items-center justify-center px-8 py-14 sm:px-10">
          <div className="w-full max-w-[420px]">

            {/* Logo */}
            <div className="mb-10">
              <Link href="/" aria-label="Go to RePXL home">
                <CornerBracket
                  size={8}
                  color="rgba(245,241,236,0.25)"
                  className="inline-block px-3 py-1.5 transition-opacity hover:opacity-70"
                >
                  <span className="font-display text-lg font-semibold tracking-tight text-repixl-text-light">
                    RePXL
                  </span>
                </CornerBracket>
              </Link>
            </div>

            {/* Form slot */}
            <motion.div
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          RIGHT — visual brand panel
          All classes use Tailwind tokens so
          [data-theme="light"] overrides work.
          ══════════════════════════════════════ */}
      <div
        className="auth-panel-right relative hidden overflow-hidden lg:flex lg:w-[54%]"
        aria-hidden="true"
      >
        {/* Base background */}
        <div className="absolute inset-0 bg-repixl-bg" />

        {/* Charcoal overlay — darkens further in dark mode */}
        <div className="absolute inset-0 bg-repixl-charcoal opacity-70" />

        {/* Radial red glow — centered */}
        <div
          className="auth-panel-glow absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: '560px', height: '560px', borderRadius: '50%' }}
        />

        {/* Film grain texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Corner brackets — viewfinder motif */}
        <div className="absolute left-7 top-7 h-12 w-12 border-l border-t border-repixl-muted/15" />
        <div className="absolute bottom-7 right-7 h-12 w-12 border-b border-r border-repixl-muted/15" />

        {/* REC indicator */}
        <div className="absolute right-7 top-7 z-20 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-repixl-red" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-repixl-red/80">REC</span>
        </div>

        {/* ══════════════════════════════════════
            CENTERED CONTENT — card + tagline + trust stats
            Both axes centered, single coherent block
            ══════════════════════════════════════ */}
        <div className="relative z-10 flex w-full items-center justify-center px-12 xl:px-16">
          <motion.div
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            className="w-full max-w-[300px]"
          >
            {/* ── Floating verification card ── */}
            <div className="relative">
              <motion.div
                initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 10, rotate: -1 }}
                animate={{ opacity: 1, y: 0, rotate: -1.5 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
                className="relative rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-sm"
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-repixl-muted">
                      Verified Camera
                    </p>
                    <p className="mt-1 font-display text-sm font-semibold text-repixl-text-light">
                      {cardCameraName}
                    </p>
                  </div>
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-repixl-success/20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-success">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </div>
                </div>

                {/* Spec row */}
                <div className="mt-4 flex gap-2.5">
                  {[
                    { label: 'Year', value: cardYear },
                    { label: 'Sensor', value: `${cardMegapixels}MP` },
                  ].map((spec) => (
                    <div key={spec.label} className="flex-1 rounded-lg bg-repixl-bg/50 px-3 py-2">
                      <p className="font-mono text-[8px] uppercase tracking-wider text-repixl-muted/60">{spec.label}</p>
                      <p className="mt-0.5 font-mono text-xs font-semibold text-repixl-text-light">{spec.value}</p>
                    </div>
                  ))}
                  <div className="flex-1 rounded-lg bg-repixl-bg/50 px-3 py-2">
                    <p className="font-mono text-[8px] uppercase tracking-wider text-repixl-muted/60">Grade</p>
                    <div className={`mt-0.5 inline-flex items-center rounded-full border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider ${conditionClass[cardCondition] ?? conditionClass.mint}`}>
                      {cardCondition}
                    </div>
                  </div>
                </div>

                {/* Serial bar */}
                <div className="mt-3 flex items-center justify-between rounded-lg border border-repixl-muted/10 bg-repixl-bg/40 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-repixl-muted/50" aria-hidden="true">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <p className="font-mono text-[9px] text-repixl-muted/60">Serial verified</p>
                  </div>
                  <p className="font-mono text-[9px] text-repixl-muted/50">SN·····8829</p>
                </div>
              </motion.div>

              {/* Accent badge — overlaps top-right corner */}
              <motion.div
                initial={reducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.75 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.6 }}
                className="absolute -right-2.5 -top-2.5 flex items-center gap-1.5 rounded-full border border-repixl-red/30 bg-repixl-bg px-2.5 py-1 shadow-md"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-repixl-red" />
                <span className="font-mono text-[9px] uppercase tracking-wider text-repixl-red">RePXL</span>
              </motion.div>
            </div>

            {/* Tagline + subtext */}
            <motion.div
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.55, delay: 0.55 }}
              className="mt-8"
            >
              <div className="mb-3.5 h-px w-8 bg-repixl-red/50" />
              <p className="font-display text-lg font-semibold leading-snug text-repixl-text-light">
                {tagline}
              </p>
              <p className="mt-2.5 text-sm leading-relaxed text-repixl-muted">
                {subcopy}
              </p>
            </motion.div>

            {/* Trust stats row */}
            <motion.div
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.55, delay: 0.7 }}
              className="mt-6 grid grid-cols-3 gap-3"
            >
              {trustStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-repixl-muted/10 bg-repixl-bg/30 px-3 py-3 text-center"
                >
                  <p className="font-display text-base font-bold text-repixl-text-light">{stat.value}</p>
                  <p className="mt-0.5 font-mono text-[8px] uppercase leading-tight tracking-wider text-repixl-muted/60">
                    {stat.label}
                  </p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
