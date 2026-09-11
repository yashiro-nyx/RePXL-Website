import type {
  AccountReview,
  Address,
  CartItem,
  Notification,
  Order,
  Product,
  ProductReview,
  Profile,
  User,
} from '../../types';
import {
  clearSession,
  loadSession,
  saveSession,
  type MobileSession,
  type MobileTokens,
  type MobileUser,
} from './session';

const configuredOrigin = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
export const API_BASE_URL = (configuredOrigin || 'https://repxlph.vercel.app').replace(/\/+$/, '');

type ApiEnvelope<T> = { success: boolean; data?: T; error?: string; details?: string[] };

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

type RawProduct = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  series?: string | null;
  price: number;
  condition: Product['condition'];
  image: string;
  stock: number;
  description?: string | null;
  conditionNotes?: string | null;
  megapixels?: number | null;
  zoom?: string | null;
  storage?: string | null;
  year?: number | null;
};

type RawOrder = Omit<Order, 'items'> & {
  items: Array<Omit<Order['items'][number], 'product'> & { product: RawProduct }>;
};

function mapProduct(product: RawProduct): Product {
  const image = /^https?:\/\//i.test(product.image)
    ? product.image
    : `${API_BASE_URL}${product.image.startsWith('/') ? '' : '/'}${product.image}`;
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    series: product.series ?? '',
    price: product.price,
    condition: product.condition,
    rating: 0,
    reviews: 0,
    inStock: product.stock > 0,
    stockCount: product.stock,
    image,
    description: product.description ?? '',
    conditionDetails: product.conditionNotes ?? '',
    colorProfile: {
      title: 'RePXL verified camera',
      description: 'See the camera details and sample output before ordering.',
    },
    specs: {
      megapixels: product.megapixels ? `${product.megapixels} MP` : 'Not listed',
      sensor: 'Not listed',
      opticalZoom: product.zoom ?? 'Not listed',
      lcd: 'Not listed',
      isoRange: 'Not listed',
      shutterSpeed: 'Not listed',
      storage: product.storage ?? 'Not listed',
      battery: 'Not listed',
      weight: 'Not listed',
      year: product.year?.toString() ?? 'Not listed',
    },
    reviewList: [],
  };
}

function mapUser(user: MobileUser): User {
  return { ...user, name: `${user.firstName} ${user.lastName}`.trim() };
}

function mapOrder(order: RawOrder): Order {
  return {
    ...order,
    items: order.items.map((item) => ({ ...item, product: mapProduct(item.product) })),
  };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...init.headers },
  });
  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !body?.success || body.data === undefined) {
    throw new ApiError(body?.error ?? `Request failed (${response.status})`, response.status);
  }
  return body.data;
}

let refreshPromise: Promise<MobileSession> | null = null;

async function refreshSession(): Promise<MobileSession> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const current = await loadSession();
      if (!current) throw new ApiError('Your session has expired. Please sign in again.', 401);
      const refreshed = await request<{ user: MobileUser; tokens: MobileTokens }>('/api/mobile/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: current.tokens.refreshToken }),
        headers: { 'x-platform': 'expo' },
      });
      const next = { user: refreshed.user, tokens: refreshed.tokens };
      await saveSession(next);
      return next;
    })().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

async function authorized<T>(path: string, init: RequestInit = {}): Promise<T> {
  const current = await loadSession();
  if (!current) throw new ApiError('Sign in required.', 401);
  const send = (token: string) => request<T>(path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init.headers },
  });
  try {
    return await send(current.tokens.accessToken);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    try {
      const refreshed = await refreshSession();
      return await send(refreshed.tokens.accessToken);
    } catch (refreshError) {
      await clearSession();
      throw refreshError;
    }
  }
}

export type LoginResult = {
  mfaRequired: boolean;
  challenge?: string;
  user?: MobileUser;
  tokens?: MobileTokens;
};

