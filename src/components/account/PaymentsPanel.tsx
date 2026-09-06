'use client'

/**
 * PaymentsPanel — Customer Payment Methods
 *
 * ARCHITECTURE NOTE: RePIXL does not currently store reusable payment-method
 * credentials in a provider-backed vault. After checkout, only display metadata
 * (last4, brand, expiry, cardholderName) is retained in the local paymentStore
 * — this data is transient and always empty after a page load because
 * paymentStore.hydrate() intentionally resets cards to [].
 *
 * There is no server-side card storage and no PayMongo Customer / PaymentMethod
 * API integration yet. Therefore this panel accurately displays an empty state
 * and explains how payment works, rather than showing fake saved cards.
 *
 * SECURITY BOUNDARY: Full card numbers (PAN), CVV, and PIN are NEVER stored
 * in Neon, localStorage, sessionStorage, cookies, or Zustand persistence.
 * Do not add any capability that would break this boundary.
 */

export default function PaymentsPanel() {
  return (
    <div className="space-y-5">
      <div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">— Billing</span>
        <h1 className="mt-1 font-display text-display-md text-repixl-text-light">Payment Methods</h1>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-repixl-muted/20 px-6 py-16 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-repixl-charcoal/50">
          {/* Credit card icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-repixl-muted/40"
            aria-hidden="true"
          >
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <line x1="2" x2="22" y1="10" y2="10" />
          </svg>
        </div>

        <p className="font-display text-display-sm text-repixl-text-light/60">
          No saved payment methods
        </p>
        <p className="mt-2 max-w-sm text-sm text-repixl-muted">
          RePIXL does not currently store reusable payment methods. You can enter your card or choose GCash at checkout when you place an order.
        </p>
      </div>

      {/* How payment works */}
      <div className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-5">
        <h2 className="mb-4 font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
          How payment works
        </h2>
        <ul className="space-y-3">
          {[
            {
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-success" aria-hidden="true"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
              ),
              text: 'Credit and debit cards are accepted at checkout via our secure payment provider.',
            },
            {
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-success" aria-hidden="true"><path d="M12 22V12M12 12C12 7 7 3.5 2 4M12 12C12 7 17 3.5 22 4"/></svg>
              ),
              text: 'GCash and other local e-wallet options are available at checkout.',
            },
            {
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-success" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              ),
              text: 'Payments are processed securely. Full card numbers are never stored by RePIXL.',
            },
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0">{item.icon}</span>
              <p className="text-sm text-repixl-text-light/70">{item.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
