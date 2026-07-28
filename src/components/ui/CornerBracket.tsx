import type { FC, ReactNode } from 'react'

interface CornerBracketProps {
  children: ReactNode
  className?: string
  /** Size of the corner marks in pixels */
  size?: number
  /** Color of the bracket lines — defaults to muted warm gray */
  color?: string
}

/**
 * Viewfinder-style corner-bracket frame.
 * Wraps its children with decorative ⌐ ¬ corner accents,
 * the signature motif from the RePIXL design system.
 */
const CornerBracket: FC<CornerBracketProps> = ({
  children,
  className = '',
  size = 12,
  color = 'rgba(140, 133, 128, 0.6)',
}) => {
  const bracketStyle = {
    '--bracket-size': `${size}px`,
    '--bracket-color': color,
  } as React.CSSProperties

  return (
    <div className={`relative ${className}`} style={bracketStyle}>
      {/* Top-left corner */}
      <span
        className="pointer-events-none absolute left-0 top-0"
        aria-hidden="true"
        style={{
          width: 'var(--bracket-size)',
          height: 'var(--bracket-size)',
          borderLeft: '1px solid var(--bracket-color)',
          borderTop: '1px solid var(--bracket-color)',
        }}
      />
      {/* Top-right corner */}
      <span
        className="pointer-events-none absolute right-0 top-0"
        aria-hidden="true"
        style={{
          width: 'var(--bracket-size)',
          height: 'var(--bracket-size)',
          borderRight: '1px solid var(--bracket-color)',
          borderTop: '1px solid var(--bracket-color)',
        }}
      />
      {/* Bottom-left corner */}
      <span
        className="pointer-events-none absolute bottom-0 left-0"
        aria-hidden="true"
        style={{
          width: 'var(--bracket-size)',
          height: 'var(--bracket-size)',
          borderLeft: '1px solid var(--bracket-color)',
          borderBottom: '1px solid var(--bracket-color)',
        }}
      />
      {/* Bottom-right corner */}
      <span
        className="pointer-events-none absolute bottom-0 right-0"
        aria-hidden="true"
        style={{
          width: 'var(--bracket-size)',
          height: 'var(--bracket-size)',
          borderRight: '1px solid var(--bracket-color)',
          borderBottom: '1px solid var(--bracket-color)',
        }}
      />
      {children}
    </div>
  )
}

export { CornerBracket, type CornerBracketProps }
