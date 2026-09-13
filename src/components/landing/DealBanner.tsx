'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { RevealText } from '@/components/ui'
import { useReducedMotion } from '@/hooks/useReducedMotion'

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
    fetch('/api/banners?placement=HOMEPAGE_STRIP')
      .then((res) => (res.ok ? res.json() : null))
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
  const image = banner?.imageRef || '/images/editorial-2.svg'
  
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
          className="relative flex min-h-[420px] items-center overflow-hidden rounded-lg border border-repixl-muted/15 bg-repixl-charcoal"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={title}
            className="pointer-events-none absolute inset-y-0 right-0 h-full w-1/2 object-cover opacity-70 md:opacity-90 transition-opacity duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-repixl-charcoal via-repixl-charcoal/90 to-transparent md:via-repixl-charcoal/60" />

          <div className="relative z-10 max-w-md px-8 py-12 md:px-14">
            <RevealText
              key={title}
              as="h3"
              text={title}
              className="font-display text-display-lg text-repixl-text-light"
            />
            <p className="mt-4 text-sm leading-relaxed text-repixl-text-light/70">
              {banner ? 'Curated promotional collection selected by RePXL curators.' : "Explore this week's selection of mint and excellent-grade Canon and Nikon 2000s compacts — condition-graded and ready to shoot."}
            </p>
            {isExternal ? (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="mt-8 inline-block rounded bg-repixl-text-light px-6 py-2.5 font-mono text-xs uppercase tracking-widest text-repixl-text-dark transition-colors hover:bg-white"
              >
                View Details
              </a>
            ) : (
              <Link href={href}>
                <button
                  type="button"
                  className="mt-8 rounded bg-repixl-text-light px-6 py-2.5 font-mono text-xs uppercase tracking-widest text-repixl-text-dark transition-colors hover:bg-white"
                >
                  View All
                </button>
              </Link>
            )}
          </div>
        </motion.div>
      </Container>
    </section>
  )
}