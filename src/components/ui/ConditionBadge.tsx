import type { FC } from 'react'

type Condition = 'mint' | 'excellent' | 'good' | 'fair'

interface ConditionBadgeProps {
  condition: Condition
  className?: string
}

const conditionConfig: Record<Condition, { label: string; classes: string }> = {
  mint: {
    label: 'Mint',
    classes: 'bg-repixl-success/15 text-repixl-success border-repixl-success/30',
  },
  excellent: {
    label: 'Excellent',
    classes: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  },
  good: {
    label: 'Good',
    classes: 'bg-repixl-warning/15 text-repixl-warning border-repixl-warning/30',
  },
  fair: {
    label: 'Fair',
    classes: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  },
}

const ConditionBadge: FC<ConditionBadgeProps> = ({ condition, className = '' }) => {
  const config = conditionConfig[condition]

  return (
    <span
      className={`
        inline-flex items-center rounded-sm border px-2 py-0.5
        font-mono text-xs font-medium uppercase tracking-wider
        ${config.classes}
        ${className}
      `}
    >
      {config.label}
    </span>
  )
}

export { ConditionBadge, type Condition, type ConditionBadgeProps }
