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
          <label htmlFor={inputId} className="text-[12px] font-medium text-t2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-9 w-full rounded-lg px-3 text-sm text-t1 transition-all duration-150',
            'placeholder:text-t3',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            error
              ? 'border border-red-500/40 focus:border-red-500/60 focus:ring-red-500/15'
              : 'focus:ring-brand-500/15 focus:border-brand-500/50',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            className
          )}
          style={{
            background: 'var(--surface)',
            border: error ? undefined : '1px solid var(--border)',
          }}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        {hint && !error && <p className="text-xs text-t3">{hint}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
