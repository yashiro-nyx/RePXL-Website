import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type {
  AccountReview,
  Address,
  CartItem,
  Notification,
  Order,
  Product,
  Profile,
  User,
} from '../types';
import {
  api,
  ApiError,
  clearSession,
  loadSession,
  mapUser,
  saveSession,
  API_BASE_URL,
  type LoginResult,
} from '../src/services/api';
import type { MobileUser } from '../src/services/session';
import { registerPushNotifications, isExpoGo } from '../src/services/push';
import * as Notifications from 'expo-notifications';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

WebBrowser.maybeCompleteAuthSession();

type AuthResult = { mfaRequired: boolean; challenge?: string; cancelled?: boolean };

interface AppContextType {
  loading: boolean;
  refreshing: boolean;
  error: string;
  products: Product[];
  cart: CartItem[];
  user: User | null;
  profile: Profile | null;
  wishlist: string[];
  compareList: string[];
  addresses: Address[];
  orders: Order[];
  notifications: Notification[];
  unreadNotificationsCount: number;
  reviews: AccountReview[];
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: (mode?: 'login' | 'register' | 'auto') => Promise<AuthResult>;
  verifyMfa: (challenge: string, code: string) => Promise<void>;
  register: (input: { firstName: string; lastName: string; email: string; password: string }) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshProducts: (query?: string) => Promise<void>;
  refreshAccount: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  updateQty: (productId: string, quantity: number) => Promise<void>;
  toggleWishlist: (productId: string) => Promise<void>;
  toggleCompare: (productId: string) => void;
  clearCart: () => Promise<void>;
  saveProfile: (input: { firstName: string; lastName: string; username?: string }) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  addAddress: (data: Omit<Address, 'id'>) => Promise<Address>;
  updateAddress: (id: string, data: Omit<Address, 'id'>) => Promise<Address>;
  deleteAddress: (id: string) => Promise<void>;
  setDefaultAddress: (id: string) => Promise<void>;
  submitReview: (productId: string, rating: number, comment: string) => Promise<AccountReview>;
  removeReview: (reviewId: string) => Promise<void>;
  cancelOrder: (orderNumber: string) => Promise<Order>;
  confirmReceipt: (orderNumber: string, rating?: number, comment?: string) => Promise<Order>;
  updateOrderStatus: (orderNumber: string, status: string) => Promise<Order>;
  validateVoucher: (code: string, cartTotal: number) => Promise<{
    valid: boolean;
    discount: number;
    error?: string;
    voucher?: { code: string; description: string };
  }>;
}

