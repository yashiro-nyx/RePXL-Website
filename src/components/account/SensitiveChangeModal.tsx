'use client'

import { setLogoutPreference } from '@/lib/browser-storage'
import { signOut } from 'next-auth/react'
import { useAuthStore } from '@/stores/authStore'

import { useEffect, useRef, useState } from 'react'
import { Button, PasswordInput } from '@/components/ui'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { validatePHPhone } from '@/components/ui/PhoneInput'

// ── Types ─────────────────────────────────────────────────────────────────────

export type SensitiveField = 'email' | 'phone' | 'dob'

interface SensitiveChangeModalProps {
  field: SensitiveField
  maskedCurrent: string
  /** Whether the account has a RePIXL password set.
   *  Google-only accounts (hasPassword=false) cannot change email through this flow
   *  because their Google email IS their identity anchor. */
  hasPassword: boolean
  onClose: () => void
  /** Called after the change is persisted — pass the new display value */
  onSuccess: (newValue: string) => void
}

type Step =
  | 'send-otp'       // about to send OTP to current email
  | 'enter-otp'      // OTP sent, awaiting code entry
  | 'enter-new'      // OTP verified, user enters new value (+ for email: new-email OTP)
  | 'enter-new-otp'  // (email only) OTP sent to new email, awaiting code
  | 'done'

const FIELD_LABELS: Record<SensitiveField, string> = {
  email: 'Email Address',
  phone: 'Phone Number',
  dob:   'Date of Birth',
}

