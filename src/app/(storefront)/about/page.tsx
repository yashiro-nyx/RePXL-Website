'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { Button, CornerBracket, ConditionBadge } from '@/components/ui'
import { RevealText } from '@/components/ui/RevealText'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { products } from '@/data/products'

const totalCameras = products.filter((p) => p.stock > 0).length
const totalBrands = new Set(products.map((p) => p.brand)).size

/* ------------------------------------------------------------------ */
/*  Shared stagger/fade variants — same easing language as the         */
/*  homepage sections (Hero, BrandGallery, ConditionExplainer, etc.)   */
/* ------------------------------------------------------------------ */

function useVariants(reducedMotion: boolean) {
  const container = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reducedMotion ? 0 : 0.12,
        delayChildren: reducedMotion ? 0 : 0.1,
      },
    },
  }

  const item = {
    hidden: reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reducedMotion ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  }

  return { container, item }
}

export default function AboutPage() {
  const reducedMotion = useReducedMotion()
  const { container, item } = useVariants(reducedMotion)

  return (
    <div>
      <AboutHero reducedMotion={reducedMotion} />
      <OurStory reducedMotion={reducedMotion} />
      <HowWeGrade reducedMotion={reducedMotion} container={container} item={item} />
      <WhatWeBelieve reducedMotion={reducedMotion} container={container} item={item} />
      <Milestones reducedMotion={reducedMotion} />
      <StatsRow reducedMotion={reducedMotion} container={container} item={item} />
      <TheTeam reducedMotion={reducedMotion} container={container} item={item} />
      <WhereHeaded reducedMotion={reducedMotion} />

    </div>
  )
}

/* ================================================================== */
/*  Hero — oversized watermark type + word-by-word heading reveal      */
/* ================================================================== */

function AboutHero({ reducedMotion }: { reducedMotion: boolean }) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })
  const watermarkY = useTransform(scrollYProgress, [0, 1], reducedMotion ? [0, 0] : [0, 80])
  const watermarkOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.3])

  const { container, item } = useVariants(reducedMotion)

  return (
    <section ref={sectionRef} className="relative overflow-hidden pb-20 pt-32 md:pb-28 md:pt-40">
      {/* Oversized watermark type, echoing the homepage hero */}
      <motion.div
        style={{ y: reducedMotion ? 0 : watermarkY, opacity: watermarkOpacity }}
        className="pointer-events-none absolute inset-0 -z-10 flex select-none items-center justify-center"
        aria-hidden="true"
      >
        <span
          className="whitespace-nowrap font-display font-bold uppercase leading-none tracking-tighter text-white/[0.04]"
          style={{ fontSize: 'clamp(10rem, 20vw, 22rem)' }}
        >
          TRUST
        </span>
      </motion.div>

      <Container>
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="mx-auto max-w-2xl text-center"
        >
          <motion.span
            variants={item}
            className="mb-5 block font-mono text-xs uppercase tracking-widest text-repixl-muted"
          >
            — About RePXL
          </motion.span>

          <motion.div variants={item}>
            <CornerBracket size={14} color="rgba(245, 241, 236, 0.25)" className="inline-block px-6 py-4">
              <h1 className="font-display text-display-lg text-repixl-text-light md:text-display-xl">
                <RevealText text="By collectors," as="span" className="block" />
                <span className="block italic text-repixl-rose">
                  <RevealText text="for collectors." as="span" delay={0.15} />
                </span>
              </h1>
            </CornerBracket>
          </motion.div>

          <motion.p variants={item} className="mx-auto mt-6 max-w-lg text-base text-repixl-text-light/70">
            The story behind RePXL — and why we grade every camera
            before it reaches you.
          </motion.p>

          {/* Quick-jump chips */}
          <motion.div variants={item} className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {[
              { label: 'Our story', href: '#our-story' },
              { label: 'How we grade', href: '#how-we-grade' },
              { label: 'What we believe', href: '#what-we-believe' },
              { label: 'Timeline', href: '#timeline' },
            ].map((chip) => (
              <a
                key={chip.href}
                href={chip.href}
                className="rounded-full border border-repixl-muted/20 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-repixl-muted transition-colors duration-200 hover:border-repixl-red/40 hover:text-repixl-red"
              >
                {chip.label}
              </a>
            ))}
          </motion.div>
        </motion.div>
      </Container>
    </section>
  )
}

