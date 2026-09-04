'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Loading state — disables button and shows spinner alongside children */
  loading?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-repixl-red text-white border border-transparent hover:bg-red-700 active:bg-red-800',
  secondary:
    'bg-transparent text-repixl-text-light border border-repixl-muted/50 hover:border-repixl-text-light hover:bg-repixl-charcoal active:bg-white/5',
  ghost:
    'bg-transparent text-repixl-text-light/70 border border-transparent hover:text-repixl-text-light hover:bg-repixl-charcoal/60 active:bg-repixl-charcoal',
  danger:
    'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 active:bg-red-500/30',
  icon:
    'bg-transparent text-repixl-text-light/70 border border-transparent hover:text-repixl-text-light hover:bg-repixl-charcoal/60 active:bg-repixl-charcoal p-0',
}

const sizeStyles: Record<ButtonSize, string> = {
  // sm: min 36px — py-2 + text-sm (line-height ~20px) = 36px
  sm: 'h-9 px-4 text-sm',
  // md: min 40px — py-2.5 + text-sm = 40px
  md: 'h-10 px-5 text-sm',
  // lg: min 48px — py-3 + text-base = 48px
  lg: 'h-12 px-7 text-base',
}

const Spinner = () => (
  <svg
    className="h-4 w-4 animate-spin"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
)

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      className = '',
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={`
          inline-flex items-center justify-center gap-2 rounded font-body font-medium
          transition-colors duration-200
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50 focus-visible:ring-offset-2 focus-visible:ring-offset-repixl-bg
          disabled:cursor-not-allowed disabled:opacity-40
          ${variantStyles[variant]}
          ${variant !== 'icon' ? sizeStyles[size] : ''}
          ${className}
        `}
        {...props}
      >
        {loading && <Spinner />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
