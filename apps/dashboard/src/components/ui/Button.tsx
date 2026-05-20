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
      'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-ui-card disabled:opacity-40 disabled:cursor-not-allowed'

    const variants = {
      primary:   'bg-brand-500 text-white hover:bg-brand-600 focus:ring-brand-500/40 shadow-sm shadow-brand-500/20',
      secondary: 'bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 focus:ring-brand-500/30',
      outline:   'border border-ui-border bg-transparent text-white/60 hover:bg-white/5 hover:text-white focus:ring-white/20',
      ghost:     'text-white/50 hover:bg-white/5 hover:text-white focus:ring-white/20',
      danger:    'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 focus:ring-red-500/30',
    }

    const sizes = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-9 px-4 text-sm gap-2',
      lg: 'h-11 px-6 text-sm gap-2',
    }

    return (
      <button
        ref={ref}
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
