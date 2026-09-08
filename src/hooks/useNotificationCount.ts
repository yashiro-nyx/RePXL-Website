'use client'

/**
 * useNotificationCount — shared unread-notification count + per-category breakdown.
 *
 * Consumed by both Navbar (bell badge) and AccountShell (sidebar category badges)
 * so only one polling interval runs per page rather than two independent 60-second
 * timers hitting the same endpoint simultaneously.
 *
 * Behaviour:
 *   - Polls every POLL_INTERVAL_MS (20 s) while the document is visible.
 *   - Immediately refetches on window focus and document visibilitychange.
 *   - Pauses polling while the document is hidden (background tab).
 *   - Stops cleanly on logout (isLoggedIn → false).
 *   - Never accepts a userId from the caller — ownership is enforced server-side.
 *
 * The endpoint /api/notifications/unread-count uses a single groupBy DB query
 * and returns { count: number, byCategory: Record<routePath, number> }.
 * This hook treats the server response as the authoritative source of truth.
 *
 * Optimistic updates (e.g. after marking a notification read) can be applied
 * by calling the returned `decrementCount` / `setCount` helpers — the next
 * server poll will reconcile any drift.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

/** Active-tab polling interval — 20 seconds. */
const POLL_INTERVAL_MS = 20_000

export interface NotificationCountState {
  /** Total unread in-app notification count. */
  count: number
  /** Per-category unread counts keyed by sidebar route path.
   *  e.g. { '/account/notifications/order-updates': 3 } */
  byCategory: Record<string, number>
}

const EMPTY: NotificationCountState = { count: 0, byCategory: {} }

export function useNotificationCount(isLoggedIn: boolean): {
  state: NotificationCountState
  refresh: () => Promise<void>
  /** Apply an optimistic decrement (e.g. after marking a single notification read). */
  decrementCount: (by?: number) => void
  /** Replace the count entirely (e.g. after mark-all-read). */
  setCount: (n: number) => void
} {
  const [state, setState] = useState<NotificationCountState>(EMPTY)
  const lastFetchRef = useRef<number>(0)
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchCount = useCallback(async () => {
    if (!isLoggedIn) return
    // Deduplicate: skip if we fetched within the last 3 seconds
    if (Date.now() - lastFetchRef.current < 3_000) return
    lastFetchRef.current = Date.now()
    try {
      const res = await fetch('/api/notifications/unread-count', { credentials: 'include' })
      if (!res.ok) return
      const { data } = await res.json()
      if (data) {
        setState({ count: data.count ?? 0, byCategory: data.byCategory ?? {} })
      }
    } catch { /* network failure — keep stale state */ }
  }, [isLoggedIn])

  // Start/stop the polling interval and visibility/focus listeners
  useEffect(() => {
    if (!isLoggedIn) {
      setState(EMPTY)
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      return
    }

    // Initial fetch
    void fetchCount()

    // Active-tab polling
    timerRef.current = setInterval(() => {
      if (!document.hidden) void fetchCount()
    }, POLL_INTERVAL_MS)

    // Immediate refetch when tab regains focus or becomes visible
    const onVisible = () => { if (!document.hidden) void fetchCount() }
    const onFocus   = () => void fetchCount()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)

    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
    }
  }, [isLoggedIn, fetchCount])

  return {
    state,
    refresh: fetchCount,
    decrementCount: (by = 1) =>
      setState((prev) => ({ ...prev, count: Math.max(0, prev.count - by) })),
    setCount: (n) =>
      setState((prev) => ({ ...prev, count: Math.max(0, n) })),
  }
}
