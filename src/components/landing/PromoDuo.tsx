'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { RevealText } from '@/components/ui'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface SidebarBanner {
  id: string
  title: string
  imageRef: string
  linkTarget: string
}

interface AnnouncementBlock {
  title?: string
  badge?: string
  discount?: string
  subtitle?: string
  linkTarget?: string
}

export function PromoDuo() {
  const reducedMotion = useReducedMotion()
  const [sidebarBanner, setSidebarBanner] = useState<SidebarBanner | null>(null)
  const [announcement, setAnnouncement] = useState<AnnouncementBlock | null>(null)

  useEffect(() => {
    let isMounted = true

    // Fetch active sidebar promo banner
    fetch('/api/banners?placement=SIDEBAR')
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (isMounted && body?.data && Array.isArray(body.data) && body.data.length > 0) {
          setSidebarBanner(body.data[0])
        }
      })
      .catch(() => {})

    // Fetch dynamic announcement homepage block
    fetch('/api/cms/homepage')
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (isMounted && body?.data && Array.isArray(body.data)) {
          const ann = body.data.find((b: any) => b.type === 'announcement' && b.isPublished)
          if (ann && ann.content && typeof ann.content === 'object') {
            setAnnouncement(ann.content)
          }
        }
      })
      .catch(() => {})

    return () => {
      isMounted = false
    }
  }, [])

  const fadeUp = {
    hidden: reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: reducedMotion ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] } },
  }

  // Card 1: Top Deals
  const dealTitle = announcement?.title || 'Top Deals'
  const dealBadge = announcement?.discount || announcement?.badge || '30% OFF'
  const dealSub = announcement?.subtitle || 'Selected Brands'
  const dealHref = announcement?.linkTarget || '/products'

  // Card 2: Staff Pick
  const staffTitle = sidebarBanner?.title || 'Our Staff Pick'
  const staffImage = sidebarBanner?.imageRef || '/images/product-sony-w800.svg'
  let staffHref = '/products?brand=sony'
  if (sidebarBanner?.linkTarget) {
    try {
      if (sidebarBanner.linkTarget.startsWith('/')) {
        staffHref = sidebarBanner.linkTarget
      } else {
        const u = new URL(sidebarBanner.linkTarget)
        if (u.hostname.includes('repxl.com') || u.hostname === 'localhost') {
          staffHref = u.pathname + u.search + u.hash
        } else {
          staffHref = sidebarBanner.linkTarget
        }
      }
    } catch {
      staffHref = sidebarBanner.linkTarget
    }
  }

  return (
    <section className="py-16 md:py-20">
      <Container>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Top Deals */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: false, margin: '-60px' }}
            className="relative flex min-h-[380px] flex-col justify-between overflow-hidden rounded-lg border border-repixl-muted/15 bg-repixl-charcoal p-8"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-10 -right-6 select-none font-display font-bold leading-none text-white/[0.04]"
              style={{ fontSize: 'clamp(5rem, 10vw, 8rem)' }}
            >
              %
            </span>
            <RevealText
              key={dealTitle}
              as="h3"
              text={dealTitle}
              className="font-display text-display-sm text-repixl-text-light"
            />
            <div className="relative">
              <p className="font-mono text-xs uppercase tracking-widest text-repixl-muted">Up to</p>
              <p className="mt-1 font-display text-5xl font-bold text-repixl-rose md:text-6xl">{dealBadge}</p>
              <p className="mt-2 font-mono text-xs uppercase tracking-widest text-repixl-muted">{dealSub}</p>
              <Link
                href={dealHref}
                className="mt-6 inline-block border-b border-repixl-text-light/40 pb-0.5 font-mono text-xs uppercase tracking-widest text-repixl-text-light transition-colors hover:border-repixl-red hover:text-repixl-red"
              >
                Shop Now
              </Link>
            </div>
          </motion.div>

          {/* Staff Pick */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: false, margin: '-60px' }}
            transition={{ delay: reducedMotion ? 0 : 0.1 }}
            className="relative flex min-h-[380px] flex-col justify-between overflow-hidden rounded-lg border border-repixl-muted/15 bg-repixl-bg p-8"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={staffImage}
              alt={staffTitle}
              className="pointer-events-none absolute -bottom-6 -right-6 h-52 w-52 opacity-90 md:h-64 md:w-64 object-contain transition-opacity duration-500"
            />
            <RevealText
              key={staffTitle}
              as="h3"
              text={staffTitle}
              className="relative font-display text-display-sm text-repixl-text-light line-clamp-2"
            />
            <div className="relative">
              <p className="max-w-[60%] text-sm text-repixl-text-light/70">
                Tune into a sharper shot — condition-graded compacts loved for pocketable bodies and true-to-life color.
              </p>
              <Link
                href={staffHref}
                className="mt-6 inline-block border-b border-repixl-text-light/40 pb-0.5 font-mono text-xs uppercase tracking-widest text-repixl-text-light transition-colors hover:border-repixl-red hover:text-repixl-red"
              >
                Shop Now
              </Link>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  )
}