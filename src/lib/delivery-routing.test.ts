import { describe, it, expect } from 'vitest'
import {
  resolveDestinationCoordinates,
  getRegionalSortingFacility,
  generateDeliveryRoute,
  interpolateRoute,
  calculateDistanceKm,
  getRouteFraction,
  getEstimatedDeliveryWindow,
  REPIXL_CENTRAL_HUB,
} from './delivery-routing'

describe('Philippine Geolocation & Delivery Routing Engine', () => {
  describe('resolveDestinationCoordinates', () => {
    it('resolves exact Metro Manila cities', () => {
      const qc = resolveDestinationCoordinates('Quezon City', 'Metro Manila')
      expect(qc.name).toBe('Quezon City')
      expect(qc.region).toBe('NCR')
      expect(qc.coords[0]).toBeCloseTo(14.676, 2)

      const makati = resolveDestinationCoordinates('Makati', 'NCR')
      expect(makati.name).toBe('Makati City')
      expect(makati.region).toBe('NCR')
    })

    it('resolves provincial destinations correctly', () => {
      const cebu = resolveDestinationCoordinates('Cebu City', 'Cebu')
      expect(cebu.name).toBe('Cebu City')
      expect(cebu.region).toBe('VISAYAS')

      const davao = resolveDestinationCoordinates('Davao City', 'Davao del Sur')
      expect(davao.name).toBe('Davao City')
      expect(davao.region).toBe('MINDANAO')

      const baguio = resolveDestinationCoordinates('Baguio', 'Benguet')
      expect(baguio.name).toBe('Baguio City, Benguet')
      expect(baguio.region).toBe('LUZON')
    })

    it('gracefully falls back to default coordinates when address is unrecognized', () => {
      const fallback = resolveDestinationCoordinates('Unknown Island', 'Unknown Province')
      expect(fallback.coords).toBeDefined()
      expect(fallback.coords[0]).toBeCloseTo(14.58, 1)
      expect(fallback.region).toBe('NCR')
    })
  })

  describe('getRegionalSortingFacility', () => {
    it('selects Cebu port facility for Visayas orders', () => {
      const dest = resolveDestinationCoordinates('Cebu City', 'Cebu')
      const sorting = getRegionalSortingFacility(dest)
      expect(sorting.name).toContain('Cebu')
    })

    it('selects Davao hub for Mindanao orders', () => {
      const dest = resolveDestinationCoordinates('Davao City', 'Davao')
      const sorting = getRegionalSortingFacility(dest)
      expect(sorting.name).toContain('Davao')
    })

    it('selects North Metro hub for Quezon City orders', () => {
      const dest = resolveDestinationCoordinates('Quezon City', 'NCR')
      const sorting = getRegionalSortingFacility(dest)
      expect(sorting.name).toContain('North')
    })
  })

  describe('generateDeliveryRoute & interpolateRoute', () => {
    it('generates a valid multi-point route starting from RePXL Central Hub', () => {
      const dest = resolveDestinationCoordinates('Makati City')
      const route = generateDeliveryRoute(dest.coords)

      expect(route.length).toBeGreaterThanOrEqual(5)
      expect(route[0]).toEqual(REPIXL_CENTRAL_HUB)
      expect(route[route.length - 1]).toEqual(dest.coords)
    })

    it('smoothly interpolates along route from 0 to 1', () => {
      const dest = resolveDestinationCoordinates('Taguig')
      const route = generateDeliveryRoute(dest.coords)

      const start = interpolateRoute(route, 0)
      expect(start[0]).toBeCloseTo(REPIXL_CENTRAL_HUB[0], 4)

      const mid = interpolateRoute(route, 0.5)
      expect(mid[0]).toBeGreaterThan(REPIXL_CENTRAL_HUB[0] - 1)
      expect(mid[0]).toBeLessThan(dest.coords[0] + 1)

      const end = interpolateRoute(route, 1)
      expect(end[0]).toBeCloseTo(dest.coords[0], 4)
    })
  })

  describe('calculateDistanceKm', () => {
    it('calculates realistic distance between Manila hub and Quezon City', () => {
      const qcCoords: [number, number] = [14.6760, 121.0440]
      const dist = calculateDistanceKm(REPIXL_CENTRAL_HUB, qcCoords)
      // Parañaque to QC is roughly 20–25 km
      expect(dist).toBeGreaterThan(15)
      expect(dist).toBeLessThan(35)
    })
  })

  describe('getRouteFraction & getEstimatedDeliveryWindow', () => {
    it('calculates expected progression stages', () => {
      expect(getRouteFraction('Order Placed', 25)).toBeLessThan(0.3)
      expect(getRouteFraction('In Transit', 50)).toBeGreaterThan(0.3)
      expect(getRouteFraction('Out for Delivery', 80)).toBeGreaterThan(0.7)
      expect(getRouteFraction('Delivered', 100)).toBe(1)
    })

    it('returns appropriate ETA status badges', () => {
      expect(getEstimatedDeliveryWindow('Delivered', 100).stage).toBe('DELIVERED')
      expect(getEstimatedDeliveryWindow('Out for Delivery', 75).stage).toBe('OUT_FOR_DELIVERY')
      expect(getEstimatedDeliveryWindow('In Transit', 50).stage).toBe('IN_TRANSIT')
      expect(getEstimatedDeliveryWindow('Order Placed', 25).stage).toBe('PROCESSING')
    })
  })
})

