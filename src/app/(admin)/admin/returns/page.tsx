'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Pagination } from '@/components/ui/Pagination'

const PAGE_SIZE = 10

interface ReturnRequest {
  id: string
  orderNumber: string
  customerName: string
  reason: string
  status: string
  createdAt: string
}

const statusStyles: Record<string, string> = {
  REQUESTED: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  UNDER_REVIEW: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  APPROVED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  REJECTED: 'bg-red-500/15 text-red-400 border-red-500/30',
  REFUNDED: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
}

const allStatuses = ['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REFUNDED']

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState<ReturnRequest[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (page: number, status: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
      if (status) params.set('status', status)
      const res = await fetch(`/api/admin/returns?${params}`, { credentials: 'include' })
      if (!res.ok) { setError('Failed to load return requests.'); return }
      const body = await res.json()
      // Map nested API shape to flat ReturnRequest
      const mapped: ReturnRequest[] = (body.data ?? []).map((r: {
        id: string
        status: string
        reason: string
        createdAt: string
        order: { orderNumber: string }
        user: { firstName: string; lastName: string; email: string }
      }) => ({
        id: r.id,
        orderNumber: r.order?.orderNumber ?? '—',
        customerName: r.user ? `${r.user.firstName} ${r.user.lastName}`.trim() || r.user.email : '—',
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt,
      }))
      setReturns(mapped)
      setTotal(body.pagination?.total ?? 0)
      setTotalPages(body.pagination?.totalPages ?? 1)
    } catch {
      setError('Failed to load return requests.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load(currentPage, statusFilter) }, [currentPage, statusFilter, load])

  const handleStatusFilter = (s: string) => { setStatusFilter(s); setCurrentPage(1) }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-repixl-text-light">Return Requests</h1>
          <p className="mt-0.5 text-sm text-repixl-muted">{total} total requests</p>
        </div>
      </div>

      {/* Status filter */}
      <div className="mt-5">
        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilter(e.target.value)}
          className="rounded-xl border border-repixl-muted/20 bg-repixl-charcoal px-4 py-2 text-sm text-repixl-text-light/80 shadow-sm focus:outline-none"
        >
          <option value="">All Statuses</option>
          {allStatuses.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-repixl-muted/10 bg-repixl-bg/50">
            <tr>
              {['Order', 'Customer', 'Reason', 'Status', 'Date', 'Actions'].map((h) => (
                <th key={h} className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-repixl-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-repixl-muted/10">
            {loading && (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-repixl-muted">Loading…</td></tr>
            )}
            {!loading && returns.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-repixl-muted/30" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    <p className="text-sm text-repixl-muted">No return requests found.</p>
                  </div>
                </td>
              </tr>
            )}
            {!loading && returns.map((r) => (
              <tr key={r.id} className="transition-colors hover:bg-repixl-bg/40">
                <td className="px-5 py-3.5 font-mono text-sm font-semibold text-repixl-red">#{r.orderNumber}</td>
                <td className="px-5 py-3.5 text-sm text-repixl-text-light/80">{r.customerName}</td>
                <td className="max-w-[180px] px-5 py-3.5">
                  <p className="truncate text-sm text-repixl-text-light/70">{r.reason}</p>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${statusStyles[r.status] ?? 'bg-repixl-muted/10 text-repixl-muted'}`}>
                    {r.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-5 py-3.5 font-mono text-xs text-repixl-muted">
                  {new Date(r.createdAt).toLocaleDateString()}
                </td>
                <td className="px-5 py-3.5">
                  <Link
                    href={`/admin/returns/${r.id}`}
                    className="rounded-lg bg-repixl-red/5 px-2.5 py-1 text-xs font-medium text-repixl-red hover:bg-repixl-red/10"
                  >
                    Review
                  </Link>
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
        itemLabel="return requests"
      />
    </div>
  )
}
