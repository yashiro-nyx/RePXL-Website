'use client'

import { useEffect, useState } from 'react'

interface Banner {
  id: string
  title: string
  imageRef: string
  placement: string
  linkTarget: string
  isActive: boolean
  startDate?: string | null
  endDate?: string | null
}

const PLACEMENTS = [
  { value: 'HOMEPAGE_HERO', label: 'Homepage Hero Banner (Top of Home)', description: 'Main hero camera & headline on customer homepage' },
  { value: 'HOMEPAGE_STRIP', label: 'Homepage Deals Banner (Strip)', description: 'Wide mountain atmosphere banner with featured deals camera' },
  { value: 'SIDEBAR', label: 'Curated Promo / Staff Pick (Promo Duo)', description: 'Curated promotional camera card on homepage' },
]

const IMAGE_PRESETS = [
  { label: 'Hero Camera Focus', url: '/images/camherosec.png' },
  { label: 'Deals Phone Frame (Kodak)', url: '/images/dealbanner.png' },
  { label: 'Top Deals 3-Camera Cluster', url: '/images/banner1.png' },
  { label: 'Staff Pick (Sony on Pedestal)', url: '/images/banner2.png' },
  { label: 'Editorial Deals (Dark)', url: '/images/editorial-2.svg' },
  { label: 'Editorial PowerShot (Warm)', url: '/images/editorial-1.svg' },
  { label: 'Canon PowerShot A520', url: '/images/product-canon-a520.svg' },
  { label: 'Nikon Coolpix 3200', url: '/images/product-nikon-coolpix.svg' },
  { label: 'Sony Cyber-shot W800', url: '/images/product-sony-w800.svg' },
]

const LINK_PRESETS = [
  { label: 'Shop Cameras', url: 'https://repxl.com/products' },
  { label: 'Weekly Deals', url: 'https://repxl.com/products?sort=deals' },
  { label: 'Sony Brand', url: 'https://repxl.com/products?brand=sony' },
  { label: 'Canon Brand', url: 'https://repxl.com/products?brand=canon' },
  { label: 'About RePXL', url: 'https://repxl.com/about' },
  { label: 'Shipping & Returns', url: 'https://repxl.com/shipping-returns' },
]

const EMPTY = {
  title: '',
  imageRef: '/images/dealbanner.png',
  placement: 'HOMEPAGE_STRIP',
  linkTarget: 'https://repxl.com/products',
  isActive: true,
  startDate: '',
  endDate: '',
}

type FormMode = 'none' | 'create' | 'edit'

