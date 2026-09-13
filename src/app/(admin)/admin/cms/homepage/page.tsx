'use client'

import { useEffect, useState } from 'react'

interface HomepageBlock {
  id: string
  type: string
  content: any
  displayOrder: number
  isPublished: boolean
  updatedAt?: string
}

const BLOCK_TYPES = [
  { value: 'editorial', label: 'Editorial Story Block' },
  { value: 'announcement', label: 'Announcement Banner' },
  { value: 'featured', label: 'Featured Product Highlight' },
  { value: 'brand_gallery', label: 'Brand Showcase' },
  { value: 'custom', label: 'Custom JSON / Text' },
]

const TEMPLATES: Record<string, string> = {
  editorial: JSON.stringify(
    {
      eyebrow: '— The digicam era',
      heading: 'Before filters, there was just light.',
      body: 'In the early 2000s, CCD sensors captured the world with an unapologetic warmth that modern smartphones cannot fake.',
      quoteAuthor: 'RePXL Archive, Issue 04',
    },
    null,
    2
  ),
  announcement: JSON.stringify(
    {
      title: 'Free Express Shipping',
      message: 'Orders over ₱5,000 qualify for complimentary insured courier dispatch.',
      badge: 'PROMO',
    },
    null,
    2
  ),
  featured: JSON.stringify(
    {
      title: 'Curator’s Choice',
      cameraSlug: 'canon-powershot-a520',
      tagline: 'Mint condition 2005 CCD legend',
    },
    null,
    2
  ),
  custom: '{\n  "title": "Welcome to RePXL"\n}',
}

