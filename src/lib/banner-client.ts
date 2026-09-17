'use client'

/**
 * Client-side deduplication and in-memory cache for public banner requests.
 *
 * Prevents redundant GET /api/banners?placement=... queries when components
 * mount concurrently (e.g. Hero, DealBanner, PromoDuo on the homepage) or
 * when React Strict Mode runs effects twice in development.
 */

const inFlight = new Map<string, Promise<any>>()
const cache = new Map<string, any>()

export async function fetchBannersByPlacement(placement: string): Promise<any> {
  if (cache.has(placement)) return cache.get(placement)
  if (inFlight.has(placement)) return inFlight.get(placement)

  const promise = fetch(`/api/banners?placement=${encodeURIComponent(placement)}`)
    .then((res) => (res.ok ? res.json() : null))
    .then((body) => {
      if (body) cache.set(placement, body)
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

