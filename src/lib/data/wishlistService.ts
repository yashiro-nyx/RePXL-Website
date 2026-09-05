'use client'

import { apiClient } from '@/lib/api-client'
import type { ApiProduct } from '@/lib/mappers'
import { readGuestWishlist, writeGuestWishlist } from '@/lib/guest-shopping'

interface ApiWishlistItem {
  product: ApiProduct
}
export const wishlistService = {
  async list(email: string | null): Promise<string[]> {
    if (!email) return readGuestWishlist()
    return (await apiClient.get<ApiWishlistItem[]>('/api/wishlist')).map(
      (item) => item.product.slug
    )
  },
  async add(email: string | null, slug: string): Promise<void> {
    if (!email) {
      writeGuestWishlist(Array.from(new Set([...readGuestWishlist(), slug])))
      return
    }
    const product = await apiClient.get<ApiProduct>(
      `/api/products/${encodeURIComponent(slug)}`
    )
    await apiClient.post('/api/wishlist', { productId: product.id })
  },
  async remove(email: string | null, slug: string): Promise<void> {
    if (!email) {
      writeGuestWishlist(readGuestWishlist().filter((value) => value !== slug))
      return
    }
    const product = await apiClient.get<ApiProduct>(
      `/api/products/${encodeURIComponent(slug)}`
    )
    await apiClient.delete(`/api/wishlist/${product.id}`)
  },
}
