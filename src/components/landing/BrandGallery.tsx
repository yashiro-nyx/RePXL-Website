'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
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
      </Container>
    </section>
  )
}
