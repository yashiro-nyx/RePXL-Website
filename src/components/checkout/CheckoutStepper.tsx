'use client'

import { CHECKOUT_STEPS, STEP_META, stepIndex, type CheckoutStep } from '@/lib/checkout-steps'

/**
 * Checkout progress stepper (Information → Shipping → Payment → Review).
 *
 * - Restrained RePXL red for completed/current progress; upcoming steps are muted.
 * - State is communicated by MORE than color: a ✓ check for completed, a filled
 *   dot for the current step, a number for upcoming — plus a per-node status in
 *   the accessible label. `aria-current="step"` marks the active node.
 * - Completed (and reachable) steps are real buttons; unreachable future steps
 *   are disabled and non-interactive.
 * - Compact on mobile (short labels, no overflow) and full on desktop.
 */
export function CheckoutStepper({
  current,
  canNavigate,
  onNavigate,
}: {
  current: CheckoutStep
  /** Whether a given step can be navigated to directly (gating from the page). */
  canNavigate: (step: CheckoutStep) => boolean
  onNavigate: (step: CheckoutStep) => void
}) {
  const currentIndex = stepIndex(current)

  return (
    <nav aria-label="Checkout progress" className="mb-8">
      <ol className="flex items-center">
        {CHECKOUT_STEPS.map((step, i) => {
          const meta = STEP_META[step]
          const isCompleted = i < currentIndex
          const isCurrent = i === currentIndex
          const reachable = canNavigate(step)
          const interactive = reachable && !isCurrent

          const status = isCompleted ? 'completed' : isCurrent ? 'current' : 'upcoming'

          const circle = (
            <span
              className={[
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-semibold transition-colors',
                isCompleted
                  ? 'border-repixl-red bg-repixl-red text-white'
                  : isCurrent
                    ? 'border-repixl-red bg-repixl-red/10 text-repixl-red'
                    : 'border-repixl-muted/30 bg-transparent text-repixl-muted',
              ].join(' ')}
              aria-hidden="true"
            >
              {isCompleted ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              ) : (
                i + 1
              )}
            </span>
          )

          const label = (
            <span
              className={[
                'mt-2 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors sm:text-[11px]',
                isCurrent ? 'text-repixl-text-light' : isCompleted ? 'text-repixl-text-light/70' : 'text-repixl-muted',
              ].join(' ')}
            >
              <span className="sm:hidden">{meta.shortLabel}</span>
              <span className="hidden sm:inline">{meta.label}</span>
            </span>
          )

          const nodeInner = (
            <span className="flex flex-col items-center">
              {circle}
              {label}
            </span>
          )

          return (
            <li key={step} className="flex flex-1 items-center last:flex-none">
              {interactive ? (
                <button
                  type="button"
                  onClick={() => onNavigate(step)}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={`Step ${i + 1}: ${meta.label} (${status}) — go to this step`}
                  className="group rounded-lg px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40"
                >
                  {nodeInner}
                </button>
              ) : (
                <span
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={`Step ${i + 1}: ${meta.label} (${status})`}
                  aria-disabled={!reachable && !isCurrent ? true : undefined}
                  className="px-1"
                >
                  {nodeInner}
                </span>
              )}

              {/* Connector line (not after the last node) */}
              {i < CHECKOUT_STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className={[
                    'mx-2 mb-6 h-px flex-1 transition-colors sm:mx-3',
                    i < currentIndex ? 'bg-repixl-red' : 'bg-repixl-muted/25',
                  ].join(' ')}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
