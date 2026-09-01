'use client'

import { useReducedMotion } from './useReducedMotion'

/**
 * Returns Framer Motion variant sets consistent with the RePXL landing-page
 * animation language. Pass `reducedMotion` from `useReducedMotion()` or let
 * the hook call it internally.
 *
 * Usage:
 *   const { fadeUp, fadeIn, staggerContainer, staggerItem } = useRevealAnimation()
 */
export function useRevealAnimation() {
  const reducedMotion = useReducedMotion()

  /** Fade + slide up — standard section entrance */
  const fadeUp = {
    hidden: reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reducedMotion ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] as const },
    },
  }

  /** Fade only — for full-bleed images and overlapping elements */
  const fadeIn = {
    hidden: reducedMotion ? { opacity: 1 } : { opacity: 0 },
    show: {
      opacity: 1,
      transition: { duration: reducedMotion ? 0 : 0.7, ease: 'easeOut' as const },
    },
  }

  /** Parent container that staggers its children */
  const staggerContainer = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reducedMotion ? 0 : 0.08,
        delayChildren: reducedMotion ? 0 : 0.05,
      },
    },
  }

  /** Individual stagger child — fade + slide up */
  const staggerItem = {
    hidden: reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reducedMotion ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] as const },
    },
  }

  /** Scale in — for cards and images */
  const scaleIn = {
    hidden: reducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 },
    show: {
      opacity: 1,
      scale: 1,
      transition: { duration: reducedMotion ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] as const },
    },
  }

  /** Standard viewport trigger settings used across all landing sections */
  const viewport = { once: false, margin: '-60px' } as const

  return { fadeUp, fadeIn, staggerContainer, staggerItem, scaleIn, viewport, reducedMotion }
}
