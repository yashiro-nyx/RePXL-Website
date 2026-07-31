'use client'

import { useEffect } from 'react'
import { useProductStore } from '@/stores/productStore'

export default function ArchivedCamerasPage() {
  const products = useProductStore((s) => s.products)
  const updateProduct = useProductStore((s) => s.updateProduct)
  useEffect(() => { useProductStore.getState().hydrate() }, [])
  const archived = products.filter((p) => p.status === 'discontinued')

  return (
    <div>
      <div><h1 className="text-2xl font-bold text-repixl-text-dark">Archived Cameras</h1><p className="mt-0.5 text-sm text-gray-500">{archived.length} archived cameras</p></div>
      <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/70"><tr>{['Image','Name','Brand','Stock','Condition','Actions'].map((h) => <th key={h} className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100">
            {archived.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400">No archived cameras.</td></tr>}
            {archived.map((p) => (
              <tr key={p.slug} className="hover:bg-gray-50/60">
                <td className="px-5 py-3.5"><div className="h-10 w-10 overflow-hidden rounded-xl bg-gray-100"><img src={p.image} alt="" className="h-full w-full object-contain" /></div></td>
                <td className="px-5 py-3.5 font-medium text-gray-800">{p.name}</td>
                <td className="px-5 py-3.5 text-gray-500">{p.brand}</td>
                <td className="px-5 py-3.5 font-mono text-xs text-gray-600">{p.stock}</td>
                <td className="px-5 py-3.5 capitalize text-xs text-gray-500">{p.condition}</td>
                <td className="px-5 py-3.5"><button onClick={() => updateProduct(p.slug, { status: 'active' })} className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-50 text-green-500 hover:bg-green-100"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
