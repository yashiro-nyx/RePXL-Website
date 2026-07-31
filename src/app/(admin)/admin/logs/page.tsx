'use client'

import { useState } from 'react'

const mockLogs = [
  { id: '1', date: 'Jul 27, 2026 09:14 AM', action: 'Create', entity: 'Camera', entityName: 'Canon PowerShot A520', admin: 'admin', adminEmail: 'admin@repixl-admin.com', description: 'Added new camera listing', ip: '192.168.1.10', userAgent: 'Mozilla/5.0 Chrome/126.0.0.0 Safari/537.36' },
  { id: '2', date: 'Jul 27, 2026 09:10 AM', action: 'Update', entity: 'Camera', entityName: 'Sony CyberShot W800', admin: 'admin', adminEmail: 'admin@repixl-admin.com', description: 'Updated stock from 2 to 3', ip: '192.168.1.10', userAgent: 'Mozilla/5.0 Chrome/126.0.0.0 Safari/537.36' },
  { id: '3', date: 'Jul 26, 2026 06:45 PM', action: 'Login', entity: 'Admin', entityName: 'admin', admin: 'admin', adminEmail: 'admin@repixl-admin.com', description: 'Admin admin logged in.', ip: '127.0.0.1', userAgent: 'Mozilla/5.0 Chrome/126.0.0.0 Safari/537.36' },
  { id: '4', date: 'Jul 26, 2026 03:30 PM', action: 'Create', entity: 'Order', entityName: 'RPX-A1B2C3', admin: 'System', adminEmail: 'system@repixl.com', description: 'New order placed by customer', ip: '—', userAgent: 'System' },
  { id: '5', date: 'Jul 25, 2026 11:20 AM', action: 'Update', entity: 'Camera', entityName: 'Nikon Coolpix 3200', admin: 'admin', adminEmail: 'admin@repixl-admin.com', description: 'Changed condition from Good to Mint', ip: '192.168.1.10', userAgent: 'Mozilla/5.0 Chrome/126.0.0.0 Safari/537.36' },
  { id: '6', date: 'Jul 25, 2026 10:05 AM', action: 'Delete', entity: 'Camera', entityName: 'Test Camera', admin: 'admin', adminEmail: 'admin@repixl-admin.com', description: 'Archived test listing', ip: '192.168.1.10', userAgent: 'Mozilla/5.0 Chrome/126.0.0.0 Safari/537.36' },
  { id: '7', date: 'Jul 24, 2026 02:00 PM', action: 'Update', entity: 'Order', entityName: 'RPX-X9Y8Z7', admin: 'admin', adminEmail: 'admin@repixl-admin.com', description: 'Status changed to Shipped', ip: '192.168.1.10', userAgent: 'Mozilla/5.0 Chrome/126.0.0.0 Safari/537.36' },
  { id: '8', date: 'Jul 24, 2026 09:30 AM', action: 'Create', entity: 'Voucher', entityName: 'SUMMER10', admin: 'admin', adminEmail: 'admin@repixl-admin.com', description: 'Created 10% discount voucher', ip: '192.168.1.10', userAgent: 'Mozilla/5.0 Chrome/126.0.0.0 Safari/537.36' },
]

const actionStyles: Record<string, string> = {
  Create: 'bg-green-50 text-green-700 border-green-200',
  Update: 'bg-blue-50 text-blue-700 border-blue-200',
  Delete: 'bg-red-50 text-red-600 border-red-200',
  Login: 'bg-amber-50 text-amber-700 border-amber-200',
  Logout: 'bg-gray-100 text-gray-600 border-gray-200',
}

export default function AdminLogsPage() {
  const [entityFilter, setEntityFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [detailsId, setDetailsId] = useState<string | null>(null)
  const detailLog = detailsId ? mockLogs.find((l) => l.id === detailsId) : null

  const filtered = mockLogs.filter((l) => {
    if (entityFilter && l.entity !== entityFilter) return false
    if (actionFilter && l.action !== actionFilter) return false
    return true
  })

  return (
    <div>
      <div><h1 className="text-2xl font-bold text-repixl-text-dark">Activity Logs</h1><p className="mt-0.5 text-sm text-gray-500">Audit trail of all admin actions.</p></div>

      <div className="mt-5 flex gap-3">
        <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm focus:outline-none">
          <option value="">All Entities</option>
          {['Camera', 'Order', 'Voucher', 'Admin'].map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm focus:outline-none">
          <option value="">All Actions</option>
          {['Create', 'Update', 'Delete', 'Login', 'Logout'].map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/70">
            <tr>{['Date & Time', 'Action', 'Entity', 'Name', 'Admin', 'Description', 'Details'].map((h) => <th key={h} className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">No logs match.</td></tr>}
            {filtered.map((log) => (
              <tr key={log.id} className="transition-colors hover:bg-gray-50/60">
                <td className="px-5 py-3.5 text-xs text-gray-400">{log.date}</td>
                <td className="px-5 py-3.5"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${actionStyles[log.action] || ''}`}>{log.action}</span></td>
                <td className="px-5 py-3.5 text-xs text-gray-600">{log.entity}</td>
                <td className="px-5 py-3.5 text-sm font-medium text-gray-800">{log.entityName}</td>
                <td className="px-5 py-3.5 text-xs text-gray-500">{log.admin}</td>
                <td className="px-5 py-3.5 text-xs text-gray-500">{log.description}</td>
                <td className="px-5 py-3.5"><button onClick={() => setDetailsId(log.id)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-repixl-red/5 hover:text-repixl-red"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-gray-400">Showing {filtered.length} logs</p>

      {detailLog && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="font-bold text-repixl-text-dark">Audit Log Details</h2>
              <button onClick={() => setDetailsId(null)} className="text-gray-400 hover:text-gray-600"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></button>
            </div>
            <div className="grid grid-cols-2 gap-4 p-6">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Action Information</p>
                <dl className="mt-3 space-y-2 text-sm"><div className="flex gap-2"><dt className="font-medium text-gray-500">Action:</dt><dd><span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${actionStyles[detailLog.action]}`}>{detailLog.action}</span></dd></div><div><dt className="font-medium text-gray-500">Entity Type:</dt><dd className="text-gray-800">{detailLog.entity}</dd></div><div><dt className="font-medium text-gray-500">Entity Name:</dt><dd className="text-gray-800">{detailLog.entityName}</dd></div><div><dt className="font-medium text-gray-500">Timestamp:</dt><dd className="font-mono text-gray-800">{detailLog.date}</dd></div></dl>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Admin Information</p>
                <dl className="mt-3 space-y-2 text-sm"><div><dt className="font-medium text-gray-500">Username:</dt><dd className="text-gray-800">{detailLog.admin}</dd></div><div><dt className="font-medium text-gray-500">Email:</dt><dd className="font-mono text-gray-800">{detailLog.adminEmail}</dd></div><div><dt className="font-medium text-gray-500">IP Address:</dt><dd className="font-mono text-gray-800">{detailLog.ip}</dd></div><div><dt className="font-medium text-gray-500">User Agent:</dt><dd className="font-mono text-[10px] leading-relaxed text-gray-500">{detailLog.userAgent}</dd></div></dl>
              </div>
              <div className="col-span-2 rounded-xl bg-gray-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Description</p>
                <p className="mt-2 text-sm text-gray-800">{detailLog.description}</p>
              </div>
            </div>
            <div className="flex justify-end border-t border-gray-100 px-6 py-4"><button onClick={() => setDetailsId(null)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Close</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
