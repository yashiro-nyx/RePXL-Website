'use client'

import { useState, useEffect } from 'react'
import { useVoucherStore, type Voucher } from '@/stores/voucherStore'
import { formatPrice } from '@/lib/format'

const statusStyles: Record<string, string> = { active: 'bg-green-500/15 text-green-400 border-green-500/30', expired: 'bg-repixl-muted/15 text-repixl-muted border-repixl-muted/20', disabled: 'bg-red-500/15 text-red-400 border-red-500/30' }

export default function AdminVouchersPage() {
  const vouchers = useVoucherStore((s) => s.vouchers)
  const addVoucher = useVoucherStore((s) => s.addVoucher)
  const deleteVoucher = useVoucherStore((s) => s.deleteVoucher)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [code, setCode] = useState(''); const [discountType, setDiscountType] = useState<'percentage'|'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState(''); const [minPurchase, setMinPurchase] = useState('0')
  const [maxDiscount, setMaxDiscount] = useState(''); const [usageLimit, setUsageLimit] = useState('')
  const [perUserLimit, setPerUserLimit] = useState('1'); const [validFrom, setValidFrom] = useState('')
  const [validUntil, setValidUntil] = useState(''); const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { useVoucherStore.getState().hydrate() }, [])

  const iClass = 'w-full rounded-xl border border-repixl-muted/20 bg-repixl-bg px-4 py-2.5 text-sm text-repixl-text-light placeholder:text-repixl-muted focus:border-repixl-red/30 focus:bg-repixl-charcoal focus:outline-none'

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim() || !discountValue) { setError('Code and discount value are required.'); return }
    if (!validFrom || !validUntil) { setError('Valid dates are required.'); return }
    setError('')
    await addVoucher({
      code: code.toUpperCase().trim(),
      discountType,
      discountValue: Number(discountValue),
      minPurchase: Number(minPurchase) || 0,
      maxDiscount: Number(maxDiscount) || 0,
      usageLimit: Number(usageLimit) || 0,
      perUserLimit: Number(perUserLimit) || 1,
      validFrom,
      validUntil,
      status: 'active',
      description: description.trim(),
    })
    setModalOpen(false)
    setCode(''); setDiscountValue(''); setMinPurchase('0'); setMaxDiscount('')
    setUsageLimit(''); setValidFrom(''); setValidUntil(''); setDescription('')
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-repixl-text-light">Voucher Management</h1><p className="mt-0.5 text-sm text-repixl-muted">{vouchers.length} vouchers</p></div>
        <button onClick={() => setModalOpen(true)} className="rounded-xl bg-repixl-red px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700">+ Add Voucher</button>
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-repixl-muted/10 bg-repixl-bg/50">
            <tr>{['Code','Discount','Min Purchase','Usage','Valid Until','Status','Actions'].map((h) => <th key={h} className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-repixl-muted">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-repixl-muted/10">
            {vouchers.map((v) => (
              <tr key={v.id} className="transition-colors hover:bg-repixl-bg/60">
                <td className="px-5 py-3.5 font-mono text-sm font-bold text-repixl-red">{v.code}</td>
                <td className="px-5 py-3.5 font-mono text-sm text-repixl-text-light">{v.discountType === 'percentage' ? `${v.discountValue}%` : formatPrice(v.discountValue)}</td>
                <td className="px-5 py-3.5 font-mono text-sm text-repixl-text-light/70">{formatPrice(v.minPurchase)}</td>
                <td className="px-5 py-3.5 font-mono text-xs text-repixl-muted">{v.used}/{v.usageLimit === 0 ? '∞' : v.usageLimit}</td>
                <td className="px-5 py-3.5 text-xs text-repixl-muted">{v.validUntil}</td>
                <td className="px-5 py-3.5"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusStyles[v.status]}`}>{v.status}</span></td>
                <td className="px-5 py-3.5"><button onClick={() => setConfirmDeleteId(v.id)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button></td>
              </tr>
            ))}
            {vouchers.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-repixl-muted">No vouchers yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-80 rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-6 shadow-2xl text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-400"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </div>
            <p className="font-semibold text-repixl-text-light">Delete this voucher?</p>
            <p className="mt-1 text-xs text-repixl-muted">This action cannot be undone.</p>
            <p className="mt-2 font-mono text-xs text-repixl-red">{vouchers.find((v) => v.id === confirmDeleteId)?.code}</p>
            <div className="mt-4 flex justify-center gap-3">
              <button onClick={() => { void deleteVoucher(confirmDeleteId); setConfirmDeleteId(null) }} className="flex-1 rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600">Delete</button>
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 rounded-xl border border-repixl-muted/20 px-4 py-2 text-sm text-repixl-muted hover:text-repixl-text-light">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-12 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal shadow-2xl">
            <div className="flex items-center justify-between border-b border-repixl-muted/10 px-6 py-4">
              <h2 className="font-bold text-repixl-text-light">Add New Voucher</h2>
              <button onClick={() => setModalOpen(false)} className="text-repixl-muted hover:text-repixl-text-light/70"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
            </div>
            {error && <div className="mx-6 mt-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2 text-xs text-red-400">{error}</div>}
            <form onSubmit={handleAdd} className="space-y-4 p-6">
              <div><label className="mb-1 block text-xs font-medium text-repixl-muted">Voucher Code <span className="text-red-400">*</span></label><input value={code} onChange={(e) => setCode(e.target.value)} placeholder="E.G., SUMMER2026" className={`font-mono uppercase ${iClass}`} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="mb-1 block text-xs font-medium text-repixl-muted">Discount Type <span className="text-red-400">*</span></label><select value={discountType} onChange={(e) => setDiscountType(e.target.value as 'percentage'|'fixed')} className={iClass}><option value="percentage">Percentage (%)</option><option value="fixed">Fixed (₱)</option></select></div>
                <div><label className="mb-1 block text-xs font-medium text-repixl-muted">Discount Value <span className="text-red-400">*</span></label><input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder="0.00" className={`font-mono ${iClass}`} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="mb-1 block text-xs font-medium text-repixl-muted">Min Purchase (₱)</label><input type="number" value={minPurchase} onChange={(e) => setMinPurchase(e.target.value)} className={`font-mono ${iClass}`} /></div>
                <div><label className="mb-1 block text-xs font-medium text-repixl-muted">Max Discount (₱)</label><input type="number" value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} placeholder="No limit" className={`font-mono ${iClass}`} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="mb-1 block text-xs font-medium text-repixl-muted">Total Usage Limit</label><input type="number" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} placeholder="Unlimited" className={`font-mono ${iClass}`} /></div>
                <div><label className="mb-1 block text-xs font-medium text-repixl-muted">Per User Limit</label><input type="number" value={perUserLimit} onChange={(e) => setPerUserLimit(e.target.value)} className={`font-mono ${iClass}`} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="mb-1 block text-xs font-medium text-repixl-muted">Valid From <span className="text-red-400">*</span></label><input type="datetime-local" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className={iClass} /></div>
                <div><label className="mb-1 block text-xs font-medium text-repixl-muted">Valid Until <span className="text-red-400">*</span></label><input type="datetime-local" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={iClass} /></div>
              </div>
              <div><label className="mb-1 block text-xs font-medium text-repixl-muted">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={iClass} placeholder="Optional internal note" /></div>
              <div className="flex gap-3 border-t border-repixl-muted/10 pt-4"><button type="submit" className="rounded-xl bg-repixl-red px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700">Save Voucher</button><button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-repixl-muted/20 px-5 py-2.5 text-sm text-repixl-text-light/70 hover:bg-repixl-bg">Cancel</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
