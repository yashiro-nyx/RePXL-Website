'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { Button, InlineLoader } from '@/components/ui'
import { NotificationIcon } from '@/components/account/NotificationIcon'
import {
  DISPLAY_CATEGORY_META,
  DISPLAY_CATEGORY_ORDER,
  type NotificationDisplayCategory,
  type NotificationIcon as NotificationIconName,
} from '@/lib/notification-inapp'

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * The display view model returned by the notification APIs
 * (`toNotificationView`). The UI never parses raw message strings — the server
 * has already resolved a concise title, body, destination, and category.
 */
export interface NotificationItem {
  id: string
  event: string
  title: string
  body: string
  href: string | null
  category: NotificationDisplayCategory
  icon: NotificationIconName
  isRead: boolean
  createdAt: string
}

/** Filter is either "ALL" or one of the fine-grained display categories. */
export type NotificationFilter = 'ALL' | NotificationDisplayCategory

/**
 * The coarse backend taxonomy used by the sidebar subroutes and the
 * unread-count endpoint. Each fine display category rolls up into exactly one
 * of these so the existing /order-updates, /promotions, /repixl-updates routes
 * keep working without inventing data.
 */
export type BackendNotificationCategory = 'ORDER_UPDATES' | 'PROMOTIONS' | 'REPIXL_UPDATES'

const DISPLAY_TO_BACKEND: Record<NotificationDisplayCategory, BackendNotificationCategory> = {
  ORDERS: 'ORDER_UPDATES',
  PAYMENTS: 'ORDER_UPDATES',
  SHIPPING: 'ORDER_UPDATES',
  RETURNS: 'ORDER_UPDATES',
  ACCOUNT: 'REPIXL_UPDATES',
  PROMOTIONS: 'PROMOTIONS',
  UPDATES: 'REPIXL_UPDATES',
}

// ── Shared formatting ───────────────────────────────────────────────────────

