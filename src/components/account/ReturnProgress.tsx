'use client'

import {
  getReturnStage,
  getReturnTimeline,
  type ReturnWorkflow,
} from '@/lib/return-workflow'

export function ReturnProgress({ request }: { request: ReturnWorkflow }) {
  return (
    <section
      className="rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-5"
      aria-label="Return progress"
    >
      <h2 className="font-display text-lg font-semibold text-repixl-text-light">
        {getReturnStage(request)}
      </h2>
      {request.status === 'REJECTED' && (
        <p className="mt-3 text-sm text-red-400">
          {request.rejectionReason ||
            'Please contact support if you have questions about this decision.'}
        </p>
      )}
      <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {getReturnTimeline(request).map((step, index) => (
          <li
            key={step.label}
            className={`rounded-xl border p-3 ${step.date ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-repixl-muted/10'}`}
          >
            <p
              className={`text-xs font-medium ${step.date ? 'text-emerald-400' : 'text-repixl-muted'}`}
            >
              {step.date ? '✓' : index + 1} {step.label}
            </p>
            <p className="mt-1 text-[11px] text-repixl-muted">
              {step.date
                ? new Date(step.date).toLocaleString()
                : request.status === 'REJECTED'
                  ? 'Not completed'
                  : 'Pending'}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}
