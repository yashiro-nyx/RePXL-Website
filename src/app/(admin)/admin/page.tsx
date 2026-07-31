'use client'

import { useEffect } from 'react'
import { useProductStore } from '@/stores/productStore'
import { useOrderHistoryStore } from '@/stores/orderHistoryStore'

const LOW_STOCK_THRESHOLD = 1

export default function AdminDashboardPage() {
  const products = useProductStore((s) => s.products)
  const orders = useOrderHistoryStore((s) => s.orders)

  useEffect(() => {
    useProductStore.getState().hydrate()
    useOrderHistoryStore.getState().hydrate()
  }, [])

  const totalCameras = products.filter((p) => p.status === 'active').length
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0)
  const totalOrders = orders.length
  const pendingOrders = orders.filter((o) => o.status === 'Processing').length
  const revenue = orders.reduce((sum, o) => sum + o.total, 0)
  const lowStockItems = products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD)
  const outOfStock = products.filter((p) => p.stock === 0)

  const brands = Array.from(new Set(products.map((p) => p.brand))).map((brand) => ({
    brand,
    count: products.filter((p) => p.brand === brand && p.status === 'active').length,
    stock: products.filter((p) => p.brand === brand).reduce((s, p) => s + p.stock, 0),
  }))

  const statusCounts = {
    Processing: orders.filter((o) => o.status === 'Processing').length,
    Shipped: orders.filter((o) => o.status === 'Shipped').length,
    Delivered: orders.filter((o) => o.status === 'Delivered').length,
  }

  const salesMap: Record<string, number> = {}
  orders.forEach((o) => o.items.forEach((item) => { salesMap[item.slug] = (salesMap[item.slug] || 0) + 1 }))
  const topSelling = Object.entries(salesMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([slug, units]) => {
    const product = products.find((p) => p.slug === slug)
    return { name: product?.name || slug, brand: product?.brand || '—', image: product?.image || '', units }
  })

  return (
    <div>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-repixl-text-dark">Dashboard</h1>
        <p className="mt-0.5 text-sm text-gray-500">Overview of your store performance and inventory.</p>
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Total Cameras" value={totalCameras} sub={`${products.filter((p) => p.stock > 0).length} in stock`} accent />
        <StatCard label="Total Stock" value={totalStock} sub="units available" />
        <StatCard label="Total Orders" value={totalOrders} sub={`${pendingOrders} pending`} />
        <StatCard label="Revenue" value={`$${revenue}`} sub="all time sales" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Registered Users" value="2,400+" sub="customer accounts" />
        <StatCard label="Low Stock Alert" value={lowStockItems.length + outOfStock.length} sub="items need reorder" alert />
        <StatCard label="Pending Orders" value={pendingOrders} sub="awaiting shipment" />
        <StatCard label="Brands" value={brands.length} sub="active brands" />
      </div>

      {/* Two column */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Cameras by Brand */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-repixl-text-dark">Cameras by Brand</h2>
          <div className="mt-4 space-y-3">
            {brands.map((b) => {
              const pct = totalStock > 0 ? (b.stock / totalStock) * 100 : 0
              return (
                <div key={b.brand}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{b.brand}</span>
                    <span className="font-mono text-xs font-semibold text-gray-900">{b.stock}</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-repixl-red to-repixl-rose transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Orders by Status */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-repixl-text-dark">Orders by Status</h2>
          {totalOrders === 0 ? (
            <p className="mt-4 text-sm text-gray-400">No orders to display yet.</p>
          ) : (
            <div className="mt-4 space-y-4">
              <StatusRow label="Pending" count={statusCounts.Processing} total={totalOrders} color="bg-amber-500" />
              <StatusRow label="Processing" count={statusCounts.Processing} total={totalOrders} color="bg-blue-500" />
              <StatusRow label="Shipped" count={statusCounts.Shipped} total={totalOrders} color="bg-cyan-500" />
              <StatusRow label="Delivered" count={statusCounts.Delivered} total={totalOrders} color="bg-green-500" />
              <StatusRow label="Cancelled" count={0} total={totalOrders} color="bg-red-400" />
            </div>
          )}
        </div>
      </div>

      {/* Two column bottom */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Top Selling */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-repixl-text-dark">Top Selling Cameras</h2>
          {topSelling.length === 0 ? (
            <p className="mt-4 text-sm text-gray-400">No sales data available yet.</p>
          ) : (
            <div className="mt-4 divide-y divide-gray-100">
              {topSelling.map((item, i) => (
                <div key={item.name} className="flex items-center gap-3 py-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-repixl-red/10 text-[10px] font-bold text-repixl-red">{i + 1}</span>
                  <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {item.image && <img src={item.image} alt="" className="h-full w-full object-contain" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{item.name}</p>
                    <p className="text-[10px] text-gray-400">{item.brand}</p>
                  </div>
                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-600">{item.units} sold</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inventory Alerts */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-repixl-text-dark">Inventory Alerts</h2>
          {lowStockItems.length === 0 && outOfStock.length === 0 ? (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M20 6 9 17l-5-5" /></svg>
              <p className="text-sm font-medium text-green-700">All stock levels are healthy.</p>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-gray-100">
              {outOfStock.map((p) => (
                <div key={p.slug} className="flex items-center justify-between py-3">
                  <span className="text-sm text-gray-800">{p.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-red-500">0</span>
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">Out of Stock</span>
                  </div>
                </div>
              ))}
              {lowStockItems.map((p) => (
                <div key={p.slug} className="flex items-center justify-between py-3">
                  <span className="text-sm text-gray-800">{p.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-amber-500">{p.stock}</span>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">Low Stock</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, accent, alert }: { label: string; value: string | number; sub: string; accent?: boolean; alert?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md ${accent ? 'border-repixl-red/20 bg-gradient-to-br from-repixl-red to-repixl-red/80 text-white' : alert ? 'border-red-200 bg-white' : 'border-gray-200 bg-white'}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-wider ${accent ? 'text-white/70' : 'text-gray-400'}`}>{label}</p>
      <p className={`mt-2 font-display text-2xl font-bold ${accent ? 'text-white' : alert ? 'text-red-500' : 'text-repixl-text-dark'}`}>{value}</p>
      <p className={`mt-0.5 text-xs ${accent ? 'text-white/60' : 'text-gray-400'}`}>{sub}</p>
    </div>
  )
}

function StatusRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-700">{label}</span>
        <span className="font-mono text-xs font-semibold text-gray-900">{count}</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
