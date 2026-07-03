import React from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// ─── Toggle ────────────────────────────────────────────────────────
export function Toggle({
  checked,
  onChange,
  disabled,
  size = 'md',
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const dims = {
    sm: { w: 36, h: 20, knob: 16 },
    md: { w: 40, h: 22, knob: 18 },
    lg: { w: 44, h: 24, knob: 20 },
  }[size]
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        'relative inline-flex flex-shrink-0 rounded-full transition-all duration-200',
        disabled && 'cursor-not-allowed opacity-50',
      )}
      style={{
        width: dims.w,
        height: dims.h,
        background: checked ? 'var(--brand)' : 'var(--raised)',
        border: checked ? 'none' : '1px solid var(--border)',
      }}
    >
      <span
        className="absolute top-0.5 rounded-full bg-white shadow-sm transition-transform duration-200"
        style={{
          width: dims.knob,
          height: dims.knob,
          transform: `translateX(${checked ? dims.w - dims.knob - 2 : 2}px)`,
        }}
      />
    </button>
  )
}

// ─── Card ──────────────────────────────────────────────────────
export function Card({ className, style, children }: { className?: string; style?: React.CSSProperties; children: ReactNode }) {
  return <div className={cn('surface p-6', className)} style={style}>{children}</div>
}

// ─── SectionTitle ──────────────────────────────────────────────
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
    <div className="mb-5 flex items-end justify-between">
      <div>
        <h2 className="text-[14px] font-semibold tracking-tight text-1">{title}</h2>
        {hint && <p className="mt-1 text-[12px] text-3">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

// ─── Badge ─────────────────────────────────────────────────────
type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'

const badgeStyles: Record<BadgeVariant, string> = {
  default: 'bg-[var(--bg-surface)] text-2 border-[var(--line-1)]',
  success: 'bg-[var(--brand-soft)] text-[var(--brand)] border-[var(--brand-ring)]',
  warning: 'bg-[#FFF6E5] text-[#9A6B14] border-[#F1D9A8]',
  danger:  'bg-[#FDECEC] text-[#A12C2C] border-[#F1C7C7]',
  info:    'bg-[#EAF1FE] text-[#1F4FBA] border-[#C9D9F7]',
  purple:  'bg-[#EFEAFF] text-[#5236C7] border-[#D6CBF7]',
}

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-[var(--text-3)]',
  success: 'bg-[var(--brand)]',
  warning: 'bg-[#E8A020]',
  danger:  'bg-[#DC2626]',
  info:    'bg-[#2563EB]',
  purple:  'bg-[#7C5CFF]',
}

export function Badge({
  children,
  variant = 'default',
  dot,
  className,
}: {
  children: ReactNode
  variant?: BadgeVariant
  dot?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium',
        badgeStyles[variant],
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', dotColors[variant])} />}
      {children}
    </span>
  )
}

// ─── KPI ───────────────────────────────────────────────────────
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
      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-3">{label}</div>
      <div className="mt-3 flex items-baseline gap-2">
        <div className="tabular-nums text-[28px] font-semibold tracking-tight text-1">{value}</div>
        {delta && (
          <span
            className={cn(
              'tabular-nums text-[11.5px] font-medium',
              positive ? 'text-[var(--brand)]' : 'text-[var(--danger)]',
            )}
          >
            {positive ? '↑' : '↓'} {delta}
          </span>
        )}
      </div>
      {hint && <div className="mt-1.5 text-[11.5px] text-3">{hint}</div>}
    </div>
  )
}

// ─── Btn ───────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
type BtnSize = 'sm' | 'md'

const btnVariants: Record<BtnVariant, string> = {
  primary:
    'bg-[var(--brand)] text-white hover:bg-[#256E29] shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_6px_20px_-10px_rgba(46,125,50,0.5)]',
  secondary:
    'bg-[var(--bg-elevated)] text-1 hover:bg-[var(--bg-surface)] border border-[var(--line-2)] shadow-[var(--shadow-sm)]',
  ghost:
    'text-2 hover:bg-[var(--bg-surface)] hover:text-1',
  outline:
    'border border-[var(--line-2)] text-1 bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] hover:border-[var(--line-3)]',
  danger:
    'bg-[var(--danger,#DC2626)] text-white hover:opacity-90',
}

const btnSizes: Record<BtnSize, string> = {
  sm: 'h-8 px-3 text-[12.5px]',
  md: 'h-9 px-4 text-[13px]',
}

export function Btn({
  variant = 'primary',
  size = 'md',
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant
  size?: BtnSize
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-ring)]',
        btnVariants[variant],
        btnSizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

// ─── Avatar ────────────────────────────────────────────────────
const gradients = {
  blue:   'from-[#5B8DEF] to-[#2563EB]',
  green:  'from-[#61D836] to-[#2E7D32]',
  purple: 'from-[#A78BFA] to-[#7C5CFF]',
  orange: 'from-[#F5B056] to-[#C98A2B]',
  pink:   'from-[#F4A7B9] to-[#D14380]',
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
    .map((n) => n[0])
    .join('')
    .toUpperCase()
  return (
    <div
      className={cn(
        'shrink-0 rounded-full bg-gradient-to-br grid place-items-center font-semibold text-white',
        gradients[color],
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  )
}
