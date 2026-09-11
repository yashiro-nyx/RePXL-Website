import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { api } from '../src/services/api';

type PayMethod = 'card' | 'gcash';

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { user, cart, addresses, refreshAccount } = useApp();
  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];
  const [addressId, setAddressId] = useState(defaultAddress?.id ?? '');
  const [payMethod, setPayMethod] = useState<PayMethod>('card');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const selectedAddress = addresses.find((address) => address.id === addressId) ?? defaultAddress;
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0), [cart]);

  const checkout = async () => {
    if (!user) { router.replace('/login'); return; }
    if (!selectedAddress) { setError('Add a delivery address on your RePXL account before checkout.'); return; }
    if (cart.length === 0) { setError('Your synced cart is empty.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const result = await api.checkout(selectedAddress, cart.map((item) => item.product.slug), payMethod);
      await WebBrowser.openBrowserAsync(result.checkoutUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
      });
      await refreshAccount();
      router.replace({ pathname: '/order-confirm', params: { orderNumber: result.orderNumber } });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to start secure checkout.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#4a0808', '#1a0202', 'transparent']} style={styles.gradient} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Feather name="arrow-left" size={22} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Secure Checkout</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 130 }}>
        <Text style={styles.sectionTitle}>Delivery address</Text>
        {addresses.length === 0 ? (
          <View style={styles.notice}>
            <Feather name="map-pin" size={20} color="#c62828" />
            <Text style={styles.noticeText}>No address is saved. Add one on the RePXL website, then refresh your account in the app.</Text>
          </View>
        ) : addresses.map((address) => (
          <TouchableOpacity key={address.id} style={[styles.option, address.id === selectedAddress?.id && styles.optionActive]} onPress={() => setAddressId(address.id)}>
            <View style={[styles.radio, address.id === selectedAddress?.id && styles.radioActive]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>{address.fullName}</Text>
              <Text style={styles.optionText}>{address.address}, {address.barangay}, {address.city}, {address.province} {address.postalCode}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Payment method</Text>
        {(['card', 'gcash'] as PayMethod[]).map((method) => (
          <TouchableOpacity key={method} style={[styles.option, payMethod === method && styles.optionActive]} onPress={() => setPayMethod(method)}>
            <Feather name={method === 'card' ? 'credit-card' : 'smartphone'} size={19} color={payMethod === method ? '#c62828' : '#777'} />
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>{method === 'card' ? 'Card' : 'GCash'}</Text>
              <Text style={styles.optionText}>Enter payment details only on PayMongo's hosted checkout.</Text>
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Order summary</Text>
          {cart.map((item) => (
            <View key={item.id} style={styles.summaryRow}>
              <Text style={styles.summaryLabel} numberOfLines={1}>{item.product.name} × {item.quantity}</Text>
              <Text style={styles.summaryValue}>₱{(item.product.price * item.quantity).toLocaleString()}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.summaryRow}><Text style={styles.total}>Subtotal</Text><Text style={styles.total}>₱{subtotal.toLocaleString()}</Text></View>
          <Text style={styles.optionText}>The backend validates current stock and creates the final PayMongo checkout session.</Text>
        </View>
        {!!error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={[styles.cta, submitting && { opacity: 0.6 }]} onPress={() => { void checkout(); }} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Continue to PayMongo</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 18 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#fff' },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#fff', marginTop: 18, marginBottom: 10 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1c1c1e', borderWidth: 1, borderColor: '#2c2c2e', borderRadius: 12, padding: 14, marginBottom: 9 },
  optionActive: { borderColor: '#8b2020' },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#555' },
  radioActive: { borderColor: '#c62828', backgroundColor: '#c62828' },
  optionTitle: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#fff' },
  optionText: { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#777', lineHeight: 17, marginTop: 3 },
  notice: { alignItems: 'center', gap: 10, backgroundColor: '#1c1c1e', borderRadius: 12, padding: 18 },
  noticeText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#aaa', textAlign: 'center', lineHeight: 18 },
  summary: { backgroundColor: '#1c1c1e', borderRadius: 14, padding: 16, marginTop: 18, gap: 9 },
  summaryTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#fff', marginBottom: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  summaryLabel: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 12, color: '#888' },
  summaryValue: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#fff' },
  divider: { height: 1, backgroundColor: '#2c2c2e', marginVertical: 4 },
  total: { fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: '#fff' },
  error: { color: '#f44336', fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 16 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: '#0d0d0d', borderTopWidth: 1, borderTopColor: '#1c1c1e' },
  cta: { backgroundColor: '#c62828', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  ctaText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 15 },
});
