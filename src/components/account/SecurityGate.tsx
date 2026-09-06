'use client'

import { useEffect, useState, useCallback } from 'react'
import { signIn } from 'next-auth/react'
import { Button, PasswordInput, InlineLoader } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'

type GateState = 'loading' | 'open' | 'gate-password' | 'gate-google' | 'verifying'

interface SecurityGateProps {
  /** Content to render when recent-auth is valid */
  children: React.ReactNode
}

/**
 * SecurityGate wraps any Security page content.
 *
 * On mount it calls GET /api/auth/recent-auth:
 *   - If valid → renders children immediately.
 *   - If invalid → renders the appropriate identity-verification screen:
 *       • Password accounts  → current-password form
 *       • Google-only accounts → "Continue with Google" button
 *
 * After successful verification it re-checks and reveals the children.
 *
 * Server-side, the API endpoints themselves also enforce recent-auth so
 * hiding the UI is defence-in-depth only, not the sole protection.
 */
export function SecurityGate({ children }: SecurityGateProps) {
  const { userEmail } = useAuthStore()

  const [gateState, setGateState] = useState<GateState>('loading')
  const [hasPassword, setHasPassword] = useState<boolean | null>(null)
  const [password, setPassword]     = useState('')
  const [error, setError]           = useState('')
  const [verifying, setVerifying]   = useState(false)

  // ── Check recent-auth status on mount ──────────────────────────────────────

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/recent-auth', { credentials: 'include', cache: 'no-store' })
      if (!res.ok) { setGateState(await resolveGateType()); return }
      const { data } = await res.json()
      if (data?.verified) {
        setGateState('open')
      } else {
        setGateState(await resolveGateType())
      }
    } catch {
      setGateState(await resolveGateType())
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { checkStatus() }, [checkStatus])

  // ── Detect account type ────────────────────────────────────────────────────

  async function resolveGateType(): Promise<'gate-password' | 'gate-google'> {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' })
      const { data } = await res.json()
      const hp = typeof data?.hasPassword === 'boolean' ? data.hasPassword : true
      setHasPassword(hp)
      return hp ? 'gate-password' : 'gate-google'
    } catch {
      setHasPassword(true)
      return 'gate-password'
    }
  }

  // ── Password form submit ───────────────────────────────────────────────────

  async function handlePasswordVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim()) { setError('Please enter your password.'); return }
    setError('')
    setVerifying(true)
    try {
      const res = await fetch('/api/auth/recent-auth', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'password', password }),
      })
      const data = await res.json()
      if (res.status === 429) {
        setError('Too many failed attempts. Please wait 10 minutes.')
        return
      }
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Verification failed. Please try again.')
        return
      }
      setPassword('')
      setGateState('open')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  // ── Google re-auth ─────────────────────────────────────────────────────────
  // We trigger a fresh Google sign-in via NextAuth. After the OAuth round-trip
  // completes, the primaryAt in the session will be fresh and the /api/auth/recent-auth
  // POST with method=google will succeed.

  async function handleGoogleVerify() {
    setVerifying(true)
    setError('')
    try {
      // NextAuth's signIn triggers a Google OAuth flow; on success it re-runs
      // our OAuth handler which updates primaryAt in the session cookie.
      const result = await signIn('google', {
        redirect: false,
        callbackUrl: typeof window !== 'undefined' ? window.location.href : '/account/security',
      })
      if (result?.error) {
        setError('Google authentication failed. Please try again.')
        setVerifying(false)
        return
      }
      // Small delay for cookie to propagate, then verify server-side
      await new Promise((r) => setTimeout(r, 800))
      const res = await fetch('/api/auth/recent-auth', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'google' }),
      })
      const body = await res.json()
      if (!res.ok || !body.success) {
        setError(body.error ?? 'Google verification failed. Please try again.')
        setVerifying(false)
        return
      }
      setGateState('open')
    } catch {
      setError('Verification failed. Please try again.')
      setVerifying(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (gateState === 'loading') {
    return <InlineLoader label="Checking security status…" className="min-h-[16rem]" />
  }

  if (gateState === 'open') {
    return <>{children}</>
  }

  // Gate screens
  return (
    <div className="flex min-h-[20rem] items-center justify-center">
      <div className="w-full max-w-sm rounded-2xl border border-repixl-muted/10 bg-repixl-charcoal p-8">
        {/* Lock icon */}
        <div className="mb-5 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-repixl-red/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-red" aria-hidden="true">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
        </div>

        <h2 className="mb-1 text-center font-display text-lg font-semibold text-repixl-text-light">
          Verify Your Identity
        </h2>
        <p className="mb-6 text-center text-sm text-repixl-muted">
          For your security, please confirm your identity before managing security settings.
        </p>

        {gateState === 'gate-password' && (
          <form onSubmit={handlePasswordVerify} noValidate className="space-y-4">
            <div>
              <label htmlFor="sg-password" className="mb-1.5 block text-xs text-repixl-text-light/70">
                Current Password
              </label>
              <PasswordInput
                id="sg-password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={verifying}
                autoFocus
              />
            </div>
            {error && (
              <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
                {error}
              </p>
            )}
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              disabled={verifying || !password.trim()}
              loading={verifying}
            >
              Verify
            </Button>
          </form>
        )}

        {gateState === 'gate-google' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-repixl-text-light/70">
              Your account uses Google Sign-In. To verify your identity, please sign in with Google again.
            </div>
            {error && (
              <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
                {error}
              </p>
            )}
            <Button
              type="button"
              variant="primary"
              size="md"
              className="w-full"
              disabled={verifying}
              loading={verifying}
              onClick={handleGoogleVerify}
            >
              Continue with Google
            </Button>
          </div>
        )}

        {/* Current account indicator */}
        {userEmail && (
          <p className="mt-5 text-center font-mono text-[10px] text-repixl-muted/50">
            {userEmail}
          </p>
        )}
      </div>
    </div>
  )
}
