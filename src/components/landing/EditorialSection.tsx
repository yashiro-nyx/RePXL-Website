'use client'

import { useRef, useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useThemeStore } from '@/stores/themeStore'
import { fetchHomepageCmsBlocks } from '@/lib/cms-client'

interface EditorialContent {
  eyebrow?: string
  heading?: string
  body?: string
}

export function EditorialSection() {
  const reducedMotion = useReducedMotion()
  const sectionRef = useRef<HTMLDivElement>(null)
  const [editorial, setEditorial] = useState<EditorialContent | null>(null)
  const theme = useThemeStore((s) => s.theme)
  const isLight = theme === 'light'

  useEffect(() => {
    let isMounted = true
    fetchHomepageCmsBlocks()
      .then((body) => {
        if (isMounted && body?.data && Array.isArray(body.data)) {
          const ed = body.data.find((b: any) => b.type === 'editorial' && b.isPublished)
          if (ed && ed.content && typeof ed.content === 'object') {
            setEditorial(ed.content)
          }
        }
      })
      .catch(() => {})
    return () => {
      isMounted = false
    }
  }, [])

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  })

  // Subtle restrained parallax matching editorial direction
  const textY = useTransform(scrollYProgress, [0, 1], reducedMotion ? [0, 0] : [10, -10])
  const img1Y = useTransform(scrollYProgress, [0, 1], reducedMotion ? [0, 0] : [12, -12])
  const img2Y = useTransform(scrollYProgress, [0, 1], reducedMotion ? [0, 0] : [22, -22])

  // Fade in on scroll
  const opacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0])
  const staticOpacity = reducedMotion ? 1 : undefined

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden py-28 md:py-36 lg:py-40"
    >
      <Container className="relative">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-14">
          {/* Left: Overlapping editorial photographic archive collage */}
          <div className="relative flex items-center justify-center lg:col-span-6 xl:col-span-5">
            <div className="relative mx-auto w-full max-w-[420px] sm:max-w-[460px] lg:max-w-[480px]">
              {/* Decorative top-left archive metadata */}
              <div
                className="pointer-events-none absolute -top-7 left-1 z-0 flex items-center gap-2 select-none"
                aria-hidden="true"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444]" />
                <span
                  className={`font-mono text-[9px] uppercase tracking-widest ${
                    isLight ? 'text-neutral-500' : 'text-neutral-400'
                  }`}
                >
                  DIGICAM ARCHIVE // REF. 01–02
                </span>
              </div>

              {/* Decorative corner brackets */}
              <div
                className={`pointer-events-none absolute -top-4 -left-4 h-5 w-5 border-t border-l ${
                  isLight ? 'border-neutral-400/40' : 'border-white/20'
                }`}
                aria-hidden="true"
              />
              <div
                className={`pointer-events-none absolute -bottom-4 -right-4 h-5 w-5 border-b border-r ${
                  isLight ? 'border-neutral-400/40' : 'border-white/20'
                }`}
                aria-hidden="true"
              />

              {/* Rear Card: Canon PowerShot 2003 (digicamera1.png) */}
              <motion.div
                style={{ y: reducedMotion ? 0 : img1Y }}
                className="group/card1 relative z-10 w-[78%] sm:w-[76%] -rotate-[5deg] transition-all duration-500 ease-out hover:-translate-y-2 hover:rotate-[-2deg]"
              >
                <Image
                  src="/images/digicamera1.png"
                  alt="Vintage Canon PowerShot digital camera archival card"
                  width={1374}
                  height={1145}
                  sizes="(max-width: 640px) 75vw, (max-width: 1024px) 45vw, 420px"
                  quality={90}
                  className="h-auto w-full object-contain drop-shadow-[0_16px_32px_rgba(0,0,0,0.65)] drop-shadow-[0_4px_12px_rgba(239,68,68,0.12)] select-none"
                  priority={false}
                />
              </motion.div>

              {/* Foreground Card: Nikon Coolpix 3200 2004 (digicamera2.png) */}
              <motion.div
                style={{ y: reducedMotion ? 0 : img2Y }}
                className="group/card2 relative z-20 ml-auto -mt-[32%] sm:-mt-[28%] w-[82%] sm:w-[80%] rotate-[4deg] transition-all duration-500 ease-out hover:-translate-y-2 hover:rotate-[1deg]"
              >
                <Image
                  src="/images/digicamera2.png"
                  alt="Vintage Nikon Coolpix 3200 digital camera archival card"
                  width={1443}
                  height={1090}
                  sizes="(max-width: 640px) 80vw, (max-width: 1024px) 50vw, 450px"
                  quality={90}
                  className="h-auto w-full object-contain drop-shadow-[0_24px_48px_rgba(0,0,0,0.75)] drop-shadow-[0_8px_20px_rgba(239,68,68,0.16)] select-none"
                  priority={false}
                />
              </motion.div>

              {/* Decorative bottom metadata mark */}
              <div
                className="pointer-events-none absolute -bottom-7 left-2 flex items-center gap-2 select-none"
                aria-hidden="true"
              >
                <span className={`font-mono text-[10px] ${isLight ? 'text-neutral-400' : 'text-white/30'}`}>
                  +
                </span>
                <span
                  className={`font-mono text-[9px] uppercase tracking-wider ${
                    isLight ? 'text-neutral-500' : 'text-neutral-400'
                  }`}
                >
                  HISTORIC LINEAGE [2003—2007]
                </span>
              </div>
            </div>
          </div>

          {/* Right: Editorial Typography */}
          <motion.div
            style={{
              y: reducedMotion ? 0 : textY,
              opacity: staticOpacity ?? opacity,
            }}
            className="flex flex-col gap-6 md:gap-7 lg:col-span-6 xl:col-span-7 lg:pl-6"
          >
            {/* Eyebrow */}
            <div>
              <span
                className={`inline-flex items-center font-mono text-xs uppercase tracking-widest ${
                  isLight ? 'text-neutral-600' : 'text-neutral-400'
                }`}
              >
                <span className="mr-2 text-[#EF4444]" aria-hidden="true">—</span>
                {(editorial?.eyebrow || 'THE DIGICAM ERA').replace(/^[—–-]\s*/, '').toUpperCase()}
              </span>
            </div>

            {/* Headline */}
            <h2
              className={`font-display text-3xl font-normal tracking-tight sm:text-4xl md:text-5xl lg:text-[3.25rem] xl:text-[3.75rem] lg:leading-[1.12] ${
                isLight ? 'text-neutral-900' : 'text-white'
              }`}
            >
              {editorial?.heading && editorial.heading !== 'Before filters, there was just light.' ? (
                editorial.heading
              ) : (
                <>
                  Before filters, there was<br />
                  just <span className="font-medium text-[#EF4444]">light.</span>
                </>
              )}
            </h2>

            {/* Body */}
            <p
              className={`max-w-lg text-base leading-relaxed sm:text-lg ${
                isLight ? 'text-neutral-600' : 'text-neutral-400'
              }`}
            >
              {editorial?.body ||
                'In the early 2000s, CCD sensors captured the world with an unapologetic warmth that modern smartphones cannot fake.'}
            </p>

            {/* Bottom technical line */}
            <div className="flex max-w-lg items-center gap-3 pt-2">
              <span
                className={`h-px flex-1 ${isLight ? 'bg-neutral-300' : 'bg-white/15'}`}
                aria-hidden="true"
              />
              <div className="flex items-center gap-2 select-none">
                <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444]" aria-hidden="true" />
                <span
                  className={`font-mono text-[10px] uppercase tracking-widest ${
                    isLight ? 'text-neutral-500' : 'text-neutral-400'
                  }`}
                >
                  2MP · 3× ZOOM · COMPACTFLASH · 2003—2007
                </span>
              </div>
              <span
                className={`h-px flex-1 ${isLight ? 'bg-neutral-300' : 'bg-white/15'}`}
                aria-hidden="true"
              />
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  )
}