import type { FC } from 'react'

interface SkeletonProps {
  className?: string
}

/**
 * Animated skeleton placeholder for loading states.
 * Apply width/height via className.
 */
const Skeleton: FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse rounded bg-repixl-muted/20 ${className}`}
      aria-hidden="true"
    />
  )
}

export { Skeleton, type SkeletonProps }
