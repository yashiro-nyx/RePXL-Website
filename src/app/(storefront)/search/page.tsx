'use client'

import { Suspense, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Container } from '@/components/layout/Container'
import { ProductCard } from '@/components/product/ProductCard'
import { useProductStore } from '@/stores/productStore'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui'

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get('q') ?? ''
  const allProducts = useProductStore((s) => s.products)
  const loading = useProductStore((s) => s.loading)
  const error = useProductStore((s) => s.error)

  useEffect(() => { useProductStore.getState().hydrate() }, [])

  const results = useMemo(() => {
    const products = allProducts.filter((p) => p.status === 'active')
    return query.trim()
      ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.brand.toLowerCase().includes(query.toLowerCase()) ||
          p.series.toLowerCase().includes(query.toLowerCase())
      )
      : []
  }, [allProducts, query])

  const hasQuery = query.trim().length > 0
  const stillLoading = loading || (hasQuery && allProducts.length === 0 && !error)

  return (
    <div className="min-h-screen pt-24 pb-16">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-display-md text-repixl-text-light">
          Search results
          </h1>
          <Link href="/products" className="rounded px-2 py-2 text-sm text-repixl-muted transition-colors hover:text-repixl-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50">
            Browse all cameras
          </Link>
        </div>
        {query && (
          <p className="mt-1 text-sm text-repixl-muted" aria-live="polite">
            {results.length} {results.length === 1 ? 'result' : 'results'} for &ldquo;{query}&rdquo;
          </p>
        )}

        {!hasQuery && (
          <div className="mt-12 max-w-xl border-l border-repixl-red/50 pl-5">
            <p className="font-display text-display-sm text-repixl-text-light">Find your next camera</p>
            <p className="mt-2 text-sm leading-relaxed text-repixl-muted">
              Search by camera name, brand, or series. You can also browse the full collection.
            </p>
            <Button type="button" variant="secondary" size="sm" className="mt-5" onClick={() => router.push('/products')}>
              Browse cameras
            </Button>
          </div>
        )}

        {stillLoading && (
          <div className="mt-12 rounded-xl border border-repixl-muted/15 bg-repixl-charcoal/30 px-6 py-10 text-center" role="status" aria-live="polite">
            <p className="font-display text-lg text-repixl-text-light">Loading cameras…</p>
            <p className="mt-1 text-sm text-repixl-muted">Preparing the collection for search.</p>
          </div>
        )}

        {!stillLoading && error && (
          <div className="mt-12 rounded-xl border border-repixl-red/30 bg-repixl-red/5 px-6 py-10 text-center" role="alert">
            <p className="font-display text-display-sm text-repixl-text-light">Search is unavailable right now</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-repixl-muted">Please try again, or browse the camera collection while we reconnect.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button type="button" variant="primary" size="sm" onClick={() => { void useProductStore.getState().hydrate() }}>
                Try again
              </Button>
              <Link href="/products" className="inline-flex min-h-11 items-center rounded-md border border-repixl-muted/50 px-4 text-sm text-repixl-text-light transition-colors hover:border-repixl-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50">
                Browse cameras
              </Link>
            </div>
          </div>
        )}

        {!stillLoading && !error && hasQuery && results.length === 0 && (
          <div className="mt-16 flex flex-col items-center rounded-xl border border-dashed border-repixl-muted/20 px-6 py-14 text-center">
            <p className="font-display text-display-sm text-repixl-text-light/70">No cameras match “{query}”</p>
            <p className="mt-2 max-w-md text-sm text-repixl-muted">
              Check the spelling, try a brand or series name, or browse the full collection.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button type="button" variant="secondary" size="sm" onClick={() => router.push('/search')}>
                Clear search
              </Button>
              <Link href="/products" className="inline-flex min-h-11 items-center rounded-md border border-repixl-muted/50 px-4 text-sm text-repixl-text-light transition-colors hover:border-repixl-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50">
                Browse cameras
              </Link>
            </div>
          </div>
        )}

        {!stillLoading && !error && results.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        )}
      </Container>
    </div>
  )
}

export default function SearchPage() {
  return (
    <>
        <Suspense fallback={<div className="min-h-screen pt-24 pb-16"><Container><div className="rounded-xl border border-repixl-muted/15 bg-repixl-charcoal/30 px-6 py-10 text-center" role="status" aria-live="polite"><p className="font-display text-lg text-repixl-text-light">Loading search…</p></div></Container></div>}>
        <SearchContent />
      </Suspense>
      <Footer />
    </>
  )
}
