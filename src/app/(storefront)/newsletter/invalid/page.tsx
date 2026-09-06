import Link from 'next/link'
import { Container } from '@/components/layout/Container'

export const metadata = { title: 'Subscription Link Invalid — RePIXL' }

const REASON_MESSAGES: Record<string, string> = {
  expired:   'This confirmation link has expired. Links are valid for 24 hours.',
  invalid:   'This confirmation link is invalid or has already been used.',
  malformed: 'This confirmation link appears to be incomplete or malformed.',
}

export default function NewsletterInvalidPage({
  searchParams,
}: {
  searchParams: { reason?: string }
}) {
  const reason = searchParams?.reason ?? 'invalid'
  const message = REASON_MESSAGES[reason] ?? REASON_MESSAGES.invalid

  return (
    <div className="burn-subtle min-h-screen pt-32 pb-24">
      <Container>
        <div className="mx-auto max-w-md text-center">
          {/* Warning icon */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-repixl-warning/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-warning" aria-hidden="true">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
          </div>

          <h1 className="font-display text-2xl font-bold text-repixl-text-light">
            Confirmation Link Invalid
          </h1>
          <p className="mt-3 text-repixl-muted">{message}</p>
          {reason === 'expired' && (
            <p className="mt-2 text-sm text-repixl-muted">
              You can subscribe again below to receive a new confirmation link.
            </p>
          )}

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/#newsletter"
              className="rounded-xl bg-repixl-red px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-repixl-red/90"
            >
              Subscribe Again
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
