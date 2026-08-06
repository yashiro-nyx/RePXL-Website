'use client'

/**
 * RePXL Logo — SVG-based brand mark with viewfinder bracket frame and REC dot.
 * Uses currentColor for the wordmark so it inherits theme text color automatically.
 * The REC dot uses the brand red with CSS glow animation.
 *
 * Props:
 * - size: 'sm' | 'md' | 'lg' (controls overall scale)
 * - className: additional wrapper classes
 * - showDot: whether to show the animated REC dot (default true)
 */

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showDot?: boolean
}

const sizes = {
  sm: { width: 72, height: 28 },
  md: { width: 90, height: 34 },
  lg: { width: 110, height: 40 },
}

export function Logo({ size = 'md', className = '', showDot = true }: LogoProps) {
  const { width, height } = sizes[size]

  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <svg
        viewBox="0 0 110 40"
        width={width}
        height={height}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="RePXL"
        role="img"
      >
        {/* Corner bracket — top-left */}
        <path d="M1 10 V1 H10" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" strokeLinecap="square" />
        {/* Corner bracket — top-right */}
        <path d="M100 1 H109 V10" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" strokeLinecap="square" />
        {/* Corner bracket — bottom-left */}
        <path d="M1 30 V39 H10" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" strokeLinecap="square" />
        {/* Corner bracket — bottom-right */}
        <path d="M100 39 H109 V30" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" strokeLinecap="square" />

        {/* Wordmark "RePXL" — General Sans Semibold approximation */}
        <text
          x="55"
          y="25"
          textAnchor="middle"
          fontFamily="'General Sans', sans-serif"
          fontWeight="600"
          fontSize="18"
          letterSpacing="-0.5"
          fill="currentColor"
        >
          RePXL
        </text>
      </svg>

      {/* REC dot — positioned inside upper-right of bracket frame */}
      {showDot && (
        <span
          className="absolute rounded-full bg-repixl-red"
          style={{
            width: `${Math.round(width * 0.065)}px`,
            height: `${Math.round(width * 0.065)}px`,
            top: `${Math.round(height * 0.12)}px`,
            right: `${Math.round(width * 0.06)}px`,
            animation: 'glow 2s ease-in-out infinite',
          }}
          aria-hidden="true"
        />
      )}
    </span>
  )
}
