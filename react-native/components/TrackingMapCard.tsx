import React, { useMemo, useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Svg, {
  Path,
  Circle,
  Rect,
  Line,
  G,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import type { Order } from '../types';
import {
  resolveDestinationCoordinates,
  getRegionalSortingFacility,
  calculateDistanceKm,
  getEstimatedDeliveryWindow,
  REPIXL_CENTRAL_HUB,
} from '../src/utils/deliveryRouting';

interface TrackingMapCardProps {
  order: Order;
}

const CANVAS_HEIGHT = 200;

export function TrackingMapCard({ order }: TrackingMapCardProps) {
  const [viewMode, setViewMode] = useState<'map' | 'details'>('map');
  const [copied, setCopied] = useState(false);

  const destination = useMemo(() => {
    return resolveDestinationCoordinates(order.city, order.province, order.address);
  }, [order.city, order.province, order.address]);

  const sortingFacility = useMemo(() => {
    return getRegionalSortingFacility(destination);
  }, [destination]);

  const eta = useMemo(() => {
    return getEstimatedDeliveryWindow(order.deliveryStatus || 'Order Placed', order.trackingProgress || 25);
  }, [order.deliveryStatus, order.trackingProgress]);

  const totalDistanceKm = useMemo(() => {
    return calculateDistanceKm(REPIXL_CENTRAL_HUB, destination.coords);
  }, [destination.coords]);

  const isDelivered = eta.stage === 'DELIVERED';
  const isOutForDelivery = eta.stage === 'OUT_FOR_DELIVERY';
  const isInTransit = eta.stage === 'IN_TRANSIT';

  // Progress fraction: 0 to 1
  const progressFraction = useMemo(() => {
    const prog = order.trackingProgress ?? 25;
    if (isDelivered || prog >= 100) return 1;
    if (isOutForDelivery) return 0.72 + (Math.min(prog, 95) / 100) * 0.22;
    if (isInTransit) return 0.35 + (Math.min(prog, 70) / 100) * 0.35;
    return 0.1;
  }, [order.trackingProgress, isDelivered, isOutForDelivery, isInTransit]);

  const remainingKm = Math.max(0, Math.round(totalDistanceKm * (1 - progressFraction) * 10) / 10);

  // Bezier delivery route calculation on mobile SVG canvas
  // Start: Hub (50, 155), Control: Sorting (170, 125), End: Destination (290, 45)
  const p0 = { x: 50, y: 155 };
  const p1 = { x: 165, y: 125 };
  const p2 = { x: 285, y: 45 };

  // Quadratic Bezier interpolation: B(t) = (1-t)^2*P0 + 2(1-t)t*P1 + t^2*P2
  const vehiclePos = useMemo(() => {
    const t = Math.max(0, Math.min(1, progressFraction));
    const invT = 1 - t;
    const x = invT * invT * p0.x + 2 * invT * t * p1.x + t * t * p2.x;
    const y = invT * invT * p0.y + 2 * invT * t * p1.y + t * t * p2.y;
    return { x: Math.round(x), y: Math.round(y) };
  }, [progressFraction, p0.x, p0.y, p1.x, p1.y, p2.x, p2.y]);

  const handleCopyWaybill = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <View style={styles.card}>
      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <View style={styles.titleRow}>
          <View style={[styles.pulseDot, isDelivered && styles.pulseDotDelivered]} />
          <View>
            <Text style={styles.topTitle}>DELIVERY ROUTE</Text>
            <Text style={styles.topSubtitle}>
              {order.courierName || 'RePXL Express'} • {order.orderNumber}
            </Text>
          </View>
        </View>

        {/* View mode toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
            onPress={() => setViewMode('map')}
            activeOpacity={0.8}
          >
            <Feather name="map" size={12} color={viewMode === 'map' ? '#fff' : '#888'} />
            <Text style={[styles.toggleBtnText, viewMode === 'map' && styles.toggleBtnTextActive]}>
              Route
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'details' && styles.toggleBtnActive]}
            onPress={() => setViewMode('details')}
            activeOpacity={0.8}
          >
            <Feather name="list" size={12} color={viewMode === 'details' ? '#fff' : '#888'} />
            <Text style={[styles.toggleBtnText, viewMode === 'details' && styles.toggleBtnTextActive]}>
              Stops
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'map' ? (
        <>
          {/* ── Map Canvas ── */}
          <View style={styles.canvasContainer}>
            <Svg width="100%" height={CANVAS_HEIGHT} viewBox="0 0 340 200">
              <Defs>
                <LinearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#141210" />
                  <Stop offset="100%" stopColor="#1a1815" />
                </LinearGradient>

                <LinearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0%" stopColor="#c62828" />
                  <Stop offset="100%" stopColor={isDelivered ? '#2e7d32' : '#e53935'} />
                </LinearGradient>
              </Defs>

              {/* Map Background */}
              <Rect width="340" height="200" fill="url(#bgGrad)" rx="12" />

              {/* Grid lines */}
              <Line x1="20" y1="50" x2="320" y2="50" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <Line x1="20" y1="100" x2="320" y2="100" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <Line x1="20" y1="150" x2="320" y2="150" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <Line x1="80" y1="20" x2="80" y2="180" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <Line x1="170" y1="20" x2="170" y2="180" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <Line x1="260" y1="20" x2="260" y2="180" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

              {/* Secondary Road Vectors */}
              <Path
                d="M 30,190 Q 90,130 150,160 T 270,180"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1.5"
                fill="none"
              />
              <Path
                d="M 60,30 Q 140,80 200,40 T 330,80"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1.5"
                fill="none"
              />

              {/* Main Delivery Route (Background Planned Curve) */}
              <Path
                d={`M ${p0.x},${p0.y} Q ${p1.x},${p1.y} ${p2.x},${p2.y}`}
                stroke="#555"
                strokeWidth="3"
                strokeDasharray="6,4"
                fill="none"
                opacity={0.5}
              />

              {/* Active Delivery Progress Curve */}
              <Path
                d={`M ${p0.x},${p0.y} Q ${(p0.x + vehiclePos.x) / 2},${(p0.y + vehiclePos.y) / 2} ${vehiclePos.x},${vehiclePos.y}`}
                stroke="url(#routeGrad)"
                strokeWidth="3.5"
                fill="none"
              />

              {/* 1. Origin Fulfillment Center Pin (Parañaque) */}
              <G x={p0.x} y={p0.y}>
                <Circle r="12" fill="#221f1d" stroke="#c62828" strokeWidth="2" />
                <Circle r="4" fill="#c62828" />
                <SvgText
                  x="0"
                  y="22"
                  fill="#999"
                  fontSize="8"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  Fulfillment Center
                </SvgText>
              </G>

              {/* 2. Intermediate Distribution Facility Pin */}
              <G x={p1.x} y={p1.y}>
                <Circle r="9" fill="#1c1917" stroke="#3b82f6" strokeWidth="1.5" />
                <Circle r="3" fill="#60a5fa" />
                <SvgText
                  x="0"
                  y="18"
                  fill="#888"
                  fontSize="8"
                  textAnchor="middle"
                >
                  Distribution Facility
                </SvgText>
              </G>

              {/* 3. Destination Pin */}
              <G x={p2.x} y={p2.y}>
                <Circle r="11" fill="#1b2e1b" stroke="#22c55e" strokeWidth="2" />
                <Circle r="4" fill="#22c55e" />
                <SvgText
                  x="0"
                  y="-16"
                  fill="#e5e5e5"
                  fontSize="8.5"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {destination.name.slice(0, 14)}
                </SvgText>
                <SvgText
                  x="0"
                  y="20"
                  fill="#22c55e"
                  fontSize="7.5"
                  textAnchor="middle"
                >
                  Delivery Address
                </SvgText>
              </G>

              {/* 4. Moving Courier Vehicle Marker */}
              <G x={vehiclePos.x} y={vehiclePos.y}>
                {/* Ambient glow halo */}
                {!isDelivered && (
                  <Circle
                    r="18"
                    fill="rgba(198,40,40,0.18)"
                  />
                )}

                {/* Main Vehicle Circle */}
                <Circle
                  r="13"
                  fill={isDelivered ? '#2e7d32' : '#c62828'}
                  stroke="#fff"
                  strokeWidth="2"
                />

                {/* Inner Icon Graphic */}
                <SvgText
                  x="0"
                  y="4"
                  fill="#fff"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {isDelivered ? '✓' : '🚚'}
                </SvgText>

                {/* Floating Courier Tooltip */}
                <G y="-22">
                  <Rect
                    x="-46"
                    y="-11"
                    width="92"
                    height="18"
                    rx="9"
                    fill="rgba(20,18,16,0.92)"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="1"
                  />
                  <SvgText
                    x="0"
                    y="1.5"
                    fill="#fff"
                    fontSize="7.5"
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {isDelivered
                      ? 'Delivered'
                      : isOutForDelivery
                      ? 'Out for Delivery'
                      : isInTransit
                      ? 'In Transit'
                      : 'Preparing Package'}
                  </SvgText>
                </G>
              </G>
            </Svg>

            {/* In-Map Badge Overlay */}
            <View style={styles.mapBadgeOverlay}>
              <View style={styles.badgeRow}>
                <View style={[styles.statusPill, isDelivered && styles.statusPillDelivered]}>
                  <Text style={styles.statusPillText}>
                    {isDelivered
                      ? 'DELIVERED'
                      : isOutForDelivery
                      ? 'OUT FOR DELIVERY'
                      : isInTransit
                      ? 'IN TRANSIT'
                      : 'PROCESSING'}
                  </Text>
                </View>
                <Text style={styles.mapDistText}>
                  {isDelivered ? 'Arrived at address' : `${remainingKm} km remaining`}
                </Text>
              </View>
            </View>
          </View>
        </>
      ) : (
        /* ── Transit Checkpoints View ── */
        <View style={styles.waypointList}>
          <View style={styles.waypointItem}>
            <View style={styles.waypointDotActive}>
              <Feather name="check" size={10} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.waypointTitle}>RePXL Fulfillment Center (Parañaque)</Text>
              <Text style={styles.waypointSub}>Origin • Inspected & Dispatched</Text>
            </View>
          </View>

          <View style={styles.waypointItem}>
            <View
              style={[
                styles.waypointDot,
                (isInTransit || isOutForDelivery || isDelivered) && styles.waypointDotActive,
              ]}
            >
              {(isOutForDelivery || isDelivered) && <Feather name="check" size={10} color="#fff" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.waypointTitle}>{sortingFacility.name}</Text>
              <Text style={styles.waypointSub}>Distribution Facility • In Transit</Text>
            </View>
          </View>

          <View style={styles.waypointItem}>
            <View
              style={[
                styles.waypointDot,
                (isOutForDelivery || isDelivered) && styles.waypointDotActive,
              ]}
            >
              {isDelivered && <Feather name="check" size={10} color="#fff" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.waypointTitle}>Local Delivery Courier</Text>
              <Text style={styles.waypointSub}>
                {order.courierName || 'RePXL Express Courier'} • Out for delivery
              </Text>
            </View>
          </View>

          <View style={[styles.waypointItem, { borderBottomWidth: 0 }]}>
            <View style={[styles.waypointDot, isDelivered && styles.waypointDotDelivered]}>
              {isDelivered && <Feather name="check" size={10} color="#fff" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.waypointTitle}>{order.address || destination.name}</Text>
              <Text style={styles.waypointSub}>
                Delivery Address • {destination.name}, {destination.region}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* ── Realistic Shipping Details Grid ── */}
      <View style={styles.hudGrid}>
        <View style={styles.hudCol}>
          <Text style={styles.hudLabel}>CARRIER</Text>
          <Text style={styles.hudValue} numberOfLines={1}>
            {order.courierName || 'RePXL Express'}
          </Text>
        </View>

        <View style={styles.hudCol}>
          <Text style={styles.hudLabel}>STATUS</Text>
          <Text style={styles.hudValue} numberOfLines={1}>
            {isDelivered
              ? 'Delivered'
              : isOutForDelivery
              ? 'Out for Delivery'
              : isInTransit
              ? 'In Transit'
              : 'Processing'}
          </Text>
        </View>

        <View style={styles.hudCol}>
          <Text style={styles.hudLabel}>DELIVERY TO</Text>
          <Text style={styles.hudValue} numberOfLines={1}>
            {destination.name}
          </Text>
        </View>

        <View style={styles.hudCol}>
          <Text style={styles.hudLabel}>ESTIMATED</Text>
          <Text style={[styles.hudValue, { color: '#fbbf24' }]} numberOfLines={1}>
            {eta.etaText.replace('Estimated ', '')}
          </Text>
        </View>
      </View>

      {/* ── Action Footbar ── */}
      <View style={styles.footbar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.footTrackingLabel}>TRACKING NUMBER</Text>
          <Text style={styles.footTrackingVal}>{order.orderNumber}</Text>
        </View>

        <TouchableOpacity
          style={[styles.copyBtn, copied && styles.copyBtnSuccess]}
          onPress={handleCopyWaybill}
          activeOpacity={0.8}
        >
          <Feather name={copied ? 'check' : 'copy'} size={12} color="#fff" />
          <Text style={styles.copyBtnText}>{copied ? 'Copied' : 'Copy Tracking #'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1b1917',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    marginBottom: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#141210',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#c62828',
  },
  pulseDotDelivered: {
    backgroundColor: '#22c55e',
  },
  topTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1.2,
    color: '#e5e5e5',
  },
  topSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: '#888',
    marginTop: 1,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#262320',
  },
  toggleBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: '#888',
  },
  toggleBtnTextActive: {
    color: '#fff',
  },
  canvasContainer: {
    width: '100%',
    height: CANVAS_HEIGHT,
    position: 'relative',
  },
  mapBadgeOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(20, 18, 16, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    backgroundColor: '#c62828',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPillDelivered: {
    backgroundColor: '#22c55e',
  },
  statusPillText: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 8,
    color: '#fff',
    letterSpacing: 0.5,
  },
  mapDistText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 9.5,
    color: '#ddd',
  },
  waypointList: {
    padding: 16,
    backgroundColor: '#161412',
  },
  waypointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  waypointDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waypointDotActive: {
    backgroundColor: '#c62828',
  },
  waypointDotDelivered: {
    backgroundColor: '#22c55e',
  },
  waypointTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#eee',
  },
  waypointSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: '#888',
    marginTop: 2,
  },
  hudGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: '#141210',
    padding: 12,
  },
  hudCol: {
    flex: 1,
    paddingHorizontal: 4,
  },
  hudLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    letterSpacing: 0.8,
    color: '#888',
    marginBottom: 3,
  },
  hudValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10.5,
    color: '#e5e5e5',
  },
  footbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#181614',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  footTrackingLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    color: '#777',
    letterSpacing: 0.8,
  },
  footTrackingVal: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#ddd',
    marginTop: 1,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  copyBtnSuccess: {
    backgroundColor: '#2e7d32',
    borderColor: '#2e7d32',
  },
  copyBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: '#fff',
  },
});

