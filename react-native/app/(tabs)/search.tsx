import { useState, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Image, StyleSheet, FlatList } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PRODUCTS, CONDITION_COLORS } from '../../data/products';
import type { Product } from '../../types';

const BRANDS = ['All', 'Canon', 'Fujifilm', 'Kodak', 'Nikon'];
const CONDITIONS = ['All', 'Like New', 'Excellent', 'Good', 'Fair'];
const SORT_OPTIONS = ['Relevance', 'Price: Low to High', 'Price: High to Low', 'Newest', 'Rating'] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

const RECENT = ['Fujifilm FinePix', 'Nikon Coolpix', 'Canon IXUS'];

function StarRow({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Feather key={s} name="star" size={9} color={s <= rating ? '#f5a623' : '#333'} />
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
      <Image source={{ uri: product.image }} style={styles.cardImg} resizeMode="cover" />
      <View style={styles.cardBody}>
        <View style={[styles.condChip, { borderColor: cond.border }]}>
          <Text style={[styles.condChipText, { color: cond.text }]}>{product.condition}</Text>
        </View>
        <Text style={styles.cardBrand}>{product.brand}</Text>
        <Text style={styles.cardName} numberOfLines={2}>{product.name}</Text>
        <StarRow rating={product.rating} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <Text style={styles.cardPrice}>₱{product.price.toLocaleString()}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={styles.stockDot} />
            <Text style={styles.stockText}>In stock</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [brand, setBrand] = useState('All');
  const [condition, setCondition] = useState('All');
  const [sort, setSort] = useState<SortOption>('Relevance');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const hasQuery = query.trim().length > 0;

  const results = useMemo(() => {
    let list = PRODUCTS.filter((p) => {
      const q = query.toLowerCase();
      if (hasQuery && !p.name.toLowerCase().includes(q) && !p.brand.toLowerCase().includes(q) && !p.series?.toLowerCase().includes(q)) return false;
      if (brand !== 'All' && p.brand !== brand) return false;
      if (condition !== 'All' && p.condition !== condition) return false;
      return true;
    });

    switch (sort) {
      case 'Price: Low to High': list = [...list].sort((a, b) => a.price - b.price); break;
      case 'Price: High to Low': list = [...list].sort((a, b) => b.price - a.price); break;
      case 'Newest': list = [...list].sort((a, b) => (b.specs?.year ? parseInt(b.specs.year) : 0) - (a.specs?.year ? parseInt(a.specs.year) : 0)); break;
      case 'Rating': list = [...list].sort((a, b) => b.rating - a.rating); break;
    }
    return list;
  }, [query, brand, condition, sort, hasQuery]);

  const activeFilters = (brand !== 'All' ? 1 : 0) + (condition !== 'All' ? 1 : 0) + (sort !== 'Relevance' ? 1 : 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#4a0808', '#1a0202', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient} />

      {/* Search bar */}
      <View style={styles.searchBar}>
        <View style={styles.inputWrap}>
          <Feather name="search" size={16} color="#666" style={{ marginRight: 8 }} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search cameras, brands..."
            placeholderTextColor="#444"
            style={styles.input}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x-circle" size={16} color="#555" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => setFiltersOpen((o) => !o)} style={[styles.filterBtn, filtersOpen && styles.filterBtnActive]} activeOpacity={0.8}>
          <Feather name="sliders" size={16} color={filtersOpen ? '#fff' : '#aaa'} />
          {activeFilters > 0 && <View style={styles.filterDot}><Text style={styles.filterDotText}>{activeFilters}</Text></View>}
        </TouchableOpacity>
      </View>

      {/* Filter panel */}
      {filtersOpen && (
        <View style={styles.filterPanel}>
          {/* Brand */}
          <Text style={styles.filterSectionLabel}>BRAND</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
            {BRANDS.map((b) => (
              <TouchableOpacity key={b} onPress={() => setBrand(b)} style={[styles.chip, brand === b && styles.chipActive]} activeOpacity={0.8}>
                <Text style={[styles.chipText, brand === b && styles.chipTextActive]}>{b}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Condition */}
          <Text style={styles.filterSectionLabel}>CONDITION</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
            {CONDITIONS.map((c) => (
              <TouchableOpacity key={c} onPress={() => setCondition(c)} style={[styles.chip, condition === c && styles.chipActive]} activeOpacity={0.8}>
                <Text style={[styles.chipText, condition === c && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Sort */}
          <Text style={styles.filterSectionLabel}>SORT BY</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
            {SORT_OPTIONS.map((s) => (
              <TouchableOpacity key={s} onPress={() => setSort(s)} style={[styles.chip, sort === s && styles.chipActive]} activeOpacity={0.8}>
                <Text style={[styles.chipText, sort === s && styles.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {activeFilters > 0 && (
            <TouchableOpacity onPress={() => { setBrand('All'); setCondition('All'); setSort('Relevance'); }} style={styles.clearBtn}>
              <Feather name="refresh-ccw" size={12} color="#c62828" />
              <Text style={styles.clearBtnText}>Clear filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Results / empty state */}
      {!hasQuery && !filtersOpen ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, gap: 24 }} showsVerticalScrollIndicator={false}>
          {/* Recent searches */}
          <View>
            <Text style={styles.sectionTitle}>Recent Searches</Text>
            <View style={{ gap: 8, marginTop: 10 }}>
              {RECENT.map((r) => (
                <TouchableOpacity key={r} onPress={() => setQuery(r)} style={styles.recentRow} activeOpacity={0.7}>
                  <Feather name="clock" size={14} color="#555" />
                  <Text style={styles.recentText}>{r}</Text>
                  <Feather name="arrow-up-left" size={14} color="#444" />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Browse by brand */}
          <View>
            <Text style={styles.sectionTitle}>Browse by Brand</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
              {BRANDS.filter((b) => b !== 'All').map((b) => (
                <TouchableOpacity key={b} onPress={() => { setBrand(b); setQuery(b); }} style={styles.brandPill} activeOpacity={0.8}>
                  <Text style={styles.brandPillText}>{b}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* All cameras teaser */}
          <View>
            <Text style={styles.sectionTitle}>All Cameras</Text>
            <View style={{ gap: 12, marginTop: 10 }}>
              {PRODUCTS.map((p) => <ProductCard key={p.id} product={p} />)}
            </View>
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>{results.length} result{results.length !== 1 ? 's' : ''}{hasQuery ? ` for "${query}"` : ''}</Text>
          </View>
          {results.length === 0 ? (
            <View style={styles.noResults}>
              <Feather name="search" size={34} color="#333" />
              <Text style={styles.noResultsTitle}>No cameras found</Text>
              <Text style={styles.noResultsSub}>Try adjusting your search or filters.</Text>
              <TouchableOpacity onPress={() => { setQuery(''); setBrand('All'); setCondition('All'); setSort('Relevance'); }} style={styles.resetBtn}>
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(p) => p.id.toString()}
              renderItem={({ item }) => <ProductCard product={item} />}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 12 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 160 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12 },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#1c1c1e', borderWidth: 1, borderColor: '#2c2c2e', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  input: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: '#fff' },
  filterBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#1c1c1e', borderWidth: 1, borderColor: '#2c2c2e', alignItems: 'center', justifyContent: 'center' },
  filterBtnActive: { backgroundColor: '#c62828', borderColor: '#c62828' },
  filterDot: { position: 'absolute', top: -4, right: -4, backgroundColor: '#fff', borderRadius: 99, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  filterDotText: { fontFamily: 'Inter_700Bold', fontSize: 9, color: '#c62828' },
  filterPanel: { backgroundColor: '#111', borderBottomWidth: 1, borderBottomColor: '#1e1e1e', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  filterSectionLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, color: '#555', letterSpacing: 1, marginBottom: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, backgroundColor: '#1c1c1e', borderWidth: 1, borderColor: '#2c2c2e' },
  chipActive: { backgroundColor: '#c62828', borderColor: '#c62828' },
  chipText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#888' },
  chipTextActive: { color: '#fff' },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 4, paddingVertical: 6 },
  clearBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#c62828' },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#fff' },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  recentText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: '#bbb' },
  brandPill: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10, backgroundColor: '#1c1c1e', borderWidth: 1, borderColor: '#2c2c2e' },
  brandPillText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#ccc' },
  resultsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
  resultsCount: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#666' },
  noResults: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  noResultsTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#fff' },
  noResultsSub: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#555', textAlign: 'center' },
  resetBtn: { marginTop: 4, paddingVertical: 10, paddingHorizontal: 24, backgroundColor: '#c62828', borderRadius: 10 },
  resetBtnText: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#fff' },
  card: { backgroundColor: '#1c1c1e', borderRadius: 16, borderWidth: 1, borderColor: '#2c2c2e', overflow: 'hidden', flexDirection: 'row' },
  cardImg: { width: 100, height: 110, backgroundColor: '#111' },
  cardBody: { flex: 1, padding: 12, gap: 4 },
  condChip: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 },
  condChipText: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.4 },
  cardBrand: { fontFamily: 'Inter_600SemiBold', fontSize: 9, color: '#666', letterSpacing: 0.5 },
  cardName: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#fff', lineHeight: 17 },
  cardPrice: { fontFamily: 'Inter_800ExtraBold', fontSize: 15, color: '#fff' },
  stockDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4caf50' },
  stockText: { fontFamily: 'Inter_400Regular', fontSize: 10, color: '#555' },
});
