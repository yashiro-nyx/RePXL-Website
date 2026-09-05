'use client'
import { create } from 'zustand'
import type { CartItem } from '@/types'
import { useAuthStore } from './authStore'
import { cartService } from '@/lib/data/cartService'
import { useToastStore } from './toastStore'

interface CartState {
  items: CartItem[]
  error: string | null
  addToCart: (slug: string, quantity?: number) => Promise<void>
  updateQuantity: (slug: string, newQty: number) => Promise<void>
  removeFromCart: (slug: string) => Promise<void>
  isInCart: (slug: string) => boolean
  getQuantity: (slug: string) => number
  clearCart: () => Promise<void>
  hydrate: () => Promise<void>
}
const email = () => useAuthStore.getState().userEmail || null
export const useCartStore = create<CartState>((set, get) => {
  const mutate = async (action: (owner: string | null) => Promise<void>) => {
    const owner = email()
    await action(owner)
    const items = await cartService.list(owner)
    if (owner === email()) set({ items, error: null })
  }
  return {
    items: [],
    error: null,
    addToCart: (slug, quantity = 1) =>
      mutate(async (owner) => {
        const items = await cartService.list(owner)
        const current = items.find((item) => item.slug === slug)?.quantity ?? 0
        await cartService.add(owner, slug, current + quantity)
      }),
    updateQuantity: (slug, quantity) =>
      quantity <= 0
        ? get().removeFromCart(slug)
        : mutate((owner) => cartService.setQuantity(owner, slug, quantity)),
    removeFromCart: (slug) =>
      mutate((owner) => cartService.remove(owner, slug)),
    clearCart: () => mutate((owner) => cartService.clear(owner)),
    isInCart: (slug) => get().items.some((item) => item.slug === slug),
    getQuantity: (slug) =>
      get().items.find((item) => item.slug === slug)?.quantity ?? 0,
    hydrate: async () => {
      const owner = email()
      try {
        const items = await cartService.list(owner)
        if (owner === email()) set({ items, error: null })
      } catch {
        if (owner === email()) {
          set({
            items: [],
            error: 'Unable to load your cart. Please try again.',
          })
          useToastStore
            .getState()
            .addToast('Unable to load your cart. Please try again.', 'error')
        }
      }
    },
  }
})
useAuthStore.subscribe((state, previous) => {
  if (state.userEmail !== previous.userEmail)
    useCartStore.setState({ items: [], error: null })
})
