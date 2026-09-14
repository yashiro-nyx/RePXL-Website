'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ALLOWED_TOKENS,
  findUnknownTokens,
  resolvePlaceholders,
  validateTemplate,
  MODERN_DEFAULT_TEMPLATES,
  SAMPLE_TEMPLATE_CONTEXT,
  EVENT_CATEGORY_MAP,
  type NotificationEvent,
  type NotificationCategory,
} from '@/lib/notification-templates'

interface Template {
  event: NotificationEvent
  subject: string
  body: string
  channel: 'IN_APP' | 'EMAIL' | 'BOTH'
  isEnabled: boolean
  updatedAt?: string
}

const CATEGORY_LABELS: Record<NotificationCategory | 'ALL', string> = {
  ALL: 'All Templates',
  ORDER_UPDATES: 'Orders & Tracking',
  PROMOTIONS: 'Marketing & Promotions',
  REPIXL_UPDATES: 'Platform Announcements',
}

const EVENT_DESCRIPTIONS: Record<NotificationEvent, string> = {
  ORDER_CONFIRMATION: 'Dispatched immediately when checkout is completed and payment is verified.',
  ORDER_STATUS_CHANGE: 'Dispatched whenever the fulfillment status or courier tracking is updated.',
  RETURN_RECEIVED: 'Dispatched when a customer initiates a return request for their order.',
  RETURN_STATUS_CHANGE: 'Dispatched when an admin updates a return request (e.g. approved, inspected).',
  REFUND_COMPLETED: 'Dispatched when a refund has been issued to the customer\'s payment method.',
  PROMOTION: 'Dispatched to opted-in customers for discounts, voucher codes, and flash sales.',
  REPIXL_UPDATE: 'Dispatched to all customers for platform features and editorial announcements.',
}

