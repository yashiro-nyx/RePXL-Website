'use client'

import { useEffect, useRef, useState } from 'react'
import type { SortOption } from '@/lib/catalog-filters'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating-desc', label: 'Highest Rated' },
]

const labelFor = (v: SortOption) => SORT_OPTIONS.find((o) => o.value === v)?.label ?? 'Newest first'

/**
 * Custom RePXL sort control — an accessible listbox (no native <select>, no new
 * dependency). Keyboard: Enter/Space/Down opens; Up/Down move; Enter/Space
 * select; Escape closes; click-outside closes. ARIA listbox semantics.
 */
export function SortListbox({
  value,
  onChange,
  className = '',
}: {
  value: SortOption
  onChange: (v: SortOption) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(() => SORT_OPTIONS.findIndex((o) => o.value === value))
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  useEffect(() => {
    if (open) {
      setActiveIndex(SORT_OPTIONS.findIndex((o) => o.value === value))
      // Focus the listbox so arrow keys work immediately.
      requestAnimationFrame(() => listRef.current?.focus())
    }
  }, [open, value])

  const commit = (v: SortOption) => {
    onChange(v)
    setOpen(false)
    buttonRef.current?.focus()
  }

  const onButtonKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setOpen(true)
    }
  }

  const onListKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        buttonRef.current?.focus()
        break
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((i) => Math.min(SORT_OPTIONS.length - 1, i + 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((i) => Math.max(0, i - 1))
        break
      case 'Home':
        e.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        e.preventDefault()
        setActiveIndex(SORT_OPTIONS.length - 1)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        commit(SORT_OPTIONS[activeIndex].value)
        break
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onButtonKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Sort by: ${labelFor(value)}`}
        className="flex min-w-[11.5rem] items-center justify-between gap-3 rounded-lg border border-repixl-muted/25 bg-repixl-charcoal px-3.5 py-2.5 text-sm text-repixl-text-light transition-colors hover:border-repixl-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40"
      >
        <span className="truncate">{labelFor(value)}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`shrink-0 text-repixl-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          aria-label="Sort options"
          aria-activedescendant={`sort-opt-${activeIndex}`}
          onKeyDown={onListKeyDown}
          className="absolute right-0 z-30 mt-2 w-56 origin-top overflow-hidden rounded-xl border border-repixl-muted/20 bg-repixl-bg p-1 shadow-2xl shadow-black/40 outline-none motion-safe:animate-[chatIn_140ms_ease-out]"
        >
          {SORT_OPTIONS.map((opt, i) => {
            const selected = opt.value === value
            const active = i === activeIndex
            return (
              <li
                key={opt.value}
                id={`sort-opt-${i}`}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => commit(opt.value)}
                className={[
                  'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                  active ? 'bg-repixl-charcoal text-repixl-text-light' : 'text-repixl-text-light/80',
                ].join(' ')}
              >
                <span className="flex w-4 justify-center text-repixl-red" aria-hidden="true">
                  {selected && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  )}
                </span>
                {opt.label}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
