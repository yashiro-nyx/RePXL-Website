import { useEffect, useState } from 'react';
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
import { useApp } from '../context/AppContext';
import { api } from '../src/services/api';
import { getOrderStatusColors, getOrderStatusLabel, type Order } from '../types';

export default function OrderConfirmScreen() {
  const insets = useSafeAreaInsets();
  const { orderNumber } = useLocalSearchParams<{ orderNumber: string }>();
  const { orders } = useApp();

  const foundOrder = orders.find((item) => item.orderNumber === orderNumber);
  const [order, setOrder] = useState<Order | null>(foundOrder ?? null);
  const [loading, setLoading] = useState(!foundOrder);

  useEffect(() => {
    if (!order && orderNumber) {
      setLoading(true);
      api
        .order(orderNumber)
        .then((data) => setOrder(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [order, orderNumber]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Confirmed Header */}
        <View style={styles.headerArea}>
          <View style={styles.iconCircle}>
            <Feather name="check" size={36} color="#4caf50" />
          </View>
          <Text style={styles.heading}>Order Confirmed!</Text>
          <Text style={styles.sub}>
            Thank you for your purchase. We&apos;re getting your camera gear ready for dispatch.
          </Text>
        </View>

        {/* Order Receipt Card */}
        <View style={styles.receiptCard}>
          <View style={styles.receiptHeader}>
            <Text style={styles.brandTitle}>RePXL</Text>
            <Text style={styles.receiptSubtitle}>ORDER RECEIPT</Text>
          </View>

          {/* Meta Grid */}
          <View style={styles.metaGrid}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>ORDER NUMBER</Text>
              <Text style={styles.orderNumberText}>{orderNumber ?? 'RPX-UNKNOWN'}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>ORDER DATE</Text>
              <Text style={styles.metaValue}>
                {order?.createdAt
                  ? new Date(order.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : new Date().toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
              </Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>ORDER STATUS</Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: getOrderStatusColors(order?.status).bg,
                    borderColor: getOrderStatusColors(order?.status).border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: getOrderStatusColors(order?.status).text },
                  ]}
                >
                  {getOrderStatusLabel(order?.status).toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>PAYMENT</Text>
              <Text style={styles.metaValue}>
                {order?.paymentMethod || 'Credit / Debit Card'}
              </Text>
            </View>
          </View>

          {/* Shipping & Delivery */}
          {(order?.courierName || order?.address) && (
            <View style={styles.sectionBlock}>
              <Text style={styles.blockTitle}>SHIPPING & DELIVERY</Text>
              {order.courierName && (
                <Text style={styles.courierLine}>
                  {order.courierName}
                  {order.courierEstimate ? ` · ${order.courierEstimate}` : ''}
                </Text>
              )}
              {order.address && (
                <Text style={styles.addressLine}>
                  {order.fullName ? `${order.fullName}\n` : ''}
                  {order.address}
                  {order.barangay ? `, ${order.barangay}` : ''}
                  {order.city ? `, ${order.city}` : ''}
                  {order.province ? `, ${order.province}` : ''}
                  {order.postalCode ? ` ${order.postalCode}` : ''}
                </Text>
              )}
            </View>
          )}

          {/* Purchased Items List */}
          {order?.items && order.items.length > 0 && (
            <View style={styles.sectionBlock}>
              <Text style={styles.blockTitle}>ITEMS ORDERED</Text>
              {order.items.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  {item.product?.image ? (
                    <Image source={{ uri: item.product.image }} style={styles.itemThumb} />
                  ) : (
                    <View style={styles.itemThumbPlaceholder}>
                      <Feather name="camera" size={16} color="#666" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.product?.name ?? 'Camera Gear'}
                    </Text>
                    <Text style={styles.itemMeta}>Qty: {item.quantity}</Text>
                  </View>
                  <Text style={styles.itemPrice}>
                    ₱{(item.price * item.quantity).toLocaleString()}.00
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Financial Breakdown */}
          <View style={[styles.sectionBlock, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            {order?.subtotal !== undefined && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryVal}>₱{order.subtotal.toLocaleString()}.00</Text>
              </View>
            )}
            {order?.discount !== undefined && order.discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: '#4caf50' }]}>
                  Discount{order.voucherCode ? ` (${order.voucherCode})` : ''}
                </Text>
                <Text style={[styles.summaryVal, { color: '#4caf50' }]}>
                  −₱{order.discount.toLocaleString()}.00
                </Text>
              </View>
            )}
            {order?.shippingCost !== undefined && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping</Text>
                <Text style={styles.summaryVal}>₱{order.shippingCost.toLocaleString()}.00</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Grand Total</Text>
              <Text style={styles.totalVal}>₱{(order?.total ?? 0).toLocaleString()}.00</Text>
            </View>
          </View>
        </View>

        {loading && (
          <ActivityIndicator color="#c62828" style={{ marginVertical: 12 }} />
        )}

        {/* Action Buttons */}
        <View style={styles.actionsArea}>
          {orderNumber && (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() =>
                router.push({ pathname: '/order', params: { orderNumber } })
              }
              activeOpacity={0.85}
            >
              <Feather name="navigation" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>Track Order</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace('/(tabs)/account')}
            activeOpacity={0.8}
          >
            <Feather name="archive" size={15} color="#ccc" />
            <Text style={styles.secondaryBtnText}>View My Purchases</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.textBtn}
            onPress={() => router.replace('/(tabs)/home')}
            activeOpacity={0.7}
          >
            <Text style={styles.textBtnText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  headerArea: { alignItems: 'center', marginBottom: 20, paddingHorizontal: 12 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(76,175,80,0.12)',
    borderWidth: 2,
    borderColor: '#4caf50',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heading: { fontFamily: 'Inter_800ExtraBold', fontSize: 24, color: '#fff', textAlign: 'center' },
  sub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
    maxWidth: 320,
  },
  receiptCard: {
    backgroundColor: '#161618',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    marginBottom: 20,
  },
  receiptHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2e',
    paddingBottom: 14,
    marginBottom: 16,
  },
  brandTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 22, color: '#fff' },
  receiptSubtitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#777',
    letterSpacing: 2,
    marginTop: 2,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2e',
    paddingBottom: 16,
    marginBottom: 16,
  },
  metaCol: { width: '50%' },
  metaLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 9, color: '#666', letterSpacing: 0.8 },
  orderNumberText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#c62828',
    marginTop: 3,
  },
  metaValue: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#ddd', marginTop: 3 },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(76,175,80,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 4,
  },
  statusBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 10, color: '#4caf50' },
  sectionBlock: {
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2e',
    paddingBottom: 14,
    marginBottom: 14,
  },
  blockTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#777',
    letterSpacing: 1,
    marginBottom: 8,
  },
  courierLine: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#ddd', marginBottom: 4 },
  addressLine: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#999', lineHeight: 18 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 6,
  },
  itemThumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#222' },
  itemThumbPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#fff' },
  itemMeta: { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#777', marginTop: 2 },
  itemPrice: { fontFamily: 'Inter_700Bold', fontSize: 12, color: '#fff' },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  summaryLabel: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#888' },
  summaryVal: { fontFamily: 'Inter_500Medium', fontSize: 12, color: '#ccc' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2c2c2e',
  },
  totalLabel: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#fff' },
  totalVal: { fontFamily: 'Inter_800ExtraBold', fontSize: 16, color: '#c62828' },
  actionsArea: { gap: 10 },
  primaryBtn: {
    backgroundColor: '#c62828',
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#fff' },
  secondaryBtn: {
    backgroundColor: '#1c1c1e',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#ddd' },
  textBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  textBtnText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#888' },
});
