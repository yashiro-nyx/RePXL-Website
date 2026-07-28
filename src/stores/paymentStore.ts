'use client'

import { create } from 'zustand'

export interface SavedCard {
  id: string
  last4: string
  brand: 'Visa' | 'Mastercard' | 'Card'
  expiry: string // MM/YY
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
}

function detectBrand(firstDigit: string): SavedCard['brand'] {
  if (firstDigit === '4') return 'Visa'
  if (firstDigit === '5') return 'Mastercard'
  return 'Card'
}

function persist(cards: SavedCard[]) {
  localStorage.setItem('repixl-payments', JSON.stringify(cards))
}

export const usePaymentStore = create<PaymentState>((set, get) => ({
  cards: [],

  addCard: (card) => {
    const id = `card-${Date.now().toString(36)}`
    const cards = get().cards
    const isDefault = cards.length === 0 ? true : card.isDefault
    const updated = isDefault
      ? [...cards.map((c) => ({ ...c, isDefault: false })), { ...card, id, isDefault: true }]
      : [...cards, { ...card, id, isDefault: false }]
    persist(updated)
    set({ cards: updated })
  },

  removeCard: (id) => {
    let updated = get().cards.filter((c) => c.id !== id)
    if (updated.length > 0 && !updated.some((c) => c.isDefault)) {
      updated = updated.map((c, i) => ({ ...c, isDefault: i === 0 }))
    }
    persist(updated)
    set({ cards: updated })
  },

  setDefault: (id) => {
    const updated = get().cards.map((c) => ({ ...c, isDefault: c.id === id }))
    persist(updated)
    set({ cards: updated })
  },

  getDefault: () => get().cards.find((c) => c.isDefault),

  hydrate: () => {
    try {
      const stored = localStorage.getItem('repixl-payments')
      if (stored) {
        set({ cards: JSON.parse(stored) })
      }
    } catch {
      // ignore
    }
  },
}))

export { detectBrand }
