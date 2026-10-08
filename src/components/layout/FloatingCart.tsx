'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCartStore } from '@/stores/cartStore'

export function FloatingCart() {
  const pathname = usePathname()
  const count = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0))

  if (!count || pathname === '/cart' || pathname === '/checkout') return null

  return <Link href="/cart" aria-label={`Open cart, ${count} ${count === 1 ? 'item' : 'items'}`} className="fixed inset-x-4 bottom-4 z-40 flex min-h-12 items-center justify-between rounded-full border border-repixl-red/60 bg-repixl-charcoal/95 px-5 py-3 text-sm font-medium text-repixl-text-light shadow-[0_12px_32px_rgba(0,0,0,0.45)] backdrop-blur-md transition-colors hover:bg-repixl-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red md:hidden"><span className="flex items-center gap-2"><span aria-hidden="true" className="flex h-6 min-w-6 items-center justify-center rounded-full bg-repixl-red px-1 font-mono text-[11px] text-white">{count}</span>View cart</span><span className="font-mono text-[10px] uppercase tracking-widest text-repixl-red">Ready when you are</span></Link>
}
