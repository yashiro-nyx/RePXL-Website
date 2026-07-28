'use client'

export default function ArchivedCustomersPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-white">Archived Users</h1>
      <p className="mt-1 text-sm text-slate-500">0 archived</p>
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-700/50 bg-slate-800/60">
            <tr>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Name</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Password</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Role</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody><tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-slate-600">No archived users.</td></tr></tbody>
        </table>
      </div>
    </div>
  )
}
