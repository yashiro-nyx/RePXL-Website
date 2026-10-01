'use client'

import Image from 'next/image'
import { brandRepresentativeImages } from '@/lib/catalog-filters'
import type { Product } from '@/types'

/**
 * "Shop cameras by brand" — a centered, premium brand-discovery section.
 *
 * - Each brand tile features the SAME existing product image reference already
 *   rendered by RePXL product cards. The representative image is chosen
 *   programmatically from the products belonging to that brand
 *   (see `brandRepresentativeImages`), so NO new/duplicate brand-sample assets
 *   are created and no image is opened or analyzed. We trust the product→brand
 *   relationship established by the catalog data.
 * - Renders only brands present in the catalog.
 * - Centered visual row/grid on desktop; a horizontally scrollable rail on
 *   small screens.
 * - Single-select against the shared (centralized) brand filter. Clicking a
 *   brand filters the catalog to that brand.
 * - "All Cameras" is a separate reset/view-all control — it reads as a control,
 *   not a fake brand.
 * - Restrained selected state (accent underline + tinted tile + ring), not a
 *   heavy red border. Keyboard accessible with aria-pressed.
 */
export function BrandSelector({
  brands,
  products,
  selectedBrand,
  onSelectBrand,
}: {
  brands: string[]
  /** Active catalog products — used to derive each brand's representative image. */
  products: Product[]
  /** The single selected brand, or null for "All Cameras". */
  selectedBrand: string | null
  onSelectBrand: (brand: string | null) => void
}) {
  if (brands.length === 0) return null

  const images = brandRepresentativeImages(products, brands)

  return (
    <section aria-label="Shop cameras by brand" className="mb-14 text-center">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.3em] text-repixl-muted">Shop cameras by brand</h2>
      <div className="mx-auto mt-2 h-px w-10 bg-repixl-red/50" aria-hidden="true" />

      {/* Centered grid on md+, horizontal rail on small screens */}
      <div
        role="group"
        aria-label="Filter cameras by brand"
        className="mt-7 flex snap-x justify-start gap-4 overflow-x-auto px-1 pb-2 md:flex-wrap md:justify-center md:overflow-visible md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <AllCamerasTile selected={selectedBrand === null} onClick={() => onSelectBrand(null)} />
        {brands.map((brand) => (
          <BrandTile
            key={brand}
            label={brand}
            image={images[brand] ?? null}
            selected={selectedBrand === brand}
            onClick={() => onSelectBrand(brand)}
          />
        ))}
      </div>
    </section>
  )
}

const TILE =
  'group relative flex h-[132px] w-[132px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50 focus-visible:ring-offset-2 focus-visible:ring-offset-repixl-bg'

function BrandTile({
  label,
  image,
  selected,
  onClick,
}: {
  label: string
  /** Existing RePXL product image reference representing this brand (or null). */
  image: string | null
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={selected ? `${label} (selected)` : `Show ${label} cameras`}
      className={[
        TILE,
        selected
          ? 'bg-repixl-red/[0.07] shadow-[inset_0_0_0_1px_rgba(194,44,44,0.35)]'
          : 'bg-repixl-charcoal/60 hover:bg-repixl-charcoal',
      ].join(' ')}
    >
      {/* Representative product image well — reuses an existing catalog asset */}
      <span className="flex h-[72px] w-full items-center justify-center px-4">
        {image ? (
          <Image
            src={image}
            alt=""
            width={120}
            height={90}
            sizes="120px"
            className={[
              'max-h-[68px] w-auto object-contain transition-all duration-200',
              selected
                ? 'opacity-100 drop-shadow-[0_6px_14px_rgba(0,0,0,0.5)]'
                : 'opacity-85 drop-shadow-[0_5px_12px_rgba(0,0,0,0.4)] group-hover:opacity-100 group-hover:-translate-y-0.5',
            ].join(' ')}
          />
        ) : (
          <span className={`font-display text-lg font-semibold ${selected ? 'text-repixl-text-light' : 'text-repixl-text-light/85'}`}>
            {label}
          </span>
        )}
      </span>

      {/* Brand name */}
      <span className={`font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${selected ? 'text-repixl-text-light' : 'text-repixl-muted'}`}>
        {label}
      </span>

      {/* Restrained selected accent — a short underline, not a big border */}
      <span
        className={[
          'absolute bottom-3 h-0.5 rounded-full bg-repixl-red transition-all duration-200',
          selected ? 'w-6 opacity-100' : 'w-0 opacity-0',
        ].join(' ')}
        aria-hidden="true"
      />
    </button>
  )
}

function AllCamerasTile({ selected, onClick }: { selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={selected ? 'All cameras (selected)' : 'Show all cameras'}
      className={[
        TILE,
        selected
          ? 'bg-repixl-red/[0.07] shadow-[inset_0_0_0_1px_rgba(194,44,44,0.35)]'
          : 'bg-repixl-charcoal/60 hover:bg-repixl-charcoal',
      ].join(' ')}
    >
      <span className="flex h-[72px] w-full items-center justify-center text-repixl-text-light/85" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="8" height="7" rx="1.5" /><rect x="13" y="4" width="8" height="7" rx="1.5" />
          <rect x="3" y="13" width="8" height="7" rx="1.5" /><rect x="13" y="13" width="8" height="7" rx="1.5" />
        </svg>
      </span>
      <span className={`font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${selected ? 'text-repixl-text-light' : 'text-repixl-muted'}`}>
        All Cameras
      </span>
      <span
        className={['absolute bottom-3 h-0.5 rounded-full bg-repixl-red transition-all duration-200', selected ? 'w-6 opacity-100' : 'w-0 opacity-0'].join(' ')}
        aria-hidden="true"
      />
    </button>
  )
}
