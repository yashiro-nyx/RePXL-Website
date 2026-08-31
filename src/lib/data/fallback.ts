'use client'

// ─── API-first with localStorage fallback ───────────────────────────────────────
// Every data service tries the Postgres-backed API first. If the API/database is
// unreachable (network error, 5xx, or the app is running without a DB), we
// transparently fall back to the localStorage implementation so the UI keeps
// working. Authentication/validation errors are NOT treated as "DB down" — they
// are legitimate API responses and must propagate.

import { ApiClientError } from '@/lib/api-client'

type ApiMode = 'unknown' | 'online' | 'offline'

let apiMode: ApiMode = 'unknown'
let lastCheck = 0
// Once we detect the API is offline, avoid re-hitting it for this long. After the
// window elapses the next call will probe the API again and can flip back online.
const OFFLINE_RETRY_MS = 30 * 1000

export function getApiMode(): ApiMode {
  return apiMode
}

/** Force a mode (used by a manual health check / on successful call). */
function markOnline() {
  apiMode = 'online'
  lastCheck = Date.now()
}

function markOffline() {
  apiMode = 'offline'
  lastCheck = Date.now()
}

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
  // Skip the API entirely during the offline cooldown window.
  if (apiMode === 'offline' && Date.now() - lastCheck < OFFLINE_RETRY_MS) {
    return localFn()
  }

  try {
    const result = await apiFn()
    markOnline()
    try {
      opts.mirror?.(result)
    } catch {
      /* mirroring is best-effort */
    }
    return result
  } catch (err) {
    if (isInfrastructureError(err)) {
      markOffline()
      if (typeof console !== 'undefined') {
        console.warn('[RePXL] API unavailable — using localStorage fallback.', err)
      }
      return localFn()
    }
    // Legitimate API error (401/403/404/409/422…) — surface it.
    throw err
  }
}

