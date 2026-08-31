'use client'

// Wishlist data service: API-first with per-user localStorage fallback.
// Client stores bare slugs; the API keys by product id.

import { apiClient } from '@/lib/api-client'
import { withFallback } from './fallback'
import { getProductId } from './productService'
import { apiToClientProduct, type ApiProduct } from '@/lib/mappers'

interface ApiWishlistItem {
  id: string
  productId: string
  product: ApiProduct
}

function localKey(email: string | null) {
  return email ? `repixl-wishlist-${email}` : 'repixl-wishlist-guest'
}

function readLocal(email: string | null): string[] {
  try {
    const stored = localStorage.getItem(localKey(email))
    const data = stored ? JSON.parse(stored) : []
    return Array.isArray(data) ? data.filter((s) => typeof s === 'string') : []
  } catch {
    return []
  }
}

function writeLocal(email: string | null, slugs: string[]) {
  try {
    localStorage.setItem(localKey(email), JSON.stringify(slugs))
  } catch {
    /* ignore */
  }
}

async function resolveProductId(slug: string): Promise<string | undefined> {
  const cached = getProductId(slug)
  if (cached) return cached
  try {
    const p = await apiClient.get<ApiProduct>(`/api/products/${slug}`)
    return p.id
  } catch {
    return undefined
  }
}

export const wishlistService = {
  async list(email: string | null): Promise<string[]> {
    return withFallback<string[]>(
      async () => {
        const items = await apiClient.get<ApiWishlistItem[]>('/api/wishlist')
        return items.map((it) => apiToClientProduct(it.product).slug)
      },
      () => readLocal(email),
      { mirror: (slugs) => writeLocal(email, slugs) }
    )
  },

  async add(email: string | null, slug: string): Promise<void> {
    await withFallback<void>(
      async () => {
        const productId = await resolveProductId(slug)
        if (!productId) throw new Error('unknown product')
        await apiClient.post('/api/wishlist', { productId })
      },
      () => {
        const slugs = readLocal(email)
        if (!slugs.includes(slug)) writeLocal(email, [...slugs, slug])
      }
    )
  },

  async remove(email: string | null, slug: string): Promise<void> {
    await withFallback<void>(
      async () => {
        const productId = await resolveProductId(slug)
        if (productId) await apiClient.delete(`/api/wishlist/${productId}`)
      },
      () => {
        writeLocal(
          email,
          readLocal(email).filter((s) => s !== slug)
        )
      }
    )
  },
}
