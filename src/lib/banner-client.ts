'use client'

/**
 * Client-side deduplication and in-memory cache for public banner requests.
 *
 * Prevents redundant GET /api/banners?placement=... queries when components
 * mount concurrently (e.g. Hero, DealBanner, PromoDuo on the homepage) or
 * when React Strict Mode runs effects twice in development.
 */

export const BANNER_CACHE_TTL_MS = 30_000 // 30 seconds

interface CacheEntry {
  data: any
  timestamp: number
}

const inFlight = new Map<string, Promise<any>>()
const cache = new Map<string, CacheEntry>()

export async function fetchBannersByPlacement(placement: string, forceFresh = false): Promise<any> {
  const now = Date.now()
  if (!forceFresh && cache.has(placement)) {
    const entry = cache.get(placement)!
    if (now - entry.timestamp < BANNER_CACHE_TTL_MS) {
      return entry.data
    }
  }

  if (inFlight.has(placement)) return inFlight.get(placement)

  const promise = fetch(`/api/banners?placement=${encodeURIComponent(placement)}`)
    .then((res) => (res.ok ? res.json() : null))
    .then((body) => {
      if (body) {
        cache.set(placement, { data: body, timestamp: Date.now() })
      }
      return body
    })
    .catch(() => null)
    .finally(() => {
      inFlight.delete(placement)
    })

  inFlight.set(placement, promise)
  return promise
}

export function clearBannerCache() {
  cache.clear()
}

