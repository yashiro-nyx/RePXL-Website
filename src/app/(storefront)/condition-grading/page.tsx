'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { ConditionBadge, type Condition } from '@/components/ui'
import { RevealText } from '@/components/ui/RevealText'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface GradeSection {
  condition: Condition
  iconColorClass: string
  cosmetic: string
  functional: string
  accessories: string
  testing: string
}

const grades: GradeSection[] = [
  {
    condition: 'mint',
    iconColorClass: 'text-emerald-400',
    cosmetic:
      'No visible wear, scratches, or marks. Looks brand new. Body panels are immaculate, LCD screen is flawless, and all labeling/text is crisp and unscuffed.',
    functional:
      'All features work perfectly. Sensor clean, lens clear with no fungus or haze, flash fires consistently, zoom operates smoothly, all buttons and dials respond correctly.',
    accessories:
      'Comes with original box, manual, strap, and cables where available. Packaging may show minor shelf wear but is complete.',
    testing:
      '50+ test shots taken across all modes (auto, manual, macro, flash, video where applicable). Battery holds a full charge cycle. Memory card write/read verified.',
  },
  {
    condition: 'excellent',
    iconColorClass: 'text-blue-400',
    cosmetic:
      "Minimal signs of use — light handling marks only visible under direct light. No scratches visible at arm's length. LCD and lens surfaces are clean and clear.",
    functional:
      'All features work correctly. Sensor clean, minor dust particles may be present but are non-visible in photos at any aperture. All mechanical operations smooth.',
    accessories:
      'May not include original box. Camera, battery, and memory card included. Strap or cables included when available.',
    testing:
      'Full function test across all shooting modes. Battery holds charge for a normal use session (100+ shots). No operational quirks detected.',
  },
  {
    condition: 'good',
    iconColorClass: 'text-repixl-warning',
    cosmetic:
      'Visible signs of regular use — light scratches on body, minor paint wear on edges and corners. LCD may have light surface marks but is fully functional. Shows its history without being damaged.',
    functional:
      'All core features work. May have minor quirks noted in listing (e.g., slightly sticky zoom ring, slow focus in low light, minor viewfinder dust). These are always documented honestly.',
    accessories:
      'Camera and battery included. Memory card may not be included. Original packaging and manuals are not included unless noted.',
    testing:
      'Core functions tested across primary shooting modes. Quirks documented honestly with examples. Battery holds charge for basic use.',
  },
  {
    condition: 'fair',
    iconColorClass: 'text-orange-400',
    cosmetic:
      'Noticeable wear — scratches, scuffs, paint loss on edges and grip areas. Shows its age clearly. LCD may have minor blemishes. Body is structurally sound but visibly used.',
    functional:
      'Works but with documented limitations (e.g., flash intermittent, LCD has dead pixels, battery holds reduced charge, certain modes unreliable). All limitations are clearly described in the listing.',
    accessories:
      'Camera body only unless otherwise noted. Battery included if the camera cannot function without one. No guarantee of original accessories.',
    testing:
      'Tested to confirm basic operation and document all limitations clearly. Each limitation is photographed or described with specific detail so buyers know exactly what to expect.',
  },
]

const detailIcons = {
  cosmetic: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><line x1="21.17" y1="8" x2="12" y2="8" /><line x1="3.95" y1="6.06" x2="8.54" y2="14" /><line x1="10.88" y1="21.94" x2="15.46" y2="14" />
    </svg>
  ),
  functional: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  accessories: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  testing: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  ),
}

/* Small self-contained count-up, mirrors the one on the About page */
function useCountUp(target: number, active: boolean, duration = 1.4) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!active) return
    let frame: number
    let start: number | null = null
    const step = (ts: number) => {
      if (start === null) start = ts
      const progress = Math.min((ts - start) / (duration * 1000), 1)
      setCount(Math.round(progress * target))
      if (progress < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [active, target, duration])
  return count
}

function StatBlock({
  target,
  suffix = '',
  label,
  reducedMotion,
}: {
  target: number
  suffix?: string
  label: string
  reducedMotion: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })
  const count = useCountUp(target, isInView && !reducedMotion)
  const displayValue = reducedMotion ? target : count

  return (
    <div ref={ref} className="text-center">
      <p className="font-display text-display-md font-bold text-repixl-text-light">
        {displayValue.toLocaleString()}
        {suffix}
      </p>
      <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-repixl-muted">
        {label}
      </p>
    </div>
  )
}

