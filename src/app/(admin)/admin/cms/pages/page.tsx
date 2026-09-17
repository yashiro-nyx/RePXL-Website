'use client'

import { useEffect, useState, useMemo } from 'react'
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
const EMPTY_FORM = { title: '', slug: '', body: '', status: 'PUBLISHED' }

const CORE_STOREFRONT_PAGES: Record<string, { label: string; customerPath: string; description: string }> = {
  terms: {
    label: 'Terms of Service',
    customerPath: '/terms',
    description: 'Customer marketplace terms, orders & cancellation policies',
  },
  privacy: {
    label: 'Privacy Policy',
    customerPath: '/privacy',
    description: 'Data collection, cookies, security & user rights policy',
  },
  'shipping-returns': {
    label: 'Shipping & Returns',
    customerPath: '/shipping-returns',
    description: 'Domestic dispatch, packaging standards, return window & refunds',
  },
  'condition-grading': {
    label: 'Condition Grading',
    customerPath: '/condition-grading',
    description: 'Standardized 4-tier grading standards (Mint to Fair) & guarantee',
  },
  about: {
    label: 'About RePXL',
    customerPath: '/about',
    description: 'Story, grading philosophy, milestones & small collector-run team',
  },
  faq: {
    label: 'Frequently Asked Questions',
    customerPath: '/faq',
    description: 'Customer support answers across grading, shipping & selling',
  },
  contact: {
    label: 'Contact & Support',
    customerPath: '/contact',
    description: 'Support email, response times, dispute priority & inquiry guide',
  },
}

