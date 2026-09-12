import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
  clearSession,
  loadSession,
  mapUser,
  saveSession,
  type LoginResult,
} from '../src/services/api';
import type { MobileUser } from '../src/services/session';
import { registerPushNotifications } from '../src/services/push';

type AuthResult = { mfaRequired: boolean; challenge?: string };

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
  reviews: AccountReview[];
  signIn: (email: string, password: string) => Promise<AuthResult>;
  verifyMfa: (challenge: string, code: string) => Promise<void>;
  register: (input: { firstName: string; lastName: string; email: string; password: string }) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshProducts: (query?: string) => Promise<void>;
  refreshAccount: () => Promise<void>;
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  updateQty: (productId: string, quantity: number) => Promise<void>;
  toggleWishlist: (productId: string) => Promise<void>;
  toggleCompare: (productId: string) => void;
  clearCart: () => Promise<void>;
  saveProfile: (input: { firstName: string; lastName: string; username?: string }) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  addAddress: (data: Omit<Address, 'id'>) => Promise<Address>;
  updateAddress: (id: string, data: Omit<Address, 'id'>) => Promise<Address>;
  deleteAddress: (id: string) => Promise<void>;
  setDefaultAddress: (id: string) => Promise<void>;
  submitReview: (productId: string, rating: number, comment: string) => Promise<AccountReview>;
  removeReview: (reviewId: string) => Promise<void>;
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
      const [nextCart, nextWishlist, nextProfile, nextAddresses, nextOrders, nextNotifications, nextReviews] =
        await Promise.all([
          api.cart(),
          api.wishlist(),
          api.profile(),
          api.addresses(),
          api.orders(),
          api.notifications(),
          api.reviews(),
        ]);
      setCart(nextCart);
      setWishlist(nextWishlist.map((item) => item.product.id));
      setProfile(nextProfile);
      setUser(nextProfile);
      setAddresses(nextAddresses);
      setOrders(nextOrders);
      setNotifications(nextNotifications);
      setReviews(nextReviews);
      setError('');
    } catch (reason) {
      const remaining = await loadSession();
      if (!remaining) resetAccount();
      setError(message(reason));
      throw reason;
    } finally {
      setRefreshing(false);
    }
  }, [resetAccount]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [stored, nextProducts] = await Promise.all([loadSession(), api.products()]);
        if (!active) return;
        setProducts(nextProducts);
        if (stored) {
          const authenticated = await api.me();
          if (!active) return;
          setUser(mapUser(authenticated));
          await refreshAccount();
          void registerPushNotifications().catch(() => undefined);
        }
      } catch (reason) {
        if (!active) return;
        if (!(await loadSession())) resetAccount();
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
    await api.addToCart(product.id, quantity);
    await reloadCart();
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
    if (wishlist.includes(productId)) await api.removeWishlist(productId);
    else await api.addWishlist(productId);
    setWishlist((await api.wishlist()).map((item) => item.product.id));
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
  }, []);

  const markNotificationRead = useCallback(async (id: string) => {
    const updated = await api.markNotificationRead(id);
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, ...updated } : item));
  }, []);

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
    setReviews(await api.reviews());
  }, []);

  const validateVoucher = useCallback(async (code: string, cartTotal: number) => {
    return await api.validateVoucher(code, cartTotal);
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
    reviews,
    signIn,
    verifyMfa,
    register,
    logout,
    refreshProducts,
    refreshAccount,
    addToCart,
    removeFromCart,
    updateQty,
    toggleWishlist,
    toggleCompare,
    clearCart,
    saveProfile,
    markNotificationRead,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    submitReview,
    removeReview,
    validateVoucher,
  }), [
    loading, refreshing, error, products, cart, user, profile, wishlist, compareList,
    addresses, orders, notifications, reviews, signIn, verifyMfa, register, logout,
    refreshProducts, refreshAccount, addToCart, removeFromCart, updateQty,
    toggleWishlist, toggleCompare, clearCart, saveProfile, markNotificationRead,
    addAddress, updateAddress, deleteAddress, setDefaultAddress, submitReview,
    removeReview, validateVoucher,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be inside AppProvider');
  return context;
}
