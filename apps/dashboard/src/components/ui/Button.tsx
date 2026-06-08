import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-150 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed'

    const variants: Record<string, string> = {
      primary:   'bg-brand-500 text-white hover:bg-brand-600 shadow-sm',
      secondary: 'bg-brand-500/10 text-brand-500 hover:bg-brand-500/15',
      outline:   'border text-t2 hover:text-t1 hover:bg-raised',
      ghost:     'text-t2 hover:text-t1 hover:bg-raised',
      danger:    'bg-red-500/10 text-red-400 hover:bg-red-500/15 border border-red-500/20',
    }

    const outlineStyle = variant === 'outline'
      ? { borderColor: 'var(--border)' }
      : {}

    const sizes = {
      sm: 'h-8 px-3 text-[11px] gap-1.5',
      md: 'h-9 px-4 text-[12px] gap-2',
      lg: 'h-10 px-5 text-[12px] gap-2',
    }

    return (
      <button
        ref={ref}
        style={outlineStyle}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
