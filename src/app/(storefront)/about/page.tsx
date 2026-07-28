'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { Button, CornerBracket, ConditionBadge } from '@/components/ui'
import { Footer } from '@/components/layout/Footer'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { products } from '@/data/products'

const totalCameras = products.filter((p) => p.stock > 0).length
const totalBrands = new Set(products.map((p) => p.brand)).size

export default function AboutPage() {
  const reducedMotion = useReducedMotion()

  const fadeUp = {
    initial: reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: reducedMotion ? 0 : 0.6, ease: 'easeOut' },
  }

  return (
    <div className="bg-repixl-bg">
      {/* Hero-lite — gradient background */}
      <section
        className="relative overflow-hidden pb-20 pt-32 md:pb-28 md:pt-40"
        style={{
          background: 'linear-gradient(175deg, #EBD3CE 0%, #6b4a4a 30%, #16131a 65%, #121012 100%)',
        }}
      >
        <Container>
          <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
            <span className="font-mono text-xs uppercase tracking-widest text-repixl-muted">
              — About RePIXL
            </span>
            <CornerBracket size={14} color="rgba(245, 241, 236, 0.25)" className="mx-auto mt-5 inline-block px-6 py-4">
              <h1 className="font-display text-display-lg text-repixl-text-light md:text-display-xl">
                By collectors,
                <br />
                <span className="italic text-repixl-rose">for collectors.</span>
              </h1>
            </CornerBracket>
            <p className="mx-auto mt-6 max-w-lg text-base text-repixl-text-light/70">
              The story behind RePIXL — and why we grade every camera
              before it reaches you.
            </p>
          </motion.div>
        </Container>
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24" style={{ background: 'linear-gradient(to bottom, transparent, #121012)' }} />
      </section>

      {/* Our Story — editorial split layout */}
      <section className="py-20 md:py-32">
        <Container>
          <motion.div {...fadeUp} className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
            {/* Left: stacked imagery */}
            <div className="relative flex items-center justify-center">
              <div className="relative h-[360px] w-full max-w-[320px] md:h-[420px]">
                {/* Back image */}
                <div className="absolute left-0 top-4 z-0 w-[72%] opacity-70">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/editorial-1.svg" alt="" className="h-auto w-full rounded-lg" />
                </div>
                {/* Front polaroid-style card */}
                <div className="absolute bottom-4 right-0 z-10 rotate-3 overflow-hidden rounded-sm bg-white p-2 shadow-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/hero-sample-photo.svg" alt="A photo from our collection" className="h-32 w-32 object-cover md:h-40 md:w-40" />
                  <p className="mt-1 text-center font-mono text-[9px] text-repixl-text-dark/50">
                    The first camera we graded · 2024
                  </p>
                </div>
                {/* Corner bracket accent */}
                <div className="absolute -left-3 -top-3 z-20 h-14 w-14" aria-hidden="true" style={{ borderLeft: '1px solid rgba(140, 133, 128, 0.3)', borderTop: '1px solid rgba(140, 133, 128, 0.3)' }} />
                <div className="absolute -bottom-3 -right-3 z-20 h-14 w-14" aria-hidden="true" style={{ borderRight: '1px solid rgba(140, 133, 128, 0.3)', borderBottom: '1px solid rgba(140, 133, 128, 0.3)' }} />
              </div>
            </div>

            {/* Right: story text */}
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
                — Our Story
              </span>
              <h2 className="mt-3 font-display text-display-md text-repixl-text-light">
                Built from frustration.
              </h2>
              <div className="mt-5 space-y-4 text-sm leading-relaxed text-repixl-text-light/75">
                <p>
                  RePIXL started with a frustration every collector knows too well:
                  scrolling through secondhand marketplaces, squinting at blurry photos,
                  and wondering if the &ldquo;Mint condition&rdquo; seller actually knows
                  what mint condition means.
                </p>
                <p>
                  Vintage digital cameras — the early-2000s CCDs, the pocket-sized
                  CyberShots, the PowerShots that shaped a generation of casual
                  photography — deserve better than a guessing game.
                </p>
                <p>
                  So we built a marketplace where every camera is inspected, graded, and
                  photographed before it&apos;s ever listed, and where the story of{' '}
                  <em className="text-repixl-text-light">this specific unit</em> — its serial number, its wear, its
                  history — is never hidden behind a stock photo.
                </p>
              </div>
            </div>
          </motion.div>
        </Container>
      </section>

      {/* What We Believe — card grid in CornerBracket */}
      <section className="border-y border-repixl-muted/10 py-20 md:py-32">
        <Container>
          <motion.div {...fadeUp} className="mx-auto max-w-3xl">
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
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <BeliefCard
                  title="Standardized grading"
                  description="Every camera is assessed against the same four-tier standard — Mint, Excellent, Good, Fair — consistently and transparently."
                />
                <BeliefCard
                  title="Serial verification"
                  description="Every unit is serial-number verified and documented. You know exactly which camera you're buying."
                />
                <BeliefCard
                  title="Multi-angle photography"
                  description="Consistent lighting, multiple angles. What you see on the listing is what arrives at your door."
                />
                <BeliefCard
                  title="Transparent condition notes"
                  description="Wear, marks, quirks — described honestly in every listing. No hidden surprises, no disclaimers buried in fine print."
                />
              </div>

              {/* Condition badges */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <ConditionBadge condition="mint" />
                <ConditionBadge condition="excellent" />
                <ConditionBadge condition="good" />
                <ConditionBadge condition="fair" />
              </div>
            </CornerBracket>
          </motion.div>
        </Container>
      </section>

      {/* Stats row */}
      <section className="py-20 md:py-28">
        <Container>
          <motion.div {...fadeUp} className="mx-auto grid max-w-3xl grid-cols-2 gap-6 md:grid-cols-4">
            <StatCard number="2,400+" label="Collectors" />
            <StatCard number={String(totalCameras)} label="Cameras in stock" />
            <StatCard number={String(totalBrands)} label="Brands" />
            <StatCard number="4" label="Condition grades" />
          </motion.div>
        </Container>
      </section>

      {/* Where We're Headed + CTA */}
      <section className="border-t border-repixl-muted/10 py-20 md:py-28">
        <Container>
          <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
            <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
              — Where We&apos;re Headed
            </span>
            <p className="mt-5 text-sm leading-relaxed text-repixl-text-light/75">
              RePIXL is still young — we&apos;re a small, collector-run team, and every
              camera that passes through our hands gets the same care whether it&apos;s a
              $40 point-and-shoot or a rare early CyberShot. As we grow, our commitment
              stays the same:{' '}
              <strong className="text-repixl-text-light">transparency first, always.</strong>
            </p>
            <Link href="/products" className="mt-8 inline-block">
              <CornerBracket size={10} color="rgba(194, 44, 44, 0.4)" className="px-1 py-1">
                <Button variant="primary" size="lg">
                  Browse the Collection
                </Button>
              </CornerBracket>
            </Link>
          </motion.div>
        </Container>
      </section>

      <Footer />
    </div>
  )
}

function BeliefCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-5">
      <h3 className="font-display text-sm font-semibold text-repixl-text-light">
        {title}
      </h3>
      <p className="mt-2 text-xs leading-relaxed text-repixl-text-light/60">
        {description}
      </p>
    </div>
  )
}

function StatCard({ number, label }: { number: string; label: string }) {
  return (
    <div className="rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-5 text-center">
      <p className="font-display text-display-md font-bold text-repixl-text-light">
        {number}
      </p>
      <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-repixl-muted">
        {label}
      </p>
    </div>
  )
}
