'use client'
import { create } from 'zustand'
import { useAuthStore } from './authStore'
import { wishlistService } from '@/lib/data/wishlistService'
import { useToastStore } from './toastStore'
interface WishlistState {
  slugs: string[]
  loading: boolean
  error: boolean
  addToWishlist: (slug: string) => Promise<void>
  removeFromWishlist: (slug: string) => Promise<void>
  isInWishlist: (slug: string) => boolean
  hydrate: () => Promise<void>
}
const email = () => useAuthStore.getState().userEmail || null
let wishlistHydrateInFlight: Promise<void> | null = null

export const useWishlistStore = create<WishlistState>((set, get) => {
  const mutate = async (action: (owner: string | null) => Promise<void>) => {
    const owner = email()
    await action(owner)
    const slugs = await wishlistService.list(owner)
    if (owner === email()) set({ slugs })
  }
  return {
    slugs: [],
    loading: false,
    error: false,
    addToWishlist: (slug) =>
      mutate((owner) => wishlistService.add(owner, slug)),
    removeFromWishlist: (slug) =>
      mutate((owner) => wishlistService.remove(owner, slug)),
    isInWishlist: (slug) => get().slugs.includes(slug),
    hydrate: () => {
      if (wishlistHydrateInFlight) return wishlistHydrateInFlight
      const owner = email()
      set({ loading: true, error: false })
      wishlistHydrateInFlight = wishlistService
        .list(owner)
        .then((slugs) => {
          if (owner === email()) set({ slugs, error: false })
        })
        .catch(() => {
          if (owner === email()) {
            set({ slugs: [], error: true })
            useToastStore
              .getState()
              .addToast(
                'Unable to load your wishlist. Please try again.',
                'error'
              )
          }
        })
        .finally(() => {
          set({ loading: false })
          wishlistHydrateInFlight = null
        })
      return wishlistHydrateInFlight
    },
  }
})
useAuthStore.subscribe((state, previous) => {
  if (state.userEmail !== previous.userEmail)
    useWishlistStore.setState({ slugs: [], error: false })
})
