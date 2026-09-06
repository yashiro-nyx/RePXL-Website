'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'

/**
 * /newsletter/unsubscribe-confirm?token=...
 *
 * Shown after the user clicks the unsubscribe link in a marketing email.
 * Requires an explicit button click to POST the token — GET links (including
 * email security scanners) cannot trigger an unsubscribe.
 */
export default function UnsubscribeConfirmPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') ?? ''

  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // Basic token presence check — redirect away if clearly missing
  useEffect(() => {
    if (!token || token.length < 20) {
      router.replace('/newsletter/invalid?reason=malformed')
    }
  }, [token, router])

  async function handleConfirm() {
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        router.replace('/newsletter/unsubscribed')
      } else {
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.')
        setStatus('error')
      }
    } catch {
      setErrorMsg('Network error. Please try again.')
      setStatus('error')
    }
  }

  if (!token || token.length < 20) return null

  return (
    <div className="burn-subtle min-h-screen pt-32 pb-24">
      <Container>
        <div className="mx-auto max-w-md text-center">
          {/* Bell icon */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-repixl-warning/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-warning" aria-hidden="true">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
              </svg>
            </div>
          </div>

          <h1 className="font-display text-2xl font-bold text-repixl-text-light">
            Unsubscribe from RePIXL?
          </h1>
          <p className="mt-3 text-repixl-muted">
            You will no longer receive newsletters, promotions, or new-arrival alerts from RePIXL.
          </p>
          <p className="mt-2 text-sm text-repixl-muted">
            You can re-subscribe at any time from the home page.
          </p>

          {errorMsg && (
            <p role="alert" className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
              {errorMsg}
            </p>
          )}

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              disabled={status === 'loading' || status === 'done'}
              onClick={handleConfirm}
              className="rounded-xl bg-repixl-red px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-repixl-red/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === 'loading' ? 'Unsubscribing…' : 'Confirm Unsubscribe'}
            </button>
            <Link
              href="/"
              className="rounded-xl border border-repixl-muted/20 px-6 py-3 text-sm text-repixl-muted transition-colors hover:text-repixl-text-light"
            >
              Keep my subscription
            </Link>
          </div>
        </div>
      </Container>
    </div>
  )
}
