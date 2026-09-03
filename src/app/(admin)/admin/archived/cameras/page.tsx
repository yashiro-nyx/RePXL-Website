'use client'

import { useEffect, useState, useCallback } from 'react'
import { Pagination } from '@/components/ui/Pagination'
import { formatPrice } from '@/lib/format'

const PAGE_SIZE = 10

interface ArchivedCamera {
  id: string
  slug: string
  name: string
  brand: string
  stock: number
  condition: string
  price: number
  image: string
}

export default function ArchivedCamerasPage() {
  const [cameras, setCameras] = useState<ArchivedCamera[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null)

  const load = useCallback(async (page: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), status: 'DISCONTINUED' })
      const res = await fetch(`/api/products?${params}`, { credentials: 'include' })
      if (!res.ok) return
      const json = await res.json()
      setCameras(json.data ?? [])
      setTotal(json.pagination?.total ?? 0)
      setTotalPages(json.pagination?.totalPages ?? 1)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load(currentPage) }, [currentPage, load])

  const handleRestore = async (slug: string) => {
    try {
      await fetch(`/api/products/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'ACTIVE' }),
      })
    } catch { /* swallow */ }
    setConfirmRestore(null)
    void load(currentPage)
  }

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-repixl-text-light">Archived Cameras</h1>
        <p className="mt-0.5 text-sm text-repixl-muted">{total} archived cameras</p>
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-repixl-muted/10 bg-repixl-bg/50">
            <tr>{['Image','Name','Brand','Stock','Condition','Price','Actions'].map((h) => <th key={h} className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-repixl-muted">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-repixl-muted/10">
            {loading && <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-repixl-muted">Loading…</td></tr>}
            {!loading && cameras.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-repixl-muted">No archived cameras.</td></tr>}
            {!loading && cameras.map((p) => (
              <tr key={p.slug} className="hover:bg-repixl-bg/60">
                <td className="px-5 py-3.5">
                  <div className="h-10 w-10 overflow-hidden rounded-xl bg-repixl-bg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.image} alt="" className="h-full w-full object-contain" />
                  </div>
                </td>
                <td className="px-5 py-3.5 font-medium text-repixl-text-light">{p.name}</td>
                <td className="px-5 py-3.5 text-repixl-muted">{p.brand}</td>
                <td className="px-5 py-3.5 font-mono text-xs text-repixl-text-light/70">{p.stock}</td>
                <td className="px-5 py-3.5 capitalize text-xs text-repixl-muted">{p.condition.toLowerCase()}</td>
                <td className="px-5 py-3.5 font-mono text-sm text-repixl-text-light">{formatPrice(p.price)}</td>
                <td className="px-5 py-3.5">
                  <button
                    onClick={() => setConfirmRestore(p.slug)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20"
                    aria-label={`Restore ${p.name}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={total}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
        itemLabel="archived cameras"
      />

      {confirmRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-80 rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-6 shadow-2xl">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-green-400"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </div>
            <p className="text-center font-semibold text-repixl-text-light">Restore this camera?</p>
            <p className="mt-1 text-center text-xs text-repixl-muted">It will be set back to Active and visible in the storefront.</p>
            <div className="mt-4 flex gap-3">
              <button onClick={() => void handleRestore(confirmRestore)} className="flex-1 rounded-xl bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600">Restore</button>
              <button onClick={() => setConfirmRestore(null)} className="flex-1 rounded-xl border border-repixl-muted/20 px-4 py-2 text-sm text-repixl-muted hover:text-repixl-text-light">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
