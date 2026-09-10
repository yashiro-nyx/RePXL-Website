import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';

type Step = 'shipping' | 'payment';
type PayMethod = 'card' | 'gcash' | 'cod';

function Field({ label, value, onChange, placeholder, keyboardType = 'default', secureTextEntry = false }: any) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#444" style={styles.input} keyboardType={keyboardType} secureTextEntry={secureTextEntry} autoCapitalize="none" />
    </View>
  );
}

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { cart, user } = useApp();
  const [step, setStep] = useState<Step>('shipping');
  const [payMethod, setPayMethod] = useState<PayMethod>('card');
  const [form, setForm] = useState({ firstName: user?.name.split(' ')[0] ?? '', lastName: user?.name.split(' ')[1] ?? '', address: '', city: '', province: '', zip: '', phone: '', cardNum: '', cardName: '', expiry: '', cvv: '' });
  const set = (k: keyof typeof form) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const total = subtotal + 150;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient colors={['#4a0808', '#1a0202', 'transparent']} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={styles.gradient} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => step === 'payment' ? setStep('shipping') : router.back()} activeOpacity={0.7}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 22 }} />
        </View>

        {/* Progress */}
        <View style={styles.progress}>
          {(['shipping', 'payment'] as Step[]).map((s, i) => (
            <View key={s} style={{ flex: 1 }}>
              <View style={[styles.progressBar, { backgroundColor: step === s || (s === 'shipping') ? '#c62828' : '#2c2c2e' }]} />
              <Text style={[styles.progressLabel, { color: step === s ? '#c62828' : '#555' }]}>{i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}</Text>
            </View>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          {step === 'shipping' ? (
            <View style={{ gap: 14 }}>
              <Text style={styles.sectionTitle}>Shipping Information</Text>
              <View style={styles.row}>
                <View style={{ flex: 1 }}><Field label="FIRST NAME" value={form.firstName} onChange={set('firstName')} placeholder="Alex" /></View>
                <View style={{ flex: 1 }}><Field label="LAST NAME" value={form.lastName} onChange={set('lastName')} placeholder="Reyes" /></View>
              </View>
              <Field label="STREET ADDRESS" value={form.address} onChange={set('address')} placeholder="123 Magsaysay Ave" />
              <Field label="CITY / MUNICIPALITY" value={form.city} onChange={set('city')} placeholder="Quezon City" />
              <View style={styles.row}>
                <View style={{ flex: 1 }}><Field label="PROVINCE" value={form.province} onChange={set('province')} placeholder="Metro Manila" /></View>
                <View style={{ flex: 1 }}><Field label="ZIP" value={form.zip} onChange={set('zip')} placeholder="1100" keyboardType="number-pad" /></View>
              </View>
              <Field label="PHONE" value={form.phone} onChange={set('phone')} placeholder="+63 912 345 6789" keyboardType="phone-pad" />
              <View style={styles.shippingOption}>
                <Feather name="truck" size={16} color="#888" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#fff' }}>Standard Delivery</Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#666', marginTop: 2 }}>3–5 business days · ₱150.00</Text>
                </View>
                <View style={styles.radioActive}><View style={styles.radioDot} /></View>
              </View>
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              <Text style={styles.sectionTitle}>Payment Method</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {([['card', 'Card'], ['gcash', 'GCash'], ['cod', 'Cash on Delivery']] as [PayMethod, string][]).map(([id, label]) => (
                  <TouchableOpacity key={id} onPress={() => setPayMethod(id)} style={[styles.payTab, payMethod === id && styles.payTabActive]} activeOpacity={0.8}>
                    <Text style={[styles.payTabText, payMethod === id && styles.payTabTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {payMethod === 'card' && (
                <View style={{ gap: 14 }}>
                  <Field label="CARD NUMBER" value={form.cardNum} onChange={set('cardNum')} placeholder="4242 4242 4242 4242" keyboardType="number-pad" />
                  <Field label="NAME ON CARD" value={form.cardName} onChange={set('cardName')} placeholder="ALEX REYES" />
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}><Field label="EXPIRY" value={form.expiry} onChange={set('expiry')} placeholder="MM/YY" keyboardType="number-pad" /></View>
                    <View style={{ flex: 1 }}><Field label="CVV" value={form.cvv} onChange={set('cvv')} placeholder="123" keyboardType="number-pad" secureTextEntry /></View>
                  </View>
                </View>
              )}

              {payMethod === 'gcash' && (
                <View style={styles.altPay}>
                  <View style={styles.gcashIcon}><Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 22, color: '#fff' }}>G</Text></View>
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: '#fff' }}>Pay via GCash</Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#666', textAlign: 'center', lineHeight: 18 }}>You will be redirected to GCash after placing your order.</Text>
                </View>
              )}

              {payMethod === 'cod' && (
                <View style={styles.codCard}>
                  <Feather name="credit-card" size={20} color="#888" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#fff' }}>Cash on Delivery</Text>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#666', marginTop: 4, lineHeight: 18 }}>Pay with cash when your order arrives. Please prepare exact change.</Text>
                  </View>
                </View>
              )}

              {/* Order summary */}
              <View style={styles.orderSummary}>
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: '#fff', marginBottom: 10 }}>Order Summary</Text>
                {cart.map(({ product: p, quantity }) => (
                  <View key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#888', flex: 1 }} numberOfLines={1}>{p.name} × {quantity}</Text>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#fff' }}>₱{(p.price * quantity).toLocaleString()}</Text>
                  </View>
                ))}
                <View style={{ height: 1, backgroundColor: '#2c2c2e', marginVertical: 8 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#888' }}>Shipping</Text>
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#fff' }}>₱150</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: '#fff' }}>Total</Text>
                  <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: '#fff' }}>₱{total.toLocaleString()}</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => step === 'shipping' ? setStep('payment') : router.replace('/order-confirm')}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaBtnText}>{step === 'shipping' ? 'Continue to Payment' : `Place Order — ₱${total.toLocaleString()}`}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  gradient: { position: 'absolute', top: 0, right: 0, width: 250, height: 250 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 18 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#fff' },
  progress: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 20 },
  progressBar: { height: 3, borderRadius: 99, marginBottom: 4 },
  progressLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, textTransform: 'capitalize' },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#fff', marginBottom: 4 },
  field: {},
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#666', letterSpacing: 0.5, marginBottom: 6 },
  input: { backgroundColor: '#1c1c1e', borderWidth: 1, borderColor: '#2c2c2e', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#fff', fontFamily: 'Inter_400Regular' },
  row: { flexDirection: 'row', gap: 12 },
  shippingOption: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1c1c1e', borderWidth: 1, borderColor: '#2c2c2e', borderRadius: 12, padding: 14, marginTop: 4 },
  radioActive: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#c62828', alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  payTab: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 10, backgroundColor: '#1c1c1e', borderWidth: 1, borderColor: '#2c2c2e', alignItems: 'center' },
  payTabActive: { backgroundColor: '#c62828', borderColor: '#c62828' },
  payTabText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#888' },
  payTabTextActive: { color: '#fff' },
  altPay: { backgroundColor: '#1c1c1e', borderWidth: 1, borderColor: '#2c2c2e', borderRadius: 12, padding: 20, alignItems: 'center', gap: 10 },
  gcashIcon: { width: 60, height: 60, borderRadius: 14, backgroundColor: '#007bff', alignItems: 'center', justifyContent: 'center' },
  codCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#1c1c1e', borderWidth: 1, borderColor: '#2c2c2e', borderRadius: 12, padding: 14 },
  orderSummary: { backgroundColor: '#1c1c1e', borderWidth: 1, borderColor: '#2c2c2e', borderRadius: 12, padding: 14 },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1c1c1e' },
  ctaBtn: { backgroundColor: '#c62828', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  ctaBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#fff', letterSpacing: 0.3 },
});
