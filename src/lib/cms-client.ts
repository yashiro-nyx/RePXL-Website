'use client'

let cmsInFlight: Promise<any> | null = null
let cmsCachedData: any = null

export async function fetchHomepageCmsBlocks(): Promise<any> {
  if (cmsCachedData) return cmsCachedData
  if (cmsInFlight) return cmsInFlight

  cmsInFlight = fetch('/api/cms/homepage')
    .then((res) => (res.ok ? res.json() : null))
    .then((body) => {
      cmsCachedData = body
      return body
    })
    .catch(() => null)
    .finally(() => {
      cmsInFlight = null
    })

  return cmsInFlight
}

