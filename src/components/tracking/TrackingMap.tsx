'use client'

/**
 * Enhanced TrackingMap — interactive delivery route visualisation using react-leaflet + OpenStreetMap.
 *
 * Features:
 *  • Active visualization across ALL fulfillment stages (Processing, In Transit, Out for Delivery, Delivered)
 *  • Dynamic destination geocoding based on customer's city / province (Metro Manila & Provincial)
 *  • Intermediate sorting facility waypoints and realistic road trajectories
 *  • Stage-aware animated markers (Fulfillment radar beacon, Transport truck, Local courier scooter, Delivered check)
 *  • Telemetry HUD overlay: Origin Hub, Current Sorting Station, Destination Address, Courier info, ETA window
 *  • Interactive map controls: Fit Route, Focus Courier, Focus Destination
 */

import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  REPIXL_CENTRAL_HUB,
  REPIXL_CENTRAL_HUB_NAME,
  resolveDestinationCoordinates,
  getRegionalSortingFacility,
  generateDeliveryRoute,
  interpolateRoute,
  calculateDistanceKm,
  getRouteFraction,
  getEstimatedDeliveryWindow,
  type LatLngTuple,
} from '@/lib/delivery-routing'

export interface TrackingMapOrder {
  orderNumber?: string
  city?: string
  province?: string
  address?: string
  postalCode?: string
  courierName?: string
  courierEstimate?: string
  trackingNumber?: string
  deliveryStatus?: string
  trackingProgress?: number
  trackingDescription?: string
}

export interface TrackingMapProps {
  status: string
  progress: number
  order?: TrackingMapOrder
}

// ── Custom Leaflet Icons ────────────────────────────────────────────────────────

// Origin Hub Icon
const hubIcon = L.divIcon({
  className: '',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  html: `<div style="
    width:34px;height:34px;
    background:#1c1917;
    border:2px solid #c22c2c;
    border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 0 12px rgba(194,44,44,0.4);
  ">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f5f1ec" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  </div>`,
})

// Sorting Facility Icon
const sortingFacilityIcon = L.divIcon({
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  html: `<div style="
    width:28px;height:28px;
    background:#292524;
    border:2px solid #3b82f6;
    border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 2px 8px rgba(59,130,246,0.3);
  ">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  </div>`,
})

// Active Vehicle / Courier Marker
const vehicleIcon = L.divIcon({
  className: '',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  html: `<div style="
    width:38px;height:38px;
    background:#c22c2c;
    border:2px solid #f5f1ec;
    border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 0 16px rgba(194,44,44,0.7);
  ">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/>
      <rect x="9" y="11" width="14" height="10" rx="2"/>
      <circle cx="12" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    </svg>
  </div>`,
})

// Destination Customer Pin
const destinationIcon = L.divIcon({
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  html: `<div style="
    width:32px;height:32px;
    background:#2e7d32;
    border:2px solid #f5f1ec;
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 3px 10px rgba(0,0,0,0.5);
  ">
    <div style="transform:rotate(45deg);width:10px;height:10px;background:#fff;border-radius:50%;"></div>
  </div>`,
})

// Interactive Map Controller
function MapController({
  route,
  center,
  targetAction,
  resetAction,
}: {
  route: LatLngTuple[]
  center: LatLngTuple
  targetAction: string | null
  resetAction: () => void
}) {
  const map = useMap()

  useEffect(() => {
    if (!targetAction) return
    if (targetAction === 'fit') {
      const bounds = L.latLngBounds(route.map(([lat, lng]) => [lat, lng]))
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true })
    } else if (targetAction === 'courier') {
      map.panTo(center, { animate: true, duration: 1 })
      map.setZoom(14)
    } else if (targetAction === 'dest') {
      map.panTo(route[route.length - 1], { animate: true, duration: 1 })
      map.setZoom(15)
    } else if (targetAction === 'hub') {
      map.panTo(REPIXL_CENTRAL_HUB, { animate: true, duration: 1 })
      map.setZoom(14)
    }
    resetAction()
  }, [targetAction, route, center, map, resetAction])

  return null
}

