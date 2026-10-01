'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui'

interface Overview {
  mfaEnabled: boolean | null
  hasPassword: boolean | null
  googleLinked: boolean
  maskedEmail: string
  error: boolean
}

/**
 * Security overview — VIEW-ONLY status plus links into the sensitive sub-pages.
 * Opening this page never asks for verification; the actual sensitive actions
 * (change/set password, enable/disable 2FA) happen on the gated sub-pages and
 * are enforced server-side. Only real, tracked data is shown — no invented
 * "last changed" timestamps.
 */
export default function SecurityOverview() {
  const [ov, setOv] = useState<Overview>({
    mfaEnabled: null,
    hasPassword: null,
    googleLinked: false,
    maskedEmail: '',
    error: false,
  })

  useEffect(() => {
    let active = true
    Promise.all([
      fetch('/api/auth/mfa', { credentials: 'include', cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((j) => (j?.data?.enabled ?? false) as boolean)
        .catch(() => null),
      fetch('/api/auth/me?scope=customer', { credentials: 'include', cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((j) => (typeof j?.data?.hasPassword === 'boolean' ? j.data.hasPassword : null))
        .catch(() => null),
      // recent-auth GET reports which methods the account can use + a masked email,
      // which tells us whether Google is linked — no extra endpoint needed.
      fetch('/api/auth/recent-auth', { credentials: 'include', cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((j) => ({ google: !!j?.data?.googleLinked, email: (j?.data?.maskedEmail as string) ?? '' }))
        .catch(() => ({ google: false, email: '' })),
    ]).then(([mfaEnabled, hasPassword, google]) => {
      if (!active) return
      setOv({
        mfaEnabled,
        hasPassword,
        googleLinked: google.google,
        maskedEmail: google.email,
        error: mfaEnabled === null,
      })
    })
    return () => {
      active = false
    }
  }, [])

  const { mfaEnabled, hasPassword, googleLinked, maskedEmail, error } = ov

  return (
    <div className="space-y-5">
      <div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">— Account security</span>
        <h1 className="mt-1 font-display text-display-sm text-repixl-text-light">Security</h1>
      </div>

      {/* ── Password ── */}
      <section className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-6">
        <h2 className="font-display text-lg text-repixl-text-light">Password</h2>
        {hasPassword === false ? (
          <>
            <p className="my-3 text-sm text-repixl-muted">
              You currently sign in with Google and don&apos;t have a RePXL password. You can set one to sign in
              with your email as well.
            </p>
            <Link href="/account/security/password">
              <Button variant="primary" size="md">Set a Password</Button>
            </Link>
          </>
        ) : (
          <>
            <p className="my-3 text-sm text-repixl-muted">
              Keep your account protected with a strong password. For your security, you&apos;ll confirm your
              identity before changing it.
            </p>
            <div className="mb-4 flex items-center gap-2">
              <span className="text-sm text-repixl-text-light/70">Password:</span>
              <span className="font-mono text-sm tracking-widest text-repixl-text-light/80" aria-label="Password is set">••••••••••</span>
            </div>
            <Link href="/account/security/password">
              <Button variant="primary" size="md">Change Password</Button>
            </Link>
          </>
        )}
      </section>

      {/* ── Two-Factor Authentication ── */}
      <section className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-6">
        <h2 className="font-display text-lg text-repixl-text-light">Two-Factor Authentication</h2>
        <div className="my-3 flex items-center gap-2">
          <span className="text-sm text-repixl-text-light/70">Status:</span>
          {error ? (
            <span className="rounded-full bg-red-500/15 px-2 py-0.5 font-mono text-[10px] text-red-400">Unavailable</span>
          ) : mfaEnabled === null ? (
            <span className="rounded-full bg-repixl-muted/10 px-2 py-0.5 font-mono text-[10px] text-repixl-muted">Loading…</span>
          ) : mfaEnabled ? (
            <span className="rounded-full bg-repixl-success/15 px-2 py-0.5 font-mono text-[10px] text-repixl-success">Enabled</span>
          ) : (
            <span className="rounded-full bg-repixl-muted/10 px-2 py-0.5 font-mono text-[10px] text-repixl-muted">Not enabled</span>
          )}
        </div>
        <p className="mb-4 text-sm text-repixl-muted">
          Add an extra layer of protection. After your password, sign-in will also ask for a code from your
          authenticator app.
        </p>
        {error ? (
          <p role="alert" className="text-sm text-red-400">Unable to load security settings. Please refresh.</p>
        ) : (
          mfaEnabled !== null && (
            <Link href="/account/security/mfa">
              <Button variant="primary" size="md">
                {mfaEnabled ? 'Manage Two-Factor Authentication' : 'Enable Two-Factor Authentication'}
              </Button>
            </Link>
          )
        )}
      </section>

      {/* ── Connected Account ── (only shown when Google is actually linked) */}
      {googleLinked && (
        <section className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-6">
          <h2 className="font-display text-lg text-repixl-text-light">Connected Account</h2>
          <p className="my-3 text-sm text-repixl-muted">
            Accounts you can use to sign in to RePXL.
          </p>
          <div className="flex items-center justify-between rounded-lg border border-repixl-muted/10 bg-repixl-bg/50 px-4 py-3">
            <div className="flex items-center gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.5-1.67 4.4-5.5 4.4A6.5 6.5 0 1 1 12 5.5c1.85 0 3.1.79 3.81 1.47l2.6-2.5C16.8 2.86 14.62 2 12 2A10 10 0 1 0 22 12c0-.67-.07-1.18-.16-1.8H12Z"/></svg>
              <div>
                <p className="text-sm font-medium text-repixl-text-light">Google</p>
                {maskedEmail && maskedEmail !== '—' && (
                  <p className="font-mono text-xs text-repixl-muted">{maskedEmail}</p>
                )}
              </div>
            </div>
            <span className="rounded-full bg-repixl-success/15 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-repixl-success">Connected</span>
          </div>
        </section>
      )}
    </div>
  )
}
