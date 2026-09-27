import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CONDITION_COLORS } from '../../data/products';
import { useApp } from '../../context/AppContext';
import { useScreenSync } from '../../src/hooks/useScreenSync';
import { API_BASE_URL, api } from '../../src/services/api';
import { getSafeTopInset, getResponsiveCardLayout } from '../../src/utils/layout';
import type { Product } from '../../types';

interface BannerItem {
  id: string;
  title: string;
  imageRef: string;
  placement: string;
  linkTarget: string;
  isActive?: boolean;
}

const DEFAULT_BANNERS: BannerItem[] = [
  {
    id: 'default-hero',
    title: 'More than just a photo.',
    imageRef: '/images/camherosec.png',
    placement: 'HOMEPAGE_HERO',
    linkTarget: 'https://repxl.com/products',
    isActive: true,
  },
  {
    id: 'default-strip',
    title: 'Hottest Deals',
    imageRef: '/images/dealbanner.png',
    placement: 'HOMEPAGE_STRIP',
    linkTarget: 'https://repxl.com/products',
    isActive: true,
  },
  {
    id: 'default-sidebar',
    title: 'Sony Cyber-shot W800',
    imageRef: '/images/banner2.png',
    placement: 'SIDEBAR',
    linkTarget: 'https://repxl.com/products?brand=sony',
    isActive: true,
  },
];

