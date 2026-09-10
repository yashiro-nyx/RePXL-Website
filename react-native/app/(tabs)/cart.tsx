import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { CONDITION_COLORS } from '../../data/products';

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { cart, removeFromCart, updateQty } = useApp();
  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const shipping = subtotal > 0 ? 150 : 0;
  const total = subtotal + shipping;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#3d0a0a', '#1a0202', 'transparent']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.gradient} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 22 }} />
        <Text style={styles.headerTitle}>
          My Cart{cart.length > 0 ? <Text style={styles.headerCount}> ({cart.length} {cart.length === 1 ? 'item' : 'items'})</Text> : null}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      {cart.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Feather name="shopping-bag" size={32} color="#444" />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySub}>Browse our collection of vintage cameras and add something you love.</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => router.replace('/(tabs)/home')} activeOpacity={0.85}>
            <Text style={styles.browseBtnText}>Browse Cameras</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16, gap: 12 }}>
            {cart.map(({ product: p, quantity }) => {
              const cond = CONDITION_COLORS[p.condition];
              return (
                <View key={p.id} style={styles.cartItem}>
                  <Image source={{ uri: p.image }} style={styles.itemImg} resizeMode="cover" />
                  <View style={styles.itemBody}>
                    <View style={styles.itemTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemBrand}>{p.brand}</Text>
                        <Text style={styles.itemName} numberOfLines={2}>{p.name}</Text>
                      </View>
                      <TouchableOpacity onPress={() => removeFromCart(p.id)} style={{ padding: 4 }}>
                        <Feather name="x" size={16} color="#555" />
                      </TouchableOpacity>
                    </View>
                    <View style={[styles.condBadge, { borderColor: cond.border }]}>
                      <Text style={[styles.condBadgeText, { color: cond.text }]}>{p.condition}</Text>
                    </View>
                    <View style={styles.itemFooter}>
                      <Text style={styles.itemPrice}>₱{(p.price * quantity).toLocaleString()}</Text>
                      <View style={styles.qtyStepper}>
                        <TouchableOpacity onPress={() => updateQty(p.id, Math.max(0, quantity - 1))} style={styles.qtyBtn}>
                          <Text style={styles.qtyBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.qtyVal}>{quantity}</Text>
                        <TouchableOpacity onPress={() => updateQty(p.id, quantity + 1)} style={styles.qtyBtn}>
                          <Text style={styles.qtyBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}

            {/* Summary */}
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>Order Summary</Text>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Subtotal</Text><Text style={styles.summaryValue}>₱{subtotal.toLocaleString()}.00</Text></View>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Shipping</Text><Text style={styles.summaryValue}>₱{shipping}.00</Text></View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotal}>Total</Text>
                <Text style={styles.summaryTotalVal}>₱{total.toLocaleString()}.00</Text>
              </View>
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: 16 }]}>
            <TouchableOpacity style={styles.checkoutBtn} onPress={() => router.push('/checkout')} activeOpacity={0.85}>
              <Text style={styles.checkoutBtnText}>Proceed to Checkout — ₱{total.toLocaleString()}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 200 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 18 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#fff' },
  headerCount: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#666' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1c1c1e', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#fff' },
  emptySub: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22 },
  browseBtn: { marginTop: 8, backgroundColor: '#c62828', paddingVertical: 13, paddingHorizontal: 32, borderRadius: 12 },
  browseBtnText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#fff' },
  cartItem: { flexDirection: 'row', gap: 14, backgroundColor: '#1c1c1e', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#2c2c2e' },
  itemImg: { width: 88, height: 88, borderRadius: 10, backgroundColor: '#111' },
  itemBody: { flex: 1, gap: 6 },
  itemTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  itemBrand: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#666', letterSpacing: 0.5 },
  itemName: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#fff', lineHeight: 18, marginTop: 2 },
  condBadge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 },
  condBadgeText: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  itemFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  itemPrice: { fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: '#fff' },
  qtyStepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 8, borderWidth: 1, borderColor: '#2c2c2e', paddingHorizontal: 4 },
  qtyBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  qtyBtnText: { fontSize: 16, color: '#888', fontFamily: 'Inter_700Bold' },
  qtyVal: { minWidth: 20, textAlign: 'center', fontFamily: 'Inter_700Bold', fontSize: 13, color: '#fff' },
  summary: { backgroundColor: '#1c1c1e', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#2c2c2e', gap: 10 },
  summaryTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#fff', marginBottom: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#888' },
  summaryValue: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#fff' },
  summaryDivider: { height: 1, backgroundColor: '#2c2c2e' },
  summaryTotal: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#fff' },
  summaryTotalVal: { fontFamily: 'Inter_800ExtraBold', fontSize: 16, color: '#fff' },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1c1c1e' },
  checkoutBtn: { backgroundColor: '#c62828', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  checkoutBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#fff', letterSpacing: 0.3 },
});