export default function CmsHomepagePage() {
  const [blocks, setBlocks] = useState<HomepageBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ type: string; content: string; displayOrder: string; isPublished: boolean }>({
    type: 'editorial',
    content: '',
    displayOrder: '1',
    isPublished: false,
  })
  const [isCreating, setIsCreating] = useState(false)
  const [createForm, setCreateForm] = useState<{ type: string; content: string; displayOrder: string; isPublished: boolean }>({
    type: 'editorial',
    content: TEMPLATES.editorial,
    displayOrder: '10',
    isPublished: true,
  })
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    try {
      const res = await fetch('/api/admin/cms/homepage', { credentials: 'include' })
      const body = await res.json()
      setBlocks(body.data ?? [])
    } catch {
      setMsg({ type: 'error', text: 'Failed to load homepage blocks.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const startEdit = (b: HomepageBlock) => {
    setEditingId(b.id)
    setEditForm({
      type: b.type,
      content: typeof b.content === 'object' ? JSON.stringify(b.content, null, 2) : String(b.content),
      displayOrder: String(b.displayOrder),
      isPublished: b.isPublished,
    })
    setIsCreating(false)
    setMsg(null)
  }

  const saveEdit = async (id: string) => {
    setSubmitting(true)
    setMsg(null)
    const order = parseInt(editForm.displayOrder, 10)
    if (!editForm.content.trim()) {
      setMsg({ type: 'error', text: 'Content cannot be empty.' })
      setSubmitting(false)
      return
    }
    if (isNaN(order) || order < 1 || order > 999) {
      setMsg({ type: 'error', text: 'Display order must be 1–999.' })
      setSubmitting(false)
      return
    }

    let parsedContent: any = editForm.content.trim()
    try {
      parsedContent = JSON.parse(editForm.content)
    } catch {
      // Allow raw string as content if not valid JSON
    }

    try {
      const res = await fetch(`/api/admin/cms/homepage/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: editForm.type,
          content: parsedContent,
          displayOrder: order,
          isPublished: editForm.isPublished,
        }),
      })
      const body = await res.json()
      if (res.ok) {
        setMsg({ type: 'success', text: 'Content block updated.' })
        setEditingId(null)
        await load()
      } else {
        setMsg({ type: 'error', text: body.error || 'Failed to update block.' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error updating block.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMsg(null)

    const order = parseInt(createForm.displayOrder, 10)
    if (!createForm.content.trim()) {
      setMsg({ type: 'error', text: 'Content cannot be empty.' })
      setSubmitting(false)
      return
    }
    if (isNaN(order) || order < 1 || order > 999) {
      setMsg({ type: 'error', text: 'Display order must be 1–999.' })
      setSubmitting(false)
      return
    }

    let parsedContent: any = createForm.content.trim()
    try {
      parsedContent = JSON.parse(createForm.content)
    } catch {
      // String content
    }

    try {
      const res = await fetch('/api/admin/cms/homepage', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: createForm.type,
          content: parsedContent,
          displayOrder: order,
          isPublished: createForm.isPublished,
        }),
      })
      const body = await res.json()
      if (res.ok) {
        setMsg({ type: 'success', text: 'New content block created.' })
        setIsCreating(false)
        await load()
      } else {
        setMsg({ type: 'error', text: body.error || 'Failed to create block.' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error creating block.' })
    } finally {
      setSubmitting(false)
    }
  }

  const togglePublish = async (b: HomepageBlock) => {
    try {
      const res = await fetch(`/api/admin/cms/homepage/${b.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !b.isPublished }),
      })
      if (res.ok) {
        setMsg({
          type: 'success',
          text: `Block ${!b.isPublished ? 'published' : 'moved to draft'}.`,
        })
        await load()
      } else {
        const body = await res.json()
        setMsg({ type: 'error', text: body.error || 'Toggle failed.' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error toggling publish state.' })
    }
  }

  const publishAll = async () => {
    setPublishing(true)
    try {
      const res = await fetch('/api/admin/cms/homepage/publish', {
        method: 'POST',
        credentials: 'include',
      })
      const body = await res.json()
      if (res.ok) {
        setMsg({ type: 'success', text: 'All homepage content blocks published.' })
        await load()
      } else {
        setMsg({ type: 'error', text: body.error || 'Publish failed.' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error publishing blocks.' })
    } finally {
      setPublishing(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/cms/homepage/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        setMsg({ type: 'success', text: 'Block deleted.' })
        setDeleteId(null)
        await load()
      } else {
        const body = await res.json()
        setMsg({ type: 'error', text: body.error || 'Delete failed.' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error deleting block.' })
    }
  }

  const iClass =
    'w-full rounded-xl border border-repixl-muted/20 bg-repixl-bg px-4 py-2.5 text-sm text-repixl-text-light placeholder:text-repixl-muted focus:border-repixl-red/30 focus:outline-none'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-repixl-text-light">Homepage Content</h1>
          <p className="mt-0.5 text-sm text-repixl-muted">
            Manage editorial storytelling, announcement strips, and dynamic homepage content blocks.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isCreating && (
            <button
              onClick={() => {
                setIsCreating(true)
                setEditingId(null)
                setMsg(null)
              }}
              className="rounded-xl bg-repixl-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              + New Block
            </button>
          )}
          <button
            onClick={publishAll}
            disabled={publishing}
            className="rounded-xl border border-repixl-muted/25 bg-repixl-bg px-4 py-2 text-sm font-medium text-repixl-text-light hover:border-repixl-red/40 disabled:opacity-60"
          >
            {publishing ? 'Publishing…' : 'Publish All'}
          </button>
        </div>
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

      {/* New Block Form */}
      {isCreating && (
        <div className="rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between border-b border-repixl-muted/10 pb-3">
            <h2 className="font-semibold text-repixl-text-light">Create Content Block</h2>
            <button
              onClick={() => setIsCreating(false)}
              className="text-xs text-repixl-muted hover:text-white"
            >
              ✕ Close
            </button>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-repixl-muted">
                  Block Type / Identifier
                </label>
                <select
                  value={createForm.type}
                  onChange={(e) => {
                    const newType = e.target.value
                    setCreateForm((prev) => ({
                      ...prev,
                      type: newType,
                      content: TEMPLATES[newType] || prev.content,
                    }))
                  }}
                  className={iClass}
                >
                  {BLOCK_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-repixl-muted">
                  Display Order (1–999)
                </label>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={createForm.displayOrder}
                  onChange={(e) => setCreateForm((f) => ({ ...f, displayOrder: e.target.value }))}
                  className={iClass}
                />
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium text-repixl-muted">
                  Block Content (Structured JSON or Text)
                </label>
                <span className="text-[11px] text-repixl-muted/60">
                  Formatted for storefront rendering
                </span>
              </div>
              <textarea
                rows={6}
                value={createForm.content}
                onChange={(e) => setCreateForm((f) => ({ ...f, content: e.target.value }))}
                className={`${iClass} font-mono text-xs resize-y`}
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="create-publish"
                checked={createForm.isPublished}
                onChange={(e) => setCreateForm((f) => ({ ...f, isPublished: e.target.checked }))}
                className="h-4 w-4 rounded border-repixl-muted/30 bg-repixl-bg text-repixl-red focus:ring-0"
              />
              <label htmlFor="create-publish" className="text-sm font-medium text-repixl-text-light/90">
                Publish immediately (live on customer storefront)
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-repixl-red px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {submitting ? 'Creating…' : 'Create Block'}
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="rounded-xl border border-repixl-muted/20 px-5 py-2.5 text-sm text-repixl-muted transition-colors hover:text-repixl-text-light"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && <p className="text-sm text-repixl-muted">Loading homepage content blocks…</p>}

      {!loading && blocks.length === 0 && (
        <div className="rounded-2xl border border-repixl-muted/15 bg-repixl-charcoal p-12 text-center text-sm text-repixl-muted">
          No homepage content blocks yet. Click &quot;+ New Block&quot; to configure editorial or promotional sections.
        </div>
      )}

      {/* Blocks List */}
      <div className="space-y-4">
        {blocks.map((b) => {
          const isEditing = editingId === b.id

          return (
            <div
              key={b.id}
              className="rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-5 transition-shadow hover:border-repixl-muted/30"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-semibold text-repixl-red">
                    {b.type.toUpperCase()}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
                      b.isPublished
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'border-repixl-muted/20 bg-repixl-muted/10 text-repixl-muted'
                    }`}
                  >
                    {b.isPublished ? 'Published' : 'Draft'}
                  </span>
                  <span className="font-mono text-[10px] text-repixl-muted">
                    Order: #{b.displayOrder}
                  </span>
                </div>

                {!isEditing && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => togglePublish(b)}
                      className="rounded-lg border border-repixl-muted/20 px-2.5 py-1 text-xs font-medium text-repixl-muted hover:text-repixl-text-light"
                    >
                      {b.isPublished ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      onClick={() => startEdit(b)}
                      className="rounded-lg bg-repixl-red/10 px-2.5 py-1 text-xs font-medium text-repixl-red hover:bg-repixl-red/20"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteId(b.id)}
                      className="rounded-lg bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-4 pt-2 border-t border-repixl-muted/10">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-repixl-muted">
                        Block Type
                      </label>
                      <input
                        type="text"
                        value={editForm.type}
                        onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}
                        className={iClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-repixl-muted">
                        Display Order (1–999)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={editForm.displayOrder}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, displayOrder: e.target.value }))
                        }
                        className={iClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-repixl-muted">
                      Content (JSON or Text)
                    </label>
                    <textarea
                      rows={5}
                      value={editForm.content}
                      onChange={(e) => setEditForm((f) => ({ ...f, content: e.target.value }))}
                      className={`${iClass} font-mono text-xs resize-y`}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id={`edit-publish-${b.id}`}
                      checked={editForm.isPublished}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, isPublished: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-repixl-muted/30 bg-repixl-bg text-repixl-red"
                    />
                    <label
                      htmlFor={`edit-publish-${b.id}`}
                      className="text-xs text-repixl-text-light/80"
                    >
                      Published on storefront
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(b.id)}
                      disabled={submitting}
                      className="rounded-xl bg-repixl-red px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                    >
                      {submitting ? 'Saving…' : 'Save Block'}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-xl border border-repixl-muted/20 px-4 py-2 text-xs text-repixl-muted hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-repixl-bg/40 p-3.5 border border-repixl-muted/10">
                  <pre className="font-mono text-xs text-repixl-text-light/80 whitespace-pre-wrap max-h-36 overflow-y-auto">
                    {typeof b.content === 'object'
                      ? JSON.stringify(b.content, null, 2)
                      : String(b.content)}
                  </pre>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-80 rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-6 shadow-2xl">
            <p className="text-center font-semibold text-repixl-text-light">
              Delete this content block?
            </p>
            <p className="mt-1 text-center text-xs text-repixl-muted">
              This block will be removed from the homepage and database.
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
