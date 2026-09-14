/**
 * Philippine Delivery Geolocation & Routing Engine
 *
 * Provides coordinate mapping for Philippine destinations (Metro Manila and provincial hubs)
 * and generates realistic multi-waypoint transit paths starting from RePXL Central Fulfillment
 * Hub in Parañaque.
 */

export interface LatLng {
  lat: number
  lng: number
}

export type LatLngTuple = [number, number]

// RePXL Central Fulfillment Center (Near NAIA Cargo Terminal, Parañaque City)
export const REPIXL_CENTRAL_HUB: LatLngTuple = [14.4793, 121.0198]
export const REPIXL_CENTRAL_HUB_NAME = 'RePXL Central Fulfillment Hub (Parañaque)'

/**
 * Coordinate dictionary for Philippine cities and provinces.
 * Normalized to lowercase alphanumeric for robust lookup.
 */
export const PHILIPPINE_LOCATIONS: Record<string, { name: string; coords: LatLngTuple; region: 'NCR' | 'LUZON' | 'VISAYAS' | 'MINDANAO' }> = {
  // ── Metro Manila (NCR) ──────────────────────────────────────────────────────────
  'quezon city': { name: 'Quezon City', coords: [14.6760, 121.0440], region: 'NCR' },
  'qc': { name: 'Quezon City', coords: [14.6760, 121.0440], region: 'NCR' },
  'manila': { name: 'City of Manila', coords: [14.5995, 120.9842], region: 'NCR' },
  'makati': { name: 'Makati City', coords: [14.5547, 121.0244], region: 'NCR' },
  'taguig': { name: 'Taguig (BGC)', coords: [14.5463, 121.0543], region: 'NCR' },
  'bgc': { name: 'Bonifacio Global City', coords: [14.5463, 121.0543], region: 'NCR' },
  'pasig': { name: 'Pasig City', coords: [14.5764, 121.0851], region: 'NCR' },
  'mandaluyong': { name: 'Mandaluyong City', coords: [14.5794, 121.0359], region: 'NCR' },
  'san juan': { name: 'San Juan City', coords: [14.6019, 121.0355], region: 'NCR' },
  'paranaque': { name: 'Parañaque City', coords: [14.4793, 121.0198], region: 'NCR' },
  'pasay': { name: 'Pasay City', coords: [14.5378, 121.0014], region: 'NCR' },
  'las pinas': { name: 'Las Piñas City', coords: [14.4445, 120.9939], region: 'NCR' },
  'muntinlupa': { name: 'Muntinlupa City', coords: [14.4081, 121.0415], region: 'NCR' },
  'alabang': { name: 'Alabang, Muntinlupa', coords: [14.4230, 121.0450], region: 'NCR' },
  'marikina': { name: 'Marikina City', coords: [14.6507, 121.1029], region: 'NCR' },
  'caloocan': { name: 'Caloocan City', coords: [14.6570, 120.9841], region: 'NCR' },
  'malabon': { name: 'Malabon City', coords: [14.6625, 120.9566], region: 'NCR' },
  'navotas': { name: 'Navotas City', coords: [14.6667, 120.9417], region: 'NCR' },
  'valenzuela': { name: 'Valenzuela City', coords: [14.7011, 120.9830], region: 'NCR' },
  'pateros': { name: 'Pateros', coords: [14.5454, 121.0686], region: 'NCR' },

  // ── Luzon Provinces & Cities ──────────────────────────────────────────────────
  'cavite': { name: 'Cavite Province', coords: [14.4296, 120.9367], region: 'LUZON' },
  'bacoor': { name: 'Bacoor, Cavite', coords: [14.4624, 120.9645], region: 'LUZON' },
  'imus': { name: 'Imus, Cavite', coords: [14.4296, 120.9367], region: 'LUZON' },
  'dasmarinas': { name: 'Dasmariñas, Cavite', coords: [14.3294, 120.9367], region: 'LUZON' },
  'laguna': { name: 'Laguna Province', coords: [14.2117, 121.1656], region: 'LUZON' },
  'santa rosa': { name: 'Santa Rosa, Laguna', coords: [14.3122, 121.1114], region: 'LUZON' },
  'calamba': { name: 'Calamba, Laguna', coords: [14.2117, 121.1656], region: 'LUZON' },
  'batangas': { name: 'Batangas City', coords: [13.7565, 121.0583], region: 'LUZON' },
  'lipa': { name: 'Lipa City, Batangas', coords: [13.9419, 121.1644], region: 'LUZON' },
  'rizal': { name: 'Rizal Province', coords: [14.5869, 121.1762], region: 'LUZON' },
  'antipolo': { name: 'Antipolo City', coords: [14.5869, 121.1762], region: 'LUZON' },
  'bulacan': { name: 'Bulacan Province', coords: [14.8527, 120.8160], region: 'LUZON' },
  'malolos': { name: 'Malolos, Bulacan', coords: [14.8527, 120.8160], region: 'LUZON' },
  'pampanga': { name: 'Pampanga Province', coords: [15.0286, 120.6897], region: 'LUZON' },
  'san fernando': { name: 'San Fernando, Pampanga', coords: [15.0286, 120.6897], region: 'LUZON' },
  'angeles': { name: 'Angeles City', coords: [15.1450, 120.5887], region: 'LUZON' },
  'baguio': { name: 'Baguio City, Benguet', coords: [16.4023, 120.5960], region: 'LUZON' },
  'benguet': { name: 'Benguet Province', coords: [16.4023, 120.5960], region: 'LUZON' },
  'pangasinan': { name: 'Pangasinan Province', coords: [15.9281, 120.3340], region: 'LUZON' },

  // ── Visayas ───────────────────────────────────────────────────────────────────
  'cebu': { name: 'Cebu City', coords: [10.3157, 123.8854], region: 'VISAYAS' },
  'mandaue': { name: 'Mandaue City, Cebu', coords: [10.3333, 123.9333], region: 'VISAYAS' },
  'iloilo': { name: 'Iloilo City', coords: [10.7202, 122.5621], region: 'VISAYAS' },
  'bacolod': { name: 'Bacolod City', coords: [10.6766, 122.9509], region: 'VISAYAS' },
  'tacloban': { name: 'Tacloban City', coords: [11.2433, 125.0039], region: 'VISAYAS' },

  // ── Mindanao ──────────────────────────────────────────────────────────────────
  'davao': { name: 'Davao City', coords: [7.1907, 125.4553], region: 'MINDANAO' },
  'cagayan de oro': { name: 'Cagayan de Oro City', coords: [8.4542, 124.6319], region: 'MINDANAO' },
  'general santos': { name: 'General Santos City', coords: [6.1164, 125.1716], region: 'MINDANAO' },
  'gensan': { name: 'General Santos City', coords: [6.1164, 125.1716], region: 'MINDANAO' },
}