export const api = {
  login: (email: string, password: string) => request<LoginResult>('/api/mobile/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    headers: { 'x-platform': 'expo' },
  }),
  verifyMfa: (challenge: string, code: string) => request<{ user: MobileUser; tokens: MobileTokens }>('/api/mobile/auth/mfa/verify', {
    method: 'POST',
    body: JSON.stringify({ challenge, code }),
    headers: { 'x-platform': 'expo' },
  }),
  register: (input: { firstName: string; lastName: string; email: string; password: string }) =>
    request<LoginResult>('/api/mobile/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
      headers: { 'x-platform': 'expo' },
    }),
  me: () => authorized<MobileUser>('/api/mobile/auth/me'),
  logout: (refreshToken: string) => authorized<{ loggedOut: boolean }>('/api/mobile/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  }),
  products: async (query = '') => (
    await request<RawProduct[]>(`/api/products?limit=100${query ? `&q=${encodeURIComponent(query)}` : ''}`)
  ).map(mapProduct),
  product: async (slug: string) => mapProduct(await request<RawProduct>(`/api/products/${encodeURIComponent(slug)}`)),
  productReviews: async (slug: string) => {
    const reviews = await request<Array<{ id: string; reviewerName: string; rating: number; comment: string; createdAt: string }>>(
      `/api/reviews?productSlug=${encodeURIComponent(slug)}&limit=50`,
    );
    return reviews.map<ProductReview>((review) => ({
      id: review.id,
      author: review.reviewerName,
      rating: review.rating,
      body: review.comment,
      date: review.createdAt,
    }));
  },
  cart: async () => (
    await authorized<Array<Omit<CartItem, 'product'> & { product: RawProduct }>>('/api/cart')
  ).map((item) => ({ ...item, product: mapProduct(item.product) })),
  addToCart: (productId: string, quantity = 1) => authorized('/api/cart', {
    method: 'POST',
    body: JSON.stringify({ productId, quantity }),
  }),
  updateCart: (itemId: string, quantity: number) => authorized(`/api/cart/${encodeURIComponent(itemId)}`, {
    method: 'PUT',
    body: JSON.stringify({ quantity }),
  }),
  removeCart: (itemId: string) => authorized(`/api/cart/${encodeURIComponent(itemId)}`, { method: 'DELETE' }),
  clearCart: () => authorized('/api/cart', { method: 'DELETE' }),
  wishlist: async () => (
    await authorized<Array<{ id: string; product: RawProduct }>>('/api/wishlist')
  ).map((item) => ({ ...item, product: mapProduct(item.product) })),
  addWishlist: (productId: string) => authorized('/api/wishlist', {
    method: 'POST',
    body: JSON.stringify({ productId }),
  }),
  removeWishlist: (productId: string) => authorized(`/api/wishlist/${encodeURIComponent(productId)}`, { method: 'DELETE' }),
  profile: async () => {
    const profile = await authorized<Omit<Profile, 'name'>>('/api/auth/me?scope=customer');
    return { ...profile, name: `${profile.firstName} ${profile.lastName}`.trim() };
  },
  updateProfile: async (input: { firstName: string; lastName: string; username?: string }) => {
    const profile = await authorized<Omit<Profile, 'name'>>('/api/auth/me?scope=customer', {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    return { ...profile, name: `${profile.firstName} ${profile.lastName}`.trim() };
  },
  addresses: () => authorized<Address[]>('/api/addresses'),
  orders: async () => {
    const orders = await authorized<RawOrder[]>('/api/orders?limit=50');
    return orders.map(mapOrder);
  },
  order: async (orderNumber: string) => mapOrder(await authorized<RawOrder>(`/api/orders/${encodeURIComponent(orderNumber)}`)),
  notifications: () => authorized<Notification[]>('/api/notifications?limit=50'),
  markNotificationRead: (id: string) => authorized<Pick<Notification, 'id' | 'isRead'>>(
    `/api/notifications/${encodeURIComponent(id)}/read`,
    { method: 'PATCH' },
  ),
  registerPushToken: (token: string, platform: string) => authorized<{ id: string; registered: boolean }>('/api/mobile/push-token', {
    method: 'POST',
    body: JSON.stringify({ token, platform }),
  }),
  reviews: () => authorized<AccountReview[]>('/api/reviews?mine=true&limit=50'),
  checkout: (
    address: Address,
    selectedProductIds: string[],
    paymentMethod: 'card' | 'gcash',
  ) => authorized<{ checkoutUrl: string; orderNumber: string; sessionId: string }>('/api/checkout/session', {
    method: 'POST',
    body: JSON.stringify({
      fullName: address.fullName,
      address: address.address,
      barangay: address.barangay,
      city: address.city,
      province: address.province,
      postalCode: address.postalCode,
      courierName: 'Standard delivery',
      courierEstimate: '3-5 business days',
      paymentMethod,
      voucherCode: null,
      shippingCost: 0,
      selectedProductIds,
    }),
  }),
};

export { clearSession, loadSession, mapUser, saveSession };
