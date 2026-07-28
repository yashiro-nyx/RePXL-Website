'use client'

import { useState } from 'react'

const mockLogs = [
  { id: '1', date: 'Jul 27, 2026 09:14 AM', action: 'Create', entity: 'Camera', entityName: 'Canon PowerShot A520', admin: 'admin', adminEmail: 'admin@repixl-admin.com', description: 'Added new camera listing', ip: '192.168.1.10', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36' },
  { id: '2', date: 'Jul 27, 2026 09:10 AM', action: 'Update', entity: 'Camera', entityName: 'Sony CyberShot W800', admin: 'admin', adminEmail: 'admin@repixl-admin.com', description: 'Updated stock from 2 to 3', ip: '192.168.1.10', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36' },
  { id: '3', date: 'Jul 26, 2026 06:45 PM', action: 'Login', entity: 'Admin', entityName: 'admin', admin: 'admin', adminEmail: 'admin@repixl-admin.com', description: 'Admin admin logged in.', ip: '127.0.0.1', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36' },
  { id: '4', date: 'Jul 26, 2026 03:30 PM', action: 'Create', entity: 'Order', entityName: 'RPX-A1B2C3', admin: 'System', adminEmail: 'system@repixl-admin.com', description: 'New order placed by customer', ip: '—', userAgent: 'System' },
  { id: '5', date: 'Jul 25, 2026 11:20 AM', action: 'Update', entity: 'Camera', entityName: 'Nikon Coolpix 3200', admin: 'admin', adminEmail: 'admin@repixl-admin.com', description: 'Changed condition from Good to Mint', ip: '192.168.1.10', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36' },
  { id: '6', date: 'Jul 25, 2026 10:05 AM', action: 'Delete', entity: 'Camera', entityName: 'Test Camera', admin: 'admin', adminEmail: 'admin@repixl-admin.com', description: 'Archived test listing', ip: '192.168.1.10', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36' },
  { id: '7', date: 'Jul 24, 2026 02:00 PM', action: 'Update', entity: 'Order', entityName: 'RPX-X9Y8Z7', admin: 'admin', adminEmail: 'admin@repixl-admin.com', description: 'Status changed to Shipped', ip: '192.168.1.10', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36' },
  { id: '8', date: 'Jul 24, 2026 09:30 AM', action: 'Create', entity: 'Voucher', entityName: 'SUMMER10', admin: 'admin', adminEmail: 'admin@repixl-admin.com', description: 'Created 10% discount voucher', ip: '192.168.1.10', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36' },
  { id: '9', date: 'Jul 23, 2026 04:15 PM', action: 'Login', entity: 'Admin', entityName: 'admin', admin: 'admin', adminEmail: 'admin@repixl-admin.com', description: 'Admin admin logged in.', ip: '192.168.1.10', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36' },
  { id: '10', date: 'Jul 22, 2026 08:00 AM', action: 'Logout', entity: 'Admin', entityName: 'admin', admin: 'admin', adminEmail: 'admin@repixl-admin.com', description: 'Admin admin logged out.', ip: '192.168.1.10', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36' },
]

const entities = ['Camera', 'Order', 'Voucher', 'Admin']
const actions = ['Create', 'Update', 'Delete', 'Login', 'Logout']

const actionColors: Record<string, string> = {
  Create: 'bg-green-500/15 text-green-400',
  Update: 'bg-blue-500/15 text-blue-400',
  Delete: 'bg-red-500/15 text-red-400',
  Login: 'bg-amber-500/15 text-amber-400',
  Logout: 'bg-slate-500/15 text-slate-400',
}

export default function AdminLogsPage() {
  const [entityFilter, setEntityFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [detailsId, setDetailsId] = useState<string | null>(null)

  const filtered = mockLogs.filter((l) => {
    if (entityFilter && l.entity !== entityFilter) return false
    if (actionFilter && l.action !== actionFilter) return false
    return true
  })

  const detailLog = detailsId ? mockLogs.find((l) => l.id === detailsId) : null

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
        </div>
        <h1 className="text-xl font-semibold text-white">Audit Trail</h1>
        <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} className="rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 py-1.5 text-sm text-slate-300 focus:border-blue-500 focus:outline-none">
          <option value="">All Entities</option>
          {entities.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 py-1.5 text-sm text-slate-300 focus:border-blue-500 focus:outline-none">
          <option value="">All Actions</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <p className="mt-3 text-sm text-slate-500">{filtered.length} audit logs found</p>

      <div className="mt-3 overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-700/50 bg-slate-800/60">
            <tr>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Date & Time</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Action</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Entity</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Entity Name</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Admin</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Description</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-600">No logs match your filters.</td></tr>
            )}
            {filtered.map((log) => (
              <tr key={log.id} className="transition-colors hover:bg-slate-700/20">
                <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{log.date}</td>
                <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${actionColors[log.action] || ''}`}>{log.action}</span></td>
                <td className="px-4 py-3 text-xs text-slate-400">{log.entity}</td>
                <td className="px-4 py-3 text-xs font-medium text-slate-200">{log.entityName}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-700 text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg></div>
                    <span className="text-xs text-slate-300">{log.admin}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{log.description}</td>
                <td className="px-4 py-3">
                  <button onClick={() => setDetailsId(log.id)} className="flex h-7 w-7 items-center justify-center rounded bg-slate-700/50 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white" aria-label="View details">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 font-mono text-[10px] text-slate-600">Showing {filtered.length} logs</p>

      {/* Audit Log Details Modal */}
      {detailLog && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-16 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-slate-700/50 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700/50 px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><path d="M16 13H8" /><path d="M16 17H8" /></svg>
                Audit Log Details
              </h2>
              <button onClick={() => setDetailsId(null)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Two-column info */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Action Information */}
                <div className="rounded-lg border border-slate-700/50 bg-slate-800/40 p-4">
                  <h3 className="mb-3 font-mono text-[9px] uppercase tracking-widest text-slate-500">Action Information</h3>
                  <dl className="space-y-2">
                    <div className="flex items-center gap-2">
                      <dt className="text-xs font-medium text-slate-400">Action Type:</dt>
                      <dd><span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${actionColors[detailLog.action]}`}>{detailLog.action}</span></dd>
                    </div>
                    <div><dt className="text-xs font-medium text-slate-400">Entity Type:</dt><dd className="mt-0.5 text-sm text-slate-200">{detailLog.entity}</dd></div>
                    <div><dt className="text-xs font-medium text-slate-400">Entity Name:</dt><dd className="mt-0.5 text-sm text-slate-200">{detailLog.entityName}</dd></div>
                    <div><dt className="text-xs font-medium text-slate-400">Timestamp:</dt><dd className="mt-0.5 font-mono text-sm text-slate-200">{detailLog.date}</dd></div>
                  </dl>
                </div>

                {/* Admin Information */}
                <div className="rounded-lg border border-slate-700/50 bg-slate-800/40 p-4">
                  <h3 className="mb-3 font-mono text-[9px] uppercase tracking-widest text-slate-500">Admin Information</h3>
                  <dl className="space-y-2">
                    <div><dt className="text-xs font-medium text-slate-400">Username:</dt><dd className="mt-0.5 text-sm text-slate-200">{detailLog.admin}</dd></div>
                    <div><dt className="text-xs font-medium text-slate-400">Email:</dt><dd className="mt-0.5 font-mono text-sm text-slate-200">{detailLog.adminEmail}</dd></div>
                    <div><dt className="text-xs font-medium text-slate-400">IP Address:</dt><dd className="mt-0.5 font-mono text-sm text-slate-200">{detailLog.ip}</dd></div>
                    <div><dt className="text-xs font-medium text-slate-400">User Agent:</dt><dd className="mt-0.5 font-mono text-[10px] leading-relaxed text-slate-400">{detailLog.userAgent}</dd></div>
                  </dl>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="mb-2 font-mono text-[9px] uppercase tracking-widest text-slate-500">Description</h3>
                <div className="rounded-lg border border-slate-700/50 bg-slate-800/40 px-4 py-3">
                  <p className="text-sm text-slate-200">{detailLog.description}</p>
                </div>
              </div>

              {/* Close */}
              <div className="flex justify-end border-t border-slate-700/50 pt-4">
                <button onClick={() => setDetailsId(null)} className="rounded-lg border border-slate-700/50 px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
