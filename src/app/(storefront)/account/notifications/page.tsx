'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Container } from '@/components/layout/Container'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'

interface Notification {
  id: string
  message: string
  event: string
  isRead: boolean
  createdAt: string
}

export default function NotificationCenterPage() {
  const router = useRouter()
  const { isLoggedIn, hydrate } = useAuthStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [hydrated, setHydrated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

  useEffect(() => {
    hydrate().then(() => setHydrated(true))
  }, [hydrate])

  useEffect(() => {
    if (hydrated && !isLoggedIn) { router.push('/login'); return }
    if (hydrated && isLoggedIn) loadNotifications()
  }, [hydrated, isLoggedIn])

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications', { credentials: 'include' })
      if (res.ok) {
        const body = await res.json()
        setNotifications(body.data?.notifications ?? [])
        setUnreadCount(body.data?.unreadCount ?? 0)
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', credentials: 'include' })
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n))
    setUnreadCount((c) => Math.max(0, c - 1))
  }

  const markAllRead = async () => {
    setMarkingAll(true)
    await fetch('/api/notifications/read-all', { method: 'POST', credentials: 'include' })
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
    setMarkingAll(false)
  }

  if (!hydrated || !isLoggedIn) return null

  return (
    <>
      <div className="burn-subtle min-h-screen pb-20 pt-24">
        <Container>
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-repixl-muted/10 pb-6">
            <div className="flex items-center gap-3">
              <Link href="/account" className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted hover:text-repixl-text-light">← Account</Link>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-display-md text-repixl-text-light">Notifications</h1>
              {unreadCount > 0 && (
                <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-repixl-red px-1.5 font-mono text-[10px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} disabled={markingAll}
                className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted transition-colors hover:text-repixl-text-light disabled:opacity-50">
                {markingAll ? 'Marking…' : 'Mark all read'}
              </button>
            )}
          </div>

          {loading ? (
            <p className="py-12 text-center text-sm text-repixl-muted">Loading notifications…</p>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-repixl-muted/20 py-24 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-repixl-charcoal/50">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-repixl-muted/40" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
              </div>
              <p className="font-display text-display-sm text-repixl-text-light/60">No notifications</p>
              <p className="mt-1 text-sm text-repixl-muted">You're all caught up.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-4 rounded-2xl border p-4 transition-colors ${n.isRead ? 'border-repixl-muted/10 bg-repixl-charcoal/50' : 'border-repixl-muted/20 bg-repixl-charcoal'}`}
                >
                  {/* Unread indicator */}
                  <div className="mt-1.5 flex-shrink-0">
                    {!n.isRead ? (
                      <div className="h-2 w-2 rounded-full bg-repixl-red" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-repixl-muted/20" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className={`text-sm leading-relaxed ${n.isRead ? 'text-repixl-text-light/60' : 'text-repixl-text-light'}`}>
                      {n.message.length > 500 ? n.message.slice(0, 500) + '…' : n.message}
                    </p>
                    <div className="mt-1.5 flex items-center gap-3">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-repixl-muted/60">
                        {n.event.replace(/_/g, ' ')}
                      </span>
                      <span className="font-mono text-[9px] text-repixl-muted/50">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {!n.isRead && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="flex-shrink-0 font-mono text-[9px] uppercase tracking-wider text-repixl-muted transition-colors hover:text-repixl-text-light"
                      aria-label="Mark as read"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Container>
      </div>
      <Footer />
    </>
  )
}
