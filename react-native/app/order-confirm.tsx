import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';

const ORDER_NUMBER = 'RPX-' + Math.floor(100000 + Math.random() * 900000);

export default function OrderConfirmScreen() {
  const insets = useSafeAreaInsets();
  const { cart, clearCart } = useApp();
  const total = cart.reduce((s, i) => s + i.product.price * i.quantity, 0) + 150;
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  const handleTrack = () => { clearCart(); router.replace('/(tabs)/account'); };
  const handleContinue = () => { clearCart(); router.replace('/(tabs)/home'); };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.glow} />

      <View style={styles.content}>
        <View style={styles.checkCircle}>
          <Feather name="check" size={38} color="#c62828" />
        </View>

        <Text style={styles.heading}>Order Placed!</Text>
        <Text style={styles.sub}>Your order has been confirmed. You'll receive a confirmation shortly.</Text>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Order Number</Text>
            <Text style={styles.cardValue}>{ORDER_NUMBER}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Items</Text>
            <Text style={styles.cardValue}>{itemCount} camera{itemCount !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Estimated Delivery</Text>
            <Text style={styles.cardValue}>3–5 business days</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.cardRow}>
            <Text style={[styles.cardLabel, { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#fff' }]}>Total Paid</Text>
            <Text style={styles.totalVal}>₱{total.toLocaleString()}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleTrack} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>Track My Order</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={handleContinue} activeOpacity={0.85}>
          <Text style={styles.secondaryBtnText}>Continue Shopping</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  glow: { position: 'absolute', top: '25%', width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(198,40,40,0.08)' },
  content: { alignItems: 'center', gap: 16, width: '100%' },
  checkCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(198,40,40,0.12)', borderWidth: 2, borderColor: '#c62828', alignItems: 'center', justifyContent: 'center' },
  heading: { fontFamily: 'Inter_800ExtraBold', fontSize: 26, color: '#fff', marginTop: 4 },
  sub: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22 },
  card: { width: '100%', backgroundColor: '#1c1c1e', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#2c2c2e', gap: 10 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#666' },
  cardValue: { fontFamily: 'Inter_700Bold', fontSize: 12, color: '#fff' },
  divider: { height: 1, backgroundColor: '#2c2c2e' },
  totalVal: { fontFamily: 'Inter_800ExtraBold', fontSize: 16, color: '#c62828' },
  primaryBtn: { width: '100%', backgroundColor: '#c62828', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  primaryBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#fff' },
  secondaryBtn: { width: '100%', borderRadius: 14, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: '#2c2c2e' },
  secondaryBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#888' },
});
