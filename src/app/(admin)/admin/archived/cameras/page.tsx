'use client'

import { useState, useEffect } from 'react'
import { useProductStore } from '@/stores/productStore'

export default function ArchivedCamerasPage() {
  const products = useProductStore((s) => s.products)
  const updateProduct = useProductStore((s) => s.updateProduct)
  useEffect(() => { useProductStore.getState().hydrate() }, [])

  const archived = products.filter((p) => p.status === 'discontinued')

  const restore = (slug: string) => updateProduct(slug, { status: 'active' })

  return (
    <div>
      <h1 className="text-xl font-semibold text-white">Archived Cameras</h1>
      <p className="mt-1 text-sm text-slate-500">{archived.length} archived</p>
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-700/50 bg-slate-800/60">
            <tr>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Image</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Name</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Brand</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Stock</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Condition</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {archived.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-600">No archived cameras.</td></tr>}
            {archived.map((p) => (
              <tr key={p.slug} className="transition-colors hover:bg-slate-700/20">
                <td className="px-4 py-3"><div className="h-10 w-10 overflow-hidden rounded-lg bg-slate-700/50">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={p.image} alt="" className="h-full w-full object-contain" /></div></td>
                <td className="px-4 py-3 text-slate-200">{p.name}</td>
                <td className="px-4 py-3 text-slate-400">{p.brand}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-400">{p.stock}</td>
                <td className="px-4 py-3 font-mono text-xs capitalize text-slate-400">{p.condition}</td>
                <td className="px-4 py-3"><button onClick={() => restore(p.slug)} className="flex h-7 w-7 items-center justify-center rounded bg-green-500/10 text-green-400 transition-colors hover:bg-green-500/20" aria-label="Restore"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 font-mono text-[10px] text-slate-600">Showing {archived.length} cameras</p>
    </div>
  )
}
