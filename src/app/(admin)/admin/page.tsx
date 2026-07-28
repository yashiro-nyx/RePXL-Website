'use client'

import { useEffect } from 'react'
import { useProductStore } from '@/stores/productStore'
import { useOrderHistoryStore } from '@/stores/orderHistoryStore'

const LOW_STOCK_THRESHOLD = 1

// Icon components (Lucide-style SVGs)
const icons = {
  chart: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>,
  camera: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>,
  box: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>,
  cart: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" /></svg>,
  dollar: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
  users: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  alert: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12.01" y1="17" y2="17" /></svg>,
  trophy: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>,
  list: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" /><line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" /></svg>,
  check: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>,
}

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
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">{icons.chart}</div>
        <div>
          <h1 className="text-xl font-semibold text-white">Dashboard Overview</h1>
          <p className="font-mono text-[10px] text-slate-500">Last updated: Just now</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={icons.camera} label="Total Cameras" value={totalCameras} sub="active" color="border-blue-500" iconColor="text-blue-400" />
        <StatCard icon={icons.box} label="Total Stock" value={totalStock} sub="units available" color="border-cyan-500" iconColor="text-cyan-400" />
        <StatCard icon={icons.cart} label="Total Orders" value={totalOrders} sub={`${pendingOrders} pending`} color="border-emerald-500" iconColor="text-emerald-400" />
        <StatCard icon={icons.dollar} label="Revenue" value={`$${revenue}`} sub="all time sales" color="border-green-500" iconColor="text-green-400" />
        <StatCard icon={icons.users} label="Registered Users" value="2,400+" sub="customer accounts" color="border-purple-500" iconColor="text-purple-400" />
        <StatCard icon={icons.alert} label="Low Stock Alert" value={lowStockItems.length + outOfStock.length} sub="items need reorder" color="border-red-500" iconColor="text-red-400" accent />
      </div>

      {/* Two-column: Brand breakdown + Orders by Status */}
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Cameras by Brand */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-5 backdrop-blur-sm transition-shadow hover:shadow-lg hover:shadow-slate-900/50">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-blue-500/10 text-blue-400">{icons.camera}</span>
            Cameras by Brand
          </h2>
          <div className="mt-4 space-y-3">
            {brands.map((b) => {
              const pct = totalStock > 0 ? (b.stock / totalStock) * 100 : 0
              return (
                <div key={b.brand} className="group rounded-lg px-3 py-2 transition-colors hover:bg-slate-700/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">{b.brand}</span>
                    <span className="font-mono text-sm font-semibold text-slate-200">{b.stock}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300 group-hover:opacity-90" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Orders by Status */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-5 backdrop-blur-sm transition-shadow hover:shadow-lg hover:shadow-slate-900/50">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500/10 text-emerald-400">{icons.list}</span>
            Orders by Status
          </h2>
          {totalOrders === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No orders to display yet.</p>
          ) : (
            <div className="mt-4 space-y-4">
              <StatusRow label="Pending" count={statusCounts.Processing} total={totalOrders} color="bg-amber-500" dotColor="bg-amber-400" />
              <StatusRow label="Processing" count={statusCounts.Processing} total={totalOrders} color="bg-blue-500" dotColor="bg-blue-400" />
              <StatusRow label="Shipped" count={statusCounts.Shipped} total={totalOrders} color="bg-cyan-500" dotColor="bg-cyan-400" />
              <StatusRow label="Completed" count={statusCounts.Delivered} total={totalOrders} color="bg-green-500" dotColor="bg-green-400" />
              <StatusRow label="Cancelled" count={0} total={totalOrders} color="bg-red-500" dotColor="bg-red-400" />
            </div>
          )}
        </div>
      </div>

      {/* Two-column: Top Selling + Inventory Alerts */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Top Selling */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-5 backdrop-blur-sm transition-shadow hover:shadow-lg hover:shadow-slate-900/50">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-amber-500/10 text-amber-400">{icons.trophy}</span>
            Top Selling Cameras
          </h2>
          {topSelling.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No sales data available yet.</p>
          ) : (
            <div className="mt-4">
              <div className="flex items-center border-b border-slate-700/50 pb-2">
                <span className="w-8 font-mono text-[9px] uppercase tracking-wider text-slate-500">#</span>
                <span className="flex-1 font-mono text-[9px] uppercase tracking-wider text-slate-500">Title</span>
                <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500">Sold</span>
              </div>
              <div className="mt-1 divide-y divide-slate-700/30">
                {topSelling.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-3 rounded-lg py-2.5 transition-colors hover:bg-slate-700/30">
                    <span className="w-5 text-center font-mono text-xs font-bold text-amber-400">{i + 1}</span>
                    <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded bg-slate-700">
                      {item.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt="" className="h-full w-full object-contain" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-200">{item.name}</p>
                      <p className="font-mono text-[10px] text-slate-500">{item.brand}</p>
                    </div>
                    <span className="font-mono text-sm font-semibold text-emerald-400">{item.units} sold</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Inventory Alerts */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-5 backdrop-blur-sm transition-shadow hover:shadow-lg hover:shadow-slate-900/50">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-red-500/10 text-red-400">{icons.alert}</span>
            Inventory Alerts
          </h2>
          {lowStockItems.length === 0 && outOfStock.length === 0 ? (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-3">
              <span className="text-emerald-400">{icons.check}</span>
              <p className="text-sm text-emerald-400">All stock levels are healthy.</p>
            </div>
          ) : (
            <div className="mt-4">
              <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
                <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500">Title</span>
                <div className="flex gap-10">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500">Stock</span>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500">Status</span>
                </div>
              </div>
              <div className="mt-1 divide-y divide-slate-700/30">
                {outOfStock.map((p) => (
                  <div key={p.slug} className="flex items-center justify-between rounded-lg py-2.5 transition-colors hover:bg-slate-700/30">
                    <span className="text-sm text-slate-200">{p.name}</span>
                    <div className="flex items-center gap-6">
                      <span className="font-mono text-sm font-bold text-red-400">0</span>
                      <span className="rounded bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">Out of Stock</span>
                    </div>
                  </div>
                ))}
                {lowStockItems.map((p) => (
                  <div key={p.slug} className="flex items-center justify-between rounded-lg py-2.5 transition-colors hover:bg-slate-700/30">
                    <span className="text-sm text-slate-200">{p.name}</span>
                    <div className="flex items-center gap-6">
                      <span className="font-mono text-sm font-bold text-amber-400">{p.stock}</span>
                      <span className="rounded bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">Low Stock</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, color, iconColor, accent }: { icon: React.ReactNode; label: string; value: string | number; sub: string; color: string; iconColor: string; accent?: boolean }) {
  return (
    <div className={`group relative overflow-hidden rounded-xl border-l-4 ${color} border border-slate-700/50 bg-slate-800/40 p-4 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/50`}>
      <p className="font-mono text-[9px] uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-2 font-mono text-2xl font-bold ${accent ? 'text-red-400' : 'text-white'}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>
      <span className={`absolute right-3 top-3 opacity-40 transition-opacity group-hover:opacity-70 ${iconColor}`}>{icon}</span>
    </div>
  )
}

function StatusRow({ label, count, total, color, dotColor }: { label: string; count: number; total: number; color: string; dotColor: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="group rounded-lg px-2 py-1 transition-colors hover:bg-slate-700/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${dotColor}`} />
          <span className="text-sm text-slate-300">{label}</span>
        </div>
        <span className={`font-mono text-sm font-bold ${count > 0 ? 'text-slate-200' : 'text-slate-600'}`}>{count}</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
        <div className={`h-full rounded-full ${color} transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
