import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, TextInput } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PRODUCTS, CONDITION_COLORS } from '../../data/products';
import { useApp } from '../../context/AppContext';
import type { Product } from '../../types';

const CATEGORIES = ['Popular', 'New Arrival', 'Canon', 'Fujifilm', 'Kodak', 'Nikon'];

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Feather key={s} name="star" size={10} color={s <= rating ? '#f5a623' : '#333'} />
      ))}
    </View>
  );
}

function ProductCard({ product }: { product: Product }) {
  const cond = CONDITION_COLORS[product.condition];
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/product', params: { id: product.id.toString() } })}
      activeOpacity={0.85}
    >
      <Image source={{ uri: product.image }} style={styles.cardImage} resizeMode="cover" />
      <View style={styles.cardBody}>
        <View style={[styles.condBadge, { borderColor: cond.border }]}>
          <Text style={[styles.condBadgeText, { color: cond.text }]}>{product.condition}</Text>
        </View>
        <Text style={styles.cardBrand}>{product.brand}</Text>
        <Text style={styles.cardName} numberOfLines={2}>{product.name}</Text>
        <StarRating rating={product.rating} />
        <View style={styles.cardFooter}>
          <Text style={styles.cardPrice}>₱{product.price.toLocaleString()}.00</Text>
          <View style={styles.stockRow}>
            <View style={styles.stockDot} />
            <Text style={styles.stockText}>In stock</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useApp();
  const [activeCategory, setActiveCategory] = useState('Popular');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={['#4a0808', '#1a0202', 'transparent']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Text style={styles.logoText}>RePXL</Text>
          <View style={styles.logoDot} />
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity><Feather name="sun" size={21} color="#fff" /></TouchableOpacity>
          <TouchableOpacity><Feather name="menu" size={21} color="#fff" /></TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Greeting */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <Text style={styles.greeting}>Hello, {user ? user.name.split(' ')[0] : 'Guest'}!</Text>
          <Text style={styles.greetingSub}>Welcome back. What's clicking today?</Text>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Feather name="search" size={15} color="#555" />
          <TextInput
            placeholder="Search products ..."
            placeholderTextColor="#555"
            style={styles.searchInput}
          />
        </View>

        {/* Categories */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <Feather name="filter" size={16} color="#888" />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 20, marginBottom: 24 }} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCategory(cat)}
              style={[styles.catPill, activeCategory === cat && styles.catPillActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.catPillText, activeCategory === cat && styles.catPillTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Products */}
        <Text style={[styles.sectionTitle, { paddingHorizontal: 20, marginBottom: 12 }]}>Products</Text>
        <View style={styles.grid}>
          {PRODUCTS.map((p) => <ProductCard key={p.id} product={p} />)}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  logoText: { fontFamily: 'Inter_800ExtraBold', fontSize: 20, color: '#fff', borderWidth: 1.5, borderColor: '#fff', paddingHorizontal: 6, paddingVertical: 2 },
  logoDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#c62828', marginLeft: 3 },
  headerActions: { flexDirection: 'row', gap: 16 },
  greeting: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#fff' },
  greetingSub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#666', marginTop: 2 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, marginBottom: 20, backgroundColor: '#1c1c1e', borderWidth: 1, borderColor: '#2c2c2e', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  searchInput: { flex: 1, fontSize: 14, color: '#fff', fontFamily: 'Inter_400Regular' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 10 },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#fff' },
  catPill: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 99, backgroundColor: '#1c1c1e', borderWidth: 1, borderColor: '#2c2c2e' },
  catPillActive: { backgroundColor: '#c62828', borderColor: '#c62828' },
  catPillText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#aaa' },
  catPillTextActive: { color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, gap: 10 },
  card: { width: '47.5%', backgroundColor: '#1c1c1e', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#2c2c2e' },
  cardImage: { width: '100%', height: 148, backgroundColor: '#111' },
  cardBody: { padding: 10, gap: 4 },
  condBadge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 },
  condBadgeText: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  cardBrand: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#666', letterSpacing: 0.5 },
  cardName: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#fff', lineHeight: 18 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  cardPrice: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#fff' },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stockDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4caf50' },
  stockText: { fontSize: 10, fontFamily: 'Inter_500Medium', color: '#4caf50' },
});
