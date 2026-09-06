'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/stores/toastStore'
import { useFilteredInput, nameChars } from '@/hooks/useFilteredInput'
import { maskEmail } from '@/lib/mask'
import { SensitiveChangeModal, type SensitiveField } from '@/components/account/SensitiveChangeModal'

const GENDER_OPTIONS = [
  { value: '',                  label: 'Prefer not to say' },
  { value: 'MALE',              label: 'Male' },
  { value: 'FEMALE',            label: 'Female' },
  { value: 'NON_BINARY',        label: 'Non-binary' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
]

export default function ProfilePanel() {
  const {
    firstName, lastName, userEmail, maskedPhone, maskedDob, hasPassword,
    username, gender, avatarUrl, createdAt,
    updateProfile, hydrate,
  } = useAuthStore()

  const [first, setFirst]           = useState('')
  const [last, setLast]             = useState('')
  const [usernameVal, setUsernameVal] = useState('')
  const [genderVal, setGenderVal]   = useState('')
  const [errors, setErrors]         = useState<Record<string, string>>({})
  const [saved, setSaved]           = useState(false)
  const [saving, setSaving]         = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [openModal, setOpenModal]   = useState<SensitiveField | null>(null)
  const fileInputRef                = useRef<HTMLInputElement>(null)
  const nameFilter                  = useFilteredInput(nameChars)

  useEffect(() => {
    setFirst(firstName)
    setLast(lastName)
    setUsernameVal(username ?? '')
    setGenderVal(gender ?? '')
  }, [firstName, lastName, username, gender])

  const hasChanges =
    first !== firstName ||
    last !== lastName ||
    (usernameVal || null) !== (username ?? null) ||
    (genderVal || null) !== (gender ?? null)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!first.trim()) errs.first = 'First name is required.'
    if (!last.trim()) errs.last = 'Last name is required.'
    if (usernameVal.trim() && !/^[a-z0-9_-]{3,30}$/.test(usernameVal.trim())) {
      errs.username = 'Username must be 3–30 characters: lowercase letters, numbers, _ or -'
    }
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSaving(true)
    try {
      await updateProfile(
        first.trim(),
        last.trim(),
        usernameVal.trim() || null,
        genderVal || null,
        undefined, // avatarUrl managed separately
      )
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      useToastStore.getState().addToast('Profile was not saved. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/upload/avatar', { method: 'POST', body: form, credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      await hydrate()
      useToastStore.getState().addToast('Profile photo updated.', 'success')
    } catch (err) {
      useToastStore.getState().addToast(
        err instanceof Error ? err.message : 'Upload failed. Try again.',
        'error'
      )
    } finally {
      setAvatarUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveAvatar = async () => {
    if (!window.confirm('Remove your profile photo?')) return
    setAvatarUploading(true)
    try {
      await fetch('/api/upload/avatar', { method: 'DELETE', credentials: 'include' })
      await hydrate()
      useToastStore.getState().addToast('Profile photo removed.', 'info')
    } catch {
      useToastStore.getState().addToast('Failed to remove photo.', 'error')
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleSensitiveSuccess = async (_newValue: string) => {
    // Re-hydrate to pull the new value from the server
    await hydrate()
    useToastStore.getState().addToast(
      openModal === 'email'
        ? 'Email updated. You have been logged out.'
        : openModal === 'phone'
        ? 'Phone number updated.'
        : 'Date of birth updated.',
      'success'
    )
    setOpenModal(null)
    if (openModal === 'email') {
      // Force page reload so the session (which was invalidated) is cleared
      window.location.href = '/login'
    }
  }

  const memberSince = createdAt
    ? new Date(createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—'

  return (
    <>
      <div className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-6">
        <div className="mb-6">
          <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">— Edit your info</span>
          <h2 className="mt-1 font-display text-lg font-semibold text-repixl-text-light">Profile Information</h2>
        </div>

        <form onSubmit={handleSave} noValidate>
          <div className="flex flex-col gap-8 lg:flex-row">
            {/* ── Left column ─────────────────────────────────── */}
            <div className="flex-1 space-y-5">

              {/* Username */}
              <div>
                <label htmlFor="p-username" className="mb-1.5 block text-xs text-repixl-text-light/70">
                  Username <span className="text-repixl-muted">(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 select-none font-mono text-xs text-repixl-muted/60">@</span>
                  <input
                    id="p-username"
                    type="text"
                    value={usernameVal}
                    onChange={(e) => setUsernameVal(e.target.value.toLowerCase())}
                    placeholder="your_handle"
                    autoComplete="username"
                    className={`${ic(errors.username)} pl-7`}
                    maxLength={30}
                  />
                </div>
                {errors.username && <p className="mt-1 text-xs text-red-400">{errors.username}</p>}
              </div>

              {/* First / Last name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="p-first" className="mb-1.5 block text-xs text-repixl-text-light/70">First Name</label>
                  <input id="p-first" type="text" value={first} onChange={(e) => setFirst(e.target.value)} className={ic(errors.first)} {...nameFilter} />
                  {errors.first && <p className="mt-1 text-xs text-red-400">{errors.first}</p>}
                </div>
                <div>
                  <label htmlFor="p-last" className="mb-1.5 block text-xs text-repixl-text-light/70">Last Name</label>
                  <input id="p-last" type="text" value={last} onChange={(e) => setLast(e.target.value)} className={ic(errors.last)} {...nameFilter} />
                  {errors.last && <p className="mt-1 text-xs text-red-400">{errors.last}</p>}
                </div>
              </div>

              {/* ── Sensitive fields — masked ── */}
              <SensitiveFieldRow
                label="Email Address"
                managed={!hasPassword}
                masked={maskEmail(userEmail)}
                onChangeClick={() => setOpenModal('email')}
              />
              <SensitiveFieldRow
                label="Phone Number"
                masked={maskedPhone}
                onChangeClick={() => setOpenModal('phone')}
              />

              {/* Gender */}
              <div>
                <label htmlFor="p-gender" className="mb-1.5 block text-xs text-repixl-text-light/70">
                  Gender <span className="text-repixl-muted">(optional)</span>
                </label>
                <select id="p-gender" value={genderVal} onChange={(e) => setGenderVal(e.target.value)} className={ic()}>
                  {GENDER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* ── DOB — masked ── */}
              <SensitiveFieldRow
                label="Date of Birth"
                masked={maskedDob}
                onChangeClick={() => setOpenModal('dob')}
              />

              {/* Member Since */}
              <div>
                <label className="mb-1.5 block text-xs text-repixl-text-light/70">Member Since</label>
                <p className="font-mono text-sm text-repixl-text-light/70">{memberSince}</p>
              </div>

              {/* Save */}
              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" variant="primary" size="md" disabled={!hasChanges || saving} loading={saving}>
                  Save Changes
                </Button>
                {saved && (
                  <span className="flex items-center gap-1.5 text-sm text-repixl-success" role="status">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
                    Saved
                  </span>
                )}
              </div>
            </div>

            {/* ── Right column: avatar ─────────────────────────── */}
            <div className="flex shrink-0 flex-col items-center gap-4 lg:w-48">
              <div className="relative h-28 w-28 overflow-hidden rounded-full border-2 border-repixl-muted/20 bg-repixl-bg">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="Profile photo" fill className="object-cover" sizes="112px" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-repixl-red/10">
                    <span className="font-display text-3xl font-bold text-repixl-red/70">
                      {`${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                {avatarUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-repixl-bg/60">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-repixl-red border-t-transparent" aria-label="Uploading…" />
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="sr-only"
                id="avatar-upload"
                onChange={handleAvatarChange}
                aria-label="Upload profile photo"
              />
              <Button type="button" variant="secondary" size="sm" disabled={avatarUploading} onClick={() => fileInputRef.current?.click()}>
                {avatarUrl ? 'Change Photo' : 'Upload Photo'}
              </Button>
              {avatarUrl && (
                <button type="button" onClick={handleRemoveAvatar} disabled={avatarUploading} className="text-xs text-repixl-muted transition-colors hover:text-red-400 disabled:opacity-50">
                  Remove
                </button>
              )}
              <p className="text-center font-mono text-[9px] text-repixl-muted/50">JPG, PNG or WebP · Max 5 MB</p>
            </div>
          </div>
        </form>
      </div>

      {/* Sensitive change modal */}
      {openModal && (
        <SensitiveChangeModal
          hasPassword={hasPassword}
          field={openModal}
          maskedCurrent={
            openModal === 'email' ? maskEmail(userEmail)
            : openModal === 'phone' ? maskedPhone
            : maskedDob
          }
          onClose={() => setOpenModal(null)}
          onSuccess={handleSensitiveSuccess}
        />
      )}
    </>
  )
}

// ── Sensitive field display row ───────────────────────────────────────────────

function SensitiveFieldRow({
  label,
  masked,
  onChangeClick,
  managed = false,
}: {
  label: string
  masked: string
  managed?: boolean
  onChangeClick: () => void
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs text-repixl-text-light/70">{label}</p>
      <div className="flex flex-col gap-2 rounded-xl border border-repixl-muted/15 bg-repixl-bg px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-mono text-sm text-repixl-text-light/70">{masked}</span>
        {managed ? <span className="text-sm text-repixl-muted">Managed through Google</span> : <button
          type="button"
          onClick={onChangeClick}
          className="shrink-0 rounded-lg border border-repixl-muted/20 bg-repixl-charcoal px-3 py-1.5 text-xs font-medium text-repixl-text-light transition-colors hover:border-repixl-red/40 hover:bg-repixl-red/10 hover:text-repixl-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40"
          aria-label={`Change ${label}`}
        >
          Change
        </button>}
      </div>
    </div>
  )
}

function ic(error?: string): string {
  return `w-full rounded-xl border px-3 py-2.5 text-sm text-repixl-text-light placeholder:text-repixl-muted/50 focus:outline-none transition-colors bg-repixl-bg ${
    error ? 'border-red-400/60 bg-red-400/5 focus:border-red-400' : 'border-repixl-muted/20 focus:border-repixl-muted/40'
  }`
}
