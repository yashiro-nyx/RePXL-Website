'use client'

import { useState } from 'react'

interface Voucher { id: string; code: string; discountType: 'percentage' | 'fixed'; discountValue: number; minPurchase: number; maxDiscount: number; usageLimit: number; perUserLimit: number; used: number; validFrom: string; validUntil: string; status: 'active' | 'expired' | 'disabled'; description: string }

const initialVouchers: Voucher[] = [
  { id: '1', code: 'WELCOME10', discountType: 'percentage', discountValue: 10, minPurchase: 50, maxDiscount: 20, usageLimit: 100, perUserLimit: 1, used: 23, validFrom: '2026-01-01', validUntil: '2026-12-31', status: 'active', description: 'Welcome discount for new customers' },
  { id: '2', code: 'SUMMER15', discountType: 'percentage', discountValue: 15, minPurchase: 100, maxDiscount: 30, usageLimit: 50, perUserLimit: 1, used: 12, validFrom: '2026-06-01', validUntil: '2026-08-31', status: 'active', description: 'Summer sale promotion' },
  { id: '3', code: 'FLAT5', discountType: 'fixed', discountValue: 5, minPurchase: 30, maxDiscount: 5, usageLimit: 200, perUserLimit: 3, used: 87, validFrom: '2026-01-01', validUntil: '2026-06-30', status: 'expired', description: 'Flat $5 off any order over $30' },
]

const statusColors: Record<string, string> = { active: 'bg-green-500/15 text-green-400', expired: 'bg-slate-500/15 text-slate-400', disabled: 'bg-red-500/15 text-red-400' }

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>(initialVouchers)
  const [modalOpen, setModalOpen] = useState(false)

  const handleAdd = (data: Omit<Voucher, 'id' | 'used'>) => {
    setVouchers([{ ...data, id: `v-${Date.now()}`, used: 0 }, ...vouchers])
    setModalOpen(false)
  }

  const deleteVoucher = (id: string) => setVouchers(vouchers.filter((v) => v.id !== id))

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" /></svg>
        </div>
        <h1 className="text-xl font-semibold text-white">Voucher Management</h1>
        <button onClick={() => setModalOpen(true)} className="ml-auto rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">+ Add Voucher</button>
      </div>

      <p className="mt-3 text-sm text-slate-500">{vouchers.length} vouchers</p>

      <div className="mt-3 overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-700/50 bg-slate-800/60">
            <tr>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Code</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Discount</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Min Purchase</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Usage</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Valid Until</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {vouchers.map((v) => (
              <tr key={v.id} className="transition-colors hover:bg-slate-700/20">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-400">{v.code}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-300">{v.discountType === 'percentage' ? `${v.discountValue}%` : `$${v.discountValue}`}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-400">${v.minPurchase}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-400">{v.used}/{v.usageLimit === 999 ? '∞' : v.usageLimit}</td>
                <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{v.validUntil}</td>
                <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${statusColors[v.status]}`}>{v.status}</span></td>
                <td className="px-4 py-3"><button onClick={() => deleteVoucher(v.id)} className="flex h-7 w-7 items-center justify-center rounded bg-red-500/10 text-red-400 transition-colors hover:bg-red-500/20"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 font-mono text-[10px] text-slate-600">Showing {vouchers.length} vouchers</p>

      {modalOpen && <VoucherModal onSave={handleAdd} onClose={() => setModalOpen(false)} />}
    </div>
  )
}

function VoucherModal({ onSave, onClose }: { onSave: (data: Omit<Voucher, 'id' | 'used'>) => void; onClose: () => void }) {
  const [code, setCode] = useState('')
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [minPurchase, setMinPurchase] = useState('0')
  const [maxDiscount, setMaxDiscount] = useState('')
  const [usageLimit, setUsageLimit] = useState('')
  const [perUserLimit, setPerUserLimit] = useState('1')
  const [validFrom, setValidFrom] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [status, setStatus] = useState<'active' | 'expired' | 'disabled'>('active')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) { setError('Voucher code is required.'); return }
    if (!discountValue || Number(discountValue) <= 0) { setError('Discount value is required.'); return }
    if (!validFrom || !validUntil) { setError('Valid dates are required.'); return }
    setError('')
    onSave({
      code: code.toUpperCase().trim(),
      discountType,
      discountValue: Number(discountValue),
      minPurchase: Number(minPurchase) || 0,
      maxDiscount: Number(maxDiscount) || 999,
      usageLimit: Number(usageLimit) || 999,
      perUserLimit: Number(perUserLimit) || 1,
      validFrom,
      validUntil,
      status,
      description: description.trim(),
    })
  }

  const iClass = 'w-full rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-12 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border border-slate-700/50 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/50 px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" /></svg>
            Add New Voucher
          </h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-800 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>

        {error && <div className="mx-6 mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* Voucher Code */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Voucher Code <span className="text-red-400">*</span></label>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="E.G., SUMMER2024" className={`font-mono uppercase ${iClass}`} />
            <p className="mt-1 text-[10px] text-slate-600">Unique code customers will use at checkout</p>
          </div>

          {/* Discount Type + Value */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Discount Type <span className="text-red-400">*</span></label>
              <select value={discountType} onChange={(e) => setDiscountType(e.target.value as any)} className={iClass}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Discount Value <span className="text-red-400">*</span></label>
              <input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder="0.00" className={`font-mono ${iClass}`} />
              <p className="mt-1 text-[10px] text-slate-600">Enter discount value</p>
            </div>
          </div>

          {/* Min Purchase + Max Discount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Minimum Purchase Amount ($)</label>
              <input type="number" value={minPurchase} onChange={(e) => setMinPurchase(e.target.value)} placeholder="0" className={`font-mono ${iClass}`} />
              <p className="mt-1 text-[10px] text-slate-600">Minimum cart value to use voucher</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Maximum Discount ($)</label>
              <input type="number" value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} placeholder="No limit" className={`font-mono ${iClass}`} />
              <p className="mt-1 text-[10px] text-slate-600">Cap for percentage discounts</p>
            </div>
          </div>

          {/* Usage Limit + Per User */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Total Usage Limit</label>
              <input type="number" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} placeholder="Unlimited" className={`font-mono ${iClass}`} />
              <p className="mt-1 text-[10px] text-slate-600">Maximum times voucher can be used</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Per User Limit</label>
              <input type="number" value={perUserLimit} onChange={(e) => setPerUserLimit(e.target.value)} placeholder="1" className={`font-mono ${iClass}`} />
              <p className="mt-1 text-[10px] text-slate-600">Times each user can use voucher</p>
            </div>
          </div>

          {/* Valid From + Until */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Valid From <span className="text-red-400">*</span></label>
              <input type="datetime-local" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className={iClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Valid Until <span className="text-red-400">*</span></label>
              <input type="datetime-local" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={iClass} />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Status <span className="text-red-400">*</span></label>
            <select value={status} onChange={(e) => setStatus(e.target.value as any)} className={iClass}>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Optional description for internal use" className={iClass} />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-700/50 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-700/50 px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200">Cancel</button>
            <button type="submit" className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
              Save Voucher
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
