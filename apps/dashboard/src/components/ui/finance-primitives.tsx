import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('surface p-5', className)}>{children}</div>
}

export function SectionTitle({
  title,
  hint,
  action,
}: {
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="text-[13px] font-semibold text-t1 tracking-tight">{title}</h2>
        {hint && <p className="text-[12px] text-t3 mt-0.5">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

export function Badge({
  children,
  variant = 'default',
}: {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
}) {
  const styles: Record<string, string> = {
    default: 'bg-[var(--raised)] text-t2 border-[var(--line-1)]',
    success: 'bg-[var(--brand-s)] text-[var(--brand)] border-[var(--brand-ring)]',
    warning: 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20',
    danger: 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20',
    info: 'bg-[var(--info)]/10 text-[var(--info)] border-[var(--info)]/20',
    purple: 'bg-[var(--purple)]/10 text-[var(--purple)] border-[var(--purple)]/20',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10.5px] font-medium',
        styles[variant],
      )}
    >
      {children}
    </span>
  )
}

export function KPI({
  label,
  value,
  delta,
  positive = true,
  hint,
}: {
  label: string
  value: string
  delta?: string
  positive?: boolean
  hint?: string
}) {
  return (
    <div className="surface p-5 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--line-2)] to-transparent" />
      <div className="text-[11px] font-medium text-t3 uppercase tracking-wider">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-[26px] font-semibold text-t1 tracking-tight tabular-nums">{value}</div>
        {delta && (
          <span
            className={cn(
              'text-[11.5px] font-medium tabular-nums',
              positive ? 'text-[var(--brand)]' : 'text-[var(--danger)]',
            )}
          >
            {positive ? '↑' : '↓'} {delta}
          </span>
        )}
      </div>
      {hint && <div className="mt-1 text-[11.5px] text-t3">{hint}</div>}
    </div>
  )
}

export function Btn({
  variant = 'primary',
  size = 'md',
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
  size?: 'sm' | 'md'
}) {
  const variants: Record<string, string> = {
    primary:
      'bg-[var(--brand)] text-[#02140C] hover:bg-[var(--brand-h)] shadow-[0_0_0_1px_var(--brand-ring),0_8px_24px_-12px_rgba(0,194,124,0.5)]',
    secondary: 'bg-[var(--raised)] text-t1 hover:bg-[var(--raised-2)] border border-[var(--line-2)]',
    ghost: 'text-t2 hover:bg-[var(--raised)] hover:text-t1',
    outline: 'border border-[var(--line-2)] text-t1 hover:bg-[var(--raised)] hover:border-[var(--line-3)]',
  }
  const sizes: Record<string, string> = { sm: 'h-7 px-2.5 text-[12px]', md: 'h-9 px-3.5 text-[13px]' }
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-ring)]',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

const gradients = {
  blue: 'from-[var(--info)] to-[#3F7DD9]',
  green: 'from-[var(--brand)] to-[var(--brand-h)]',
  purple: 'from-[var(--purple)] to-[#7B5FE0]',
  orange: 'from-[var(--warning)] to-[#FF8A3D]',
  pink: 'from-[#FF8FB3] to-[#E0598A]',
} as const

export function Avatar({
  name,
  color = 'blue',
  size = 32,
}: {
  name: string
  color?: keyof typeof gradients
  size?: number
}) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()
  return (
    <div
      className={cn(
        'shrink-0 rounded-full grid place-items-center font-semibold text-white bg-gradient-to-br',
        gradients[color],
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  )
}
