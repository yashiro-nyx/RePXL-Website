'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { setLogoutPreference } from '@/lib/browser-storage'

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
      if (!response.ok || !result.success)
        throw new Error(result.error ?? 'Unable to verify code.')
      setCode('')
      setLogoutPreference(false)
      await useAuthStore.getState().hydrate()
      router.replace('/account')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify code.')
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
        <label className="block text-sm" htmlFor="mfa-login-code">
          {recovery ? 'Recovery code' : 'Authenticator code'}
        </label>
        <input
          id="mfa-login-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          autoComplete="one-time-code"
          inputMode={recovery ? 'text' : 'numeric'}
          maxLength={recovery ? 64 : 6}
          required
          className="w-full rounded border border-repixl-muted/30 bg-transparent p-3 font-mono"
        />
        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error} If your challenge expired, sign in again.
          </p>
        )}
        <button
          disabled={busy}
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
