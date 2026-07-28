'use client'

import { create } from 'zustand'
import type { Product } from '@/types'
import { products as seedProducts } from '@/data/products'

interface ProductState {
  products: Product[]
  addProduct: (product: Product) => void
  updateProduct: (slug: string, updates: Partial<Product>) => void
  deleteProduct: (slug: string) => void
  hydrate: () => void
}

function persist(products: Product[]) {
  localStorage.setItem('repixl-products', JSON.stringify(products))
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: seedProducts,

  addProduct: (product) => {
    const updated = [...get().products, product]
    persist(updated)
    set({ products: updated })
  },

  updateProduct: (slug, updates) => {
    const updated = get().products.map((p) =>
      p.slug === slug ? { ...p, ...updates } : p
    )
    persist(updated)
    set({ products: updated })
  },

  deleteProduct: (slug) => {
    const updated = get().products.filter((p) => p.slug !== slug)
    persist(updated)
    set({ products: updated })
  },

  hydrate: () => {
    try {
      const stored = localStorage.getItem('repixl-products')
      if (stored) {
        const parsed: Product[] = JSON.parse(stored)
        if (parsed.length > 0 && parsed[0].status) {
          set({ products: parsed })
          return
        }
      }
    } catch {
      // use seed data
    }
  },
}))
