'use client'

/**
 * PHAddressSelect — Cascading Philippine address dropdowns
 *
 * Renders: Region → Province → City/Municipality → Barangay
 * Each step activates only once its parent has a value.
 * Changing a parent resets all children downstream.
 *
 * Data source: @aivangogh/ph-address (PSGC-based)
 *
 * ─── NCR / no-province regions ────────────────────────────────────────────
 * NCR (National Capital Region) has no provinces in the PSGC structure.
 * When the selected region returns 0 provinces, the Province dropdown is
 * hidden and the provinceCode is automatically set to the regionCode so
 * City/Municipality populates directly from the region.
 *
 * ─── Manila City sub-districts ────────────────────────────────────────────
 * Manila City (code 1380600000) has no direct barangays — its barangays
 * live under 14 sub-district municipalities (Binondo, Ermita, etc.).
 * When a city returns 0 barangays but has sub-municipalities, the Barangay
 * dropdown is relabelled "District / Area" and populated with those
 * sub-municipalities. The user's selection is stored as the barangay value.
 *
 * ─── Value contract ────────────────────────────────────────────────────────
 *   {
 *     region: string        (region display name)
 *     province: string      (province name, or "" for NCR)
 *     city: string          (city/municipality display name)
 *     barangay: string      (barangay name — or sub-district name for Manila)
 *     regionCode: string
 *     provinceCode: string  (= regionCode for NCR)
 *     cityCode: string
 *   }
 */

import { useMemo, useEffect } from 'react'
import {
  getAllRegions,
  getProvincesByRegion,
  getMunicipalitiesByProvince,
  getBarangaysByMunicipality,
} from '@aivangogh/ph-address'

export interface PHAddressValue {
  region: string
  province: string
  city: string
  barangay: string
  regionCode: string
  provinceCode: string
  cityCode: string
}

export const emptyPHAddress: PHAddressValue = {
  region: '', province: '', city: '', barangay: '',
  regionCode: '', provinceCode: '', cityCode: '',
}

export interface PHAddressErrors {
  region?: string
  province?: string
  city?: string
  barangay?: string
}

interface PHAddressSelectProps {
  value: PHAddressValue
  onChange: (v: PHAddressValue) => void
  errors?: PHAddressErrors
  className?: string
  disabled?: boolean
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function selectClass(error?: string, disabled?: boolean) {
  return [
    'w-full rounded-xl border px-4 py-3 text-sm text-repixl-text-light',
    'focus:outline-none transition-colors appearance-none pr-10',
    disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
    error
      ? 'border-red-400/60 bg-red-400/5 focus:border-red-400'
      : 'border-repixl-muted/15 bg-repixl-charcoal/60 focus:border-repixl-muted/40 focus:bg-repixl-charcoal',
  ].join(' ')
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400" role="alert">
      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {msg}
    </p>
  )
}