function resolveBannerImageUrl(imageRef?: string | null): string {
  if (!imageRef) return '';
  const trimmed = imageRef.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) {
    return trimmed;
  }
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${API_BASE_URL}${cleanPath}`;
}

function ViewfinderCorners({
  color = 'rgba(255, 255, 255, 0.25)',
  size = 12,
  inset = 10,
}: {
  color?: string;
  size?: number;
  inset?: number;
}) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { margin: inset }]}>
      <View style={[styles.cornerTL, { borderColor: color, width: size, height: size }]} />
      <View style={[styles.cornerTR, { borderColor: color, width: size, height: size }]} />
      <View style={[styles.cornerBL, { borderColor: color, width: size, height: size }]} />
      <View style={[styles.cornerBR, { borderColor: color, width: size, height: size }]} />
    </View>
  );
}

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

function ProductCard({ product, cardWidth }: { product: Product; cardWidth: number }) {
  const { wishlist, toggleWishlist, user } = useApp();
  const isWishlisted = wishlist.includes(product.id);
  const cond = CONDITION_COLORS[product.condition] || { text: '#2196f3', border: '#2196f3' };
  const imageHeight = Math.min(180, Math.max(130, Math.round(cardWidth * 0.88)));
  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth }]}
      onPress={() => router.push({ pathname: '/product', params: { slug: product.slug } })}
      activeOpacity={0.85}
    >
      <View style={{ position: 'relative' }}>
        <Image source={{ uri: product.image }} style={[styles.cardImage, { height: imageHeight }]} resizeMode="cover" />
        <TouchableOpacity
          style={styles.cardHeartBtn}
          onPress={() => {
            if (!user) {
              router.push('/login');
              return;
            }
            void toggleWishlist(product.id);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Feather
            name="heart"
            size={14}
            color={isWishlisted ? '#f44336' : '#fff'}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.cardBody}>
        <View style={[styles.condBadge, { borderColor: cond.border }]}>
          <Text style={[styles.condBadgeText, { color: cond.text }]}>{product.condition}</Text>
        </View>
        <Text style={styles.cardBrand}>{product.brand}</Text>
        <Text style={styles.cardName} numberOfLines={2}>
          {product.name}
        </Text>
        <StarRating rating={product.rating} />
        <View style={styles.cardFooter}>
          <Text style={styles.cardPrice}>₱{product.price.toLocaleString()}.00</Text>
          <View style={styles.stockRow}>
            <View
              style={[
                styles.stockDot,
                { backgroundColor: product.inStock ? '#4caf50' : '#f44336' },
              ]}
            />
            <Text
              style={[
                styles.stockText,
                { color: product.inStock ? '#4caf50' : '#f44336' },
              ]}
            >
              {product.inStock ? 'In stock' : 'Sold out'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const safeTop = getSafeTopInset(insets);
  const { width } = useWindowDimensions();
  const { cardWidth, horizontalPadding, gap } = getResponsiveCardLayout(width, {
    horizontalPadding: 16,
    gap: 10,
    tabletBreakpoint: 600,
  });
  const { user, products, error, unreadNotificationsCount } = useApp();
  const { syncInBackground } = useScreenSync();
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Popular');
  const [homeSearch, setHomeSearch] = useState('');
  const [banners, setBanners] = useState<BannerItem[]>(DEFAULT_BANNERS);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);

  const loadBanners = useCallback(async () => {
    try {
      const data = await api.banners();
      if (Array.isArray(data) && data.length > 0) {
        setBanners(data);
      }
    } catch {
      // Keep existing/default banners
    }
  }, []);

  useScreenSync({
    onSync: loadBanners,
  });

  useEffect(() => {
    void loadBanners();
  }, [loadBanners]);

  const handlePullRefresh = async () => {
    setPullRefreshing(true);
    try {
      await Promise.allSettled([
        syncInBackground({ force: true, screen: 'home_pull' }),
        loadBanners(),
      ]);
    } finally {
      setPullRefreshing(false);
    }
  };

  const heroBanners = useMemo(() => {
    const list = banners.filter((b) => b.placement === 'HOMEPAGE_HERO');
    return list.length > 0 ? list : DEFAULT_BANNERS.filter((b) => b.placement === 'HOMEPAGE_HERO');
  }, [banners]);

  const activeHero = heroBanners[activeHeroIndex % heroBanners.length] || heroBanners[0];

  const dealBanner = useMemo(() => {
    return (
      banners.find((b) => b.placement === 'HOMEPAGE_STRIP') ||
      DEFAULT_BANNERS.find((b) => b.placement === 'HOMEPAGE_STRIP') ||
      null
    );
  }, [banners]);

  const spotlightBanner = useMemo(() => {
    return (
      banners.find((b) => b.placement === 'SIDEBAR') ||
      DEFAULT_BANNERS.find((b) => b.placement === 'SIDEBAR') ||
      null
    );
  }, [banners]);

  const handleBannerPress = useCallback(async (linkTarget?: string | null) => {
    if (!linkTarget) {
      router.push('/(tabs)/search');
      return;
    }
    const target = linkTarget.trim();
    if (!target) {
      router.push('/(tabs)/search');
      return;
    }

    if (target.startsWith('/')) {
      if (target.startsWith('/products/') || target.startsWith('/product/')) {
        const parts = target.split('/');
        const slug = parts[2]?.split('?')[0];
        if (slug) {
          router.push({ pathname: '/product', params: { slug } });
          return;
        }
      }
      if (target.includes('brand=')) {
        const brandMatch = target.match(/[?&]brand=([^&#]+)/i);
        if (brandMatch?.[1]) {
          router.push({ pathname: '/(tabs)/search', params: { brand: decodeURIComponent(brandMatch[1]) } });
          return;
        }
      }
      if (target.includes('query=') || target.includes('q=')) {
        const qMatch = target.match(/[?&](?:query|q)=([^&#]+)/i);
        if (qMatch?.[1]) {
          router.push({ pathname: '/(tabs)/search', params: { query: decodeURIComponent(qMatch[1]) } });
          return;
        }
      }
      router.push('/(tabs)/search');
      return;
    }

    try {
      const parsed = new URL(target);
      const host = parsed.hostname.toLowerCase();
      const isInternal =
        host.includes('repxl.com') ||
        host.includes('vercel.app') ||
        host === 'localhost' ||
        host === '127.0.0.1';

      if (isInternal) {
        if (parsed.pathname.startsWith('/products/') || parsed.pathname.startsWith('/product/')) {
          const parts = parsed.pathname.split('/');
          const slug = parts[2];
          if (slug) {
            router.push({ pathname: '/product', params: { slug } });
            return;
          }
        }
        const brand = parsed.searchParams.get('brand');
        if (brand) {
          router.push({ pathname: '/(tabs)/search', params: { brand } });
          return;
        }
        const query = parsed.searchParams.get('query') || parsed.searchParams.get('q');
        if (query) {
          router.push({ pathname: '/(tabs)/search', params: { query } });
          return;
        }
        router.push('/(tabs)/search');
        return;
      }

      await WebBrowser.openBrowserAsync(target);
    } catch {
      router.push('/(tabs)/search');
    }
  }, []);

  const handleSearchSubmit = () => {
    if (!homeSearch.trim()) return;
    router.push({
      pathname: '/(tabs)/search',
      params: { query: homeSearch.trim() },
    });
  };

  const handleCategoryPress = (cat: string) => {
    setActiveCategory(cat);
    if (['Canon', 'Fujifilm', 'Kodak', 'Nikon'].includes(cat)) {
      router.push({
        pathname: '/(tabs)/search',
        params: { brand: cat },
      });
    }
  };

  const displayedProducts = useMemo(() => {
    let list = [...products];
    if (activeCategory === 'Popular') {
      list.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
    } else if (activeCategory === 'New Arrival') {
      list.sort((a, b) => {
        const yearA = a.specs?.year ? parseInt(a.specs.year) : 0;
        const yearB = b.specs?.year ? parseInt(b.specs.year) : 0;
        return yearB - yearA;
      });
    } else if (['Canon', 'Fujifilm', 'Kodak', 'Nikon'].includes(activeCategory)) {
      list = list.filter((p) => p.brand.toLowerCase() === activeCategory.toLowerCase());
    }
    return list;
  }, [products, activeCategory]);

  return (
    <View style={[styles.container, { paddingTop: safeTop }]}>
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
          <TouchableOpacity
            onPress={() => router.push('/notifications')}
            style={styles.bellButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Feather name="bell" size={20} color="#fff" />
            {unreadNotificationsCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
                  {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/search')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Feather name="search" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={pullRefreshing}
            onRefresh={handlePullRefresh}
            tintColor="#c62828"
            colors={['#c62828']}
          />
        }
      >
        {/* Greeting */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <Text style={styles.greeting}>Hello, {user ? user.name.split(' ')[0] : 'Guest'}!</Text>
          <Text style={styles.greetingSub}>Welcome back. What's clicking today?</Text>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color="#666" />
          <TextInput
            value={homeSearch}
            onChangeText={setHomeSearch}
            onSubmitEditing={handleSearchSubmit}
            placeholder="Search cameras, brands, series..."
            placeholderTextColor="#555"
            style={styles.searchInput}
            returnKeyType="search"
          />
          {homeSearch.length > 0 && (
            <TouchableOpacity onPress={handleSearchSubmit} style={styles.searchGoBtn}>
              <Feather name="arrow-right" size={14} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Hero Banner Showcase */}
        {activeHero && (
          <View style={styles.heroContainer}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.heroCard}
              onPress={() => handleBannerPress(activeHero.linkTarget)}
            >
              <LinearGradient
                colors={['#2c0606', '#170303', '#0d0d0d']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroGradient}
              >
                <ViewfinderCorners color="rgba(239, 68, 68, 0.4)" size={16} inset={12} />
                <View style={styles.heroGlow} pointerEvents="none" />

                <View style={styles.heroContentRow}>
                  <View style={styles.heroTextCol}>
                    <View style={styles.heroBadge}>
                      <View style={styles.heroBadgeDot} />
                      <Text style={styles.heroBadgeText}>CCD ARCHIVE</Text>
                    </View>
                    <Text style={styles.heroTitle} numberOfLines={2}>
                      {activeHero.title}
                    </Text>
                    <Text style={styles.heroSubtitle} numberOfLines={2}>
                      Tactile vintage digicams & authentic Y2K grain.
                    </Text>
                    <View style={styles.heroCtaBtn}>
                      <Text style={styles.heroCtaText}>Shop Collection</Text>
                      <Feather name="arrow-right" size={12} color="#fff" />
                    </View>
                  </View>

                  {activeHero.imageRef ? (
                    <View style={styles.heroImageWrap}>
                      <Image
                        source={{ uri: resolveBannerImageUrl(activeHero.imageRef) }}
                        style={styles.heroImage}
                        resizeMode="contain"
                      />
                    </View>
                  ) : null}
                </View>

                {heroBanners.length > 1 && (
                  <View style={styles.heroIndicators}>
                    {heroBanners.map((_, i) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => setActiveHeroIndex(i)}
                        style={[
                          styles.heroDot,
                          i === activeHeroIndex % heroBanners.length && styles.heroDotActive,
                        ]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      />
                    ))}
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Categories */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
            <Feather name="filter" size={16} color="#888" />
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ paddingLeft: 20, marginBottom: 20 }}
          contentContainerStyle={{ gap: 8, paddingRight: 20 }}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => handleCategoryPress(cat)}
              style={[styles.catPill, activeCategory === cat && styles.catPillActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.catPillText, activeCategory === cat && styles.catPillTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Curated Spotlight Banner */}
        {spotlightBanner && (
          <View style={styles.spotlightContainer}>
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.spotlightCard}
              onPress={() => handleBannerPress(spotlightBanner.linkTarget)}
            >
              <LinearGradient
                colors={['#1c1417', '#120f13', '#0a0a0c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.spotlightGradient}
              >
                <ViewfinderCorners color="rgba(255, 255, 255, 0.18)" size={12} inset={10} />

                <View style={styles.spotlightContentRow}>
                  <View style={styles.spotlightTextCol}>
                    <View style={styles.spotlightBadge}>
                      <Text style={styles.spotlightBadgeText}>CURATED SPOTLIGHT</Text>
                    </View>
                    <Text style={styles.spotlightTitle} numberOfLines={2}>
                      {spotlightBanner.title}
                    </Text>
                    <Text style={styles.spotlightSubtitle} numberOfLines={2}>
                      Staff recommendation & tested vintage compact
                    </Text>
                    <View style={styles.spotlightCtaRow}>
                      <Text style={styles.spotlightCtaText}>Explore Now</Text>
                      <Feather name="arrow-right" size={12} color="#f87171" />
                    </View>
                  </View>

                  {spotlightBanner.imageRef ? (
                    <View style={styles.spotlightImageWrap}>
                      <Image
                        source={{ uri: resolveBannerImageUrl(spotlightBanner.imageRef) }}
                        style={styles.spotlightImage}
                        resizeMode="contain"
                      />
                    </View>
                  ) : null}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Deal Banner Strip */}
        {dealBanner && (
          <View style={styles.dealContainer}>
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.dealCard}
              onPress={() => handleBannerPress(dealBanner.linkTarget)}
            >
              <LinearGradient
                colors={['#1e0505', '#120202', '#0a0a0a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.dealGradient}
              >
                <Text style={styles.dealWatermark} pointerEvents="none">
                  REPIXL
                </Text>

                <ViewfinderCorners color="rgba(248, 113, 113, 0.3)" size={14} inset={10} />

                <View style={styles.dealContentRow}>
                  <View style={styles.dealTextCol}>
                    <View style={styles.dealBadgeRow}>
                      <View style={styles.dealBadgeLine} />
                      <Text style={styles.dealBadgeText}>FEATURED THIS WEEK</Text>
                    </View>
                    <Text style={styles.dealTitle} numberOfLines={2}>
                      {dealBanner.title}
                    </Text>
                    <Text style={styles.dealSubtitle} numberOfLines={2}>
                      Curated promotional collection selected by RePXL curators.
                    </Text>
                    <View style={styles.dealCtaBtn}>
                      <Text style={styles.dealCtaText}>Explore Deals</Text>
                      <Feather name="arrow-right" size={12} color="#fff" />
                    </View>
                  </View>

                  {dealBanner.imageRef ? (
                    <View style={styles.dealImageWrap}>
                      <Image
                        source={{ uri: resolveBannerImageUrl(dealBanner.imageRef) }}
                        style={styles.dealImage}
                        resizeMode="contain"
                      />
                    </View>
                  ) : null}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Products */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Products ({displayedProducts.length})</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
            <Text style={styles.viewAllText}>View all →</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.grid, { paddingHorizontal: horizontalPadding, gap }]}>
          {error ? <Text style={styles.loadMessage}>{error}</Text> : null}
          {displayedProducts.map((product) => (
            <ProductCard key={product.id} product={product} cardWidth={cardWidth} />
          ))}
          {products.length === 0 && !error ? (
            <Text style={styles.loadMessage}>Loading current inventory…</Text>
          ) : null}
        </View>
      </ScrollView>
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
    paddingVertical: 14,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  logoText: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 20,
    color: '#fff',
    borderWidth: 1.5,
    borderColor: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  logoDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#c62828', marginLeft: 3 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  bellButton: { position: 'relative', justifyContent: 'center', alignItems: 'center', minWidth: 32, minHeight: 32 },
  bellBadge: {
    position: 'absolute',
    top: -5,
    right: -7,
    backgroundColor: '#c62828',
    borderRadius: 99,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: { color: '#fff', fontSize: 9, fontFamily: 'Inter_700Bold' },
  greeting: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#fff' },
  greetingSub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#666', marginTop: 2 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#1c1c1e',
    borderWidth: 1,
    borderColor: '#2c2c2e',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#fff', fontFamily: 'Inter_400Regular' },
  searchGoBtn: {
    backgroundColor: '#c62828',
    borderRadius: 8,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#fff' },
  viewAllText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#c62828' },
  catPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: '#1c1c1e',
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  catPillActive: { backgroundColor: '#c62828', borderColor: '#c62828' },
  catPillText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#aaa' },
  catPillTextActive: { color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  loadMessage: {
    width: '100%',
    color: '#888',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
  card: {
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2c2c2e',
    elevation: 3,
  },
  cardImage: { width: '100%', backgroundColor: '#111' },
  cardHeartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { padding: 10, gap: 4 },
  condBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  condBadgeText: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  cardBrand: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#666', letterSpacing: 0.5 },
  cardName: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#fff', lineHeight: 18 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 4,
  },
  cardPrice: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#fff', flexShrink: 1 },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  stockDot: { width: 6, height: 6, borderRadius: 3 },
  stockText: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  // Viewfinder corner marks
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    borderBottomWidth: 1.5,
    borderLeftWidth: 1.5,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
  },

  // Hero Banner Showcase
  heroContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  heroCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    elevation: 4,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  heroGradient: {
    position: 'relative',
    padding: 16,
    minHeight: 180,
    justifyContent: 'center',
  },
  heroGlow: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
  },
  heroContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroTextCol: {
    flex: 1,
    gap: 6,
    paddingRight: 4,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(220, 38, 38, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.55)',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  heroBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  heroBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#fca5a5',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 18,
    color: '#fff',
    lineHeight: 23,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#ccc',
    lineHeight: 16,
  },
  heroCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#c62828',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 4,
  },
  heroCtaText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#fff',
    letterSpacing: 0.3,
  },
  heroImageWrap: {
    width: 115,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  heroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  heroDotActive: {
    width: 16,
    backgroundColor: '#ef4444',
  },

  // Curated Spotlight Banner
  spotlightContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  spotlightCard: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    elevation: 3,
  },
  spotlightGradient: {
    position: 'relative',
    padding: 14,
    minHeight: 135,
    justifyContent: 'center',
  },
  spotlightContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  spotlightTextCol: {
    flex: 1,
    gap: 5,
  },
  spotlightBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  spotlightBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#ddd',
    letterSpacing: 0.8,
  },
  spotlightTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: '#fff',
    lineHeight: 20,
  },
  spotlightSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#999',
    lineHeight: 15,
  },
  spotlightCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  spotlightCtaText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#f87171',
  },
  spotlightImageWrap: {
    width: 95,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotlightImage: {
    width: '100%',
    height: '100%',
  },

  // Deal Banner Strip
  dealContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  dealCard: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(198, 40, 40, 0.4)',
    elevation: 3,
    shadowColor: '#c62828',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  dealGradient: {
    position: 'relative',
    padding: 16,
    minHeight: 150,
    justifyContent: 'center',
  },
  dealWatermark: {
    position: 'absolute',
    top: 10,
    right: 14,
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 42,
    color: 'rgba(255, 255, 255, 0.04)',
    letterSpacing: -1,
  },
  dealContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dealTextCol: {
    flex: 1,
    gap: 5,
    zIndex: 2,
  },
  dealBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dealBadgeLine: {
    width: 14,
    height: 1.5,
    backgroundColor: '#ef4444',
  },
  dealBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#ef4444',
    letterSpacing: 1.2,
  },
  dealTitle: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 17,
    color: '#fff',
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  dealSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#aaa',
    lineHeight: 15,
  },
  dealCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(198, 40, 40, 0.85)',
    borderRadius: 7,
    paddingHorizontal: 11,
    paddingVertical: 6,
    marginTop: 4,
  },
  dealCtaText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#fff',
  },
  dealImageWrap: {
    width: 100,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  dealImage: {
    width: '100%',
    height: '100%',
  },
});