/* ================================================================== */
/*  Our Story — parallax image stack, matching EditorialSection        */
/* ================================================================== */

function OurStory({ reducedMotion }: { reducedMotion: boolean }) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  })

  const backImgY = useTransform(scrollYProgress, [0, 1], reducedMotion ? [0, 0] : [30, -70])
  const frontImgY = useTransform(scrollYProgress, [0, 1], reducedMotion ? [0, 0] : [60, -30])
  const textY = useTransform(scrollYProgress, [0, 1], reducedMotion ? [0, 0] : [40, -40])

  const { container, item } = useVariants(reducedMotion)

  return (
    <section id="our-story" ref={sectionRef} className="py-20 md:py-32">
      <Container>
        <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
          {/* Left: parallax stacked imagery */}
          <div className="relative flex items-center justify-center">
            <div className="relative h-[360px] w-full max-w-[320px] md:h-[420px]">
              <motion.div
                style={{ y: reducedMotion ? 0 : backImgY }}
                className="absolute left-0 top-4 z-0 w-[72%] opacity-70"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/editorial-1.svg" alt="" className="h-auto w-full rounded-lg" />
              </motion.div>

              <motion.div
                style={{ y: reducedMotion ? 0 : frontImgY }}
                whileHover={reducedMotion ? undefined : { rotate: 0, scale: 1.03 }}
                initial={{ rotate: 3 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="absolute bottom-4 right-0 z-10 overflow-hidden rounded-sm bg-white p-2 shadow-xl"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/hero-sample-photo.svg"
                  alt="A photo from our collection"
                  className="h-32 w-32 object-cover md:h-40 md:w-40"
                />
                <p className="mt-1 text-center font-mono text-[9px] text-repixl-text-dark/50">
                  The first camera we graded · 2024
                </p>
              </motion.div>

              <div
                className="absolute -left-3 -top-3 z-20 h-14 w-14"
                aria-hidden="true"
                style={{ borderLeft: '1px solid rgba(140, 133, 128, 0.3)', borderTop: '1px solid rgba(140, 133, 128, 0.3)' }}
              />
              <div
                className="absolute -bottom-3 -right-3 z-20 h-14 w-14"
                aria-hidden="true"
                style={{ borderRight: '1px solid rgba(140, 133, 128, 0.3)', borderBottom: '1px solid rgba(140, 133, 128, 0.3)' }}
              />
            </div>
          </div>

          {/* Right: story text, staggered per paragraph */}
          <motion.div
            style={{ y: reducedMotion ? 0 : textY }}
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
          >
            <motion.span variants={item} className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
              — Our Story
            </motion.span>
            <motion.h2 variants={item} className="mt-3 font-display text-display-md text-repixl-text-light">
              Built from frustration.
            </motion.h2>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-repixl-text-light/75">
              <motion.p variants={item}>
                RePXL started with a frustration every collector knows too well:
                scrolling through secondhand marketplaces, squinting at blurry photos,
                and wondering if the &ldquo;Mint condition&rdquo; seller actually knows
                what mint condition means.
              </motion.p>
              <motion.p variants={item}>
                Vintage digital cameras — the early-2000s CCDs, the pocket-sized
                CyberShots, the PowerShots that shaped a generation of casual
                photography — deserve better than a guessing game.
              </motion.p>
              <motion.p variants={item}>
                So we built a marketplace where every camera is inspected, graded, and
                photographed before it&apos;s ever listed, and where the story of{' '}
                <em className="text-repixl-text-light">this specific unit</em> — its serial number, its wear, its
                history — is never hidden behind a stock photo.
              </motion.p>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  )
}

/* ================================================================== */
/*  How We Grade — NEW: numbered process with a connecting line        */
/* ================================================================== */

const processSteps = [
  {
    number: '01',
    title: 'Sourcing',
    description:
      'We track down units from estate sales, camera shops, and fellow collectors — every camera is inspected in person before it enters our pipeline.',
  },
  {
    number: '02',
    title: 'Inspection & Grading',
    description:
      'Every function is tested, every mark documented. Each unit is graded against our four-tier standard — Mint, Excellent, Good, or Fair — the same way, every time.',
  },
  {
    number: '03',
    title: 'Photography',
    description:
      'Multi-angle shots under consistent lighting, no filters or touch-ups. What you see on the listing is exactly what ships.',
  },
  {
    number: '04',
    title: 'Packing & Shipping',
    description:
      'Anti-static wrap, foam padding, double-boxed. Vintage electronics are fragile — we treat every shipment accordingly.',
  },
]

function HowWeGrade({
  reducedMotion,
  container,
  item,
}: {
  reducedMotion: boolean
  container: ReturnType<typeof useVariants>['container']
  item: ReturnType<typeof useVariants>['item']
}) {
  return (
    <section id="how-we-grade" className="border-y border-repixl-muted/10 py-20 md:py-32">
      <Container>
        <motion.div
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: reducedMotion ? 0 : 0.6, ease: 'easeOut' }}
          className="mb-14 text-center md:mb-20"
        >
          <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
            — Our Process
          </span>
          <h2 className="mt-3 font-display text-display-md text-repixl-text-light md:text-display-lg">
            How we grade
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-repixl-text-light/60">
            Four steps, every single time. No shortcuts, no exceptions.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="relative grid grid-cols-1 gap-6 md:grid-cols-4 md:gap-5"
        >
          {/* Connecting line, desktop only */}
          <div
            aria-hidden="true"
            className="absolute left-0 right-0 top-8 hidden h-px bg-repixl-muted/15 md:block"
          />

          {processSteps.map((step) => (
            <motion.div
              key={step.number}
              variants={item}
              whileHover={reducedMotion ? undefined : { y: -6 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="group relative rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-5 transition-all duration-300 hover:border-repixl-red/30 hover:shadow-[0_16px_36px_rgba(0,0,0,0.35)]"
            >
              <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-repixl-muted/30 bg-repixl-charcoal font-mono text-xs text-repixl-muted transition-colors duration-300 group-hover:border-repixl-red group-hover:text-repixl-red">
                {step.number}
              </span>
              <h3 className="mt-4 font-display text-base font-semibold text-repixl-text-light">
                {step.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-repixl-text-light/60">
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </section>
  )
}

/* ================================================================== */
/*  What We Believe — now with per-card stagger + hover                */
/* ================================================================== */

const beliefs = [
  {
    title: 'Standardized grading',
    description:
      "Every camera is assessed against the same four-tier standard — Mint, Excellent, Good, Fair — consistently and transparently.",
  },
  {
    title: 'Serial verification',
    description:
      "Every unit is serial-number verified and documented. You know exactly which camera you're buying.",
  },
  {
    title: 'Multi-angle photography',
    description:
      'Consistent lighting, multiple angles. What you see on the listing is what arrives at your door.',
  },
  {
    title: 'Transparent condition notes',
    description:
      'Wear, marks, quirks — described honestly in every listing. No hidden surprises, no disclaimers buried in fine print.',
  },
]

function WhatWeBelieve({
  reducedMotion,
  container,
  item,
}: {
  reducedMotion: boolean
  container: ReturnType<typeof useVariants>['container']
  item: ReturnType<typeof useVariants>['item']
}) {
  return (
    <section id="what-we-believe" className="py-20 md:py-32">
      <Container>
        <motion.div
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: reducedMotion ? 0 : 0.6, ease: 'easeOut' }}
          className="mx-auto max-w-3xl"
        >
          <div className="mb-12 text-center">
            <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
              — What We Believe
            </span>
            <h2 className="mt-3 font-display text-display-md text-repixl-text-light">
              Condition should mean something.
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-repixl-text-light/60">
              When we say Excellent, we mean it — verified against the same four-tier
              standard every time, not a seller&apos;s optimistic guess.
            </p>
          </div>

          <CornerBracket size={16} color="rgba(140, 133, 128, 0.2)" className="p-6 md:p-10">
            <motion.div
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-40px' }}
              className="grid grid-cols-1 gap-5 sm:grid-cols-2"
            >
              {beliefs.map((belief) => (
                <motion.div
                  key={belief.title}
                  variants={item}
                  whileHover={reducedMotion ? undefined : { y: -4 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="group rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-5 transition-shadow duration-300 hover:border-repixl-red/30 hover:shadow-[0_12px_30px_rgba(0,0,0,0.3)]"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-sm font-semibold text-repixl-text-light">
                      {belief.title}
                    </h3>
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 rounded-full bg-repixl-muted/30 transition-colors duration-300 group-hover:bg-repixl-red"
                    />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-repixl-text-light/60">
                    {belief.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: reducedMotion ? 0 : 0.5, delay: reducedMotion ? 0 : 0.4 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3"
            >
              <ConditionBadge condition="mint" />
              <ConditionBadge condition="excellent" />
              <ConditionBadge condition="good" />
              <ConditionBadge condition="fair" />
            </motion.div>
          </CornerBracket>
        </motion.div>
      </Container>
    </section>
  )
}

/* ================================================================== */
/*  Milestones — NEW: vertical timeline, scroll-revealed per entry     */
/* ================================================================== */

const milestones = [
  {
    date: 'Late 2023',
    title: 'The idea',
    description:
      'After one too many "mint condition" cameras that clearly weren\'t, our founder started sketching a four-tier grading standard on a notebook.',
  },
  {
    date: 'Early 2024',
    title: 'First camera graded',
    description:
      'A Canon PowerShot A520 became the very first unit to go through the full inspect-grade-photograph process.',
  },
  {
    date: 'Mid 2024',
    title: 'Serial verification goes live',
    description:
      'Every unit now gets logged and cross-checked by serial number before it\'s ever listed.',
  },
  {
    date: 'Late 2024',
    title: '500 collectors',
    description:
      'What started as a side project found its first real community of repeat buyers.',
  },
  {
    date: 'Today',
    title: '2,400+ collectors, six brands catalogued',
    description:
      'Still small, still collector-run — every camera gets the same care, whether it\'s $40 or a rare early CyberShot.',
  },
]

function Milestones({ reducedMotion }: { reducedMotion: boolean }) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start 0.8', 'end 0.5'],
  })
  const lineHeight = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])

  return (
    <section id="timeline" ref={sectionRef} className="border-y border-repixl-muted/10 py-20 md:py-32">
      <Container>
        <motion.div
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: reducedMotion ? 0 : 0.6, ease: 'easeOut' }}
          className="mb-14 text-center md:mb-20"
        >
          <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
            — Milestones
          </span>
          <h2 className="mt-3 font-display text-display-md text-repixl-text-light md:text-display-lg">
            How we got here
          </h2>
        </motion.div>

        <div className="relative mx-auto max-w-xl">
          {/* Static track */}
          <div className="absolute bottom-0 left-[7px] top-0 w-px bg-repixl-muted/15" aria-hidden="true" />
          {/* Animated fill, tracks scroll progress through the section */}
          <motion.div
            style={{ height: reducedMotion ? '100%' : lineHeight }}
            className="absolute left-[7px] top-0 w-px bg-repixl-red"
            aria-hidden="true"
          />

          <div className="flex flex-col gap-10">
            {milestones.map((milestone, i) => (
              <motion.div
                key={milestone.title}
                initial={reducedMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: reducedMotion ? 0 : 0.5, ease: 'easeOut', delay: reducedMotion ? 0 : i * 0.05 }}
                className="relative pl-8"
              >
                <span className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-repixl-red bg-repixl-bg" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-red">
                  {milestone.date}
                </span>
                <h3 className="mt-1 font-display text-base font-semibold text-repixl-text-light">
                  {milestone.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-repixl-text-light/60">
                  {milestone.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}

/* ================================================================== */
/*  Stats row — count-up animation when scrolled into view             */
/* ================================================================== */

function useCountUp(target: number, active: boolean, duration = 1.4) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!active) return
    let frame: number
    let start: number | null = null

    const step = (timestamp: number) => {
      if (start === null) start = timestamp
      const progress = Math.min((timestamp - start) / (duration * 1000), 1)
      setCount(Math.round(progress * target))
      if (progress < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [active, target, duration])

  return count
}

function StatCard({
  target,
  suffix = '',
  label,
  reducedMotion,
  item,
}: {
  target: number
  suffix?: string
  label: string
  reducedMotion: boolean
  item: ReturnType<typeof useVariants>['item']
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })
  const count = useCountUp(target, isInView && !reducedMotion)
  const displayValue = reducedMotion ? target : count

  return (
    <motion.div
      ref={ref}
      variants={item}
      whileHover={reducedMotion ? undefined : { y: -4 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-5 text-center transition-shadow duration-300 hover:shadow-[0_12px_30px_rgba(0,0,0,0.3)]"
    >
      <p className="font-display text-display-md font-bold text-repixl-text-light">
        {displayValue.toLocaleString()}
        {suffix}
      </p>
      <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-repixl-muted">
        {label}
      </p>
    </motion.div>
  )
}

function StatsRow({
  reducedMotion,
  container,
  item,
}: {
  reducedMotion: boolean
  container: ReturnType<typeof useVariants>['container']
  item: ReturnType<typeof useVariants>['item']
}) {
  return (
    <section className="py-20 md:py-28">
      <Container>
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="mx-auto grid max-w-3xl grid-cols-2 gap-6 md:grid-cols-4"
        >
          <StatCard target={2400} suffix="+" label="Collectors" reducedMotion={reducedMotion} item={item} />
          <StatCard target={totalCameras} label="Cameras in stock" reducedMotion={reducedMotion} item={item} />
          <StatCard target={totalBrands} label="Brands" reducedMotion={reducedMotion} item={item} />
          <StatCard target={4} label="Condition grades" reducedMotion={reducedMotion} item={item} />
        </motion.div>
      </Container>
    </section>
  )
}

/* ================================================================== */
/*  The Team — NEW: role-based cards, not fabricated named bios         */
/* ================================================================== */

const roles = [
  {
    initials: 'GR',
    title: 'Grading & Curation',
    description:
      'Every camera that comes through our door is personally tested and graded before it ever reaches a listing page.',
  },
  {
    initials: 'PH',
    title: 'Photography & QA',
    description:
      'Consistent lighting, honest angles, zero touch-ups. If a listing photo looks too good to be true, we re-shoot it.',
  },
  {
    initials: 'CC',
    title: 'Customer Care & Fulfillment',
    description:
      'From packing to post-sale questions — the same small team handles it all, start to finish.',
  },
]

function TheTeam({
  reducedMotion,
  container,
  item,
}: {
  reducedMotion: boolean
  container: ReturnType<typeof useVariants>['container']
  item: ReturnType<typeof useVariants>['item']
}) {
  return (
    <section className="py-20 md:py-28">
      <Container>
        <motion.div
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: reducedMotion ? 0 : 0.6, ease: 'easeOut' }}
          className="mb-12 text-center md:mb-16"
        >
          <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
            — Behind RePXL
          </span>
          <h2 className="mt-3 font-display text-display-md text-repixl-text-light md:text-display-lg">
            A small, collector-run team
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-repixl-text-light/60">
            No call centers, no outsourced warehouses — just a handful of people
            who care about vintage cameras as much as you do.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="mx-auto grid max-w-3xl grid-cols-1 gap-5 sm:grid-cols-3"
        >
          {roles.map((role) => (
            <motion.div
              key={role.title}
              variants={item}
              whileHover={reducedMotion ? undefined : { y: -4 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-5 text-center transition-shadow duration-300 hover:border-repixl-red/30 hover:shadow-[0_12px_30px_rgba(0,0,0,0.3)]"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-repixl-muted/30 font-mono text-xs font-medium text-repixl-muted">
                {role.initials}
              </div>
              <h3 className="mt-4 font-display text-sm font-semibold text-repixl-text-light">
                {role.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-repixl-text-light/60">
                {role.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </section>
  )
}

/* ================================================================== */
/*  Where We're Headed + CTA                                           */
/* ================================================================== */

function WhereHeaded({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <section className="border-t border-repixl-muted/10 py-20 md:py-28">
      <Container>
        <motion.div
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: reducedMotion ? 0 : 0.6, ease: 'easeOut' }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
            — Where We&apos;re Headed
          </span>
          <p className="mt-5 text-sm leading-relaxed text-repixl-text-light/75">
            RePXL is still young — we&apos;re a small, collector-run team, and every
            camera that passes through our hands gets the same care whether it&apos;s a
            $40 point-and-shoot or a rare early CyberShot. As we grow, our commitment
            stays the same:{' '}
            <strong className="text-repixl-text-light">transparency first, always.</strong>
          </p>
          <Link href="/products" className="mt-8 inline-block">
            <motion.div whileHover={reducedMotion ? undefined : { scale: 1.03 }} whileTap={reducedMotion ? undefined : { scale: 0.98 }}>
              <CornerBracket size={10} color="rgba(194, 44, 44, 0.4)" className="px-1 py-1">
                <Button variant="primary" size="lg">
                  Browse the Collection
                </Button>
              </CornerBracket>
            </motion.div>
          </Link>
        </motion.div>
      </Container>
    </section>
  )
}