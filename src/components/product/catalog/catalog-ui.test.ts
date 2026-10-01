import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// Structural/contract tests (node-env, no DOM renderer — consistent with the
// repo's other UI tests). Filter/pagination LOGIC is covered by
// catalog-filters.test.ts.

const dir = 'src/components/product/catalog'
const page = readFileSync('src/app/(storefront)/products/page.tsx', 'utf8')
const brandSel = readFileSync(`${dir}/BrandSelector.tsx`, 'utf8')
const sidebar = readFileSync(`${dir}/FilterSidebar.tsx`, 'utf8')
const drawer = readFileSync(`${dir}/MobileFilterDrawer.tsx`, 'utf8')
const toolbar = readFileSync(`${dir}/CatalogToolbar.tsx`, 'utf8')
const chips = readFileSync(`${dir}/ActiveFilterChips.tsx`, 'utf8')
const slider = readFileSync(`${dir}/PriceRangeSlider.tsx`, 'utf8')
const sortbox = readFileSync(`${dir}/SortListbox.tsx`, 'utf8')
const pagination = readFileSync(`${dir}/Pagination.tsx`, 'utf8')

describe('Cameras page — composition & centralized logic', () => {
  it('composes the V2 catalog components (incl. Pagination)', () => {
    for (const c of ['<BrandSelector', '<CatalogToolbar', '<FilterSidebar', '<MobileFilterDrawer', '<ActiveFilterChips', '<CatalogEmptyState', '<Pagination', '<ProductCard']) {
      expect(page).toContain(c)
    }
  })
  it('uses the centralized filter + pagination module (no duplicated logic)', () => {
    expect(page).toContain("from '@/lib/catalog-filters'")
    expect(page).toContain('applyFilters')
    expect(page).toContain('sortProducts')
    expect(page).toContain('paginate')
    expect(page).toContain('priceBounds')
  })
  it('desktop sidebar and mobile drawer share the SAME FilterSidebar props', () => {
    expect(page).toContain('{...sidebarProps}')
    expect(drawer).toContain('<FilterSidebar {...sidebar} />')
  })
})

