'use client'

import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui'

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
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const load = async () => {
    const response = await fetch('/api/auth/mfa', {
      cache: 'no-store',
      credentials: 'include',
    })
    const result = await response.json()
    if (!response.ok)
      throw new Error(result.error ?? 'Unable to load MFA status.')
    setStatus(result.data)
  }
  useEffect(() => {
    load().catch(() => setError('Unable to load MFA status. Please refresh.'))
  }, [])
  async function act(action: string) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/auth/mfa', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, password, code: code.trim(), saved }),
      })
      const result = await response.json()
      if (!response.ok || !result.success)
        throw new Error(result.error ?? 'Unable to update MFA.')
      setCode('')
      setPassword('')
      if (result.data.secret) setSetup(result.data)
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update MFA.')
    } finally {
      setBusy(false)
    }
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
                <div className="space-y-4">
                  <p className="text-sm">
                    Scan this QR code in your authenticator. Setup expires in
                    five minutes.
                  </p>
                  {/* QR is generated locally on the server; provisioning never goes to an external QR service. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={setup.qrCode}
                    width={256}
                    height={256}
                    alt="Authenticator setup QR code"
                    className="max-w-full rounded"
                  />
                  <p className="text-sm">
                    Manual setup key:{' '}
                    <code className="select-all break-all">{setup.secret}</code>
                  </p>
                  <label className="block text-sm" htmlFor="mfa-setup-code">
                    6-digit authenticator code
                    <input
                      id="mfa-setup-code"
                      className={input}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                    />
                  </label>
                  <button
                    disabled={busy || !/^\d{6}$/.test(code)}
                    onClick={() => act('confirm')}
                    className="rounded bg-repixl-red px-4 py-2 text-sm text-white disabled:opacity-50"
                  >
                    Verify and enable MFA
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => act('cancel')}
                    className="ml-4 text-sm underline"
                  >
                    Cancel setup
                  </button>
                </div>
              ) : (
                <>
                  {status.hasPassword ? (
                    <label className="block text-sm" htmlFor="mfa-password">
                      Confirm your current password
                      <input
                        id="mfa-password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className={input}
                      />
                    </label>
                  ) : (
                    <p className="text-sm text-repixl-muted">
                      For changes, sign in with Google within the last five
                      minutes.{' '}
                      <button
                        className="underline"
                        onClick={() =>
                          signIn('google', {
                            callbackUrl: '/login?oauth=login',
                          })
                        }
                      >
                        Sign in again with Google
                      </button>
                    </p>
                  )}
                  {status.enabled ? (
                    <>
                      <p className="text-sm text-repixl-muted">
                        {status.recoveryRemaining} recovery codes remaining.{' '}
                        {status.recoveryAcknowledged
                          ? ''
                          : 'Recovery codes have not been acknowledged. Regenerate if you did not save them.'}
                      </p>
                      <label
                        className="block text-sm"
                        htmlFor="mfa-manage-code"
                      >
                        Authenticator or unused recovery code
                        <input
                          id="mfa-manage-code"
                          value={code}
                          onChange={(event) => setCode(event.target.value)}
                          autoComplete="one-time-code"
                          className={input}
                          maxLength={128}
                        />
                      </label>
                      <p className="text-xs text-repixl-muted">
                        Wait for a new authenticator code if you just used one
                        to sign in. Regenerating invalidates all previous
                        recovery codes and signs out other sessions.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <button
                          disabled={busy || !code}
                          onClick={() => act('regenerate')}
                          className="rounded bg-repixl-red px-4 py-2 text-sm text-white disabled:opacity-50"
                        >
                          Regenerate recovery codes
                        </button>
                        <button
                          disabled={busy || !code}
                          onClick={() => {
                            if (
                              window.confirm(
                                'Disable two-factor authentication for your account?'
                              )
                            )
                              act('disable')
                          }}
                          className="rounded border border-repixl-muted/30 bg-repixl-charcoal px-4 py-2 text-sm font-medium text-repixl-text-light disabled:opacity-50 hover:border-red-500/40 hover:text-red-400 transition-colors"
                        >
                          Disable MFA
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      disabled={busy || (status.hasPassword && !password)}
                      onClick={() => act('begin')}
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
