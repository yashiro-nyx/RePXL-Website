'use client'

// Product data service: API-first (Postgres) with localStorage fallback.
// Also maintains a slug -> productId cache so cart/wishlist/review services can
// resolve the cuid `id` the API expects from the `slug` the client UI uses.

import { apiClient } from '@/lib/api-client'
import { withFallback } from './fallback'
import { apiToClientProduct, clientToApiProduct, type ApiProduct } from '@/lib/mappers'
import { products as seedProducts } from '@/data/products'
import type { Product } from '@/types'

const LS_KEY = 'repixl-products'

// slug -> API id. Populated whenever we fetch products from the API.
const slugToId = new Map<string, string>()

export function getProductId(slug: string): string | undefined {
  return slugToId.get(slug)
}

function cacheIds(apiProducts: ApiProduct[]) {
  for (const p of apiProducts) slugToId.set(p.slug, p.id)
}

function readLocal(): Product[] {
  try {
    const stored = localStorage.getItem(LS_KEY)
    if (stored) {
      const parsed: Product[] = JSON.parse(stored)
      if (parsed.length > 0 && parsed[0].status) return parsed
    }
  } catch {
    /* fall through to seed */
  }
  return seedProducts
}

function writeLocal(products: Product[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(products))
  } catch {
    /* ignore quota errors */
  }
}

export const productService = {
  /**
   * Fetch the full catalogue (admin view: all statuses). Falls back to
   * localStorage/seed when the API is down. On API success, mirrors to
   * localStorage so a later offline session has fresh data.
   */
  async list(): Promise<Product[]> {
    return withFallback<Product[]>(
      async () => {
        // limit=100 + status filter covering all statuses so admin sees everything.
        const res = await apiClient.getPaginated<ApiProduct>(
          '/api/products?limit=100&status=ACTIVE,INACTIVE,COMING_SOON,DISCONTINUED&sortBy=createdAt&sortOrder=desc'
        )
        const apiProducts = (res.data ?? []) as ApiProduct[]
        cacheIds(apiProducts)
        return apiProducts.map(apiToClientProduct)
      },
      () => readLocal(),
      { mirror: (products) => writeLocal(products) }
    )
  },

  async create(product: Product): Promise<Product> {
    return withFallback<Product>(
      async () => {
        const created = await apiClient.post<ApiProduct>(
          '/api/products',
          clientToApiProduct(product)
        )
        slugToId.set(created.slug, created.id)
        return apiToClientProduct(created)
      },
      () => {
        const updated = [...readLocal(), product]
        writeLocal(updated)
        return product
      }
    )
  },

  async update(slug: string, updates: Partial<Product>): Promise<Product> {
    return withFallback<Product>(
      async () => {
        const updated = await apiClient.put<ApiProduct>(
          `/api/products/${slug}`,
          clientToApiProduct(updates)
        )
        slugToId.set(updated.slug, updated.id)
        return apiToClientProduct(updated)
      },
      () => {
        const products = readLocal()
        const merged = products.map((p) =>
          p.slug === slug ? { ...p, ...updates } : p
        )
        writeLocal(merged)
        return merged.find((p) => p.slug === slug) ?? ({ ...updates, slug } as Product)
      }
    )
  },

  async remove(slug: string): Promise<void> {
    await withFallback<void>(
      async () => {
        await apiClient.delete<{ message: string }>(`/api/products/${slug}`)
        slugToId.delete(slug)
      },
      () => {
        writeLocal(readLocal().filter((p) => p.slug !== slug))
      }
    )
  },
}
