'use client'

import Link from 'next/link'
import { useSafeBack } from '@/hooks/useNavigationHistory'

interface BackButtonProps {
  /**
   * Explicit parent route. When provided, the button always links here (a real
   * <a>, so it works with keyboard, middle-click, and prefetch). The value is
   * still validated for safety, so an accidental external/unsafe href falls
   * back to a section-appropriate destination.
   */
  href?: string
  /**
   * Fallback destination used only when there is NO valid previous in-app page
   * (direct visit, refresh, new tab) and no `href`. If omitted, a
   * section-appropriate fallback is chosen automatically (see back-navigation.ts).
   */
  fallback?: string
  /** Label shown after the arrow. Defaults to "Back". */
  label?: string
  className?: string
}

/**
 * Consistent, history-aware Back navigation control used across the RePXL
 * website (customer + admin).
 *
 * Behavior:
 *  - With `href`: renders a Link to that parent route (predictable, SSR-safe).
 *  - Without `href`: returns the user to the *actual* previous in-app page
 *    (preserving its query string / filters / pagination) when that page is a
 *    safe internal route; otherwise navigates to a section-appropriate fallback.
 *  - Never navigates to an external URL, an auth/OAuth callback, or a
 *    payment-processing route, and never loops back to the current page.
 *
 * Placement convention: put it in the page content header, above or beside the
 * page title, with `className="mb-6"` (stacked) or inside a flex row (inline).
 * Do NOT use it for modal close controls, step navigation, or pagination.
 */
export function BackButton({ href, fallback, label = 'Back', className = '' }: BackButtonProps) {
  const { goBack, href: resolvedHref } = useSafeBack({ href, fallback })

  // Accessible label. If the visible label already reads like a back phrase
  // (e.g. "Back to Cart"), use it verbatim to avoid "Back to Back to Cart".
  const startsWithBack = /^back\b/i.test(label.trim())
  const ariaLabel = startsWithBack ? label : `Back to ${label}`

  const baseClass = `group inline-flex items-center gap-2 rounded-lg border border-repixl-muted/25
    bg-repixl-charcoal/60 px-4 py-2.5 font-mono text-xs uppercase tracking-wider
    text-repixl-muted transition-all min-h-[40px]
    hover:border-repixl-muted/50 hover:bg-repixl-charcoal hover:text-repixl-text-light
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50
    focus-visible:ring-offset-2 focus-visible:ring-offset-repixl-bg
    active:bg-repixl-charcoal active:text-repixl-text-light ${className}`

  const arrow = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="transition-transform group-hover:-translate-x-0.5"
      aria-hidden="true"
    >
      <path d="M19 12H5" />
      <path d="m12 5-7 7 7 7" />
    </svg>
  )

  // With an explicit href we render a real anchor for progressive enhancement
  // (keyboard, middle-click open-in-new-tab, prefetch). We still intercept the
  // primary click so the resolved/validated target is used consistently.
  if (href) {
    return (
      <Link
        href={resolvedHref}
        className={baseClass}
        aria-label={ariaLabel}
      >
        {arrow}
        {label}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className={baseClass}
      aria-label={startsWithBack ? label : `Go back: ${label}`}
    >
      {arrow}
      {label}
    </button>
  )
}

interface PageBackLinkProps {
  /** Explicit parent route (optional). Omit for history-aware "actual previous page". */
  href?: string
  /** Fallback destination for direct visits when there is no history and no href. */
  fallback?: string
  /** Label shown after the arrow. Defaults to "Back". */
  label?: string
  /** Extra classes on the wrapper (spacing overrides only — not the button styling). */
  className?: string
}

/**
 * Canonical page-header back-navigation region.
 *
 * This is the ONE placement wrapper every page should use so the Back button
 * always appears in the same predictable spot: a left-aligned, block-level row
 * at the very top of the page's main content container, before the page
 * heading, with consistent bottom spacing.
 *
 * It renders the single shared `BackButton` (identical visual identity
 * everywhere) — pages only vary the `label`/`href`/`fallback`, never the look.
 *
 * Do NOT hand-place `BackButton` with ad-hoc spacing/alignment; use this wrapper
 * so placement stays consistent across storefront, account, informational, and
 * admin layouts (which may differ in container width but not in placement rules).
 */
export function PageBackLink({ href, fallback, label = 'Back', className = '' }: PageBackLinkProps) {
  return (
    <div className={`mb-6 flex ${className}`}>
      <BackButton href={href} fallback={fallback} label={label} />
    </div>
  )
}