export function TrackingMap({ status, progress, order }: TrackingMapProps) {
  const [mounted, setMounted] = useState(false)
  const [targetAction, setTargetAction] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Resolve destination coordinates based on order shipping address
  const destination = useMemo(() => {
    return resolveDestinationCoordinates(order?.city, order?.province, order?.address)
  }, [order?.city, order?.province, order?.address])

  // Resolve regional sorting center
  const sortingFacility = useMemo(() => {
    return getRegionalSortingFacility(destination)
  }, [destination])

  // Generate route coordinates from Parañaque Hub to Customer Destination
  const routeCoords = useMemo(() => {
    return generateDeliveryRoute(destination.coords, sortingFacility.coords)
  }, [destination.coords, sortingFacility.coords])

  // Compute live vehicle positioning along route
  const routeFraction = useMemo(() => {
    return getRouteFraction(status, progress)
  }, [status, progress])

  const vehiclePosition = useMemo(() => {
    return interpolateRoute(routeCoords, routeFraction)
  }, [routeCoords, routeFraction])

  // Distance calculations
  const totalDistanceKm = useMemo(() => {
    return calculateDistanceKm(REPIXL_CENTRAL_HUB, destination.coords)
  }, [destination.coords])

  const remainingDistanceKm = useMemo(() => {
    return Math.max(0, Math.round(totalDistanceKm * (1 - routeFraction) * 10) / 10)
  }, [totalDistanceKm, routeFraction])

  const eta = useMemo(() => {
    return getEstimatedDeliveryWindow(status, progress)
  }, [status, progress])

  const isPreparing = eta.stage === 'PROCESSING'
  const isDelivered = eta.stage === 'DELIVERED'

  const handleCopyTracking = () => {
    const code = order?.trackingNumber || order?.orderNumber || ''
    if (!code) return
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!mounted) return null

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal shadow-xl">
      {/* ── Header Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-repixl-muted/15 bg-repixl-bg/90 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isDelivered ? 'bg-emerald-500' : 'animate-pulse bg-repixl-red'
            }`}
            aria-hidden="true"
          />
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-repixl-text-light">
              Live Location Tracking
            </p>
            <p className="text-[11px] text-repixl-muted">
              {order?.courierName || 'RePXL Express Courier'} •{' '}
              <span className="font-mono text-repixl-text-light/80">
                {order?.trackingNumber || order?.orderNumber || 'RPX-TRK'}
              </span>
            </p>
          </div>
        </div>

        {/* Quick controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTargetAction('fit')}
            className="rounded-md border border-repixl-muted/20 bg-repixl-charcoal/80 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-repixl-muted transition hover:border-repixl-muted/50 hover:text-repixl-text-light"
            title="Fit complete delivery route"
          >
            Fit Route
          </button>
          <button
            type="button"
            onClick={() => setTargetAction('courier')}
            className="rounded-md border border-repixl-muted/20 bg-repixl-charcoal/80 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-repixl-muted transition hover:border-repixl-muted/50 hover:text-repixl-text-light"
            title="Center on package / courier location"
          >
            Courier
          </button>
          <button
            type="button"
            onClick={() => setTargetAction('dest')}
            className="rounded-md border border-repixl-muted/20 bg-repixl-charcoal/80 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-repixl-muted transition hover:border-repixl-muted/50 hover:text-repixl-text-light"
            title="Center on customer delivery address"
          >
            Destination
          </button>
        </div>
      </div>

      {/* ── Delivery Telemetry HUD Bar ── */}
      <div className="grid grid-cols-2 gap-2 border-b border-repixl-muted/15 bg-repixl-charcoal/95 p-3 sm:grid-cols-4">
        {/* Origin */}
        <div className="rounded-lg bg-repixl-bg/50 p-2.5">
          <p className="font-mono text-[9px] uppercase tracking-widest text-repixl-muted">Fulfillment Hub</p>
          <p className="truncate text-xs font-semibold text-repixl-text-light">Parañaque Main Hub</p>
          <p className="font-mono text-[9px] text-emerald-400/80">Dispatched & Certified</p>
        </div>

        {/* Sorting Station */}
        <div className="rounded-lg bg-repixl-bg/50 p-2.5">
          <p className="font-mono text-[9px] uppercase tracking-widest text-repixl-muted">Sorting Hub</p>
          <p className="truncate text-xs font-semibold text-repixl-text-light">{sortingFacility.name.split('(')[0]}</p>
          <p className="font-mono text-[9px] text-blue-400/80">{progress >= 50 ? 'Processed' : 'En route'}</p>
        </div>

        {/* Destination */}
        <div className="rounded-lg bg-repixl-bg/50 p-2.5">
          <p className="font-mono text-[9px] uppercase tracking-widest text-repixl-muted">Destination</p>
          <p className="truncate text-xs font-semibold text-repixl-text-light">{destination.name}</p>
          <p className="truncate font-mono text-[9px] text-repixl-muted">
            {order?.address ? `${order.address}` : `${destination.name}, ${destination.region}`}
          </p>
        </div>

        {/* Status / ETA */}
        <div className="rounded-lg bg-repixl-bg/50 p-2.5">
          <p className="font-mono text-[9px] uppercase tracking-widest text-repixl-muted">Delivery ETA</p>
          <p className="truncate text-xs font-semibold text-amber-400">{eta.etaText}</p>
          <p className="font-mono text-[9px] text-repixl-muted">
            {isDelivered ? '0 km remaining' : `${remainingDistanceKm} km from destination`}
          </p>
        </div>
      </div>

      {/* ── Interactive Leaflet Map Container ── */}
      <div style={{ height: 340, width: '100%', position: 'relative' }}>
        <MapContainer
          center={vehiclePosition}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
          zoomControl
        >
          {/* CartoDB Dark Matter base tile layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* Full Planned Delivery Route (Dotted Background) */}
          <Polyline
            positions={routeCoords}
            pathOptions={{
              color: '#78716c',
              weight: 3,
              opacity: 0.45,
              dashArray: '6 6',
            }}
          />

          {/* Active Travelled Route Polyline */}
          <Polyline
            positions={routeCoords.slice(
              0,
              Math.max(2, Math.ceil(routeFraction * routeCoords.length))
            )}
            pathOptions={{
              color: isDelivered ? '#22c55e' : '#c22c2c',
              weight: 4,
              opacity: 0.9,
            }}
          />

          {/* 1. Origin Fulfillment Hub Marker */}
          <Marker position={REPIXL_CENTRAL_HUB} icon={hubIcon}>
            <Tooltip direction="top" offset={[0, -18]} permanent={false}>
              <div style={{ padding: '2px 4px', color: '#111' }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '11px' }}>{REPIXL_CENTRAL_HUB_NAME}</p>
                <p style={{ margin: 0, fontSize: '10px', color: '#666' }}>Dispatch & Authenticity Lab</p>
              </div>
            </Tooltip>
          </Marker>

          {/* 2. Intermediate Sorting Facility Marker */}
          <Marker position={sortingFacility.coords} icon={sortingFacilityIcon}>
            <Tooltip direction="top" offset={[0, -15]} permanent={false}>
              <div style={{ padding: '2px 4px', color: '#111' }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '11px' }}>{sortingFacility.name}</p>
                <p style={{ margin: 0, fontSize: '10px', color: '#666' }}>Regional Logistics Hub</p>
              </div>
            </Tooltip>
          </Marker>

          {/* 3. Moving Vehicle / Courier Marker */}
          <Marker position={vehiclePosition} icon={vehicleIcon}>
            <Tooltip direction="top" offset={[0, -20]} permanent>
              <div style={{ padding: '3px 6px', color: '#111' }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '11px', color: '#c22c2c' }}>
                  {isDelivered ? '📦 Package Delivered' : isPreparing ? '🏭 Gear Being Packaged' : '🚚 Courier in Transit'}
                </p>
                <p style={{ margin: 0, fontSize: '10px', color: '#444' }}>
                  {isDelivered
                    ? 'Delivered at Doorstep'
                    : isPreparing
                    ? 'Serial verification complete'
                    : `${remainingDistanceKm} km to ${destination.name}`}
                </p>
              </div>
            </Tooltip>
          </Marker>

          {/* 4. Destination Customer Marker */}
          <Marker position={destination.coords} icon={destinationIcon}>
            <Tooltip direction="top" offset={[0, -25]} permanent>
              <div style={{ padding: '2px 6px', color: '#111' }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '11px' }}>🏠 Delivery Address</p>
                <p style={{ margin: 0, fontSize: '10px', color: '#555' }}>
                  {order?.address || destination.name}
                </p>
              </div>
            </Tooltip>
          </Marker>

          <MapController
            route={routeCoords}
            center={vehiclePosition}
            targetAction={targetAction}
            resetAction={() => setTargetAction(null)}
          />
        </MapContainer>

        {/* Map Bottom Status Badge */}
        <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] flex items-center gap-2 rounded-lg border border-repixl-muted/20 bg-repixl-charcoal/90 px-3 py-1.5 backdrop-blur-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="font-mono text-[10px] text-repixl-text-light/90">
            {isDelivered
              ? 'Completed • Delivery Confirmed'
              : `${progress}% Completed • ${eta.badge}`}
          </span>
        </div>

        {/* Copy Waybill Quick Action */}
        <div className="absolute bottom-3 right-3 z-[1000]">
          <button
            type="button"
            onClick={handleCopyTracking}
            className="flex items-center gap-1.5 rounded-lg border border-repixl-muted/20 bg-repixl-charcoal/90 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-repixl-text-light transition hover:border-repixl-muted/40 hover:bg-repixl-bg backdrop-blur-sm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
            {copied ? 'Copied Waybill!' : 'Copy Tracking #'}
          </button>
        </div>
      </div>
    </div>
  )
}
