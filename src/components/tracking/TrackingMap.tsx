'use client'

/**
 * TrackingMap — clean, focused delivery route visualization using react-leaflet.
 * Displays real-time SSE delivery progress, ETA, and route trajectory without clutter.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { TileLayer, Polyline, Marker, Tooltip, useMap } from 'react-leaflet'
import { LeafletProvider, createLeafletContext, type LeafletContextInterface } from '@react-leaflet/core'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  REPIXL_CENTRAL_HUB,
  REPIXL_CENTRAL_HUB_NAME,
  resolveDestinationCoordinates,
  getRegionalSortingFacility,
  generateDeliveryRoute,
  interpolateRoute,
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

export interface TrackingMapState {
  status: string
  progress: number
  description: string
}

export interface TrackingMapProps {
  status: string
  progress: number
  order?: TrackingMapOrder
  initialState?: TrackingMapState
}

// ── Custom Leaflet Icons ────────────────────────────────────────────────────────

const hubIcon = L.divIcon({
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  html: `<div style="
    width:28px;height:28px;
    background:#1c1917;
    border:2px solid #c22c2c;
    border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 0 10px rgba(194,44,44,0.35);
  ">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f5f1ec" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  </div>`,
})

const vehicleIcon = L.divIcon({
  className: '',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  html: `<div style="
    width:34px;height:34px;
    background:#c22c2c;
    border:2px solid #f5f1ec;
    border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 0 14px rgba(194,44,44,0.6);
  ">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
    background:#2e7d32;
    border:2px solid #f5f1ec;
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 2px 8px rgba(0,0,0,0.4);
  ">
    <div style="transform:rotate(45deg);width:8px;height:8px;background:#fff;border-radius:50%;"></div>
  </div>`,
})

// ── Stable Leaflet Map Container for React 18 / Next.js 15 ──────────────────

interface StableMapContainerProps {
  center: LatLngTuple
  zoom?: number
  scrollWheelZoom?: boolean
  zoomControl?: boolean
  style?: React.CSSProperties
  className?: string
  children?: React.ReactNode
}

function StableMapContainer({
  center,
  zoom = 12,
  scrollWheelZoom = false,
  zoomControl = true,
  style,
  className,
  children,
}: StableMapContainerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const [context, setContext] = useState<LeafletContextInterface | null>(null)

  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
    }

    const mapInstance = new L.Map(node, {
      center,
      zoom,
      scrollWheelZoom,
      zoomControl,
    })

    mapRef.current = mapInstance
    setContext(createLeafletContext(mapInstance))

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            mapInstance.invalidateSize()
          })
        : null
    resizeObserver?.observe(node)

    return () => {
      resizeObserver?.disconnect()
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      setContext(null)
    }
  }, []) // Mount-only effect; cleanly destroys map instance on unmount

  return (
    <div ref={containerRef} style={style} className={className}>
      {context ? <LeafletProvider value={context}>{children}</LeafletProvider> : null}
    </div>
  )
}

function MapController({
  route,
  targetAction,
  resetAction,
}: {
  route: LatLngTuple[]
  targetAction: string | null
  resetAction: () => void
}) {
  const map = useMap()

  useEffect(() => {
    if (!targetAction) return
    if (targetAction === 'fit') {
      const bounds = L.latLngBounds(route.map(([lat, lng]) => [lat, lng]))
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: true })
    }
    resetAction()
  }, [targetAction, route, map, resetAction])

  return null
}

export function TrackingMap({ status, progress, order, initialState }: TrackingMapProps) {
  const [mounted, setMounted] = useState(false)
  const [targetAction, setTargetAction] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const trackingNumber = order?.trackingNumber || order?.orderNumber || 'RPX-TRK'

  const [liveState, setLiveState] = useState<TrackingMapState>(
    initialState ?? {
      status: status || 'In Transit',
      progress: progress || 50,
      description: order?.trackingDescription || 'Your package is on its way.',
    }
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  // Real-time SSE order tracking connection
  useEffect(() => {
    if (!trackingNumber || trackingNumber === 'RPX-TRK') return

    let es: EventSource
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let retryCount = 0
    const MAX_RETRIES = 5

    const connect = () => {
      es = new EventSource(`/api/track/stream?tracking=${encodeURIComponent(trackingNumber)}`)

      es.onmessage = (event) => {
        try {
          const data: TrackingMapState = JSON.parse(event.data)
          setLiveState(data)
        } catch {
          // Ignore malformed events
        }
      }

      es.onerror = () => {
        es.close()
        if (retryCount < MAX_RETRIES) {
          retryCount += 1
          const delay = Math.min(2000 * Math.pow(2, retryCount - 1), 30000)
          reconnectTimer = setTimeout(connect, delay)
        }
      }
    }

    connect()

    return () => {
      es?.close()
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  }, [trackingNumber])

  const currentStatus = liveState.status || status || 'In Transit'
  const currentProgress = liveState.progress ?? progress ?? 50
  const currentDesc = liveState.description || order?.trackingDescription || ''

  const destination = useMemo(() => {
    return resolveDestinationCoordinates(order?.city, order?.province, order?.address)
  }, [order?.city, order?.province, order?.address])

  const sortingFacility = useMemo(() => {
    return getRegionalSortingFacility(destination)
  }, [destination])

  const routeCoords = useMemo(() => {
    return generateDeliveryRoute(destination.coords, sortingFacility.coords)
  }, [destination.coords, sortingFacility.coords])

  const routeFraction = useMemo(() => {
    return getRouteFraction(currentStatus, currentProgress)
  }, [currentStatus, currentProgress])

  const vehiclePosition = useMemo(() => {
    return interpolateRoute(routeCoords, routeFraction)
  }, [routeCoords, routeFraction])

  const eta = useMemo(() => {
    return getEstimatedDeliveryWindow(currentStatus, currentProgress)
  }, [currentStatus, currentProgress])

  const isDelivered = currentProgress >= 100 || currentStatus.toLowerCase() === 'delivered'

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
    <div className="overflow-hidden rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal shadow-xl">
      {/* ── Clean Header: Courier, Tracking #, Live Status & Reset View ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-repixl-muted/15 bg-repixl-bg/90 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isDelivered ? 'bg-emerald-500' : 'bg-amber-400'
            }`}
            aria-hidden="true"
          />
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-repixl-text-light">
              {order?.courierName || 'RePXL Express'}
            </span>
            <span className="font-mono text-repixl-muted">•</span>
            <span className="font-mono text-repixl-muted/80">{trackingNumber}</span>
            <button
              type="button"
              onClick={handleCopyTracking}
              className="ml-1 text-[10px] font-mono text-repixl-muted underline hover:text-repixl-text-light transition-colors"
              title="Copy tracking number"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
              isDelivered
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}
          >
            {currentStatus}
          </span>
          <button
            type="button"
            onClick={() => setTargetAction('fit')}
            className="rounded-lg border border-repixl-muted/20 bg-repixl-charcoal/80 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-repixl-muted transition hover:border-repixl-muted/40 hover:text-repixl-text-light"
            title="Reset map view"
          >
            Reset View
          </button>
        </div>
      </div>

      {/* ── Status & ETA Bar ── */}
      <div className="border-b border-repixl-muted/15 bg-repixl-charcoal/90 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <span className="font-semibold text-amber-400">
              {eta.etaText}
            </span>
            {currentDesc && (
              <span className="text-repixl-muted ml-2">
                — {currentDesc}
              </span>
            )}
          </div>
          <span className="font-mono text-[10px] text-repixl-muted">
            {currentProgress}%
          </span>
        </div>

        {/* Minimal Progress Line */}
        <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-repixl-muted/15">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              isDelivered ? 'bg-emerald-500' : 'bg-repixl-red'
            }`}
            style={{ width: `${Math.max(5, currentProgress)}%` }}
            role="progressbar"
            aria-valuenow={currentProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Delivery progress"
          />
        </div>
      </div>

      {/* ── Interactive Delivery Route Map ── */}
      <div style={{ height: 280, width: '100%', position: 'relative' }}>
        <StableMapContainer
          center={vehiclePosition}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
          zoomControl
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* Background Planned Route */}
          <Polyline
            positions={routeCoords}
            pathOptions={{
              color: '#78716c',
              weight: 3,
              opacity: 0.4,
              dashArray: '6 6',
            }}
          />

          {/* Active Travelled Route */}
          <Polyline
            positions={routeCoords.slice(
              0,
              Math.max(2, Math.ceil(routeFraction * routeCoords.length))
            )}
            pathOptions={{
              color: isDelivered ? '#22c55e' : '#c22c2c',
              weight: 3.5,
              opacity: 0.9,
            }}
          />

          {/* Origin Hub Marker */}
          <Marker position={REPIXL_CENTRAL_HUB} icon={hubIcon}>
            <Tooltip direction="top" offset={[0, -16]} permanent={false}>
              <div style={{ padding: '2px 4px', color: '#111', fontSize: '11px', fontWeight: 600 }}>
                {REPIXL_CENTRAL_HUB_NAME}
              </div>
            </Tooltip>
          </Marker>

          {/* Courier Vehicle Marker */}
          <Marker position={vehiclePosition} icon={vehicleIcon}>
            <Tooltip direction="top" offset={[0, -20]} permanent>
              <div style={{ padding: '2px 6px', color: '#111', fontSize: '11px', fontWeight: 700 }}>
                {isDelivered ? 'Delivered' : `In Transit to ${destination.name}`}
              </div>
            </Tooltip>
          </Marker>

          {/* Destination Pin (Hover tooltip only, opens downward) */}
          <Marker position={destination.coords} icon={destinationIcon}>
            <Tooltip direction="bottom" offset={[0, 8]} permanent={false}>
              <div style={{ padding: '2px 6px', color: '#111', fontSize: '11px' }}>
                <strong>Delivery Address:</strong> {order?.address || destination.name}
              </div>
            </Tooltip>
          </Marker>

          <MapController
            route={routeCoords}
            targetAction={targetAction}
            resetAction={() => setTargetAction(null)}
          />
        </StableMapContainer>
      </div>
    </div>
  )
}
