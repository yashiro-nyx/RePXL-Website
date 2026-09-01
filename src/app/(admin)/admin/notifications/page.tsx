'use client'

import { useEffect, useState } from 'react'

interface Template { event: string; subject: string; body: string; channel: string; isEnabled: boolean }

export default function NotificationTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Record<string, { subject: string; body: string; isEnabled: boolean }>>({})
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [submitting, setSubmitting] = useState<string | null>(null)

  const load = async () => {
    const res = await fetch('/api/admin/notifications', { credentials: 'include' })
    const body = await res.json()
    setTemplates(body.data ?? [])
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  const startEdit = (t: Template) => {
    setEditing(e => ({ ...e, [t.event]: { subject: t.subject, body: t.body, isEnabled: t.isEnabled } }))
  }

  const saveTemplate = async (event: string) => {
    const ed = editing[event]
    if (!ed) return
    setSubmitting(event)
    const res = await fetch(`/api/admin/notifications/${event}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: ed.subject, body: ed.body, isEnabled: ed.isEnabled }),
    })
    const body = await res.json()
    if (res.ok) {
      setMsg({ type: 'success', text: 'Template saved.' })
      setEditing(e => { const n = { ...e }; delete n[event]; return n })
      await load()
    } else {
      setMsg({ type: 'error', text: body.error || 'Save failed.' })
    }
    setSubmitting(null)
  }

  const iClass = 'w-full rounded-xl border border-repixl-muted/20 bg-repixl-bg px-4 py-2.5 text-sm text-repixl-text-light placeholder:text-repixl-muted focus:border-repixl-red/30 focus:outline-none'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-repixl-text-light">Notification Templates</h1>
        <p className="mt-0.5 text-sm text-repixl-muted">Configure automated notifications sent to customers.</p>
      </div>

      {msg && <div className={`rounded-xl border px-4 py-3 text-sm ${msg.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>{msg.text}</div>}

      {loading && <p className="text-sm text-repixl-muted">Loading templates…</p>}

      <div className="space-y-4">
        {templates.map((t) => {
          const ed = editing[t.event]
          return (
            <div key={t.event} className="rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-semibold text-repixl-text-light">{t.event.replace(/_/g, ' ')}</span>
                  <span className="font-mono text-xs text-repixl-muted">{t.channel}</span>
                  <span className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase ${t.isEnabled ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-repixl-muted/20 text-repixl-muted'}`}>
                    {t.isEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                {!ed && (
                  <button onClick={() => startEdit(t)} className="rounded-lg bg-repixl-red/5 px-2.5 py-1 text-xs font-medium text-repixl-red hover:bg-repixl-red/10">Edit</button>
                )}
              </div>

              {ed ? (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs text-repixl-muted">Subject (1–200 chars)</label>
                    <input type="text" value={ed.subject} maxLength={200}
                      onChange={(e) => setEditing(prev => ({ ...prev, [t.event]: { ...prev[t.event], subject: e.target.value } }))}
                      className={iClass} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-repixl-muted">Body (1–10,000 chars) — use {'{{orderNumber}}'}, {'{{customerName}}'}, {'{{status}}'} tokens</label>
                    <textarea rows={5} value={ed.body} maxLength={10000}
                      onChange={(e) => setEditing(prev => ({ ...prev, [t.event]: { ...prev[t.event], body: e.target.value } }))}
                      className={`${iClass} resize-y`} />
                    <p className="mt-1 text-right font-mono text-[9px] text-repixl-muted">{ed.body.length}/10000</p>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2.5">
                    <input type="checkbox" checked={ed.isEnabled}
                      onChange={(e) => setEditing(prev => ({ ...prev, [t.event]: { ...prev[t.event], isEnabled: e.target.checked } }))}
                      className="h-4 w-4 rounded border-repixl-muted/30 bg-repixl-bg text-repixl-red" />
                    <span className="text-sm text-repixl-text-light/80">Enabled</span>
                  </label>
                  <div className="flex gap-2">
                    <button onClick={() => saveTemplate(t.event)} disabled={submitting === t.event}
                      className="rounded-xl bg-repixl-red px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
                      {submitting === t.event ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => setEditing(e => { const n = { ...e }; delete n[t.event]; return n })}
                      className="rounded-xl border border-repixl-muted/20 px-4 py-2 text-sm text-repixl-muted hover:text-repixl-text-light">Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-medium text-repixl-text-light/70">Subject: {t.subject}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-repixl-muted">{t.body}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
