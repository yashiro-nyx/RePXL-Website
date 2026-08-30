'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button, CornerBracket } from '@/components/ui'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const validate = (value: string): string => {
    if (!value.trim()) return 'Email address is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Enter a valid email address.'
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate(email)
    if (err) { setError(err); return }
    setError('')
    setLoading(true)
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      // Always show the success state regardless of API result
      // to avoid revealing whether the email is registered
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="burn-subtle flex min-h-screen items-center justify-center px-4 py-24">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/">
            <CornerBracket size={8} color="rgba(245, 241, 236, 0.3)" className="mx-auto inline-block px-3 py-1.5">
              <span className="font-display text-xl font-semibold tracking-tight text-repixl-text-light">
                RePXL
              </span>
            </CornerBracket>
          </Link>
        </div>

        <div className="rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-6 md:p-8">
          {submitted ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-repixl-success/15">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-success"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
              </div>
              <h1 className="font-display text-display-sm text-repixl-text-light">Check your email</h1>
              <p className="mt-2 text-sm text-repixl-muted">
                If an account with that email exists, we&apos;ve sent password reset instructions. The link expires in 1 hour.
              </p>
              <p className="mt-3 text-xs text-repixl-muted">
                Didn&apos;t receive it? Check your spam folder or{' '}
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="text-repixl-red underline hover:text-repixl-red/80"
                >
                  try again
                </button>.
              </p>
              <Link href="/login" className="mt-6 inline-block text-sm text-repixl-text-light/80 underline hover:text-repixl-text-light">
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-center font-display text-display-sm text-repixl-text-light">
                Reset your password
              </h1>
              <p className="mt-1 text-center text-sm text-repixl-muted">
                Enter your email and we&apos;ll send reset instructions.
              </p>

              <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
                <div>
                  <label htmlFor="reset-email" className="mb-1 block text-xs text-repixl-text-light/70">
                    Email Address
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (error) setError('') }}
                    disabled={loading}
                    className={`w-full rounded border px-3 py-2.5 text-sm text-repixl-text-light placeholder:text-repixl-muted/50 focus:outline-none disabled:opacity-60 ${
                      error
                        ? 'border-red-400/60 bg-red-400/5 focus:border-red-400'
                        : 'border-repixl-muted/20 bg-repixl-bg focus:border-repixl-muted/50'
                    }`}
                    placeholder="you@example.com"
                  />
                  {error && <p className="mt-1 text-xs text-red-400" role="alert">{error}</p>}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={loading}
                  className="w-full disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Sending...
                    </span>
                  ) : 'Send Reset Link'}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-repixl-muted">
                <Link href="/login" className="text-repixl-text-light/80 underline hover:text-repixl-text-light">
                  Back to login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
