'use client'

// ─── API-first with localStorage fallback ───────────────────────────────────────
// Used by non-critical stores (addresses, products, cart, etc.) that can
// degrade gracefully when the API is temporarily unreachable.
//
// NOTE: Orders no longer use this utility — order history is always fetched
// directly from the API with no localStorage fallback so stale data never
// replaces authoritative PostgreSQL records.

import { ApiClientError } from '@/lib/api-client'

/**
 * Decide whether an error means "the database/API is unavailable" (→ fall back)
 * vs "the API answered with a client error" (→ propagate, do NOT fall back).
 */
export function isInfrastructureError(err: unknown): boolean {
  if (err instanceof ApiClientError) {
    // 5xx = server/DB failure → fall back. 4xx = legitimate response → propagate.
    return err.status >= 500 || err.status === 0
  }
  // TypeError from fetch (network down, DNS, CORS) → fall back.
  return true
}

/**
 * Run an API-backed function, falling back to a local implementation when the
 * API/DB is unavailable.
 *
 * The 30-second cooldown has been removed. Every call always attempts the API
 * first so a single transient failure never blocks subsequent valid requests.
 *
 * @param apiFn   The API call (throws ApiClientError on non-2xx).
 * @param localFn The localStorage implementation.
 * @param opts.mirror Optional: on API success, also run this to keep localStorage
 *                    warm as a cache (so a later offline read has fresh data).
 */
export async function withFallback<T>(
  apiFn: () => Promise<T>,
  localFn: () => T | Promise<T>,
  opts: { mirror?: (result: T) => void } = {}
): Promise<T> {
  try {
    const result = await apiFn()
    try {
      opts.mirror?.(result)
    } catch {
      /* mirroring is best-effort */
    }
    return result
  } catch (err) {
    if (isInfrastructureError(err)) {
      if (typeof console !== 'undefined') {
        console.warn('[RePXL] API unavailable — using localStorage fallback.', err)
      }
      return localFn()
    }
    // Legitimate API error (401/403/404/409/422…) — surface it.
    throw err
  }
}
