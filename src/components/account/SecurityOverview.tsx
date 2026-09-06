'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui'

export default function SecurityOverview() {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    let active = true
    fetch('/api/auth/mfa', { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error()
        return response.json()
      })
      .then((result) => {
        if (active) setEnabled(result.data.enabled)
      })
      .catch(() => {
        if (active) setError(true)
      })
    return () => { active = false }
  }, [])
  return (
    <div className="space-y-5">
      <h1 className="font-display text-display-sm">Security</h1>

      <section className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-6">
        <h2 className="font-display text-lg">Change Password</h2>
        <p className="my-3 text-sm text-repixl-muted">
          Change your RePIXL password, or set one for your Google-only account.
        </p>
        <Link href="/account/security/password">
          <Button variant="primary" size="md">Manage password</Button>
        </Link>
      </section>

      <section className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-6">
        <h2 className="font-display text-lg">Two-Factor Authentication</h2>
        <div className="my-3 flex items-center gap-2">
          <span className="text-sm text-repixl-text-light/70">Status:</span>
          {error ? (
            <span className="rounded-full bg-red-500/15 px-2 py-0.5 font-mono text-[10px] text-red-400">Unavailable</span>
          ) : enabled === null ? (
            <span className="rounded-full bg-repixl-muted/10 px-2 py-0.5 font-mono text-[10px] text-repixl-muted">Loading…</span>
          ) : enabled ? (
            <span className="rounded-full bg-repixl-success/15 px-2 py-0.5 font-mono text-[10px] text-repixl-success">Enabled</span>
          ) : (
            <span className="rounded-full bg-repixl-muted/10 px-2 py-0.5 font-mono text-[10px] text-repixl-muted">Not enabled</span>
          )}
        </div>
        <p className="mb-4 text-sm text-repixl-muted">
          Add an authenticator code to protect password and Google sign-in.
        </p>
        {error ? (
          <p role="alert" className="text-sm text-red-400">
            Unable to load security settings. Please refresh.
          </p>
        ) : (
          enabled !== null && (
            <Link href="/account/security/mfa">
              <Button variant="primary" size="md">
                {enabled ? 'Manage 2FA' : 'Set Up 2FA'}
              </Button>
            </Link>
          )
        )}
      </section>
    </div>
  )
}
