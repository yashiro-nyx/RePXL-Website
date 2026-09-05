// Remove legacy account records without reading or parsing their contents.
// Keep only non-sensitive UX preferences and explicit guest selections.
export function clearLegacyAccountStorage() {
  if (typeof localStorage === 'undefined') return
  const exact = new Set([
    'repixl-users', 'repixl-session', 'repixl-customer-session', 'repixl-admin-session',
    'repixl-orders', 'repixl-archived-orders', 'repixl-reviews', 'repixl-products',
    'repixl-vouchers', 'repixl-archived-customers',
  ])
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (!key) continue
      const accountKey = /^(repixl-addresses|repixl-payments|repixl-birthdate)(-|$)/.test(key)
        || (/^repixl-(cart|wishlist|compare)-/.test(key) && key !== 'repixl-cart-guest' && key !== 'repixl-wishlist-guest' && key !== 'repixl-compare-guest')
      if (exact.has(key) || accountKey) localStorage.removeItem(key)
    }
  } catch { /* Storage may be disabled; it is never needed for authentication. */ }
}

export function setLogoutPreference(loggedOut: boolean) {
  try {
    if (loggedOut) localStorage.setItem('repixl-oauth-logged-out', '1')
    else localStorage.removeItem('repixl-oauth-logged-out')
  } catch { /* Non-authoritative UX preference. */ }
}
