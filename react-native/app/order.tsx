import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useApp } from '../context/AppContext';
import {
  getOrderStatusLabel,
  getOrderStatusColors,
  getPaymentStatusColors,
  normalizeOrderStatus,
  canCustomerCancelOrder,
  getPaymentTimeRemaining,
  type Order,
} from '../types';
import { TrackingMapCard } from '../components/TrackingMapCard';

const TRACKING_STEPS = [
  { label: 'Order Placed', key: 'ORDER_PLACED' },
  { label: 'Payment Processed', key: 'PAYMENT_PROCESSED' },
  { label: 'Shipped & In Transit', key: 'SHIPPED' },
  { label: 'Delivered to Customer', key: 'DELIVERED' },
  { label: 'Order Completed', key: 'COMPLETED' },
];

export default function OrderScreen() {
  const insets = useSafeAreaInsets();
  const { orderNumber } = useLocalSearchParams<{ orderNumber: string }>();
  const { cancelOrder, confirmReceipt, updateOrderStatus } = useApp();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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

  const normStatus = normalizeOrderStatus(order?.status);
  const isCancelled = normStatus === 'CANCELLED';

  const cancelCheck = useMemo(() => canCustomerCancelOrder(order), [order]);
  const isCancellable = cancelCheck.allowed;

  const isCod = useMemo(() => {
    if (!order?.paymentMethod) return false;
    const pm = order.paymentMethod.toLowerCase();
    return pm.includes('cash on delivery') || pm === 'cod';
  }, [order?.paymentMethod]);

  const isCodPending = useMemo(() => {
    return (
      isCod &&
      (order?.deliveryStatus === 'Pending COD Approval' ||
        order?.deliveryStatus === 'COD Approval Requested')
    );
  }, [isCod, order?.deliveryStatus]);

  const isPendingPayment = order?.paymentStatus === 'PENDING' && !isCancelled && !isCod;

  const paymentTime = useMemo(() => {
    if (!order?.createdAt || isCod) return null;
    return getPaymentTimeRemaining(order.createdAt);
  }, [order?.createdAt, isCod]);

  const currentStepIndex = useMemo(() => {
    if (!order) return 0;
    if (normStatus === 'COMPLETED') return 4;
    if (normStatus === 'DELIVERED') return 3;
    if (normStatus === 'SHIPPED') return 2;
    // PROCESSING:
    if (isCod) {
      return isCodPending ? 0 : 1;
    }
    const isPaid = order.paymentStatus?.toUpperCase() === 'PAID';
    if (isPaid) return 1;
    return 0;
  }, [order, normStatus, isCod, isCodPending]);

  // Auto-poll when order is pending payment to detect external PayMongo completion
  useEffect(() => {
    if (!isPendingPayment) return;
    let count = 0;
    const interval = setInterval(() => {
      count += 1;
      if (count > 20) {
        clearInterval(interval);
        return;
      }
      void fetchOrder();
    }, 6000);
    return () => clearInterval(interval);
  }, [isPendingPayment, fetchOrder]);

  const handleCancelOrder = () => {
    if (!order) return;
    if (!isCancellable) {
      Alert.alert('Cannot Cancel', cancelCheck.reason || 'This order cannot be cancelled at this stage.');
      return;
    }
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? Orders can only be cancelled before courier pickup or shipping.',
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Cancel Order',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              const updated = await cancelOrder(order.orderNumber);
              setOrder(updated);
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to cancel order.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleConfirmReceipt = () => {
    if (!order) return;
    Alert.alert(
      'Confirm Delivery Received',
      'Have you received all items in good condition? This will finalize and mark your order as Completed.',
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Yes, Confirm Received',
          onPress: async () => {
            try {
              setActionLoading(true);
              const updated = await confirmReceipt(order.orderNumber);
              setOrder(updated);
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to complete order.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

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
              {/* Badges Row */}
              <View style={styles.badgeRow}>
                {/* Order Status Badge */}
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: getOrderStatusColors(
                        order.status,
                        order.paymentStatus,
                        order.deliveryStatus,
                        order.paymentMethod
                      ).bg,
                      borderColor: getOrderStatusColors(
                        order.status,
                        order.paymentStatus,
                        order.deliveryStatus,
                        order.paymentMethod
                      ).border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      {
                        color: getOrderStatusColors(
                          order.status,
                          order.paymentStatus,
                          order.deliveryStatus,
                          order.paymentMethod
                        ).text,
                      },
                    ]}
                  >
                    {getOrderStatusLabel(
                      order.status,
                      order.paymentStatus,
                      order.deliveryStatus,
                      order.paymentMethod
                    ).toUpperCase()}
                  </Text>
                </View>

                {/* Payment Status Badge */}
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: getPaymentStatusColors(order.paymentStatus).bg,
                      borderColor: getPaymentStatusColors(order.paymentStatus).border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: getPaymentStatusColors(order.paymentStatus).text },
                    ]}
                  >
                    {order.paymentStatus.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={styles.meta}>
              Placed on {new Date(order.createdAt).toLocaleDateString()} at{' '}
              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>

          {/* COD Pending Store Approval Banner */}
          {isCod && isCodPending && !isCancelled && (
            <View style={[styles.card, styles.paymentPendingCard]}>
              <View style={styles.bannerHeaderRow}>
                <Feather name="clock" size={15} color="#fbbf24" />
                <Text style={[styles.bannerTitle, { color: '#fbbf24' }]}>
                  Cash on Delivery · Awaiting Confirmation
                </Text>
                <View
                  style={[
                    styles.expiryBadge,
                    {
                      backgroundColor: 'rgba(245, 158, 11, 0.2)',
                      borderColor: 'rgba(245, 158, 11, 0.4)',
                    },
                  ]}
                >
                  <Text style={[styles.expiryBadgeText, { color: '#fbbf24' }]}>
                    PENDING APPROVAL
                  </Text>
                </View>
              </View>
              <Text style={styles.bannerDescription}>
                Your Cash on Delivery request has been submitted and is awaiting administrator confirmation before the order is officially placed.
              </Text>
            </View>
          )}

          {/* COD Approved Banner */}
          {isCod && !isCodPending && !isCancelled && order.paymentStatus !== 'PAID' && (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  borderWidth: 1,
                  borderColor: 'rgba(59, 130, 246, 0.3)',
                },
              ]}
            >
              <View style={styles.bannerHeaderRow}>
                <Feather name="check-circle" size={15} color="#60a5fa" />
                <Text style={[styles.bannerTitle, { color: '#60a5fa' }]}>
                  Cash on Delivery · Order Confirmed
                </Text>
                <View
                  style={[
                    styles.expiryBadge,
                    {
                      backgroundColor: 'rgba(59, 130, 246, 0.2)',
                      borderColor: 'rgba(59, 130, 246, 0.4)',
                    },
                  ]}
                >
                  <Text style={[styles.expiryBadgeText, { color: '#60a5fa' }]}>
                    CONFIRMED
                  </Text>
                </View>
              </View>
              <Text style={styles.bannerDescription}>
                Your Cash on Delivery order is confirmed and being prepared for fulfillment. Please prepare ₱{order.total.toLocaleString()} in exact cash for your courier upon delivery.
              </Text>
            </View>
          )}

          {/* Payment Expiration Notice */}
          {isPendingPayment && paymentTime && (
            <View
              style={[
                styles.card,
                paymentTime.expired ? styles.paymentExpiredCard : styles.paymentPendingCard,
              ]}
            >
              <View style={styles.bannerHeaderRow}>
                <Feather
                  name={paymentTime.expired ? 'alert-triangle' : 'clock'}
                  size={15}
                  color={paymentTime.expired ? '#f87171' : '#fbbf24'}
                />
                <Text
                  style={[
                    styles.bannerTitle,
                    { color: paymentTime.expired ? '#f87171' : '#fbbf24' },
                  ]}
                >
                  {paymentTime.expired ? 'Payment Window Expired' : 'Awaiting Payment'}
                </Text>
                <View
                  style={[
                    styles.expiryBadge,
                    {
                      backgroundColor: paymentTime.expired
                        ? 'rgba(239, 68, 68, 0.2)'
                        : 'rgba(245, 158, 11, 0.2)',
                      borderColor: paymentTime.expired
                        ? 'rgba(239, 68, 68, 0.4)'
                        : 'rgba(245, 158, 11, 0.4)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.expiryBadgeText,
                      { color: paymentTime.expired ? '#f87171' : '#fbbf24' },
                    ]}
                  >
                    {paymentTime.expired ? 'EXPIRED' : `Expires in ${paymentTime.text}`}
                  </Text>
                </View>
              </View>
              <Text style={styles.bannerDescription}>
                {paymentTime.expired
                  ? 'The payment processing window for this order has expired. Unpaid orders are automatically cancelled and reserved stock restored.'
                  : 'Please complete payment within 24 hours of placement. Orders without confirmed payment are cancelled automatically once the timer lapses.'}
              </Text>
              {!paymentTime.expired && (
                <TouchableOpacity
                  style={styles.checkPaymentBtn}
                  onPress={() => void fetchOrder()}
                  disabled={refreshing}
                  activeOpacity={0.7}
                >
                  <Feather name="refresh-cw" size={13} color="#fbbf24" />
                  <Text style={styles.checkPaymentBtnText}>
                    {refreshing ? 'Checking...' : 'Check Payment Status'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Cancelled due to expired payment */}
          {isCancelled && order.paymentStatus === 'FAILED' && (
            <View style={[styles.card, styles.paymentExpiredCard]}>
              <View style={styles.bannerHeaderRow}>
                <Feather name="alert-circle" size={15} color="#f87171" />
                <Text style={[styles.bannerTitle, { color: '#f87171' }]}>
                  Payment Expired — Order Cancelled
                </Text>
              </View>
              <Text style={styles.bannerDescription}>
                This order was automatically cancelled because payment was not completed within the 24-hour processing window.
              </Text>
            </View>
          )}

          {/* Live Delivery Map Card */}
          {!isCancelled && <TrackingMapCard order={order} />}

          {/* Shipment Details & Timeline */}
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={styles.cardSectionTitle}>Shipment Details</Text>
              {order.courierName ? (
                <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: '#888' }}>
                  {order.courierName}
                </Text>
              ) : null}
            </View>
            {isCancelled ? (
              <View style={styles.cancelledAlert}>
                <Feather name="alert-circle" size={18} color="#f87171" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cancelledTitle}>Order Cancelled</Text>
                  <Text style={styles.cancelledSub}>This order has been cancelled and will not be fulfilled.</Text>
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.deliveryStatusMain}>{order.deliveryStatus || 'Order Placed'}</Text>
                {!!order.trackingDescription && (
                  <Text style={styles.description}>{order.trackingDescription}</Text>
                )}

                {/* Tracking timeline */}
                <View style={styles.timelineContainer}>
                  {TRACKING_STEPS.map((step, idx) => {
                    const isPassed = idx <= currentStepIndex;
                    const isCurrent = idx === currentStepIndex;
                    const stepLabel =
                      idx === 1 && isCod ? 'Order Confirmed' : step.label;
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
                            {stepLabel}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </View>

          {/* Customer Actions Card */}
          {normStatus === 'PROCESSING' && (
            <View style={styles.card}>
              <Text style={styles.cardSectionTitle}>Order Actions</Text>
              {isCancellable ? (
                <>
                  <Text style={styles.actionNote}>
                    Your order is currently processing. You may cancel it before it is marked as picked up by courier or shipped.
                  </Text>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={handleCancelOrder}
                    disabled={actionLoading}
                    activeOpacity={0.8}
                  >
                    {actionLoading ? (
                      <ActivityIndicator size="small" color="#f87171" />
                    ) : (
                      <Text style={styles.cancelBtnText}>Cancel Order</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.lockedNoteBox}>
                  <Feather name="truck" size={16} color="#888" />
                  <Text style={styles.lockedNoteText}>
                    This order has already been marked as picked up by courier or shipped and can no longer be cancelled.
                  </Text>
                </View>
              )}
            </View>
          )}

          {normStatus === 'DELIVERED' && (
            <View style={styles.card}>
              <Text style={styles.cardSectionTitle}>Delivery Confirmation</Text>
              <Text style={styles.actionNote}>
                Your order has been delivered! Please inspect your camera gear and confirm delivery.
              </Text>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirmReceipt}
                disabled={actionLoading}
                activeOpacity={0.8}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmBtnText}>✓ Confirm Delivery Received</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {normStatus === 'COMPLETED' && (
            <View style={[styles.card, styles.completedCard]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Feather name="check-circle" size={20} color="#34d399" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.completedTitle}>Order Completed</Text>
                  <Text style={styles.completedSub}>Receipt confirmed. Thank you for choosing RePXL!</Text>
                </View>
              </View>
            </View>
          )}

          {/* Items List Card */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Purchased Items ({order.items.length})</Text>
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

          {/* Payment & Shipping Summary */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Order Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValText}>
                ₱{(order.subtotal ?? (order.total - (order.shippingCost ?? 0))).toLocaleString()}.00
              </Text>
            </View>
            {!!order.shippingCost && order.shippingCost > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping Fee</Text>
                <Text style={styles.summaryValText}>₱{order.shippingCost.toLocaleString()}.00</Text>
              </View>
            )}
            {!!order.discount && order.discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount</Text>
                <Text style={[styles.summaryValText, { color: '#4ade80' }]}>
                  -₱{order.discount.toLocaleString()}.00
                </Text>
              </View>
            )}
            <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#2c2c2e', paddingTop: 8, marginTop: 4 }]}>
              <Text style={[styles.summaryLabel, { color: '#fff', fontFamily: 'Inter_700Bold' }]}>Total Amount</Text>
              <Text style={styles.totalValue}>₱{order.total.toLocaleString()}.00</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Payment Method</Text>
              <Text style={styles.summaryValText}>{order.paymentMethod || 'Credit / Debit Card'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Courier</Text>
              <Text style={styles.summaryValText}>{order.courierName || 'Standard Delivery'}</Text>
            </View>
            {!!order.address && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping Address</Text>
                <Text style={[styles.summaryValText, { maxWidth: '60%', textAlign: 'right' }]}>
                  {[order.address, order.city, order.province].filter(Boolean).join(', ')}
                </Text>
              </View>
            )}
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
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  badgeRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  orderNumber: { color: '#fff', fontFamily: 'Inter_800ExtraBold', fontSize: 16 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    letterSpacing: 0.5,
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
  actionNote: {
    color: '#aaa',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  cancelBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  cancelBtnText: {
    color: '#f87171',
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  confirmBtn: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  confirmBtnText: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  completedCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  completedTitle: {
    color: '#34d399',
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  completedSub: {
    color: '#a7f3d0',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  cancelledAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  cancelledTitle: {
    color: '#f87171',
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  cancelledSub: {
    color: '#fca5a5',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
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
    paddingVertical: 3,
  },
  summaryLabel: { color: '#888', fontFamily: 'Inter_400Regular', fontSize: 13 },
  summaryValText: { color: '#ccc', fontFamily: 'Inter_500Medium', fontSize: 13 },
  totalValue: { color: '#c62828', fontFamily: 'Inter_800ExtraBold', fontSize: 17 },
  paymentPendingCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  paymentExpiredCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  bannerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  bannerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    flex: 1,
  },
  expiryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  expiryBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  bannerDescription: {
    color: '#aaa',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  lockedNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 10,
    marginTop: 4,
  },
  lockedNoteText: {
    flex: 1,
    color: '#888',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  checkPaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 10,
  },
  checkPaymentBtnText: {
    color: '#fbbf24',
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
});
