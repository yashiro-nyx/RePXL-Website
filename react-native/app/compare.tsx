import { useState, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { CONDITION_COLORS } from '../data/products';
import type { Product } from '../types';

const SPEC_ROWS: { label: string; key: keyof Product['specs']; higherIsBetter: boolean }[] = [
  { label: 'Resolution', key: 'megapixels', higherIsBetter: true },
  { label: 'Optical Zoom', key: 'opticalZoom', higherIsBetter: true },
  { label: 'ISO Range', key: 'isoRange', higherIsBetter: true },
  { label: 'Storage', key: 'storage', higherIsBetter: true },
  { label: 'Battery', key: 'battery', higherIsBetter: true },
  { label: 'LCD Screen', key: 'lcd', higherIsBetter: true },
  { label: 'Sensor', key: 'sensor', higherIsBetter: true },
  { label: 'Shutter Speed', key: 'shutterSpeed', higherIsBetter: true },
  { label: 'Weight', key: 'weight', higherIsBetter: false },
  { label: 'Year', key: 'year', higherIsBetter: true },
];

const COL_WIDTH = 136;
const LABEL_WIDTH = 110;

function StarRow({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Feather key={i} name="star" size={10} color={i <= rating ? '#f59e0b' : '#444'} />
      ))}
    </View>
  );
}

