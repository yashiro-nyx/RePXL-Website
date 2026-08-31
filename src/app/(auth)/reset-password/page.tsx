'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, CornerBracket, PasswordInput } from '@/components/ui'

const passwordRequirements = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p: string) => /\d/.test(p) },
]

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') ?? ''

  const [tokenState, setTokenState] = useState<'checking' | 'valid' | 'invalid'>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({})
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [apiError, setApiError] = useState('')

  // Validate token on mount
  useEffect(() => {
    if (!token) { setTokenState('invalid'); return }
    fetch('/api/auth/validate-reset-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((data) => setTokenState(data.valid ? 'valid' : 'invalid'))
      .catch(() => setTokenState('invalid'))
  }, [token])

  const validate = () => {
    const errs: typeof errors = {}
    if (!passwordRequirements.every((r) => r.test(password))) {
      errs.password = 'Password does not meet all requirements.'
    }
    if (password !== confirm) {
      errs.confirm = 'Passwords do not match.'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setApiError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setApiError(data.message ?? 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }

      // Server authorized the change — password is already updated in the database.
      // Do NOT write the plaintext password to localStorage.
      setDone(true)
      // Redirect to login after 3 seconds
      setTimeout(() => router.push('/login'), 3000)
    } catch {
      setApiError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (tokenState === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <svg className="h-8 w-8 animate-spin text-repixl-red" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
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
          {tokenState === 'invalid' ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              </div>
              <h1 className="font-display text-display-sm text-repixl-text-light">Link expired or invalid</h1>
              <p className="mt-2 text-sm text-repixl-muted">
                This reset link is invalid or has expired. Reset links are valid for 1 hour.
              </p>
              <Link
                href="/forgot-password"
                className="mt-5 inline-block rounded bg-repixl-red px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                Request a new link
              </Link>
            </div>
          ) : done ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-repixl-success/15">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-success"><path d="M20 6 9 17l-5-5" /></svg>
              </div>
              <h1 className="font-display text-display-sm text-repixl-text-light">Password updated!</h1>
              <p className="mt-2 text-sm text-repixl-muted">
                Your password has been changed. Redirecting you to login...
              </p>
              <Link href="/login" className="mt-5 inline-block text-sm text-repixl-text-light/80 underline hover:text-repixl-text-light">
                Go to login now
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-center font-display text-display-sm text-repixl-text-light">
                Set new password
              </h1>
              <p className="mt-1 text-center text-sm text-repixl-muted">
                Choose a strong password for your account.
              </p>

              {apiError && (
                <div className="mt-4 rounded border border-red-500/30 bg-red-500/10 px-3 py-2">
                  <p className="text-xs text-red-400">{apiError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
                <div>
                  <label htmlFor="new-password" className="mb-1 block text-xs text-repixl-text-light/70">
                    New Password
                  </label>
                  <PasswordInput
                    id="new-password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((p) => ({ ...p, password: undefined })) }}
                    error={errors.password}
                  />
                  {errors.password && <p className="mt-1 text-xs text-red-400" role="alert">{errors.password}</p>}
                  {/* Requirements checklist */}
                  <ul className="mt-2.5 space-y-1" aria-label="Password requirements">
                    {passwordRequirements.map((req) => {
                      const met = req.test(password)
                      return (
                        <li key={req.label} className="flex items-center gap-2">
                          {met
                            ? <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-repixl-success"><path d="M20 6 9 17l-5-5" /></svg>
                            : <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-repixl-muted/40"><circle cx="12" cy="12" r="10" /></svg>
                          }
                          <span className={`text-[11px] ${met ? 'text-repixl-success' : 'text-repixl-muted/60'}`}>{req.label}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>

                <div>
                  <label htmlFor="confirm-password" className="mb-1 block text-xs text-repixl-text-light/70">
                    Confirm New Password
                  </label>
                  <PasswordInput
                    id="confirm-password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => { setConfirm(e.target.value); if (errors.confirm) setErrors((p) => ({ ...p, confirm: undefined })) }}
                    error={errors.confirm}
                  />
                  {errors.confirm && <p className="mt-1 text-xs text-red-400" role="alert">{errors.confirm}</p>}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={loading}
                  className="mt-2 w-full disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Updating...
                    </span>
                  ) : 'Update Password'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <svg className="h-8 w-8 animate-spin text-repixl-red" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
