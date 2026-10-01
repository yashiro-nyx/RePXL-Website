'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { messageFromApiBody } from '@/lib/errors/client-errors'
import { OtpInput } from '@/components/ui'

interface Status {
  enabled: boolean
  setupPending: boolean
  recoveryAcknowledged: boolean
  recoveryRemaining: number
  hasPassword: boolean
}
export function MfaSettings() {
  const [status, setStatus] = useState<Status | null>(null)
  const [setup, setSetup] = useState<{ secret: string; qrCode: string } | null>(
    null
  )
  const [codes, setCodes] = useState<string[]>([])
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [recovery, setRecovery] = useState(false)
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showKey, setShowKey] = useState(false)
  const load = async () => {
    const response = await fetch('/api/auth/mfa', {
      cache: 'no-store',
      credentials: 'include',
    })
    const result = await response.json()
    if (!response.ok)
      throw new Error(messageFromApiBody(result, response.status))
    setStatus(result.data)
  }
  useEffect(() => {
    load().catch(() => setError('Unable to load MFA status. Please refresh.'))
  }, [])
  async function act(action: string, submittedCode = code) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/auth/mfa', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, code: submittedCode.trim(), saved }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        setError(messageFromApiBody(result, response.status))
        if (result.code === 'RECENT_AUTH_REQUIRED') setPendingAction(action)
        return
      }
      setPendingAction(null)
      setCode('')
      setPassword('')
      if (result.data.secret) { setSetup(result.data); setShowKey(false); setMessage('Identity verified.') }
      if (result.data.recoveryCodes) {
        setCodes(result.data.recoveryCodes)
        setSaved(false)
        setSetup(null)
      }
      if (action === 'acknowledge') {
        setCodes([])
        setSaved(false)
        setMessage('Recovery codes acknowledged.')
      }
      if (action === 'cancel' || action === 'disable') {
        setSetup(null)
        setCodes([])
      }
      if (action === 'disable')
        setMessage('Two-factor authentication disabled.')
      await load()
    } catch {
      setError("We couldn't update two-factor authentication right now. Please try again.")
    } finally {
      setBusy(false)
    }
  }
  function requestAction(action: string) {
    setError('')
    setPassword('')
    setPendingAction(action)
  }
  async function verifyPassword(event: React.FormEvent) {
    event.preventDefault()
    if (!pendingAction || busy) return
    setBusy(true)
    setError('')
    const action = pendingAction
    try {
      const response = await fetch('/api/auth/recent-auth', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'password', password }),
      })
      const result = await response.json()
      setPassword('')
      if (!response.ok || !result.success) {
        setError(messageFromApiBody(result, response.status))
        return
      }
      // act() makes a new request; the server verifies the HttpOnly cookie and
      // canonical database record, independently of this component's state.
      await act(action)
    } catch {
      setError("We couldn't verify your identity right now. Please try again.")
    } finally { setPassword(''); setBusy(false) }
  }
  const input =
    'mt-2 w-full rounded border border-repixl-muted/30 bg-transparent p-3 text-repixl-text-light'
  return (
    <section
      aria-labelledby="mfa-heading"
      className="mt-10 space-y-4 border-t border-repixl-muted/20 pt-8"
    >
      <h3 id="mfa-heading" className="font-display text-xl">
        Two-factor authentication
      </h3>
      <p className="text-sm text-repixl-muted">
        Protect customer sign-in with Google Authenticator, Microsoft
        Authenticator, Authy, 1Password, or another TOTP app. Google sign-in
        also requires your second factor.
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-repixl-success">
          {message}
        </p>
      )}
      {status && (
        <>
          <p className="text-sm font-medium">
            {status.enabled
              ? 'MFA enabled'
              : status.setupPending
                ? 'Setup in progress — MFA is not enabled yet'
                : 'MFA disabled'}
          </p>
          {status.hasPassword && <p className="text-sm text-repixl-muted">For your security, verify your identity before changing two-factor authentication.</p>}
          {codes.length > 0 ? (
            <div className="space-y-4">
              <h4 className="font-medium">Save your recovery codes now</h4>
              <p className="text-sm text-repixl-muted">
                These codes are shown once. Store them in your password manager
                or print them and keep them securely. Each code works once.
              </p>
              <ul className="space-y-2 rounded border border-repixl-muted/30 p-3 font-mono text-xs">
                {codes.map((value) => (
                  <li key={value} className="select-all break-all">
                    {value}
                  </li>
                ))}
              </ul>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={saved}
                  onChange={(event) => setSaved(event.target.checked)}
                />
                I saved these recovery codes somewhere safe.
              </label>
              <button
                disabled={!saved || busy}
                onClick={() => act('acknowledge')}
                className="rounded bg-repixl-red px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                Finish and hide codes
              </button>
            </div>
          ) : (
            <>
              {setup ? (
                <div className="space-y-5">
                  {/* STEP 1 — connect authenticator */}
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">Step 1 — Connect your authenticator</p>
                    <p className="mt-1 text-sm text-repixl-text-light/80">
                      Open your authenticator app (Google Authenticator, Authy, 1Password…) and scan this QR code.
                    </p>
                    {/* QR is generated locally on the server; provisioning never goes to an external QR service. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={setup.qrCode}
                      width={200}
                      height={200}
                      alt="Authenticator setup QR code"
                      className="mt-3 rounded-lg border border-repixl-muted/15 bg-white p-2"
                    />
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => setShowKey((v) => !v)}
                        className="text-xs text-repixl-muted underline-offset-2 hover:text-repixl-text-light hover:underline"
                        aria-expanded={showKey}
                      >
                        Can&apos;t scan the QR code?
                      </button>
                      {showKey && (
                        <p className="mt-2 text-xs text-repixl-text-light/70">
                          Enter this setup key manually:{' '}
                          <code className="select-all break-all font-mono text-repixl-text-light">{setup.secret}</code>
                        </p>
                      )}
                    </div>
                    <p className="mt-2 text-[11px] text-repixl-muted/70">Setup expires in five minutes.</p>
                  </div>

                  {/* STEP 2 — enter the code */}
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">Step 2 — Enter the 6-digit code</p>
                    <p className="mt-1 text-sm text-repixl-text-light/80">Type the current 6-digit code shown in your authenticator app.</p>
                    <div className="mt-3">
                      <OtpInput
                        ariaLabel="6-digit authenticator code"
                        value={code}
                        onChange={setCode}
                        disabled={busy}
                        error={!!error}
                        onComplete={(completedCode) => { if (!busy) act('confirm', completedCode) }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      disabled={busy || !/^\d{6}$/.test(code)}
                      onClick={() => act('confirm')}
                      className="rounded bg-repixl-red px-4 py-2 text-sm text-white disabled:opacity-50"
                    >
                      Verify and Enable
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => act('cancel')}
                      className="text-sm underline"
                    >
                      Cancel setup
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {!status.hasPassword && (
                    <div className="space-y-3 text-sm text-repixl-muted">
                      <p>You currently sign in with Google. Set a RePXL password before changing two-factor authentication.</p>
                      <Link href="/account/security/password" className="inline-block underline">Set Password</Link>
                    </div>
                  )}
                  {pendingAction && status.hasPassword && (
                    <form onSubmit={verifyPassword} aria-labelledby="mfa-verify-heading" className="space-y-3 rounded border border-repixl-muted/30 p-4">
                      <h4 id="mfa-verify-heading" className="font-medium">VERIFY YOUR IDENTITY</h4>
                      <p className="text-sm text-repixl-muted">For your security, enter your current password to continue.</p>
                      <label className="block text-sm" htmlFor="mfa-password">
                        Current password
                        <input id="mfa-password" type="password" autoComplete="current-password" autoFocus
                          value={password} onChange={(event) => setPassword(event.target.value)}
                          disabled={busy} required className={input} />
                      </label>
                      <button disabled={busy || !password} className="rounded bg-repixl-red px-4 py-2 text-sm text-white disabled:opacity-50">
                        {busy ? 'Verifying…' : 'Verify'}
                      </button>
                      <button type="button" disabled={busy} onClick={() => { setPendingAction(null); setPassword('') }} className="ml-4 text-sm underline">Cancel</button>
                    </form>
                  )}
                  {status.enabled ? (
                    <>
                      <p className="text-sm text-repixl-muted">
                        {status.recoveryRemaining} recovery codes remaining.{' '}
                        {status.recoveryAcknowledged
                          ? ''
                          : 'Recovery codes have not been acknowledged. Regenerate if you did not save them.'}
                      </p>
                      {recovery ? (
                        <label className="block text-sm" htmlFor="mfa-manage-code">Unused recovery code
                          <input id="mfa-manage-code" value={code} onChange={(event) => setCode(event.target.value)} className={input} maxLength={128} />
                        </label>
                      ) : <OtpInput value={code} onChange={setCode} disabled={busy} error={!!error} ariaLabel="6-digit authenticator code" />}
                      <button type="button" className="text-sm underline" onClick={() => { setRecovery(!recovery); setCode('') }}>
                        {recovery ? 'Use authenticator instead' : 'Use a recovery code'}
                      </button>
                      <p className="text-xs text-repixl-muted">
                        Wait for a new authenticator code if you just used one
                        to sign in. Regenerating invalidates all previous
                        recovery codes and signs out other sessions.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <button
                          disabled={busy || !!pendingAction || !status.hasPassword || (recovery ? !code : !/^\d{6}$/.test(code))}
                          onClick={() => requestAction('regenerate')}
                          className="rounded bg-repixl-red px-4 py-2 text-sm text-white disabled:opacity-50"
                        >
                          Regenerate recovery codes
                        </button>
                        <button
                          disabled={busy || !!pendingAction || !status.hasPassword || (recovery ? !code : !/^\d{6}$/.test(code))}
                          onClick={() => {
                            if (
                              window.confirm(
                                'Disable two-factor authentication for your account?'
                              )
                            )
                              requestAction('disable')
                          }}
                          className="rounded border border-repixl-muted/30 bg-repixl-charcoal px-4 py-2 text-sm font-medium text-repixl-text-light disabled:opacity-50 hover:border-red-500/40 hover:text-red-400 transition-colors"
                        >
                          Disable MFA
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      disabled={busy || !!pendingAction || !status.hasPassword}
                      onClick={() => requestAction('begin')}
                      className="rounded bg-repixl-red px-4 py-2 text-sm text-white disabled:opacity-50"
                    >
                      {status.setupPending
                        ? 'Restart setup'
                        : 'Set up authenticator'}
                    </button>
                  )}
                </>
              )}
            </>
          )}
          <p className="text-xs text-repixl-muted">
            If you lose your authenticator, sign in with a recovery code. If
            both are lost, contact support. Email access or a password reset
            alone cannot disable MFA.
          </p>
        </>
      )}
    </section>
  )
}
