/**
 * Small, accessible star row used by the Rating filter and chips.
 * Presentational only — the numeric rating comes from real review data.
 */
export function StarRating({ value, size = 13 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => {
        const filled = i < value
        return (
          <svg
            key={i}
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={filled ? '#F5A623' : 'none'}
            stroke={filled ? '#F5A623' : 'currentColor'}
            strokeWidth="1.5"
            className={filled ? '' : 'text-repixl-muted/40'}
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        )
      })}
    </span>
  )
}
