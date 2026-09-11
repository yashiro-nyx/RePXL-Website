import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';

export default function OrderConfirmScreen() {
  const insets = useSafeAreaInsets();
  const { orderNumber } = useLocalSearchParams<{ orderNumber: string }>();
  const { orders } = useApp();
  const order = orders.find((item) => item.orderNumber === orderNumber);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.icon}><Feather name="shield" size={38} color="#c62828" /></View>
      <Text style={styles.heading}>Payment status pending</Text>
      <Text style={styles.sub}>RePXL will update this order only after the server verifies PayMongo's signed payment notification.</Text>
      <View style={styles.card}>
        <View style={styles.row}><Text style={styles.label}>Order number</Text><Text style={styles.value}>{orderNumber ?? 'Unavailable'}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Payment</Text><Text style={styles.value}>{order?.paymentStatus ?? 'PENDING'}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Order status</Text><Text style={styles.value}>{order?.status ?? 'PROCESSING'}</Text></View>
        {order && <View style={styles.row}><Text style={styles.label}>Total</Text><Text style={styles.total}>₱{order.total.toLocaleString()}</Text></View>}
      </View>
      <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(tabs)/account')}><Text style={styles.primaryBtnText}>View My Purchases</Text></TouchableOpacity>
      <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.replace('/(tabs)/home')}><Text style={styles.secondaryBtnText}>Continue Shopping</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 16 },
  icon: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(198,40,40,0.12)', borderWidth: 2, borderColor: '#c62828', alignItems: 'center', justifyContent: 'center' },
  heading: { fontFamily: 'Inter_800ExtraBold', fontSize: 25, color: '#fff', textAlign: 'center' },
  sub: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#777', textAlign: 'center', lineHeight: 22 },
  card: { width: '100%', backgroundColor: '#1c1c1e', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#2c2c2e', gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  label: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#777' },
  value: { fontFamily: 'Inter_700Bold', fontSize: 12, color: '#fff' },
  total: { fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: '#c62828' },
  primaryBtn: { width: '100%', backgroundColor: '#c62828', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  primaryBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#fff' },
  secondaryBtn: { width: '100%', borderRadius: 14, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: '#2c2c2e' },
  secondaryBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#888' },
});
