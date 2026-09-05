'use client'
import { useAuthStore } from '@/stores/authStore'

let revision = 0
useAuthStore.subscribe((state, previous) => {
  if (state.userEmail !== previous.userEmail || state.role !== previous.role || state.isLoggedIn !== previous.isLoggedIn) revision++
})
// A late response from a previous account must never repopulate the current UI.
export function scopedAccountUpdate<T>(update: (state: T) => void): (state: T) => void {
  const started = revision
  return (state) => { if (started === revision) update(state) }
}
