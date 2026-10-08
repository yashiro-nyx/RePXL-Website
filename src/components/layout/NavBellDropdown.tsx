'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  NotificationRow,
  type NotificationItem,
} from '@/components/account/NotificationList'
import { NotificationIcon } from '@/components/account/NotificationIcon'

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavBellDropdownProps {
  unreadCount: number
  isLoggedIn: boolean
  authHydrated: boolean
  /** Called when the dropdown marks a notification read so the parent badge updates */
  onUnreadCountChange: (delta: number) => void
  /** Called when the dropdown opens — triggers a fresh unread-count fetch */
  onOpen?: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NavBellDropdown({
  unreadCount,
  isLoggedIn,
  authHydrated,
  onUnreadCountChange,
  onOpen,
}: NavBellDropdownProps) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [fetched, setFetched] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLButtonElement>(null)

  // ── Fetch preview on open ─────────────────────────────────────────────────

  const fetchPreview = useCallback(async () => {
    if (!isLoggedIn) return
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/notifications/preview?limit=6', { credentials: 'include' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = await res.json()
      setItems(body.data?.notifications ?? [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setFetched(true)
    }
  }, [isLoggedIn])

  const handleToggle = () => {
    if (!open) {
      setOpen(true)
      void fetchPreview()
      onOpen?.() // refresh the authoritative unread count
    } else {
      setOpen(false)
    }
  }

  // ── Close on outside click ────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // ── Close on Escape ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        bellRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  // ── Mark single notification read ─────────────────────────────────────────

  const markRead = useCallback(
    async (id: string) => {
      let wasUnread = false
      setItems((prev) =>
        prev.map((n) => {
          if (n.id === id && !n.isRead) wasUnread = true
          return n.id === id ? { ...n, isRead: true } : n
        })
      )
      if (wasUnread) onUnreadCountChange(-1)
      try {
        await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', credentials: 'include' })
      } catch {
        /* optimistic; count reconciles on next poll */
      }
    },
    [onUnreadCountChange]
  )

  // ── Don't render until auth is resolved ──────────────────────────────────

  if (!authHydrated || !isLoggedIn) return null

  return (
    <div className="relative inline-flex items-center" ref={containerRef}>
      {/* Bell button */}
      <button
        ref={bellRef}
        type="button"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={handleToggle}
        className="relative flex h-11 w-11 items-center justify-center rounded-full text-repixl-text-light/80 transition-colors hover:text-repixl-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50"
      >
        <NotificationIcon icon="update" size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-repixl-red px-1 text-[9px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className={[
            'fixed left-4 right-4 top-[4.5rem] z-50 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-3',
            'w-auto sm:w-[min(24rem,calc(100vw-2rem))]',
            'overflow-hidden rounded-2xl border border-repixl-muted/20',
            'bg-repixl-bg shadow-xl shadow-black/30',
          ].join(' ')}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-repixl-muted/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-semibold text-repixl-text-light">Notifications</span>
              {unreadCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-repixl-red px-1.5 font-mono text-[9px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-repixl-muted transition-colors hover:text-repixl-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40"
              aria-label="Close notifications"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          {/* Items */}
          <div className="max-h-[min(28rem,60vh)] divide-y divide-repixl-muted/5 overflow-y-auto">
            {loading && !fetched ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-repixl-red border-t-transparent" aria-label="Loading notifications" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <p className="text-sm text-repixl-text-light/70">Couldn&apos;t load notifications</p>
                <button
                  type="button"
                  onClick={() => void fetchPreview()}
                  className="rounded-md border border-repixl-muted/25 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-repixl-muted transition-colors hover:border-repixl-muted/50 hover:text-repixl-text-light"
                >
                  Retry
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-repixl-charcoal/50 text-repixl-muted/40">
                  <NotificationIcon icon="update" size={20} />
                </div>
                <p className="text-sm text-repixl-muted">You&apos;re all caught up</p>
              </div>
            ) : (
              <ul aria-label="Recent notifications">
                {items.map((n) => (
                  <li key={n.id}>
                    <NotificationRow
                      notification={n}
                      variant="compact"
                      onMarkRead={markRead}
                      onNavigate={() => setOpen(false)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* View All footer */}
          <div className="border-t border-repixl-muted/10">
            <Link
              href="/account/notifications"
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center gap-1.5 px-4 py-3 text-sm font-medium text-repixl-red transition-colors hover:bg-repixl-red/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-repixl-red/40"
            >
              View all notifications
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
