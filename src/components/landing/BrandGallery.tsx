'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { RevealText, SectionHeader } from '@/components/ui'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useThemeStore } from '@/stores/themeStore'
import { useProductStore } from '@/stores/productStore'
import type { Product } from '@/types'

const brands = [
  {
    number: '01',
    name: 'Canon',
    slug: 'canon',
    preferredSlug: 'canon-powershot-a520',
    family: 'POWERSHOT',
    series: 'PowerShot Series',
    yearRange: '2000–2008',
    accentColor: '#EF4444',
    sampleImage: '/images/era-samples/canon-era.jpg',
    fallbackCamera: '/images/era-cameras/canon-powershot-a520.webp',
    sampleLabel: 'Direct Flash Snapshot',
    geomVariant: 3,
  },
  {
    number: '02',
    name: 'Nikon',
    slug: 'nikon',
    preferredSlug: 'nikon-coolpix-3200',
    family: 'COOLPIX',
    series: 'Coolpix Series',
    yearRange: '2001–2009',
    accentColor: '#F59E0B',
    sampleImage: '/images/era-samples/nikon-era.jpg',
    fallbackCamera: '/images/era-cameras/nikon-coolpix-3200.webp',
    sampleLabel: 'Warm Daylight Documentary',
    geomVariant: 0,
  },
  {
    number: '03',
    name: 'Sony',
    slug: 'sony',
    preferredSlug: 'sony-cybershot-w800',
    family: 'CYBERSHOT',
    series: 'Cyber-shot Series',
    yearRange: '2000–2010',
    accentColor: '#38BDF8',
    sampleImage: '/images/era-samples/sony-era.jpg',
    fallbackCamera: '/images/era-cameras/sony-cybershot-w800.webp',
    sampleLabel: 'Rainy Shibuya Neon',
    geomVariant: 2,
  },
  {
    number: '04',
    name: 'Kodak',
    slug: 'kodak',
    preferredSlug: 'kodak-easyshare-c300',
    family: 'EASYSHARE',
    series: 'EasyShare Series',
    yearRange: '2001–2007',
    accentColor: '#F97316',
    sampleImage: '/images/era-samples/kodak-era.jpg',
    fallbackCamera: '/images/era-cameras/kodak-easyshare-c300.webp',
    sampleLabel: 'Kodachrome Sunset Field',
    geomVariant: 1,
  },
  {
    number: '05',
    name: 'Panasonic',
    slug: 'panasonic',
    preferredSlug: 'panasonic-lumix-dmc-fz7',
    family: 'LUMIX',
    series: 'Lumix Series',
    yearRange: '2002–2010',
    accentColor: '#14B8A6',
    sampleImage: '/images/era-samples/panasonic-era.jpg',
    fallbackCamera: '/images/era-cameras/panasonic-lumix-dmc-fz7.webp',
    sampleLabel: 'Aegean Coastal Travel',
    geomVariant: 0,
  },
  {
    number: '06',
    name: 'Fujifilm',
    slug: 'fujifilm',
    preferredSlug: 'fujifilm-finepix-f30',
    family: 'FINEPIX',
    series: 'FinePix Series',
    yearRange: '2001–2009',
    accentColor: '#22C55E',
    sampleImage: '/images/era-samples/fujifilm-era.jpg',
    fallbackCamera: '/images/era-cameras/fujifilm-finepix-f30.webp',
    sampleLabel: 'Misty Velvia Forest Tone',
    geomVariant: 1,
  },
]

const spotlights = [
  {
    brand: 'Canon',
    slug: 'canon',
    tagline: 'The PowerShot Signature',
    description:
      "Warm highlights, magenta-shifted shadows, and a softness in contrast that no modern sensor bothers to replicate. The A-series turned point-and-shoot into a color science all its own.",
    images: ['/images/canon1.png', '/images/canon2.png', '/images/canonsample.png'],
  },
  {
    brand: 'Sony',
    slug: 'sony',
    tagline: 'CyberShot Clarity',
    description:
      'Crisp, slightly cool, and unmistakably digital — the CyberShot line rendered light with a clarity that felt futuristic in 2003 and feels like nostalgia now.',
    images: ['/images/sony1.png', '/images/sony2.png', '/images/sonysample.png'],
  },
  {
    brand: 'Kodak',
    slug: 'kodak',
    tagline: 'Kodachrome-Adjacent Warmth',
    description:
      "Golden highlights, rich reds, and blacks that never quite crush all the way — Kodak's CCDs carried a little of the company's film heritage into every digital frame.",
    images: ['/images/kodak1.png', '/images/kodak2.png', '/images/kodakpola.png'],
  },
]

