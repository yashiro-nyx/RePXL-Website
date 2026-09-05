'use client'

import { apiClient } from '@/lib/api-client'
import type { ApiProduct } from '@/lib/mappers'
import type { CartItem } from '@/types'
import { readGuestCart, writeGuestCart } from '@/lib/guest-shopping'

interface ApiCartItem {
  id: string
  quantity: number
  product: ApiProduct
}
const toClient = (item: ApiCartItem): CartItem => ({
  slug: item.product.slug,
  quantity: item.quantity,
})

export const cartService = {
  async list(email: string | null): Promise<CartItem[]> {
    if (!email) return readGuestCart()
    return (await apiClient.get<ApiCartItem[]>('/api/cart')).map(toClient)
  },
  // quantity is the requested absolute quantity, not an increment.
  async add(
    email: string | null,
    slug: string,
    quantity: number
  ): Promise<void> {
    await this.setQuantity(email, slug, quantity)
  },
  async setQuantity(
    email: string | null,
    slug: string,
    quantity: number
  ): Promise<void> {
    if (!email) {
      const items = readGuestCart().filter((item) => item.slug !== slug)
      writeGuestCart([...items, { slug, quantity }])
      return
    }
    // Resolve cart IDs from this authenticated session, never another user's cache.
    const items = await apiClient.get<ApiCartItem[]>('/api/cart')
    const item = items.find((entry) => entry.product.slug === slug)
    if (item) await apiClient.put(`/api/cart/${item.id}`, { quantity })
    else {
      const product = await apiClient.get<ApiProduct>(
        `/api/products/${encodeURIComponent(slug)}`
      )
      await apiClient.post('/api/cart', { productId: product.id, quantity })
    }
  },
  async remove(email: string | null, slug: string): Promise<void> {
    if (!email) {
      writeGuestCart(readGuestCart().filter((item) => item.slug !== slug))
      return
    }
    const items = await apiClient.get<ApiCartItem[]>('/api/cart')
    const item = items.find((entry) => entry.product.slug === slug)
    if (item) await apiClient.delete(`/api/cart/${item.id}`)
  },
  async clear(email: string | null): Promise<void> {
    if (!email) {
      writeGuestCart([])
      return
    }
    await apiClient.delete('/api/cart')
  },
}
