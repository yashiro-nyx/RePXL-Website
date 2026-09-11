import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../src/services/api';
import type { Order } from '../types';

export default function OrderScreen() {
  const insets = useSafeAreaInsets();
  const { orderNumber } = useLocalSearchParams<{ orderNumber: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderNumber) return;
    api.order(orderNumber).then(setOrder).catch((reason) => {
      setError(reason instanceof Error ? reason.message : 'Unable to load this order.');
    });
  }, [orderNumber]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Feather name="arrow-left" size={22} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={{ width: 22 }} />
      </View>
      {!order ? (
        <View style={styles.center}>{error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator color="#c62828" />}</View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.orderNumber}>{order.orderNumber}</Text>
            <Text style={styles.meta}>Order {order.status.toLowerCase()} · Payment {order.paymentStatus.toLowerCase()}</Text>
            <Text style={styles.meta}>{order.deliveryStatus}</Text>
            <Text style={styles.description}>{order.trackingDescription}</Text>
          </View>
          {order.items.map((item) => (
            <View key={item.id} style={styles.item}>
              <Image source={{ uri: item.product.image }} style={styles.image} />
              <View style={{ flex: 1 }}><Text style={styles.name}>{item.product.name}</Text><Text style={styles.meta}>Quantity {item.quantity}</Text></View>
              <Text style={styles.price}>₱{(item.price * item.quantity).toLocaleString()}</Text>
            </View>
          ))}
          <View style={styles.totalRow}><Text style={styles.name}>Total</Text><Text style={styles.total}>₱{order.total.toLocaleString()}</Text></View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { color: '#f44336', textAlign: 'center' },
  content: { padding: 20, gap: 12 },
  card: { backgroundColor: '#1c1c1e', borderRadius: 14, borderWidth: 1, borderColor: '#2c2c2e', padding: 16, gap: 6 },
  orderNumber: { color: '#fff', fontFamily: 'Inter_800ExtraBold', fontSize: 17 },
  meta: { color: '#777', fontFamily: 'Inter_400Regular', fontSize: 12 },
  description: { color: '#bbb', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginTop: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1c1c1e', borderRadius: 12, padding: 12 },
  image: { width: 58, height: 58, borderRadius: 9, backgroundColor: '#111' },
  name: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 13 },
  price: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  total: { color: '#c62828', fontFamily: 'Inter_800ExtraBold', fontSize: 17 },
});
