'use client'

/**
 * TrackingMap — delivery route visualisation using react-leaflet + OpenStreetMap.
 *
 * Always renders for non-cancelled orders:
 *  • "Order Placed" / Processing → placeholder "preparing" panel
 *  • "Out for Delivery" / Shipped → active map, vehicle marker moves along route
 *  • "Delivered"                 → map at destination, delivery confirmed
 *
 * The route is a simulated Metro Manila delivery path labelled clearly as
 * "Simulated tracking route" so customers know it is not real-time GPS.
 *
 * react-leaflet requires a browser environment — this component is always
 * loaded via next/dynamic (ssr: false) by the parent page.
 */

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// ── Simulated delivery route: Parañaque hub → Quezon City ────────────────────
const ROUTE_COORDS: [number, number][] = [
  [14.4793, 121.0198],
  [14.4870, 121.0180],
  [14.5020, 121.0155],
  [14.5200, 121.0120],
  [14.5430, 121.0198],
  [14.5720, 121.0300],
  [14.5980, 121.0350],
  [14.6200, 121.0400],
  [14.6420, 121.0450],
  [14.6760, 121.0440],
]

// Custom vehicle marker
const vehicleIcon = L.divIcon({
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  html: `<div style="
    width:36px;height:36px;
    background:#c22c2c;
    border:2px solid #f5f1ec;
    border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 2px 8px rgba(0,0,0,0.5);
  ">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/>
      <rect x="9" y="11" width="14" height="10" rx="2"/>
      <circle cx="12" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    </svg>
  </div>`,
})

const destinationIcon = L.divIcon({
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  html: `<div style="
    width:28px;height:28px;
    background:#5A6E4E;
    border:2px solid #f5f1ec;
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    box-shadow:0 2px 6px rgba(0,0,0,0.4);
  "></div>`,
})

function interpolateRoute(route: [number, number][], fraction: number): [number, number] {
  if (fraction <= 0) return route[0]
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

function MapCenterUpdater({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.panTo(center, { animate: true, duration: 1.2 })
  }, [center, map])
  return null
}

interface TrackingMapProps {
  status: string
  progress: number
}

export function TrackingMap({ status, progress }: TrackingMapProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null

  const isActive = status === 'Out for Delivery' || status === 'Delivered'

  // Show a clear placeholder while order is still being prepared
  if (!isActive) {
    return (
      <div className="mt-4 overflow-hidden rounded-2xl border border-repixl-muted/10">
        <div className="flex items-center justify-between bg-repixl-charcoal px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-repixl-muted/30" aria-hidden="true" />
            <p className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">Delivery Map</p>
          </div>
          <p className="font-mono text-[9px] text-repixl-muted/50">Simulated tracking route</p>
        </div>
        <div className="flex h-[220px] flex-col items-center justify-center gap-3 bg-repixl-bg/30">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-repixl-muted/15 bg-repixl-charcoal/60">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-muted/50" aria-hidden="true">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted/60">
            Map available once your order ships
          </p>
        </div>
      </div>
    )
  }

  // Map progress: 75–100 → route fraction 0–1
  const routeFraction = status === 'Delivered' ? 1 : Math.max(0, Math.min(1, (progress - 75) / 25))
  const markerPosition = interpolateRoute(ROUTE_COORDS, routeFraction)
  const mapCenter: [number, number] = markerPosition

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-repixl-muted/10">
      {/* Map header */}
      <div className="flex items-center justify-between bg-repixl-charcoal px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-repixl-red" aria-hidden="true" />
          <p className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">Live Delivery Map</p>
        </div>
        <p className="font-mono text-[9px] text-amber-400/70">⚠ Simulated tracking route</p>
      </div>

      {/* Map container */}
      <div style={{ height: 300 }}>
        <MapContainer
          center={mapCenter}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
          zoomControl
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Route polyline */}
          <Polyline
            positions={ROUTE_COORDS}
            pathOptions={{ color: '#c22c2c', weight: 3, opacity: 0.7, dashArray: '6 4' }}
          />

          {/* Vehicle marker */}
          <Marker position={markerPosition} icon={vehicleIcon}>
            <Tooltip direction="top" offset={[0, -20]} permanent={false}>
              <span style={{ fontSize: '12px', fontWeight: 600 }}>
                {status === 'Delivered' ? '📦 Delivered!' : '🚚 En route…'}
              </span>
            </Tooltip>
          </Marker>

          {/* Destination marker */}
          <Marker position={ROUTE_COORDS[ROUTE_COORDS.length - 1]} icon={destinationIcon}>
            <Tooltip direction="top" offset={[0, -10]} permanent>
              <span style={{ fontSize: '11px' }}>🏠 Delivery Address</span>
            </Tooltip>
          </Marker>

          <MapCenterUpdater center={mapCenter} />
        </MapContainer>
      </div>
    </div>
  )
}