/**
 * Normalize an address or city query string for dictionary lookup.
 */
function normalizeQuery(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Resolve destination coordinates from order shipping address fields.
 */
export function resolveDestinationCoordinates(city?: string, province?: string, fullAddress?: string): {
  name: string
  coords: LatLngTuple
  region: 'NCR' | 'LUZON' | 'VISAYAS' | 'MINDANAO'
} {
  const queries = [
    city ? normalizeQuery(city) : '',
    province ? normalizeQuery(province) : '',
    fullAddress ? normalizeQuery(fullAddress) : '',
  ].filter(Boolean)

  for (const q of queries) {
    // Exact match
    if (PHILIPPINE_LOCATIONS[q]) {
      return PHILIPPINE_LOCATIONS[q]
    }
    // Partial substring match
    for (const [key, loc] of Object.entries(PHILIPPINE_LOCATIONS)) {
      if (q.includes(key) || key.includes(q)) {
        return loc
      }
    }
  }

  // Default fallback: Metro Manila center (Mandaluyong/Pasig boundary)
  return {
    name: city || province || 'Metro Manila',
    coords: [14.5800, 121.0400],
    region: 'NCR',
  }
}

/**
 * Intermediate regional sorting hubs based on destination region and coordinates.
 */
export function getRegionalSortingFacility(destination: { coords: LatLngTuple; region: string }): {
  name: string
  coords: LatLngTuple
} {
  const [destLat] = destination.coords

  if (destination.region === 'VISAYAS') {
    return { name: 'Visayas Regional Distribution Center (Cebu Port)', coords: [10.3000, 123.9000] }
  }
  if (destination.region === 'MINDANAO') {
    return { name: 'Mindanao Cargo Sorting Hub (Davao)', coords: [7.1200, 125.6000] }
  }
  if (destLat > 14.65) {
    return { name: 'North Metro & Luzon Hub (QC North)', coords: [14.6450, 121.0350] }
  }
  if (destLat < 14.45) {
    return { name: 'South Luzon Gateway Hub (Alabang)', coords: [14.4200, 121.0300] }
  }
  return { name: 'Central NCR Sorting Facility (Pasig/BGC)', coords: [14.5650, 121.0550] }
}

/**
 * Generate a realistic multi-point delivery route between the origin hub and destination.
 */
export function generateDeliveryRoute(destinationCoords: LatLngTuple, sortingCoords?: LatLngTuple): LatLngTuple[] {
  const origin = REPIXL_CENTRAL_HUB
  const destination = destinationCoords
  const mid = sortingCoords ?? [
    (origin[0] + destination[0]) / 2,
    (origin[1] + destination[1]) / 2,
  ]

  // Generate a smooth 7-point path with realistic road curve deviations
  const points: LatLngTuple[] = [
    origin,
    [origin[0] * 0.75 + mid[0] * 0.25, origin[1] * 0.75 + mid[1] * 0.25 + 0.005],
    [origin[0] * 0.35 + mid[0] * 0.65, origin[1] * 0.35 + mid[1] * 0.65 - 0.004],
    mid,
    [mid[0] * 0.65 + destination[0] * 0.35, mid[1] * 0.65 + destination[1] * 0.35 + 0.003],
    [mid[0] * 0.25 + destination[0] * 0.75, mid[1] * 0.25 + destination[1] * 0.75 - 0.002],
    destination,
  ]

  return points
}

/**
 * Interpolate a position along a multi-point route based on fraction (0 to 1).
 */
export function interpolateRoute(route: LatLngTuple[], fraction: number): LatLngTuple {
  if (route.length === 0) return REPIXL_CENTRAL_HUB
  if (route.length === 1 || fraction <= 0) return route[0]
  if (fraction >= 1) return route[route.length - 1]

  const totalSegments = route.length - 1
  const targetDistance = fraction * totalSegments
  const segmentIndex = Math.floor(targetDistance)
  const segmentFraction = targetDistance - segmentIndex

  const start = route[Math.min(segmentIndex, route.length - 1)]
  const end = route[Math.min(segmentIndex + 1, route.length - 1)]

  return [
    start[0] + (end[0] - start[0]) * segmentFraction,
    start[1] + (end[1] - start[1]) * segmentFraction,
  ]
}

/**
 * Calculate great-circle distance between two points in kilometers.
 */
export function calculateDistanceKm(a: LatLngTuple, b: LatLngTuple): number {
  const R = 6371 // Earth radius in km
  const dLat = ((b[0] - a[0]) * Math.PI) / 180
  const dLng = ((b[1] - a[1]) * Math.PI) / 180
  const lat1 = (a[0] * Math.PI) / 180
  const lat2 = (b[0] * Math.PI) / 180

  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)

  const aComp =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng

  const c = 2 * Math.atan2(Math.sqrt(aComp), Math.sqrt(1 - aComp))
  return Math.round(R * c * 10) / 10
}

