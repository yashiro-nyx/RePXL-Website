import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { api } from '../src/services/api';
import type { Address } from '../types';

type PayMethod = 'card' | 'gcash';

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    selectedSlugs?: string;
    voucherCode?: string;
    voucherDiscount?: string;
  }>();

  const { user, cart, addresses, addAddress, refreshAccount } = useApp();

  // Filter items based on selectedSlugs from cart if provided
  const checkoutItems = useMemo(() => {
    if (!params.selectedSlugs) return cart;
    try {
      const parsed = JSON.parse(params.selectedSlugs) as string[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const filtered = cart.filter((item) => parsed.includes(item.product.slug));
        return filtered.length > 0 ? filtered : cart;
      }
    } catch {}
    return cart;
  }, [cart, params.selectedSlugs]);

  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];
  const [addressId, setAddressId] = useState(defaultAddress?.id ?? '');
  const [payMethod, setPayMethod] = useState<PayMethod>('card');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Add Address Modal state
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressFormError, setAddressFormError] = useState('');
  const [newFullName, setNewFullName] = useState(user?.name ?? '');
  const [newAddress, setNewAddress] = useState('');
  const [newBarangay, setNewBarangay] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newProvince, setNewProvince] = useState('');
  const [newPostalCode, setNewPostalCode] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newIsDefault, setNewIsDefault] = useState(addresses.length === 0);

  const selectedAddress = addresses.find((address) => address.id === addressId) ?? defaultAddress;

  const subtotal = useMemo(
    () => checkoutItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [checkoutItems]
  );
  const shipping = subtotal > 0 ? 150 : 0;
  const voucherCode = params.voucherCode || null;
  const discount = params.voucherDiscount ? parseFloat(params.voucherDiscount) : 0;
  const total = Math.max(0, subtotal - discount + shipping);

  const handleSaveAddress = async () => {
    if (!newFullName.trim() || !newAddress.trim() || !newBarangay.trim() || !newCity.trim() || !newProvince.trim() || !newPostalCode.trim() || !newPhone.trim()) {
      setAddressFormError('Please fill in all address fields.');
      return;
    }
    setSavingAddress(true);
    setAddressFormError('');
    try {
      const created = await addAddress({
        fullName: newFullName.trim(),
        address: newAddress.trim(),
        barangay: newBarangay.trim(),
        city: newCity.trim(),
        province: newProvince.trim(),
        postalCode: newPostalCode.trim(),
        phone: newPhone.trim(),
        isDefault: newIsDefault,
      });
      setAddressId(created.id);
      setShowAddressModal(false);
    } catch (err) {
      setAddressFormError(err instanceof Error ? err.message : 'Unable to save address.');
    } finally {
      setSavingAddress(false);
    }
  };

  const checkout = async () => {
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!selectedAddress) {
      setError('Please select or add a delivery address.');
      return;
    }
    if (checkoutItems.length === 0) {
      setError('Your checkout cart is empty.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const result = await api.checkout(
        selectedAddress,
        checkoutItems.map((item) => item.product.slug),
        payMethod,
        voucherCode,
        shipping
      );
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
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Secure Checkout</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}>
        {/* Delivery Address Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <TouchableOpacity
            onPress={() => {
              setAddressFormError('');
              setShowAddressModal(true);
            }}
            style={styles.addAddressInlineBtn}
            activeOpacity={0.7}
          >
            <Feather name="plus" size={13} color="#c62828" />
            <Text style={styles.addAddressInlineText}>Add New</Text>
          </TouchableOpacity>
        </View>

        {addresses.length === 0 ? (
          <View style={styles.notice}>
            <Feather name="map-pin" size={22} color="#c62828" />
            <Text style={styles.noticeTitle}>No delivery address saved</Text>
            <Text style={styles.noticeText}>
              Add an address below to proceed with your order.
            </Text>
            <TouchableOpacity
              style={styles.noticeBtn}
              onPress={() => {
                setAddressFormError('');
                setShowAddressModal(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.noticeBtnText}>+ Add Delivery Address</Text>
            </TouchableOpacity>
          </View>
        ) : (
          addresses.map((address) => (
            <TouchableOpacity
              key={address.id}
              style={[
                styles.option,
                address.id === selectedAddress?.id && styles.optionActive,
              ]}
              onPress={() => setAddressId(address.id)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.radio,
                  address.id === selectedAddress?.id && styles.radioActive,
                ]}
              />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.optionTitle}>{address.fullName}</Text>
                  {address.isDefault && (
                    <Text style={styles.defaultBadge}>DEFAULT</Text>
                  )}
                </View>
                <Text style={styles.optionText}>
                  {address.address}, {address.barangay}, {address.city}, {address.province}{' '}
                  {address.postalCode}
                </Text>
                <Text style={styles.phoneText}>{address.phone}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Payment Method */}
        <Text style={styles.sectionTitle}>Payment Method</Text>
        {(['card', 'gcash'] as PayMethod[]).map((method) => (
          <TouchableOpacity
            key={method}
            style={[styles.option, payMethod === method && styles.optionActive]}
            onPress={() => setPayMethod(method)}
            activeOpacity={0.8}
          >
            <Feather
              name={method === 'card' ? 'credit-card' : 'smartphone'}
              size={19}
              color={payMethod === method ? '#c62828' : '#777'}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>
                {method === 'card' ? 'Credit / Debit Card' : 'GCash'}
              </Text>
              <Text style={styles.optionText}>
                Secured hosted checkout via PayMongo.
              </Text>
            </View>
            <View style={[styles.radio, payMethod === method && styles.radioActive]} />
          </TouchableOpacity>
        ))}

        {/* Order Summary */}
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          {checkoutItems.map((item) => (
            <View key={item.id} style={styles.summaryRow}>
              <Text style={styles.summaryLabel} numberOfLines={1}>
                {item.product.name} × {item.quantity}
              </Text>
              <Text style={styles.summaryValue}>
                ₱{(item.product.price * item.quantity).toLocaleString()}
              </Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₱{subtotal.toLocaleString()}.00</Text>
          </View>
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: '#4caf50' }]}>
                Voucher ({voucherCode})
              </Text>
              <Text style={[styles.summaryValue, { color: '#4caf50' }]}>
                −₱{discount.toLocaleString()}.00
              </Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping (Standard Delivery)</Text>
            <Text style={styles.summaryValue}>₱{shipping}.00</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₱{total.toLocaleString()}.00</Text>
          </View>
          <Text style={styles.disclaimerText}>
            Stock is reserved and verified securely by PayMongo upon payment.
          </Text>
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      {/* Fixed Checkout Action */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.cta, submitting && { opacity: 0.6 }]}
          onPress={() => {
            void checkout();
          }}
          disabled={submitting || !selectedAddress || checkoutItems.length === 0}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaText}>
              Pay ₱{total.toLocaleString()} with {payMethod === 'card' ? 'Card' : 'GCash'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Add Address Modal */}
      <Modal visible={showAddressModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalSheetHeader}>
              <Text style={styles.modalSheetTitle}>Add Delivery Address</Text>
              <TouchableOpacity
                onPress={() => setShowAddressModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={20} color="#888" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 24, gap: 10 }}>
              <Text style={styles.fieldLabel}>FULL NAME</Text>
              <TextInput
                value={newFullName}
                onChangeText={setNewFullName}
                placeholder="Recipient's full name"
                placeholderTextColor="#555"
                style={styles.modalInput}
              />

              <Text style={styles.fieldLabel}>STREET ADDRESS</Text>
              <TextInput
                value={newAddress}
                onChangeText={setNewAddress}
                placeholder="House/Unit #, Street, Village"
                placeholderTextColor="#555"
                style={styles.modalInput}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>BARANGAY</Text>
                  <TextInput
                    value={newBarangay}
                    onChangeText={setNewBarangay}
                    placeholder="Barangay"
                    placeholderTextColor="#555"
                    style={styles.modalInput}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>CITY / MUNICIPALITY</Text>
                  <TextInput
                    value={newCity}
                    onChangeText={setNewCity}
                    placeholder="City"
                    placeholderTextColor="#555"
                    style={styles.modalInput}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>PROVINCE</Text>
                  <TextInput
                    value={newProvince}
                    onChangeText={setNewProvince}
                    placeholder="Province"
                    placeholderTextColor="#555"
                    style={styles.modalInput}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>POSTAL CODE</Text>
                  <TextInput
                    value={newPostalCode}
                    onChangeText={setNewPostalCode}
                    placeholder="e.g. 1000"
                    placeholderTextColor="#555"
                    keyboardType="numeric"
                    style={styles.modalInput}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
              <TextInput
                value={newPhone}
                onChangeText={setNewPhone}
                placeholder="0917XXXXXXX"
                placeholderTextColor="#555"
                keyboardType="phone-pad"
                style={styles.modalInput}
              />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Set as default delivery address</Text>
                <Switch
                  value={newIsDefault}
                  onValueChange={setNewIsDefault}
                  trackColor={{ false: '#333', true: '#c62828' }}
                  thumbColor="#fff"
                />
              </View>

              {!!addressFormError && (
                <Text style={styles.formErrorText}>{addressFormError}</Text>
              )}

              <TouchableOpacity
                style={[styles.saveAddressBtn, savingAddress && { opacity: 0.6 }]}
                onPress={handleSaveAddress}
                disabled={savingAddress}
                activeOpacity={0.85}
              >
                {savingAddress ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveAddressText}>Save Address</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#fff' },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#fff', marginTop: 18, marginBottom: 10 },
  addAddressInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c62828',
  },
  addAddressInlineText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#c62828',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1c1c1e',
    borderWidth: 1,
    borderColor: '#2c2c2e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 9,
  },
  optionActive: { borderColor: '#8b2020' },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#555',
  },
  radioActive: { borderColor: '#c62828', backgroundColor: '#c62828' },
  optionTitle: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#fff' },
  defaultBadge: {
    color: '#4caf50',
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    borderWidth: 1,
    borderColor: '#4caf50',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  optionText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#777',
    lineHeight: 17,
    marginTop: 3,
  },
  phoneText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  notice: {
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  noticeTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#fff',
  },
  noticeText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    lineHeight: 18,
  },
  noticeBtn: {
    backgroundColor: '#c62828',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginTop: 4,
  },
  noticeBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#fff',
  },
  summary: {
    backgroundColor: '#1c1c1e',
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    gap: 9,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  summaryTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#fff', marginBottom: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  summaryLabel: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 12, color: '#888' },
  summaryValue: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#fff' },
  divider: { height: 1, backgroundColor: '#2c2c2e', marginVertical: 4 },
  totalLabel: { fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: '#fff' },
  totalValue: { fontFamily: 'Inter_800ExtraBold', fontSize: 16, color: '#c62828' },
  disclaimerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: '#666',
    lineHeight: 15,
    marginTop: 4,
  },
  error: {
    color: '#f44336',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 12,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#0d0d0d',
    borderTopWidth: 1,
    borderTopColor: '#1c1c1e',
  },
  cta: {
    backgroundColor: '#c62828',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 15 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 18,
    maxHeight: '85%',
  },
  modalSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2e',
  },
  modalSheetTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#fff',
  },
  fieldLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#777',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  modalInput: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#2c2c2e',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
    paddingHorizontal: 2,
  },
  switchLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#ccc',
  },
  formErrorText: {
    color: '#f44336',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 4,
  },
  saveAddressBtn: {
    backgroundColor: '#c62828',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveAddressText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#fff',
  },
});
