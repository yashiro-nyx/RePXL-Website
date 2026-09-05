'use client'
import { create } from 'zustand'
import { clearLegacyAccountStorage } from '@/lib/browser-storage'

export interface SavedCard {
  id: string
  last4: string
  brand: 'Visa' | 'Mastercard' | 'Card'
  expiry: string
  cardholderName: string
  isDefault: boolean
}
interface PaymentState {
  cards: SavedCard[]
  addCard: (card: Omit<SavedCard, 'id'>) => void
  removeCard: (id: string) => void
  setDefault: (id: string) => void
  getDefault: () => SavedCard | undefined
  hydrate: () => void
  reset: () => void
}
const unavailable = () => {
  throw new Error(
    'Saved payment methods are unavailable. Enter payment details at checkout.'
  )
}
// No saved-payment API exists. Never pretend browser data is a saved account card.
export const usePaymentStore = create<PaymentState>((set) => ({
  cards: [],
  addCard: unavailable,
  removeCard: unavailable,
  setDefault: unavailable,
  getDefault: () => undefined,
  hydrate: () => {
    clearLegacyAccountStorage()
    set({ cards: [] })
  },
  reset: () => set({ cards: [] }),
}))
