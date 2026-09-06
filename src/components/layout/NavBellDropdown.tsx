'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { eventLabel, CATEGORY_META, type NotificationItem } from '@/components/account/NotificationList'

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavBellDropdownProps {
  unreadCount: number
  isLoggedIn: boolean
  authHydrated: boolean
  /** Called when the dropdown marks a notification read so the parent badge updates */
  onUnreadCountChange: (delta: number) => void
}

// ── Helper: time-ago formatting ───────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7)   return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NavBellDropdown({
  unreadCount,
  isLoggedIn,
  authHydrated,
  onUnreadCountChange,
}: NavBellDropdownProps) {
  const [open, setOpen]                   = useState(false)
  const [items, setItems]                 = useState<NotificationItem[]>([])
  const [loading, setLoading]             = useState(false)
  const [fetched, setFetched]             = useState(false)
  const containerRef                      = useRef<HTMLDivElement>(null)
  const bellRef                           = useRef<HTMLButtonElement>(null)

  // ── Fetch preview on open ─────────────────────────────────────────────────

  const fetchPreview = useCallback(async () => {
    if (!isLoggedIn) return
    setLoading(true)
    try {
      const res = await fetch('/api/notifications/preview?limit=5', { credentials: 'include' })
      if (res.ok) {
        const body = await res.json()
        setItems(body.data?.notifications ?? [])
      }
    } catch { /* ignore */ }
    setLoading(false)
    setFetched(true)
  }, [isLoggedIn])

  const handleToggle = () => {
    if (!open) {
      setOpen(true)
      fetchPreview()
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

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    onUnreadCountChange(-1)
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', credentials: 'include' })
  }

  // ── Don't render until auth is resolved ──────────────────────────────────

  if (!authHydrated || !isLoggedIn) return null

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell button */}
      <button
        ref={bellRef}
        type="button"
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={handleToggle}
        className="relative text-repixl-text-light/80 transition-colors hover:text-repixl-text-light"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-repixl-red text-[9px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="dialog"
          aria-label="Notification preview"
          className={[
            'absolute right-0 top-full z-50 mt-3',
            // Desktop: fixed-width panel; mobile: full-width sheet anchored right
            'w-[min(22rem,calc(100vw-2rem))]',
            'overflow-hidden rounded-2xl border border-repixl-muted/20',
            'bg-repixl-bg shadow-2xl shadow-black/40',
          ].join(' ')}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-repixl-muted/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-semibold text-repixl-text-light">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-repixl-red px-1.5 font-mono text-[8px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close notifications"
              className="rounded p-1 text-repixl-muted/60 transition-colors hover:text-repixl-text-light"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Items */}
          <div className="max-h-[min(28rem,60vh)] overflow-y-auto">
            {loading && !fetched ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-repixl-red border-t-transparent" aria-label="Loading…" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-repixl-muted/30" aria-hidden="true">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
                <p className="text-sm text-repixl-muted">No notifications yet</p>
              </div>
            ) : (
              <ul role="list">
                {items.map((n) => {
                  // Derive an order destination from the message text if possible
                  const orderMatch = n.message.match(/\b(ORD-[A-Z0-9]{6,})\b/)
                  const destination = orderMatch ? `/account/orders/${orderMatch[1]}` : null

                  const inner = (
                    <div
                      className={[
                        'flex items-start gap-3 px-4 py-3 transition-colors',
                        n.isRead
                          ? 'bg-transparent'
                          : 'bg-repixl-charcoal/40',
                        destination ? 'cursor-pointer hover:bg-repixl-charcoal/60' : '',
                      ].join(' ')}
                    >
                      {/* Unread dot */}
                      <div className="mt-1.5 shrink-0">
                        <div
                          className={`h-2 w-2 rounded-full ${n.isRead ? 'bg-transparent' : 'bg-repixl-red'}`}
                          aria-hidden="true"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        {/* Event category label */}
                        <p className="mb-0.5 font-mono text-[9px] uppercase tracking-wider text-repixl-muted/60">
                          {eventLabel(n.event)}
                        </p>
                        {/* Message preview — truncated */}
                        <p className={`text-xs leading-relaxed ${n.isRead ? 'text-repixl-text-light/60' : 'text-repixl-text-light'}`}>
                          {n.message.length > 120 ? n.message.slice(0, 120) + '…' : n.message}
                        </p>
                        <p className="mt-1 font-mono text-[9px] text-repixl-muted/50">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>

                      {/* Mark read button (visible when unread and no destination link) */}
                      {!n.isRead && !destination && (
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); markRead(n.id) }}
                          className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-repixl-muted transition-colors hover:bg-repixl-charcoal hover:text-repixl-text-light"
                          aria-label="Mark as read"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  )

                  return (
                    <li key={n.id} className="border-b border-repixl-muted/5 last:border-0">
                      {destination ? (
                        <Link
                          href={destination}
                          onClick={() => { if (!n.isRead) markRead(n.id); setOpen(false) }}
                          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-repixl-red/40"
                        >
                          {inner}
                        </Link>
                      ) : (
                        inner
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Category shortcuts */}
          <div className="border-t border-repixl-muted/10 px-3 py-2">
            <div className="flex flex-wrap gap-1">
              {(Object.entries(CATEGORY_META) as [string, { label: string; route: string }][]).map(
                ([, meta]) => (
                  <Link
                    key={meta.route}
                    href={meta.route}
                    onClick={() => setOpen(false)}
                    className="rounded-md border border-repixl-muted/15 px-2 py-1 font-mono text-[9px] text-repixl-muted transition-colors hover:border-repixl-muted/30 hover:text-repixl-text-light"
                  >
                    {meta.label}
                  </Link>
                )
              )}
            </div>
          </div>

          {/* View All footer */}
          <div className="border-t border-repixl-muted/10">
            <Link
              href="/account/notifications"
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center gap-1.5 px-4 py-3 text-sm font-medium text-repixl-red transition-colors hover:bg-repixl-red/5"
            >
              View All Notifications
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
