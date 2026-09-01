'use client'

import { useEffect, useState } from 'react'

interface Banner { id: string; title: string; placement: string; isActive: boolean; startDate?: string | null; endDate?: string | null }

const PLACEMENTS = ['HOMEPAGE_HERO', 'PROMO_STRIP', 'SIDEBAR']
const EMPTY = { title: '', imageUrl: '', placement: 'HOMEPAGE_HERO', linkTarget: '', isActive: true, startDate: '', endDate: '' }
type FormMode = 'none' | 'create' | 'edit'

export default function CmsBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<FormMode>('none')
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = async () => {
    const res = await fetch('/api/admin/cms/banners', { credentials: 'include' })
    const body = await res.json()
    setBanners(body.data ?? [])
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  const openCreate = () => { setForm(EMPTY); setErrors({}); setEditId(null); setMode('create'); setMsg(null) }
  const openEdit = async (id: string) => {
    const res = await fetch(`/api/admin/cms/banners/${id}`, { credentials: 'include' })
    const body = await res.json()
    if (res.ok && body.data) {
      const b = body.data
      setForm({ title: b.title, imageUrl: b.imageUrl, placement: b.placement, linkTarget: b.linkTarget, isActive: b.isActive, startDate: b.startDate?.slice(0, 10) ?? '', endDate: b.endDate?.slice(0, 10) ?? '' })
      setEditId(id); setErrors({}); setMode('edit'); setMsg(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true); setMsg(null); setErrors({})
    const payload = { ...form, startDate: form.startDate || null, endDate: form.endDate || null }
    const url = mode === 'edit' ? `/api/admin/cms/banners/${editId}` : '/api/admin/cms/banners'
    const res = await fetch(url, {
      method: mode === 'edit' ? 'PATCH' : 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const body = await res.json()
    if (res.ok) { setMsg({ type: 'success', text: mode === 'edit' ? 'Banner updated.' : 'Banner created.' }); setMode('none'); await load() }
    else { setMsg({ type: 'error', text: body.error || 'Submission failed.' }) }
    setSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/cms/banners/${id}`, { method: 'DELETE', credentials: 'include' })
    if (res.ok) { setMsg({ type: 'success', text: 'Banner deleted.' }); setDeleteId(null); await load() }
    else setMsg({ type: 'error', text: 'Delete failed.' })
  }

  const iClass = 'w-full rounded-xl border border-repixl-muted/20 bg-repixl-bg px-4 py-2.5 text-sm text-repixl-text-light placeholder:text-repixl-muted focus:border-repixl-red/30 focus:outline-none'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-repixl-text-light">Banners</h1>
          <p className="mt-0.5 text-sm text-repixl-muted">Manage promotional banners and their placements.</p>
        </div>
        {mode === 'none' && <button onClick={openCreate} className="rounded-xl bg-repixl-red px-4 py-2 text-sm font-medium text-white hover:bg-red-700">+ New Banner</button>}
      </div>

      {msg && <div className={`rounded-xl border px-4 py-3 text-sm ${msg.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>{msg.text}</div>}

      {(mode === 'create' || mode === 'edit') && (
        <div className="rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-6">
          <h2 className="mb-4 font-semibold text-repixl-text-light">{mode === 'create' ? 'Create Banner' : 'Edit Banner'}</h2>
          <form onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-repixl-muted">Title (1–120 chars)</label>
              <input type="text" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} className={iClass} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-repixl-muted">Image URL</label>
              <input type="url" value={form.imageUrl} onChange={(e) => setForm(f => ({ ...f, imageUrl: e.target.value }))} className={iClass} placeholder="https://…" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-repixl-muted">Placement</label>
              <select value={form.placement} onChange={(e) => setForm(f => ({ ...f, placement: e.target.value }))} className={iClass}>
                {PLACEMENTS.map((p) => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-repixl-muted">Link Target (URL)</label>
              <input type="url" value={form.linkTarget} onChange={(e) => setForm(f => ({ ...f, linkTarget: e.target.value }))} className={iClass} placeholder="https://…" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-repixl-muted">Start Date (optional)</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm(f => ({ ...f, startDate: e.target.value }))} className={`${iClass} [color-scheme:dark]`} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-repixl-muted">End Date (optional)</label>
              <input type="date" value={form.endDate} onChange={(e) => setForm(f => ({ ...f, endDate: e.target.value }))} className={`${iClass} [color-scheme:dark]`} />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="banner-active" checked={form.isActive} onChange={(e) => setForm(f => ({ ...f, isActive: e.target.checked }))} className="h-4 w-4 rounded border-repixl-muted/30 bg-repixl-bg text-repixl-red" />
              <label htmlFor="banner-active" className="text-sm text-repixl-text-light/80">Active</label>
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={submitting} className="rounded-xl bg-repixl-red px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">{submitting ? 'Saving…' : mode === 'edit' ? 'Update' : 'Create'}</button>
              <button type="button" onClick={() => setMode('none')} className="rounded-xl border border-repixl-muted/20 px-5 py-2.5 text-sm text-repixl-muted hover:text-repixl-text-light">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-repixl-muted/10 bg-repixl-bg/50">
            <tr>{['Title', 'Placement', 'Status', 'Schedule', 'Actions'].map((h) => <th key={h} className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-repixl-muted">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-repixl-muted/10">
            {loading && <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-repixl-muted">Loading…</td></tr>}
            {!loading && banners.length === 0 && <tr><td colSpan={5} className="px-5 py-14 text-center text-sm text-repixl-muted">No banners yet.</td></tr>}
            {banners.map((b) => (
              <tr key={b.id} className="transition-colors hover:bg-repixl-bg/40">
                <td className="px-5 py-3.5 font-medium text-repixl-text-light">{b.title}</td>
                <td className="px-5 py-3.5 font-mono text-xs text-repixl-muted">{b.placement}</td>
                <td className="px-5 py-3.5">
                  <span className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase ${b.isActive ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-repixl-muted/20 bg-repixl-muted/10 text-repixl-muted'}`}>
                    {b.isActive ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="px-5 py-3.5 font-mono text-xs text-repixl-muted">
                  {b.startDate && b.endDate ? `${new Date(b.startDate).toLocaleDateString()} – ${new Date(b.endDate).toLocaleDateString()}` : '—'}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(b.id)} className="rounded-lg bg-repixl-red/5 px-2.5 py-1 text-xs font-medium text-repixl-red hover:bg-repixl-red/10">Edit</button>
                    <button onClick={() => setDeleteId(b.id)} className="rounded-lg bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-80 rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-6 shadow-2xl">
            <p className="text-center font-semibold text-repixl-text-light">Delete this banner?</p>
            <div className="mt-4 flex gap-3">
              <button onClick={() => handleDelete(deleteId)} className="flex-1 rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white">Delete</button>
              <button onClick={() => setDeleteId(null)} className="flex-1 rounded-xl border border-repixl-muted/20 px-4 py-2 text-sm text-repixl-muted">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