export default function CmsPagesPage() {
  const [pages, setPages] = useState<StaticPage[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<FormMode>('none')
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor')
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'ALL' | 'CORE' | 'CUSTOM'>('ALL')
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
    setActiveTab('editor')
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
        setActiveTab('editor')
        setMsg(null)
      } else {
        setMsg({ type: 'error', text: body.error || 'Failed to fetch page.' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error fetching page details.' })
    }
  }

  const applyPreset = (slug: string) => {
    const core = CORE_STOREFRONT_PAGES[slug]
    if (core) {
      setForm((prev) => ({
        ...prev,
        slug,
        title: prev.title.trim() ? prev.title : core.label,
      }))
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

  const filteredPages = useMemo(() => {
    return pages.filter((p) => {
      const isCore = !!CORE_STOREFRONT_PAGES[p.slug]
      if (filterType === 'CORE' && !isCore) return false
      if (filterType === 'CUSTOM' && isCore) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)
    })
  }, [pages, filterType, search])

  const iClass =
    'w-full rounded-xl border border-repixl-muted/20 bg-repixl-bg px-4 py-2.5 text-sm text-repixl-text-light placeholder:text-repixl-muted focus:border-repixl-red/30 focus:outline-none'

  const renderSimpleMarkdown = (text: string) => {
    return (
      <div className="space-y-3 font-sans text-xs text-repixl-text-light/85 leading-relaxed">
        {text.split('\n').map((line, i) => {
          const trimmed = line.trim()
          if (trimmed.startsWith('### ')) {
            return (
              <h3 key={i} className="pt-3 font-display text-sm font-semibold text-repixl-text-light">
                {trimmed.slice(4)}
              </h3>
            )
          }
          if (trimmed.startsWith('## ')) {
            return (
              <h2 key={i} className="pt-4 border-b border-repixl-muted/15 pb-1 font-display text-base font-bold text-repixl-text-light">
                {trimmed.slice(3)}
              </h2>
            )
          }
          if (trimmed.startsWith('- ')) {
            return (
              <li key={i} className="ml-4 list-disc text-repixl-text-light/75">
                <span dangerouslySetInnerHTML={{ __html: formatBold(trimmed.slice(2)) }} />
              </li>
            )
          }
          if (trimmed === '') return <div key={i} className="h-1" />
          return (
            <p key={i} className="text-repixl-text-light/75">
              <span dangerouslySetInnerHTML={{ __html: formatBold(trimmed) }} />
            </p>
          )
        })}
      </div>
    )
  }

  const formatBold = (str: string) => {
    return str.replace(/\*\*(.+?)\*\*/g, '<strong class="text-repixl-text-light font-semibold">$1</strong>')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-repixl-text-light">Static Pages</h1>
          <p className="mt-0.5 text-sm text-repixl-muted">
            Manage storefront pages including Terms, Privacy, Shipping, FAQ, About, Condition Grading, and custom pages.
          </p>
        </div>
        {mode === 'none' && (
          <button
            onClick={openCreate}
            className="rounded-xl bg-repixl-red px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
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
            <div>
              <h2 className="font-semibold text-repixl-text-light">
                {mode === 'create' ? 'Create Static Page' : 'Edit Static Page'}
              </h2>
              {CORE_STOREFRONT_PAGES[form.slug] && (
                <p className="text-xs text-repixl-red font-medium mt-0.5">
                  ★ Editing Core Storefront Page: {CORE_STOREFRONT_PAGES[form.slug].customerPath}
                </p>
              )}
            </div>
            <span className="font-mono text-xs text-repixl-muted">
              {mode === 'edit' ? `ID: ${editId}` : 'New Page'}
            </span>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Presets row when creating */}
            {mode === 'create' && (
              <div className="rounded-xl border border-repixl-muted/15 bg-repixl-bg/50 p-3">
                <p className="text-[11px] font-medium text-repixl-muted mb-2">
                  Quick Storefront Presets (click to autofill core page):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(CORE_STOREFRONT_PAGES).map(([s, info]) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => applyPreset(s)}
                      className={`rounded-lg border px-2.5 py-1 font-mono text-[10px] transition-colors ${
                        form.slug === s
                          ? 'border-repixl-red bg-repixl-red/10 text-repixl-red'
                          : 'border-repixl-muted/20 bg-repixl-bg text-repixl-muted hover:text-repixl-text-light'
                      }`}
                    >
                      {info.label} ({s})
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                    /
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
                {CORE_STOREFRONT_PAGES[form.slug] && (
                  <p className="mt-1 font-mono text-[10px] text-emerald-400">
                    Matches storefront route: {CORE_STOREFRONT_PAGES[form.slug].customerPath}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-repixl-muted">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className={iClass}
                >
                  <option value="PUBLISHED">Published (Live on Storefront)</option>
                  <option value="DRAFT">Draft (Admin Only)</option>
                </select>
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium text-repixl-muted">
                  Body Content (Markdown & HTML supported)
                </label>
                <div className="flex rounded-lg border border-repixl-muted/20 p-0.5 bg-repixl-bg">
                  <button
                    type="button"
                    onClick={() => setActiveTab('editor')}
                    className={`rounded px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                      activeTab === 'editor'
                        ? 'bg-repixl-red text-white'
                        : 'text-repixl-muted hover:text-repixl-text-light'
                    }`}
                  >
                    Markdown
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className={`rounded px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                      activeTab === 'preview'
                        ? 'bg-repixl-red text-white'
                        : 'text-repixl-muted hover:text-repixl-text-light'
                    }`}
                  >
                    Preview
                  </button>
                </div>
              </div>

              {activeTab === 'editor' ? (
                <textarea
                  rows={12}
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  className={`${iClass} resize-y font-mono text-xs leading-relaxed`}
                  placeholder="Write page content in Markdown (## Headings, - Lists, **Bold**)..."
                />
              ) : (
                <div className="rounded-xl border border-repixl-muted/20 bg-repixl-bg/70 p-5 max-h-[350px] overflow-y-auto">
                  {form.body.trim() ? (
                    renderSimpleMarkdown(form.body)
                  ) : (
                    <p className="text-xs text-repixl-muted italic">No content entered yet.</p>
                  )}
                </div>
              )}
              {errors.body && <p className="mt-1 text-xs text-red-400">{errors.body}</p>}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-repixl-red px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {submitting ? 'Saving…' : mode === 'edit' ? 'Update Page' : 'Create Page'}
              </button>
              <button
                type="button"
                onClick={() => setMode('none')}
                className="rounded-xl border border-repixl-muted/20 px-5 py-2.5 text-sm text-repixl-muted hover:text-repixl-text-light transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 rounded-xl border border-repixl-muted/20 bg-repixl-charcoal p-1">
          {(['ALL', 'CORE', 'CUSTOM'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`rounded-lg px-3 py-1.5 font-mono text-xs transition-colors ${
                filterType === type
                  ? 'bg-repixl-red text-white'
                  : 'text-repixl-muted hover:text-repixl-text-light'
              }`}
            >
              {type === 'ALL' ? 'All Pages' : type === 'CORE' ? 'Storefront Core' : 'Custom Pages'}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search pages by title or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-repixl-muted/20 bg-repixl-charcoal px-3 py-1.5 text-xs text-repixl-text-light placeholder:text-repixl-muted focus:border-repixl-red/30 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-repixl-muted/10 bg-repixl-bg/50">
            <tr>
              {['Page', 'Type', 'Public Storefront URL', 'Status', 'Updated', 'Actions'].map((h) => (
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
                  Loading static pages…
                </td>
              </tr>
            )}
            {!loading && filteredPages.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-14 text-center text-sm text-repixl-muted">
                  {search || filterType !== 'ALL'
                    ? 'No static pages match your filter.'
                    : 'No content pages yet. Click "+ New Page" above to create one.'}
                </td>
              </tr>
            )}
            {filteredPages.map((p) => {
              const isPublished = p.status.toUpperCase() === 'PUBLISHED'
              const coreInfo = CORE_STOREFRONT_PAGES[p.slug]
              const publicUrl = coreInfo ? coreInfo.customerPath : `/p/${p.slug}`

              return (
                <tr key={p.id} className="transition-colors hover:bg-repixl-bg/40">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-repixl-text-light">{p.title}</p>
                    <p className="font-mono text-[10px] text-repixl-muted">slug: /{p.slug}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    {coreInfo ? (
                      <span className="inline-flex items-center rounded-md border border-repixl-red/30 bg-repixl-red/10 px-2 py-0.5 font-mono text-[10px] text-repixl-red">
                        Core Page
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md border border-repixl-muted/20 bg-repixl-muted/10 px-2 py-0.5 font-mono text-[10px] text-repixl-muted">
                        Custom
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs">
                    <Link
                      href={publicUrl}
                      target="_blank"
                      className="text-repixl-rose hover:underline"
                    >
                      {publicUrl}
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
                        className="rounded-lg bg-repixl-red/10 px-2.5 py-1 text-xs font-medium text-repixl-red hover:bg-repixl-red/20 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteId(p.id)}
                        className="rounded-lg bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
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
          <div className="w-88 rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-6 shadow-2xl">
            <p className="text-center font-semibold text-repixl-text-light">Delete this page?</p>
            <p className="mt-1.5 text-center text-xs text-repixl-muted leading-relaxed">
              This page will be removed from the database. If this is a core storefront page, the customer view will revert to standard static fallbacks.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 rounded-xl border border-repixl-muted/20 px-4 py-2 text-sm text-repixl-muted hover:text-white transition-colors"
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
