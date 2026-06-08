import { cn } from '@/lib/utils'
import { TextareaHTMLAttributes, forwardRef } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[12px] font-medium text-t2">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-lg px-3 py-2.5 text-sm text-t1 resize-none',
            'placeholder:text-t3',
            'focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all duration-150',
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

Textarea.displayName = 'Textarea'
