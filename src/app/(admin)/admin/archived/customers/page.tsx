export default function ArchivedCustomersPage() {
  return (
    <div>
      <div><h1 className="text-2xl font-bold text-repixl-text-dark">Archived Users</h1><p className="mt-0.5 text-sm text-gray-500">0 archived users</p></div>
      <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/70"><tr>{['Name','Password','Role','Actions'].map((h) => <th key={h} className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">{h}</th>)}</tr></thead>
          <tbody><tr><td colSpan={4} className="px-5 py-12 text-center text-sm text-gray-400">No archived users.</td></tr></tbody>
        </table>
      </div>
    </div>
  )
}