export default function CompareScreen() {
  const insets = useSafeAreaInsets();
  const { products, compareList, toggleCompare, addToCart, user } = useApp();
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  const cameras = useMemo(
    () =>
      compareList
        .map((id) => products.find((p) => p.id === id))
        .filter(Boolean) as Product[],
    [compareList, products]
  );

  /* Numeric extraction helpers */
  const extractNum = (val: string): number => parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
  const getBest = (key: keyof Product['specs'], higherIsBetter: boolean): number | null => {
    if (cameras.length < 2) return null;
    const nums = cameras.map((c) => extractNum(c.specs[key]));
    const best = higherIsBetter ? Math.max(...nums) : Math.min(...nums);
    return cameras.findIndex((c) => extractNum(c.specs[key]) === best);
  };

  const availableToAdd = useMemo(() => {
    return products.filter((p) => {
      if (compareList.includes(p.id)) return false;
      if (!pickerSearch.trim()) return true;
      const q = pickerSearch.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.series?.toLowerCase().includes(q)
      );
    });
  }, [products, compareList, pickerSearch]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={['#4a0808', '#1a0202', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 200 }}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Compare Cameras</Text>
          <Text style={styles.headerSub}>{cameras.length} of 3 cameras selected</Text>
        </View>
        {cameras.length < 3 && cameras.length > 0 && (
          <TouchableOpacity
            style={styles.headerAddBtn}
            onPress={() => {
              setPickerSearch('');
              setShowPickerModal(true);
            }}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={14} color="#c62828" />
            <Text style={styles.headerAddText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {cameras.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="columns" size={36} color="#333" />
          <Text style={styles.emptyTitle}>Nothing to compare</Text>
          <Text style={styles.emptySub}>
            Add up to 3 cameras from product pages or tap below to pick cameras to compare side by side.
          </Text>
          <TouchableOpacity
            onPress={() => {
              setPickerSearch('');
              setShowPickerModal(true);
            }}
            style={styles.backBtn}
            activeOpacity={0.85}
          >
            <Text style={styles.backBtnText}>Pick Cameras</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
          {/* Unified layout: Sticky Left Labels + Synchronized Horizontal Scroll */}
          <View style={{ flexDirection: 'row' }}>
            {/* Left labels column */}
            <View style={{ width: LABEL_WIDTH, paddingTop: 210 }}>
              {SPEC_ROWS.map(({ label, key }, rowIdx) => (
                <View
                  key={key}
                  style={[
                    styles.specLabelCell,
                    { backgroundColor: rowIdx % 2 === 0 ? 'transparent' : '#111' },
                  ]}
                >
                  <Text style={styles.specLabelText}>{label}</Text>
                </View>
              ))}
            </View>

            {/* Horizontally scrolling columns for Camera Headers + Spec Cells */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {/* Camera column headers */}
                <View style={{ flexDirection: 'row' }}>
                  {cameras.map((cam) => {
                    const cond = CONDITION_COLORS[cam.condition] || { text: '#2196f3', border: '#2196f3' };
                    return (
                      <View key={cam.id} style={[styles.camCol, { width: COL_WIDTH }]}>
                        <View style={{ position: 'relative' }}>
                          <Image source={{ uri: cam.image }} style={styles.camImg} resizeMode="cover" />
                          <TouchableOpacity
                            onPress={() => toggleCompare(cam.id)}
                            style={styles.removeBtn}
                            activeOpacity={0.8}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Feather name="x" size={12} color="#fff" />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.camBrand}>{cam.brand}</Text>
                        <Text style={styles.camName} numberOfLines={2}>
                          {cam.name}
                        </Text>
                        <StarRow rating={cam.rating} />
                        <Text style={styles.camPrice}>₱{cam.price.toLocaleString()}</Text>
                        <View style={[styles.condChip, { borderColor: cond.border }]}>
                          <Text style={[styles.condChipText, { color: cond.text }]}>
                            {cam.condition}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            if (!user) router.push('/login');
                            else void addToCart(cam);
                          }}
                          style={styles.addBtn}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.addBtnText}>Add to Cart</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}

                  {/* Add slot */}
                  {cameras.length < 3 && (
                    <TouchableOpacity
                      onPress={() => {
                        setPickerSearch('');
                        setShowPickerModal(true);
                      }}
                      style={[styles.camCol, styles.addSlot, { width: COL_WIDTH }]}
                      activeOpacity={0.7}
                    >
                      <View style={styles.addSlotIcon}>
                        <Feather name="plus" size={20} color="#666" />
                      </View>
                      <Text style={styles.addSlotText}>Add camera</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: '#1e1e1e', marginVertical: 8 }} />

                {/* Spec Cells Grid aligned with columns */}
                {SPEC_ROWS.map(({ key, higherIsBetter }, rowIdx) => {
                  const bestIdx = getBest(key, higherIsBetter);
                  return (
                    <View
                      key={key}
                      style={[
                        styles.specValuesRow,
                        { backgroundColor: rowIdx % 2 === 0 ? 'transparent' : '#111' },
                      ]}
                    >
                      {cameras.map((cam, idx) => {
                        const isBest = bestIdx === idx;
                        return (
                          <View
                            key={cam.id}
                            style={[
                              styles.specCell,
                              {
                                width: COL_WIDTH,
                                backgroundColor: isBest ? 'rgba(198,40,40,0.12)' : 'transparent',
                                borderColor: isBest ? 'rgba(198,40,40,0.3)' : 'transparent',
                                borderWidth: 1,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.specVal,
                                isBest && { color: '#e57373', fontFamily: 'Inter_700Bold' },
                              ]}
                            >
                              {cam.specs[key]}
                            </Text>
                          </View>
                        );
                      })}
                      {cameras.length < 3 && <View style={{ width: COL_WIDTH }} />}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      )}

      {/* ── Camera Picker Modal ── */}
      <Modal visible={showPickerModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerModalSheet}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select a Camera to Compare</Text>
              <TouchableOpacity
                onPress={() => setShowPickerModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={20} color="#888" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.pickerSearchWrap}>
              <Feather name="search" size={15} color="#666" />
              <TextInput
                value={pickerSearch}
                onChangeText={setPickerSearch}
                placeholder="Search by model or brand..."
                placeholderTextColor="#555"
                style={styles.pickerSearchInput}
                autoCorrect={false}
              />
              {pickerSearch.length > 0 && (
                <TouchableOpacity onPress={() => setPickerSearch('')}>
                  <Feather name="x-circle" size={15} color="#666" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 24, gap: 10 }}>
              {availableToAdd.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: '#666' }}>
                    No more cameras available to compare.
                  </Text>
                </View>
              ) : (
                availableToAdd.map((cam) => {
                  const cond = CONDITION_COLORS[cam.condition] || { text: '#2196f3', border: '#2196f3' };
                  return (
                    <TouchableOpacity
                      key={cam.id}
                      style={styles.pickerRow}
                      onPress={() => {
                        toggleCompare(cam.id);
                        setShowPickerModal(false);
                      }}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: cam.image }} style={styles.pickerImg} resizeMode="cover" />
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={styles.pickerBrand}>{cam.brand}</Text>
                        <Text style={styles.pickerName} numberOfLines={1}>
                          {cam.name}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={[styles.condChip, { borderColor: cond.border }]}>
                            <Text style={[styles.condChipText, { color: cond.text }]}>
                              {cam.condition}
                            </Text>
                          </View>
                          <Text style={styles.pickerPrice}>₱{cam.price.toLocaleString()}</Text>
                        </View>
                      </View>
                      <View style={styles.pickerSelectBtn}>
                        <Feather name="plus" size={15} color="#fff" />
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  headerTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 18, color: '#fff' },
  headerSub: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#666', marginTop: 2 },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c62828',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  headerAddText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#c62828',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 40,
  },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#fff' },
  emptySub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
  },
  backBtn: {
    marginTop: 4,
    backgroundColor: '#c62828',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 28,
  },
  backBtnText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#fff' },
  camCol: {
    padding: 12,
    gap: 5,
    alignItems: 'flex-start',
    borderRightWidth: 1,
    borderRightColor: '#1a1a1a',
  },
  camImg: { width: COL_WIDTH - 24, height: 90, borderRadius: 10, backgroundColor: '#1c1c1e' },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camBrand: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    color: '#666',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  camName: { fontFamily: 'Inter_700Bold', fontSize: 12, color: '#fff', lineHeight: 16 },
  camPrice: { fontFamily: 'Inter_800ExtraBold', fontSize: 14, color: '#fff', marginTop: 2 },
  condChip: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    alignSelf: 'flex-start',
  },
  condChipText: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.4 },
  addBtn: {
    width: '100%',
    backgroundColor: '#c62828',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  addBtnText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: '#fff' },
  addSlot: {
    borderWidth: 1,
    borderColor: '#2c2c2e',
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 200,
    marginTop: 0,
  },
  addSlotIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1c1c1e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSlotText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#666' },
  specLabelCell: {
    height: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  specLabelText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#888' },
  specValuesRow: {
    flexDirection: 'row',
    height: 44,
    alignItems: 'center',
  },
  specCell: {
    height: 44,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 4,
  },
  specVal: { fontFamily: 'Inter_500Medium', fontSize: 12, color: '#bbb' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  pickerModalSheet: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 18,
    maxHeight: '80%',
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2e',
  },
  pickerModalTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#fff',
  },
  pickerSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 14,
  },
  pickerSearchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#fff',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#161618',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#252528',
  },
  pickerImg: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#111' },
  pickerBrand: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#666' },
  pickerName: { fontFamily: 'Inter_700Bold', fontSize: 12, color: '#fff' },
  pickerPrice: { fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: '#fff' },
  pickerSelectBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#c62828',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
