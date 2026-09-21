'use client'

export const CMS_BLOCKS_CACHE_TTL_MS = 30_000 // 30 seconds

let cmsInFlight: Promise<any> | null = null
let cmsCachedData: any = null
let cmsCachedTimestamp = 0

export async function fetchHomepageCmsBlocks(forceFresh = false): Promise<any> {
  const now = Date.now()
  if (!forceFresh && cmsCachedData && now - cmsCachedTimestamp < CMS_BLOCKS_CACHE_TTL_MS) {
    return cmsCachedData
  }
  if (cmsInFlight) return cmsInFlight

  cmsInFlight = fetch('/api/cms/homepage')
    .then((res) => (res.ok ? res.json() : null))
    .then((body) => {
      if (body) {
        cmsCachedData = body
        cmsCachedTimestamp = Date.now()
      }
      return body
    })
    .catch(() => null)
    .finally(() => {
      cmsInFlight = null
    })

  return cmsInFlight
}

export function clearHomepageCmsCache() {
  cmsCachedData = null
  cmsCachedTimestamp = 0
}