/** Compact relative time for recent items, absolute date beyond a week. */
export function formatTimestamp(dateStr: string): string {
  const then = new Date(dateStr).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Date.now() - then
  const mins = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Human label for a display category (used for the small category tag). */
export function categoryLabel(category: NotificationDisplayCategory): string {
  return DISPLAY_CATEGORY_META[category]?.label ?? 'Notification'
}

// ── Shared notification row ───────────────────────────────────────────────────

interface RowProps {
  notification: NotificationItem
  /** Compact = navbar dropdown; comfortable = full page. */
  variant?: 'compact' | 'comfortable'
  onMarkRead: (id: string) => void
  /** Called after a navigation click (e.g. to close the dropdown). */
  onNavigate?: () => void
}

/**
 * A single notification, rendered identically (bar spacing) in the dropdown and
 * the full page. Clicking an actionable row marks it read and navigates; rows
 * without a destination are not misleadingly clickable.
 */
export function NotificationRow({ notification: n, variant = 'comfortable', onMarkRead, onNavigate }: RowProps) {
  const meta = DISPLAY_CATEGORY_META[n.category]
  const compact = variant === 'compact'

  const inner = (
    <div
      className={[
        'flex items-start gap-3 transition-colors',
        compact ? 'px-4 py-3' : 'rounded-xl border p-4',
        compact
          ? n.isRead
            ? 'bg-transparent hover:bg-repixl-charcoal/40'
            : 'bg-repixl-charcoal/40 hover:bg-repixl-charcoal/60'
          : n.isRead
            ? 'border-repixl-muted/10 bg-repixl-charcoal/40'
            : 'border-repixl-muted/20 bg-repixl-charcoal',
      ].join(' ')}
    >
      {/* Category icon */}
      <div
        className={[
          'mt-0.5 flex shrink-0 items-center justify-center rounded-lg',
          compact ? 'h-8 w-8' : 'h-9 w-9',
          n.isRead ? 'bg-repixl-muted/10' : 'bg-repixl-bg',
          meta.accentClass,
        ].join(' ')}
      >
        <NotificationIcon icon={n.icon} size={compact ? 15 : 17} />
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={[
              'truncate font-medium',
              compact ? 'text-[13px]' : 'text-sm',
              n.isRead ? 'text-repixl-text-light/70' : 'text-repixl-text-light',
            ].join(' ')}
          >
            {n.title}
          </p>
          {/* Unread indicator */}
          {!n.isRead && (
            <span
              className="mt-1 h-2 w-2 shrink-0 rounded-full bg-repixl-red"
              aria-label="Unread"
            />
          )}
        </div>

        <p
          className={[
            'mt-0.5 break-words',
            compact ? 'line-clamp-2 text-xs leading-relaxed' : 'text-sm leading-relaxed',
            n.isRead ? 'text-repixl-muted' : 'text-repixl-text-light/80',
          ].join(' ')}
        >
          {n.body}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="rounded-full bg-repixl-muted/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-repixl-muted">
            {meta.label}
          </span>
          <span className="font-mono text-[10px] text-repixl-muted/70">{formatTimestamp(n.createdAt)}</span>
        </div>
      </div>
    </div>
  )

  // Actionable row: wrap in a link that marks read on navigation.
  if (n.href) {
    return (
      <Link
        href={n.href}
        onClick={() => {
          if (!n.isRead) onMarkRead(n.id)
          onNavigate?.()
        }}
        className={[
          'block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40',
          compact ? 'focus-visible:ring-inset' : 'rounded-xl',
        ].join(' ')}
        aria-label={`${n.title}. ${n.body}`}
      >
        {inner}
      </Link>
    )
  }

  // Non-actionable row: still allow marking read via an explicit control.
  return (
    <div className="group relative">
      {inner}
      {!n.isRead && (
        <button
          type="button"
          onClick={() => onMarkRead(n.id)}
          className={[
            'absolute right-2 top-2 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider',
            'text-repixl-muted transition-colors hover:bg-repixl-charcoal hover:text-repixl-text-light',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40',
          ].join(' ')}
          aria-label={`Mark "${n.title}" as read`}
        >
          Mark read
        </button>
      )}
    </div>
  )
}

// ── Empty states ──────────────────────────────────────────────────────────────

const EMPTY_MESSAGES: Record<NotificationFilter, string> = {
  ALL: "You're all caught up.",
  ORDERS: 'No order notifications yet.',
  PAYMENTS: 'No payment notifications yet.',
  SHIPPING: 'No shipping notifications yet.',
  RETURNS: 'No return notifications yet.',
  ACCOUNT: 'No account or security notifications yet.',
  PROMOTIONS: 'No promotions yet.',
  UPDATES: 'No platform updates yet.',
}

export function NotificationEmptyState({ filter }: { filter: NotificationFilter }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-repixl-muted/20 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-repixl-charcoal/50 text-repixl-muted/40">
        <NotificationIcon icon="update" size={22} />
      </div>
      <p className="font-display text-display-sm text-repixl-text-light/60">Nothing here</p>
      <p className="mt-1 text-sm text-repixl-muted">{EMPTY_MESSAGES[filter]}</p>
    </div>
  )
}

export function NotificationErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-repixl-red/30 py-16 text-center">
      <p className="font-display text-display-sm text-repixl-text-light/70">Couldn&apos;t load notifications</p>
      <p className="mt-1 text-sm text-repixl-muted">Please check your connection and try again.</p>
      <Button variant="secondary" size="sm" onClick={onRetry} className="mt-5">
        Retry
      </Button>
    </div>
  )
}

// ── Full list component ───────────────────────────────────────────────────────

interface NotificationListProps {
  /** Optional fixed fine-grained filter. Defaults to ALL with tabs. */
  filter?: NotificationFilter
  /**
   * Optional fixed COARSE backend category (used by the sidebar subroutes
   * /order-updates, /promotions, /repixl-updates). When set, the list shows all
   * events rolling up into that backend group and fine-grained tabs are hidden.
   */
  backendCategory?: BackendNotificationCategory
  /** Heading shown at the top of the page. */
  heading: string
  /** Whether to show the category filter tabs. */
  showTabs?: boolean
}

