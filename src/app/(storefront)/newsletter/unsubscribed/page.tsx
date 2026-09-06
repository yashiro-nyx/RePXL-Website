import Link from 'next/link'
import { Container } from '@/components/layout/Container'

export const metadata = { title: 'Unsubscribed — RePIXL' }

export default function NewsletterUnsubscribedPage() {
  return (
    <div className="burn-subtle min-h-screen pt-32 pb-24">
      <Container>
        <div className="mx-auto max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-repixl-muted/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-muted" aria-hidden="true">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
                <line x1="3" y1="3" x2="21" y2="21"/>
              </svg>
            </div>
          </div>

          <h1 className="font-display text-2xl font-bold text-repixl-text-light">
            You&apos;ve been unsubscribed
          </h1>
          <p className="mt-3 text-repixl-muted">
            You&apos;ve been removed from the RePIXL newsletter. You won&apos;t receive any further promotional emails from us.
          </p>
          <p className="mt-2 text-sm text-repixl-muted">
            Changed your mind? You can re-subscribe from the home page at any time.
          </p>

          <div className="mt-8">
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