describe('Cameras page — FILTER → SORT → PAGINATE + URL page state', () => {
  it('paginates the filtered+sorted result set (not before filtering)', () => {
    // filteredSorted computed from applyFilters→sortProducts, then paginate().
    expect(page).toMatch(/filteredSorted[\s\S]*paginate\(filteredSorted/)
  })
  it('reflects page in the URL and resets to page 1 on filter/sort changes', () => {
    expect(page).toContain('writePageToUrl')
    expect(page).toContain("params.set('page'")
    expect(page).toContain('resetPage')
    expect(page).toContain('withReset')
  })
  it('scrolls to the results anchor on page change (not the top of the site)', () => {
    expect(page).toContain('resultsRef')
    expect(page).toContain('scrollIntoView')
  })
  it('reads an initial page from the ?page= query and clamps it', () => {
    expect(page).toContain("searchParams.get('page')")
    expect(page).toContain('clampPage')
  })
})

describe('Cameras page — preserved behavior (regression guards)', () => {
  it('keeps the from=home contextual Back button', () => {
    expect(page).toContain('hasHomeNavContext')
    expect(page).toContain('cameFromHome && <PageBackLink href="/" label="Home" />')
  })
  it('Clear All resets filters and preserves sort + from=home (URL only touches page)', () => {
    expect(page).toContain('const clearAll = withReset(() => setFilters(EMPTY_FILTERS))')
  })
  it('initializes the brand from the ?brand= query (promo deep link)', () => {
    expect(page).toContain("canonicalizeBrand(searchParams.get('brand')")
  })
  it('preserves wishlist/compare + product-detail links via the untouched ProductCard', () => {
    const card = readFileSync('src/components/product/ProductCard.tsx', 'utf8')
    expect(card).toContain('useWishlistStore')
    expect(card).toContain('/products/${product.slug}')
  })
})

describe('BrandSelector V2 — premium centered discovery (reuses product images)', () => {
  it('is a centered "Shop cameras by brand" section reusing EXISTING product images', () => {
    expect(brandSel).toContain('Shop cameras by brand')
    // Reuses the same product image references the cards use — derived per brand
    // from catalog data, not new brand-sample assets.
    expect(brandSel).toContain('brandRepresentativeImages')
    expect(brandSel).toContain('All Cameras')
    // No fabricated brand-sample assets.
    expect(brandSel).not.toContain('canon-sample')
    expect(brandSel).not.toContain('sony-sample')
    expect(brandSel).not.toContain('nikon-sample')
  })
  it('scrolls horizontally on small screens and centers on md+', () => {
    expect(brandSel).toContain('overflow-x-auto')
    expect(brandSel).toContain('md:justify-center')
  })
  it('uses a restrained selected accent (underline), not a big red border, and is a11y', () => {
    expect(brandSel).toContain('aria-pressed={selected}')
    expect(brandSel).toContain('bg-repixl-red') // thin accent underline
    expect(brandSel).not.toContain('border-repixl-red border-2')
  })
})

describe('FilterSidebar V2 — modular, counts, slider, Apply, Clear all', () => {
  it('renders lightweight sections (not one enclosing box)', () => {
    expect(sidebar).toContain('function Section')
    expect(sidebar).toContain('Availability')
    expect(sidebar).toContain('Price range')
    expect(sidebar).toContain('Customer rating')
  })
  it('offers the supported extra spec filters (Resolution + Release era)', () => {
    expect(sidebar).toContain('Resolution')
    expect(sidebar).toContain('Release era')
    expect(sidebar).toContain('megapixelOptions')
    expect(sidebar).toContain('eraOptions')
  })
  it('does NOT include a Brand section — brand is controlled by the BrandSelector', () => {
    // Brand filtering is centralized in the "Shop cameras by brand" selector,
    // so the sidebar must not offer a redundant Brand group.
    expect(sidebar).not.toContain('title="Brand"')
    expect(sidebar).not.toContain('onToggleBrand')
    expect(sidebar).not.toContain('brandCounts')
  })
  it('shows facet counts next to values', () => {
    expect(sidebar).toContain('conditionCounts')
    expect(sidebar).toContain('ratingCounts')
    expect(sidebar).toContain('megapixelCounts')
    expect(sidebar).toContain('eraCounts')
    expect(sidebar).toContain('function Count')
  })
  it('uses the dual-handle price slider + inputs and only commits on Apply', () => {
    expect(sidebar).toContain('<PriceRangeSlider')
    expect(sidebar).toContain('Apply Price')
    expect(sidebar).toContain('onApplyPrice')
    expect(sidebar).toContain('normalizePriceAgainstBounds')
    // Draft state is local; slider/input changes do not call onApplyPrice directly.
    expect(sidebar).toContain('setDraft')
  })
  it('Clear all sits beside the Filters heading and disables when inactive', () => {
    expect(sidebar).toContain('Clear all')
    expect(sidebar).toContain('disabled={!hasFilters}')
  })
})

describe('PriceRangeSlider — accessible dual-handle', () => {
  it('has two range inputs with independent min/max aria labels + value semantics', () => {
    expect(slider).toContain('aria-label="Minimum price"')
    expect(slider).toContain('aria-label="Maximum price"')
    expect(slider).toContain('aria-valuemin')
    expect(slider).toContain('aria-valuemax')
    expect(slider).toContain('aria-valuenow')
  })
  it('prevents the handles from crossing', () => {
    expect(slider).toContain('never cross the max handle')
    expect(slider).toContain('never cross the min handle')
  })
  it('is styled (not a raw native range) via the range-thumb class', () => {
    expect(slider).toContain('range-thumb')
    const css = readFileSync('src/app/globals.css', 'utf8')
    expect(css).toContain('.range-thumb::-webkit-slider-thumb')
  })
})

describe('SortListbox — custom accessible listbox (no native select)', () => {
  it('is a listbox with keyboard + click-outside + escape, not a <select>', () => {
    expect(sortbox).toContain('role="listbox"')
    expect(sortbox).toContain('aria-haspopup="listbox"')
    expect(sortbox).toContain('role="option"')
    expect(sortbox).toContain("'Escape'")
    expect(sortbox).toContain('ArrowDown')
    // It's a custom listbox built from button + ul/li, not a native form select.
    expect(sortbox).toContain('<button')
    expect(sortbox).toContain('<ul')
  })
  it('offers the four sort options incl. Highest Rated', () => {
    expect(sortbox).toContain('Newest first')
    expect(sortbox).toContain('Price: Low to High')
    expect(sortbox).toContain('Highest Rated')
  })
  it('the toolbar uses the SortListbox rather than a native select', () => {
    expect(toolbar).toContain('<SortListbox')
    expect(toolbar).not.toContain('<select')
  })
})

describe('Pagination', () => {
  it('renders Prev/Next with disabled edges and numbered pages via pageWindow', () => {
    expect(pagination).toContain('Previous page')
    expect(pagination).toContain('Next page')
    expect(pagination).toContain('disabled={atStart}')
    expect(pagination).toContain('disabled={atEnd}')
    expect(pagination).toContain('pageWindow')
    expect(pagination).toContain("aria-current={it === page ? 'page' : undefined}")
  })
  it('hides itself when there is a single page', () => {
    expect(pagination).toContain('if (totalPages <= 1) return null')
  })
})

describe('ActiveFilterChips', () => {
  it('renders removable chips and a Clear all, hidden when empty', () => {
    expect(chips).toContain('if (chips.length === 0) return null')
    expect(chips).toContain('Remove filter:')
    expect(chips).toContain('Clear all')
  })
})

describe('MobileFilterDrawer — a11y + scroll lock', () => {
  it('is a labeled modal dialog closable via Escape and locks background scroll', () => {
    expect(drawer).toContain('role="dialog"')
    expect(drawer).toContain('aria-modal="true"')
    expect(drawer).toContain("e.key === 'Escape'")
    expect(drawer).toContain("document.body.style.overflow = 'hidden'")
  })
})
