import type { CartItem } from '@/types'

// Explicit guest UX only. These values never replace an authenticated API result.
function read(key: string): unknown[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(data) ? data : []
  } catch { return [] }
}
export function readGuestCart(): CartItem[] {
  return read('repixl-cart-guest').filter((value): value is CartItem => {
    if (!value || typeof value !== 'object') return false
    const item = value as CartItem
    return typeof item.slug === 'string' && Number.isInteger(item.quantity) && item.quantity > 0
  }).map(({ slug, quantity }) => ({ slug, quantity }))
}
export function writeGuestCart(items: CartItem[]) {
  localStorage.setItem('repixl-cart-guest', JSON.stringify(items.map(({ slug, quantity }) => ({ slug, quantity }))))
}
export function readGuestWishlist(): string[] {
  return read('repixl-wishlist-guest').filter((value): value is string => typeof value === 'string')
}
export function writeGuestWishlist(slugs: string[]) {
  localStorage.setItem('repixl-wishlist-guest', JSON.stringify(slugs))
}
