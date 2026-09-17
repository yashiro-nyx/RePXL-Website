'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { SectionHeader } from '@/components/ui'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useThemeStore } from '@/stores/themeStore'
import { fetchHomepageCmsBlocks } from '@/lib/cms-client'
import { fetchBannersByPlacement } from '@/lib/banner-client'

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
  const theme = useThemeStore((s) => s.theme)
  const isLight = theme === 'light'

  const [sidebarBanner, setSidebarBanner] = useState<SidebarBanner | null>(null)
  const [announcement, setAnnouncement] = useState<AnnouncementBlock | null>(null)

  useEffect(() => {
    let isMounted = true

    // Fetch active sidebar promo banner (deduplicated)
    fetchBannersByPlacement('SIDEBAR')
      .then((body) => {
        if (isMounted && body?.data && Array.isArray(body.data) && body.data.length > 0) {
          setSidebarBanner(body.data[0])
        }
      })
      .catch(() => {})

    // Fetch dynamic announcement homepage block (deduplicated)
    fetchHomepageCmsBlocks()
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
    hidden: reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reducedMotion ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] },
    },
  }

  // Card 1: Top Deals dynamic values
  const dealBadge = announcement?.discount || announcement?.badge || '30% OFF'
  const dealSub = announcement?.subtitle || 'Selected Brands'
  const dealHref = announcement?.linkTarget || '/products'
  const dealImage = (announcement as Record<string, any>)?.image || (announcement as Record<string, any>)?.imageRef || '/images/banner1.png'
  const dealTitle = announcement?.title || 'TOP DEALS'

  // Card 2: Staff Pick dynamic values
  const staffTitle = sidebarBanner?.title || 'Sony Cyber-shot W800'
  const staffImage = sidebarBanner?.imageRef || '/images/banner2.png'
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
    <section className="py-20 md:py-28">
      <Container>
        {/* Section Heading matching RePXL design system */}
        <SectionHeader
          eyebrow="Special Spotlights"
          title="Curated Promotions"
          highlightWord="Promotions"
          className="mb-12 md:mb-16"
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* ════════════════════════════════════════════════════════════
              CARD 1: TOP DEALS (3-Camera Cluster: Canon / Nikon / Fuji)
             ════════════════════════════════════════════════════════════ */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: false, margin: '-60px' }}
            className={`group relative flex min-h-[460px] sm:min-h-[480px] md:min-h-[500px] flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-300 ${
              isLight
                ? 'border-neutral-200/90 bg-gradient-to-br from-white via-[#FCFCFD] to-[#F5F5F7] shadow-sm hover:border-[#B91C1C]/40 hover:shadow-[0_12px_32px_-8px_rgba(185,28,28,0.12)]'
                : 'border-white/10 bg-gradient-to-br from-[#161318] via-[#110F13] to-[#0D0B0F] hover:border-[#B91C1C]/40 hover:shadow-[0_12px_32px_-8px_rgba(185,28,28,0.25)]'
            }`}
          >
            {/* Visual stage on the right half */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 right-0 top-0 w-full sm:w-[60%] overflow-hidden select-none"
            >
              {/* Restrained red ambient illumination inside card */}
              <div
                className="absolute right-[-10%] top-1/2 -translate-y-1/2 h-72 w-72 rounded-full blur-[40px] opacity-70 transition-opacity duration-500 group-hover:opacity-90"
                style={{
                  background: isLight
                    ? 'radial-gradient(circle, rgba(220, 38, 38, 0.15) 0%, rgba(185, 28, 28, 0.05) 55%, transparent 75%)'
                    : 'radial-gradient(circle, rgba(185, 28, 28, 0.35) 0%, rgba(120, 15, 15, 0.15) 60%, transparent 75%)',
                }}
              />

              {/* Decorative Red Circular Arc */}
              <svg
                className={`absolute right-[-5%] top-1/2 -translate-y-1/2 h-80 w-80 transition-opacity duration-500 ${
                  isLight ? 'opacity-35 group-hover:opacity-55' : 'opacity-30 group-hover:opacity-50'
                }`}
                viewBox="0 0 240 240"
                fill="none"
              >
                <circle
                  cx="120"
                  cy="120"
                  r="105"
                  stroke={isLight ? '#B91C1C' : '#EF4444'}
                  strokeWidth="1.2"
                  strokeDasharray="160 30 50 20"
                />
                <circle
                  cx="120"
                  cy="120"
                  r="85"
                  stroke={isLight ? '#B91C1C' : '#EF4444'}
                  strokeWidth="0.8"
                  strokeDasharray="6 4"
                  opacity="0.6"
                />
              </svg>

              {/* Large Outlined "%" Symbol behind camera cluster */}
              <span
                className={`absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 font-display font-black leading-none select-none transition-opacity duration-300 ${
                  isLight ? 'opacity-15 group-hover:opacity-25' : 'opacity-15 group-hover:opacity-25'
                }`}
                style={{
                  fontSize: 'clamp(9rem, 18vw, 15rem)',
                  WebkitTextStroke: isLight
                    ? '1.5px rgba(26, 22, 16, 0.25)'
                    : '1.5px rgba(255, 255, 255, 0.3)',
                  color: 'transparent',
                }}
              >
                %
              </span>

              {/* Subtle technical dot matrix */}
              <svg
                className={`absolute top-8 right-8 h-12 w-12 ${
                  isLight ? 'text-neutral-400 opacity-25' : 'text-neutral-500 opacity-20'
                }`}
                viewBox="0 0 48 48"
                fill="currentColor"
              >
                <circle cx="6" cy="6" r="1.5" />
                <circle cx="24" cy="6" r="1.5" />
                <circle cx="42" cy="6" r="1.5" />
                <circle cx="6" cy="24" r="1.5" />
                <circle cx="24" cy="24" r="1.5" />
                <circle cx="42" cy="24" r="1.5" />
                <circle cx="6" cy="42" r="1.5" />
                <circle cx="24" cy="42" r="1.5" />
                <circle cx="42" cy="42" r="1.5" />
              </svg>

              {/* Technical crosshair at bottom */}
              <span
                className={`absolute bottom-8 right-12 font-mono text-sm select-none ${
                  isLight ? 'text-neutral-500/50' : 'text-neutral-400/40'
                }`}
              >
                +
              </span>

              {/* Three-Camera Cluster Image: banner1.png */}
              <div className="absolute inset-0 flex items-center justify-end p-2 sm:p-4">
                <div className="relative h-60 sm:h-72 md:h-80 w-full max-w-[380px] transition-transform duration-500 ease-out group-hover:scale-[1.03]">
                  <Image
                    src={dealImage}
                    alt={dealTitle}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-contain object-right-bottom drop-shadow-[0_16px_28px_rgba(0,0,0,0.35)]"
                    priority={false}
                  />
                </div>
              </div>
            </div>

            {/* Editorial Content on the left */}
            <div className="relative z-10 flex h-full flex-col justify-between p-7 sm:p-9 md:p-10 max-w-[70%] sm:max-w-[55%]">
              <div>
                {/* Eyebrow */}
                <span className="inline-block font-mono text-xs uppercase tracking-widest text-repixl-red">
                  — {dealTitle.toUpperCase()}
                </span>

                {/* Main Promotional Text */}
                <div className="mt-4 sm:mt-5">
                  <p
                    className={`font-mono text-xs uppercase tracking-widest ${
                      isLight ? 'text-neutral-500' : 'text-neutral-400'
                    }`}
                  >
                    Up to
                  </p>
                  <h3
                    className={`mt-1 font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight ${
                      isLight ? 'text-[#B91C1C]' : 'text-[#EF4444]'
                    }`}
                  >
                    {dealBadge}
                  </h3>
                </div>

                {/* Brand applicability */}
                <div className="mt-4">
                  <p
                    className={`font-mono text-[11px] uppercase tracking-wider font-semibold ${
                      isLight ? 'text-neutral-900' : 'text-white'
                    }`}
                  >
                    {dealSub}
                  </p>
                  <p
                    className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${
                      isLight ? 'text-neutral-500' : 'text-neutral-400'
                    }`}
                  >
                    Canon · Nikon · Fujifilm
                  </p>
                </div>
              </div>

              {/* Actionable CTA: White/Neutral default → RePXL red on hover/focus */}
              <div className="mt-8 pt-2">
                <Link
                  href={dealHref}
                  className={`group/btn inline-flex items-center justify-between gap-3.5 rounded-full border px-6 py-3 font-mono text-xs font-semibold uppercase tracking-wider transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF4444] focus-visible:ring-offset-2 ${
                    isLight
                      ? 'border-neutral-300 bg-white text-neutral-900 hover:border-[#B91C1C] hover:bg-[#B91C1C] hover:text-white hover:shadow-[0_0_20px_rgba(185,28,28,0.25)] focus-visible:border-[#B91C1C] focus-visible:bg-[#B91C1C] focus-visible:text-white focus-visible:ring-offset-white'
                      : 'border-white/20 bg-white text-neutral-950 hover:border-[#EF4444] hover:bg-[#EF4444] hover:text-white hover:shadow-[0_0_24px_rgba(239,68,68,0.4)] focus-visible:border-[#EF4444] focus-visible:bg-[#EF4444] focus-visible:text-white focus-visible:ring-offset-black'
                  }`}
                >
                  <span>SHOP NOW</span>
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

          {/* ════════════════════════════════════════════════════════════
              CARD 2: STAFF PICK (Sony Cyber-shot on Stone Pedestal)
             ════════════════════════════════════════════════════════════ */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: false, margin: '-60px' }}
            transition={{ delay: reducedMotion ? 0 : 0.1 }}
            className={`group relative flex min-h-[460px] sm:min-h-[480px] md:min-h-[500px] flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-300 ${
              isLight
                ? 'border-neutral-200/90 bg-gradient-to-br from-white via-[#FCFCFD] to-[#F5F5F7] shadow-sm hover:border-[#B91C1C]/40 hover:shadow-[0_12px_32px_-8px_rgba(185,28,28,0.12)]'
                : 'border-white/10 bg-gradient-to-br from-[#161318] via-[#110F13] to-[#0D0B0F] hover:border-[#B91C1C]/40 hover:shadow-[0_12px_32px_-8px_rgba(185,28,28,0.25)]'
            }`}
          >
            {/* Visual stage on the right half */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 right-0 top-0 w-full sm:w-[60%] overflow-hidden select-none"
            >
              {/* Restrained red ambient illumination inside card */}
              <div
                className="absolute right-[-10%] top-1/2 -translate-y-1/2 h-72 w-72 rounded-full blur-[40px] opacity-70 transition-opacity duration-500 group-hover:opacity-90"
                style={{
                  background: isLight
                    ? 'radial-gradient(circle, rgba(220, 38, 38, 0.15) 0%, rgba(185, 28, 28, 0.05) 55%, transparent 75%)'
                    : 'radial-gradient(circle, rgba(185, 28, 28, 0.35) 0%, rgba(120, 15, 15, 0.15) 60%, transparent 75%)',
                }}
              />

              {/* Decorative Red Circular Arc */}
              <svg
                className={`absolute right-[-5%] top-1/2 -translate-y-1/2 h-80 w-80 transition-opacity duration-500 ${
                  isLight ? 'opacity-35 group-hover:opacity-55' : 'opacity-30 group-hover:opacity-50'
                }`}
                viewBox="0 0 240 240"
                fill="none"
              >
                <circle
                  cx="120"
                  cy="120"
                  r="105"
                  stroke={isLight ? '#B91C1C' : '#EF4444'}
                  strokeWidth="1.2"
                  strokeDasharray="140 25 70 30"
                />
                <circle
                  cx="120"
                  cy="120"
                  r="85"
                  stroke={isLight ? '#B91C1C' : '#EF4444'}
                  strokeWidth="0.8"
                  strokeDasharray="5 3"
                  opacity="0.6"
                />
              </svg>

              {/* Large Outlined "CYBER / SHOT" Typography behind the camera */}
              <div
                className={`absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 flex flex-col font-display font-black uppercase leading-[0.84] tracking-tighter text-right select-none transition-opacity duration-300 ${
                  isLight ? 'opacity-15 group-hover:opacity-25' : 'opacity-15 group-hover:opacity-25'
                }`}
                style={{
                  fontSize: 'clamp(4rem, 8vw, 6.8rem)',
                  WebkitTextStroke: isLight
                    ? '1.5px rgba(26, 22, 16, 0.22)'
                    : '1.5px rgba(255, 255, 255, 0.28)',
                  color: 'transparent',
                }}
              >
                <span>CYBER</span>
                <span>SHOT</span>
              </div>

              {/* Subtle technical dot matrix */}
              <svg
                className={`absolute top-8 right-8 h-12 w-12 ${
                  isLight ? 'text-neutral-400 opacity-25' : 'text-neutral-500 opacity-20'
                }`}
                viewBox="0 0 48 48"
                fill="currentColor"
              >
                <circle cx="6" cy="6" r="1.5" />
                <circle cx="24" cy="6" r="1.5" />
                <circle cx="42" cy="6" r="1.5" />
                <circle cx="6" cy="24" r="1.5" />
                <circle cx="24" cy="24" r="1.5" />
                <circle cx="42" cy="24" r="1.5" />
                <circle cx="6" cy="42" r="1.5" />
                <circle cx="24" cy="42" r="1.5" />
                <circle cx="42" cy="42" r="1.5" />
              </svg>

              {/* Technical crosshair at bottom */}
              <span
                className={`absolute bottom-8 right-12 font-mono text-sm select-none ${
                  isLight ? 'text-neutral-500/50' : 'text-neutral-400/40'
                }`}
              >
                +
              </span>

              {/* Sony Camera on Rugged Stone Pedestal: banner2.png */}
              <div className="absolute inset-0 flex items-center justify-end p-2 sm:p-4">
                <div className="relative h-60 sm:h-72 md:h-80 w-full max-w-[380px] transition-transform duration-500 ease-out group-hover:scale-[1.03]">
                  <Image
                    src={staffImage}
                    alt={staffTitle}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-contain object-right-bottom drop-shadow-[0_16px_28px_rgba(0,0,0,0.35)]"
                    priority={false}
                  />
                </div>
              </div>
            </div>

            {/* Editorial Content on the left */}
            <div className="relative z-10 flex h-full flex-col justify-between p-7 sm:p-9 md:p-10 max-w-[70%] sm:max-w-[55%]">
              <div>
                {/* Eyebrow */}
                <span className="inline-block font-mono text-xs uppercase tracking-widest text-repixl-red">
                  — STAFF PICK
                </span>

                {/* Main Product Heading */}
                <div className="mt-4 sm:mt-5">
                  <h3
                    className={`font-display text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.08] ${
                      isLight ? 'text-neutral-950' : 'text-white'
                    }`}
                  >
                    {staffTitle}
                  </h3>
                </div>

                {/* Supporting Copy */}
                <p
                  className={`mt-4 text-xs sm:text-sm leading-relaxed max-w-sm ${
                    isLight ? 'text-neutral-600' : 'text-neutral-400'
                  }`}
                >
                  Tune into a sharper shot — condition-graded compacts loved for pocketable bodies and true-to-life color.
                </p>
              </div>

              {/* Actionable CTA: White/Neutral default → RePXL red on hover/focus */}
              <div className="mt-8 pt-2">
                <Link
                  href={staffHref}
                  className={`group/btn inline-flex items-center justify-between gap-3.5 rounded-full border px-6 py-3 font-mono text-xs font-semibold uppercase tracking-wider transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF4444] focus-visible:ring-offset-2 ${
                    isLight
                      ? 'border-neutral-300 bg-white text-neutral-900 hover:border-[#B91C1C] hover:bg-[#B91C1C] hover:text-white hover:shadow-[0_0_20px_rgba(185,28,28,0.25)] focus-visible:border-[#B91C1C] focus-visible:bg-[#B91C1C] focus-visible:text-white focus-visible:ring-offset-white'
                      : 'border-white/20 bg-white text-neutral-950 hover:border-[#EF4444] hover:bg-[#EF4444] hover:text-white hover:shadow-[0_0_24px_rgba(239,68,68,0.4)] focus-visible:border-[#EF4444] focus-visible:bg-[#EF4444] focus-visible:text-white focus-visible:ring-offset-black'
                  }`}
                >
                  <span>SHOP NOW</span>
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
        </div>
      </Container>
    </section>
  )
}