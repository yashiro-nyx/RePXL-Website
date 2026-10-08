'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { Button, CornerBracket, ConditionBadge } from '@/components/ui'
import { RevealText } from '@/components/ui/RevealText'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useThemeStore } from '@/stores/themeStore'
import { TrustStrip } from '@/components/landing/TrustStrip'
import { products } from '@/data/products'
import { CmsPageLayout } from '@/components/layout/CmsPageLayout'
import { DEFAULT_ABOUT_BODY } from '@/lib/cms-defaults'

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
  const [customPage, setCustomPage] = useState<{
    title: string
    body: string
    updatedAt: string
    status: string
  } | null>(null)

  useEffect(() => {
    let isMounted = true
    fetch('/api/pages/about')
      .then((res) => (res.ok ? res.json() : null))
      .then((res) => {
        if (!isMounted) return
        const page = res?.data
        if (page?.body && page.body.trim() !== DEFAULT_ABOUT_BODY.trim()) {
          setCustomPage(page)
        }
      })
      .catch(() => {})
    return () => {
      isMounted = false
    }
  }, [])

  if (customPage) {
    return (
      <CmsPageLayout
        title={customPage.title}
        body={customPage.body}
        updatedAt={customPage.updatedAt}
        isDraft={customPage.status === 'DRAFT'}
      />
    )
  }

  return (
    <div>
      <AboutHero reducedMotion={reducedMotion} />
      <TrustStrip />
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
/*  Hero — cinematic background + word-by-word heading reveal          */
/* ================================================================== */

function AboutHero({ reducedMotion }: { reducedMotion: boolean }) {
  const theme = useThemeStore((s) => s.theme)
  const isLight = theme === 'light'

  const { container, item } = useVariants(reducedMotion)

  return (
    <section className="relative min-h-[560px] overflow-hidden pb-12 pt-24 md:min-h-[620px] md:pt-28">
      {/* The supplied still is the About-page hero visual. */}
      <div className="pointer-events-none absolute inset-0 -z-20 overflow-hidden">
        <Image
          src="/images/aboutbg.png"
          alt="Vintage Canon film camera resting beside a roll of film in a darkroom"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[68%_center]"
        />
        <div className={`absolute inset-0 ${isLight ? 'bg-[#F5F1EC]/45' : 'bg-repixl-bg/25'}`} />
        <div className={`absolute inset-0 bg-gradient-to-r ${isLight ? 'from-[#F5F1EC] via-[#F5F1EC]/90 to-transparent' : 'from-repixl-bg via-repixl-bg/85 to-transparent'}`} />
        <div className={`absolute inset-0 bg-gradient-to-t ${isLight ? 'from-[#F5F1EC] via-transparent to-[#F5F1EC]/20' : 'from-repixl-bg via-transparent to-repixl-bg/20'}`} />
      </div>

      {/* Viewfinder corner accents matching the rest of the About page */}
      <div className="pointer-events-none absolute inset-4 z-0 md:inset-8" aria-hidden="true">
        <span className={`absolute left-0 top-0 h-6 w-6 sm:h-10 sm:w-10 border-l border-t ${isLight ? 'border-neutral-400/30' : 'border-white/15'}`} />
        <span className={`absolute right-0 top-0 h-6 w-6 sm:h-10 sm:w-10 border-r border-t ${isLight ? 'border-neutral-400/30' : 'border-white/15'}`} />
        <span className={`absolute bottom-0 left-0 h-6 w-6 sm:h-10 sm:w-10 border-b border-l ${isLight ? 'border-neutral-400/30' : 'border-white/15'}`} />
        <span className={`absolute bottom-0 right-0 h-6 w-6 sm:h-10 sm:w-10 border-b border-r ${isLight ? 'border-neutral-400/30' : 'border-white/15'}`} />
      </div>

      <Container className="relative z-10">
        <div className="relative grid min-h-[440px] grid-cols-1 items-center lg:min-h-[500px] lg:grid-cols-12">
          <motion.div variants={container} initial="hidden" animate="show" className="relative z-10 lg:col-span-6">
            <motion.div variants={item} className="mb-5 flex items-center gap-2.5">
              <span className="h-px w-8 bg-repixl-red" aria-hidden="true" />
              <span className="font-mono text-xs uppercase tracking-widest text-repixl-muted">
                About RePXL
              </span>
            </motion.div>
            <motion.div variants={item}>
              <h1 className="max-w-[620px] font-display text-[clamp(3.25rem,4.5vw,4.5rem)] leading-[0.94] text-repixl-text-light">
                <RevealText text="By collectors," as="span" className="block sm:whitespace-nowrap" />
                <span className="block italic text-repixl-red sm:whitespace-nowrap">
                  <RevealText text="for collectors." as="span" delay={0.15} />
                </span>
              </h1>
            </motion.div>

            <motion.p variants={item} className="mt-6 max-w-md text-base leading-relaxed text-repixl-text-light/75">
              RePXL is more than just a store — it&apos;s a community built for people who
              see beauty in the details, the stories behind every shot, and the timeless
              value of vintage cameras.
            </motion.p>

            <motion.div variants={item} className="mt-7 flex flex-wrap gap-2">
              <a href="#our-story" className="rounded-full border border-repixl-muted/20 px-3.5 py-2 font-mono text-[10px] uppercase tracking-widest text-repixl-muted transition-colors hover:border-repixl-red/40 hover:bg-repixl-red/5 hover:text-repixl-red">Our story</a>
              <a href="#how-we-grade" className="rounded-full border border-repixl-muted/20 px-3.5 py-2 font-mono text-[10px] uppercase tracking-widest text-repixl-muted transition-colors hover:border-repixl-red/40 hover:bg-repixl-red/5 hover:text-repixl-red">How we grade</a>
              <a href="#what-we-believe" className="rounded-full border border-repixl-muted/20 px-3.5 py-2 font-mono text-[10px] uppercase tracking-widest text-repixl-muted transition-colors hover:border-repixl-red/40 hover:bg-repixl-red/5 hover:text-repixl-red">What we believe</a>
              <a href="#timeline" className="rounded-full border border-repixl-muted/20 px-3.5 py-2 font-mono text-[10px] uppercase tracking-widest text-repixl-muted transition-colors hover:border-repixl-red/40 hover:bg-repixl-red/5 hover:text-repixl-red">Timeline</a>
            </motion.div>
          </motion.div>

        </div>
      </Container>
    </section>
  )
}

/* ================================================================== */
/*  Our Story — editorial copy and metadata list                         */
/* ================================================================== */

const storyFeatures = [
  {
    title: 'Curated selection',
    description: 'Authentic, functional, and carefully inspected vintage cameras.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14.5 5h-5L7.5 8H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-2.5l-2-3Z" />
        <circle cx="12" cy="13" r="3.25" />
      </svg>
    ),
  },
  {
    title: 'Transparent grading',
    description: 'Clear condition grades and real photos — no surprises.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    title: 'A growing community',
    description: 'For collectors, dreamers, and creators who value analog charm.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    title: 'Timeless value',
    description: 'Because great photos never go out of style.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m12 3 1.35 4.15L17.5 8.5l-4.15 1.35L12 14l-1.35-4.15L6.5 8.5l4.15-1.35L12 3Z" />
        <path d="m19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" />
      </svg>
    ),
  },
] as const

