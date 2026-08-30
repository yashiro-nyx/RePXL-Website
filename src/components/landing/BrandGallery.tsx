'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { useReducedMotion } from '@/hooks/useReducedMotion'

const brands = [
  {
    name: 'Canon',
    slug: 'canon',
    series: 'PowerShot Series',
    image: '/images/brand-canon.svg',
    sample: '/images/product-canon-a520.svg',
  },
  {
    name: 'Nikon',
    slug: 'nikon',
    series: 'Coolpix Series',
    image: '/images/brand-nikon.svg',
    sample: '/images/product-nikon-coolpix.svg',
  },
  {
    name: 'Sony',
    slug: 'sony',
    series: 'CyberShot Series',
    image: '/images/brand-sony.svg',
    sample: '/images/product-sony-w800.svg',
  },
  {
    name: 'Kodak',
    slug: 'kodak',
    series: 'PixPro / EasyShare',
    image: '/images/brand-kodak.svg',
    sample: '/images/product-kodak-c300.svg',
  },
  {
    name: 'Panasonic',
    slug: 'panasonic',
    series: 'Lumix Series',
    image: '/images/brand-panasonic.svg',
    sample: '/images/product-panasonic-fz7.svg',
  },
  {
    name: 'Fujifilm',
    slug: 'fujifilm',
    series: 'FinePix Series',
    image: '/images/brand-fujifilm.svg',
    sample: '/images/product-fuji-f30.svg',
  },
]

const spotlights = [
  {
    brand: 'Canon',
    slug: 'canon',
    tagline: 'The PowerShot Signature',
    description:
      "Warm highlights, magenta-shifted shadows, and a softness in contrast that no modern sensor bothers to replicate. The A-series turned point-and-shoot into a color science all its own.",
    images: ['/images/brand-canon.svg', '/images/product-canon-a520.svg', '/images/editorial-1.svg'],
  },
  {
    brand: 'Sony',
    slug: 'sony',
    tagline: 'CyberShot Clarity',
    description:
      'Crisp, slightly cool, and unmistakably digital — the CyberShot line rendered light with a clarity that felt futuristic in 2003 and feels like nostalgia now.',
    images: ['/images/brand-sony.svg', '/images/product-sony-w800.svg', '/images/hero-sample-photo.svg'],
  },
  {
    brand: 'Kodak',
    slug: 'kodak',
    tagline: 'Kodachrome-Adjacent Warmth',
    description:
      "Golden highlights, rich reds, and blacks that never quite crush all the way — Kodak's CCDs carried a little of the company's film heritage into every digital frame.",
    images: ['/images/brand-kodak.svg', '/images/product-kodak-c300.svg', '/images/hero-camera.svg'],
  },
]

function BrandSpotlight({ spotlight, index }: { spotlight: (typeof spotlights)[number]; index: number }) {
  const reducedMotion = useReducedMotion()
  const reversed = index % 2 === 1
  const sectionRef = useRef<HTMLDivElement>(null)

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
      viewport={{ once: true, margin: '-80px' }}
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
        <span className="font-mono text-xs uppercase tracking-widest text-repixl-muted">
          In Focus
        </span>
        <h3 className="mt-3 font-display text-display-sm text-repixl-text-light md:text-display-md">
          {spotlight.tagline}
        </h3>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-repixl-text-light/65">
          {spotlight.description}
        </p>
        <Link
          href={`/products?brand=${spotlight.slug}`}
          className="group mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-repixl-text-light transition-colors hover:text-repixl-red"
        >
          See the {spotlight.brand} lineup
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform group-hover:translate-x-0.5"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Link>
      </motion.div>
    </motion.div>
  )
}

export function BrandGallery() {
  const reducedMotion = useReducedMotion()

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
    <section className="pb-16 pt-24 md:pb-20 md:pt-36">
      <Container>
        {/* Section header */}
        <div className="mb-14 flex flex-col items-center gap-3 text-center md:mb-20">
          <span className="font-mono text-xs uppercase tracking-widest text-repixl-muted">
            — Shop by brand
          </span>
          <h2 className="font-display text-display-md text-repixl-text-light md:text-display-lg">
            Find your era
          </h2>
          <p className="max-w-md text-sm text-repixl-text-light/60">
            Six legendary brands. Decades of iconic compact cameras.
            Pick a lineage and explore.
          </p>
        </div>

        {/* Brand grid — gallery layout with varied sizing */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {brands.map((brand) => (
            <motion.div key={brand.slug} variants={tile}>
              <Link
                href={`/products?brand=${brand.slug}`}
                className="group relative block overflow-hidden rounded-lg border border-repixl-muted/10 transition-colors hover:border-repixl-muted/30"
              >
                {/* Image */}
                <div className="relative aspect-[4/5] overflow-hidden">
                  {/* Base brand image — fades out on hover */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={brand.image}
                    alt={`${brand.name} vintage digicams`}
                    className="h-full w-full object-cover transition-opacity duration-500 ease-out group-hover:opacity-0"
                  />
                  {/* Sample camera shot — fades in and settles on hover */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={brand.sample}
                    alt={`Sample ${brand.name} camera`}
                    className="absolute inset-0 h-full w-full scale-105 object-cover opacity-0 transition-all duration-500 ease-out group-hover:scale-100 group-hover:opacity-100"
                  />
                  {/* Gradient overlay for text legibility — stays dark in all themes */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                </div>

                {/* Text overlay — bottom of tile, always light text on dark gradient */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="font-display text-xl font-semibold text-white">
                    {brand.name}
                  </h3>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-white/60">
                    {brand.series}
                  </p>

                  {/* Explore indicator */}
                  <span className="mt-3 inline-flex items-center gap-1.5 text-xs text-white/60 transition-colors group-hover:text-repixl-red">
                    Explore
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-transform group-hover:translate-x-0.5"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
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