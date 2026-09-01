import type { SessionUser } from './auth-helpers'

// ─── Platform Settings Library ──────────────────────────────────────────────────
//
// This module has two concerns kept deliberately separate:
//
//   1. Pure logic (validation, selectors, access control, patch merging). These
//      functions are side-effect free so they can be property-tested in isolation
//      from Prisma / I/O. See design.md "Components and Interfaces" §4.
//   2. A thin repository abstraction plus `getSettings` / `updateSettings` that
//      read and persist settings. The default repository is backed by the
//      `PlatformSetting` Prisma rows, but any `SettingsRepository` can be injected
//      (e.g. an in-memory one for tests) so the accessors and the currency
//      round-trip can be exercised without a live database.
//
// Prisma is imported lazily inside the default repository so that importing this
// module never opens a database connection.

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface ShippingOption {
  name: string
  cost: number
}

export interface PaymentOption {
  key: string
  label: string
  enabled: boolean
}

export interface PlatformSettings {
  currency: string
  shippingOptions: ShippingOption[]
  paymentOptions: PaymentOption[]
}

/** Result of a field-level validation. `errors` maps field name → message. */
export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

// ─── Constants / defaults ─────────────────────────────────────────────────────

export const SHIPPING_NAME_MIN = 1
export const SHIPPING_NAME_MAX = 60
export const SHIPPING_COST_MIN = 0
export const SHIPPING_COST_MAX = 999_999.99

/** Setting keys persisted as individual `PlatformSetting` rows. */
export const SETTING_KEYS = ['currency', 'shippingOptions', 'paymentOptions'] as const
export type SettingKey = (typeof SETTING_KEYS)[number]

/** Baseline settings used when a row is absent from the store. */
export const DEFAULT_SETTINGS: PlatformSettings = {
  currency: 'PHP',
  shippingOptions: [{ name: 'Standard', cost: 0 }],
  paymentOptions: [
    { key: 'card', label: 'Credit / Debit Card', enabled: true },
    { key: 'gcash', label: 'GCash', enabled: true },
  ],
}

/** Cache lifetime for the default (Prisma-backed) repository, in milliseconds. */
const CACHE_TTL_MS = 30_000

// ─── Errors ───────────────────────────────────────────────────────────────────

/** Thrown when a non-Super_Admin attempts to write settings (Req 7.10). */
export class SettingsAccessError extends Error {
  constructor(message = 'Only a Super_Admin may modify platform settings') {
    super(message)
    this.name = 'SettingsAccessError'
  }
}

// ─── Pure logic ─────────────────────────────────────────────────────────────────

/**
 * Req 7.3 / 7.5 / 7.6: validate a shipping option against the existing set.
 * Accepts only when the name is 1–60 characters, is not a duplicate of an
 * existing option name, and the cost is a finite number from 0.00 to
 * 999,999.99 inclusive. Reports every invalid field.
 */