function OurStory({ reducedMotion }: { reducedMotion: boolean }) {
  const sectionRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  })

  const textY = useTransform(scrollYProgress, [0, 1], reducedMotion ? [0, 0] : [12, -12])

  const { container, item } = useVariants(reducedMotion)

  return (
    <section id="our-story" ref={sectionRef} className="relative isolate overflow-hidden py-20 md:py-24">
      <Container>
        <div className="relative grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-14 xl:gap-20">
          <div className="pointer-events-none absolute bottom-0 left-1/2 top-0 hidden w-px bg-repixl-muted/15 lg:block" aria-hidden="true" />
          {/* Left: story text anchored to the page grid */}
          <motion.div
            style={{ y: reducedMotion ? 0 : textY }}
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="relative z-10 lg:col-span-5 xl:col-span-5"
          >
            <motion.div variants={item} className="mb-3 flex items-center gap-2">
              <span className="h-px w-8 bg-repixl-red" aria-hidden="true" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
                Our Story
              </span>
            </motion.div>
            <motion.h2 variants={item} className="font-display text-[clamp(2.6rem,4vw,3.25rem)] leading-tight text-repixl-text-light">
              Built from frustration.
            </motion.h2>
            <div className="mt-6 max-w-xl space-y-4 text-sm leading-relaxed text-repixl-text-light/75 md:text-base">
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

            <motion.div variants={item} className="mt-8 flex items-center gap-3" aria-hidden="true">
              <span className="font-mono text-[10px] tracking-[0.24em] text-repixl-muted/40">
                01 / ARCHIVE
              </span>
              <span className="h-px w-16 bg-repixl-muted/20" />
            </motion.div>
          </motion.div>

          {/* Right: editorial feature list, not a card grid */}
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="relative z-10 lg:col-span-6 lg:col-start-7"
          >
            <p className="relative mb-6 font-mono text-[10px] uppercase tracking-[0.22em] text-repixl-muted">What we stand for</p>
            <ul className="relative space-y-5">
              {storyFeatures.map(({ icon, title, description }) => (
                <motion.li key={title} variants={item} className="group">
                  <div className="flex gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-repixl-red/45 bg-repixl-charcoal/30 text-repixl-red transition-colors duration-300 group-hover:border-repixl-red group-hover:bg-repixl-red/10" aria-hidden="true">
                      <span className="h-6 w-6">{icon}</span>
                    </span>
                    <div>
                      <h3 className="font-mono text-sm uppercase tracking-[0.12em] text-repixl-text-light">{title}</h3>
                      <p className="mt-1 max-w-sm text-sm leading-relaxed text-repixl-text-light/60">{description}</p>
                    </div>
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
        <div className="mt-12 flex items-center gap-4 border-t border-repixl-muted/15 pt-4 font-mono text-[9px] uppercase tracking-[0.2em] text-repixl-muted/50">
          <span>RePXL — Vintage cameras for modern creators</span>
          <span className="h-px flex-1 bg-repixl-muted/15" aria-hidden="true" />
          <span>02 / 04</span>
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
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Inspection & Grading',
    description:
      'Every function is tested, every mark documented. Each unit is graded against our four-tier standard — Mint, Excellent, Good, or Fair — the same way, every time.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Photography',
    description:
      'Multi-angle shots under consistent lighting, no filters or touch-ups. What you see on the listing is exactly what ships.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
        <circle cx="12" cy="13" r="3" />
      </svg>
    ),
  },
  {
    number: '04',
    title: 'Packing & Shipping',
    description:
      'Anti-static wrap, foam padding, double-boxed. Vintage electronics are fragile — we treat every shipment accordingly.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m7.5 4.27 9 5.15" />
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
    ),
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
          <div className="mb-2 flex items-center justify-center gap-2">
            <span className="h-px w-8 bg-repixl-red" aria-hidden="true" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
              Our Process
            </span>
            <span className="h-px w-8 bg-repixl-red" aria-hidden="true" />
          </div>
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
              <div className="flex items-center justify-between">
                <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-repixl-muted/30 bg-repixl-charcoal font-mono text-xs text-repixl-muted transition-colors duration-300 group-hover:border-repixl-red group-hover:text-repixl-red">
                  {step.number}
                </span>
                <span className="text-repixl-muted/50 transition-colors duration-300 group-hover:text-repixl-red">
                  {step.icon}
                </span>
              </div>
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
            <div className="mb-2 flex items-center justify-center gap-2">
              <span className="h-px w-8 bg-repixl-red" aria-hidden="true" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
                What We Believe
              </span>
              <span className="h-px w-8 bg-repixl-red" aria-hidden="true" />
            </div>
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

            {/* Bottom note matching 14-day trust policy */}
            <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
              Serial numbers verified · Multi-angle photos · 14-day return window
            </p>
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
      'Still small, still collector-run — every camera that passes through our hands gets the same care, whether it\'s a budget compact or a rare early CyberShot.',
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
          <div className="mb-2 flex items-center justify-center gap-2">
            <span className="h-px w-8 bg-repixl-red" aria-hidden="true" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
              Milestones
            </span>
            <span className="h-px w-8 bg-repixl-red" aria-hidden="true" />
          </div>
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

const catalogBrands = [
  { name: 'Canon', slug: 'canon', family: 'POWERSHOT', accentColor: '#EF4444' },
  { name: 'Nikon', slug: 'nikon', family: 'COOLPIX', accentColor: '#F59E0B' },
  { name: 'Sony', slug: 'sony', family: 'CYBERSHOT', accentColor: '#38BDF8' },
  { name: 'Kodak', slug: 'kodak', family: 'EASYSHARE', accentColor: '#F97316' },
  { name: 'Panasonic', slug: 'panasonic', family: 'LUMIX', accentColor: '#14B8A6' },
  { name: 'Fujifilm', slug: 'fujifilm', family: 'FINEPIX', accentColor: '#22C55E' },
]

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
      className="rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-5 text-center transition-shadow duration-300 hover:border-repixl-red/30 hover:shadow-[0_12px_30px_rgba(0,0,0,0.3)]"
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
          className="mx-auto max-w-3xl"
        >
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <StatCard target={2400} suffix="+" label="Collectors" reducedMotion={reducedMotion} item={item} />
            <StatCard target={totalCameras} label="Cameras in stock" reducedMotion={reducedMotion} item={item} />
            <StatCard target={totalBrands} label="Brands" reducedMotion={reducedMotion} item={item} />
            <StatCard target={4} label="Condition grades" reducedMotion={reducedMotion} item={item} />
          </div>

          {/* Catalogued Brands Strip — mirroring BrandGallery from homepage */}
          <motion.div
            variants={item}
            className="mt-10 rounded-xl border border-repixl-muted/10 bg-repixl-charcoal/40 p-5 sm:p-6 backdrop-blur-sm"
          >
            <div className="mb-4 flex items-center justify-between border-b border-repixl-muted/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-repixl-red" aria-hidden="true" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
                  Catalogued Lineages
                </span>
              </div>
              <span className="font-mono text-[9px] uppercase tracking-widest text-repixl-muted/60">
                CCD & Vintage Digital
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-6">
              {catalogBrands.map((b) => (
                <Link
                  key={b.slug}
                  href={`/products?brand=${b.slug}`}
                  className="group flex flex-col items-center justify-center rounded-lg border border-repixl-muted/10 bg-repixl-charcoal/60 px-3 py-3 text-center transition-all duration-300 hover:border-repixl-red/40 hover:bg-repixl-charcoal hover:shadow-md"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full transition-transform duration-200 group-hover:scale-125"
                    style={{ backgroundColor: b.accentColor }}
                  />
                  <span className="mt-1.5 font-display text-xs font-semibold text-repixl-text-light group-hover:text-repixl-red transition-colors">
                    {b.name}
                  </span>
                  <span className="font-mono text-[8px] uppercase tracking-wider text-repixl-muted/70">
                    {b.family}
                  </span>
                </Link>
              ))}
            </div>
          </motion.div>
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
          <div className="mb-2 flex items-center justify-center gap-2">
            <span className="h-px w-8 bg-repixl-red" aria-hidden="true" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
              Behind RePXL
            </span>
            <span className="h-px w-8 bg-repixl-red" aria-hidden="true" />
          </div>
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
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-repixl-muted/30 font-mono text-xs font-medium text-repixl-muted transition-colors duration-300 group-hover:border-repixl-red group-hover:text-repixl-red">
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
  const theme = useThemeStore((s) => s.theme)
  const isLight = theme === 'light'

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
          <div className="mb-3 flex items-center justify-center gap-2">
            <span className="h-px w-8 bg-repixl-red" aria-hidden="true" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
              Where We&apos;re Headed
            </span>
            <span className="h-px w-8 bg-repixl-red" aria-hidden="true" />
          </div>
          <p className="mt-5 text-sm leading-relaxed text-repixl-text-light/75">
            RePXL is still young — we&apos;re a small, collector-run team, and every
            camera that passes through our hands gets the same care whether it&apos;s a
            budget point-and-shoot or a rare early CyberShot. As we grow, our commitment
            stays the same:{' '}
            <strong className="text-repixl-text-light">transparency first, always.</strong>
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/products"
              className={`group/btn inline-flex items-center justify-between gap-3.5 rounded-full border px-7 py-3.5 font-mono text-xs font-semibold uppercase tracking-wider transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF4444] focus-visible:ring-offset-2 ${
                isLight
                  ? 'border-neutral-300 bg-white text-neutral-900 shadow-sm hover:border-[#B91C1C] hover:bg-[#B91C1C] hover:text-white hover:shadow-[0_0_20px_rgba(185,28,28,0.25)] focus-visible:border-[#B91C1C] focus-visible:bg-[#B91C1C] focus-visible:text-white focus-visible:ring-offset-white'
                  : 'border-white/20 bg-white text-neutral-950 hover:border-[#EF4444] hover:bg-[#EF4444] hover:text-white hover:shadow-[0_0_24px_rgba(239,68,68,0.4)] focus-visible:border-[#EF4444] focus-visible:bg-[#EF4444] focus-visible:text-white focus-visible:ring-offset-black'
              }`}
            >
              <span>Browse the Collection</span>
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors duration-300 ${
                  isLight
                    ? 'bg-neutral-100 text-neutral-900 group-hover/btn:bg-white/20 group-hover/btn:text-white'
                    : 'bg-black/10 text-neutral-950 group-hover/btn:bg-white/20 group-hover/btn:text-white'
                }`}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-transform duration-200 group-hover/btn:translate-x-0.5"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </span>
            </Link>
          </div>
        </motion.div>
      </Container>
    </section>
  )
}
