'use client'

import { create } from 'zustand'
import { useAuthStore } from './authStore'

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

function detectBrand(firstDigit: string): SavedCard['brand'] {
  if (firstDigit === '4') return 'Visa'
  if (firstDigit === '5') return 'Mastercard'
  return 'Card'
}

function getKey(): string | null {
  const email = useAuthStore.getState().userEmail
  return email ? `repixl-payments-${email}` : null
}

function persist(cards: SavedCard[]) {
  const key = getKey()
  if (!key) return // never write to guest key
  localStorage.setItem(key, JSON.stringify(cards))
}

export const usePaymentStore = create<PaymentState>((set, get) => ({
  cards: [],

  reset: () => set({ cards: [] }),

  addCard: (card) => {
    const id = `card-${Date.now().toString(36)}`
    const cards = get().cards
    const isDefault = cards.length === 0 ? true : card.isDefault
    const updated = isDefault
      ? [...cards.map((c) => ({ ...c, isDefault: false })), { ...card, id, isDefault: true }]
      : [...cards, { ...card, id, isDefault: false }]
    persist(updated); set({ cards: updated })
  },

  removeCard: (id) => {
    let updated = get().cards.filter((c) => c.id !== id)
    if (updated.length > 0 && !updated.some((c) => c.isDefault)) {
      updated = updated.map((c, i) => ({ ...c, isDefault: i === 0 }))
    }
    persist(updated); set({ cards: updated })
  },

  setDefault: (id) => {
    const updated = get().cards.map((c) => ({ ...c, isDefault: c.id === id }))
    persist(updated); set({ cards: updated })
  },

  getDefault: () => get().cards.find((c) => c.isDefault),

  hydrate: () => {
    const key = getKey()
    if (!key) {
      // No authenticated user yet — do not load from guest key, clear instead
      set({ cards: [] })
      return
    }
    try {
      const stored = localStorage.getItem(key)
      if (stored) set({ cards: JSON.parse(stored) })
      else set({ cards: [] })
    } catch { set({ cards: [] }) }
  },
}))

export { detectBrand }
