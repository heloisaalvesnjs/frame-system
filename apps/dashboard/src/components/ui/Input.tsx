import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-white/60">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-9 w-full rounded-lg border bg-white/5 px-3 text-sm text-white',
            'placeholder:text-white/20',
            'focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all duration-150',
            error
              ? 'border-red-500/40 focus:border-red-500/60 focus:ring-red-500/15'
              : 'border-ui-border focus:border-brand-500/50 focus:ring-brand-500/15',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        {hint && !error && <p className="text-xs text-white/30">{hint}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
