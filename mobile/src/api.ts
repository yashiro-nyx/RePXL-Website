import { loadSession, saveSession, type MobileSession, type MobileTokens, type MobileUser } from './session'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type ApiEnvelope<T> = { success: boolean; data?: T; error?: string; pagination?: unknown }
export type Product = { id: string; slug: string; name: string; brand: string; price: number; stock: number; image: string }
export type CartItem = { id: string; quantity: number; product: Product }
export type WishlistItem = { id: string; product: Product }
export type Address = {
  id: string
  fullName: string
  address: string
  barangay: string
  city: string
  province: string
  postalCode: string
  phone: string
  isDefault: boolean
}
export type Profile = MobileUser & {
  username: string | null
  gender: string | null
  avatarUrl: string | null
  maskedPhone: string
  maskedDob: string
  hasPassword: boolean
}
export type Order = {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  total: number
  deliveryStatus: string
  trackingProgress: number
  createdAt: string
  trackingDescription: string
  items: Array<{ id: string; quantity: number; price: number; product: Product }>
}
export type ReturnRequest = { id: string; orderId: string; reason: string; status: string; createdAt: string }
export type Review = { id: string; productId: string; rating: number; comment: string; verifiedPurchase: boolean; createdAt: string; product?: { slug: string; name: string } }
export type Notification = { id: string; event: string; message: string; isRead: boolean; createdAt: string }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...init?.headers },
  })
  const body = (await response.json()) as ApiEnvelope<T>
  if (!response.ok || !body.success || body.data === undefined) throw new ApiError(body.error ?? `Request failed (${response.status})`, response.status)
  return body.data
}

async function authenticated<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  try {
    return await request<T>(path, { ...init, headers: { Authorization: `Bearer ${accessToken}`, ...init?.headers } })
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error
    const current = await loadSession()
    if (!current) throw error
    const refreshed = await request<{ user: MobileUser; tokens: MobileTokens }>('/api/mobile/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: current.tokens.refreshToken }),
    })
    await saveSession({ user: refreshed.user, tokens: refreshed.tokens })
    return request<T>(path, { ...init, headers: { Authorization: `Bearer ${refreshed.tokens.accessToken}`, ...init?.headers } })
  }
}

export const api = {
  async login(email: string, password: string) {
    return request<{ mfaRequired: boolean; challenge?: string; user?: MobileUser; tokens?: MobileTokens }>('/api/mobile/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      headers: { 'x-platform': 'expo' },
    })
  },
  async verifyMfa(challenge: string, code: string) {
    return request<{ user: MobileUser; tokens: MobileTokens }>('/api/mobile/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ challenge, code }),
      headers: { 'x-platform': 'expo' },
    })
  },
  async me(accessToken: string) {
    return authenticated<MobileUser>('/api/mobile/auth/me', accessToken)
  },
  async logout(accessToken: string, refreshToken: string) {
    return authenticated<{ loggedOut: boolean }>('/api/mobile/auth/logout', accessToken, {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    })
  },
  async products() {
    return request<Product[]>('/api/products?limit=50')
  },
  async cart(accessToken: string) {
    return authenticated<CartItem[]>('/api/cart', accessToken)
  },
  async addToCart(accessToken: string, productId: string) {
    return authenticated<CartItem>('/api/cart', accessToken, {
      method: 'POST',
      body: JSON.stringify({ productId, quantity: 1 }),
    })
  },
  async wishlist(accessToken: string) {
    return authenticated<WishlistItem[]>('/api/wishlist', accessToken)
  },
  async addToWishlist(accessToken: string, productId: string) {
    return authenticated<WishlistItem>('/api/wishlist', accessToken, {
      method: 'POST',
      body: JSON.stringify({ productId }),
    })
  },
  async removeFromWishlist(accessToken: string, productId: string) {
    return authenticated<{ message: string }>(`/api/wishlist/${productId}`, accessToken, { method: 'DELETE' })
  },
  async profile(accessToken: string) {
    return authenticated<Profile>('/api/auth/me?scope=customer', accessToken)
  },
  async updateProfile(accessToken: string, profile: Pick<Profile, 'firstName' | 'lastName'>) {
    return authenticated<Profile>('/api/auth/me?scope=customer', accessToken, {
      method: 'PUT',
      body: JSON.stringify(profile),
    })
  },
  async addresses(accessToken: string) {
    return authenticated<Address[]>('/api/addresses', accessToken)
  },
  async orders(accessToken: string) {
    return authenticated<Order[]>('/api/orders?limit=50', accessToken)
  },
  async startCheckout(accessToken: string, input: { address: Address; selectedProductIds: string[] }) {
    return authenticated<{ checkoutUrl: string; orderNumber: string; sessionId: string }>('/api/checkout/session', accessToken, {
      method: 'POST',
      body: JSON.stringify({
        fullName: input.address.fullName,
        address: input.address.address,
        barangay: input.address.barangay,
        city: input.address.city,
        province: input.address.province,
        postalCode: input.address.postalCode,
        courierName: 'Standard delivery',
        courierEstimate: '3-5 business days',
        paymentMethod: 'card',
        voucherCode: null,
        shippingCost: 0,
        selectedProductIds: input.selectedProductIds,
      }),
    })
  },
  async returns(accessToken: string) {
    return authenticated<ReturnRequest[]>('/api/returns?limit=50', accessToken)
  },
  async submitReturn(accessToken: string, input: { orderNumber: string; reason: string; details: string }) {
    return authenticated<ReturnRequest>('/api/returns', accessToken, {
      method: 'POST',
      body: JSON.stringify({ ...input, imagePublicIds: [] }),
    })
  },
  async reviews(accessToken: string) {
    return authenticated<Review[]>('/api/reviews?mine=true&limit=50', accessToken)
  },
  async addReview(accessToken: string, input: { productId: string; rating: number; comment: string }) {
    return authenticated<Review>('/api/reviews', accessToken, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },
  async notifications(accessToken: string) {
    return authenticated<Notification[]>('/api/notifications?limit=50', accessToken)
  },
  async markNotificationRead(accessToken: string, id: string) {
    return authenticated<Notification>(`/api/notifications/${id}`, accessToken, {
      method: 'PATCH',
      body: JSON.stringify({ isRead: true }),
    })
  },
  async registerPushToken(accessToken: string, token: string, platform: string) {
    return authenticated<{ id: string; registered: boolean }>('/api/mobile/push-token', accessToken, {
      method: 'POST',
      body: JSON.stringify({ token, platform }),
    })
  },
  async unregisterPushToken(accessToken: string, token: string) {
    return authenticated<{ removed: boolean }>('/api/mobile/push-token', accessToken, {
      method: 'DELETE',
      body: JSON.stringify({ token }),
    })
  },
}