const CHANGE_TYPE_MAP: Record<SensitiveField, string> = {
  email: 'CHANGE_EMAIL_VERIFY_OLD',
  phone: 'CHANGE_PHONE',
  dob:   'CHANGE_DOB',
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SensitiveChangeModal({
  field,
  maskedCurrent,
  hasPassword,
  onClose,
  onSuccess,
}: SensitiveChangeModalProps) {
  const [step, setStep]           = useState<Step>('send-otp')
  const [otp, setOtp]             = useState('')
  const [newValue, setNewValue]   = useState('')
  const [newOtp, setNewOtp]       = useState('')
  const [sentTo, setSentTo]       = useState('')
  const [newSentTo, setNewSentTo] = useState('')
  const [busy, setBusy]           = useState(false)
  const [error, setError]         = useState('')
  const [cooldown, setCooldown]   = useState(0)
  const otpRef                    = useRef<HTMLInputElement>(null)
  const newOtpRef                 = useRef<HTMLInputElement>(null)

  // Resend countdown
  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  // Auto-focus OTP fields
  useEffect(() => {
    if (step === 'enter-otp')     setTimeout(() => otpRef.current?.focus(), 50)
    if (step === 'enter-new-otp') setTimeout(() => newOtpRef.current?.focus(), 50)
  }, [step])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const sendOtp = async (isResend = false) => {
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/account/sensitive', {
        method:  'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'request_otp', changeType: CHANGE_TYPE_MAP[field] }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to send code.'); return }
      setSentTo(data.data?.sentTo ?? 'your email')
      setCooldown(60)
      setStep('enter-otp')
    } catch { setError('Network error. Please try again.') }
    finally { setBusy(false) }
  }

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp.trim())) { setError('Enter the 6-digit code.'); return }
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/account/sensitive', {
        method:  'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'verify_otp', changeType: CHANGE_TYPE_MAP[field], code: otp.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Incorrect code.'); return }
      setOtp('')
      setStep('enter-new')
    } catch { setError('Network error. Please try again.') }
    finally { setBusy(false) }
  }

  const sendNewEmailOtp = async () => {
    const trimmed = newValue.trim().toLowerCase()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter a valid email address.'); return
    }
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/account/sensitive', {
        method:  'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          action:       'request_otp',
          changeType:   'CHANGE_EMAIL_VERIFY_NEW',
          pendingEmail: trimmed,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to send code.'); return }
      setNewSentTo(data.data?.sentTo ?? trimmed)
      setCooldown(60)
      setStep('enter-new-otp')
    } catch { setError('Network error. Please try again.') }
    finally { setBusy(false) }
  }

  const verifyNewEmailOtp = async () => {
    if (!/^\d{6}$/.test(newOtp.trim())) { setError('Enter the 6-digit code.'); return }
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/account/sensitive', {
        method:  'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          action:       'verify_otp',
          changeType:   'CHANGE_EMAIL_VERIFY_NEW',
          code:         newOtp.trim(),
          pendingEmail: newValue.trim().toLowerCase(),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Incorrect code.'); return }
      // Now apply the change
      await applyChange()
    } catch { setError('Network error. Please try again.') }
    finally { setBusy(false) }
  }

  const applyChange = async () => {
    setBusy(true); setError('')
    try {
      let apiUrl: string
      let apiBody: Record<string, string>
      if (field === 'email') {
        apiUrl = '/api/account/email'
        apiBody = { newEmail: newValue.trim().toLowerCase() }
      } else if (field === 'phone') {
        apiUrl = '/api/account/phone'
        apiBody = { newPhone: newValue.replace(/\s/g, '') }
      } else {
        apiUrl = '/api/account/dob'
        apiBody = { newDob: newValue }
      }

      const res = await fetch(apiUrl, {
        method:  'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(apiBody),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to save change.'); return }

      // For email changes: set the oauth-logged-out flag in localStorage before
      // calling onSuccess. This prevents useOAuthSync from immediately restoring
      // the session from the NextAuth JWT (which still carries the old Google email).
      // The server has already cleared the repixl-session-token cookie.
      if (field === 'email' && typeof window !== 'undefined') {
        setLogoutPreference(true)
        await useAuthStore.getState().logout().catch(() => undefined)
        await signOut({ redirect: false }).catch(() => undefined)
      }

      setStep('done')
      onSuccess(newValue.trim())
    } catch { setError('Network error. Please try again.') }
    finally { setBusy(false) }
  }

  const handleSubmitNew = async () => {
    setError('')
    if (field === 'email') {
      await sendNewEmailOtp()
    } else if (field === 'phone') {
      const digits = newValue.replace(/\D/g, '')
      if (!validatePHPhone(digits)) {
        setError('Enter a valid Philippine mobile number (09XXXXXXXXX).'); return
      }
      await applyChange()
    } else {
      // DOB
      if (!newValue) { setError('Enter your date of birth.'); return }
      const d = new Date(newValue)
      if (isNaN(d.getTime()) || d >= new Date()) {
        setError('Enter a valid past date.'); return
      }
      await applyChange()
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const label = FIELD_LABELS[field]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Change ${label}`}
    >
      <div className="w-full max-w-md rounded-2xl border border-repixl-muted/10 bg-repixl-bg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-repixl-muted/10 px-6 py-4">
          <h2 className="font-display text-base font-semibold text-repixl-text-light">
            Change {label}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="rounded-lg p-1.5 text-repixl-muted transition-colors hover:text-repixl-text-light"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* ── Google-only email block ──────────────────────────────── */}
          {field === 'email' && !hasPassword ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-blue-400" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                <div>
                  <p className="text-sm font-medium text-repixl-text-light">Email managed through Google</p>
                  <p className="mt-1 text-xs text-repixl-muted">
                    Your account uses Google Sign-In. Its email is managed through Google and cannot be changed here.
                  </p>
                  <p className="mt-2 text-xs text-repixl-muted">
                    To enable email changes, set a RePIXL password first under <strong className="text-repixl-text-light/80">Security → Change Password</strong>.
                  </p>
                </div>
              </div>
              <Button variant="secondary" size="md" className="w-full" onClick={onClose}>Close</Button>
            </div>
          ) : (
            <>
          {field === 'email' && <p className="text-sm text-repixl-muted">After changing your email, sign in with your new RePIXL email and password. Google sign-in with your previous email will no longer work.</p>}
          {error && (
            <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}

          {/* ── Step: send OTP ── */}
          {step === 'send-otp' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-repixl-muted" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                <div>
                  <p className="text-sm font-medium text-repixl-text-light">Verify Your Identity</p>
                  <p className="mt-1 text-xs text-repixl-muted">
                    For your security, we'll send a verification code to your current email address before you can change your {label.toLowerCase()}.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-repixl-muted/10 bg-repixl-charcoal px-4 py-3">
                <span className="text-xs text-repixl-muted">Current {label}</span>
                <span className="font-mono text-sm text-repixl-text-light/70">{maskedCurrent}</span>
              </div>
              <Button variant="primary" size="md" className="w-full" disabled={busy} loading={busy} onClick={() => sendOtp()}>
                Send Verification Code
              </Button>
            </div>
          )}

          {/* ── Step: enter OTP (identity verification) ── */}
          {step === 'enter-otp' && (
            <div className="space-y-4">
              <p className="text-sm text-repixl-muted">
                A 6-digit code was sent to <strong className="text-repixl-text-light">{sentTo}</strong>. Enter it below.
              </p>
              <div>
                <label htmlFor="sc-otp" className="mb-1.5 block text-xs text-repixl-text-light/70">Verification Code</label>
                <input
                  ref={otpRef}
                  id="sc-otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && verifyOtp()}
                  className="w-full rounded-xl border border-repixl-muted/20 bg-repixl-charcoal px-3 py-2.5 text-center font-mono text-xl tracking-widest text-repixl-text-light focus:border-repixl-muted/40 focus:outline-none"
                  placeholder="000000"
                  autoComplete="one-time-code"
                />
                <p className="mt-1 text-[10px] text-repixl-muted/60">Code expires in 8 minutes.</p>
              </div>
              <Button variant="primary" size="md" className="w-full" disabled={busy || otp.length !== 6} loading={busy} onClick={verifyOtp}>
                Verify
              </Button>
              <button
                type="button"
                disabled={cooldown > 0 || busy}
                onClick={() => sendOtp(true)}
                className="w-full text-center text-xs text-repixl-muted transition-colors hover:text-repixl-text-light disabled:opacity-40"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </button>
            </div>
          )}

          {/* ── Step: enter new value ── */}
          {step === 'enter-new' && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-repixl-text-light">Identity verified.</p>
              <p className="text-xs text-repixl-muted">Enter your new {label.toLowerCase()}.</p>
              {field === 'email' && (
                <div>
                  <label htmlFor="sc-new-email" className="mb-1.5 block text-xs text-repixl-text-light/70">New Email Address</label>
                  <input
                    id="sc-new-email"
                    type="email"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    autoComplete="email"
                    className="w-full rounded-xl border border-repixl-muted/20 bg-repixl-charcoal px-3 py-2.5 text-sm text-repixl-text-light focus:border-repixl-muted/40 focus:outline-none"
                    placeholder="new@example.com"
                  />
                </div>
              )}
              {field === 'phone' && (
                <div>
                  <label htmlFor="sc-new-phone" className="mb-1.5 block text-xs text-repixl-text-light/70">New Phone Number</label>
                  <PhoneInput
                    id="sc-new-phone"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    autoComplete="tel"
                  />
                </div>
              )}
              {field === 'dob' && (
                <div>
                  <label htmlFor="sc-new-dob" className="mb-1.5 block text-xs text-repixl-text-light/70">New Date of Birth</label>
                  <input
                    id="sc-new-dob"
                    type="date"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    className="account-dob-input w-full rounded-xl border border-repixl-muted/20 bg-repixl-charcoal px-3 py-2.5 text-sm text-repixl-text-light focus:border-repixl-muted/40 focus:outline-none"
                  />
                </div>
              )}
              <Button variant="primary" size="md" className="w-full" disabled={busy || !newValue.trim()} loading={busy} onClick={handleSubmitNew}>
                {field === 'email' ? 'Send Confirmation to New Email' : 'Save Change'}
              </Button>
            </div>
          )}

          {/* ── Step: verify new email OTP ── */}
          {step === 'enter-new-otp' && (
            <div className="space-y-4">
              <p className="text-sm text-repixl-muted">
                A confirmation code was sent to <strong className="text-repixl-text-light">{newSentTo}</strong>. Enter it to confirm your new email.
              </p>
              <div>
                <label htmlFor="sc-new-otp" className="mb-1.5 block text-xs text-repixl-text-light/70">Confirmation Code</label>
                <input
                  ref={newOtpRef}
                  id="sc-new-otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={newOtp}
                  onChange={(e) => setNewOtp(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && verifyNewEmailOtp()}
                  className="w-full rounded-xl border border-repixl-muted/20 bg-repixl-charcoal px-3 py-2.5 text-center font-mono text-xl tracking-widest text-repixl-text-light focus:border-repixl-muted/40 focus:outline-none"
                  placeholder="000000"
                  autoComplete="one-time-code"
                />
              </div>
              <Button variant="primary" size="md" className="w-full" disabled={busy || newOtp.length !== 6} loading={busy} onClick={verifyNewEmailOtp}>
                Confirm New Email
              </Button>
              <button
                type="button"
                disabled={cooldown > 0 || busy}
                onClick={sendNewEmailOtp}
                className="w-full text-center text-xs text-repixl-muted transition-colors hover:text-repixl-text-light disabled:opacity-40"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </button>
            </div>
          )}

          {/* ── Step: done ── */}
          {step === 'done' && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-repixl-success/15">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-success" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
              </div>
              <p className="font-display text-sm font-semibold text-repixl-text-light">
                {field === 'email' ? 'Email updated. Please log in again.' : `${label} updated successfully.`}
              </p>
              <Button variant="primary" size="md" onClick={onClose}>Close</Button>
            </div>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
