'use client'

import { reportActionFailure } from '@/lib/action-error'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { emptyPHAddress, type PHAddressValue } from '@/components/ui/PHAddressSelect'
import { useAddressStore, type Address } from '@/stores/addressStore'
import { useFilteredInput, nameChars, digitsOnly } from '@/hooks/useFilteredInput'
import { validatePHPhone } from '@/components/ui/PhoneInput'

const PHAddressSelect = dynamic(
  () => import('@/components/ui/PHAddressSelect').then((m) => ({ default: m.PHAddressSelect })),
  { ssr: false, loading: () => <div className="h-28 animate-pulse rounded-xl bg-repixl-charcoal/40" /> }
)

export default function AddressesPanel() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  useEffect(() => {
    useAddressStore.getState().reset()
    useAddressStore.getState().hydrate().catch(() => setLoadError(true)).finally(() => setLoading(false))
  }, [])
  const addresses = useAddressStore((s) => s.addresses)
  const addAddress = useAddressStore((s) => s.addAddress)
  const updateAddress = useAddressStore((s) => s.updateAddress)
  const removeAddress = useAddressStore((s) => s.removeAddress)
  const setDefault = useAddressStore((s) => s.setDefault)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleSave = async (data: Omit<Address, 'id'>) => {
    try {
      setSaveError(null)
      try {
        if (editingId) {
          await updateAddress(editingId, data)
        } else {
          await addAddress(data)
        }
        setFormOpen(false)
        setEditingId(null)
      } catch (err) {
        setSaveError(
          err instanceof Error
            ? err.message
            : 'Failed to save address. Please try again.'
        )
      }
    } catch {
      reportActionFailure()
    }
  }

  if (loading) return <p role="status" className="text-repixl-muted">Loading addresses…</p>
  if (loadError) return <p role="alert" className="text-red-400">Unable to load addresses. Please refresh to retry.</p>

  const editingAddress = editingId ? addresses.find((a) => a.id === editingId) : undefined

  return (
    <div className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">— Delivery</span>
          <h2 className="mt-1 font-display text-lg font-semibold text-repixl-text-light">Saved Addresses</h2>
        </div>
        {!formOpen && <Button variant="secondary" size="md" onClick={() => { setEditingId(null); setFormOpen(true) }}>+ Add Address</Button>}
      </div>
      {addresses.length === 0 && !formOpen && (
        <div className="flex flex-col items-center py-8 text-center">
          <p className="text-sm text-repixl-muted">No saved addresses yet.</p>
        </div>
      )}
      {addresses.length > 0 && !formOpen && (
        <ul className="space-y-3">
          {addresses.map((addr) => (
            <li key={addr.id} className="rounded-lg border border-repixl-muted/10 bg-repixl-bg p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-repixl-text-light">{addr.fullName}</p>
                    {addr.isDefault && <span className="rounded-full bg-repixl-success/15 px-2 py-0.5 font-mono text-[9px] uppercase text-repixl-success">Default</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-repixl-text-light/60">{addr.address}, {addr.barangay}, {addr.city} {addr.postalCode}</p>
                  {addr.phone && <p className="font-mono text-[10px] text-repixl-muted">{addr.phone}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  {!addr.isDefault && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await await setDefault(addr.id)
                        } catch {
                          reportActionFailure()
                        }
                      }}
                      className="rounded-lg border border-repixl-muted/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-repixl-muted transition-colors hover:border-repixl-muted/40 hover:text-repixl-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setEditingId(addr.id); setFormOpen(true) }}
                    className="rounded-lg border border-repixl-muted/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-repixl-muted transition-colors hover:border-repixl-muted/40 hover:text-repixl-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40"
                    aria-label={`Edit address for ${addr.fullName}`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await await removeAddress(addr.id)
                      } catch {
                        reportActionFailure()
                      }
                    }}
                    className="rounded-lg border border-red-500/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-red-400/70 transition-colors hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
                    aria-label={`Delete address for ${addr.fullName}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {formOpen && (
        <AddressForm
          initial={editingAddress}
          onSave={handleSave}
          onCancel={() => { setFormOpen(false); setEditingId(null) }}
          serverError={saveError}
        />
      )}
    </div>
  )
}

function AddressForm({
  initial,
  onSave,
  onCancel,
  serverError,
}: {
  initial?: Address
  onSave: (d: Omit<Address, 'id'>) => Promise<void>
  onCancel: () => void
  serverError?: string | null
}) {
  const [fullName, setFullName] = useState(initial?.fullName ?? '')
  const [streetAddress, setStreetAddress] = useState(initial?.address ?? '')
  const [postalCode, setPostalCode] = useState(initial?.postalCode ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const nameFilter = useFilteredInput(nameChars)
  const postalFilter = useFilteredInput(digitsOnly)

  // PHAddressSelect state
  const [phAddr, setPhAddr] = useState<PHAddressValue>({
    ...emptyPHAddress,
    // Pre-fill names from existing address (codes will be empty — user must re-select)
    region: '', province: initial?.province ?? '', city: initial?.city ?? '', barangay: initial?.barangay ?? '',
    regionCode: '', provinceCode: '', cityCode: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!fullName.trim()) errs.fullName = 'Required.'
    if (!streetAddress.trim()) errs.address = 'Required.'
    // Phone is required by the server schema — enforce on client too
    if (!phone.trim()) {
      errs.phone = 'Phone number is required.'
    } else if (!validatePHPhone(phone.replace(/\D/g, ''))) {
      errs.phone = 'Enter a valid PH mobile number (09XXXXXXXXX).'
    }
    if (!phAddr.city) errs.city = 'Required.'
    // Province is only required when the region HAS provinces.
    // NCR (and any other no-province region) sets provinceCode = regionCode —
    // in that case province is correctly empty and must not be required.
    // This matches the checkout page validation logic exactly.
    const provinceRequired = phAddr.provinceCode !== phAddr.regionCode && !!phAddr.regionCode
    if (provinceRequired && !phAddr.province) errs.province = 'Required.'
    if (!phAddr.barangay) errs.barangay = 'Required.'
    if (!/^\d{4,6}$/.test(postalCode.replace(/\s/g, ''))) errs.postalCode = '4–6 digits required.'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSaving(true)
    try {
      await onSave({
        fullName: fullName.trim(),
        address: streetAddress.trim(),
        barangay: phAddr.barangay,
        city: phAddr.city,
        province: phAddr.province,
        postalCode: postalCode.trim(),
        phone: phone.trim(),
        isDefault,
        // Persist PSGC codes so checkout can re-populate the cascading dropdowns
        regionCode: phAddr.regionCode,
        provinceCode: phAddr.provinceCode,
        cityCode: phAddr.cityCode,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} noValidate className="mt-5 space-y-3 rounded-lg border border-repixl-muted/10 bg-repixl-bg p-4">
      <div>
        <label htmlFor="a-name" className="mb-1 block text-xs text-repixl-text-light/70">Full Name</label>
        <input id="a-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass(errors.fullName)} {...nameFilter} />
        {errors.fullName && <p className="mt-1 text-xs text-red-400">{errors.fullName}</p>}
      </div>
      <div>
        <label htmlFor="a-phone2" className="mb-1 block text-xs text-repixl-text-light/70">Phone Number</label>
        <PhoneInput
          id="a-phone2"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.phone}
          className="rounded-lg"
        />
      </div>
      <div>
        <label htmlFor="a-street" className="mb-1 block text-xs text-repixl-text-light/70">Street Address / House No.</label>
        <input id="a-street" type="text" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} className={inputClass(errors.address)} />
        {errors.address && <p className="mt-1 text-xs text-red-400">{errors.address}</p>}
      </div>

      {/* Cascading PH address dropdowns */}
      <PHAddressSelect
        value={phAddr}
        onChange={setPhAddr}
        errors={{
          province: errors.province,
          city: errors.city,
          barangay: errors.barangay,
        }}
      />

      <div>
        <label htmlFor="a-zip" className="mb-1 block text-xs text-repixl-text-light/70">Postal Code</label>
        <input
          id="a-zip"
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          className={inputClass(errors.postalCode)}
          {...postalFilter}
        />
        {errors.postalCode && <p className="mt-1 text-xs text-red-400">{errors.postalCode}</p>}
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="h-3.5 w-3.5 rounded border-repixl-muted/30 bg-repixl-charcoal text-repixl-red" />
        <span className="text-xs text-repixl-text-light/70">Set as default</span>
      </label>

      {/* Server-side error (e.g. validation rejection, network error) */}
      {serverError && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400" role="alert">
          {serverError}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="primary" size="md" disabled={saving} loading={saving}>
          {saving ? 'Saving…' : initial ? 'Update Address' : 'Save Address'}
        </Button>
        <Button type="button" variant="ghost" size="md" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function inputClass(error?: string): string {
  return `w-full rounded-xl border px-3 py-2.5 text-sm text-repixl-text-light placeholder:text-repixl-muted/50 focus:outline-none transition-colors ${
    error ? 'border-red-400/60 bg-red-400/5 focus:border-red-400' : 'border-repixl-muted/20 bg-repixl-bg focus:border-repixl-muted/40'
  }`
}