const AppContext = createContext<AppContextType | null>(null);

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to reach RePXL. Please try again.';
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const wishlistLockRef = useRef<Set<string>>(new Set());
  const cartLockRef = useRef<Set<string>>(new Set());
  const [compareList, setCompareList] = useState<string[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reviews, setReviews] = useState<AccountReview[]>([]);

  const resetAccount = useCallback(() => {
    setCart([]);
    setUser(null);
    setProfile(null);
    setWishlist([]);
    setAddresses([]);
    setOrders([]);
    setNotifications([]);
    setReviews([]);
  }, []);

  const refreshProducts = useCallback(async (query = '') => {
    try {
      setProducts(await api.products(query));
      setError('');
    } catch (reason) {
      setError(message(reason));
      throw reason;
    }
  }, []);

  const refreshAccount = useCallback(async () => {
    const current = await loadSession();
    if (!current) {
      resetAccount();
      return;
    }
    setRefreshing(true);
    try {
      const [cartRes, wishlistRes, profileRes, addressesRes, ordersRes, notificationsRes, reviewsRes] =
        await Promise.allSettled([
          api.cart(),
          api.wishlist(),
          api.profile(),
          api.addresses(),
          api.orders(),
          api.notifications(),
          api.reviews(),
        ]);

      if (cartRes.status === 'fulfilled') setCart(cartRes.value);
      if (wishlistRes.status === 'fulfilled') setWishlist(wishlistRes.value.map((item) => item.product.id));
      if (profileRes.status === 'fulfilled') {
        setProfile(profileRes.value);
        setUser(profileRes.value);
      }
      if (addressesRes.status === 'fulfilled') setAddresses(addressesRes.value);
      if (ordersRes.status === 'fulfilled') setOrders(ordersRes.value);
      if (notificationsRes.status === 'fulfilled') setNotifications(notificationsRes.value);
      if (reviewsRes.status === 'fulfilled') setReviews(reviewsRes.value);

      const rejectedAuth = [cartRes, profileRes, ordersRes].find(
        (r) =>
          r.status === 'rejected' &&
          r.reason instanceof ApiError &&
          (r.reason.status === 401 || r.reason.status === 403)
      );
      if (rejectedAuth) {
        const remaining = await loadSession();
        if (!remaining) resetAccount();
      } else {
        setError('');
      }
    } catch (reason) {
      const remaining = await loadSession();
      if (!remaining) resetAccount();
      setError(message(reason));
    } finally {
      setRefreshing(false);
    }
  }, [resetAccount]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // Immediate local restoration so UI remains persistently logged in
        const stored = await loadSession();
        if (!active) return;
        if (stored?.user) {
          setUser(mapUser(stored.user));
        }

        // Sync products and validate session in background
        const [nextProducts] = await Promise.all([
          api.products().catch(() => null),
        ]);
        if (!active) return;
        if (nextProducts) setProducts(nextProducts);

        if (stored) {
          try {
            const authenticated = await api.me();
            if (!active) return;
            setUser(mapUser(authenticated));
            await refreshAccount();
            void registerPushNotifications().catch(() => undefined);
          } catch {
            // Keep the user logged in if offline or network temporarily failed.
            // Only clear account if the session was explicitly deleted (authoritative 401/403).
            const remaining = await loadSession();
            if (!remaining && active) {
              resetAccount();
            }
          }
        }
      } catch (reason) {
        if (!active) return;
        const remaining = await loadSession();
        if (!remaining) resetAccount();
        setError(message(reason));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [refreshAccount, resetAccount]);

  const acceptLogin = useCallback(async (result: LoginResult) => {
    if (!result.user || !result.tokens) throw new Error('The server returned an incomplete session.');
    await saveSession({ user: result.user, tokens: result.tokens });
    setUser(mapUser(result.user));
    await refreshAccount();
    void registerPushNotifications().catch(() => undefined);
  }, [refreshAccount]);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    setError('');
    const result = await api.login(email.trim().toLowerCase(), password);
    if (result.mfaRequired) return { mfaRequired: true, challenge: result.challenge };
    await acceptLogin(result);
    return { mfaRequired: false };
  }, [acceptLogin]);

  const signInWithGoogle = useCallback(
    async (mode: 'login' | 'register' | 'auto' = 'auto'): Promise<AuthResult> => {
      setError('');
      const redirectUri = Linking.createURL('auth/callback');
      const authUrl = `${API_BASE_URL}/auth/mobile-google?mode=${mode}&redirect_uri=${encodeURIComponent(redirectUri)}`;

      const sessionResult = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (sessionResult.type !== 'success' || !sessionResult.url) {
        // User dismissed/cancelled Google sign-in window
        return { mfaRequired: false, cancelled: true };
      }

      const parsed = Linking.parse(sessionResult.url);
      if (parsed.queryParams?.error) {
        throw new Error(String(parsed.queryParams.error));
      }

      const ticket = parsed.queryParams?.ticket as string | undefined;
      if (!ticket) {
        throw new Error('Google sign-in did not return a valid session ticket.');
      }

      const result = await api.exchangeGoogleOAuthTicket(ticket);
      if (result.mfaRequired && result.challenge) {
        return { mfaRequired: true, challenge: result.challenge };
      }

      await acceptLogin(result);
      return { mfaRequired: false };
    },
    [acceptLogin]
  );

  const verifyMfa = useCallback(async (challenge: string, code: string) => {
    const result = await api.verifyMfa(challenge, code.trim());
    await acceptLogin({ mfaRequired: false, ...result });
  }, [acceptLogin]);

  const register = useCallback(async (input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) => {
    const result = await api.register({ ...input, email: input.email.trim().toLowerCase() });
    if (result.mfaRequired) return { mfaRequired: true, challenge: result.challenge };
    await acceptLogin(result);
    return { mfaRequired: false };
  }, [acceptLogin]);

  const logout = useCallback(async () => {
    const stored = await loadSession();
    if (stored) await api.logout(stored.tokens.refreshToken).catch(() => undefined);
    await clearSession();
    resetAccount();
  }, [resetAccount]);

  const reloadCart = useCallback(async () => setCart(await api.cart()), []);

  const addToCart = useCallback(async (product: Product, quantity = 1) => {
    if (!user) throw new Error('Sign in to add items to your synced cart.');
    if (cartLockRef.current.has(product.id)) return;
    cartLockRef.current.add(product.id);
    try {
      await api.addToCart(product.id, quantity);
      await reloadCart();
    } finally {
      cartLockRef.current.delete(product.id);
    }
  }, [reloadCart, user]);

  const removeFromCart = useCallback(async (productId: string) => {
    const item = cart.find((entry) => entry.product.id === productId);
    if (!item) return;
    await api.removeCart(item.id);
    await reloadCart();
  }, [cart, reloadCart]);

  const updateQty = useCallback(async (productId: string, quantity: number) => {
    const item = cart.find((entry) => entry.product.id === productId);
    if (!item) return;
    if (quantity <= 0) await api.removeCart(item.id);
    else await api.updateCart(item.id, quantity);
    await reloadCart();
  }, [cart, reloadCart]);

  const toggleWishlist = useCallback(async (productId: string) => {
    if (!user) throw new Error('Sign in to use your synced wishlist.');
    if (wishlistLockRef.current.has(productId)) return;
    wishlistLockRef.current.add(productId);

    const isCurrentlyWishlisted = wishlist.includes(productId);

    // Optimistically update local wishlist state immediately
    setWishlist((current) =>
      isCurrentlyWishlisted
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    );

    try {
      if (isCurrentlyWishlisted) {
        await api.removeWishlist(productId).catch((err) => {
          if (err instanceof ApiError && err.status === 404) return;
          throw err;
        });
      } else {
        await api.addWishlist(productId).catch((err) => {
          if (err instanceof ApiError && err.status === 409) return;
          throw err;
        });
      }
      const synced = await api.wishlist();
      setWishlist(synced.map((item) => item.product.id));
    } catch (err) {
      console.warn('[wishlist] Failed to toggle wishlist:', err);
      // Re-sync on error to restore consistent server state
      try {
        const synced = await api.wishlist();
        setWishlist(synced.map((item) => item.product.id));
      } catch {}
    } finally {
      wishlistLockRef.current.delete(productId);
    }
  }, [user, wishlist]);

  const toggleCompare = useCallback((productId: string) => {
    setCompareList((current) => {
      if (current.includes(productId)) return current.filter((id) => id !== productId);
      return current.length < 3 ? [...current, productId] : current;
    });
  }, []);

  const clearCart = useCallback(async () => {
    if (!user) return;
    await api.clearCart();
    setCart([]);
  }, [user]);

  const saveProfile = useCallback(async (input: { firstName: string; lastName: string; username?: string }) => {
    const updated = await api.updateProfile(input);
    setProfile(updated);
    setUser(updated);
    // Persist updated profile info in local session storage
    const current = await loadSession();
    if (current) {
      await saveSession({
        ...current,
        user: { ...current.user, firstName: updated.firstName, lastName: updated.lastName },
      });
    }
  }, []);

  const cancelOrder = useCallback(async (orderNumber: string) => {
    const updated = await api.cancelOrder(orderNumber);
    setOrders((current) =>
      current.map((order) => (order.orderNumber === orderNumber ? updated : order))
    );
    return updated;
  }, []);

  const confirmReceipt = useCallback(async (orderNumber: string, rating?: number, comment?: string) => {
    const updated = await api.confirmReceipt(orderNumber, rating, comment);
    setOrders((current) =>
      current.map((order) => (order.orderNumber === orderNumber ? updated : order))
    );
    return updated;
  }, []);

  const updateOrderStatus = useCallback(async (orderNumber: string, status: string) => {
    const updated = await api.updateOrderStatus(orderNumber, status);
    setOrders((current) =>
      current.map((order) => (order.orderNumber === orderNumber ? updated : order))
    );
    return updated;
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const next = await api.notifications();
      setNotifications(next);
    } catch {
      // non-fatal
    }
  }, []);

  const markNotificationRead = useCallback(async (id: string) => {
    const updated = await api.markNotificationRead(id);
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, ...updated } : item));
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    await api.markAllNotificationsRead();
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
  }, []);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((item) => !item.isRead).length;
  }, [notifications]);

  useEffect(() => {
    if (isExpoGo && Platform.OS === 'android') return;
    let sub: Notifications.Subscription | null = null;
    try {
      sub = Notifications.addNotificationReceivedListener(() => {
        void refreshNotifications();
      });
    } catch {
      // ignore in non-supported environments
    }
    return () => {
      sub?.remove();
    };
  }, [refreshNotifications]);

  const addAddress = useCallback(async (data: Omit<Address, 'id'>) => {
    const created = await api.createAddress(data);
    setAddresses(await api.addresses());
    return created;
  }, []);

  const updateAddress = useCallback(async (id: string, data: Omit<Address, 'id'>) => {
    const updated = await api.updateAddress(id, data);
    setAddresses(await api.addresses());
    return updated;
  }, []);

  const deleteAddress = useCallback(async (id: string) => {
    await api.deleteAddress(id);
    setAddresses(await api.addresses());
  }, []);

  const setDefaultAddress = useCallback(async (id: string) => {
    await api.setDefaultAddress(id);
    setAddresses(await api.addresses());
  }, []);

  const submitReview = useCallback(async (productId: string, rating: number, comment: string) => {
    const created = await api.createReview(productId, rating, comment);
    setReviews(await api.reviews());
    return created;
  }, []);

  const removeReview = useCallback(async (reviewId: string) => {
    await api.deleteReview(reviewId);
    setReviews((current) => current.filter((item) => item.id !== reviewId));
  }, []);

  const validateVoucher = useCallback(async (code: string, cartTotal: number) => {
    return api.validateVoucher(code, cartTotal);
  }, []);

  const value = useMemo<AppContextType>(() => ({
    loading,
    refreshing,
    error,
    products,
    cart,
    user,
    profile,
    wishlist,
    compareList,
    addresses,
    orders,
    notifications,
    unreadNotificationsCount,
    reviews,
    signIn,
    signInWithGoogle,
    verifyMfa,
    register,
    logout,
    refreshProducts,
    refreshAccount,
    refreshNotifications,
    addToCart,
    removeFromCart,
    updateQty,
    toggleWishlist,
    toggleCompare,
    clearCart,
    saveProfile,
    markNotificationRead,
    markAllNotificationsRead,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    submitReview,
    removeReview,
    cancelOrder,
    confirmReceipt,
    updateOrderStatus,
    validateVoucher,
  }), [
    loading, refreshing, error, products, cart, user, profile, wishlist, compareList,
    addresses, orders, notifications, unreadNotificationsCount, reviews, signIn, signInWithGoogle, verifyMfa, register, logout,
    refreshProducts, refreshAccount, refreshNotifications, addToCart, removeFromCart, updateQty,
    toggleWishlist, toggleCompare, clearCart, saveProfile, markNotificationRead, markAllNotificationsRead,
    addAddress, updateAddress, deleteAddress, setDefaultAddress, submitReview,
    removeReview, cancelOrder, confirmReceipt, updateOrderStatus, validateVoucher,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be inside AppProvider');
  return context;
}
