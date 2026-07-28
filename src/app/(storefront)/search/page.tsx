'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Container } from '@/components/layout/Container'
import { ProductCard } from '@/components/product/ProductCard'
import { useProductStore } from '@/stores/productStore'

export default function SearchPage() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const allProducts = useProductStore((s) => s.products)

  useEffect(() => { useProductStore.getState().hydrate() }, [])

  const products = allProducts.filter((p) => p.status === 'active')
  const results = query.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.brand.toLowerCase().includes(query.toLowerCase()) ||
          p.series.toLowerCase().includes(query.toLowerCase())
      )
    : []

  return (
    <div className="min-h-screen bg-repixl-bg pt-24 pb-16">
      <Container>
        <h1 className="font-display text-display-md text-repixl-text-light">
          Search results
        </h1>
        {query && (
          <p className="mt-1 text-sm text-repixl-muted">
            {results.length} {results.length === 1 ? 'result' : 'results'} for &ldquo;{query}&rdquo;
          </p>
        )}

        {!query && (
          <p className="mt-4 text-sm text-repixl-text-light/60">
            Enter a search term to find cameras.
          </p>
        )}

        {query && results.length === 0 && (
          <div className="mt-16 flex flex-col items-center text-center">
            <p className="font-display text-display-sm text-repixl-text-light/60">
              No cameras found
            </p>
            <p className="mt-1 text-sm text-repixl-muted">
              Try a different search term — brand, model, or series name.
            </p>
          </div>
        )}

        {results.length > 0 && (
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
