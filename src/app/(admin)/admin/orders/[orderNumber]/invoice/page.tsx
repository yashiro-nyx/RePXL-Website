'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface InvoiceData {
  orderNumber: string
  orderDate: string
  customerName: string
  shippingAddress: string
  items: { name: string; condition: string; unitPrice: number; quantity: number; lineSubtotal: number }[]
  subtotal: number
  shippingCost: number
  discount: number
  total: number
  currency: string
  paymentMethod: string
}

export default function InvoicePage() {
  const { orderNumber } = useParams<{ orderNumber: string }>()
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orderNumber) return
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/orders/${orderNumber}/invoice`, { method: 'POST', credentials: 'include' })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setError(body.error || 'Order not found or invoice generation failed.')
          return
        }
        const body = await res.json()
        setInvoice(body.data)
      } catch {
        setError('Invoice generation failed. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [orderNumber])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-repixl-bg">
        <p className="text-sm text-repixl-muted">Generating invoice…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-repixl-bg p-8">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-4 text-center">
          <p className="font-semibold text-red-400">Invoice generation failed</p>
          <p className="mt-1 text-sm text-red-400/80">{error}</p>
        </div>
        <Link href={`/admin/orders`} className="text-sm text-repixl-muted hover:text-repixl-text-light">← Back to Orders</Link>
      </div>
    )
  }

  if (!invoice) return null

  const fmt = (n: number) => `${invoice.currency || '$'}${n.toFixed(2)}`

  return (
    <>
      {/* Print button — hidden when printing */}
      <div className="no-print mb-4 flex items-center justify-between px-4 pt-4">
        <Link href="/admin/orders" className="text-sm text-repixl-muted hover:text-repixl-text-light">← Back to Orders</Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg bg-repixl-red px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect width="12" height="8" x="6" y="14" /></svg>
          Print Invoice
        </button>
      </div>

      {/* A4/Letter printable document */}
      <div className="invoice-document mx-auto max-w-[760px] bg-white p-10 text-gray-900 shadow-xl print:mx-0 print:max-w-none print:shadow-none">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between border-b border-gray-200 pb-6">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-gray-900">RePXL</h1>
            <p className="mt-0.5 font-mono text-xs uppercase tracking-widest text-gray-500">Vintage Digital Cameras</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-gray-800">INVOICE</p>
            <p className="mt-1 font-mono text-sm text-gray-600">#{invoice.orderNumber}</p>
            <p className="font-mono text-xs text-gray-500">{invoice.orderDate}</p>
          </div>
        </div>

        {/* Bill to / Ship to */}
        <div className="mb-8 grid grid-cols-2 gap-8">
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-gray-500">Bill To</p>
            <p className="font-semibold text-gray-900">{invoice.customerName}</p>
          </div>
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-gray-500">Ship To</p>
            <p className="text-sm text-gray-700" style={{ whiteSpace: 'pre-line' }}>{invoice.shippingAddress}</p>
          </div>
        </div>

        {/* Items table */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="py-3 text-left font-mono text-[10px] uppercase tracking-wider text-gray-500">Item</th>
              <th className="py-3 text-left font-mono text-[10px] uppercase tracking-wider text-gray-500">Condition</th>
              <th className="py-3 text-right font-mono text-[10px] uppercase tracking-wider text-gray-500">Unit Price</th>
              <th className="py-3 text-right font-mono text-[10px] uppercase tracking-wider text-gray-500">Qty</th>
              <th className="py-3 text-right font-mono text-[10px] uppercase tracking-wider text-gray-500">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoice.items.map((item, i) => (
              <tr key={i}>
                <td className="py-3 font-medium text-gray-900">{item.name}</td>
                <td className="py-3 text-gray-600">{item.condition}</td>
                <td className="py-3 text-right font-mono text-gray-700">{fmt(item.unitPrice)}</td>
                <td className="py-3 text-right font-mono text-gray-700">{item.quantity}</td>
                <td className="py-3 text-right font-mono font-semibold text-gray-900">{fmt(item.lineSubtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-6 border-t border-gray-200 pt-4">
          <div className="ml-auto max-w-xs space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-mono text-gray-900">{fmt(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Shipping</span>
              <span className="font-mono text-gray-900">{fmt(invoice.shippingCost)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Discount</span>
                <span className="font-mono text-green-700">−{fmt(invoice.discount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-300 pt-2 text-base font-bold">
              <span className="text-gray-900">Total</span>
              <span className="font-mono text-gray-900">{fmt(invoice.total)}</span>
            </div>
          </div>
        </div>

        {/* Payment info */}
        <div className="mt-8 border-t border-gray-200 pt-4 text-center">
          <p className="font-mono text-[10px] text-gray-400">Payment method: {invoice.paymentMethod}</p>
          <p className="mt-1 font-mono text-[10px] text-gray-400">Thank you for shopping with RePXL · Condition-graded · Serial-verified</p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .invoice-document {
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