function formatEventName(event: string): string {
  return event
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export default function NotificationTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<NotificationCategory | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [editing, setEditing] = useState<Record<string, {
    subject: string
    body: string
    channel: 'IN_APP' | 'EMAIL' | 'BOTH'
    isEnabled: boolean
  }>>({})
  const [previewEvent, setPreviewEvent] = useState<NotificationEvent | null>(null)
  const [previewChannel, setPreviewChannel] = useState<'EMAIL' | 'IN_APP'>('EMAIL')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [submitting, setSubmitting] = useState<string | null>(null)

  // Track focused field for token insertion ('subject' or 'body')
  const [lastFocusedField, setLastFocusedField] = useState<Record<string, 'subject' | 'body'>>({})
  const subjectInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const bodyInputRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})

  const load = async () => {
    try {
      const res = await fetch('/api/admin/notifications', { credentials: 'include' })
      const body = await res.json()
      if (res.ok && Array.isArray(body.data)) {
        setTemplates(body.data)
      } else {
        setMsg({ type: 'error', text: body.error || 'Failed to load templates' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error loading notification templates' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const startEdit = (t: Template) => {
    setEditing((prev) => ({
      ...prev,
      [t.event]: {
        subject: t.subject,
        body: t.body,
        channel: t.channel,
        isEnabled: t.isEnabled,
      },
    }))
    setLastFocusedField((prev) => ({ ...prev, [t.event]: 'body' }))
  }

  const cancelEdit = (event: string) => {
    setEditing((prev) => {
      const copy = { ...prev }
      delete copy[event]
      return copy
    })
  }

  const resetToModernDefault = (event: NotificationEvent) => {
    const modern = MODERN_DEFAULT_TEMPLATES[event]
    if (!modern) return
    setEditing((prev) => ({
      ...prev,
      [event]: {
        subject: modern.subject,
        body: modern.body,
        channel: modern.channel,
        isEnabled: modern.isEnabled,
      },
    }))
    setMsg({ type: 'success', text: `Loaded modern default template for ${formatEventName(event)}.` })
  }

  const insertToken = (event: NotificationEvent, token: string) => {
    const activeField = lastFocusedField[event] || 'body'
    const tokenStr = `{{${token}}}`
    const ed = editing[event]
    if (!ed) return

    if (activeField === 'subject') {
      const input = subjectInputRefs.current[event]
      let newSubject = ed.subject
      if (input && input.selectionStart !== null && input.selectionEnd !== null) {
        const start = input.selectionStart
        const end = input.selectionEnd
        newSubject = ed.subject.substring(0, start) + tokenStr + ed.subject.substring(end)
      } else {
        newSubject += (newSubject.endsWith(' ') ? '' : ' ') + tokenStr
      }
      setEditing((prev) => ({ ...prev, [event]: { ...prev[event], subject: newSubject } }))
    } else {
      const textarea = bodyInputRefs.current[event]
      let newBody = ed.body
      if (textarea && textarea.selectionStart !== null && textarea.selectionEnd !== null) {
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        newBody = ed.body.substring(0, start) + tokenStr + ed.body.substring(end)
      } else {
        newBody += (newBody.endsWith('\n') ? '' : '\n') + tokenStr
      }
      setEditing((prev) => ({ ...prev, [event]: { ...prev[event], body: newBody } }))
    }
  }

  const saveTemplate = async (event: NotificationEvent) => {
    const ed = editing[event]
    if (!ed) return

    // Pre-validate
    const validation = validateTemplate({ subject: ed.subject, body: ed.body })
    if (!validation.valid) {
      setMsg({ type: 'error', text: validation.errors.map((e) => e.message).join(' ') })
      return
    }

    const unknownTokens = findUnknownTokens(ed.body, event)
    if (unknownTokens.length > 0) {
      setMsg({
        type: 'error',
        text: `Unknown placeholder tokens in message body: ${unknownTokens.map((t) => `{{${t}}}`).join(', ')}`,
      })
      return
    }

    setSubmitting(event)
    try {
      const res = await fetch(`/api/admin/notifications/${event}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: ed.subject,
          body: ed.body,
          channel: ed.channel,
          isEnabled: ed.isEnabled,
        }),
      })
      const body = await res.json()
      if (res.ok) {
        setMsg({ type: 'success', text: `Template for "${formatEventName(event)}" saved successfully.` })
        cancelEdit(event)
        await load()
      } else {
        setMsg({ type: 'error', text: body.error || 'Failed to save template.' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error saving notification template.' })
    } finally {
      setSubmitting(null)
    }
  }

  const toggleEnableState = async (t: Template) => {
    const newState = !t.isEnabled
    try {
      const res = await fetch(`/api/admin/notifications/${t.event}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: newState }),
      })
      if (res.ok) {
        setTemplates((prev) =>
          prev.map((item) => (item.event === t.event ? { ...item, isEnabled: newState } : item))
        )
        setMsg({
          type: 'success',
          text: `Template for "${formatEventName(t.event)}" is now ${newState ? 'enabled' : 'disabled'}.`,
        })
      } else {
        const body = await res.json()
        setMsg({ type: 'error', text: body.error || 'Failed to update template status.' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error updating template status.' })
    }
  }

  // Filter templates
  const filteredTemplates = templates.filter((t) => {
    if (categoryFilter !== 'ALL' && EVENT_CATEGORY_MAP[t.event] !== categoryFilter) {
      return false
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchesEvent = t.event.toLowerCase().includes(q)
      const matchesSubject = t.subject.toLowerCase().includes(q)
      const matchesBody = t.body.toLowerCase().includes(q)
      return matchesEvent || matchesSubject || matchesBody
    }
    return true
  })

  // Selected template for preview
  const activePreviewTemplate = previewEvent
    ? editing[previewEvent] || templates.find((t) => t.event === previewEvent)
    : null

  const resolvedSubject = activePreviewTemplate
    ? resolvePlaceholders(activePreviewTemplate.subject, SAMPLE_TEMPLATE_CONTEXT)
    : ''
  const resolvedBody = activePreviewTemplate
    ? resolvePlaceholders(activePreviewTemplate.body, SAMPLE_TEMPLATE_CONTEXT)
    : ''

  const inputClass =
    'w-full rounded-xl border border-repixl-muted/20 bg-repixl-bg px-4 py-2.5 text-sm text-repixl-text-light placeholder:text-repixl-muted focus:border-repixl-red focus:outline-none transition'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-repixl-text-light tracking-tight">Notification Templates</h1>
          <p className="mt-1 text-sm text-repixl-muted">
            Configure automated customer communications, dynamic placeholders, and multi-channel delivery.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-repixl-muted/20 bg-repixl-charcoal px-3 py-1.5 text-xs font-mono text-repixl-text-light">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{templates.filter((t) => t.isEnabled).length} / {templates.length} Active</span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {msg && (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition ${
            msg.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-red-500/30 bg-red-500/10 text-red-400'
          }`}
        >
          <span>{msg.text}</span>
          <button
            onClick={() => setMsg(null)}
            className="text-xs opacity-70 hover:opacity-100 transition ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {(['ALL', 'ORDER_UPDATES', 'RETURNS_AND_REFUNDS', 'PROMOTIONS', 'REPIXL_UPDATES'] as const).map(
            (tab) => {
              // Custom virtual category for tabs if desired
              let isSelected = false
              if (tab === 'ALL') isSelected = categoryFilter === 'ALL'
              else if (tab === 'RETURNS_AND_REFUNDS') isSelected = false
              else isSelected = categoryFilter === tab

              return (
                <button
                  key={tab}
                  onClick={() => {
                    if (tab === 'RETURNS_AND_REFUNDS') {
                      setCategoryFilter('ORDER_UPDATES')
                      setSearchQuery('return')
                    } else {
                      setCategoryFilter(tab)
                      if (searchQuery === 'return') setSearchQuery('')
                    }
                  }}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
                    isSelected
                      ? 'bg-repixl-red text-white shadow-sm'
                      : 'border border-repixl-muted/20 bg-repixl-charcoal text-repixl-muted hover:border-repixl-muted/40 hover:text-repixl-text-light'
                  }`}
                >
                  {tab === 'RETURNS_AND_REFUNDS'
                    ? 'Returns & Refunds'
                    : CATEGORY_LABELS[tab as NotificationCategory | 'ALL']}
                </button>
              )
            }
          )}
        </div>

        <div className="relative w-full lg:w-72">
          <input
            type="text"
            placeholder="Search templates, subjects, tokens…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-repixl-muted/20 bg-repixl-charcoal px-3.5 py-1.5 text-xs text-repixl-text-light placeholder:text-repixl-muted focus:border-repixl-red focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-repixl-muted hover:text-repixl-text-light"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-12 text-center">
          <p className="text-sm text-repixl-muted animate-pulse">Loading notification templates…</p>
        </div>
      )}

      {!loading && filteredTemplates.length === 0 && (
        <div className="rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-12 text-center">
          <p className="text-sm text-repixl-muted">No templates match the current filter.</p>
          <button
            onClick={() => {
              setCategoryFilter('ALL')
              setSearchQuery('')
            }}
            className="mt-3 text-xs font-medium text-repixl-red hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Templates List */}
      <div className="space-y-4">
        {filteredTemplates.map((t) => {
          const ed = editing[t.event]
          const isEditing = Boolean(ed)
          const allowedTokens = ALLOWED_TOKENS[t.event] ?? []
          const description = EVENT_DESCRIPTIONS[t.event] ?? ''
          const currentBody = ed ? ed.body : t.body
          const currentSubject = ed ? ed.subject : t.subject
          const unknownTokens = isEditing ? findUnknownTokens(ed.body, t.event) : []
          const isOverSubjectLimit = isEditing && (ed.subject.length < 1 || ed.subject.length > 200)
          const isOverBodyLimit = isEditing && (ed.body.length < 1 || ed.body.length > 10000)

          return (
            <div
              key={t.event}
              className={`rounded-2xl border transition ${
                isEditing
                  ? 'border-repixl-red/40 bg-repixl-charcoal shadow-lg'
                  : 'border-repixl-muted/20 bg-repixl-charcoal/70 hover:border-repixl-muted/40'
              } p-5`}
            >
              {/* Card Top Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-repixl-muted/10 pb-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-semibold text-repixl-text-light text-base">
                    {formatEventName(t.event)}
                  </span>
                  <span className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[10px] text-repixl-muted">
                    {t.event}
                  </span>
                  <span className="rounded-md border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-400">
                    {CATEGORY_LABELS[EVENT_CATEGORY_MAP[t.event]]}
                  </span>
                  <span className="rounded-md border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-300">
                    {t.channel === 'BOTH' ? 'Email & In-App' : t.channel === 'EMAIL' ? 'Email Only' : 'In-App Only'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleEnableState(t)}
                    className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-medium transition ${
                      t.isEnabled
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        : 'border-zinc-600 bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    {t.isEnabled ? '● Active' : '○ Disabled'}
                  </button>

                  <button
                    onClick={() => {
                      setPreviewEvent(t.event)
                      setPreviewChannel(t.channel === 'IN_APP' ? 'IN_APP' : 'EMAIL')
                    }}
                    className="rounded-lg border border-repixl-muted/20 px-2.5 py-1 text-xs text-repixl-muted hover:border-repixl-muted/40 hover:text-repixl-text-light transition flex items-center gap-1.5"
                    title="Live Preview"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Preview
                  </button>

                  {!isEditing ? (
                    <button
                      onClick={() => startEdit(t)}
                      className="rounded-lg bg-repixl-red/10 border border-repixl-red/30 px-3 py-1 text-xs font-medium text-repixl-red hover:bg-repixl-red hover:text-white transition"
                    >
                      Edit
                    </button>
                  ) : (
                    <button
                      onClick={() => cancelEdit(t.event)}
                      className="rounded-lg border border-repixl-muted/20 px-3 py-1 text-xs text-repixl-muted hover:text-repixl-text-light transition"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>

              {/* Event Description */}
              <p className="mt-2 text-xs text-repixl-muted leading-relaxed">
                {description}
              </p>

              {/* Read-Only Summary Mode */}
              {!isEditing && (
                <div className="mt-4 rounded-xl border border-repixl-muted/10 bg-repixl-bg/50 p-4 space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-repixl-muted">Subject:</span>
                    <span className="text-xs font-medium text-repixl-text-light">{t.subject}</span>
                  </div>
                  <div>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-repixl-muted block mb-1">Message:</span>
                    <p className="text-xs text-repixl-muted/90 whitespace-pre-line line-clamp-3 font-mono leading-relaxed">
                      {t.body}
                    </p>
                  </div>
                </div>
              )}

              {/* Edit Mode */}
              {isEditing && (
                <div className="mt-4 space-y-4 pt-2">
                  {/* Delivery Channel & Active State */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-repixl-muted/10 bg-repixl-bg/30 p-3">
                    <div>
                      <label className="block text-xs font-medium text-repixl-text-light mb-1.5">
                        Delivery Channels
                      </label>
                      <div className="flex gap-2">
                        {(['BOTH', 'EMAIL', 'IN_APP'] as const).map((channelVal) => (
                          <button
                            key={channelVal}
                            type="button"
                            onClick={() =>
                              setEditing((prev) => ({
                                ...prev,
                                [t.event]: { ...prev[t.event], channel: channelVal },
                              }))
                            }
                            className={`rounded-lg px-2.5 py-1 text-xs font-mono transition ${
                              ed.channel === channelVal
                                ? 'bg-purple-600 text-white font-semibold'
                                : 'border border-repixl-muted/20 bg-repixl-charcoal text-repixl-muted hover:text-repixl-text-light'
                            }`}
                          >
                            {channelVal === 'BOTH' ? 'Email & In-App' : channelVal === 'EMAIL' ? 'Email Only' : 'In-App Only'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-repixl-text-light mb-1.5">
                        Notification State
                      </label>
                      <label className="flex cursor-pointer items-center gap-2.5 mt-1">
                        <input
                          type="checkbox"
                          checked={ed.isEnabled}
                          onChange={(e) =>
                            setEditing((prev) => ({
                              ...prev,
                              [t.event]: { ...prev[t.event], isEnabled: e.target.checked },
                            }))
                          }
                          className="h-4 w-4 rounded border-repixl-muted/30 bg-repixl-bg text-repixl-red focus:ring-0 cursor-pointer"
                        />
                        <span className="text-xs text-repixl-text-light">
                          Enable this automated notification
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Token Tray */}
                  <div className="rounded-xl border border-repixl-muted/20 bg-repixl-bg/40 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-repixl-text-light">
                        Insert Dynamic Placeholders:
                      </span>
                      <span className="text-[11px] text-repixl-muted">
                        Clicking a token inserts into{' '}
                        <strong className="text-repixl-text-light">
                          {lastFocusedField[t.event] === 'subject' ? 'Subject' : 'Message Body'}
                        </strong>
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {allowedTokens.map((token) => (
                        <button
                          key={token}
                          type="button"
                          onClick={() => insertToken(t.event, token)}
                          className="group flex items-center gap-1 rounded-lg border border-repixl-muted/20 bg-repixl-charcoal px-2.5 py-1 font-mono text-xs text-amber-300 hover:border-amber-400/40 hover:bg-amber-400/10 transition"
                          title={`Insert {{${token}}}`}
                        >
                          <span className="text-repixl-muted group-hover:text-amber-300">+</span>
                          <span>{`{{${token}}}`}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Unknown Tokens Warning */}
                  {unknownTokens.length > 0 && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 flex items-start gap-2">
                      <span className="text-base leading-none">⚠️</span>
                      <div>
                        <strong>Unrecognized placeholder tokens: </strong>
                        {unknownTokens.map((tok) => `{{${tok}}}`).join(', ')}.
                        <p className="mt-0.5 text-amber-200/80">
                          This event only supports: {allowedTokens.map((tok) => `{{${tok}}}`).join(', ')}.
                          Please replace or remove these before saving.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Subject Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-repixl-text-light">
                        Subject Line (1–200 characters)
                      </label>
                      <span
                        className={`font-mono text-[10px] ${
                          isOverSubjectLimit ? 'text-red-400 font-bold' : 'text-repixl-muted'
                        }`}
                      >
                        {ed.subject.length} / 200
                      </span>
                    </div>
                    <input
                      ref={(el) => {
                        subjectInputRefs.current[t.event] = el
                      }}
                      type="text"
                      maxLength={200}
                      value={ed.subject}
                      onFocus={() =>
                        setLastFocusedField((prev) => ({ ...prev, [t.event]: 'subject' }))
                      }
                      onChange={(e) =>
                        setEditing((prev) => ({
                          ...prev,
                          [t.event]: { ...prev[t.event], subject: e.target.value },
                        }))
                      }
                      className={inputClass}
                      placeholder="e.g. Order #{{orderNumber}} Confirmed"
                    />
                  </div>

                  {/* Body Textarea */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-repixl-text-light">
                        Message Body (1–10,000 characters)
                      </label>
                      <span
                        className={`font-mono text-[10px] ${
                          isOverBodyLimit ? 'text-red-400 font-bold' : 'text-repixl-muted'
                        }`}
                      >
                        {ed.body.length} / 10,000
                      </span>
                    </div>
                    <textarea
                      ref={(el) => {
                        bodyInputRefs.current[t.event] = el
                      }}
                      rows={8}
                      maxLength={10000}
                      value={ed.body}
                      onFocus={() =>
                        setLastFocusedField((prev) => ({ ...prev, [t.event]: 'body' }))
                      }
                      onChange={(e) =>
                        setEditing((prev) => ({
                          ...prev,
                          [t.event]: { ...prev[t.event], body: e.target.value },
                        }))
                      }
                      className={`${inputClass} font-mono text-xs leading-relaxed resize-y`}
                      placeholder="Enter customer notification copy..."
                    />
                  </div>

                  {/* Edit Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => saveTemplate(t.event)}
                        disabled={submitting === t.event || unknownTokens.length > 0}
                        className="rounded-xl bg-repixl-red px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition shadow-sm"
                      >
                        {submitting === t.event ? 'Saving…' : 'Save Changes'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPreviewEvent(t.event)
                          setPreviewChannel(ed.channel === 'IN_APP' ? 'IN_APP' : 'EMAIL')
                        }}
                        className="rounded-xl border border-repixl-muted/20 bg-repixl-charcoal px-3.5 py-2 text-xs text-repixl-text-light hover:border-repixl-muted/40 transition"
                      >
                        Preview Draft
                      </button>

                      <button
                        type="button"
                        onClick={() => cancelEdit(t.event)}
                        className="rounded-xl border border-repixl-muted/20 px-3 py-2 text-xs text-repixl-muted hover:text-repixl-text-light transition"
                      >
                        Cancel
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => resetToModernDefault(t.event)}
                      className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs font-medium text-amber-300 hover:bg-amber-500/10 transition"
                      title="Load canonical modern copy for this notification event"
                    >
                      ↺ Reset to Modern Default
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Live Preview Modal */}
      {previewEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl border border-repixl-muted/30 bg-repixl-charcoal shadow-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-repixl-muted/20 px-6 py-4 bg-repixl-charcoal">
              <div>
                <h3 className="font-semibold text-repixl-text-light text-base">
                  Live Preview: {formatEventName(previewEvent)}
                </h3>
                <p className="text-xs text-repixl-muted">
                  Simulated with realistic customer sample data
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Channel Switcher */}
                <div className="flex rounded-lg border border-repixl-muted/20 p-0.5 bg-repixl-bg">
                  <button
                    onClick={() => setPreviewChannel('EMAIL')}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      previewChannel === 'EMAIL'
                        ? 'bg-purple-600 text-white'
                        : 'text-repixl-muted hover:text-repixl-text-light'
                    }`}
                  >
                    Email View
                  </button>
                  <button
                    onClick={() => setPreviewChannel('IN_APP')}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      previewChannel === 'IN_APP'
                        ? 'bg-purple-600 text-white'
                        : 'text-repixl-muted hover:text-repixl-text-light'
                    }`}
                  >
                    In-App Card
                  </button>
                </div>

                <button
                  onClick={() => setPreviewEvent(null)}
                  className="rounded-lg p-1.5 text-repixl-muted hover:bg-white/5 hover:text-repixl-text-light transition"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 bg-repixl-bg/70 max-h-[70vh] overflow-y-auto">
              {previewChannel === 'EMAIL' ? (
                /* Email Preview Simulation */
                <div className="rounded-xl border border-repixl-muted/20 bg-repixl-charcoal overflow-hidden shadow-lg">
                  {/* Email Chrome Header */}
                  <div className="border-b border-repixl-muted/10 bg-repixl-charcoal px-5 py-3 text-xs space-y-1">
                    <div className="flex items-center gap-2 text-repixl-muted">
                      <span className="font-mono text-[10px] uppercase w-14">From:</span>
                      <span className="text-repixl-text-light">RePXL Archive &lt;notifications@repxl.com&gt;</span>
                    </div>
                    <div className="flex items-center gap-2 text-repixl-muted">
                      <span className="font-mono text-[10px] uppercase w-14">To:</span>
                      <span className="text-repixl-text-light">Alex Rivera &lt;alex.rivera@example.com&gt;</span>
                    </div>
                    <div className="flex items-center gap-2 text-repixl-muted">
                      <span className="font-mono text-[10px] uppercase w-14">Subject:</span>
                      <span className="font-semibold text-repixl-text-light">{resolvedSubject}</span>
                    </div>
                  </div>

                  {/* Email Body Container */}
                  <div className="p-6 space-y-5 bg-gradient-to-b from-repixl-charcoal to-repixl-bg">
                    {/* Brand Banner */}
                    <div className="flex items-center justify-between border-b border-repixl-muted/10 pb-4">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-repixl-red px-2 py-0.5 text-xs font-black tracking-wider text-white">
                          RePXL
                        </span>
                        <span className="font-mono text-xs uppercase tracking-widest text-repixl-muted">
                          Vintage Archive
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-repixl-muted">
                        {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>

                    {/* Rendered Text */}
                    <div className="text-xs text-repixl-text-light/90 whitespace-pre-line leading-relaxed">
                      {resolvedBody}
                    </div>

                    {/* Email CTA Button */}
                    <div className="pt-2">
                      <div className="inline-block rounded-xl bg-repixl-red px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-red-700 transition cursor-pointer">
                        {previewEvent.includes('ORDER')
                          ? 'View Order Details'
                          : previewEvent.includes('RETURN')
                          ? 'Review Return Case'
                          : previewEvent.includes('PROMOTION')
                          ? 'Shop Vintage Cameras'
                          : 'Visit RePXL Storefront'}
                      </div>
                    </div>

                    {/* Email Footer */}
                    <div className="border-t border-repixl-muted/10 pt-4 text-[10px] text-repixl-muted leading-relaxed">
                      <p>
                        You are receiving this automated email regarding your RePXL account activity.
                      </p>
                      <p className="mt-1">
                        Need assistance? Contact our team at{' '}
                        <span className="text-repixl-text-light underline">support@repxl.com</span>.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* In-App Notification Center Simulation */
                <div className="max-w-md mx-auto rounded-xl border border-repixl-muted/30 bg-repixl-charcoal p-4 shadow-xl">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-repixl-red/10 p-2 text-repixl-red mt-0.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-repixl-text-light">
                          {resolvedSubject}
                        </span>
                        <span className="h-2 w-2 rounded-full bg-repixl-red" />
                      </div>

                      <p className="text-xs text-repixl-muted leading-relaxed line-clamp-3">
                        {resolvedBody}
                      </p>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-[10px] font-mono text-repixl-muted">
                          Just now
                        </span>
                        <span className="text-[10px] font-medium text-repixl-red hover:underline cursor-pointer">
                          View details →
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-repixl-muted/20 px-6 py-3 bg-repixl-charcoal">
              <span className="text-xs text-repixl-muted">
                Placeholders resolved using mock customer values.
              </span>
              <button
                onClick={() => setPreviewEvent(null)}
                className="rounded-xl border border-repixl-muted/20 px-4 py-1.5 text-xs text-repixl-text-light hover:bg-white/5 transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
