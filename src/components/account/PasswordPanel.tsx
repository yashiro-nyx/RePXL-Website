'use client'

import { messageFromApiBody } from '@/lib/errors/client-errors'
import { useState, useEffect } from 'react'
import { Button, PasswordInput } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'

export default function PasswordPanel() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const changePassword = useAuthStore((s) => s.changePassword)

  // Detect whether the account has a RePXL password by calling /api/auth/me.
  // hasPassword=false means it's a Google-only account (password field is '').
  const [hasPassword, setHasPassword] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/auth/me?scope=customer', { credentials: 'include', cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error('Could not load settings'); return r.json() })
      .then((j) => { if (typeof j?.data?.hasPassword !== 'boolean') throw new Error('Could not load settings'); setHasPassword(j.data.hasPassword) })
      .catch(() => setError("We couldn't load your password settings. Please refresh the page."))
  }, [])

  const passwordRequirements = [
    { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
    { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
    { label: 'One number', test: (p: string) => /\d/.test(p) },
    { label: 'One special character (!@#$%^&*)', test: (p: string) => /[!@#$%^&*]/.test(p) },
  ]
  const allMet = passwordRequirements.every((r) => r.test(newPassword))

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!currentPassword.trim()) { setError('Enter your current password to continue.'); return }
    if (!allMet) { setError('Please choose a password that meets all the requirements below.'); return }
    if (newPassword !== confirmPassword) { setError("Your new passwords don't match."); return }
    const success = await changePassword(currentPassword, newPassword)
    if (!success) { setError('The current password you entered is incorrect.'); return }
    setSaved(true)
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    setTimeout(() => setSaved(false), 3000)
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    setError('')
    if (!allMet) { setError('Please choose a password that meets all the requirements below.'); return }
    if (newPassword !== confirmPassword) { setError("Your new passwords don't match."); return }
    setSaving(true)
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword, confirmPassword }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setSaved(true)
        setNewPassword(''); setConfirmPassword('')
        setHasPassword(true) // account now has a password
        setTimeout(() => setSaved(false), 3000)
      } else {
        setError(messageFromApiBody(data, res.status))
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (hasPassword === null) return <p role={error ? 'alert' : 'status'}>{error || 'Loading password settings…'}</p>

  return (
    <div className="space-y-4">
      <div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">— Account security</span>
        <h2 className="mt-1 font-display text-lg font-semibold text-repixl-text-light">
          {hasPassword === false ? 'Set a RePXL Password' : 'Change Password'}
        </h2>
      </div>

      {/* Google-only account notice */}
      {hasPassword === false && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
          <div className="flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0 text-blue-400" aria-hidden="true">
              <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
            </svg>
            <div>
              <p className="text-sm font-medium text-repixl-text-light">Your account uses Google Sign-In</p>
              <p className="mt-1 text-xs text-repixl-text-light/60">
                Your RePXL account is authenticated through Google. Your Google password is managed by Google and is not stored or accessed by RePXL.
              </p>
              <p className="mt-2 text-xs text-repixl-text-light/60">
                You can optionally set a separate RePXL password below. This password is completely independent from your Google account and will allow you to sign in with your email and this password in addition to Google.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-6">
        <form onSubmit={hasPassword === false ? handleSetPassword : handleChangePassword} className="space-y-4">
          {/* Only show "Current Password" for accounts that already have one */}
          {hasPassword !== false && (
            <div>
              <label htmlFor="sec-current" className="mb-1.5 block text-xs text-repixl-text-light/70">Current Password</label>
              <PasswordInput id="sec-current" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
          )}

          <div>
            <label htmlFor="sec-new" className="mb-1.5 block text-xs text-repixl-text-light/70">
              {hasPassword === false ? 'New RePXL Password' : 'New Password'}
            </label>
            <PasswordInput id="sec-new" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
              {passwordRequirements.map((req) => {
                const met = req.test(newPassword)
                return (
                  <div key={req.label} className="flex items-center gap-1.5">
                    <div className={`h-1.5 w-1.5 flex-shrink-0 rounded-full transition-colors ${met ? 'bg-repixl-success' : 'bg-repixl-muted/30'}`} />
                    <span className={`text-[10px] transition-colors ${met ? 'text-repixl-success' : 'text-repixl-muted/50'}`}>{req.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <label htmlFor="sec-confirm" className="mb-1.5 block text-xs text-repixl-text-light/70">Confirm Password</label>
            <PasswordInput id="sec-confirm" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>

          {error && <p className="text-xs text-red-400" role="alert">{error}</p>}

          <div className="flex items-center gap-3 pt-1">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={hasPassword === null || !allMet || saving}
              loading={saving}
              className={!allMet ? 'opacity-50 cursor-not-allowed' : ''}
            >
              {hasPassword === false
                ? saving ? 'Setting password…' : 'Set RePXL Password'
                : 'Update Password'}
            </Button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-repixl-success" role="status">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                {hasPassword === false ? 'Password set' : 'Updated'}
              </span>
            )}
          </div>
        </form>
      </div>

    </div>
  )
}
