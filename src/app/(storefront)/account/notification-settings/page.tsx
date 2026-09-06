'use client'

import { useEffect, useState } from 'react'
import { Button, InlineLoader } from '@/components/ui'
import { useToastStore } from '@/stores/toastStore'

interface Prefs {
  emailOrderUpdates: boolean
  emailPromotions: boolean
  emailRepixlUpdates: boolean
  inAppOrderUpdates: boolean
  inAppPromotions: boolean
  inAppRepixlUpdates: boolean
}

const DEFAULT: Prefs = {
  emailOrderUpdates: true,
  emailPromotions: true,
  emailRepixlUpdates: true,
  inAppOrderUpdates: true,
  inAppPromotions: true,
  inAppRepixlUpdates: true,
}

export default function NotificationSettingsPage() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT)
  const [original, setOriginal] = useState<Prefs>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    fetch('/api/auth/notification-preferences', { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => {
        if (j.data) {
          setPrefs(j.data)
          setOriginal(j.data)
        }
      })
      .catch(() => addToast('Failed to load notification preferences.', 'error'))
      .finally(() => setLoading(false))
  }, [addToast])

  const toggle = (key: keyof Prefs) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }))

  const hasChanges = (Object.keys(prefs) as (keyof Prefs)[]).some((k) => prefs[k] !== original[k])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/auth/notification-preferences', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      setOriginal(prefs)
      addToast('Notification preferences saved.', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Save failed. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <InlineLoader label="Loading preferences…" className="min-h-[12rem]" />

  return (
    <div className="space-y-6">
      <div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">— Alerts &amp; updates</span>
        <h1 className="mt-1 font-display text-display-md text-repixl-text-light">Notification Settings</h1>
        <p className="mt-2 text-sm text-repixl-muted">
          Choose which notifications you receive by email and in-app. Security and
          account-critical messages are always delivered and cannot be disabled.
        </p>
      </div>

      {/* Mandatory notice */}
      <div className="flex items-start gap-3 rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-repixl-warning" aria-hidden="true">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <p className="text-xs text-repixl-text-light/70">
          <strong className="text-repixl-text-light">Mandatory messages</strong> — password reset confirmations, security alerts, MFA events, and order receipts are always sent and cannot be disabled.
        </p>
      </div>

      {/* Email preferences */}
      <PrefSection
        title="Email Notifications"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
          </svg>
        }
      >
        <PrefRow
          label="Order Updates"
          description="Shipping status, delivery confirmation, return/refund updates"
          checked={prefs.emailOrderUpdates}
          onChange={() => toggle('emailOrderUpdates')}
        />
        <PrefRow
          label="Promotions"
          description="Discount codes, flash sales, and special offers"
          checked={prefs.emailPromotions}
          onChange={() => toggle('emailPromotions')}
        />
        <PrefRow
          label="RePIXL Updates"
          description="Platform announcements, new features, and community updates"
          checked={prefs.emailRepixlUpdates}
          onChange={() => toggle('emailRepixlUpdates')}
        />
      </PrefSection>

      {/* In-app preferences */}
      <PrefSection
        title="In-App Notifications"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
          </svg>
        }
      >
        <PrefRow
          label="Order Updates"
          description="Status changes visible in your Notifications centre"
          checked={prefs.inAppOrderUpdates}
          onChange={() => toggle('inAppOrderUpdates')}
        />
        <PrefRow
          label="Promotions"
          description="In-app promotions and voucher alerts"
          checked={prefs.inAppPromotions}
          onChange={() => toggle('inAppPromotions')}
        />
        <PrefRow
          label="RePIXL Updates"
          description="Platform news and announcements"
          checked={prefs.inAppRepixlUpdates}
          onChange={() => toggle('inAppRepixlUpdates')}
        />
      </PrefSection>

      <div className="flex items-center gap-3 pt-2">
        <Button
          variant="primary"
          size="md"
          disabled={!hasChanges || saving}
          loading={saving}
          onClick={handleSave}
        >
          Save Preferences
        </Button>
        {!hasChanges && (
          <span className="text-xs text-repixl-muted">No changes to save</span>
        )}
      </div>
    </div>
  )
}

function PrefSection({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal overflow-hidden">
      <div className="flex items-center gap-2 border-b border-repixl-muted/10 px-5 py-4">
        <span className="text-repixl-muted">{icon}</span>
        <h2 className="font-display text-sm font-semibold text-repixl-text-light">{title}</h2>
      </div>
      <div className="divide-y divide-repixl-muted/10">{children}</div>
    </div>
  )
}

function PrefRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-repixl-bg/30">
      <div>
        <p className="text-sm font-medium text-repixl-text-light">{label}</p>
        <p className="mt-0.5 text-xs text-repixl-muted">{description}</p>
      </div>
      {/* Toggle switch */}
      <div className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only"
          aria-label={label}
        />
        <div
          className={`h-6 w-11 rounded-full transition-colors ${checked ? 'bg-repixl-red' : 'bg-repixl-muted/30'}`}
          aria-hidden="true"
        />
        <div
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
          aria-hidden="true"
        />
      </div>
    </label>
  )
}
