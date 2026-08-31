'use client'

// Cart data service: API-first (Postgres, cookie-scoped to the user) with a
// per-user localStorage fallback. The client UI keys the cart by product `slug`;
// the API keys by product `id` and cart-item `id`, so we resolve via the product
// service's slug->id cache (and fetch the product by slug if not yet cached).

import { apiClient } from '@/lib/api-client'
import { withFallback } from './fallback'
import { getProductId } from './productService'
import { apiToClientProduct, type ApiProduct } from '@/lib/mappers'
import type { CartItem } from '@/types'

interface ApiCartItem {
  id: string
  productId: string
  quantity: number
  product: ApiProduct
}

// Map productId -> cart-item id for the current session (needed for PATCH/DELETE).
const productIdToCartItemId = new Map<string, string>()

function localKey(email: string | null) {
  return email ? `repixl-cart-${email}` : 'repixl-cart-guest'
}

function readLocal(email: string | null): CartItem[] {
  try {
    const stored = localStorage.getItem(localKey(email))
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function writeLocal(email: string | null, items: CartItem[]) {
  try {
    localStorage.setItem(localKey(email), JSON.stringify(items))
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

export const cartService = {
  /** Load the cart. Returns client CartItems ({ slug, quantity }). */
  async list(email: string | null): Promise<CartItem[]> {
    return withFallback<CartItem[]>(
      async () => {
        const items = await apiClient.get<ApiCartItem[]>('/api/cart')
        productIdToCartItemId.clear()
        const result: CartItem[] = items.map((it) => {
          productIdToCartItemId.set(it.productId, it.id)
          return { slug: apiToClientProduct(it.product).slug, quantity: it.quantity }
        })
        return result
      },
      () => readLocal(email),
      { mirror: (items) => writeLocal(email, items) }
    )
  },

  async add(email: string | null, slug: string, quantity: number): Promise<void> {
    await withFallback<void>(
      async () => {
        const productId = await resolveProductId(slug)
        if (!productId) throw new Error('unknown product')
        const created = await apiClient.post<ApiCartItem>('/api/cart', {
          productId,
          quantity,
        })
        productIdToCartItemId.set(created.productId, created.id)
      },
      () => {
        const items = readLocal(email)
        const existing = items.find((i) => i.slug === slug)
        const next = existing
          ? items.map((i) => (i.slug === slug ? { ...i, quantity } : i))
          : [...items, { slug, quantity }]
        writeLocal(email, next)
      }
    )
  },

  async setQuantity(email: string | null, slug: string, quantity: number): Promise<void> {
    await withFallback<void>(
      async () => {
        const productId = await resolveProductId(slug)
        const cartItemId = productId ? productIdToCartItemId.get(productId) : undefined
        if (!cartItemId) {
          // Not yet on the server cart — add it.
          if (productId) {
            const created = await apiClient.post<ApiCartItem>('/api/cart', {
              productId,
              quantity,
            })
            productIdToCartItemId.set(created.productId, created.id)
          }
          return
        }
        await apiClient.put(`/api/cart/${cartItemId}`, { quantity })
      },
      () => {
        writeLocal(
          email,
          readLocal(email).map((i) => (i.slug === slug ? { ...i, quantity } : i))
        )
      }
    )
  },

  async remove(email: string | null, slug: string): Promise<void> {
    await withFallback<void>(
      async () => {
        const productId = await resolveProductId(slug)
        const cartItemId = productId ? productIdToCartItemId.get(productId) : undefined
        if (cartItemId) {
          await apiClient.delete(`/api/cart/${cartItemId}`)
          productIdToCartItemId.delete(productId!)
        }
      },
      () => {
        writeLocal(
          email,
          readLocal(email).filter((i) => i.slug !== slug)
        )
      }
    )
  },

  async clear(email: string | null): Promise<void> {
    await withFallback<void>(
      async () => {
        await apiClient.delete('/api/cart')
        productIdToCartItemId.clear()
      },
      () => {
        try {
          localStorage.removeItem(localKey(email))
        } catch {
          /* ignore */
        }
      }
    )
  },
}