export default function CmsBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<FormMode>('none')
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = async () => {
    try {
      const res = await fetch('/api/admin/cms/banners', { credentials: 'include' })
      const body = await res.json()
      setBanners(body.data ?? [])
    } catch {
      setMsg({ type: 'error', text: 'Failed to load banners.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const openCreate = () => {
    setForm(EMPTY)
    setEditId(null)
    setMode('create')
    setMsg(null)
  }

  const openEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/cms/banners/${id}`, { credentials: 'include' })
      const body = await res.json()
      if (res.ok && body.data) {
        const b = body.data
        setForm({
          title: b.title,
          imageRef: b.imageRef,
          placement: b.placement,
          linkTarget: b.linkTarget,
          isActive: b.isActive,
          startDate: b.startDate ? b.startDate.slice(0, 10) : '',
          endDate: b.endDate ? b.endDate.slice(0, 10) : '',
        })
        setEditId(id)
        setMode('edit')
        setMsg(null)
      } else {
        setMsg({ type: 'error', text: body.error || 'Failed to load banner details.' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error while fetching banner.' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMsg(null)

    if (!form.title.trim()) {
      setMsg({ type: 'error', text: 'Banner title is required.' })
      setSubmitting(false)
      return
    }

    if (!form.imageRef.trim()) {
      setMsg({ type: 'error', text: 'Image URL / Reference is required.' })
      setSubmitting(false)
      return
    }

    const payload = {
      title: form.title.trim(),
      imageRef: form.imageRef.trim(),
      placement: form.placement,
      linkTarget: form.linkTarget.trim(),
      isActive: form.isActive,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
    }

    const url = mode === 'edit' ? `/api/admin/cms/banners/${editId}` : '/api/admin/cms/banners'
    try {
      const res = await fetch(url, {
        method: mode === 'edit' ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json()
      if (res.ok) {
        setMsg({
          type: 'success',
          text: mode === 'edit' ? 'Banner updated successfully.' : 'Banner created successfully.',
        })
        setMode('none')
        await load()
      } else {
        setMsg({ type: 'error', text: body.error || 'Submission failed.' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Failed to submit banner.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/cms/banners/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        setMsg({ type: 'success', text: 'Banner deleted.' })
        setDeleteId(null)
        await load()
      } else {
        const body = await res.json()
        setMsg({ type: 'error', text: body.error || 'Delete failed.' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error deleting banner.' })
    }
  }

  const iClass =
    'w-full rounded-xl border border-repixl-muted/20 bg-repixl-bg px-4 py-2.5 text-sm text-repixl-text-light placeholder:text-repixl-muted focus:border-repixl-red/30 focus:outline-none'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-repixl-text-light">Banners</h1>
          <p className="mt-0.5 text-sm text-repixl-muted">
            Manage promotional banners for homepage deals and campaign placements.
          </p>
        </div>
        {mode === 'none' && (
          <button
            onClick={openCreate}
            className="rounded-xl bg-repixl-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            + New Banner
          </button>
        )}
      </div>

      {msg && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            msg.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-red-500/30 bg-red-500/10 text-red-400'
          }`}
        >
          {msg.text}
        </div>
      )}

      {(mode === 'create' || mode === 'edit') && (
        <div className="rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between border-b border-repixl-muted/10 pb-3">
            <h2 className="font-semibold text-repixl-text-light">
              {mode === 'create' ? 'Create Banner' : 'Edit Banner'}
            </h2>
            <span className="font-mono text-xs text-repixl-muted">
              {mode === 'create' ? 'New Placement' : `ID: ${editId}`}
            </span>
          </div>

          <form onSubmit={handleSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-repixl-muted">
                Title (1–120 characters)
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Vintage Canon PowerShots — 30% Off This Week"
                className={iClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-repixl-muted">
                Banner Image URL / Asset Path
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.imageRef}
                  onChange={(e) => setForm((f) => ({ ...f, imageRef: e.target.value }))}
                  className={iClass}
                  placeholder="/images/editorial-2.svg or https://…"
                />
              </div>
              {/* Presets */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-repixl-muted">Presets:</span>
                {IMAGE_PRESETS.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, imageRef: preset.url }))}
                    className="rounded-lg border border-repixl-muted/20 bg-repixl-bg px-2 py-0.5 text-[10px] text-repixl-text-light/80 hover:border-repixl-red/40 hover:text-white"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Preview Box */}
            <div className="sm:col-span-2 rounded-xl border border-repixl-muted/15 bg-repixl-bg/60 p-4">
              <p className="mb-2 text-xs font-medium text-repixl-muted">Image Preview</p>
              <div className="relative flex h-36 w-full items-center justify-center overflow-hidden rounded-lg border border-repixl-muted/10 bg-repixl-charcoal">
                {form.imageRef ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={form.imageRef}
                    alt="Preview"
                    className="h-full w-full object-cover opacity-85"
                    onError={(e) => {
                      ;(e.target as HTMLElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <span className="text-xs text-repixl-muted">No image selected</span>
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-4 pointer-events-none">
                  <p className="font-display text-base font-bold text-white">
                    {form.title || 'Banner Title Preview'}
                  </p>
                  <p className="font-mono text-[10px] text-white/70">
                    {PLACEMENTS.find((p) => p.value === form.placement)?.label}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-repixl-muted">Placement</label>
              <select
                value={form.placement}
                onChange={(e) => setForm((f) => ({ ...f, placement: e.target.value }))}
                className={iClass}
              >
                {PLACEMENTS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-repixl-muted">
                Link Target (Internal path or URL)
              </label>
              <input
                type="text"
                value={form.linkTarget}
                onChange={(e) => setForm((f) => ({ ...f, linkTarget: e.target.value }))}
                className={iClass}
                placeholder="https://repxl.com/products or /products"
              />
              <div className="mt-1 flex flex-wrap gap-1.5">
                {LINK_PRESETS.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, linkTarget: preset.url }))}
                    className="rounded border border-repixl-muted/20 bg-repixl-bg px-1.5 py-0.5 text-[10px] text-repixl-muted hover:text-white"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-repixl-muted">
                Schedule Start (optional)
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className={`${iClass} [color-scheme:dark]`}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-repixl-muted">
                Schedule End (optional)
              </label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                className={`${iClass} [color-scheme:dark]`}
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-3">
              <input
                type="checkbox"
                id="banner-active"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="h-4 w-4 rounded border-repixl-muted/30 bg-repixl-bg text-repixl-red focus:ring-0"
              />
              <label htmlFor="banner-active" className="text-sm font-medium text-repixl-text-light/90">
                Active (live on storefront when scheduled)
              </label>
            </div>

            <div className="sm:col-span-2 flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-repixl-red px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {submitting ? 'Saving…' : mode === 'edit' ? 'Update Banner' : 'Create Banner'}
              </button>
              <button
                type="button"
                onClick={() => setMode('none')}
                className="rounded-xl border border-repixl-muted/20 px-5 py-2.5 text-sm text-repixl-muted transition-colors hover:text-repixl-text-light"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Banners List */}
      <div className="overflow-x-auto rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-repixl-muted/10 bg-repixl-bg/50">
            <tr>
              {['Banner', 'Placement', 'Status', 'Schedule', 'Target', 'Actions'].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-repixl-muted"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-repixl-muted/10">
            {loading && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm text-repixl-muted">
                  Loading banners…
                </td>
              </tr>
            )}
            {!loading && banners.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-14 text-center text-sm text-repixl-muted">
                  No banners yet. Click &quot;+ New Banner&quot; above to create one.
                </td>
              </tr>
            )}
            {banners.map((b) => (
              <tr key={b.id} className="transition-colors hover:bg-repixl-bg/40">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-16 flex-shrink-0 overflow-hidden rounded border border-repixl-muted/20 bg-repixl-bg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={b.imageRef}
                        alt={b.title}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          ;(e.target as HTMLElement).style.display = 'none'
                        }}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-repixl-text-light line-clamp-1">{b.title}</p>
                      <p className="font-mono text-[10px] text-repixl-muted line-clamp-1">
                        {b.imageRef}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center rounded-md border border-repixl-muted/20 bg-repixl-bg px-2 py-0.5 font-mono text-[11px] text-repixl-text-light/90">
                    {b.placement === 'HOMEPAGE_HERO'
                      ? 'Hero Banner'
                      : b.placement === 'HOMEPAGE_STRIP'
                        ? 'Deals Strip'
                        : b.placement === 'SIDEBAR'
                          ? 'Promo Duo Pick'
                          : b.placement.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
                      b.isActive
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'border-repixl-muted/20 bg-repixl-muted/10 text-repixl-muted'
                    }`}
                  >
                    {b.isActive ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="px-5 py-3.5 font-mono text-xs text-repixl-muted">
                  {b.startDate && b.endDate
                    ? `${new Date(b.startDate).toLocaleDateString()} – ${new Date(
                        b.endDate
                      ).toLocaleDateString()}`
                    : b.startDate
                      ? `From ${new Date(b.startDate).toLocaleDateString()}`
                      : b.endDate
                        ? `Until ${new Date(b.endDate).toLocaleDateString()}`
                        : 'Always'}
                </td>
                <td className="px-5 py-3.5 font-mono text-xs text-repixl-muted max-w-[140px] truncate">
                  <a
                    href={b.linkTarget}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-repixl-text-light hover:underline"
                  >
                    {b.linkTarget.replace(/^https?:\/\/(www\.)?repxl\.com/, '')}
                  </a>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(b.id)}
                      className="rounded-lg bg-repixl-red/10 px-2.5 py-1 text-xs font-medium text-repixl-red transition-colors hover:bg-repixl-red/20"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteId(b.id)}
                      className="rounded-lg bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
                    >
                      Delete
                    </button>
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
            <p className="mt-1 text-center text-xs text-repixl-muted">
              This banner will be permanently removed from the storefront.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 rounded-xl border border-repixl-muted/20 px-4 py-2 text-sm text-repixl-muted transition-colors hover:text-repixl-text-light"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
