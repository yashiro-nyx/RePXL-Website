import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { CONDITION_COLORS } from '../../data/products';

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { cart, removeFromCart, updateQty, clearCart, validateVoucher, user } = useApp();

  // Selection state
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());

  // Voucher state
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState('');
  const [validatingVoucher, setValidatingVoucher] = useState(false);

  // Clear modal state
  const [showClearModal, setShowClearModal] = useState(false);

  // Sync selected slugs with cart items
  useEffect(() => {
    setSelectedSlugs((prev) => {
      const next = new Set<string>();
      cart.forEach((item) => {
        // Keep previously selected items or select new ones by default
        if (prev.has(item.product.slug) || prev.size === 0) {
          next.add(item.product.slug);
        }
      });
      return next;
    });
  }, [cart]);

  const selectedItems = useMemo(
    () => cart.filter((item) => selectedSlugs.has(item.product.slug)),
    [cart, selectedSlugs]
  );

  const allSelected = cart.length > 0 && selectedItems.length === cart.length;
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedSlugs(new Set());
    } else {
      setSelectedSlugs(new Set(cart.map((i) => i.product.slug)));
    }
  };

  const toggleItemSelect = (slug: string) => {
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const subtotal = useMemo(
    () => selectedItems.reduce((s, i) => s + i.product.price * i.quantity, 0),
    [selectedItems]
  );
  const shipping = subtotal > 0 ? 150 : 0;
  const discount = promoApplied ? Math.min(promoDiscount, subtotal) : 0;
  const total = Math.max(0, subtotal - discount + shipping);

  const handleApplyVoucher = async () => {
    if (!promoCode.trim()) return;
    if (!user) {
      setPromoError('Please sign in to apply vouchers.');
      return;
    }
    setPromoError('');
    setValidatingVoucher(true);
    try {
      const res = await validateVoucher(promoCode.trim(), subtotal);
      if (res.valid) {
        setPromoApplied(true);
        setPromoDiscount(res.discount);
      } else {
        setPromoApplied(false);
        setPromoDiscount(0);
        setPromoError(res.error || 'Invalid voucher code.');
      }
    } catch (err) {
      setPromoApplied(false);
      setPromoDiscount(0);
      setPromoError(err instanceof Error ? err.message : 'Unable to validate voucher.');
    } finally {
      setValidatingVoucher(false);
    }
  };

  const removeVoucher = () => {
    setPromoCode('');
    setPromoApplied(false);
    setPromoDiscount(0);
    setPromoError('');
  };

  const handleProceedToCheckout = () => {
    if (selectedItems.length === 0) return;
    router.push({
      pathname: '/checkout',
      params: {
        selectedSlugs: JSON.stringify(Array.from(selectedSlugs)),
        voucherCode: promoApplied ? promoCode.trim().toUpperCase() : '',
        voucherDiscount: discount.toString(),
      },
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={['#3d0a0a', '#1a0202', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradient}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 28 }} />
        <Text style={styles.headerTitle}>
          My Cart{cart.length > 0 ? <Text style={styles.headerCount}> ({cart.length})</Text> : null}
        </Text>
        {cart.length > 0 ? (
          <TouchableOpacity
            onPress={() => setShowClearModal(true)}
            style={styles.clearHeaderBtn}
            activeOpacity={0.7}
          >
            <Feather name="trash-2" size={17} color="#c62828" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 28 }} />
        )}
      </View>

      {cart.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Feather name="shopping-bag" size={32} color="#444" />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySub}>
            Browse our collection of vintage cameras and add something you love.
          </Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => router.replace('/(tabs)/home')}
            activeOpacity={0.85}
          >
            <Text style={styles.browseBtnText}>Browse Cameras</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, gap: 14 }}
          >
            {/* Select All Row */}
            <TouchableOpacity
              style={styles.selectAllRow}
              onPress={toggleSelectAll}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, allSelected && styles.checkboxActive]}>
                {allSelected && <Feather name="check" size={12} color="#fff" />}
              </View>
              <Text style={styles.selectAllText}>
                {allSelected ? 'Deselect all' : 'Select all'} ({selectedItems.length} of {cart.length} items)
              </Text>
            </TouchableOpacity>

            {/* Cart Items */}
            {cart.map(({ product: p, quantity }) => {
              const cond = CONDITION_COLORS[p.condition];
              const isSelected = selectedSlugs.has(p.slug);
              return (
                <View
                  key={p.id}
                  style={[styles.cartItem, isSelected && styles.cartItemActive]}
                >
                  <TouchableOpacity
                    onPress={() => toggleItemSelect(p.slug)}
                    style={styles.itemCheckboxArea}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                      {isSelected && <Feather name="check" size={12} color="#fff" />}
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => router.push({ pathname: '/product', params: { slug: p.slug } })}
                    activeOpacity={0.85}
                  >
                    <Image source={{ uri: p.image }} style={styles.itemImg} resizeMode="cover" />
                  </TouchableOpacity>

                  <View style={styles.itemBody}>
                    <View style={styles.itemTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemBrand}>{p.brand}</Text>
                        <Text style={styles.itemName} numberOfLines={2}>
                          {p.name}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => removeFromCart(p.id)}
                        style={{ padding: 4 }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Feather name="x" size={16} color="#666" />
                      </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[styles.condBadge, { borderColor: cond.border }]}>
                        <Text style={[styles.condBadgeText, { color: cond.text }]}>
                          {p.condition}
                        </Text>
                      </View>
                      {p.stockCount > 0 && p.stockCount <= 3 && (
                        <Text style={styles.lowStockText}>Only {p.stockCount} left</Text>
                      )}
                    </View>

                    <View style={styles.itemFooter}>
                      <Text style={styles.itemPrice}>
                        ₱{(p.price * quantity).toLocaleString()}
                      </Text>
                      <View style={styles.qtyStepper}>
                        <TouchableOpacity
                          onPress={() => updateQty(p.id, Math.max(0, quantity - 1))}
                          style={styles.qtyBtn}
                        >
                          <Text style={styles.qtyBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.qtyVal}>{quantity}</Text>
                        <TouchableOpacity
                          onPress={() => updateQty(p.id, quantity + 1)}
                          style={styles.qtyBtn}
                          disabled={quantity >= p.stockCount}
                        >
                          <Text
                            style={[
                              styles.qtyBtnText,
                              quantity >= p.stockCount && { color: '#333' },
                            ]}
                          >
                            +
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}

            {/* Voucher Section */}
            <View style={styles.voucherCard}>
              <Text style={styles.voucherTitle}>VOUCHER CODE</Text>
              {!promoApplied ? (
                <View style={styles.voucherInputRow}>
                  <TextInput
                    value={promoCode}
                    onChangeText={(t) => {
                      setPromoCode(t);
                      if (promoError) setPromoError('');
                    }}
                    placeholder="e.g. WELCOME10, SUMMER15"
                    placeholderTextColor="#555"
                    style={styles.voucherInput}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={[styles.applyBtn, !promoCode.trim() && { opacity: 0.5 }]}
                    onPress={handleApplyVoucher}
                    disabled={!promoCode.trim() || validatingVoucher}
                    activeOpacity={0.8}
                  >
                    {validatingVoucher ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.applyBtnText}>Apply</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.appliedRow}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Feather name="check-circle" size={15} color="#4caf50" />
                    <Text style={styles.appliedText}>
                      Code <Text style={{ fontFamily: 'Inter_700Bold' }}>{promoCode.toUpperCase()}</Text> applied (−₱{discount.toLocaleString()})
                    </Text>
                  </View>
                  <TouchableOpacity onPress={removeVoucher} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Feather name="x" size={15} color="#c62828" />
                  </TouchableOpacity>
                </View>
              )}
              {!!promoError && <Text style={styles.voucherError}>{promoError}</Text>}
            </View>

            {/* Summary */}
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>Order Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Subtotal ({selectedItems.reduce((sum, i) => sum + i.quantity, 0)} items)
                </Text>
                <Text style={styles.summaryValue}>₱{subtotal.toLocaleString()}.00</Text>
              </View>
              {discount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: '#4caf50' }]}>Discount</Text>
                  <Text style={[styles.summaryValue, { color: '#4caf50' }]}>
                    −₱{discount.toLocaleString()}.00
                  </Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping</Text>
                <Text style={styles.summaryValue}>
                  {subtotal > 0 ? `₱${shipping}.00` : '₱0.00'}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotal}>Total</Text>
                <Text style={styles.summaryTotalVal}>₱{total.toLocaleString()}.00</Text>
              </View>
            </View>
          </ScrollView>

          {/* Checkout Bar */}
          <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
            <TouchableOpacity
              style={[
                styles.checkoutBtn,
                (selectedItems.length === 0 || total === 0) && styles.checkoutBtnDisabled,
              ]}
              onPress={handleProceedToCheckout}
              disabled={selectedItems.length === 0}
              activeOpacity={0.85}
            >
              <Text style={styles.checkoutBtnText}>
                {selectedItems.length === 0
                  ? 'Select items to check out'
                  : `Proceed to Checkout (${selectedItems.length}) — ₱${total.toLocaleString()}`}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Clear Cart Confirmation Modal */}
      <Modal visible={showClearModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Feather name="trash-2" size={24} color="#c62828" />
            </View>
            <Text style={styles.modalTitle}>Clear Cart?</Text>
            <Text style={styles.modalSub}>
              Remove all items from your cart? This action cannot be undone.
            </Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowClearModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={async () => {
                  setShowClearModal(false);
                  await clearCart();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalConfirmText}>Clear Cart</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 200 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#fff' },
  headerCount: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#666' },
  clearHeaderBtn: { padding: 4 },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  selectAllText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: '#888' },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#444',
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#c62828',
    borderColor: '#c62828',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1c1c1e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#fff' },
  emptySub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  browseBtn: {
    marginTop: 8,
    backgroundColor: '#c62828',
    paddingVertical: 13,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  browseBtnText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#fff' },
  cartItem: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    alignItems: 'center',
  },
  cartItemActive: {
    borderColor: '#4a1515',
  },
  itemCheckboxArea: {
    paddingRight: 2,
    paddingVertical: 8,
  },
  itemImg: { width: 80, height: 80, borderRadius: 10, backgroundColor: '#111' },
  itemBody: { flex: 1, gap: 4 },
  itemTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  itemBrand: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: '#666',
    letterSpacing: 0.5,
  },
  itemName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#fff',
    lineHeight: 18,
    marginTop: 1,
  },
  condBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  condBadgeText: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  lowStockText: { fontSize: 10, color: '#f59e0b', fontFamily: 'Inter_500Medium' },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  itemPrice: { fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: '#fff' },
  qtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    paddingHorizontal: 3,
  },
  qtyBtn: { paddingHorizontal: 7, paddingVertical: 5 },
  qtyBtnText: { fontSize: 15, color: '#888', fontFamily: 'Inter_700Bold' },
  qtyVal: {
    minWidth: 18,
    textAlign: 'center',
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#fff',
  },
  voucherCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    gap: 8,
  },
  voucherTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#666',
    letterSpacing: 1,
  },
  voucherInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  voucherInput: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  applyBtn: {
    backgroundColor: '#c62828',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#fff',
  },
  appliedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  appliedText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#4caf50',
  },
  voucherError: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#f44336',
  },
  summary: {
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    gap: 10,
  },
  summaryTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#fff', marginBottom: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#888' },
  summaryValue: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#fff' },
  summaryDivider: { height: 1, backgroundColor: '#2c2c2e' },
  summaryTotal: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#fff' },
  summaryTotalVal: { fontFamily: 'Inter_800ExtraBold', fontSize: 16, color: '#fff' },
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
  checkoutBtn: {
    backgroundColor: '#c62828',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  checkoutBtnDisabled: {
    backgroundColor: '#333',
    opacity: 0.7,
  },
  checkoutBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: '#fff',
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1c1c1e',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    padding: 22,
    alignItems: 'center',
    gap: 12,
  },
  modalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(198, 40, 40, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 18,
    color: '#fff',
  },
  modalSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 19,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#aaa',
  },
  modalConfirmBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#c62828',
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#fff',
  },
});
