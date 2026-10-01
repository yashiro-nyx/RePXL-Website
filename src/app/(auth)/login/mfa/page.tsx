'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { setLogoutPreference } from '@/lib/browser-storage'
import { messageFromApiBody } from '@/lib/errors/client-errors'
import { OtpInput } from '@/components/ui'

export default function MfaLoginPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [recovery, setRecovery] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function verify(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        setError(response.status === 429 || response.status >= 500
          ? messageFromApiBody(result, response.status)
          : recovery ? "That recovery code isn't valid or has already been used."
            : 'The code is incorrect or expired. Enter the latest 6-digit code from your authenticator app.')
        return
      }
      setCode('')
      setLogoutPreference(false)
      await useAuthStore.getState().refreshSession()
      router.replace('/account')
    } catch {
      setError('We couldn’t verify that code. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="mx-auto min-h-screen max-w-md px-6 pb-16 pt-32 text-repixl-text-light">
      <h1 className="font-display text-3xl">Two-factor authentication</h1>
      <p className="my-4 text-sm text-repixl-muted">
        {recovery
          ? 'Enter one unused recovery code. It will work only once.'
          : 'Enter the 6-digit code from your authenticator app.'}
      </p>
      <form onSubmit={verify} className="space-y-4">
        {recovery ? (
          <>
            <label className="block text-sm" htmlFor="mfa-login-code">Recovery code</label>
            <input
              id="mfa-login-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="one-time-code"
              inputMode="text"
              maxLength={64}
              required
              className="w-full rounded border border-repixl-muted/30 bg-transparent p-3 font-mono"
            />
          </>
        ) : (
          <>
            <span className="block text-sm">Authenticator code</span>
            <OtpInput
              ariaLabel="6-digit authenticator code"
              value={code}
              onChange={setCode}
              disabled={busy}
              error={!!error}
              autoFocus
            />
          </>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}
        <button
          disabled={busy || (recovery ? !code.trim() : !/^\d{6}$/.test(code))}
          className="w-full rounded bg-repixl-red p-3 text-white disabled:opacity-50"
        >
          {busy ? 'Verifying…' : 'Verify and sign in'}
        </button>
      </form>
      <button
        onClick={() => {
          setRecovery(!recovery)
          setCode('')
          setError('')
        }}
        className="mt-4 text-sm underline"
      >
        {recovery ? 'Use authenticator instead' : 'Use a recovery code'}
      </button>
      <p className="mt-6 text-sm text-repixl-muted">
        Lost both? Contact support. Email access alone cannot remove MFA.
      </p>
      <Link href="/login" className="mt-4 block text-sm underline">
        Return to sign in
      </Link>
    </main>
  )
}
