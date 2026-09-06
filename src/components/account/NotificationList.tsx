'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Button, InlineLoader } from '@/components/ui'
import {
  EVENT_CATEGORY_MAP,
  type NotificationCategory,
} from '@/lib/notification-templates'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NotificationItem {
  id: string
  message: string
  event: string
  isRead: boolean
  createdAt: string
}

export type NotificationFilter = 'ALL' | NotificationCategory

// ── Category metadata ─────────────────────────────────────────────────────────

export const CATEGORY_META: Record<
  NotificationCategory,
  { label: string; slug: string; route: string }
> = {
  ORDER_UPDATES:  { label: 'Order Updates',  slug: 'order-updates',  route: '/account/notifications/order-updates' },
  PROMOTIONS:     { label: 'Promotions',     slug: 'promotions',     route: '/account/notifications/promotions' },
  REPIXL_UPDATES: { label: 'RePIXL Updates', slug: 'repixl-updates', route: '/account/notifications/repixl-updates' },
}

export function categorize(event: string): NotificationCategory | null {
  return (EVENT_CATEGORY_MAP as Record<string, NotificationCategory>)[event] ?? null
}

/** Human-readable label for a notification event. */
export function eventLabel(event: string): string {
  const cat = categorize(event)
  if (cat) return CATEGORY_META[cat].label
  return event.replace(/_/g, ' ')
}

// ── Shared list component ─────────────────────────────────────────────────────

interface NotificationListProps {
  /** If provided, only show notifications matching this category. */
  filter: NotificationFilter
  /** Label shown in the page heading. */
  heading: string
  /** Whether to show the category sub-tabs (only on the "All" view). */
  showTabs?: boolean
}

export function NotificationList({ filter, heading, showTabs = false }: NotificationListProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications?limit=200', { credentials: 'include' })
      if (res.ok) {
        const body = await res.json()
        setNotifications(body.data ?? [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const markRead = async (id: string) => {
    // Optimistic update first
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', credentials: 'include' })
  }

  const markAllRead = async () => {
    setMarkingAll(true)
    await fetch('/api/notifications/read-all', { method: 'POST', credentials: 'include' })
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setMarkingAll(false)
  }

  // Filter by category (or show all)
  const filtered = notifications.filter((n) => {
    if (filter === 'ALL') return true
    return categorize(n.event) === filter
  })

  const unreadInView = filtered.filter((n) => !n.isRead).length

  // Per-category unread counts (for tabs on the All view)
  const categoryUnread = (cat: NotificationCategory) =>
    notifications.filter((n) => !n.isRead && categorize(n.event) === cat).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-repixl-muted/10 pb-5">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-display-md text-repixl-text-light">{heading}</h1>
          {unreadInView > 0 && (
            <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-repixl-red px-1.5 font-mono text-[10px] font-bold text-white">
              {unreadInView > 99 ? '99+' : unreadInView}
            </span>
          )}
        </div>
        {unreadInView > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={markAllRead}
            disabled={markingAll}
            loading={markingAll}
          >
            Mark all as read
          </Button>
        )}
      </div>

      {/* Optional sub-category nav tabs (shown on the "All" page only) */}
      {showTabs && (
        <nav aria-label="Notification categories" className="flex gap-2 overflow-x-auto pb-1">
          {(Object.entries(CATEGORY_META) as [NotificationCategory, typeof CATEGORY_META[NotificationCategory]][]).map(
            ([key, meta]) => {
              const count = categoryUnread(key)
              return (
                <Link
                  key={key}
                  href={meta.route}
                  className="relative flex shrink-0 items-center gap-1.5 rounded-lg border border-repixl-muted/20 px-4 py-2 text-sm text-repixl-muted transition-colors hover:border-repixl-muted/40 hover:text-repixl-text-light"
                >
                  {meta.label}
                  {count > 0 && (
                    <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-repixl-red px-1 font-mono text-[8px] font-bold text-white">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </Link>
              )
            }
          )}
        </nav>
      )}

      {/* Content */}
      {loading ? (
        <InlineLoader label="Loading notifications…" className="min-h-[12rem]" />
      ) : filtered.length === 0 ? (
        <NotificationEmptyState filter={filter} />
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <NotificationRow key={n.id} notification={n} onMarkRead={markRead} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Individual row ────────────────────────────────────────────────────────────

function NotificationRow({
  notification: n,
  onMarkRead,
}: {
  notification: NotificationItem
  onMarkRead: (id: string) => void
}) {
  const categoryLabel = eventLabel(n.event)

  // Derive a destination URL for order-related notifications if the message
  // contains an order number pattern (e.g. "ORD-XXXXXX")
  const orderMatch = n.message.match(/\b(ORD-[A-Z0-9]{6,})\b/)
  const destination = orderMatch ? `/account/orders/${orderMatch[1]}` : null

  const content = (
    <div
      className={`flex items-start gap-4 rounded-2xl border p-4 transition-colors ${
        n.isRead
          ? 'border-repixl-muted/10 bg-repixl-charcoal/50'
          : 'border-repixl-muted/20 bg-repixl-charcoal'
      }`}
    >
      {/* Unread dot */}
      <div className="mt-1.5 shrink-0">
        <div
          className={`h-2 w-2 rounded-full ${n.isRead ? 'bg-repixl-muted/20' : 'bg-repixl-red'}`}
          aria-hidden="true"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={`text-sm leading-relaxed ${
            n.isRead ? 'text-repixl-text-light/60' : 'text-repixl-text-light'
          }`}
        >
          {n.message.length > 500 ? n.message.slice(0, 500) + '…' : n.message}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-repixl-muted/10 px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-repixl-muted/70">
            {categoryLabel}
          </span>
          <span className="font-mono text-[9px] text-repixl-muted/50">
            {new Date(n.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      {!n.isRead && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onMarkRead(n.id)
          }}
          className="shrink-0 font-mono text-[9px] uppercase tracking-wider"
          aria-label="Mark as read"
        >
          Mark read
        </Button>
      )}
    </div>
  )

  // Wrap in a link if there's a valid destination
  if (destination && !n.isRead) {
    return (
      <Link
        href={destination}
        onClick={() => onMarkRead(n.id)}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40 rounded-2xl"
      >
        {content}
      </Link>
    )
  }

  return content
}

// ── Empty states ──────────────────────────────────────────────────────────────

const EMPTY_MESSAGES: Record<NotificationFilter, string> = {
  ALL:            "You're all caught up.",
  ORDER_UPDATES:  'No order update notifications yet.',
  PROMOTIONS:     'No promotions yet.',
  REPIXL_UPDATES: 'No platform updates yet.',
}

function NotificationEmptyState({ filter }: { filter: NotificationFilter }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-repixl-muted/20 py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-repixl-charcoal/50">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="text-repixl-muted/40"
          aria-hidden="true"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      </div>
      <p className="font-display text-display-sm text-repixl-text-light/60">No notifications</p>
      <p className="mt-1 text-sm text-repixl-muted">{EMPTY_MESSAGES[filter]}</p>
    </div>
  )
}
