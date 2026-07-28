'use client'

import { useState, useEffect } from 'react'
import { useProductStore } from '@/stores/productStore'
import type { Product, ConditionGrade, ProductStatus } from '@/types'

const statusColors: Record<ProductStatus, string> = {
  active: 'bg-green-500/15 text-green-400',
  inactive: 'bg-slate-500/15 text-slate-400',
  'coming-soon': 'bg-blue-500/15 text-blue-400',
  discontinued: 'bg-red-500/15 text-red-400',
}

const placeholderImages = [
  '/images/product-canon-a520.svg',
  '/images/product-nikon-coolpix.svg',
  '/images/product-sony-w800.svg',
  '/images/product-fuji-f30.svg',
  '/images/product-kodak-c300.svg',
  '/images/product-panasonic-fz7.svg',
]

export default function AdminCamerasPage() {
  const products = useProductStore((s) => s.products)
  const deleteProduct = useProductStore((s) => s.deleteProduct)
  const [brandFilter, setBrandFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSlug, setEditingSlug] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => { useProductStore.getState().hydrate() }, [])

  const brands = Array.from(new Set(products.map((p) => p.brand))).sort()
  const filtered = products.filter((p) => {
    if (brandFilter && p.brand !== brandFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      if (!p.name.toLowerCase().includes(q) && !p.brand.toLowerCase().includes(q) && !(p.serialNumber || '').toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
        </div>
        <h1 className="text-xl font-semibold text-white">Cameras List</h1>
        <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className="rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 py-1.5 text-sm text-slate-300 focus:border-blue-500 focus:outline-none">
          <option value="">All Brands</option>
          {brands.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <div className="relative">
          <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search cameras..." className="rounded-lg border border-slate-700/50 bg-slate-800/60 py-1.5 pl-3 pr-8 text-sm text-slate-300 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none" />
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
        </div>
        <button onClick={() => { setEditingSlug(null); setModalOpen(true) }} className="ml-auto rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">+ Add Camera</button>
      </div>

      <p className="mt-3 text-sm text-slate-500">{filtered.length} cameras found</p>

      {/* Table */}
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-700/50 bg-slate-800/60">
            <tr>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Image</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Name</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Brand</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Stock</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Condition</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Price</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {filtered.map((p) => (
              <tr key={p.slug} className="transition-colors hover:bg-slate-700/20">
                <td className="px-4 py-3">
                  <div className="h-12 w-12 overflow-hidden rounded-lg bg-slate-700/50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.image} alt="" className="h-full w-full object-contain" />
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-slate-200">{p.name}</td>
                <td className="px-4 py-3 text-slate-400">{p.brand}</td>
                <td className="px-4 py-3"><span className={`font-mono text-sm font-bold ${p.stock === 0 ? 'text-red-400' : p.stock <= 1 ? 'text-amber-400' : 'text-green-400'}`}>{p.stock}</span></td>
                <td className="px-4 py-3"><span className="font-mono text-xs capitalize text-slate-300">{p.condition}</span></td>
                <td className="px-4 py-3 font-mono font-medium text-slate-200">${p.price}</td>
                <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${statusColors[p.status]}`}>{p.status}</span></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setEditingSlug(p.slug); setModalOpen(true) }} className="flex h-7 w-7 items-center justify-center rounded bg-blue-500/10 text-blue-400 transition-colors hover:bg-blue-500/20" aria-label={`Edit ${p.name}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                    </button>
                    <button onClick={() => setConfirmDelete(p.slug)} className="flex h-7 w-7 items-center justify-center rounded bg-amber-500/10 text-amber-400 transition-colors hover:bg-amber-500/20" aria-label={`Archive ${p.name}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="5" x="2" y="3" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 font-mono text-[10px] text-slate-600">Showing {filtered.length} of {products.length} cameras</p>

      {/* Archive confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-80 rounded-xl border border-slate-700/50 bg-slate-900 p-5">
            <p className="text-sm text-slate-200">Archive this camera?</p>
            <p className="mt-1 text-xs text-slate-500">It will be moved to Archived Cameras and hidden from the storefront.</p>
            <p className="mt-1 font-mono text-xs text-slate-500">{confirmDelete}</p>
            <div className="mt-4 flex gap-3">
              <button onClick={() => { useProductStore.getState().updateProduct(confirmDelete, { status: 'discontinued' }); setConfirmDelete(null) }} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700">Archive</button>
              <button onClick={() => setConfirmDelete(null)} className="text-xs text-slate-400 hover:text-slate-200">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && <CameraModal editingSlug={editingSlug} onClose={() => setModalOpen(false)} />}
    </div>
  )
}

function CameraModal({ editingSlug, onClose }: { editingSlug: string | null; onClose: () => void }) {
  const products = useProductStore((s) => s.products)
  const addProduct = useProductStore((s) => s.addProduct)
  const updateProduct = useProductStore((s) => s.updateProduct)
  const existing = editingSlug ? products.find((p) => p.slug === editingSlug) : null

  const [name, setName] = useState(existing?.name ?? '')
  const [brand, setBrand] = useState(existing?.brand ?? 'Canon')
  const [series, setSeries] = useState(existing?.series ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [serialNumber, setSerialNumber] = useState(existing?.serialNumber ?? '')
  const [condition, setCondition] = useState<ConditionGrade>(existing?.condition ?? 'excellent')
  const [conditionNotes, setConditionNotes] = useState(existing?.conditionNotes ?? '')
  const [megapixels, setMegapixels] = useState(String(existing?.specs.megapixels ?? ''))
  const [zoom, setZoom] = useState(existing?.specs.zoom ?? '')
  const [storage, setStorage] = useState(existing?.specs.storage ?? '')
  const [year, setYear] = useState(String(existing?.specs.year ?? ''))
  const [stock, setStock] = useState(String(existing?.stock ?? '0'))
  const [price, setPrice] = useState(String(existing?.price ?? ''))
  const [status, setStatus] = useState<ProductStatus>(existing?.status ?? 'active')
  const [image, setImage] = useState(existing?.image ?? placeholderImages[0])
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !price.trim()) { setError('Name and price are required.'); return }
    setError('')
    const slug = editingSlug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const productData: Product = {
      slug, name: name.trim(), brand, series: series.trim(), price: Number(price), condition, image,
      stock: Number(stock), description: description.trim(), status,
      serialNumber: serialNumber.trim() || undefined, conditionNotes: conditionNotes.trim() || undefined,
      specs: { megapixels: Number(megapixels) || 0, zoom: zoom.trim(), storage: storage.trim(), year: Number(year) || 2000 },
    }
    if (editingSlug) updateProduct(editingSlug, productData)
    else addProduct(productData)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-12 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border border-slate-700/50 bg-slate-900 shadow-2xl">
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-slate-700/50 px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
            {editingSlug ? 'Edit Camera' : 'Add Camera'}
          </h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-800 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>

        {error && <div className="mx-6 mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <fieldset>
            <legend className="flex items-center gap-2 text-sm font-semibold text-white">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-500/15 text-blue-400"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></svg></span>
              Basic Information
            </legend>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="mb-1 block text-xs text-slate-400">Name <span className="text-red-400">*</span></label><input value={name} onChange={(e) => setName(e.target.value)} className={iClass} /></div>
              <div><label className="mb-1 block text-xs text-slate-400">Brand <span className="text-red-400">*</span></label><select value={brand} onChange={(e) => setBrand(e.target.value)} className={iClass}><option>Canon</option><option>Nikon</option><option>Sony</option><option>Fujifilm</option><option>Kodak</option><option>Panasonic</option></select></div>
              <div><label className="mb-1 block text-xs text-slate-400">Series</label><input value={series} onChange={(e) => setSeries(e.target.value)} className={iClass} /></div>
              <div className="col-span-2"><label className="mb-1 block text-xs text-slate-400">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={iClass} /></div>
            </div>
          </fieldset>

          {/* Condition & Authenticity */}
          <fieldset>
            <legend className="flex items-center gap-2 text-sm font-semibold text-white">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-500/15 text-amber-400"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /></svg></span>
              Condition & Authenticity
            </legend>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-xs text-slate-400">Serial Number</label><input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} className={`font-mono ${iClass}`} /></div>
              <div><label className="mb-1 block text-xs text-slate-400">Condition Grade <span className="text-red-400">*</span></label><select value={condition} onChange={(e) => setCondition(e.target.value as ConditionGrade)} className={iClass}><option value="mint">Mint</option><option value="excellent">Excellent</option><option value="good">Good</option><option value="fair">Fair</option></select></div>
              <div className="col-span-2"><label className="mb-1 block text-xs text-slate-400">Condition Notes</label><input value={conditionNotes} onChange={(e) => setConditionNotes(e.target.value)} className={iClass} /></div>
            </div>
          </fieldset>

          {/* Classification */}
          <fieldset>
            <legend className="flex items-center gap-2 text-sm font-semibold text-white">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-purple-500/15 text-purple-400"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="16" /><line x1="8" x2="16" y1="12" y2="12" /></svg></span>
              Specs
            </legend>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-xs text-slate-400">Resolution (MP)</label><input type="number" value={megapixels} onChange={(e) => setMegapixels(e.target.value)} className={`font-mono ${iClass}`} /></div>
              <div><label className="mb-1 block text-xs text-slate-400">Zoom</label><input value={zoom} onChange={(e) => setZoom(e.target.value)} className={iClass} /></div>
              <div><label className="mb-1 block text-xs text-slate-400">Storage</label><input value={storage} onChange={(e) => setStorage(e.target.value)} className={iClass} /></div>
              <div><label className="mb-1 block text-xs text-slate-400">Year</label><input type="number" value={year} onChange={(e) => setYear(e.target.value)} className={`font-mono ${iClass}`} /></div>
            </div>
          </fieldset>

          {/* Inventory & Pricing */}
          <fieldset>
            <legend className="flex items-center gap-2 text-sm font-semibold text-white">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-green-500/15 text-green-400"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg></span>
              Inventory & Pricing
            </legend>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div><label className="mb-1 block text-xs text-slate-400">Current Stock <span className="text-red-400">*</span></label><input type="number" value={stock} onChange={(e) => setStock(e.target.value)} className={`font-mono ${iClass}`} /></div>
              <div><label className="mb-1 block text-xs text-slate-400">Selling Price ($) <span className="text-red-400">*</span></label><input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className={`font-mono ${iClass}`} /></div>
              <div><label className="mb-1 block text-xs text-slate-400">Status <span className="text-red-400">*</span></label><select value={status} onChange={(e) => setStatus(e.target.value as ProductStatus)} className={iClass}><option value="active">Active (Available)</option><option value="inactive">Inactive</option><option value="coming-soon">Coming Soon</option><option value="discontinued">Discontinued</option></select></div>
            </div>
          </fieldset>

          {/* Camera Image */}
          <fieldset>
            <legend className="flex items-center gap-2 text-sm font-semibold text-white">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-cyan-500/15 text-cyan-400"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg></span>
              Camera Image
            </legend>
            <div className="mt-3 space-y-3">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Upload Cover Image <span className="text-red-400">*</span></label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    if (file.size > 500 * 1024) { setError('Image too large — max 500KB.'); e.target.value = ''; return }
                    setError('')
                    const reader = new FileReader()
                    reader.onload = () => setImage(reader.result as string)
                    reader.readAsDataURL(file)
                  }}
                  className="w-full rounded-lg border border-slate-700/50 bg-slate-800/60 text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-xs file:font-medium file:text-slate-200 hover:file:bg-slate-600"
                />
                <p className="mt-1 text-[10px] text-slate-600">Accepted formats: JPG, PNG, WebP, GIF (Max 500KB)</p>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Or select a placeholder:</label>
                <select value={image.startsWith('data:') ? '' : image} onChange={(e) => { if (e.target.value) setImage(e.target.value) }} className={iClass}>
                  <option value="">— Select placeholder —</option>
                  {placeholderImages.map((img) => <option key={img} value={img}>{img.split('/').pop()}</option>)}
                </select>
              </div>
              {/* Preview */}
              {image && (
                <div className="text-center">
                  <p className="mb-2 text-xs text-slate-500">Preview</p>
                  <div className="mx-auto inline-block overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/50 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image} alt="Preview" className="h-48 w-48 object-contain" />
                  </div>
                </div>
              )}
            </div>
          </fieldset>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-700/50 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-700/50 px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200">Cancel</button>
            <button type="submit" className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
              {editingSlug ? 'Save Camera' : 'Save Camera'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const iClass = 'w-full rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none'
