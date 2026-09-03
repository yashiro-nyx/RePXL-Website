'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { formatPrice } from '@/lib/format'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShippingOption {
  name: string
  cost: number
}

interface PaymentOption {
  key: string
  label: string
  enabled: boolean
}

interface PlatformSettings {
  currency: string
  shippingOptions: ShippingOption[]
  paymentOptions: PaymentOption[]
}

type Msg = { type: 'success' | 'error'; text: string } | null

// ─── Constants ────────────────────────────────────────────────────────────────

const SUPPORTED_CURRENCIES = [
  { code: 'PHP', label: 'Philippine Peso (PHP)' },
  { code: 'USD', label: 'US Dollar (USD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'GBP', label: 'British Pound (GBP)' },
  { code: 'JPY', label: 'Japanese Yen (JPY)' },
  { code: 'AUD', label: 'Australian Dollar (AUD)' },
  { code: 'SGD', label: 'Singapore Dollar (SGD)' },
]

// ─── Shared classes ───────────────────────────────────────────────────────────

const iClass =
  'w-full rounded-xl border border-repixl-muted/20 bg-repixl-bg px-4 py-2.5 text-sm text-repixl-text-light placeholder:text-repixl-muted focus:border-repixl-red/30 focus:bg-repixl-charcoal focus:outline-none focus:ring-1 focus:ring-repixl-red/20 disabled:cursor-not-allowed disabled:opacity-50'

// ─── Inline message ───────────────────────────────────────────────────────────

function InlineMsg({ msg }: { msg: Msg }) {
  if (!msg) return null
  return (
    <p
      className={`mt-2 text-xs ${msg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}
    >
      {msg.text}
    </p>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-6 shadow-sm">
      <h2 className="mb-4 font-bold text-repixl-text-light">{title}</h2>
      {children}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  // ── Auth store (profile / password) ──────────────────────────────────────
  const { firstName, lastName, userEmail, userPhone, hydrate, updateProfile, changePassword } =
    useAuthStore()
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [pwError, setPwError] = useState('')
  const [fName, setFName] = useState('')
  const [lName, setLName] = useState('')
  const [phone, setPhone] = useState('')
  const [profileMsg, setProfileMsg] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  useEffect(() => {
    setFName(firstName)
    setLName(lastName)
    setPhone(userPhone)
  }, [firstName, lastName, userPhone])

  // ── Platform settings state ───────────────────────────────────────────────
  const [settings, setSettings] = useState<PlatformSettings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  // Currency
  const [currency, setCurrency] = useState('PHP')
  const [currencyMsg, setCurrencyMsg] = useState<Msg>(null)
  const [currencySaving, setCurrencySaving] = useState(false)

  // Shipping — list + add-form
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([])
  const [newShipName, setNewShipName] = useState('')
  const [newShipCost, setNewShipCost] = useState('')
  const [shipMsg, setShipMsg] = useState<Msg>(null)
  const [shipSaving, setShipSaving] = useState(false)
  const [shipErrors, setShipErrors] = useState<{ name?: string; cost?: string }>({})
  const [deleteShipIndex, setDeleteShipIndex] = useState<number | null>(null)

  // Payment
  const [paymentOptions, setPaymentOptions] = useState<PaymentOption[]>([])
  const [paymentMsg, setPaymentMsg] = useState<Msg>(null)
  const [paymentSaving, setPaymentSaving] = useState(false)

  // ── Load settings ─────────────────────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    setSettingsLoading(true)
    try {
      const res = await fetch('/api/admin/settings', { credentials: 'include' })
      const body = await res.json()
      if (res.ok && body.data) {
        const s: PlatformSettings = body.data
        setSettings(s)
        setCurrency(s.currency)
        setShippingOptions(s.shippingOptions ?? [])
        setPaymentOptions(s.paymentOptions ?? [])
      }
    } catch {
      // settings will remain null, handled below
    }
    setSettingsLoading(false)
  }, [])

  // Load the admin's own isSuperAdmin flag via GET /api/auth/me
  const loadAdminRole = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      const body = await res.json()
      setIsSuperAdmin(body?.data?.isSuperAdmin === true)
    } catch {
      setIsSuperAdmin(false)
    }
  }, [])

  useEffect(() => {
    void loadSettings()
    void loadAdminRole()
  }, [loadSettings, loadAdminRole])

  // ── Currency save ─────────────────────────────────────────────────────────
  const handleCurrencySave = async () => {
    setCurrencyMsg(null)
    setCurrencySaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency }),
      })
      const body = await res.json()
      if (res.ok) {
        setCurrencyMsg({ type: 'success', text: 'Currency saved.' })
        if (body.data) setSettings(body.data)
      } else {
        // Retain previous value on failure (Req 7.9)
        setCurrency(settings?.currency ?? 'PHP')
        setCurrencyMsg({ type: 'error', text: body.error ?? 'Could not save currency.' })
      }
    } catch {
      setCurrency(settings?.currency ?? 'PHP')
      setCurrencyMsg({ type: 'error', text: 'Could not save currency.' })
    }
    setCurrencySaving(false)
  }

  // ── Add shipping option ───────────────────────────────────────────────────
  const handleAddShipping = async (e: React.FormEvent) => {
    e.preventDefault()
    setShipMsg(null)
    setShipErrors({})

    // Client-side pre-validation to give immediate feedback
    const errs: { name?: string; cost?: string } = {}
    const trimmedName = newShipName.trim()
    const costNum = parseFloat(newShipCost)

    if (!trimmedName || trimmedName.length > 60) {
      errs.name = trimmedName
        ? 'Name must be 1–60 characters'
        : 'Name is required'
    }
    if (shippingOptions.some((o) => o.name === trimmedName)) {
      errs.name = 'A shipping option with this name already exists'
    }
    if (isNaN(costNum) || costNum < 0 || costNum > 999_999.99) {
      errs.cost = 'Cost must be from 0.00 to 999,999.99'
    }
    if (Object.keys(errs).length > 0) {
      setShipErrors(errs)
      return
    }

    setShipSaving(true)
    const next = [...shippingOptions, { name: trimmedName, cost: costNum }]
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shippingOptions: next }),
      })
      const body = await res.json()
      if (res.ok) {
        setShipMsg({ type: 'success', text: `"${trimmedName}" added.` })
        setShippingOptions(body.data?.shippingOptions ?? next)
        setNewShipName('')
        setNewShipCost('')
      } else {
        // Retain entered values on failure (Req 7.5, 7.6, 7.9)
        const errText = body.error ?? 'Could not save shipping option.'
        if (errText.toLowerCase().includes('name')) {
          setShipErrors({ name: errText })
        } else if (errText.toLowerCase().includes('cost')) {
          setShipErrors({ cost: errText })
        } else {
          setShipMsg({ type: 'error', text: errText })
        }
      }
    } catch {
      setShipMsg({ type: 'error', text: 'Could not save shipping option.' })
    }
    setShipSaving(false)
  }

  // ── Delete shipping option ────────────────────────────────────────────────
  const handleDeleteShipping = async (index: number) => {
    setShipMsg(null)
    const next = shippingOptions.filter((_, i) => i !== index)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shippingOptions: next }),
      })
      const body = await res.json()
      if (res.ok) {
        setShippingOptions(body.data?.shippingOptions ?? next)
        setShipMsg({ type: 'success', text: 'Shipping option removed.' })
      } else {
        setShipMsg({ type: 'error', text: body.error ?? 'Could not remove shipping option.' })
      }
    } catch {
      setShipMsg({ type: 'error', text: 'Could not remove shipping option.' })
    }
    setDeleteShipIndex(null)
  }

  // ── Toggle payment option ─────────────────────────────────────────────────
  const handleTogglePayment = async (key: string, enabled: boolean) => {
    setPaymentMsg(null)
    setPaymentSaving(true)
    const next = paymentOptions.map((o) => (o.key === key ? { ...o, enabled } : o))
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentOptions: next }),
      })
      const body = await res.json()
      if (res.ok) {
        setPaymentOptions(body.data?.paymentOptions ?? next)
        setPaymentMsg({ type: 'success', text: 'Payment options saved.' })
        setTimeout(() => setPaymentMsg(null), 3000)
      } else {
        // Retain previous value on failure (Req 7.9)
        setPaymentMsg({ type: 'error', text: body.error ?? 'Could not save payment options.' })
      }
    } catch {
      setPaymentMsg({ type: 'error', text: 'Could not save payment options.' })
    }
    setPaymentSaving(false)
  }

  // ── Profile / password handlers ───────────────────────────────────────────
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')
    setPwMsg('')
    if (!currentPw.trim()) { setPwError('Enter your current password.'); return }
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters.'); return }
    if (!/[A-Z]/.test(newPw)) { setPwError('New password must contain at least one uppercase letter.'); return }
    if (!/\d/.test(newPw)) { setPwError('New password must contain at least one number.'); return }
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return }
    setPwLoading(true)
    const success = await changePassword(currentPw, newPw)
    setPwLoading(false)
    if (!success) { setPwError('Current password is incorrect.'); return }
    setPwMsg('Password updated successfully.')
    setCurrentPw(''); setNewPw(''); setConfirmPw('')
    setTimeout(() => setPwMsg(''), 3000)
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileMsg('')
    if (!fName.trim() || !lName.trim()) { setProfileMsg('Name fields are required.'); return }
    setProfileLoading(true)
    await updateProfile(fName.trim(), lName.trim(), userEmail, phone.trim())
    setProfileLoading(false)
    setProfileMsg('Profile updated.')
    setTimeout(() => setProfileMsg(''), 3000)
  }

  // ── Computed ──────────────────────────────────────────────────────────────
  const noPaymentEnabled = paymentOptions.length > 0 && paymentOptions.every((o) => !o.enabled)
  const readonly = !isSuperAdmin

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-repixl-text-light">Security &amp; Settings</h1>
        <p className="mt-0.5 text-sm text-repixl-muted">
          Manage your admin account security, profile, and platform-wide configuration.
        </p>
      </div>

      {/* ── Platform settings ───────────────────────────────────────────── */}
      <div>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-lg font-bold text-repixl-text-light">Platform Settings</h2>
          {readonly && (
            <span className="rounded-full border border-repixl-muted/30 bg-repixl-muted/10 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-repixl-muted">
              Read-only — Super Admin required
            </span>
          )}
        </div>

        {/* Checkout-unavailable warning (Req 7.7) */}
        {!settingsLoading && noPaymentEnabled && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <span className="mt-0.5 text-amber-400">⚠</span>
            <p className="text-sm text-amber-300">
              <span className="font-semibold">Checkout unavailable.</span> No payment options are
              currently enabled. Customers will not be able to complete a purchase until at least
              one payment method is enabled.
            </p>
          </div>
        )}

        {settingsLoading ? (
          <p className="text-sm text-repixl-muted">Loading platform settings…</p>
        ) : settings === null ? (
          <p className="text-sm text-red-400">Failed to load platform settings.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* Currency */}
            <SectionCard title="Currency">
              <p className="mb-3 text-xs text-repixl-muted">
                All storefront monetary amounts will display in this currency.
              </p>
              <div>
                <label className="mb-1 block text-xs font-medium text-repixl-muted">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  disabled={readonly || currencySaving}
                  className={iClass}
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              {!readonly && (
                <button
                  onClick={handleCurrencySave}
                  disabled={currencySaving}
                  className="mt-4 rounded-xl bg-repixl-red px-5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {currencySaving ? 'Saving…' : 'Save Currency'}
                </button>
              )}
              <InlineMsg msg={currencyMsg} />
            </SectionCard>

            {/* Shipping options */}
            <SectionCard title="Shipping Options">
              <p className="mb-3 text-xs text-repixl-muted">
                Options offered during checkout. Each requires a unique name and a cost from
                ₱0.00 to ₱999,999.99.
              </p>

              {/* Existing options */}
              {shippingOptions.length === 0 ? (
                <p className="mb-3 text-xs text-repixl-muted">No shipping options configured.</p>
              ) : (
                <ul className="mb-4 divide-y divide-repixl-muted/10 rounded-xl border border-repixl-muted/20 bg-repixl-bg">
                  {shippingOptions.map((opt, i) => (
                    <li key={i} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-repixl-text-light">{opt.name}</p>
                        <p className="font-mono text-[10px] text-repixl-muted">
                          {formatPrice(opt.cost)}
                        </p>
                      </div>
                      {!readonly && (
                        <button
                          onClick={() => setDeleteShipIndex(i)}
                          aria-label={`Remove ${opt.name}`}
                          className="rounded-lg bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20"
                        >
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {/* Add form */}
              {!readonly && (
                <form onSubmit={handleAddShipping} noValidate className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-repixl-muted">
                      Option name (1–60 chars)
                    </label>
                    <input
                      type="text"
                      value={newShipName}
                      onChange={(e) => setNewShipName(e.target.value)}
                      maxLength={60}
                      placeholder="e.g. Standard Delivery"
                      className={iClass}
                    />
                    {shipErrors.name && (
                      <p className="mt-1 text-xs text-red-400">{shipErrors.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-repixl-muted">
                      Cost (0.00–999,999.99)
                    </label>
                    <input
                      type="number"
                      value={newShipCost}
                      onChange={(e) => setNewShipCost(e.target.value)}
                      min="0"
                      max="999999.99"
                      step="0.01"
                      placeholder="0.00"
                      className={iClass}
                    />
                    {shipErrors.cost && (
                      <p className="mt-1 text-xs text-red-400">{shipErrors.cost}</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={shipSaving}
                    className="rounded-xl bg-repixl-red px-5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {shipSaving ? 'Adding…' : '+ Add Shipping Option'}
                  </button>
                </form>
              )}
              <InlineMsg msg={shipMsg} />
            </SectionCard>

            {/* Payment options */}
            <SectionCard title="Payment Options">
              <p className="mb-3 text-xs text-repixl-muted">
                Disabled payment methods will be excluded from checkout.
              </p>

              {paymentOptions.length === 0 ? (
                <p className="text-xs text-repixl-muted">No payment options configured.</p>
              ) : (
                <ul className="space-y-2">
                  {paymentOptions.map((opt) => (
                    <li
                      key={opt.key}
                      className="flex items-center justify-between rounded-xl border border-repixl-muted/15 bg-repixl-bg px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-repixl-text-light">{opt.label}</p>
                        <p className="font-mono text-[10px] text-repixl-muted">{opt.key}</p>
                      </div>
                      <button
                        role="switch"
                        aria-checked={opt.enabled}
                        aria-label={`${opt.enabled ? 'Disable' : 'Enable'} ${opt.label}`}
                        onClick={() => !readonly && handleTogglePayment(opt.key, !opt.enabled)}
                        disabled={readonly || paymentSaving}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-repixl-red/40 focus:ring-offset-1 focus:ring-offset-repixl-charcoal disabled:cursor-not-allowed disabled:opacity-50 ${
                          opt.enabled ? 'bg-emerald-600' : 'bg-repixl-muted/30'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            opt.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <InlineMsg msg={paymentMsg} />
            </SectionCard>
          </div>
        )}
      </div>

      {/* ── Account settings ────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-repixl-text-light">Account Settings</h2>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Security */}
          <div className="rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-6 shadow-sm">
            <h3 className="font-bold text-repixl-text-light">Change Password</h3>
            <form onSubmit={handlePasswordChange} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-repixl-muted">Current Password</label>
                <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} autoComplete="current-password" className={iClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-repixl-muted">New Password</label>
                <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" className={iClass} />
                <p className="mt-1 text-[10px] text-repixl-muted">Minimum 8 characters, 1 uppercase, 1 number</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-repixl-muted">Confirm New Password</label>
                <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} autoComplete="new-password" className={iClass} />
              </div>
              {pwError && <p className="text-xs text-red-400">{pwError}</p>}
              {pwMsg && <p className="text-xs text-repixl-success">{pwMsg}</p>}
              <button type="submit" disabled={pwLoading} className="rounded-xl bg-repixl-red px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
                {pwLoading ? 'Updating…' : 'Update Password'}
              </button>
            </form>

            <div className="mt-6 border-t border-repixl-muted/10 pt-5">
              <h4 className="font-semibold text-repixl-text-light">Recent Account Activity</h4>
              <dl className="mt-3 space-y-2">
                {[['Last Login', 'Today'], ['Role', 'Admin'], ['Status', 'Active']].map(([k, v]) => (
                  <div key={k} className="flex justify-between rounded-lg px-3 py-2 hover:bg-repixl-bg">
                    <dt className="text-xs text-repixl-muted">{k}</dt>
                    <dd className="text-xs font-medium text-repixl-text-light/80">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* Profile */}
          <div className="rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-6 shadow-sm">
            <h3 className="font-bold text-repixl-text-light">Profile Settings</h3>
            <form onSubmit={handleProfileUpdate} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-repixl-muted">Email</label>
                <input type="email" value={userEmail} disabled className={`${iClass} cursor-not-allowed opacity-60`} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-repixl-muted">First Name</label>
                <input type="text" value={fName} onChange={(e) => setFName(e.target.value)} className={iClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-repixl-muted">Last Name</label>
                <input type="text" value={lName} onChange={(e) => setLName(e.target.value)} className={iClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-repixl-muted">Phone Number</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={iClass} />
              </div>
              {profileMsg && (
                <p className={`text-xs ${profileMsg === 'Profile updated.' ? 'text-repixl-success' : 'text-red-400'}`}>{profileMsg}</p>
              )}
              <button type="submit" disabled={profileLoading} className="rounded-xl bg-repixl-red px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
                {profileLoading ? 'Saving…' : 'Update Profile'}
              </button>
            </form>

            <div className="mt-6 border-t border-repixl-muted/10 pt-5">
              <h4 className="font-semibold text-repixl-text-light">Account Information</h4>
              <dl className="mt-3 space-y-2">
                {[['Role', isSuperAdmin ? 'Super Admin' : 'Admin'], ['Email', userEmail || '—'], ['Status', 'Active']].map(([k, v]) => (
                  <div key={k} className="flex justify-between rounded-lg px-3 py-2 hover:bg-repixl-bg">
                    <dt className="text-xs text-repixl-muted">{k}</dt>
                    <dd className={`text-xs font-medium ${v === 'Active' ? 'text-repixl-success' : v === 'Admin' || v === 'Super Admin' ? 'text-repixl-red' : 'text-repixl-text-light/80'}`}>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* ── Delete-shipping confirm modal ─────────────────────────────── */}
      {deleteShipIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-80 rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-6 shadow-2xl">
            <p className="text-center font-semibold text-repixl-text-light">Remove this shipping option?</p>
            <p className="mt-1 text-center text-xs text-repixl-muted">
              &ldquo;{shippingOptions[deleteShipIndex]?.name}&rdquo; will no longer appear at checkout.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => handleDeleteShipping(deleteShipIndex)}
                className="flex-1 rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                Remove
              </button>
              <button
                onClick={() => setDeleteShipIndex(null)}
                className="flex-1 rounded-xl border border-repixl-muted/20 px-4 py-2 text-sm text-repixl-muted hover:text-repixl-text-light"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
