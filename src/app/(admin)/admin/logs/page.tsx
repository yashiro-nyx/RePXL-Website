'use client'

import { useState, useEffect, useCallback } from 'react'
import { Pagination } from '@/components/ui/Pagination'

const PAGE_SIZE = 10

interface LogRow {
  id: string
  date: string
  action: string
  entity: string
  entityName: string
  admin: string
  adminEmail: string
  description: string
  ip: string
  userAgent: string
}

function mapApiLog(l: { id: string; action: string; details: string; adminName: string; createdAt: string }): LogRow {
  const [verbRaw, entityRaw] = l.action.split('_')
  const verb = verbRaw ? verbRaw.charAt(0) + verbRaw.slice(1).toLowerCase() : 'Update'
  const entityMap: Record<string, string> = { PRODUCT: 'Camera', ORDER: 'Order', VOUCHER: 'Voucher', ADMIN: 'Admin', CUSTOMER: 'Admin' }
  const entity = entityMap[(entityRaw ?? '').toUpperCase()] ?? 'Admin'
  return {
    id: l.id,
    date: new Date(l.createdAt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    action: ['Create', 'Update', 'Delete', 'Login', 'Logout'].includes(verb) ? verb : 'Update',
    entity,
    entityName: l.details.replace(/^[A-Za-z ]+:\s*/, ''),
    admin: l.adminName,
    adminEmail: '',
    description: l.details,
    ip: '—',
    userAgent: 'API',
  }
}

const actionStyles: Record<string, string> = {
  Create: 'bg-green-500/15 text-green-400 border-green-500/30',
  Update: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Delete: 'bg-red-500/15 text-red-400 border-red-500/30',
  Login: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Logout: 'bg-repixl-muted/15 text-repixl-text-light/70 border-repixl-muted/20',
}

export default function AdminLogsPage() {
  const [entityFilter, setEntityFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [detailsId, setDetailsId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [logs, setLogs] = useState<LogRow[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (page: number, action: string, entity: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
      // Map UI entity label back to DB action prefix for server-side filter
      const actionPrefixMap: Record<string, string> = {
        Camera: 'PRODUCT', Order: 'ORDER', Voucher: 'VOUCHER', Admin: 'ADMIN',
      }
      if (action) params.set('action', action.toUpperCase())
      if (entity && actionPrefixMap[entity]) params.set('action', actionPrefixMap[entity])
      const res = await fetch(`/api/admin/logs?${params}`, { credentials: 'include' })
      if (!res.ok) return
      const json = await res.json()
      setLogs((json.data ?? []).map(mapApiLog))
      setTotal(json.pagination?.total ?? 0)
      setTotalPages(json.pagination?.totalPages ?? 1)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load(currentPage, actionFilter, entityFilter) }, [currentPage, actionFilter, entityFilter, load])

  const handleEntityFilter = (v: string) => { setEntityFilter(v); setCurrentPage(1) }
  const handleActionFilter = (v: string) => { setActionFilter(v); setCurrentPage(1) }

  const detailLog = detailsId ? logs.find((l) => l.id === detailsId) : null

  return (
    <div>
      <div><h1 className="text-2xl font-bold text-repixl-text-light">Activity Logs</h1><p className="mt-0.5 text-sm text-repixl-muted">Audit trail of all admin actions. {total} total entries.</p></div>

      <div className="mt-5 flex flex-wrap gap-3">
        <select value={entityFilter} onChange={(e) => handleEntityFilter(e.target.value)} className="rounded-xl border border-repixl-muted/20 bg-repixl-charcoal px-4 py-2 text-sm text-repixl-text-light/80 shadow-sm focus:outline-none">
          <option value="">All Entities</option>
          {['Camera', 'Order', 'Voucher', 'Admin'].map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={actionFilter} onChange={(e) => handleActionFilter(e.target.value)} className="rounded-xl border border-repixl-muted/20 bg-repixl-charcoal px-4 py-2 text-sm text-repixl-text-light/80 shadow-sm focus:outline-none">
          <option value="">All Actions</option>
          {['Create', 'Update', 'Delete', 'Login', 'Logout'].map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-repixl-muted/10 bg-repixl-bg/50">
            <tr>{['Date & Time', 'Action', 'Entity', 'Name', 'Admin', 'Description', 'Details'].map((h) => <th key={h} className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-repixl-muted">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-repixl-muted/10">
            {loading && <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-repixl-muted">Loading…</td></tr>}
            {!loading && logs.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-repixl-muted">No logs found.</td></tr>}
            {!loading && logs.map((log) => (
              <tr key={log.id} className="transition-colors hover:bg-repixl-bg/60">
                <td className="px-5 py-3.5 text-xs text-repixl-muted">{log.date}</td>
                <td className="px-5 py-3.5"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${actionStyles[log.action] || ''}`}>{log.action}</span></td>
                <td className="px-5 py-3.5 text-xs text-repixl-text-light/70">{log.entity}</td>
                <td className="px-5 py-3.5 text-sm font-medium text-repixl-text-light">{log.entityName}</td>
                <td className="px-5 py-3.5 text-xs text-repixl-muted">{log.admin}</td>
                <td className="px-5 py-3.5 text-xs text-repixl-muted">{log.description}</td>
                <td className="px-5 py-3.5"><button onClick={() => setDetailsId(log.id)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-repixl-muted/10 text-repixl-muted hover:bg-repixl-red/5 hover:text-repixl-red" aria-label="View log details"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg></button></td>
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
        itemLabel="log entries"
      />

      {detailLog && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal shadow-2xl">
            <div className="flex items-center justify-between border-b border-repixl-muted/10 px-6 py-4">
              <h2 className="font-bold text-repixl-text-light">Audit Log Details</h2>
              <button onClick={() => setDetailsId(null)} className="text-repixl-muted hover:text-repixl-text-light/70" aria-label="Close"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></button>
            </div>
            <div className="grid grid-cols-2 gap-4 p-6">
              <div className="rounded-xl bg-repixl-bg p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-repixl-muted">Action Information</p>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex gap-2"><dt className="font-medium text-repixl-muted">Action:</dt><dd><span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${actionStyles[detailLog.action]}`}>{detailLog.action}</span></dd></div>
                  <div><dt className="font-medium text-repixl-muted">Entity Type:</dt><dd className="text-repixl-text-light">{detailLog.entity}</dd></div>
                  <div><dt className="font-medium text-repixl-muted">Entity Name:</dt><dd className="text-repixl-text-light">{detailLog.entityName}</dd></div>
                  <div><dt className="font-medium text-repixl-muted">Timestamp:</dt><dd className="font-mono text-repixl-text-light">{detailLog.date}</dd></div>
                </dl>
              </div>
              <div className="rounded-xl bg-repixl-bg p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-repixl-muted">Admin Information</p>
                <dl className="mt-3 space-y-2 text-sm">
                  <div><dt className="font-medium text-repixl-muted">Username:</dt><dd className="text-repixl-text-light">{detailLog.admin}</dd></div>
                  <div><dt className="font-medium text-repixl-muted">IP Address:</dt><dd className="font-mono text-repixl-text-light">{detailLog.ip}</dd></div>
                </dl>
              </div>
              <div className="col-span-2 rounded-xl bg-repixl-bg p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-repixl-muted">Description</p>
                <p className="mt-2 text-sm text-repixl-text-light">{detailLog.description}</p>
              </div>
            </div>
            <div className="flex justify-end border-t border-repixl-muted/10 px-6 py-4"><button onClick={() => setDetailsId(null)} className="rounded-xl border border-repixl-muted/20 px-4 py-2 text-sm text-repixl-text-light/70 hover:bg-repixl-bg">Close</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
