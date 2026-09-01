'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface PackingSlipData {
  orderNumber: string
  customerName: string
  shippingAddress: string
  courierName: string
  courierEstimate: string
  items: { name: string; condition: string; quantity: number; serialNumber: string | null }[]
}

export default function PackingSlipPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>()
  const [slip, setSlip] = useState<PackingSlipData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orderNumber) return
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/orders/${orderNumber}/packing-slip`, { method: 'POST', credentials: 'include' })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setError(body.error || 'Order not found or packing slip could not be generated.')
          return
        }
        const body = await res.json()
        setSlip(body.data)
      } catch {
        setError('Packing slip generation failed. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [orderNumber])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-repixl-bg">
        <p className="text-sm text-repixl-muted">Generating packing slip…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-repixl-bg p-8">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-4 text-center">
          <p className="font-semibold text-red-400">Packing slip could not be generated</p>
          <p className="mt-1 text-sm text-red-400/80">{error}</p>
        </div>
        <Link href="/admin/orders" className="text-sm text-repixl-muted hover:text-repixl-text-light">← Back to Orders</Link>
      </div>
    )
  }

  if (!slip) return null

  return (
    <>
      <div className="no-print mb-4 flex items-center justify-between px-4 pt-4">
        <Link href="/admin/orders" className="text-sm text-repixl-muted hover:text-repixl-text-light">← Back to Orders</Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg bg-repixl-red px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect width="12" height="8" x="6" y="14" /></svg>
          Print Packing Slip
        </button>
      </div>

      <div className="packing-slip-doc mx-auto max-w-[760px] bg-white p-10 text-gray-900 shadow-xl print:mx-0 print:max-w-none print:shadow-none">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between border-b-2 border-gray-900 pb-4">
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-gray-900">RePXL</h1>
            <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Packing Slip</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm font-bold text-gray-900">#{slip.orderNumber}</p>
          </div>
        </div>

        {/* Ship to + courier */}
        <div className="mb-6 grid grid-cols-2 gap-6">
          <div>
            <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-gray-500">Ship To</p>
            <p className="font-semibold text-gray-900">{slip.customerName}</p>
            <p className="mt-0.5 text-sm text-gray-700" style={{ whiteSpace: 'pre-line' }}>{slip.shippingAddress}</p>
          </div>
          <div>
            <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-gray-500">Courier</p>
            <p className="font-semibold text-gray-900">{slip.courierName}</p>
            <p className="text-sm text-gray-600">{slip.courierEstimate}</p>
          </div>
        </div>

        {/* Items — NO prices/totals */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="py-2 text-left font-mono text-[9px] uppercase tracking-wider text-gray-500">Item</th>
              <th className="py-2 text-left font-mono text-[9px] uppercase tracking-wider text-gray-500">Condition</th>
              <th className="py-2 text-left font-mono text-[9px] uppercase tracking-wider text-gray-500">Serial #</th>
              <th className="py-2 text-right font-mono text-[9px] uppercase tracking-wider text-gray-500">Qty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {slip.items.map((item, i) => (
              <tr key={i}>
                <td className="py-3 font-medium text-gray-900">{item.name}</td>
                <td className="py-3 text-gray-600">{item.condition.charAt(0).toUpperCase() + item.condition.slice(1)}</td>
                <td className="py-3 font-mono text-xs text-gray-600">
                  {item.serialNumber ? item.serialNumber : <span className="italic text-gray-400">not recorded</span>}
                </td>
                <td className="py-3 text-right font-mono font-semibold text-gray-900">{item.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 border-t border-gray-200 pt-4 text-center">
          <p className="font-mono text-[9px] text-gray-400">RePXL · Condition-graded · Serial-verified</p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .packing-slip-doc {
            margin: 0 !important;
            padding: 10mm !important;
            box-shadow: none !important;
            max-width: none !important;
            background: white !important;
          }
          @page { margin: 10mm; size: A4; }
          body { background: white !important; }
        }
      `}</style>
    </>
  )
}