export function validateShippingOption(
  option: { name: string; cost: number },
  existingOptions: readonly { name: string }[] = []
): ValidationResult {
  const errors: Record<string, string> = {}

  const name = option.name ?? ''
  const nameLengthOk = name.length >= SHIPPING_NAME_MIN && name.length <= SHIPPING_NAME_MAX
  const isDuplicate = existingOptions.some((existing) => existing.name === name)
  if (!nameLengthOk || isDuplicate) {
    errors.name = isDuplicate
      ? 'A shipping option with this name already exists'
      : `Name must be ${SHIPPING_NAME_MIN}–${SHIPPING_NAME_MAX} characters`
  }

  const cost = option.cost
  const costOk =
    typeof cost === 'number' &&
    Number.isFinite(cost) &&
    cost >= SHIPPING_COST_MIN &&
    cost <= SHIPPING_COST_MAX
  if (!costOk) {
    errors.cost = `Cost must be from ${SHIPPING_COST_MIN.toFixed(2)} to 999,999.99`
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

/**
 * Req 7.4: the payment options offered at checkout are exactly those whose
 * enabled state is true.
 */
export function enabledPaymentOptions(options: readonly PaymentOption[]): PaymentOption[] {
  return options.filter((option) => option.enabled)
}

/**
 * Req 7.7: checkout is unavailable when no payment option is enabled.
 */
export function isCheckoutUnavailable(options: readonly PaymentOption[]): boolean {
  return enabledPaymentOptions(options).length === 0
}

/**
 * Req 7.10: settings may be written only by a Super_Admin. A missing session or
 * a non-super admin is denied.
 */
export function canWriteSettings(admin: SessionUser | null | undefined): boolean {
  return Boolean(admin && admin.isSuperAdmin === true)
}

/**
 * Req 7.2: merge a partial patch onto the current settings, returning a new
 * settings object. Only keys present in the patch override the current values;
 * the inputs are not mutated. This is the pure core of the settings round-trip.
 */
export function applySettingsPatch(
  current: PlatformSettings,
  patch: Partial<PlatformSettings>
): PlatformSettings {
  return {
    currency: patch.currency ?? current.currency,
    shippingOptions: patch.shippingOptions
      ? patch.shippingOptions.map((o) => ({ ...o }))
      : current.shippingOptions.map((o) => ({ ...o })),
    paymentOptions: patch.paymentOptions
      ? patch.paymentOptions.map((o) => ({ ...o }))
      : current.paymentOptions.map((o) => ({ ...o })),
  }
}

// ─── Repository abstraction ───────────────────────────────────────────────────

/**
 * Storage boundary for platform settings. Implementations map the three setting
 * keys to persisted values. Injecting an implementation lets `getSettings` /
 * `updateSettings` run without a live database.
 */
export interface SettingsRepository {
  /** Read all persisted settings; absent keys are simply omitted. */
  getAll(): Promise<Partial<PlatformSettings>>
  /** Persist the provided keys. Keys absent from the patch are left untouched. */
  setMany(patch: Partial<PlatformSettings>): Promise<void>
}

/**
 * In-memory repository useful for tests and previews. Values are deep-copied on
 * the way in and out so callers cannot mutate stored state by reference.
 */
export function createInMemorySettingsRepository(
  initial: Partial<PlatformSettings> = {}
): SettingsRepository {
  const store: Partial<PlatformSettings> = clone(initial)
  return {
    async getAll() {
      return clone(store)
    },
    async setMany(patch) {
      if (patch.currency !== undefined) store.currency = patch.currency
      if (patch.shippingOptions !== undefined) {
        store.shippingOptions = patch.shippingOptions.map((o) => ({ ...o }))
      }
      if (patch.paymentOptions !== undefined) {
        store.paymentOptions = patch.paymentOptions.map((o) => ({ ...o }))
      }
    },
  }
}

function clone(settings: Partial<PlatformSettings>): Partial<PlatformSettings> {
  const out: Partial<PlatformSettings> = {}
  if (settings.currency !== undefined) out.currency = settings.currency
  if (settings.shippingOptions !== undefined) {
    out.shippingOptions = settings.shippingOptions.map((o) => ({ ...o }))
  }
  if (settings.paymentOptions !== undefined) {
    out.paymentOptions = settings.paymentOptions.map((o) => ({ ...o }))
  }
  return out
}

/**
 * Default repository backed by the `PlatformSetting` Prisma rows. Prisma is
 * imported lazily so that merely importing this module opens no DB connection.
 */
export const prismaSettingsRepository: SettingsRepository = {
  async getAll() {
    const { prisma } = await import('./prisma')
    const rows = await prisma.platformSetting.findMany({
      where: { key: { in: [...SETTING_KEYS] } },
    })
    const patch: Partial<PlatformSettings> = {}
    for (const row of rows) {
      if (row.key === 'currency') patch.currency = row.value as unknown as string
      else if (row.key === 'shippingOptions') {
        patch.shippingOptions = row.value as unknown as ShippingOption[]
      } else if (row.key === 'paymentOptions') {
        patch.paymentOptions = row.value as unknown as PaymentOption[]
      }
    }
    return patch
  },
  async setMany(patch) {
    const { prisma } = await import('./prisma')
    const entries = Object.entries(patch).filter(([key]) =>
      (SETTING_KEYS as readonly string[]).includes(key)
    )
    await Promise.all(
      entries.map(([key, value]) =>
        prisma.platformSetting.upsert({
          where: { key },
          create: { key, value: value as never },
          update: { value: value as never },
        })
      )
    )
  },
}

// ─── Accessors (cache + repository) ─────────────────────────────────────────────

let cache: { value: PlatformSettings; expires: number } | null = null

/** Clear the in-process settings cache. Exposed primarily for tests. */
export function clearSettingsCache(): void {
  cache = null
}

/**
 * Req 7.1: read the current platform settings, layering persisted values over
 * {@link DEFAULT_SETTINGS}. A short-lived in-process cache is used only for the
 * default (Prisma-backed) repository; injected repositories always read fresh so
 * tests stay deterministic.
 */
export async function getSettings(
  repo: SettingsRepository = prismaSettingsRepository
): Promise<PlatformSettings> {
  const useCache = repo === prismaSettingsRepository
  if (useCache && cache && Date.now() < cache.expires) {
    return cache.value
  }

  const stored = await repo.getAll()
  const settings = applySettingsPatch(DEFAULT_SETTINGS, stored)

  if (useCache) {
    cache = { value: settings, expires: Date.now() + CACHE_TTL_MS }
  }
  return settings
}

/**
 * Req 7.2 / 7.10: persist a settings patch and return the resulting settings.
 * Writes are permitted only for a Super_Admin; otherwise a
 * {@link SettingsAccessError} is thrown and nothing is persisted. On success the
 * default-repository cache is invalidated so subsequent reads reflect the change.
 */
export async function updateSettings(
  patch: Partial<PlatformSettings>,
  admin: SessionUser | null | undefined,
  repo: SettingsRepository = prismaSettingsRepository
): Promise<PlatformSettings> {
  if (!canWriteSettings(admin)) {
    throw new SettingsAccessError()
  }

  await repo.setMany(patch)

  if (repo === prismaSettingsRepository) {
    clearSettingsCache()
  }

  const stored = await repo.getAll()
  return applySettingsPatch(DEFAULT_SETTINGS, stored)
}