function SelectWrapper({ label, htmlFor, error, children }: {
  label: string; htmlFor: string; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-repixl-text-light/70">
        {label}
      </label>
      <div className="relative">
        {children}
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-repixl-muted/60"
          aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
      <FieldError msg={error} />
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────

export function PHAddressSelect({
  value,
  onChange,
  errors = {},
  className = '',
  disabled = false,
}: PHAddressSelectProps) {
  const regions = useMemo(() => getAllRegions(), [])

  // Provinces for the selected region
  const provinces = useMemo(() => {
    if (!value.regionCode) return []
    return getProvincesByRegion(value.regionCode)
  }, [value.regionCode])

  // Whether this region has no province layer (e.g. NCR)
  const noProvinceRegion = value.regionCode !== '' && provinces.length === 0

  // Auto-set provinceCode = regionCode when region has no provinces
  useEffect(() => {
    if (noProvinceRegion && value.provinceCode !== value.regionCode) {
      onChange({ ...value, province: '', provinceCode: value.regionCode })
    }
  // Only run when the region changes or noProvinceRegion flips
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noProvinceRegion, value.regionCode])

  // Cities for the selected province (or region if no-province)
  const cities = useMemo(() => {
    if (!value.provinceCode) return []
    return getMunicipalitiesByProvince(value.provinceCode)
  }, [value.provinceCode])

  // Barangays for the selected city
  const directBarangays = useMemo(() => {
    if (!value.cityCode) return []
    return getBarangaysByMunicipality(value.cityCode)
  }, [value.cityCode])

  // For cities like Manila that have sub-municipalities instead of direct barangays
  const citySubMunis = useMemo(() => {
    if (!value.cityCode || directBarangays.length > 0) return []
    return getMunicipalitiesByProvince(value.cityCode)
  }, [value.cityCode, directBarangays.length])

  // What to show in the Barangay dropdown
  const barangayOptions = directBarangays.length > 0 ? directBarangays : citySubMunis
  const barangayLabel = citySubMunis.length > 0 && directBarangays.length === 0
    ? 'District / Area'
    : 'Barangay'

  // ── Handlers ──

  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const regionCode = e.target.value
    const region = regions.find((r) => r.psgcCode === regionCode)
    onChange({
      ...emptyPHAddress,
      region: region?.name ?? '',
      regionCode,
    })
  }

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provinceCode = e.target.value
    const province = provinces.find((p) => p.psgcCode === provinceCode)
    onChange({
      ...value,
      province: province?.name ?? '',
      provinceCode,
      city: '', cityCode: '',
      barangay: '',
    })
  }

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cityCode = e.target.value
    const city = cities.find((c) => c.psgcCode === cityCode)
    onChange({
      ...value,
      city: city?.name ?? '',
      cityCode,
      barangay: '',
    })
  }

  const handleBarangayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // barangayOptions may be barangays or sub-municipalities
    const code = e.target.value
    const bgy = directBarangays.find((b) => b.psgcCode === code)
    const subMuni = citySubMunis.find((m) => m.psgcCode === code)
    onChange({ ...value, barangay: bgy?.name ?? subMuni?.name ?? '' })
  }

  // Find the currently selected barangay/sub-muni psgcCode for the controlled select
  const selectedBgyCode = useMemo(() => {
    if (!value.barangay) return ''
    const bgy = directBarangays.find((b) => b.name === value.barangay)
    if (bgy) return bgy.psgcCode
    const sub = citySubMunis.find((m) => m.name === value.barangay)
    return sub?.psgcCode ?? ''
  }, [value.barangay, directBarangays, citySubMunis])

  // ── Render ──

  return (
    <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${className}`}>

      {/* Region */}
      <SelectWrapper label="Region" htmlFor="ph-region" error={errors.region}>
        <select
          id="ph-region"
          value={value.regionCode}
          onChange={handleRegionChange}
          disabled={disabled}
          className={selectClass(errors.region, disabled)}
        >
          <option value="">— Select Region —</option>
          {regions.map((r) => (
            <option key={r.psgcCode} value={r.psgcCode}>{r.name}</option>
          ))}
        </select>
      </SelectWrapper>

      {/* Province — hidden for no-province regions (NCR) */}
      {noProvinceRegion ? (
        /* Reserve the grid cell so layout doesn't collapse */
        <div aria-hidden="true">
          <p className="mb-1.5 text-xs font-medium text-repixl-text-light/70">Province / District</p>
          <div className={`${selectClass(undefined, true)} flex items-center text-repixl-muted/50`}>
            N/A — Not applicable for this region
          </div>
        </div>
      ) : (
        <SelectWrapper label="Province / District" htmlFor="ph-province" error={errors.province}>
          <select
            id="ph-province"
            value={value.provinceCode}
            onChange={handleProvinceChange}
            disabled={disabled || !value.regionCode}
            className={selectClass(errors.province, disabled || !value.regionCode)}
          >
            <option value="">— Select Province —</option>
            {provinces.map((p) => (
              <option key={p.psgcCode} value={p.psgcCode}>{p.name}</option>
            ))}
          </select>
        </SelectWrapper>
      )}

      {/* City / Municipality */}
      <SelectWrapper label="City / Municipality" htmlFor="ph-city" error={errors.city}>
        <select
          id="ph-city"
          value={value.cityCode}
          onChange={handleCityChange}
          disabled={disabled || !value.provinceCode}
          className={selectClass(errors.city, disabled || !value.provinceCode)}
        >
          <option value="">— Select City / Municipality —</option>
          {cities.map((c) => (
            <option key={c.psgcCode} value={c.psgcCode}>{c.name}</option>
          ))}
        </select>
      </SelectWrapper>

      {/* Barangay (or sub-district for Manila) */}
      <SelectWrapper label={barangayLabel} htmlFor="ph-barangay" error={errors.barangay}>
        <select
          id="ph-barangay"
          value={selectedBgyCode}
          onChange={handleBarangayChange}
          disabled={disabled || !value.cityCode || barangayOptions.length === 0}
          className={selectClass(errors.barangay, disabled || !value.cityCode || barangayOptions.length === 0)}
        >
          <option value="">— Select {barangayLabel} —</option>
          {barangayOptions.map((b) => (
            <option key={b.psgcCode} value={b.psgcCode}>{b.name}</option>
          ))}
        </select>
      </SelectWrapper>

    </div>
  )
}
