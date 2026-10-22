import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const searchPage = readFileSync('src/app/(storefront)/search/page.tsx', 'utf8')
const navbar = readFileSync('src/components/layout/Navbar.tsx', 'utf8')
const productStore = readFileSync('src/stores/productStore.ts', 'utf8')

describe('Search discovery — states and recovery', () => {
  it('keeps search scoped to real product fields and active products', () => {
    expect(searchPage).toContain("p.status === 'active'")
    expect(searchPage).toContain('p.name.toLowerCase()')
    expect(searchPage).toContain('p.brand.toLowerCase()')
    expect(searchPage).toContain('p.series.toLowerCase()')
  })

  it('provides loading, safe error/retry, and actionable empty states', () => {
    expect(searchPage).toContain('Loading cameras')
    expect(searchPage).toContain('Search is unavailable right now')
    expect(searchPage).toContain('Try again')
    expect(searchPage).toContain('Clear search')
    expect(searchPage).toContain('Browse cameras')
    expect(searchPage).not.toContain('error.message')
  })
})

describe('Navbar search — keyboard-complete suggestions', () => {
  it('uses combobox/listbox semantics and keyboard controls', () => {
    for (const token of ['role="combobox"', 'aria-autocomplete="list"', 'aria-activedescendant', 'role="listbox"', 'role="option"', 'ArrowDown', 'ArrowUp', 'Escape']) {
      expect(navbar).toContain(token)
    }
  })

  it('navigates suggestions only to real product slugs', () => {
    expect(navbar).toContain('product.status === \'active\'')
    expect(navbar).toContain('`/products/${product.slug}`')
    expect(navbar).toContain('`/search?q=${encodeURIComponent(query.trim())}`')
  })

  it('keeps the input anchored above the suggestion list as results appear', () => {
    expect(navbar).toContain('sm:top-0 sm:w-56')
    expect(navbar).not.toContain('sm:-translate-y-1/2')
    expect(navbar.indexOf('id="nav-search"')).toBeLessThan(navbar.indexOf('id="nav-search-suggestions"'))
    expect(navbar).toContain("searchOpen ? 'Close search' : 'Search'")
    expect(navbar).toContain('suggestionsOpen && searchSuggestions.length > 0')
  })
})

describe('Product store — search feedback contract', () => {
  it('exposes a recoverable loading error state without leaking diagnostics', () => {
    expect(productStore).toContain('error: boolean')
    expect(productStore).toContain('set({ loading: true, error: false })')
    expect(productStore).toContain('set({ products: [], error: true })')
  })
})
