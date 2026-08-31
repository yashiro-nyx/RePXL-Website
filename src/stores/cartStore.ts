'use client'

import { create } from 'zustand'
import type { CartItem } from '@/types'
import { useProductStore } from './productStore'
import { useAuthStore } from './authStore'
import { cartService } from '@/lib/data/cartService'

interface CartState {
  items: CartItem[]
  addToCart: (slug: string, quantity?: number) => Promise<void>
  updateQuantity: (slug: string, newQty: number) => Promise<void>
  removeFromCart: (slug: string) => Promise<void>
  isInCart: (slug: string) => boolean
  getQuantity: (slug: string) => number
  clearCart: () => Promise<void>
  hydrate: () => Promise<void>
}

function currentEmail(): string | null {
  return useAuthStore.getState().userEmail || null
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addToCart: async (slug, quantity = 1) => {
    const product = useProductStore.getState().products.find((p) => p.slug === slug)
    if (!product || product.stock <= 0) return
    const { items } = get()
    const existing = items.find((i) => i.slug === slug)
    const newQty = existing
      ? Math.min(existing.quantity + quantity, product.stock)
      : Math.min(quantity, product.stock)
    if (newQty <= 0) return

    const updated = existing
      ? items.map((i) => (i.slug === slug ? { ...i, quantity: newQty } : i))
      : [...items, { slug, quantity: newQty }]
    set({ items: updated })
    await cartService.add(currentEmail(), slug, newQty)
  },

  updateQuantity: async (slug, newQty) => {
    const product = useProductStore.getState().products.find((p) => p.slug === slug)
    if (!product) return
    if (newQty <= 0) {
      await get().removeFromCart(slug)
      return
    }
    const capped = Math.min(newQty, product.stock)
    const updated = get().items.map((i) => (i.slug === slug ? { ...i, quantity: capped } : i))
    set({ items: updated })
    await cartService.setQuantity(currentEmail(), slug, capped)
  },

  removeFromCart: async (slug) => {
    set({ items: get().items.filter((i) => i.slug !== slug) })
    await cartService.remove(currentEmail(), slug)
  },

  isInCart: (slug) => get().items.some((i) => i.slug === slug),
  getQuantity: (slug) => get().items.find((i) => i.slug === slug)?.quantity ?? 0,

  clearCart: async () => {
    set({ items: [] })
    await cartService.clear(currentEmail())
  },

  hydrate: async () => {
    try {
      const items = await cartService.list(currentEmail())
      // Only overwrite the in-memory cart if the fetched result is non-empty,
      // or if the current cart is already empty. This prevents a race condition
      // where the cart page hydrates before auth is ready (currentEmail() is
      // null), gets an empty guest cart, and overwrites the real items.
      const current = useCartStore.getState().items
      if (items.length > 0 || current.length === 0) {
        set({ items })
      }
    } catch {
      // Leave existing items intact on error — do not clear the cart.
    }
  },
}))
