'use client'

/**
 * PHAddressSelect — Cascading Philippine address dropdowns
 *
 * Renders: Region → Province → City/Municipality → Barangay
 * Each step only activates once its parent has a value.
 * Changing a parent resets all children downstream.
 *
 * Data source: @aivangogh/ph-address (PSGC-based)
 *
 * Usage:
 *   <PHAddressSelect value={addr} onChange={setAddr} errors={errors} />
 *
 * The `value` / `onChange` contract:
 *   {
 *     region: string        (region name)
 *     province: string      (province name)
 *     city: string          (city/municipality name)
 *     barangay: string      (barangay name)
 *     regionCode: string    (psgcCode for region)
 *     provinceCode: string  (psgcCode for province)
 *     cityCode: string      (psgcCode for city/municipality)
 *   }
 */

import { useMemo } from 'react'
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
  /** Tailwind class applied to each <select> wrapper */
  className?: string
  /** Whether all dropdowns are disabled (e.g. while submitting) */
  disabled?: boolean
}

function selectClass(error?: string, disabled?: boolean) {
  return `w-full rounded-xl border px-4 py-3 text-sm text-repixl-text-light focus:outline-none transition-colors appearance-none bg-no-repeat bg-right pr-8 ${
    disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
  } ${
    error
      ? 'border-red-400/60 bg-red-400/5 focus:border-red-400'
      : 'border-repixl-muted/15 bg-repixl-charcoal/60 focus:border-repixl-muted/40 focus:bg-repixl-charcoal'
  }`
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400" role="alert">
      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
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
        {/* Chevron icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14" height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-repixl-muted/60"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
      <FieldError msg={error} />
    </div>
  )
}

export function PHAddressSelect({
  value,
  onChange,
  errors = {},
  className = '',
  disabled = false,
}: PHAddressSelectProps) {
  const regions = useMemo(() => getAllRegions(), [])

  const provinces = useMemo(() => {
    if (!value.regionCode) return []
    return getProvincesByRegion(value.regionCode)
  }, [value.regionCode])

  const cities = useMemo(() => {
    if (!value.provinceCode) return []
    return getMunicipalitiesByProvince(value.provinceCode)
  }, [value.provinceCode])

  const barangays = useMemo(() => {
    if (!value.cityCode) return []
    return getBarangaysByMunicipality(value.cityCode)
  }, [value.cityCode])

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
      // Reset downstream
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
      // Reset downstream
      barangay: '',
    })
  }

  const handleBarangayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const bgy = barangays.find((b) => b.psgcCode === e.target.value)
    onChange({ ...value, barangay: bgy?.name ?? '' })
  }

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

      {/* Province */}
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

      {/* Barangay */}
      <SelectWrapper label="Barangay" htmlFor="ph-barangay" error={errors.barangay}>
        <select
          id="ph-barangay"
          value={barangays.find((b) => b.name === value.barangay)?.psgcCode ?? ''}
          onChange={handleBarangayChange}
          disabled={disabled || !value.cityCode}
          className={selectClass(errors.barangay, disabled || !value.cityCode)}
        >
          <option value="">— Select Barangay —</option>
          {barangays.map((b) => (
            <option key={b.psgcCode} value={b.psgcCode}>{b.name}</option>
          ))}
        </select>
      </SelectWrapper>
    </div>
  )
}
