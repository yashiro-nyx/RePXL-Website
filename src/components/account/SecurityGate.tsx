'use client'

import { useEffect, useState, useCallback } from 'react'
import { messageFromApiBody } from '@/lib/errors/client-errors'
import { signIn } from 'next-auth/react'
import { Button, PasswordInput, InlineLoader, OtpInput } from '@/components/ui'

type Method = 'totp' | 'password' | 'email' | 'google'
type GateState = 'loading' | 'open' | 'gate' | 'verifying'

interface RecentAuthStatus {
  verified: boolean
  methods: Record<Method, boolean>
  maskedEmail: string
}

/**
 * SecurityGate wraps sensitive Security page content.
 *
 * It does NOT block navigation or force a full re-login. On mount it asks
 * `GET /api/auth/recent-auth` whether the session is already "recently verified"
 * (a short, server-enforced window). If so, it renders children. If not, it
 * shows a focused verify panel offering ONLY the methods this account can
 * actually use (from the same endpoint):
 *   • Authenticator app (TOTP) — if 2FA is enabled
 *   • Password — if the account has a password
 *   • Email code — always available
 *   • Continue with Google — if signed in with Google
 *
 * All verification is enforced server-side; hiding the UI is defence-in-depth
 * only. Once verified, the elevated window lets the customer perform several
 * sensitive changes without re-verifying on every click.
 */
