import Link from 'next/link'
import { Container } from '@/components/layout/Container'

export const metadata = { title: 'Subscription Confirmed — RePIXL' }

export default function NewsletterConfirmedPage() {
  return (
    <div className="burn-subtle min-h-screen pt-32 pb-24">
      <Container>
        <div className="mx-auto max-w-md text-center">
          {/* Checkmark */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-repixl-success/15">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-success" aria-hidden="true">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
            </div>
          </div>

          <h1 className="font-display text-2xl font-bold text-repixl-text-light">
            Subscription Confirmed
          </h1>
          <p className="mt-3 text-repixl-muted">
            You&apos;re now subscribed to the RePIXL newsletter. Look out for new vintage camera arrivals, deals, and collector news.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/products"
              className="rounded-xl bg-repixl-red px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-repixl-red/90"
            >
              Browse Cameras
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-repixl-muted/20 px-6 py-3 text-sm text-repixl-muted transition-colors hover:text-repixl-text-light"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </Container>
    </div>
  )
}