export default function ConditionGradingPage() {
  const reducedMotion = useReducedMotion()
  const [activeGrade, setActiveGrade] = useState<Condition>('mint')
  const active = grades.find((g) => g.condition === activeGrade)!

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden pb-16 pt-32 md:pb-20 md:pt-40">
        <div
          className="pointer-events-none absolute inset-0 -z-10 flex select-none items-center justify-center"
          aria-hidden="true"
        >
          <span
            className="whitespace-nowrap font-display font-bold uppercase leading-none tracking-tighter text-white/[0.04]"
            style={{ fontSize: 'clamp(9rem, 18vw, 20rem)' }}
          >
            GRADED
          </span>
        </div>

        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <span className="mb-5 block font-mono text-xs uppercase tracking-widest text-repixl-muted">
              — Our Standard
            </span>
            <h1 className="font-display text-display-lg text-repixl-text-light md:text-display-xl">
              <RevealText text="Condition Grading" as="span" />
            </h1>
            <motion.p
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.6, delay: reducedMotion ? 0 : 0.3 }}
              className="mx-auto mt-4 max-w-lg text-sm text-repixl-text-light/70"
            >
              Every camera on RePXL is assessed against the same four-tier
              standard. No guesswork, no seller optimism — just honest,
              consistent grading you can trust.
            </motion.p>
          </div>

          {/* Trust stats */}
          <motion.div
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.6, delay: reducedMotion ? 0 : 0.4 }}
            className="mx-auto mt-12 grid max-w-md grid-cols-3 gap-4"
          >
            <StatBlock target={50} suffix="+" label="Test shots / unit" reducedMotion={reducedMotion} />
            <StatBlock target={4} label="Grading tiers" reducedMotion={reducedMotion} />
            <StatBlock target={14} label="Day guarantee" reducedMotion={reducedMotion} />
          </motion.div>
        </Container>
      </section>

      {/* Interactive grade viewer */}
      <section className="pb-24 md:pb-32">
        <Container>
          <div className="mx-auto max-w-3xl">
            {/* Tabs */}
            <motion.div
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: reducedMotion ? 0 : 0.5, ease: 'easeOut' }}
              className="flex flex-wrap items-center justify-center gap-3"
            >
              {grades.map((g) => (
                <button
                  key={g.condition}
                  onClick={() => setActiveGrade(g.condition)}
                  className="relative"
                >
                  <ConditionBadge
                    condition={g.condition}
                    className={`cursor-pointer px-3 py-1.5 text-[13px] transition-all duration-200 ${
                      activeGrade === g.condition
                        ? 'scale-110 shadow-[0_0_0_1px_currentColor]'
                        : 'opacity-50 hover:opacity-80'
                    }`}
                  />
                </button>
              ))}
            </motion.div>

            {/* Active grade detail panel */}
            <div className="relative mt-8 min-h-[420px] sm:min-h-[340px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active.condition}
                  initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
                  transition={{ duration: reducedMotion ? 0 : 0.3, ease: 'easeOut' }}
                  className="rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-6 md:p-8"
                >
                  <div className="flex items-center gap-3">
                    <ConditionBadge condition={active.condition} />
                    <h2 className="font-display text-lg font-semibold capitalize text-repixl-text-light">
                      {active.condition}
                    </h2>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <GradeDetail icon={detailIcons.cosmetic} iconColorClass={active.iconColorClass} label="Cosmetic" description={active.cosmetic} />
                    <GradeDetail icon={detailIcons.functional} iconColorClass={active.iconColorClass} label="Functional" description={active.functional} />
                    <GradeDetail icon={detailIcons.accessories} iconColorClass={active.iconColorClass} label="Accessories" description={active.accessories} />
                    <GradeDetail icon={detailIcons.testing} iconColorClass={active.iconColorClass} label="Testing" description={active.testing} />
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
              Tap a grade above to compare
            </p>
          </div>

          {/* Guarantee callout */}
          <motion.div
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: reducedMotion ? 0 : 0.6, ease: 'easeOut' }}
            className="mx-auto mt-12 max-w-2xl rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-6 text-center"
          >
            <div className="mx-auto mb-3 text-repixl-muted">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3 className="font-display text-sm font-semibold text-repixl-text-light">
              Our Guarantee
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-repixl-text-light/60">
              If a camera you receive doesn&apos;t match its listed condition grade,
              you&apos;re eligible for a full refund within 14 days. We cover return
              shipping for condition mismatches — no questions asked. Read our full{' '}
              <a href="/shipping-returns" className="text-repixl-red transition-colors hover:text-repixl-red/80">
                Shipping &amp; Returns policy
              </a>
              .
            </p>
          </motion.div>
        </Container>
      </section>


    </div>
  )
}

function GradeDetail({
  icon,
  iconColorClass,
  label,
  description,
}: {
  icon: React.ReactNode
  iconColorClass: string
  label: string
  description: string
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className={iconColorClass}>{icon}</span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted">
          {label}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-repixl-text-light/70">
        {description}
      </p>
    </div>
  )
}