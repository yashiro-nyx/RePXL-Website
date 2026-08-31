'use client'

import { useEffect, useState } from 'react'
import { useArchivedCustomerStore } from '@/stores/archivedCustomerStore'
import { adminService } from '@/lib/data/adminService'

function censorName(name: string) { return name.split(' ').map((p) => p[0] + '*'.repeat(Math.max(p.length - 1, 4))).join(' ') }

export default function ArchivedCustomersPage() {
  const archivedCustomers = useArchivedCustomerStore((s) => s.archivedCustomers)
  const restoreCustomer = useArchivedCustomerStore((s) => s.restoreCustomer)
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null)

  useEffect(() => { useArchivedCustomerStore.getState().hydrate() }, [])

  const handleRestore = (id: string) => {
    restoreCustomer(id)
    void adminService.restoreCustomer(id)
    setConfirmRestore(null)
  }

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-repixl-text-light">Archived Users</h1>
        <p className="mt-0.5 text-sm text-repixl-muted">{archivedCustomers.length} archived users</p>
      </div>
      <div className="mt-5 overflow-x-auto rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-repixl-muted/10 bg-repixl-bg/50">
            <tr>{['Name', 'Email', 'Role', 'Archived', 'Actions'].map((h) => <th key={h} className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-repixl-muted">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-repixl-muted/10">
            {archivedCustomers.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-repixl-muted">No archived users.</td></tr>}
            {archivedCustomers.map((c) => (
              <tr key={c.id} className="hover:bg-repixl-bg/60">
                <td className="px-5 py-3.5 font-mono text-sm font-medium text-repixl-text-light">{censorName(c.name)}</td>
                <td className="px-5 py-3.5 font-mono text-sm text-repixl-muted">{c.email.split('@')[0][0]}****@****.com</td>
                <td className="px-5 py-3.5"><span className="rounded-full bg-repixl-muted/15 px-2.5 py-1 text-[11px] font-medium text-repixl-text-light">{c.role}</span></td>
                <td className="px-5 py-3.5 text-xs text-repixl-muted">{c.archivedAt}</td>
                <td className="px-5 py-3.5">
                  <button onClick={() => setConfirmRestore(c.id)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Restore confirmation */}
      {confirmRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-80 rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-6 shadow-2xl">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-green-400"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </div>
            <p className="text-center font-semibold text-repixl-text-light">Restore this user?</p>
            <p className="mt-1 text-center text-xs text-repixl-muted">They will be moved back to the active customers list.</p>
            <div className="mt-4 flex gap-3">
              <button onClick={() => handleRestore(confirmRestore)} className="flex-1 rounded-xl bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600">Restore</button>
              <button onClick={() => setConfirmRestore(null)} className="flex-1 rounded-xl border border-repixl-muted/20 px-4 py-2 text-sm text-repixl-muted hover:text-repixl-text-light">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
