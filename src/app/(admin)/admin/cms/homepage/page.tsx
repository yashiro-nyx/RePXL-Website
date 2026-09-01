'use client'

import { useEffect, useState } from 'react'

interface Block { id: string; blockKey: string; content: string; displayOrder: number; isPublished: boolean }

export default function CmsHomepagePage() {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Record<string, { content: string; displayOrder: string }>>({})
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [publishing, setPublishing] = useState(false)

  const load = async () => {
    const res = await fetch('/api/admin/cms/homepage', { credentials: 'include' })
    const body = await res.json()
    setBlocks(body.data ?? [])
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  const startEdit = (b: Block) => {
    setEditing(e => ({ ...e, [b.id]: { content: b.content, displayOrder: String(b.displayOrder) } }))
  }

  const saveBlock = async (b: Block) => {
    const ed = editing[b.id]
    if (!ed) return
    const order = parseInt(ed.displayOrder, 10)
    if (!ed.content.trim()) { setMsg({ type: 'error', text: 'Content cannot be empty.' }); return }
    if (isNaN(order) || order < 1 || order > 999) { setMsg({ type: 'error', text: 'Display order must be 1–999.' }); return }
    const res = await fetch(`/api/admin/cms/homepage/${b.id}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: ed.content, displayOrder: order }),
    })
    const body = await res.json()
    if (res.ok) {
      setMsg({ type: 'success', text: 'Block saved.' })
      setEditing(e => { const n = { ...e }; delete n[b.id]; return n })
      await load()
    } else {
      setMsg({ type: 'error', text: body.error || 'Save failed.' })
    }
  }

  const publish = async () => {
    setPublishing(true)
    const res = await fetch('/api/admin/cms/homepage/publish', { method: 'POST', credentials: 'include' })
    const body = await res.json()
    if (res.ok) { setMsg({ type: 'success', text: 'Homepage content published.' }); await load() }
    else setMsg({ type: 'error', text: body.error || 'Publish failed.' })
    setPublishing(false)
  }

  const iClass = 'w-full rounded-xl border border-repixl-muted/20 bg-repixl-bg px-4 py-2.5 text-sm text-repixl-text-light placeholder:text-repixl-muted focus:border-repixl-red/30 focus:outline-none'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-repixl-text-light">Homepage Content</h1>
          <p className="mt-0.5 text-sm text-repixl-muted">Edit and publish homepage content blocks.</p>
        </div>
        <button onClick={publish} disabled={publishing} className="rounded-xl bg-repixl-red px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
          {publishing ? 'Publishing…' : 'Publish All'}
        </button>
      </div>

      {msg && <div className={`rounded-xl border px-4 py-3 text-sm ${msg.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>{msg.text}</div>}

      {loading && <p className="text-sm text-repixl-muted">Loading…</p>}

      <div className="space-y-4">
        {blocks.map((b) => {
          const ed = editing[b.id]
          return (
            <div key={b.id} className="rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-semibold text-repixl-red">{b.blockKey}</span>
                  <span className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase ${b.isPublished ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-repixl-muted/20 text-repixl-muted'}`}>
                    {b.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>
                {!ed && (
                  <button onClick={() => startEdit(b)} className="rounded-lg bg-repixl-red/5 px-2.5 py-1 text-xs font-medium text-repixl-red hover:bg-repixl-red/10">Edit</button>
                )}
              </div>

              {ed ? (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs text-repixl-muted">Content</label>
                    <textarea rows={4} value={ed.content} onChange={(e) => setEditing(prev => ({ ...prev, [b.id]: { ...prev[b.id], content: e.target.value } }))} className={`${iClass} resize-y`} />
                  </div>
                  <div className="w-32">
                    <label className="mb-1 block text-xs text-repixl-muted">Display Order (1–999)</label>
                    <input type="number" min={1} max={999} value={ed.displayOrder} onChange={(e) => setEditing(prev => ({ ...prev, [b.id]: { ...prev[b.id], displayOrder: e.target.value } }))} className={iClass} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => saveBlock(b)} className="rounded-xl bg-repixl-red px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Save</button>
                    <button onClick={() => setEditing(e => { const n = { ...e }; delete n[b.id]; return n })} className="rounded-xl border border-repixl-muted/20 px-4 py-2 text-sm text-repixl-muted hover:text-repixl-text-light">Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="font-mono text-[10px] text-repixl-muted/60 mb-1">Order: {b.displayOrder}</p>
                  <p className="text-sm text-repixl-text-light/70 line-clamp-3">{b.content}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
