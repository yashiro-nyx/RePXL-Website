'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface StaticPage {
  id: string
  title: string
  slug: string
  body: string
  status: string
  updatedAt: string
}

type FormMode = 'none' | 'create' | 'edit'
const EMPTY_FORM = { title: '', slug: '', body: '', status: 'DRAFT' }

export default function CmsPagesPage() {
  const [pages, setPages] = useState<StaticPage[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<FormMode>('none')
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = async () => {
    try {
      const res = await fetch('/api/admin/cms/pages', { credentials: 'include' })
      const body = await res.json()
      setPages(body.data ?? [])
    } catch {
      setMsg({ type: 'error', text: 'Failed to load static pages.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setErrors({})
    setEditId(null)
    setMode('create')
    setMsg(null)
  }

  const openEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/cms/pages/${id}`, { credentials: 'include' })
      const body = await res.json()
      if (res.ok && body.data) {
        const p = body.data
        setForm({
          title: p.title,
          slug: p.slug,
          body: p.body,
          status: p.status,
        })
        setEditId(id)
        setErrors({})
        setMode('edit')
        setMsg(null)
      } else {
        setMsg({ type: 'error', text: body.error || 'Failed to fetch page.' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error fetching page details.' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMsg(null)
    setErrors({})

    const url = mode === 'edit' ? `/api/admin/cms/pages/${editId}` : '/api/admin/cms/pages'
    try {
      const res = await fetch(url, {
        method: mode === 'edit' ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          slug: form.slug.trim().toLowerCase(),
          body: form.body,
          status: form.status.toUpperCase(),
        }),
      })
      const body = await res.json()
      if (res.ok) {
        setMsg({
          type: 'success',
          text: mode === 'edit' ? 'Page updated successfully.' : 'Page created successfully.',
        })
        setMode('none')
        await load()
      } else {
        setMsg({ type: 'error', text: body.error || 'Submission failed.' })
        if (body.details && Array.isArray(body.details)) {
          const errs: Record<string, string> = {}
          body.details.forEach((d: string) => {
            if (d.includes('title')) errs.title = d
            else if (d.includes('slug')) errs.slug = d
            else if (d.includes('body')) errs.body = d
          })
          setErrors(errs)
        }
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error during save.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/cms/pages/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        setMsg({ type: 'success', text: 'Page deleted.' })
        setDeleteId(null)
        await load()
      } else {
        const body = await res.json()
        setMsg({ type: 'error', text: body.error || 'Delete failed.' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error deleting page.' })
    }
  }

  const iClass =
    'w-full rounded-xl border border-repixl-muted/20 bg-repixl-bg px-4 py-2.5 text-sm text-repixl-text-light placeholder:text-repixl-muted focus:border-repixl-red/30 focus:outline-none'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-repixl-text-light">Static Pages</h1>
          <p className="mt-0.5 text-sm text-repixl-muted">
            Manage About, FAQ, Privacy, Terms, and custom editorial content pages.
          </p>
        </div>
        {mode === 'none' && (
          <button
            onClick={openCreate}
            className="rounded-xl bg-repixl-red px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            + New Page
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

      {/* Form */}
      {(mode === 'create' || mode === 'edit') && (
        <div className="rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between border-b border-repixl-muted/10 pb-3">
            <h2 className="font-semibold text-repixl-text-light">
              {mode === 'create' ? 'Create Static Page' : 'Edit Static Page'}
            </h2>
            <span className="font-mono text-xs text-repixl-muted">
              {mode === 'edit' ? `ID: ${editId}` : 'New Page'}
            </span>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-repixl-muted">
                Title (1–200 characters)
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Terms of Service"
                className={iClass}
              />
              {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-repixl-muted">
                  URL Slug (lowercase letters, digits, and hyphens)
                </label>
                <div className="flex items-center">
                  <span className="rounded-l-xl border border-r-0 border-repixl-muted/20 bg-repixl-charcoal px-3 py-2.5 font-mono text-xs text-repixl-muted">
                    /p/
                  </span>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                      }))
                    }
                    placeholder="terms-of-service"
                    className={`${iClass} rounded-l-none font-mono text-xs`}
                  />
                </div>
                {errors.slug && <p className="mt-1 text-xs text-red-400">{errors.slug}</p>}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-repixl-muted">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className={iClass}
                >
                  <option value="DRAFT">Draft (Admin Only)</option>
                  <option value="PUBLISHED">Published (Public)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-repixl-muted">
                Body Content (HTML or Markdown, 1–100,000 characters)
              </label>
              <textarea
                rows={10}
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                className={`${iClass} resize-y font-mono text-xs leading-relaxed`}
                placeholder="Write page content here in Markdown or HTML…"
              />
              {errors.body && <p className="mt-1 text-xs text-red-400">{errors.body}</p>}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-repixl-red px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {submitting ? 'Saving…' : mode === 'edit' ? 'Update Page' : 'Create Page'}
              </button>
              <button
                type="button"
                onClick={() => setMode('none')}
                className="rounded-xl border border-repixl-muted/20 px-5 py-2.5 text-sm text-repixl-muted hover:text-repixl-text-light"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-repixl-muted/10 bg-repixl-bg/50">
            <tr>
              {['Title', 'Public URL', 'Status', 'Updated', 'Actions'].map((h) => (
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
                <td colSpan={5} className="px-5 py-12 text-center text-sm text-repixl-muted">
                  Loading static pages…
                </td>
              </tr>
            )}
            {!loading && pages.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-14 text-center text-sm text-repixl-muted">
                  No content pages yet. Click &quot;+ New Page&quot; above to create one.
                </td>
              </tr>
            )}
            {pages.map((p) => {
              const isPublished = p.status.toUpperCase() === 'PUBLISHED'
              return (
                <tr key={p.id} className="transition-colors hover:bg-repixl-bg/40">
                  <td className="px-5 py-3.5 font-medium text-repixl-text-light">{p.title}</td>
                  <td className="px-5 py-3.5 font-mono text-xs">
                    <Link
                      href={`/p/${p.slug}`}
                      target="_blank"
                      className="text-repixl-rose hover:underline"
                    >
                      /p/{p.slug}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
                        isPublished
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : 'border-repixl-muted/20 bg-repixl-muted/10 text-repixl-muted'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-repixl-muted">
                    {new Date(p.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(p.id)}
                        className="rounded-lg bg-repixl-red/10 px-2.5 py-1 text-xs font-medium text-repixl-red hover:bg-repixl-red/20"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteId(p.id)}
                        className="rounded-lg bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-80 rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-6 shadow-2xl">
            <p className="text-center font-semibold text-repixl-text-light">Delete this page?</p>
            <p className="mt-1 text-center text-xs text-repixl-muted">
              This page will be permanently removed.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 rounded-xl border border-repixl-muted/20 px-4 py-2 text-sm text-repixl-muted hover:text-white"
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
