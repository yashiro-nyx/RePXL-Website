import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CONDITION_COLORS, SPEC_LABELS } from '../data/products';
import { getColorProfile, type ColorProfile } from '../data/colorProfiles';
import { useApp } from '../context/AppContext';
import { api } from '../src/services/api';
import type { Product, Specs } from '../types';

type Tab = 'overview' | 'specs' | 'reviews';

function StarRating({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Feather key={s} name="star" size={size} color={s <= rating ? '#f5a623' : '#ccc'} />
      ))}
    </View>
  );
}

function Accordion({
  label,
  defaultOpen = false,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: '#e8e8e4' }}>
      <TouchableOpacity
        onPress={() => setOpen((v) => !v)}
        style={styles.accordionRow}
        activeOpacity={0.7}
      >
        <Text style={styles.accordionLabel}>{label}</Text>
        <View style={[styles.accordionIcon, { borderColor: open ? '#c62828' : '#ccc' }]}>
          <Feather name={open ? 'chevron-up' : 'chevron-down'} size={12} color={open ? '#c62828' : '#aaa'} />
        </View>
      </TouchableOpacity>
      {open && <View style={{ paddingBottom: 16 }}>{children}</View>}
    </View>
  );
}

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const {
    products,
    addToCart,
    user,
    wishlist,
    compareList,
    toggleWishlist,
    toggleCompare,
    submitReview,
  } = useApp();

  const [tab, setTab] = useState<Tab>('overview');
  const [qty, setQty] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [remoteProduct, setRemoteProduct] = useState<Product | null>(null);
  const [loadError, setLoadError] = useState('');
  const insets = useSafeAreaInsets();

  // "Try the Look" modal state
  const [showLookModal, setShowLookModal] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  // "Write a Review" modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');

  // Condition grading modal state
  const [showConditionGuide, setShowConditionGuide] = useState(false);

  const listedProduct = products.find((product) => product.slug === slug);

  const refreshProductReviews = async (productSlug: string) => {
    try {
      const reviews = await api.productReviews(productSlug);
      setRemoteProduct((prev) =>
        prev
          ? {
              ...prev,
              reviewList: reviews,
              reviews: reviews.length,
              rating: reviews.length
                ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
                : 0,
            }
          : prev
      );
    } catch {}
  };

  useEffect(() => {
    if (!slug) return;
    let active = true;
    Promise.all([api.product(slug), api.productReviews(slug)])
      .then(([product, reviews]) => {
        if (active) {
          setRemoteProduct({
            ...product,
            reviewList: reviews,
            reviews: reviews.length,
            rating: reviews.length
              ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
              : 0,
          });
        }
      })
      .catch((reason) => {
        if (active) setLoadError(reason instanceof Error ? reason.message : 'Unable to load this camera.');
      });
    return () => {
      active = false;
    };
  }, [slug]);

  const product = remoteProduct ?? listedProduct;
  if (!product) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center', gap: 12 }]}>
        {loadError ? <Text style={{ color: '#fff' }}>{loadError}</Text> : <ActivityIndicator color="#c62828" />}
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: '#c62828' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const p = product;
  const cond = CONDITION_COLORS[p.condition] || { text: '#2196f3', border: '#2196f3' };
  const isWishlisted = wishlist.includes(p.id);
  const isComparing = compareList.includes(p.id);
  const compareAtMax = compareList.length >= 3 && !isComparing;

  const colorProfile: ColorProfile = getColorProfile(p.brand);
  const currentLookPreset =
    colorProfile.presets.find((pr) => pr.id === selectedPresetId) ||
    colorProfile.presets.find((pr) => pr.id === colorProfile.defaultPreset) ||
    colorProfile.presets[0];

  const handleAddToCart = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    try {
      await addToCart(p, qty);
      setAddedFeedback(true);
      setTimeout(() => setAddedFeedback(false), 1600);
    } catch {
      setAddedFeedback(false);
    }
  };

  const handleOpenReview = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    setReviewRating(5);
    setReviewComment('');
    setReviewError('');
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!reviewComment.trim()) {
      setReviewError('Please write your review thoughts.');
      return;
    }
    setSubmittingReview(true);
    setReviewError('');
    try {
      await submitReview(p.id, reviewRating, reviewComment.trim());
      setShowReviewModal(false);
      await refreshProductReviews(p.slug);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Unable to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const specPairs: [keyof Specs, keyof Specs][] = [
    ['megapixels', 'opticalZoom'],
    ['storage', 'year'],
    ['isoRange', 'shutterSpeed'],
    ['lcd', 'battery'],
    ['sensor', 'weight'],
  ];

  return (
    <View style={styles.container}>
      {/* ── Hero ── */}
      <View style={styles.hero}>
        <LinearGradient
          colors={['#5a1010', '#2a0505', '#0d0d0d']}
          start={{ x: 0.7, y: 0 }}
          end={{ x: 0.2, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <TouchableOpacity
          style={[styles.backBtn, { top: insets.top + 12 }]}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Feather name="arrow-left" size={17} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.wishBtn,
            {
              top: insets.top + 12,
              backgroundColor: isWishlisted ? 'rgba(198,40,40,0.85)' : 'rgba(0,0,0,0.45)',
            },
          ]}
          onPress={() => {
            if (!user) router.push('/login');
            else void toggleWishlist(p.id);
          }}
          activeOpacity={0.8}
        >
          <Feather name="heart" size={17} color="#fff" fill={isWishlisted ? '#fff' : 'none'} />
        </TouchableOpacity>

        <Image source={{ uri: p.image }} style={styles.heroImage} resizeMode="contain" />

        <TouchableOpacity
          onPress={() => setShowConditionGuide(true)}
          style={[styles.condOver, { borderColor: cond.border }]}
          activeOpacity={0.8}
        >
          <Text style={[styles.condOverText, { color: cond.text }]}>{p.condition}</Text>
          <Feather name="help-circle" size={10} color={cond.text} style={{ marginLeft: 3 }} />
        </TouchableOpacity>

        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  width: i === 0 ? 20 : 6,
                  backgroundColor: i === 0 ? '#c62828' : 'rgba(255,255,255,0.2)',
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* ── Sheet ── */}
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 130 }}
        >
          <Text style={styles.brandSeries}>
            {p.brand} · {p.series}
          </Text>
          <Text style={styles.title}>{p.name}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>₱{p.price.toLocaleString()}.00</Text>
            <TouchableOpacity
              onPress={() => setShowConditionGuide(true)}
              style={[styles.condBadge, { borderColor: cond.border }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.condBadgeText, { color: cond.text }]}>{p.condition}</Text>
              <Feather name="info" size={9} color={cond.text} style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          </View>

          <View style={styles.stockRow}>
            <View style={[styles.stockDot, { backgroundColor: p.inStock ? '#4caf50' : '#f44336' }]} />
            <Text style={[styles.stockText, { color: p.inStock ? '#4caf50' : '#f44336' }]}>
              {p.inStock ? `In stock — ${p.stockCount} available` : 'Out of stock'}
            </Text>
          </View>

          {/* ── Qty + Cart + Wishlist ── */}
          <View style={styles.actionRow}>
            <View style={styles.qtyStepper}>
              <TouchableOpacity onPress={() => setQty((q) => Math.max(1, q - 1))} style={styles.qtyBtn}>
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyVal}>{qty}</Text>
              <TouchableOpacity
                onPress={() => setQty((q) => Math.min(p.stockCount, q + 1))}
                style={styles.qtyBtn}
                disabled={qty >= p.stockCount}
              >
                <Text style={[styles.qtyBtnText, qty >= p.stockCount && { color: '#ccc' }]}>+</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[
                styles.addBtn,
                { backgroundColor: addedFeedback ? '#2e7d32' : '#c62828' },
                !p.inStock && { opacity: 0.5 },
              ]}
              onPress={handleAddToCart}
              disabled={!p.inStock}
              activeOpacity={0.85}
            >
              <Feather name={addedFeedback ? 'check' : 'shopping-bag'} size={15} color="#fff" />
              <Text style={styles.addBtnText}>
                {addedFeedback ? 'Added!' : p.inStock ? 'Add to Cart' : 'Out of Stock'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.wishlistBtn,
                {
                  borderColor: isWishlisted ? '#c62828' : '#d8d8d4',
                  backgroundColor: isWishlisted ? '#fff0f0' : '#fff',
                },
              ]}
              onPress={() => {
                if (!user) router.push('/login');
                else void toggleWishlist(p.id);
              }}
              activeOpacity={0.8}
            >
              <Feather name="heart" size={15} color={isWishlisted ? '#c62828' : '#888'} />
              <Text style={[styles.wishlistBtnText, { color: isWishlisted ? '#c62828' : '#555' }]}>
                Wishlist
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Compare ── */}
          <TouchableOpacity
            style={[
              styles.compareBtn,
              {
                borderColor: isComparing ? '#c62828' : '#d8d8d4',
                backgroundColor: isComparing ? '#fff0f0' : '#fff',
                opacity: compareAtMax ? 0.5 : 1,
              },
            ]}
            onPress={() => {
              if (!compareAtMax) toggleCompare(p.id);
              if (compareList.length >= 1 || isComparing) router.push('/compare');
            }}
            disabled={compareAtMax}
            activeOpacity={0.8}
          >
            <Feather name="columns" size={14} color={isComparing ? '#c62828' : '#555'} />
            <Text style={[styles.compareBtnText, { color: isComparing ? '#c62828' : '#555' }]}>
              {isComparing ? 'Remove from Compare' : '+ Compare'}
              {compareList.length > 0 && !isComparing ? `  ${compareList.length}/3` : ''}
            </Text>
            {compareList.length >= 2 && (
              <Text style={{ fontSize: 12, color: '#c62828', fontFamily: 'Inter_600SemiBold', marginLeft: 4 }}>
                · View →
              </Text>
            )}
          </TouchableOpacity>

          {/* ── Interactive Try the Look Card ── */}
          <TouchableOpacity
            style={styles.lookCard}
            onPress={() => {
              setSelectedPresetId(colorProfile.defaultPreset);
              setShowLookModal(true);
            }}
            activeOpacity={0.85}
          >
            <Text style={{ fontSize: 20 }}>📷</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.lookTitle}>Try the Look — {colorProfile.name}</Text>
              <Text style={styles.lookSub}>{colorProfile.description}</Text>
            </View>
            <View style={styles.lookBadge}>
              <Text style={styles.lookBadgeText}>CCD Color</Text>
              <Feather name="arrow-right" size={13} color="#c62828" />
            </View>
          </TouchableOpacity>

          {/* ── Tab bar ── */}
          <View style={styles.tabBar}>
            {(['overview', 'specs', 'reviews'] as Tab[]).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                style={[styles.tabItem, tab === t && styles.tabItemActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                  {t === 'reviews' ? ` (${p.reviewList.length})` : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {tab === 'overview' && (
            <View>
              <Text style={styles.bodyText}>{p.description}</Text>
              <View style={styles.pillRow}>
                {[
                  { field: 'megapixels', label: p.specs.megapixels, icon: '📷' },
                  { field: 'opticalZoom', label: p.specs.opticalZoom + ' zoom', icon: '🔍' },
                  { field: 'isoRange', label: p.specs.isoRange, icon: '☀️' },
                  { field: 'weight', label: p.specs.weight, icon: '⚖️' },
                ].map((pill) => (
                  <View key={pill.field} style={styles.pill}>
                    <Text style={{ fontSize: 11 }}>{pill.icon}</Text>
                    <Text style={styles.pillText}>{pill.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {tab === 'specs' && (
            <View>
              {specPairs.map(([a, b]) => (
                <View key={a} style={styles.specPair}>
                  {[a, b].map((key) => (
                    <View key={key} style={{ flex: 1 }}>
                      <Text style={styles.specLabel}>{SPEC_LABELS[key]?.toUpperCase()}</Text>
                      <Text style={styles.specValue}>{p.specs[key]}</Text>
                    </View>
                  ))}
                </View>
              ))}
              <View
                style={[
                  styles.specPair,
                  { borderTopWidth: 1, borderTopColor: '#e8e8e4', paddingTop: 14, marginTop: 4 },
                ]}
              >
                {[
                  { field: 'brand', label: 'BRAND', value: p.brand },
                  { field: 'series', label: 'SERIES', value: p.series },
                ].map((s) => (
                  <View key={s.field} style={{ flex: 1 }}>
                    <Text style={styles.specLabel}>{s.label}</Text>
                    <Text style={styles.specValue}>{s.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {tab === 'reviews' && (
            <View style={{ gap: 16 }}>
              <View style={styles.reviewHeaderRow}>
                <View>
                  <Text style={styles.reviewCountTitle}>Customer Reviews</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <StarRating rating={Math.round(p.rating)} size={13} />
                    <Text style={styles.ratingScoreText}>
                      {p.rating > 0 ? p.rating.toFixed(1) : 'No reviews yet'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.writeReviewBtn}
                  onPress={handleOpenReview}
                  activeOpacity={0.8}
                >
                  <Feather name="edit-3" size={13} color="#fff" />
                  <Text style={styles.writeReviewBtnText}>Write a Review</Text>
                </TouchableOpacity>
              </View>

              {p.reviewList.length === 0 ? (
                <View style={styles.emptyReviews}>
                  <Feather name="message-square" size={24} color="#ccc" />
                  <Text style={styles.emptyReviewsText}>
                    Be the first to review this {p.name}!
                  </Text>
                </View>
              ) : (
                p.reviewList.map((r, i) => (
                  <View
                    key={r.id}
                    style={{
                      borderBottomWidth: i < p.reviewList.length - 1 ? 1 : 0,
                      borderBottomColor: '#e8e8e4',
                      paddingBottom: 16,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginBottom: 6,
                      }}
                    >
                      <View>
                        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: '#111' }}>
                          {r.author}
                        </Text>
                        <StarRating rating={r.rating} size={10} />
                      </View>
                      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#bbb' }}>
                        {r.date ? new Date(r.date).toLocaleDateString() : ''}
                      </Text>
                    </View>
                    <Text style={styles.bodyText}>{r.body}</Text>
                  </View>
                ))
              )}
            </View>
          )}

          {/* Accordions */}
          <View style={{ marginTop: 12 }}>
            <Accordion label="ABOUT THIS CAMERA">
              <Text style={styles.bodyText}>{p.description}</Text>
            </Accordion>
            <Accordion label="CONDITION DETAILS">
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View
                  style={[
                    styles.condBadge,
                    { borderColor: cond.border, alignSelf: 'flex-start', marginTop: 2 },
                  ]}
                >
                  <Text style={[styles.condBadgeText, { color: cond.text }]}>{p.condition}</Text>
                </View>
                <Text style={[styles.bodyText, { flex: 1 }]}>{p.conditionDetails}</Text>
              </View>
            </Accordion>
            <Accordion label="AUTHENTICITY & VERIFICATION">
              {[
                { id: 'serial-verification', text: 'Serial number verified against sensor logs' },
                { id: 'inspection', text: 'Inspected and certified by RePXL technicians' },
                { id: 'authenticity', text: 'Authenticity guarantee on all vintage digicams' },
              ].map((item) => (
                <View key={item.id} style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: '#e8f5e9',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Feather name="check" size={11} color="#2e7d32" />
                  </View>
                  <Text style={[styles.bodyText, { flex: 1 }]}>{item.text}</Text>
                </View>
              ))}
            </Accordion>
            <Accordion label="SHIPPING & RETURNS">
              {[
                { id: 'dispatch-window', text: 'Ships within 1–2 business days via express courier.' },
                { id: 'shipping-cost', text: 'Standard domestic shipping calculated at checkout.' },
                { id: 'return-window', text: '14-day hassle-free return window.' },
              ].map((line) => (
                <View key={line.id} style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  <Feather name="check" size={13} color="#2e7d32" style={{ marginTop: 2 }} />
                  <Text style={[styles.bodyText, { flex: 1 }]}>{line.text}</Text>
                </View>
              ))}
            </Accordion>
          </View>
        </ScrollView>
      </View>

      {/* ── Try the Look Modal ── */}
      <Modal visible={showLookModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.lookModalSheet}>
            <View style={styles.lookModalHeader}>
              <View>
                <Text style={styles.lookModalTag}>CCD COLOR PROFILE</Text>
                <Text style={styles.lookModalTitle}>Try the Look — {colorProfile.name}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowLookModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 24, gap: 14 }}>
              <Text style={styles.lookModalDesc}>{colorProfile.description}</Text>

              {/* Simulated Camera Preview */}
              <View style={styles.lookPreviewContainer}>
                <Image source={{ uri: p.image }} style={styles.lookPreviewImage} resizeMode="contain" />
                <View
                  style={[
                    styles.lookPreviewFilterOverlay,
                    {
                      backgroundColor: currentLookPreset.previewTint || '#ffead0',
                      opacity: currentLookPreset.id === 'none' ? 0 : 0.28,
                    },
                  ]}
                />
                <View style={styles.lookPresetBadge}>
                  <Text style={styles.lookPresetBadgeText}>{currentLookPreset.name}</Text>
                </View>
              </View>

              {/* Presets List */}
              <Text style={styles.lookPresetsTitle}>COLOR SCIENCE PRESETS</Text>
              <View style={{ gap: 8 }}>
                {colorProfile.presets.map((preset) => {
                  const isActive = currentLookPreset.id === preset.id;
                  return (
                    <TouchableOpacity
                      key={preset.id}
                      onPress={() => setSelectedPresetId(preset.id)}
                      style={[styles.presetCard, isActive && styles.presetCardActive]}
                      activeOpacity={0.8}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View
                          style={[
                            styles.presetSwatch,
                            { backgroundColor: preset.previewTint || '#ddd' },
                          ]}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.presetName, isActive && styles.presetNameActive]}>
                            {preset.name}
                          </Text>
                          <Text style={styles.presetDesc}>{preset.description}</Text>
                        </View>
                        {isActive && <Feather name="check" size={16} color="#c62828" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Write a Review Modal ── */}
      <Modal visible={showReviewModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.reviewModalSheet}>
            <View style={styles.lookModalHeader}>
              <View>
                <Text style={styles.lookModalTag}>VERIFIED REVIEW</Text>
                <Text style={styles.lookModalTitle}>Review {p.name}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowReviewModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 24, gap: 12 }}>
              <Text style={styles.fieldLabel}>YOUR RATING</Text>
              <View style={styles.ratingPickerRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setReviewRating(star)}
                    style={{ padding: 6 }}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name="star"
                      size={28}
                      color={star <= reviewRating ? '#f5a623' : '#444'}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>YOUR EXPERIENCE / COMMENTS</Text>
              <TextInput
                value={reviewComment}
                onChangeText={setReviewComment}
                placeholder="What did you love about the camera? How are the photo colors?"
                placeholderTextColor="#555"
                multiline
                numberOfLines={4}
                style={styles.reviewCommentInput}
              />

              {!!reviewError && <Text style={styles.reviewErrorText}>{reviewError}</Text>}

              <TouchableOpacity
                style={[styles.submitReviewBtn, submittingReview && { opacity: 0.6 }]}
                onPress={handleSubmitReview}
                disabled={submittingReview}
                activeOpacity={0.85}
              >
                {submittingReview ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitReviewBtnText}>Submit Review</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Condition Grading Guide Modal ── */}
      <Modal visible={showConditionGuide} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.conditionModalCard}>
            <View style={styles.conditionModalHeader}>
              <Text style={styles.conditionModalTitle}>RePXL Condition Grading</Text>
              <TouchableOpacity
                onPress={() => setShowConditionGuide(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={20} color="#888" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 12 }}>
              {[
                {
                  grade: 'MINT',
                  color: '#00c853',
                  desc: 'Pristine, museum/collector quality. Zero cosmetic wear or scratches. Complete with all original components.',
                },
                {
                  grade: 'EXCELLENT',
                  color: '#2196f3',
                  desc: 'Very gentle prior use. Faint microscopic marks only visible under bright light. Optics and sensor are flawless.',
                },
                {
                  grade: 'GOOD',
                  color: '#ff9800',
                  desc: 'Moderate cosmetic signs of use consistent with age (light edge scuffs). Thoroughly tested and 100% operational.',
                },
                {
                  grade: 'FAIR',
                  color: '#f44336',
                  desc: 'Visible cosmetic wear, patina, or scratches. Perfect for daily shooters who prioritize value and authentic CCD character.',
                },
              ].map((g) => (
                <View key={g.grade} style={styles.gradeRow}>
                  <View style={[styles.gradeBadge, { borderColor: g.color }]}>
                    <Text style={[styles.gradeBadgeText, { color: g.color }]}>{g.grade}</Text>
                  </View>
                  <Text style={styles.gradeDesc}>{g.desc}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f0' },
  hero: { height: '38%', position: 'relative', justifyContent: 'center', alignItems: 'center' },
  backBtn: {
    position: 'absolute',
    left: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    zIndex: 10,
  },
  wishBtn: {
    position: 'absolute',
    right: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    zIndex: 10,
  },
  heroImage: { width: '75%', height: '75%' },
  condOver: {
    position: 'absolute',
    top: 14,
    right: 68,
    borderWidth: 1.5,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(0,0,0,0.55)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  condOverText: { fontSize: 9, fontFamily: 'Inter_800ExtraBold', letterSpacing: 0.8 },
  dots: { position: 'absolute', bottom: 14, flexDirection: 'row', gap: 6 },
  dot: { height: 4, borderRadius: 2 },
  sheet: {
    flex: 1,
    backgroundColor: '#f5f5f0',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
  },
  handle: {
    width: 34,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d5d5d0',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  brandSeries: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#999',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  title: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 22,
    color: '#111',
    lineHeight: 28,
    marginBottom: 10,
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  price: { fontFamily: 'Inter_800ExtraBold', fontSize: 22, color: '#111', letterSpacing: -0.5 },
  condBadge: {
    borderWidth: 1.5,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  condBadgeText: { fontSize: 9, fontFamily: 'Inter_800ExtraBold', letterSpacing: 0.8 },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18 },
  stockDot: { width: 7, height: 7, borderRadius: 4 },
  stockText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  qtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#d8d8d4',
    borderRadius: 10,
  },
  qtyBtn: { width: 36, height: 48, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 18, color: '#555' },
  qtyVal: { minWidth: 28, textAlign: 'center', fontFamily: 'Inter_700Bold', fontSize: 14, color: '#111' },
  addBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addBtnText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#fff' },
  wishlistBtn: {
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  wishlistBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  compareBtn: {
    width: '100%',
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  compareBtnText: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  lookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#ede8e1',
    borderWidth: 1,
    borderColor: '#ded8d0',
    marginBottom: 20,
  },
  lookTitle: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#222', marginBottom: 2 },
  lookSub: { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#777', lineHeight: 16 },
  lookBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(198,40,40,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  lookBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#c62828',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e4',
    marginBottom: 16,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: { borderBottomColor: '#c62828' },
  tabLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#999' },
  tabLabelActive: { fontFamily: 'Inter_700Bold', color: '#111' },
  bodyText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#555', lineHeight: 22 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#eaeae6',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  pillText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#444' },
  specPair: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  specLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#aaa',
    letterSpacing: 0.7,
    marginBottom: 3,
  },
  specValue: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#222' },
  accordionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  accordionLabel: { fontFamily: 'Inter_700Bold', fontSize: 11, color: '#888', letterSpacing: 1 },
  accordionIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewCountTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#111' },
  ratingScoreText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#777' },
  writeReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#c62828',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  writeReviewBtnText: { fontFamily: 'Inter_700Bold', fontSize: 12, color: '#fff' },
  emptyReviews: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyReviewsText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  lookModalSheet: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 18,
    maxHeight: '88%',
  },
  lookModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2e',
  },
  lookModalTag: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#c62828',
    letterSpacing: 1,
  },
  lookModalTitle: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 17,
    color: '#fff',
    marginTop: 2,
  },
  lookModalDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#aaa',
    lineHeight: 19,
  },
  lookPreviewContainer: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  lookPreviewImage: {
    width: '85%',
    height: '85%',
  },
  lookPreviewFilterOverlay: {
    ...StyleSheet.absoluteFill,
  },
  lookPresetBadge: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  lookPresetBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#fff',
  },
  lookPresetsTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#777',
    letterSpacing: 1,
    marginTop: 6,
  },
  presetCard: {
    backgroundColor: '#161618',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    padding: 12,
  },
  presetCardActive: {
    borderColor: '#c62828',
    backgroundColor: 'rgba(198, 40, 40, 0.1)',
  },
  presetSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#444',
  },
  presetName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#ccc',
  },
  presetNameActive: {
    color: '#fff',
  },
  presetDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#777',
    marginTop: 2,
    lineHeight: 15,
  },
  reviewModalSheet: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 18,
    maxHeight: '80%',
  },
  fieldLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#777',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  ratingPickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  reviewCommentInput: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#2c2c2e',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  reviewErrorText: {
    color: '#f44336',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    textAlign: 'center',
  },
  submitReviewBtn: {
    backgroundColor: '#c62828',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  submitReviewBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  conditionModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#1c1c1e',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    padding: 20,
    maxHeight: '80%',
  },
  conditionModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2e',
  },
  conditionModalTitle: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 16,
    color: '#fff',
  },
  gradeRow: {
    gap: 6,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#252528',
  },
  gradeBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  gradeBadgeText: {
    fontSize: 9,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.8,
  },
  gradeDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#aaa',
    lineHeight: 18,
  },
});
