'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { Button, CornerBracket } from '@/components/ui'

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const email = (formRef.current?.querySelector('#reset-email') as HTMLInputElement)?.value ?? ''
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.')
      return
    }
    setError('')
    setSubmitted(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-repixl-bg px-4 py-24">
      <Container className="max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/">
            <CornerBracket size={8} color="rgba(245, 241, 236, 0.3)" className="mx-auto inline-block px-3 py-1.5">
              <span className="font-display text-xl font-semibold tracking-tight text-repixl-text-light">
                RePIXL
              </span>
            </CornerBracket>
          </Link>
        </div>

        {submitted ? (
          <div className="text-center">
            <h1 className="font-display text-display-sm text-repixl-text-light">Check your email</h1>
            <p className="mt-2 text-sm text-repixl-muted">
              If an account with that email exists, we&apos;ve sent password reset instructions.
            </p>
            <Link href="/login" className="mt-6 inline-block text-sm text-repixl-red hover:underline">
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

            <form ref={formRef} onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
              <div>
                <label htmlFor="reset-email" className="mb-1 block text-xs text-repixl-text-light/70">
                  Email Address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  className={`w-full rounded border px-3 py-2.5 text-sm text-repixl-text-light placeholder:text-repixl-muted/50 focus:outline-none ${
                    error ? 'border-red-400/60 bg-red-400/5 focus:border-red-400' : 'border-repixl-muted/20 bg-repixl-charcoal focus:border-repixl-muted/50'
                  }`}
                />
                {error && <p className="mt-1 text-xs text-red-400" role="alert">{error}</p>}
              </div>
              <Button type="submit" variant="primary" size="lg" className="w-full">
                Send Reset Link
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-repixl-muted">
              <Link href="/login" className="text-repixl-text-light/80 underline hover:text-repixl-text-light">
                Back to login
              </Link>
            </p>
          </>
        )}
      </Container>
    </div>
  )
}