export function NotificationList({ filter: fixedFilter, backendCategory, heading, showTabs = true }: NotificationListProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>(fixedFilter ?? 'ALL')

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/notifications?limit=200', { credentials: 'include' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = await res.json()
      setNotifications(body.data ?? [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Refetch when the tab becomes visible/focused so the list is never stale.
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [load])

  const markRead = useCallback(async (id: string) => {
    // Optimistic; server call is idempotent and ownership-checked.
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', credentials: 'include' })
    } catch {
      /* keep optimistic state; next focus refetch reconciles */
    }
  }, [])

  const markAllRead = useCallback(async () => {
    setMarkingAll(true)
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    try {
      await fetch('/api/notifications/read-all', { method: 'POST', credentials: 'include' })
    } catch {
      /* optimistic */
    } finally {
      setMarkingAll(false)
    }
  }, [])

  // A coarse backend category (subroute) scopes the whole list; within it the
  // fine-grained tabs still apply.
  const scoped = useMemo(
    () =>
      backendCategory
        ? notifications.filter((n) => DISPLAY_TO_BACKEND[n.category] === backendCategory)
        : notifications,
    [notifications, backendCategory]
  )

  const effectiveFilter = fixedFilter ?? activeFilter

  const filtered = useMemo(
    () => scoped.filter((n) => (effectiveFilter === 'ALL' ? true : n.category === effectiveFilter)),
    [scoped, effectiveFilter]
  )

  const unreadInView = filtered.filter((n) => !n.isRead).length

  // Only show tabs for categories that actually have notifications in scope.
  const presentCategories = useMemo(() => {
    const set = new Set(scoped.map((n) => n.category))
    return DISPLAY_CATEGORY_ORDER.filter((c) => set.has(c))
  }, [scoped])

  const categoryUnread = (cat: NotificationDisplayCategory) =>
    scoped.filter((n) => !n.isRead && n.category === cat).length

  // Tabs are useful only when there is more than one fine category to switch
  // between (and we aren't pinned to a single fine filter).
  const tabsVisible = showTabs && !fixedFilter && presentCategories.length > 1

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
          <Button variant="secondary" size="sm" onClick={markAllRead} disabled={markingAll} loading={markingAll}>
            Mark all as read
          </Button>
        )}
      </div>

      {/* Category filter tabs. */}
      {tabsVisible && (
        <nav aria-label="Filter notifications" className="flex flex-wrap gap-2">
          <FilterTab
            label="All"
            active={activeFilter === 'ALL'}
            onClick={() => setActiveFilter('ALL')}
          />
          {presentCategories.map((cat) => (
            <FilterTab
              key={cat}
              label={DISPLAY_CATEGORY_META[cat].label}
              count={categoryUnread(cat)}
              active={activeFilter === cat}
              onClick={() => setActiveFilter(cat)}
            />
          ))}
        </nav>
      )}

      {/* Content */}
      {loading ? (
        <InlineLoader label="Loading notifications…" className="min-h-[12rem]" />
      ) : error ? (
        <NotificationErrorState onRetry={load} />
      ) : filtered.length === 0 ? (
        <NotificationEmptyState filter={effectiveFilter} />
      ) : (
        <ul className="space-y-2.5" aria-label="Notifications">
          {filtered.map((n) => (
            <li key={n.id}>
              <NotificationRow notification={n} variant="comfortable" onMarkRead={markRead} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function FilterTab({
  label,
  count = 0,
  active,
  onClick,
}: {
  label: string
  count?: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'relative flex shrink-0 items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40',
        active
          ? 'border-repixl-red/50 bg-repixl-red/10 text-repixl-text-light'
          : 'border-repixl-muted/20 text-repixl-muted hover:border-repixl-muted/40 hover:text-repixl-text-light',
      ].join(' ')}
    >
      {label}
      {count > 0 && (
        <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-repixl-red px-1 font-mono text-[8px] font-bold text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}
