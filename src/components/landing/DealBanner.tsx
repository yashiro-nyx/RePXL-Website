'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { RevealText } from '@/components/ui'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { fetchBannersByPlacement } from '@/lib/banner-client'

interface ActiveBanner {
  id: string
  title: string
  imageRef: string
  linkTarget: string
}

export function DealBanner() {
  const reducedMotion = useReducedMotion()
  const [banner, setBanner] = useState<ActiveBanner | null>(null)

  useEffect(() => {
    let isMounted = true
    fetchBannersByPlacement('HOMEPAGE_STRIP')
      .then((body) => {
        if (isMounted && body?.data && Array.isArray(body.data) && body.data.length > 0) {
          setBanner(body.data[0])
        }
      })
      .catch(() => {
        // Fallback gracefully to default design on network error
      })
    return () => {
      isMounted = false
    }
  }, [])

  const title = banner?.title ?? 'Hottest Deals'

  // Resolve link target: if it has repxl.com host or relative path, link via Next Link
  let href = '/products'
  let isExternal = false
  if (banner?.linkTarget) {
    try {
      if (banner.linkTarget.startsWith('/')) {
        href = banner.linkTarget
      } else {
        const u = new URL(banner.linkTarget)
        if (u.hostname.includes('repxl.com') || u.hostname === 'localhost') {
          href = u.pathname + u.search + u.hash
        } else {
          href = banner.linkTarget
          isExternal = true
        }
      }
    } catch {
      href = banner.linkTarget
    }
  }

  return (
    <section className="py-16 md:py-20">
      <Container>
        <motion.div
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: '-80px' }}
          transition={{ duration: reducedMotion ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="deal-banner relative min-h-[48rem] overflow-hidden rounded-xl border min-[360px]:min-h-[44rem] md:min-h-[34rem]"
        >
          {/* The same mountain scene is relit by theme-specific CSS. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/darkmodebg.png"
            alt=""
            className="deal-banner-mountain pointer-events-none absolute inset-0 h-full w-full object-cover"
            aria-hidden="true"
          />
          <div className="deal-banner-atmosphere pointer-events-none absolute inset-0" aria-hidden="true" />
          <div
            className="deal-banner-wordmark pointer-events-none absolute inset-x-0 top-[34%] text-center font-display text-[clamp(4.5rem,17vw,13rem)] font-bold leading-none tracking-[-0.07em] md:top-1/2 md:-translate-y-1/2"
            aria-hidden="true"
          >
            REPIXL
          </div>
          <div className="deal-banner-viewfinder pointer-events-none absolute inset-4 z-20 md:inset-6" aria-hidden="true">
            <span className="absolute left-0 top-0 h-5 w-5 border-l border-t md:h-7 md:w-7" />
            <span className="absolute right-0 top-0 h-5 w-5 border-r border-t md:h-7 md:w-7" />
            <span className="absolute bottom-0 left-0 h-5 w-5 border-b border-l md:h-7 md:w-7" />
            <span className="absolute bottom-0 right-0 h-5 w-5 border-b border-r md:h-7 md:w-7" />
          </div>
          <div className="deal-banner-phone-frame pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[22rem] overflow-hidden md:bottom-0 md:left-auto md:right-0 md:top-[-2.5rem] md:h-auto md:w-[58%] md:overflow-visible">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={banner?.imageRef || '/images/dealbanner.png'}
              alt={title}
              className="deal-banner-phone absolute left-1/2 top-0 w-[min(100vw,21rem)] max-w-none -translate-x-[42%] md:left-auto md:right-[clamp(2rem,5vw,4rem)] md:top-0 md:w-[clamp(31rem,40vw,34rem)] md:translate-x-0 object-contain"
            />
          </div>
          <div className="deal-banner-copy relative z-30 max-w-md px-6 py-12 sm:px-8 md:flex md:min-h-[34rem] md:w-1/2 md:flex-col md:justify-center md:px-12 md:py-14 lg:px-14">
            <div className="flex items-center gap-3 font-mono text-[10px] font-semibold uppercase tracking-[0.24em]">
              <span className="h-px w-8 bg-current" aria-hidden="true" />
              Featured this week
            </div>
            <RevealText
              key={title}
              as="h3"
              text={title}
              className="mt-4 font-display text-[clamp(2.35rem,9vw,3.5rem)] font-semibold leading-[0.96] tracking-[-0.035em] md:text-[clamp(2.75rem,4.5vw,4rem)]"
            />
            <p className="mt-5 max-w-sm text-sm leading-relaxed">
              {banner
                ? 'Curated promotional collection selected by RePXL curators.'
                : "Explore this week\u2019s selection of mint and excellent-grade Canon and Nikon 2000s compacts \u2014 condition-graded and ready to shoot."}
            </p>
            {isExternal ? (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="mt-8 w-fit"
              >
                <span className="deal-banner-cta inline-flex min-h-11 items-center rounded-lg px-6 py-2.5 font-mono text-xs font-semibold uppercase tracking-widest transition-colors">
                  View Details
                </span>
              </a>
            ) : (
              <Link href={href} className="mt-8 w-fit">
                <span className="deal-banner-cta inline-flex min-h-11 items-center rounded-lg px-6 py-2.5 font-mono text-xs font-semibold uppercase tracking-widest transition-colors">
                  View All
                </span>
              </Link>
            )}
          </div>
        </motion.div>
      </Container>
    </section>
  )
}
