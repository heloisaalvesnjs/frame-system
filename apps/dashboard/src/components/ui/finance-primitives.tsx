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
    <div className="mb-4 flex items-end justify-between">
      <div>
        <h2 className="text-[13px] font-semibold tracking-tight text-t1">{title}</h2>
        {hint && <p className="mt-0.5 text-[12px] text-t3">{hint}</p>}
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
    default: 'border-white/[0.06] bg-white/[0.05] text-t2',
    success: 'border-[var(--brand-ring)] bg-[var(--brand-s)] text-[var(--brand)]',
    warning: 'border-[var(--warning)]/20 bg-[var(--warning)]/10 text-[var(--warning)]',
    danger: 'border-[var(--danger)]/20 bg-[var(--danger)]/10 text-[var(--danger)]',
    info: 'border-[var(--info)]/20 bg-[var(--info)]/10 text-[var(--info)]',
    purple: 'border-[var(--purple)]/20 bg-[var(--purple)]/10 text-[var(--purple)]',
  }

  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10.5px] font-medium', styles[variant])}>
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
    <div className="surface relative overflow-hidden p-5">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="text-[11px] font-medium uppercase tracking-wider text-t3">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-[26px] font-semibold tracking-tight text-t1 tabular-nums">{value}</div>
        {delta && (
          <span className={cn('text-[11.5px] font-medium tabular-nums', positive ? 'text-[var(--brand)]' : 'text-[var(--danger)]')}>
            {positive ? '+' : '-'} {delta}
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
    secondary: 'border border-[var(--line-2)] bg-white/[0.06] text-t1 hover:bg-white/[0.09]',
    ghost: 'text-t2 hover:bg-white/[0.04] hover:text-t1',
    outline: 'border border-[var(--line-2)] text-t1 hover:border-[var(--line-3)] hover:bg-white/[0.04]',
  }
  const sizes: Record<string, string> = {
    sm: 'h-7 px-2.5 text-[12px]',
    md: 'h-9 px-3.5 text-[13px]',
  }

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-ring)] disabled:pointer-events-none disabled:opacity-50',
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
  blue: 'from-[#6AA9FF] to-[#3F7DD9]',
  green: 'from-[#00C27C] to-[#00E892]',
  purple: 'from-[#B69CFF] to-[#7B5FE0]',
  orange: 'from-[#FFB454] to-[#FF8A3D]',
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
      className={cn('grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-semibold text-white', gradients[color])}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  )
}