function CanonSpotlight({ spotlight }: { spotlight: (typeof spotlights)[number] }) {
  const reducedMotion = useReducedMotion()
  const theme = useThemeStore((s) => s.theme)
  const isLight = theme === 'light'
  const sectionRef = useRef<HTMLDivElement>(null)

  return (
    <motion.div
      ref={sectionRef}
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, margin: '-60px' }}
      transition={{ duration: reducedMotion ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12"
    >
      {/* Photographic Collage — Left ~58% (7 cols on lg, order-2 on mobile, lg:order-1 on desktop) */}
      <div className="order-2 lg:order-1 lg:col-span-7">
        <div className="relative">
          {/* Subtle editorial technical accents */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-5 left-0 hidden font-mono text-[10px] uppercase tracking-widest text-repixl-muted/50 sm:block select-none"
          >
            + ARCHIVE 01 // POWERSHOT A-SERIES
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-5 right-0 hidden font-mono text-[10px] uppercase tracking-widest text-repixl-muted/50 sm:block select-none"
          >
            DIGITAL FLASH ERA +
          </div>

          {/* Collage Grid:
              Within gallery:
              Main column (canon1.png): ~66.7% (8 cols of 12)
              Secondary column (canon2 & canonsample): ~33.3% (4 cols of 12)
              Mobile (< sm): Stacked (canon1 full width, then canon2 & canonsample side-by-side)
              Desktop (>= sm): Asymmetric 2-column (left canon1 full height, right canon2 & canonsample stacked)
          */}
          <div className="flex flex-col gap-3 sm:grid sm:grid-cols-12 sm:gap-3.5">
            {/* Dominant Large Image: canon1.png (~66.7% width in collage on desktop) */}
            <div className="group/img relative aspect-[4/3] sm:aspect-auto sm:h-full sm:min-h-[460px] md:min-h-[480px] lg:min-h-[500px] sm:col-span-8 overflow-hidden rounded-2xl border border-neutral-200/80 bg-neutral-900 shadow-sm transition-all duration-300 dark:border-white/10">
              <Image
                src={spotlight.images[0]}
                alt="Silver Canon PowerShot compact camera with extended lens under red studio lighting"
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 58vw, 650px"
                className="object-cover object-center transition-transform duration-700 ease-out group-hover/img:scale-[1.03]"
                priority={false}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80"
              />
              {/* Technical / Editorial Micro-Badge */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-3.5 left-3.5 z-10 flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-3 py-1 backdrop-blur-md"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444] animate-pulse" />
                <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-white/90">
                  Canon PowerShot · 2003
                </span>
              </div>
            </div>

            {/* Secondary Images: canon2.png (top) and canonsample.png (bottom) (~33.3% width in collage on desktop) */}
            <div className="grid grid-cols-2 gap-3 sm:col-span-4 sm:flex sm:flex-col sm:gap-3.5">
              {/* Secondary upper image: canon2.png (Rear view with LCD and controls) */}
              <div className="group/img relative aspect-square sm:aspect-auto sm:min-h-[220px] md:min-h-[230px] lg:min-h-[242px] sm:flex-1 overflow-hidden rounded-2xl border border-neutral-200/80 bg-neutral-900 shadow-sm transition-all duration-300 dark:border-white/10">
                <Image
                  src={spotlight.images[1]}
                  alt="Rear of a Canon PowerShot camera showing its LCD screen and controls"
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 320px"
                  className="object-cover object-center transition-transform duration-700 ease-out group-hover/img:scale-[1.03]"
                  priority={false}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute top-3 right-3 z-10 rounded border border-white/15 bg-black/50 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-white/80 backdrop-blur-sm"
                >
                  Rear Controls · LCD
                </div>
              </div>

              {/* Secondary lower image: canonsample.png (Night direct flash snapshot) */}
              <div className="group/img relative aspect-square sm:aspect-auto sm:min-h-[220px] md:min-h-[230px] lg:min-h-[242px] sm:flex-1 overflow-hidden rounded-2xl border border-neutral-200/80 bg-neutral-900 shadow-sm transition-all duration-300 dark:border-white/10">
                <Image
                  src={spotlight.images[2]}
                  alt="Early-2000s nighttime point-and-shoot photograph of a car outside a convenience store"
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 320px"
                  className="object-cover object-center transition-transform duration-700 ease-out group-hover/img:scale-[1.03]"
                  priority={false}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-3 right-3 z-10 rounded border border-white/15 bg-black/50 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-white/80 backdrop-blur-sm"
                >
                  Flash Snapshot
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editorial Copy — Right ~42% (5 cols on lg, order-1 on mobile, lg:order-2 on desktop) */}
      <div className="order-1 flex flex-col items-start lg:order-2 lg:col-span-5">
        {/* Eyebrow matching SectionHeader */}
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs uppercase tracking-widest text-[#EF4444]">
            — IN FOCUS
          </span>
        </div>

        {/* Section Heading with established font and highlightWord */}
        <RevealText
          as="h3"
          text={spotlight.tagline}
          highlightWord="Signature"
          className="mt-3 font-display text-[clamp(2.1rem,4.5vw,2.85rem)] font-bold leading-[1.08] tracking-tight text-repixl-text-light"
        />

        {/* Body Copy */}
        <p className="mt-5 max-w-md text-sm sm:text-base leading-relaxed text-repixl-text-light/75">
          {spotlight.description}
        </p>

        {/* Technical Badges — Canon PowerShot heritage */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-repixl-muted/20 bg-repixl-muted/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-repixl-text-light/75">
            CCD Color Science
          </span>
          <span className="inline-flex items-center rounded-full border border-repixl-muted/20 bg-repixl-muted/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-repixl-text-light/75">
            Direct Flash Era
          </span>
          <span className="inline-flex items-center rounded-full border border-repixl-muted/20 bg-repixl-muted/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-repixl-text-light/75">
            2000s Digital
          </span>
        </div>

        {/* Actionable CTA: White/Neutral default → RePXL red on hover/focus */}
        <div className="mt-8 pt-1">
          <Link
            href={`/products?brand=${spotlight.slug}`}
            className={`group/btn inline-flex items-center justify-between gap-3.5 rounded-full border px-6 py-3 font-mono text-xs font-semibold uppercase tracking-wider transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF4444] focus-visible:ring-offset-2 ${
              isLight
                ? 'border-neutral-300 bg-white text-neutral-900 shadow-sm hover:border-[#B91C1C] hover:bg-[#B91C1C] hover:text-white hover:shadow-[0_0_20px_rgba(185,28,28,0.25)] focus-visible:border-[#B91C1C] focus-visible:bg-[#B91C1C] focus-visible:text-white focus-visible:ring-offset-white'
                : 'border-white/20 bg-white text-neutral-950 hover:border-[#EF4444] hover:bg-[#EF4444] hover:text-white hover:shadow-[0_0_24px_rgba(239,68,68,0.4)] focus-visible:border-[#EF4444] focus-visible:bg-[#EF4444] focus-visible:text-white focus-visible:ring-offset-black'
            }`}
          >
            <span>See the {spotlight.brand} lineup</span>
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
      </div>
    </motion.div>
  )
}

function SonySpotlight({ spotlight }: { spotlight: (typeof spotlights)[number] }) {
  const reducedMotion = useReducedMotion()
  const theme = useThemeStore((s) => s.theme)
  const isLight = theme === 'light'
  const sectionRef = useRef<HTMLDivElement>(null)

  return (
    <motion.div
      ref={sectionRef}
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, margin: '-60px' }}
      transition={{ duration: reducedMotion ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12"
    >
      {/* Editorial Copy — Left ~42% (5 cols on lg) */}
      <div className="flex flex-col items-start lg:col-span-5">
        {/* Eyebrow matching SectionHeader */}
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs uppercase tracking-widest text-[#EF4444]">
            — IN FOCUS
          </span>
        </div>

        {/* Section Heading with established font and highlightWord */}
        <RevealText
          as="h3"
          text={spotlight.tagline}
          highlightWord="Clarity"
          className="mt-3 font-display text-[clamp(2.1rem,4.5vw,2.85rem)] font-bold leading-[1.08] tracking-tight text-repixl-text-light"
        />

        {/* Body Copy */}
        <p className="mt-5 max-w-md text-sm sm:text-base leading-relaxed text-repixl-text-light/75">
          {spotlight.description}
        </p>

        {/* Technical Badges — Sony early-digital precision */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-repixl-muted/20 bg-repixl-muted/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-repixl-text-light/75">
            Super HAD CCD
          </span>
          <span className="inline-flex items-center rounded-full border border-repixl-muted/20 bg-repixl-muted/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-repixl-text-light/75">
            Zeiss Vario-Tessar
          </span>
          <span className="inline-flex items-center rounded-full border border-repixl-muted/20 bg-repixl-muted/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-repixl-text-light/75">
            2000s Digital
          </span>
        </div>

        {/* Actionable CTA: White/Neutral default → RePXL red on hover/focus */}
        <div className="mt-8 pt-1">
          <Link
            href={`/products?brand=${spotlight.slug}`}
            className={`group/btn inline-flex items-center justify-between gap-3.5 rounded-full border px-6 py-3 font-mono text-xs font-semibold uppercase tracking-wider transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF4444] focus-visible:ring-offset-2 ${
              isLight
                ? 'border-neutral-300 bg-white text-neutral-900 shadow-sm hover:border-[#B91C1C] hover:bg-[#B91C1C] hover:text-white hover:shadow-[0_0_20px_rgba(185,28,28,0.25)] focus-visible:border-[#B91C1C] focus-visible:bg-[#B91C1C] focus-visible:text-white focus-visible:ring-offset-white'
                : 'border-white/20 bg-white text-neutral-950 hover:border-[#EF4444] hover:bg-[#EF4444] hover:text-white hover:shadow-[0_0_24px_rgba(239,68,68,0.4)] focus-visible:border-[#EF4444] focus-visible:bg-[#EF4444] focus-visible:text-white focus-visible:ring-offset-black'
            }`}
          >
            <span>See the {spotlight.brand} lineup</span>
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
      </div>

      {/* Photographic Collage — Right ~58% (7 cols on lg) */}
      <div className="lg:col-span-7">
        <div className="relative">
          {/* Subtle editorial technical accents */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-5 left-0 hidden font-mono text-[10px] uppercase tracking-widest text-repixl-muted/50 sm:block select-none"
          >
            + ARCHIVE 02 // SONY DIGITAL PRECISION
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-5 right-0 hidden font-mono text-[10px] uppercase tracking-widest text-repixl-muted/50 sm:block select-none"
          >
            CYBERSHOT SENSOR LINEAGE +
          </div>

          {/* Collage Grid:
              Mobile (< sm): Stacked (sony1 full width, then sony2 & sonysample side-by-side)
              Desktop (>= sm): Asymmetric 2-column (left sony1 full height, right sony2 & sonysample stacked)
          */}
          <div className="flex flex-col gap-3 sm:grid sm:grid-cols-12 sm:gap-3.5">
            {/* Dominant Large Image: sony1.png */}
            <div className="group/img relative aspect-[4/3] sm:aspect-auto sm:h-full sm:min-h-[460px] md:min-h-[480px] lg:min-h-[500px] sm:col-span-7 overflow-hidden rounded-2xl border border-neutral-200/80 bg-neutral-900 shadow-sm transition-all duration-300 dark:border-white/10">
              <Image
                src={spotlight.images[0]}
                alt="Sony Cyber-shot compact digital camera"
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 58vw, 650px"
                className="object-cover object-center transition-transform duration-700 ease-out group-hover/img:scale-[1.03]"
                priority={false}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80"
              />
              {/* Technical / Editorial Micro-Badge */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-3.5 left-3.5 z-10 flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-3 py-1 backdrop-blur-md"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444] animate-pulse" />
                <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-white/90">
                  Sony Cyber-shot · 2003
                </span>
              </div>
            </div>

            {/* Secondary Images: sony2.png (top) and sonysample.png (bottom) */}
            <div className="grid grid-cols-2 gap-3 sm:col-span-5 sm:flex sm:flex-col sm:gap-3.5">
              {/* Secondary upper image: sony2.png (Macro/Carl Zeiss) */}
              <div className="group/img relative aspect-square sm:aspect-auto sm:min-h-[220px] md:min-h-[230px] lg:min-h-[242px] sm:flex-1 overflow-hidden rounded-2xl border border-neutral-200/80 bg-neutral-900 shadow-sm transition-all duration-300 dark:border-white/10">
                <Image
                  src={spotlight.images[1]}
                  alt="Sony Cyber-shot Carl Zeiss Vario-Tessar lens macro details"
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 320px"
                  className="object-cover object-center transition-transform duration-700 ease-out group-hover/img:scale-[1.03]"
                  priority={false}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute top-3 right-3 z-10 rounded border border-white/15 bg-black/50 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-white/80 backdrop-blur-sm"
                >
                  Zeiss Macro
                </div>
              </div>

              {/* Secondary lower image: sonysample.png (Night city digital sample) */}
              <div className="group/img relative aspect-square sm:aspect-auto sm:min-h-[220px] md:min-h-[230px] lg:min-h-[242px] sm:flex-1 overflow-hidden rounded-2xl border border-neutral-200/80 bg-neutral-900 shadow-sm transition-all duration-300 dark:border-white/10">
                <Image
                  src={spotlight.images[2]}
                  alt="Sony early-2000s night city digital photograph with blue tones and reflections"
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 320px"
                  className="object-cover object-center transition-transform duration-700 ease-out group-hover/img:scale-[1.03]"
                  priority={false}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-3 right-3 z-10 rounded border border-white/15 bg-black/50 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-white/80 backdrop-blur-sm"
                >
                  Night City Tone
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function KodakSpotlight({ spotlight }: { spotlight: (typeof spotlights)[number] }) {
  const reducedMotion = useReducedMotion()
  const theme = useThemeStore((s) => s.theme)
  const isLight = theme === 'light'
  const sectionRef = useRef<HTMLDivElement>(null)

  return (
    <motion.div
      ref={sectionRef}
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, margin: '-60px' }}
      transition={{ duration: reducedMotion ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12"
    >
      {/* Photographic Collage — Left ~58% (7 cols on lg) */}
      <div className="lg:col-span-7">
        <div className="relative">
          {/* Subtle editorial technical accents */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-5 left-0 hidden font-mono text-[10px] uppercase tracking-widest text-repixl-muted/50 sm:block select-none"
          >
            + ARCHIVE 03 // CCD SENSOR LINEAGE
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-5 right-0 hidden font-mono text-[10px] uppercase tracking-widest text-repixl-muted/50 sm:block select-none"
          >
            WARMTH & TONAL RANGE +
          </div>

          {/* Collage Grid:
              Mobile (< sm): Stacked (kodak1 full width, then kodak2 & kodakpola side-by-side)
              Desktop (>= sm): Asymmetric 2-column (left kodak1 full height, right kodak2 & kodakpola stacked)
          */}
          <div className="flex flex-col gap-3 sm:grid sm:grid-cols-12 sm:gap-3.5">
            {/* Dominant Large Image: kodak1.png */}
            <div className="group/img relative aspect-[4/3] sm:aspect-auto sm:h-full sm:min-h-[460px] md:min-h-[480px] lg:min-h-[500px] sm:col-span-7 overflow-hidden rounded-2xl border border-neutral-200/80 bg-neutral-900 shadow-sm transition-all duration-300 dark:border-white/10">
              <Image
                src={spotlight.images[0]}
                alt="Cinematic Kodak compact digital camera"
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 58vw, 650px"
                className="object-cover object-center transition-transform duration-700 ease-out group-hover/img:scale-[1.03]"
                priority={false}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80"
              />
              {/* Technical / Editorial Micro-Badge */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-3.5 left-3.5 z-10 flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-3 py-1 backdrop-blur-md"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444] animate-pulse" />
                <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-white/90">
                  Kodak EasyShare · 2004
                </span>
              </div>
            </div>

            {/* Secondary Images: kodak2.png (top) and kodakpola.png (bottom) */}
            <div className="grid grid-cols-2 gap-3 sm:col-span-5 sm:flex sm:flex-col sm:gap-3.5">
              {/* Secondary upper image: kodak2.png (Macro/Detail) */}
              <div className="group/img relative aspect-square sm:aspect-auto sm:min-h-[220px] md:min-h-[230px] lg:min-h-[242px] sm:flex-1 overflow-hidden rounded-2xl border border-neutral-200/80 bg-neutral-900 shadow-sm transition-all duration-300 dark:border-white/10">
                <Image
                  src={spotlight.images[1]}
                  alt="Kodak compact camera lens and body macro details"
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 320px"
                  className="object-cover object-center transition-transform duration-700 ease-out group-hover/img:scale-[1.03]"
                  priority={false}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute top-3 right-3 z-10 rounded border border-white/15 bg-black/50 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-white/80 backdrop-blur-sm"
                >
                  Macro Detail
                </div>
              </div>

              {/* Secondary lower image: kodakpola.png (Polaroid / sunset) */}
              <div className="group/img relative aspect-square sm:aspect-auto sm:min-h-[220px] md:min-h-[230px] lg:min-h-[242px] sm:flex-1 overflow-hidden rounded-2xl border border-neutral-200/80 bg-neutral-900 shadow-sm transition-all duration-300 dark:border-white/10">
                <Image
                  src={spotlight.images[2]}
                  alt="Vintage Kodak-style golden hour print"
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 320px"
                  className="object-cover object-center transition-transform duration-700 ease-out group-hover/img:scale-[1.03]"
                  priority={false}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-3 right-3 z-10 rounded border border-white/15 bg-black/50 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-white/80 backdrop-blur-sm"
                >
                  Film Tone
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editorial Copy — Right ~42% (5 cols on lg) */}
      <div className="lg:col-span-5 flex flex-col items-start">
        {/* Eyebrow matching SectionHeader */}
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs uppercase tracking-widest text-[#EF4444]">
            — IN FOCUS
          </span>
        </div>

        {/* Section Heading with established font and highlightWord */}
        <RevealText
          as="h3"
          text={spotlight.tagline}
          highlightWord="Warmth"
          className="mt-3 font-display text-[clamp(2.1rem,4.5vw,2.85rem)] font-bold leading-[1.08] tracking-tight text-repixl-text-light"
        />

        {/* Body Copy */}
        <p className="mt-5 max-w-md text-sm sm:text-base leading-relaxed text-repixl-text-light/75">
          {spotlight.description}
        </p>

        {/* Technical Badges */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-repixl-muted/20 bg-repixl-muted/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-repixl-text-light/75">
            CCD Sensor
          </span>
          <span className="inline-flex items-center rounded-full border border-repixl-muted/20 bg-repixl-muted/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-repixl-text-light/75">
            2000s Era
          </span>
          <span className="inline-flex items-center rounded-full border border-repixl-muted/20 bg-repixl-muted/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-repixl-text-light/75">
            Film Heritage
          </span>
        </div>

        {/* Actionable CTA: White/Neutral default → RePXL red on hover/focus */}
        <div className="mt-8 pt-1">
          <Link
            href={`/products?brand=${spotlight.slug}`}
            className={`group/btn inline-flex items-center justify-between gap-3.5 rounded-full border px-6 py-3 font-mono text-xs font-semibold uppercase tracking-wider transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF4444] focus-visible:ring-offset-2 ${
              isLight
                ? 'border-neutral-300 bg-white text-neutral-900 shadow-sm hover:border-[#B91C1C] hover:bg-[#B91C1C] hover:text-white hover:shadow-[0_0_20px_rgba(185,28,28,0.25)] focus-visible:border-[#B91C1C] focus-visible:bg-[#B91C1C] focus-visible:text-white focus-visible:ring-offset-white'
                : 'border-white/20 bg-white text-neutral-950 hover:border-[#EF4444] hover:bg-[#EF4444] hover:text-white hover:shadow-[0_0_24px_rgba(239,68,68,0.4)] focus-visible:border-[#EF4444] focus-visible:bg-[#EF4444] focus-visible:text-white focus-visible:ring-offset-black'
            }`}
          >
            <span>See the {spotlight.brand} lineup</span>
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
      </div>
    </motion.div>
  )
}

function BrandSpotlight({ spotlight, index }: { spotlight: (typeof spotlights)[number]; index: number }) {
  const reducedMotion = useReducedMotion()
  const theme = useThemeStore((s) => s.theme)
  const isLight = theme === 'light'
  const reversed = index % 2 === 1
  const sectionRef = useRef<HTMLDivElement>(null)

  // Dedicated custom editorial spotlight for Canon
  if (spotlight.slug === 'canon') {
    return <CanonSpotlight spotlight={spotlight} />
  }

  // Dedicated custom editorial spotlight for Sony
  if (spotlight.slug === 'sony') {
    return <SonySpotlight spotlight={spotlight} />
  }

  // Dedicated custom editorial spotlight for Kodak
  if (spotlight.slug === 'kodak') {
    return <KodakSpotlight spotlight={spotlight} />
  }

  // Scroll-linked parallax — same pattern as EditorialSection: images and
  // text drift at different speeds as the block passes through the viewport.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  })

  const mainImgY = useTransform(scrollYProgress, [0, 1], reducedMotion ? [0, 0] : [30, -30])
  const thumbY = useTransform(scrollYProgress, [0, 1], reducedMotion ? [0, 0] : [-24, 24])
  const textY = useTransform(scrollYProgress, [0, 1], reducedMotion ? [0, 0] : [18, -18])

  return (
    <motion.div
      ref={sectionRef}
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, margin: '-80px' }}
      transition={{ duration: reducedMotion ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="grid grid-cols-1 items-center gap-10 md:grid-cols-12 md:gap-10"
    >
      {/* Photo grid */}
      <div className={`md:col-span-7 ${reversed ? 'md:order-2' : 'md:order-1'}`}>
        <div className="grid grid-cols-3 gap-3">
          <motion.div
            style={{ y: mainImgY }}
            className="col-span-2 row-span-2 overflow-hidden rounded-lg border border-repixl-muted/10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={spotlight.images[0]}
              alt={`${spotlight.brand} vintage digicams`}
              className="h-full w-full object-cover"
            />
          </motion.div>
          <motion.div
            style={{ y: thumbY }}
            className="aspect-square overflow-hidden rounded-lg border border-repixl-muted/10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={spotlight.images[1]}
              alt={`${spotlight.brand} sample camera`}
              className="h-full w-full object-cover"
            />
          </motion.div>
          <motion.div
            style={{ y: thumbY }}
            className="aspect-square overflow-hidden rounded-lg border border-repixl-muted/10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={spotlight.images[2]}
              alt={`${spotlight.brand} in the field`}
              className="h-full w-full object-cover"
            />
          </motion.div>
        </div>
      </div>

      {/* Text */}
      <motion.div
        style={{ y: textY }}
        className={`md:col-span-5 ${reversed ? 'md:order-1' : 'md:order-2'}`}
      >
        <span className="font-mono text-xs uppercase tracking-widest text-[#EF4444]">
          — IN FOCUS
        </span>
        <RevealText
          as="h3"
          text={spotlight.tagline}
          className="mt-3 font-display text-display-sm text-repixl-text-light md:text-display-md"
        />
        <p className="mt-4 max-w-md text-sm leading-relaxed text-repixl-text-light/65">
          {spotlight.description}
        </p>
        <div className="mt-8">
          <Link
            href={`/products?brand=${spotlight.slug}`}
            className={`group/btn inline-flex items-center justify-between gap-3.5 rounded-full border px-6 py-3 font-mono text-xs font-semibold uppercase tracking-wider transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF4444] focus-visible:ring-offset-2 ${
              isLight
                ? 'border-neutral-300 bg-white text-neutral-900 shadow-sm hover:border-[#B91C1C] hover:bg-[#B91C1C] hover:text-white hover:shadow-[0_0_20px_rgba(185,28,28,0.25)] focus-visible:border-[#B91C1C] focus-visible:bg-[#B91C1C] focus-visible:text-white focus-visible:ring-offset-white'
                : 'border-white/20 bg-white text-neutral-950 hover:border-[#EF4444] hover:bg-[#EF4444] hover:text-white hover:shadow-[0_0_24px_rgba(239,68,68,0.4)] focus-visible:border-[#EF4444] focus-visible:bg-[#EF4444] focus-visible:text-white focus-visible:ring-offset-black'
            }`}
          >
            <span>See the {spotlight.brand} lineup</span>
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
    </motion.div>
  )
}

/**
 * Length-aware font sizing for outlined family text so it spans ~75-92% of the card
 * width without being clipped awkwardly across card edges.
 */
function getFamilyTextStyle(word: string) {
  const len = word.length
  if (len <= 5) {
    // LUMIX (5)
    return {
      fontSize: 'clamp(2.5rem, 5.5vw, 3.5rem)',
      letterSpacing: '0.14em',
    }
  } else if (len <= 7) {
    // FINEPIX (7), COOLPIX (7)
    return {
      fontSize: 'clamp(2.05rem, 4.5vw, 2.85rem)',
      letterSpacing: '0.08em',
    }
  } else if (len <= 9) {
    // CYBERSHOT (9), POWERSHOT (9), EASYSHARE (9)
    return {
      fontSize: 'clamp(1.6rem, 3.6vw, 2.3rem)',
      letterSpacing: '0.04em',
    }
  } else {
    return {
      fontSize: 'clamp(1.35rem, 3vw, 1.95rem)',
      letterSpacing: '0.02em',
    }
  }
}

/**
 * Geometric background decorations behind the camera.
 * Matches the reference composition (media_1789460484009.png):
 *  - Clearly visible filled dark accent shapes/gradients
 *  - Thin accent curved arc lines
 *  - Deterministic secondary details (crosshairs, dot matrix)
 */
function BrandCardGeometry({
  variant,
  accentColor,
  isLight,
}: {
  variant: number
  accentColor: string
  isLight: boolean
}) {
  const v = variant % 4

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden select-none"
    >
      {v === 0 && (
        <>
          {/* Filled deep accent circle on right behind camera */}
          <div
            className="absolute top-10 -right-6 h-48 w-48 rounded-full blur-[2px]"
            style={{
              background: isLight
                ? `radial-gradient(circle, ${accentColor}2E 0%, ${accentColor}12 55%, transparent 72%)`
                : `radial-gradient(circle, ${accentColor}55 0%, ${accentColor}22 60%, transparent 75%)`,
            }}
          />
          {/* Thin curved arc line */}
          <svg
            className={`absolute top-8 -right-8 h-52 w-52 ${isLight ? 'opacity-45' : 'opacity-40'}`}
            viewBox="0 0 200 200"
            fill="none"
          >
            <circle cx="100" cy="100" r="88" stroke={accentColor} strokeWidth="1" />
          </svg>
        </>
      )}

      {v === 1 && (
        <>
          {/* Soft diffuse filled shape behind camera */}
          <div
            className="absolute top-14 left-4 h-44 w-44 rounded-full blur-[3px]"
            style={{
              background: isLight
                ? `radial-gradient(circle, ${accentColor}28 0%, ${accentColor}10 60%, transparent 72%)`
                : `radial-gradient(circle, ${accentColor}50 0%, ${accentColor}1E 65%, transparent 75%)`,
            }}
          />
          {/* Thin dashed arc */}
          <svg
            className={`absolute top-10 left-0 h-48 w-48 ${isLight ? 'opacity-40' : 'opacity-35'}`}
            viewBox="0 0 200 200"
            fill="none"
          >
            <circle
              cx="100"
              cy="100"
              r="82"
              stroke={accentColor}
              strokeWidth="1"
              strokeDasharray="5 3"
            />
          </svg>
          {/* '+' crosshair at bottom-left */}
          <span
            className={`absolute bottom-8 left-6 font-mono text-sm font-light select-none ${
              isLight ? 'text-neutral-500/60' : 'text-neutral-400/50'
            }`}
          >
            +
          </span>
        </>
      )}

      {v === 2 && (
        <>
          {/* Filled deep accent ellipse on right side */}
          <div
            className="absolute top-12 -right-8 h-48 w-48 rounded-full blur-[2px]"
            style={{
              background: isLight
                ? `radial-gradient(circle, ${accentColor}2E 0%, ${accentColor}12 55%, transparent 72%)`
                : `radial-gradient(circle, ${accentColor}55 0%, ${accentColor}22 60%, transparent 75%)`,
            }}
          />
          {/* Thin arc line */}
          <svg
            className={`absolute top-8 -right-10 h-52 w-52 ${isLight ? 'opacity-45' : 'opacity-40'}`}
            viewBox="0 0 200 200"
            fill="none"
          >
            <circle cx="100" cy="100" r="90" stroke={accentColor} strokeWidth="1" />
          </svg>
          {/* Dotted grid on left */}
          <div
            className={`absolute top-16 left-6 grid grid-cols-2 gap-2 ${
              isLight ? 'opacity-40' : 'opacity-35'
            }`}
          >
            {Array.from({ length: 10 }).map((_, i) => (
              <span
                key={i}
                className={`h-0.5 w-0.5 rounded-full ${
                  isLight ? 'bg-neutral-800/40' : 'bg-white/70'
                }`}
              />
            ))}
          </div>
        </>
      )}

      {v === 3 && (
        <>
          {/* Deep accent filled arc on right */}
          <div
            className="absolute top-10 -right-4 h-48 w-48 rounded-full blur-[2px]"
            style={{
              background: isLight
                ? `radial-gradient(circle, ${accentColor}2A 0%, ${accentColor}10 55%, transparent 72%)`
                : `radial-gradient(circle, ${accentColor}52 0%, ${accentColor}20 60%, transparent 75%)`,
            }}
          />
          {/* Concentric arcs */}
          <svg
            className={`absolute -bottom-4 -left-6 h-40 w-40 ${isLight ? 'opacity-35' : 'opacity-30'}`}
            viewBox="0 0 160 160"
            fill="none"
          >
            <circle cx="80" cy="80" r="72" stroke={accentColor} strokeWidth="0.8" />
          </svg>
          {/* '+' crosshair at upper-right */}
          <span
            className={`absolute top-12 right-6 font-mono text-sm font-light select-none ${
              isLight ? 'text-neutral-500/60' : 'text-neutral-400/50'
            }`}
          >
            +
          </span>
          {/* Dot cluster at lower-right */}
          <div
            className={`absolute bottom-8 right-6 grid grid-cols-2 gap-1.5 ${
              isLight ? 'opacity-35' : 'opacity-30'
            }`}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <span
                key={i}
                className={`h-0.5 w-0.5 rounded-full ${
                  isLight ? 'bg-neutral-800/40' : 'bg-white/70'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function BrandCard({
  brand,
  product,
  reducedMotion,
  isLight,
}: {
  brand: (typeof brands)[number]
  product?: Product
  reducedMotion: boolean
  isLight: boolean
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [touchActive, setTouchActive] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const isPreviewActive = isHovered || touchActive

  // Reset touch preview if user taps outside this card
  useEffect(() => {
    if (!touchActive) return
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setTouchActive(false)
      }
    }
    document.addEventListener('touchstart', handleOutsideClick)
    document.addEventListener('click', handleOutsideClick)
    return () => {
      document.removeEventListener('touchstart', handleOutsideClick)
      document.removeEventListener('click', handleOutsideClick)
    }
  }, [touchActive])

  // Mobile/Touch behavior: tap once to preview sample photo, tap again to navigate
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0)
    ) {
      if (!touchActive) {
        e.preventDefault()
        setTouchActive(true)
      }
    }
  }

  // Camera image source: prefer product store real image if valid, otherwise fallback
  const cameraSrc =
    product?.image && !product.image.endsWith('.svg')
      ? product.image
      : brand.fallbackCamera

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      className="group relative h-full"
    >
      <Link
        href={`/products?brand=${brand.slug}`}
        onClick={handleClick}
        className={`relative block h-full overflow-hidden rounded-2xl border transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red focus-visible:ring-offset-2 ${
          isLight
            ? 'border-neutral-200/90 bg-[#F5F4F0] shadow-sm hover:border-neutral-300 hover:shadow-md'
            : 'border-white/10 bg-[#0E0E10] hover:border-white/20 hover:shadow-[0_12px_32px_rgba(0,0,0,0.65)]'
        }`}
        style={{
          boxShadow: isPreviewActive ? `0 0 28px ${brand.accentColor}26` : undefined,
        }}
        aria-label={`${brand.name} ${brand.series} - Explore lineup`}
      >
        {/* Top Header Micro-Bar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: brand.accentColor }}
            />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-white/90 drop-shadow-sm">
              {brand.number} // {brand.series.split(' ')[0]}
            </span>
          </div>
          <span className="rounded-full border border-white/15 bg-black/40 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/80 backdrop-blur-sm">
            {brand.yearRange}
          </span>
        </div>

        {/* Visual Stage (Camera & Sample Photo Area) */}
        <div className="relative aspect-[4/5] w-full overflow-hidden">
          {/* Layer 1: Atmospheric Geometric Elements */}
          <div
            className={`transition-opacity duration-300 ${
              isPreviewActive ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <BrandCardGeometry
              variant={brand.geomVariant}
              accentColor={brand.accentColor}
              isLight={isLight}
            />
          </div>

          {/* Layer 2: Clearly Visible Outlined Camera-Family Typography */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-0 top-11 sm:top-12 z-[2] flex items-center justify-center px-4 overflow-hidden select-none transition-opacity duration-300 ${
              isPreviewActive ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <span
              className={`select-none font-display font-black uppercase whitespace-nowrap text-center transition-opacity duration-300 ${
                isLight
                  ? 'opacity-30 group-hover:opacity-40'
                  : 'opacity-28 group-hover:opacity-38'
              }`}
              style={{
                ...getFamilyTextStyle(brand.family),
                WebkitTextStroke: isLight
                  ? '1.2px rgba(26, 22, 16, 0.25)'
                  : '1.2px rgba(255, 255, 255, 0.30)',
                color: 'transparent',
              }}
            >
              {brand.family}
            </span>
          </div>

          {/* Layer 3: Prominent Floating Camera (Default State) */}
          <div
            className={`relative z-[3] flex h-full w-full items-center justify-center px-6 pt-14 pb-2 transition-all ${
              reducedMotion ? 'duration-0' : 'duration-300 ease-out'
            } ${
              isPreviewActive
                ? 'pointer-events-none opacity-0 scale-95'
                : 'opacity-100 scale-100'
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cameraSrc}
              alt={`${brand.name} camera`}
              className={`max-h-[75%] max-w-[78%] object-contain transition-transform duration-500 ease-out ${
                isLight
                  ? 'drop-shadow-[0_10px_20px_rgba(0,0,0,0.18)]'
                  : 'drop-shadow-[0_12px_24px_rgba(0,0,0,0.65)]'
              } ${
                reducedMotion
                  ? ''
                  : 'group-hover:scale-[1.04] group-hover:-translate-y-1'
              }`}
            />
          </div>

          {/* Layer 4: Cinematic Sample Photograph (Hover / Active Preview State) */}
          <div
            className={`absolute inset-0 z-[4] transition-all ${
              reducedMotion ? 'duration-0' : 'duration-300 ease-out'
            } ${
              isPreviewActive
                ? 'opacity-100 scale-100'
                : 'pointer-events-none opacity-0 scale-[0.98]'
            }`}
          >
            <Image
              src={brand.sampleImage}
              alt={`Sample photograph taken with ${brand.name}`}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover object-center"
              priority={false}
            />

            {/* Sample Photo Indicator Badge */}
            <div className="absolute right-4 top-12 z-20 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/75 px-3 py-1 backdrop-blur-md shadow-md">
              <span
                className="h-1.5 w-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: brand.accentColor }}
              />
              <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-white">
                Sample Shot · {brand.sampleLabel}
              </span>
            </div>
          </div>

          {/* Layer 5: Dark Scrim Gradient & Card Info */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-36 bg-gradient-to-t from-black/95 via-black/60 to-transparent"
          />

          <div className="absolute inset-x-0 bottom-0 z-[6] p-5 pt-0">
            <h3 className="font-display text-2xl font-bold tracking-tight text-white">
              {brand.name}
            </h3>
            <p className="mt-0.5 font-mono text-xs uppercase tracking-wider text-white/70">
              {brand.series}
            </p>

            {/* Explore CTA */}
            <div className="mt-3.5 flex items-center justify-between border-t border-white/10 pt-3">
              <span className="inline-flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-white/90 transition-colors duration-200 group-hover:text-white">
                <span>Explore Lineup</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-transform duration-200 group-hover:translate-x-1"
                  style={{ color: isPreviewActive ? brand.accentColor : undefined }}
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                CCD Era
              </span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}

export function BrandGallery() {
  const reducedMotion = useReducedMotion()
  const theme = useThemeStore((s) => s.theme)
  const isLight = theme === 'light'
  const products = useProductStore((s) => s.products)
  const hydrate = useProductStore((s) => s.hydrate)

  useEffect(() => {
    if (products.length === 0) {
      hydrate()
    }
  }, [products.length, hydrate])

  const container = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reducedMotion ? 0 : 0.1,
      },
    },
  }

  const tile = {
    hidden: reducedMotion
      ? { opacity: 1, scale: 1 }
      : { opacity: 0, scale: 0.92 },
    show: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: reducedMotion ? 0 : 0.5,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  }

  return (
    <section className="relative bg-transparent pt-10 pb-20 md:pt-14 md:pb-28">
      <Container>
        {/* Section header */}
        <SectionHeader
          eyebrow="Shop by Brand"
          title="Find Your Era"
          highlightWord="Era"
          description="Six legendary brands. Decades of iconic compact cameras. Pick a lineage and explore."
          className="mb-14 md:mb-20"
        />

        {/* Brand grid — gallery layout with varied sizing */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: false, margin: '-80px' }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {brands.map((brand) => {
            const product =
              products.find((p) => p.slug === brand.preferredSlug) ||
              products.find(
                (p) =>
                  p.brand?.toLowerCase() === brand.slug.toLowerCase() &&
                  p.image &&
                  !p.image.endsWith('.svg')
              )
            return (
              <motion.div key={brand.slug} variants={tile}>
                <BrandCard
                  brand={brand}
                  product={product}
                  reducedMotion={reducedMotion}
                  isLight={isLight}
                />
              </motion.div>
            )
          })}
        </motion.div>

        {/* In Focus — brand deep dives, à la the I-2 "Meet the photographers" section */}
        <div className="mt-28 flex flex-col gap-24 md:mt-40 md:gap-32">
          {spotlights.map((spotlight, i) => (
            <BrandSpotlight key={spotlight.slug} spotlight={spotlight} index={i} />
          ))}
        </div>
      </Container>
    </section>
  )
}