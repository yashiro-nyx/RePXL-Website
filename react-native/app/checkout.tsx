import { useEffect, useMemo, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useApp } from '../context/AppContext';
import { api, API_BASE_URL } from '../src/services/api';
import { getSafeTopInset, getSafeBottomInset } from '../src/utils/layout';
import type { Address } from '../types';

interface CourierOption {
  id: string;
  name: string;
  price: number;
  estimate: string;
}

const COURIERS: CourierOption[] = [
  { id: 'jnt', name: 'J&T Express', price: 150, estimate: '2–3 business days' },
  { id: 'lbc', name: 'LBC Express', price: 200, estimate: '1–2 business days' },
  { id: 'ninja', name: 'Ninja Van', price: 120, estimate: '3–5 business days' },
  { id: 'grab', name: 'Grab Express', price: 300, estimate: 'Same day (metro only)' },
];

type PayMethod = 'card' | 'gcash' | 'cod';

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const safeTop = getSafeTopInset(insets);
  const safeBottom = getSafeBottomInset(insets, 14);
  const params = useLocalSearchParams<{
    selectedSlugs?: string;
    voucherCode?: string;
    voucherDiscount?: string;
  }>();

  const { user, cart, addresses, addAddress, updateAddress, refreshAccount } = useApp();

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
  const [selectedCourierId, setSelectedCourierId] = useState<string>(COURIERS[0].id);
  const [payMethod, setPayMethod] = useState<PayMethod>('card');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // In-app Card Payment State
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardholderName, setCardholderName] = useState(user?.name ?? '');

  // In-app GCash State
  const [gcashPhone, setGcashPhone] = useState(defaultAddress?.phone ?? '');

  // Add/Edit Address Modal state
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
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

  const openAddAddressModal = () => {
    setEditingAddressId(null);
    setNewFullName(user?.name ?? '');
    setNewAddress('');
    setNewBarangay('');
    setNewCity('');
    setNewProvince('');
    setNewPostalCode('');
    setNewPhone('');
    setNewIsDefault(addresses.length === 0);
    setAddressFormError('');
    setShowAddressModal(true);
  };

  const openEditAddressModal = (addr: Address) => {
    setEditingAddressId(addr.id);
    setNewFullName(addr.fullName);
    setNewAddress(addr.address);
    setNewBarangay(addr.barangay || '');
    setNewCity(addr.city);
    setNewProvince(addr.province || '');
    setNewPostalCode(addr.postalCode);
    setNewPhone(addr.phone);
    setNewIsDefault(addr.isDefault);
    setAddressFormError('');
    setShowAddressModal(true);
  };

  const selectedAddress = addresses.find((address) => address.id === addressId) ?? defaultAddress;
  const selectedCourier = COURIERS.find((c) => c.id === selectedCourierId) ?? COURIERS[0];

  const subtotal = useMemo(
    () => checkoutItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [checkoutItems]
  );
  const shipping = subtotal > 0 ? selectedCourier.price : 0;
  const voucherCode = params.voucherCode || null;
  const discount = params.voucherDiscount ? parseFloat(params.voucherDiscount) : 0;
  const total = Math.max(0, subtotal - discount + shipping);

  // Formatting helpers
  const handleCardNumberChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 16);
    const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  const handleExpiryChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      setCardExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    } else {
      setCardExpiry(digits);
    }
  };

  const handleCvcChange = (text: string) => {
    setCardCvc(text.replace(/\D/g, '').slice(0, 4));
  };

  const handleSaveAddress = async () => {
    if (
      !newFullName.trim() ||
      !newAddress.trim() ||
      !newBarangay.trim() ||
      !newCity.trim() ||
      !newProvince.trim() ||
      !newPostalCode.trim() ||
      !newPhone.trim()
    ) {
      setAddressFormError('Please fill in all address fields.');
      return;
    }
    setSavingAddress(true);
    setAddressFormError('');
    try {
      const payload = {
        fullName: newFullName.trim(),
        address: newAddress.trim(),
        barangay: newBarangay.trim(),
        city: newCity.trim(),
        province: newProvince.trim(),
        postalCode: newPostalCode.trim(),
        phone: newPhone.trim(),
        isDefault: newIsDefault,
      };
      if (editingAddressId) {
        const updated = await updateAddress(editingAddressId, payload);
        setAddressId(updated.id);
      } else {
        const created = await addAddress(payload);
        setAddressId(created.id);
        if (!cardholderName.trim()) setCardholderName(created.fullName);
        if (!gcashPhone.trim()) setGcashPhone(created.phone);
      }
      setShowAddressModal(false);
    } catch (err) {
      setAddressFormError(err instanceof Error ? err.message : 'Unable to save address.');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleCheckout = async () => {
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

    // Validate in-app payment details
    if (payMethod === 'card') {
      const rawCard = cardNumber.replace(/\s/g, '');
      if (rawCard.length !== 16) {
        setError('Please enter a valid 16-digit card number.');
        return;
      }
      const [monthStr, yearStr] = cardExpiry.split('/');
      const month = parseInt(monthStr ?? '0', 10);
      if (!monthStr || !yearStr || month < 1 || month > 12 || cardExpiry.length < 5) {
        setError('Please enter a valid expiry date (MM/YY).');
        return;
      }
      if (cardCvc.length < 3) {
        setError('Please enter a valid 3 or 4-digit CVC.');
        return;
      }
      if (!cardholderName.trim()) {
        setError('Please enter the cardholder name.');
        return;
      }
    } else if (payMethod === 'gcash') {
      const rawPhone = gcashPhone.replace(/\D/g, '');
      if (rawPhone.length < 10) {
        setError('Please enter a valid GCash mobile number (e.g. 09XXXXXXXXX).');
        return;
      }
    }

    setSubmitting(true);
    setError('');

    const paymentLabel =
      payMethod === 'card'
        ? 'Credit / Debit Card'
        : payMethod === 'gcash'
          ? 'GCash'
          : 'Cash on Delivery';

    try {
      const [monthStr, yearStr] = cardExpiry.split('/');
      const expMonth = parseInt(monthStr ?? '1', 10);
      const rawYear = parseInt(yearStr ?? '30', 10);
      const expYear = rawYear < 100 ? rawYear + 2000 : rawYear;

      const callbackScheme = Linking.createURL('checkout/callback');
      const returnUrl = `${API_BASE_URL}/checkout/success?mobile=true&redirect_scheme=${encodeURIComponent(callbackScheme)}`;

      const res = await api.processPayment({
        fullName: selectedAddress.fullName,
        address: selectedAddress.address,
        barangay: selectedAddress.barangay,
        city: selectedAddress.city,
        province: selectedAddress.province,
        postalCode: selectedAddress.postalCode,
        phone: selectedAddress.phone,
        courierName: selectedCourier.name,
        courierEstimate: selectedCourier.estimate,
        paymentMethod: paymentLabel,
        voucherCode,
        shippingCost: selectedCourier.price,
        selectedProductIds: checkoutItems.map((item) => item.product.slug),
        returnUrl,
        card:
          payMethod === 'card'
            ? {
                cardNumber: cardNumber.replace(/\s/g, ''),
                expMonth,
                expYear,
                cvc: cardCvc,
                cardholderName: cardholderName.trim() || selectedAddress.fullName,
              }
            : undefined,
        gcash:
          payMethod === 'gcash'
            ? {
                phone: gcashPhone.replace(/\D/g, ''),
              }
            : undefined,
      });

      if (res.isPaid || res.status === 'PROCESSING' || res.status === 'PAID') {
        // Direct order completion (card paid, COD placed, or demo flow)
        await refreshAccount().catch(() => undefined);
        router.replace({
          pathname: '/order-confirm',
          params: { orderNumber: res.orderNumber },
        });
        return;
      }

      if (res.status === 'AWAITING_NEXT_ACTION' && res.nextActionUrl) {
        // 3DS OTP verification or GCash authorization prompt
        try {
          await WebBrowser.openAuthSessionAsync(res.nextActionUrl, callbackScheme);
        } catch {
          await WebBrowser.openBrowserAsync(res.nextActionUrl);
        }

        try {
          await api.verifyCheckout(res.orderNumber);
        } catch {
          // Non-fatal, order detail fetch also auto-reconciles
        }

        await refreshAccount().catch(() => undefined);
        router.replace({
          pathname: '/order-confirm',
          params: { orderNumber: res.orderNumber },
        });
        return;
      }

      // Default fallback
      await refreshAccount().catch(() => undefined);
      router.replace({
        pathname: '/order-confirm',
        params: { orderNumber: res.orderNumber },
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to complete checkout. Please check your details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: safeTop }]}>
      <LinearGradient colors={['#4a0808', '#1a0202', 'transparent']} style={styles.gradient} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}>
        {/* Delivery Address Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <TouchableOpacity
            onPress={openAddAddressModal}
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
              onPress={openAddAddressModal}
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
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.optionTitle}>{address.fullName}</Text>
                    {address.isDefault && (
                      <Text style={styles.defaultBadge}>DEFAULT</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      openEditAddressModal(address);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ padding: 4 }}
                  >
                    <Feather name="edit-2" size={14} color="#888" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.optionText}>
                  {address.address}, {address.barangay ? `${address.barangay}, ` : ''}
                  {address.city}, {address.province} {address.postalCode}
                </Text>
                <Text style={styles.phoneText}>{address.phone}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Courier Selection */}
        <Text style={styles.sectionTitle}>Shipping Courier</Text>
        {COURIERS.map((courier) => (
          <TouchableOpacity
            key={courier.id}
            style={[
              styles.option,
              selectedCourierId === courier.id && styles.optionActive,
            ]}
            onPress={() => setSelectedCourierId(courier.id)}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.radio,
                selectedCourierId === courier.id && styles.radioActive,
              ]}
            />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.optionTitle}>{courier.name}</Text>
                <Text style={styles.courierPrice}>₱{courier.price.toLocaleString()}.00</Text>
              </View>
              <Text style={styles.optionText}>{courier.estimate}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Payment Method Selection */}
        <Text style={styles.sectionTitle}>Payment Method</Text>
        {(
          [
            { id: 'card' as const, label: 'Credit / Debit Card', icon: 'credit-card', subtitle: 'Visa, Mastercard, JCB' },
            { id: 'gcash' as const, label: 'GCash', icon: 'smartphone', subtitle: 'Philippine e-wallet' },
            { id: 'cod' as const, label: 'Cash on Delivery', icon: 'truck', subtitle: 'Requires store approval · Pay when delivered' },
          ] as const
        ).map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[styles.option, payMethod === method.id && styles.optionActive]}
            onPress={() => setPayMethod(method.id)}
            activeOpacity={0.8}
          >
            <Feather
              name={method.icon}
              size={18}
              color={payMethod === method.id ? '#c62828' : '#777'}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>{method.label}</Text>
              <Text style={styles.optionText}>{method.subtitle}</Text>
            </View>
            <View style={[styles.radio, payMethod === method.id && styles.radioActive]} />
          </TouchableOpacity>
        ))}

        {/* In-app Payment Inputs Card */}
        {payMethod === 'card' && (
          <View style={styles.paymentFieldsCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={styles.paymentCardTitle}>Card Details</Text>
            </View>

            <Text style={styles.fieldLabel}>CARDHOLDER NAME</Text>
            <TextInput
              value={cardholderName}
              onChangeText={setCardholderName}
              placeholder="As shown on card"
              placeholderTextColor="#555"
              style={styles.input}
              autoCapitalize="words"
            />

            <Text style={styles.fieldLabel}>CARD NUMBER</Text>
            <TextInput
              value={cardNumber}
              onChangeText={handleCardNumberChange}
              placeholder="1234 5678 9012 3456"
              placeholderTextColor="#555"
              keyboardType="numeric"
              maxLength={19}
              style={styles.input}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>EXPIRES (MM/YY)</Text>
                <TextInput
                  value={cardExpiry}
                  onChangeText={handleExpiryChange}
                  placeholder="MM/YY"
                  placeholderTextColor="#555"
                  keyboardType="numeric"
                  maxLength={5}
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>CVC</Text>
                <TextInput
                  value={cardCvc}
                  onChangeText={handleCvcChange}
                  placeholder="123"
                  placeholderTextColor="#555"
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                  style={styles.input}
                />
              </View>
            </View>
          </View>
        )}

        {payMethod === 'gcash' && (
          <View style={styles.paymentFieldsCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={styles.paymentCardTitle}>GCash Details</Text>
            </View>

            <Text style={styles.fieldLabel}>GCASH MOBILE NUMBER</Text>
            <TextInput
              value={gcashPhone}
              onChangeText={setGcashPhone}
              placeholder="09171234567"
              placeholderTextColor="#555"
              keyboardType="phone-pad"
              maxLength={13}
              style={styles.input}
            />
            <Text style={styles.helperText}>
              Your GCash account will be charged upon order placement.
            </Text>
          </View>
        )}

        {payMethod === 'cod' && (
          <View style={styles.paymentFieldsCard}>
            <Text style={styles.paymentCardTitle}>Cash on Delivery</Text>
            <Text style={styles.helperText}>
              Please prepare the exact cash amount upon courier delivery. Note: Cash on Delivery orders require store administrator confirmation before being officially placed and dispatched.
            </Text>
          </View>
        )}

        {/* Order Summary */}
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          {checkoutItems.map((item) => (
            <View key={item.id} style={styles.summaryRow}>
              <Text style={styles.summaryLabel} numberOfLines={1}>
                {item.product.name} × {item.quantity}
              </Text>
              <Text style={styles.summaryValue}>
                ₱{(item.product.price * item.quantity).toLocaleString()}.00
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
            <Text style={styles.summaryLabel}>Shipping ({selectedCourier.name})</Text>
            <Text style={styles.summaryValue}>₱{shipping.toLocaleString()}.00</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₱{total.toLocaleString()}.00</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <Feather name="shield" size={12} color="#4caf50" />
            <Text style={styles.disclaimerText}>
              Built-in secure checkout · 14-day return guarantee
            </Text>
          </View>
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      {/* Fixed Checkout Action */}
      <View style={[styles.footer, { paddingBottom: safeBottom }]}>
        <TouchableOpacity
          style={[styles.cta, submitting && { opacity: 0.6 }]}
          onPress={() => {
            void handleCheckout();
          }}
          disabled={submitting || !selectedAddress || checkoutItems.length === 0}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaText}>
              Place Order · ₱{total.toLocaleString()}.00
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Add Address Modal */}
      <Modal visible={showAddressModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.modalSheetHeader}>
              <Text style={styles.modalSheetTitle}>
                {editingAddressId ? 'Edit Delivery Address' : 'Add Delivery Address'}
              </Text>
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
                  <Text style={styles.saveAddressText}>
                    {editingAddressId ? 'Update Address' : 'Save Address'}
                  </Text>
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
  optionActive: { borderColor: '#c62828', backgroundColor: 'rgba(198,40,40,0.06)' },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#555',
  },
  radioActive: { borderColor: '#c62828', backgroundColor: '#c62828' },
  optionTitle: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#fff' },
  courierPrice: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#c62828' },
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
  paymentFieldsCard: {
    backgroundColor: '#161618',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    marginTop: 4,
    marginBottom: 10,
    gap: 8,
  },
  paymentCardTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#fff',
  },
  input: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#2c2c2e',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginBottom: 4,
  },
  helperText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#888',
    lineHeight: 16,
    marginTop: 2,
  },
  summary: {
    backgroundColor: '#1c1c1e',
    borderRadius: 14,
    padding: 16,
    marginTop: 18,
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
    color: '#777',
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
    elevation: 8,
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
