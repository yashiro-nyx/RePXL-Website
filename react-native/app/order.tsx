import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../src/services/api';
import type { Order } from '../types';

const TRACKING_STEPS = [
  { label: 'Order Placed', key: 'PLACED' },
  { label: 'Payment Confirmed', key: 'CONFIRMED' },
  { label: 'Processing & Tested', key: 'PROCESSING' },
  { label: 'Shipped', key: 'SHIPPED' },
  { label: 'Delivered', key: 'DELIVERED' },
];

export default function OrderScreen() {
  const insets = useSafeAreaInsets();
  const { orderNumber } = useLocalSearchParams<{ orderNumber: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!orderNumber) return;
    try {
      setRefreshing(true);
      setError('');
      const data = await api.order(orderNumber);
      setOrder(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load this order.');
    } finally {
      setRefreshing(false);
    }
  }, [orderNumber]);

  useEffect(() => {
    void fetchOrder();
  }, [fetchOrder]);

  const currentStepIndex = useMemo(() => {
    if (!order) return 0;
    const s = (order.deliveryStatus || '').toUpperCase();
    if (s.includes('DELIVERED') || s.includes('COMPLETED')) return 4;
    if (s.includes('SHIPPED') || s.includes('TRANSIT') || s.includes('COURIER')) return 3;
    if (s.includes('PROCESS') || s.includes('PREPAR')) return 2;
    if (order.paymentStatus === 'PAID') return 1;
    return 0;
  }, [order]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <TouchableOpacity
          onPress={fetchOrder}
          disabled={refreshing}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#c62828" />
          ) : (
            <Feather name="refresh-cw" size={18} color="#c62828" />
          )}
        </TouchableOpacity>
      </View>

      {!order ? (
        <View style={styles.center}>
          {error ? (
            <View style={{ alignItems: 'center', gap: 10, paddingHorizontal: 30 }}>
              <Text style={styles.error}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={fetchOrder}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ActivityIndicator color="#c62828" />
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Order Header Card */}
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.orderNumber}>{order.orderNumber}</Text>
              <View
                style={[
                  styles.paymentBadge,
                  order.paymentStatus === 'PAID' && styles.paymentBadgePaid,
                ]}
              >
                <Text
                  style={[
                    styles.paymentBadgeText,
                    order.paymentStatus === 'PAID' && styles.paymentBadgeTextPaid,
                  ]}
                >
                  {order.paymentStatus}
                </Text>
              </View>
            </View>
            <Text style={styles.meta}>
              Placed on {new Date(order.createdAt).toLocaleDateString()} at{' '}
              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>

          {/* Tracking Status Card */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Tracking & Delivery</Text>
            <Text style={styles.deliveryStatusMain}>{order.deliveryStatus}</Text>
            {!!order.trackingDescription && (
              <Text style={styles.description}>{order.trackingDescription}</Text>
            )}

            {/* Tracking timeline */}
            <View style={styles.timelineContainer}>
              {TRACKING_STEPS.map((step, idx) => {
                const isPassed = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                return (
                  <View key={step.key} style={styles.timelineRow}>
                    <View style={styles.timelineIconCol}>
                      <View
                        style={[
                          styles.timelineDot,
                          isPassed && styles.timelineDotPassed,
                          isCurrent && styles.timelineDotCurrent,
                        ]}
                      >
                        {isPassed && <Feather name="check" size={10} color="#fff" />}
                      </View>
                      {idx < TRACKING_STEPS.length - 1 && (
                        <View
                          style={[
                            styles.timelineLine,
                            idx < currentStepIndex && styles.timelineLinePassed,
                          ]}
                        />
                      )}
                    </View>
                    <View style={styles.timelineTextCol}>
                      <Text
                        style={[
                          styles.timelineLabel,
                          isPassed && styles.timelineLabelPassed,
                          isCurrent && styles.timelineLabelCurrent,
                        ]}
                      >
                        {step.label}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Items List Card */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Purchased Items</Text>
            {order.items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.item}
                onPress={() => {
                  if (item.product?.slug) {
                    router.push({ pathname: '/product', params: { slug: item.product.slug } });
                  }
                }}
                activeOpacity={0.8}
              >
                <Image source={{ uri: item.product.image }} style={styles.image} resizeMode="cover" />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.name} numberOfLines={2}>
                    {item.product.name}
                  </Text>
                  <Text style={styles.meta}>Qty: {item.quantity}</Text>
                  <Text style={styles.price}>
                    ₱{(item.price * item.quantity).toLocaleString()}.00
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color="#555" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Payment Summary */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Payment Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>₱{order.total.toLocaleString()}.00</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Payment Method</Text>
              <Text style={styles.summaryValText}>PayMongo Secured Checkout</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1c1c1e',
  },
  headerTitle: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { color: '#f44336', textAlign: 'center', fontFamily: 'Inter_400Regular' },
  retryBtn: {
    backgroundColor: '#c62828',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  retryBtnText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 12 },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  card: {
    backgroundColor: '#1c1c1e',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    padding: 16,
    gap: 8,
  },
  cardSectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#888',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNumber: { color: '#fff', fontFamily: 'Inter_800ExtraBold', fontSize: 17 },
  paymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#eab308',
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
  },
  paymentBadgePaid: {
    borderColor: '#4caf50',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  paymentBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#eab308',
  },
  paymentBadgeTextPaid: {
    color: '#4caf50',
  },
  deliveryStatusMain: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  meta: { color: '#777', fontFamily: 'Inter_400Regular', fontSize: 12 },
  description: {
    color: '#bbb',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  timelineContainer: {
    marginTop: 12,
    paddingTop: 8,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 36,
  },
  timelineIconCol: {
    alignItems: 'center',
    width: 24,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2c2c2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotPassed: {
    backgroundColor: '#c62828',
  },
  timelineDotCurrent: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 20,
    backgroundColor: '#2c2c2e',
    marginVertical: 2,
  },
  timelineLinePassed: {
    backgroundColor: '#c62828',
  },
  timelineTextCol: {
    flex: 1,
    marginLeft: 10,
    paddingTop: 1,
  },
  timelineLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#555',
  },
  timelineLabelPassed: {
    color: '#aaa',
  },
  timelineLabelCurrent: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#161618',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#252528',
  },
  image: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#111' },
  name: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 13 },
  price: { color: '#c62828', fontFamily: 'Inter_700Bold', fontSize: 13 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  summaryLabel: { color: '#888', fontFamily: 'Inter_400Regular', fontSize: 13 },
  summaryValText: { color: '#ccc', fontFamily: 'Inter_500Medium', fontSize: 13 },
  totalValue: { color: '#c62828', fontFamily: 'Inter_800ExtraBold', fontSize: 17 },
});