export function SecurityGate({ children }: { children: React.ReactNode }) {
  const [gateState, setGateState] = useState<GateState>('loading')
  const [methods, setMethods] = useState<Record<Method, boolean>>({ totp: false, password: false, email: true, google: false })
  const [maskedEmail, setMaskedEmail] = useState('')
  const [active, setActive] = useState<Method>('email')

  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [verifying, setVerifying] = useState(false)

  // ── Check recent-auth + available methods on mount ─────────────────────────
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/recent-auth', { credentials: 'include', cache: 'no-store' })
      if (!res.ok) throw new Error('Status unavailable')
      const { data } = (await res.json()) as { data: RecentAuthStatus }
      if (data?.verified) { setGateState('open'); return }
      const m = data?.methods ?? { totp: false, password: false, email: true, google: false }
      setMethods(m)
      setMaskedEmail(data?.maskedEmail ?? '')
      // Default to the strongest available method: TOTP → password → email → google.
      setActive(m.password ? 'password' : m.email ? 'email' : m.totp ? 'totp' : 'google')
      setGateState('gate')
    } catch {
      // On any failure, still let the customer verify by email (always available).
      setError("We couldn't load your verification options. Please refresh the page.")
      setGateState('loading')
    }
  }, [])

  useEffect(() => { checkStatus() }, [checkStatus])

  function switchMethod(m: Method) {
    setActive(m)
    setError('')
    setInfo('')
  }

  async function post(bodyObj: Record<string, unknown>) {
    return fetch('/api/auth/recent-auth', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyObj),
    })
  }

  // ── Password ───────────────────────────────────────────────────────────────
  async function verifyPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim()) { setError('Please enter your password.'); return }
    setError(''); setVerifying(true)
    try {
      const res = await post({ method: 'password', password })
      const data = await res.json()
      if (res.status === 429) { setError('Too many failed attempts. Please wait 10 minutes.'); return }
      if (!res.ok || !data.success) { setError(messageFromApiBody(data, res.status)); return }
      setPassword(''); setGateState('open')
    } catch { setError('Network error. Please try again.') } finally { setVerifying(false) }
  }

  // ── Authenticator app (TOTP) ─────────────────────────────────────────────────
  async function verifyTotp(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) { setError('Enter the 6-digit code from your authenticator app.'); return }
    setError(''); setVerifying(true)
    try {
      const res = await post({ method: 'totp', code: code.trim() })
      const data = await res.json()
      if (res.status === 429) { setError('Too many attempts. Please wait a few minutes and try again.'); return }
      if (!res.ok || !data.success) { setError(messageFromApiBody(data, res.status)); return }
      setCode(''); setGateState('open')
    } catch { setError('Network error. Please try again.') } finally { setVerifying(false) }
  }

  // ── Email code ───────────────────────────────────────────────────────────────
  async function sendEmailCode() {
    setError(''); setInfo(''); setVerifying(true)
    try {
      const res = await post({ method: 'email-otp-send' })
      const data = await res.json()
      if (res.status === 429) { setError('Please wait a moment before requesting another code.'); return }
      if (!res.ok || !data.success) { setError(messageFromApiBody(data, res.status)); return }
      setEmailSent(true)
      setInfo(`We sent a verification code to ${data.data?.to ?? maskedEmail}.`)
    } catch { setError('Network error. Please try again.') } finally { setVerifying(false) }
  }

  async function verifyEmailCode(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) { setError('Enter the verification code we emailed you.'); return }
    setError(''); setVerifying(true)
    try {
      const res = await post({ method: 'email-otp-verify', code: code.trim() })
      const data = await res.json()
      if (res.status === 429) { setError(messageFromApiBody(data, res.status)); return }
      if (!res.ok || !data.success) { setError(messageFromApiBody(data, res.status)); return }
      setCode(''); setGateState('open')
    } catch { setError('Network error. Please try again.') } finally { setVerifying(false) }
  }

  // ── Google ─────────────────────────────────────────────────────────────────
  async function verifyGoogle() {
    setVerifying(true); setError('')
    try {
      const result = await signIn('google', {
        redirect: false,
        callbackUrl: typeof window !== 'undefined' ? window.location.href : '/account/security',
      })
      if (result?.error) { setError("We couldn't verify your identity with Google. Try again or choose another method."); setVerifying(false); return }
      // Give NextAuth's session cookie a moment to settle, then verify server-side
      // against the fresh NextAuth session.
      await new Promise((r) => setTimeout(r, 600))
      const res = await post({ method: 'google' })
      const data = await res.json()
      if (!res.ok || !data.success) { setError(messageFromApiBody(data, res.status)); setVerifying(false); return }
      setGateState('open')
    } catch { setError("We couldn't verify your identity with Google. Try again or choose another method."); setVerifying(false) }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  if (gateState === 'loading' && error) return <p role="alert">{error}</p>
  if (gateState === 'loading') {
    return <InlineLoader label="Checking security status…" className="min-h-[16rem]" />
  }
  if (gateState === 'open') {
    return <>{children}</>
  }

  const otherMethods = (['totp', 'password', 'email', 'google'] as Method[]).filter((m) => methods[m] && m !== active)
  const methodLabel: Record<Method, string> = {
    totp: 'Use authenticator app',
    password: 'Use password',
    email: 'Send code to email',
    google: 'Continue with Google',
  }

  return (
    <div className="flex min-h-[20rem] items-center justify-center">
      <div className="w-full max-w-sm rounded-2xl border border-repixl-muted/10 bg-repixl-charcoal p-8" role="dialog" aria-labelledby="sg-title" aria-describedby="sg-desc">
        <div className="mb-5 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-repixl-red/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-red" aria-hidden="true">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        </div>

        <h2 id="sg-title" className="mb-1 text-center font-display text-lg font-semibold text-repixl-text-light">Verify your identity</h2>
        <p id="sg-desc" className="mb-6 text-center text-sm text-repixl-muted">
          For your security, please confirm your identity before changing your security settings.
        </p>

        {info && (
          <p role="status" className="mb-4 rounded-lg border border-repixl-success/20 bg-repixl-success/5 px-3 py-2 text-xs text-repixl-success">{info}</p>
        )}
        {error && (
          <p role="alert" aria-live="assertive" className="mb-4 flex items-start gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="mt-0.5 flex-shrink-0" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
            {error}
          </p>
        )}

        {/* Authenticator app */}
        {active === 'totp' && (
          <form onSubmit={verifyTotp} noValidate className="space-y-4">
            <div>
              <span id="sg-totp-label" className="mb-1.5 block text-xs text-repixl-text-light/70">6-digit code from your authenticator app</span>
              <OtpInput ariaLabel="6-digit authenticator code" value={code} onChange={setCode} disabled={verifying} error={!!error} autoFocus />
            </div>
            <Button type="submit" variant="primary" size="md" className="w-full" disabled={verifying || !code.trim()} loading={verifying}>Verify</Button>
          </form>
        )}

        {/* Password */}
        {active === 'password' && (
          <form onSubmit={verifyPassword} noValidate className="space-y-4">
            <div>
              <label htmlFor="sg-password" className="mb-1.5 block text-xs text-repixl-text-light/70">Current password</label>
              <PasswordInput id="sg-password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={verifying} autoFocus />
            </div>
            <Button type="submit" variant="primary" size="md" className="w-full" disabled={verifying || !password.trim()} loading={verifying}>Verify</Button>
          </form>
        )}

        {/* Email code */}
        {active === 'email' && (
          !emailSent ? (
            <div className="space-y-4">
              <p className="text-center text-xs text-repixl-muted">We'll email a verification code to {maskedEmail || 'your email'}.</p>
              <Button type="button" variant="primary" size="md" className="w-full" disabled={verifying} loading={verifying} onClick={sendEmailCode}>Send code</Button>
            </div>
          ) : (
            <form onSubmit={verifyEmailCode} noValidate className="space-y-4">
              <div>
                <span className="mb-1.5 block text-xs text-repixl-text-light/70">Enter the verification code</span>
                <OtpInput ariaLabel="6-digit email verification code" value={code} onChange={setCode} disabled={verifying} error={!!error} autoFocus />
              </div>
              <Button type="submit" variant="primary" size="md" className="w-full" disabled={verifying || !code.trim()} loading={verifying}>Verify</Button>
              <button type="button" onClick={sendEmailCode} disabled={verifying} className="w-full text-center text-xs text-repixl-muted hover:text-repixl-text-light disabled:opacity-50">Resend code</button>
            </form>
          )
        )}

        {/* Google */}
        {active === 'google' && (
          <div className="space-y-4">
            <p className="text-center text-xs text-repixl-muted">Confirm your identity with your Google account.</p>
            <Button type="button" variant="primary" size="md" className="w-full" disabled={verifying} loading={verifying} onClick={verifyGoogle}>Continue with Google</Button>
          </div>
        )}

        {/* Other verification methods */}
        {otherMethods.length > 0 && (
          <div className="mt-5 border-t border-repixl-muted/10 pt-4">
            <p className="mb-2 text-center font-mono text-[10px] uppercase tracking-widest text-repixl-muted/60">Or verify another way</p>
            <div className="flex flex-col gap-1.5">
              {otherMethods.map((m) => (
                <button key={m} type="button" onClick={() => switchMethod(m)}
                  className="rounded-lg px-3 py-1.5 text-center text-xs text-repixl-text-light/80 transition-colors hover:bg-repixl-bg hover:text-repixl-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40">
                  {methodLabel[m]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