/**
 * Compute route progress fraction (0 to 1) from delivery status and percentage.
 */
export function getRouteFraction(deliveryStatus: string, trackingProgress: number): number {
  const norm = deliveryStatus.trim().toLowerCase()
  if (norm === 'delivered' || trackingProgress >= 100) return 1
  if (norm === 'out for delivery') {
    // Out for delivery is the final 70% to 95% stretch
    return 0.7 + (Math.min(trackingProgress, 95) / 100) * 0.25
  }
  if (norm === 'in transit') {
    // In transit covers 25% to 70%
    return 0.25 + (Math.min(trackingProgress, 70) / 100) * 0.45
  }
  // Order placed / processing is at origin hub
  return 0.05
}

/**
 * Get human-readable ETA summary based on progress and delivery status.
 */
export function getEstimatedDeliveryWindow(deliveryStatus: string, trackingProgress: number): {
  badge: string
  etaText: string
  stage: 'PROCESSING' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED'
} {
  const norm = deliveryStatus.trim().toLowerCase()

  if (norm === 'delivered' || trackingProgress >= 100) {
    return {
      badge: 'Package Delivered',
      etaText: 'Delivered to recipient',
      stage: 'DELIVERED',
    }
  }

  if (norm === 'out for delivery' || trackingProgress >= 75) {
    return {
      badge: 'Out for Delivery',
      etaText: 'Arriving today by 4:00 PM',
      stage: 'OUT_FOR_DELIVERY',
    }
  }

  if (norm === 'in transit' || trackingProgress >= 40) {
    return {
      badge: 'In Transit',
      etaText: 'Estimated 1–2 business days',
      stage: 'IN_TRANSIT',
    }
  }

  return {
    badge: 'Preparing Order',
    etaText: 'Preparing for dispatch at Central Hub',
    stage: 'PROCESSING',
  }
}

