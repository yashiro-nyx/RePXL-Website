'use client'

import { reportActionFailure } from '@/lib/action-error'
import { create } from 'zustand'
import type { Product } from '@/types'
import { productService } from '@/lib/data/productService'

interface ProductState {
  products: Product[]
  loading: boolean
  addProduct: (product: Product) => Promise<void>
  updateProduct: (slug: string, updates: Partial<Product>) => Promise<void>
  deleteProduct: (slug: string) => Promise<void>
  hydrate: () => Promise<void>
}

/**
 * In-flight deduplication for hydrate().
 *
 * Multiple components mounting on the same render (FeaturedCarousel, BestSellers,
 * NewArrivals, the products listing page, etc.) all call hydrate() independently.
 * Without deduplication each call fires a separate GET /api/products request.
 *
 * We keep a single Promise reference outside the store so that concurrent
 * hydrate() calls share the same in-flight fetch instead of issuing N parallel
 * requests. The reference is cleared when the fetch settles so the next
 * explicit hydrate() (e.g. after a navigation) issues a fresh request.
 */
let hydrateInFlight: Promise<void> | null = null

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  loading: false,

  addProduct: async (product) => {
    const created = await productService.create(product)
    set({ products: [...get().products, created] })
  },

  updateProduct: async (slug, updates) => {
    const updated = await productService.update(slug, updates)
    set({
      products: get().products.map((p) => (p.slug === slug ? updated : p)),
    })
  },

  deleteProduct: async (slug) => {
    await productService.remove(slug)
    set({ products: get().products.filter((p) => p.slug !== slug) })
  },

  hydrate: () => {
    // If a fetch is already in flight, all callers share it — no duplicate requests.
    if (hydrateInFlight) return hydrateInFlight

    set({ loading: true })
    hydrateInFlight = productService
      .listActive()
      .then((products) => {
        set({ products })
      })
      .catch(() => {
        set({ products: [] })
        reportActionFailure()
      })
      .finally(() => {
        set({ loading: false })
        // Clear the reference so the next hydrate() call issues a fresh request.
        hydrateInFlight = null
      })

    return hydrateInFlight
  },
}))
