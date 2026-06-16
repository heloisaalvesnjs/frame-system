'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function V4Page({
  eyebrow,
  title,
  subtitle,
  actions,
  children,
}: {
  eyebrow: string
  title: string
  subtitle: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <main className="px-6 py-6">
      <div className="mx-auto max-w-[1380px] space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--brand)]">{eyebrow}</div>
            <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.025em] text-t1">{title}</h1>
            <p className="mt-1.5 max-w-[720px] text-[13px] leading-6 text-t3">{subtitle}</p>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </main>
  )
}

export function V4Button({
  children,
  variant = 'default',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'danger'
}) {
  return (
    <button
      className={cn(
        'inline-flex h-[38px] items-center justify-center gap-2 rounded-[10px] border px-3.5 text-[12px] font-medium transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-50',
        variant === 'primary' && 'border-[var(--brand)] bg-[var(--brand)] text-[#0B2E1E] shadow-[0_8px_22px_-16px_var(--brand)]',
        variant === 'danger' && 'border-[var(--danger)]/25 bg-[var(--danger)]/10 text-[var(--danger)]',
        variant === 'default' && 'border-[var(--border)] bg-[var(--surface)] text-t1',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function V4Card({ children, className, style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={cn('rounded-[14px] border border-[var(--border)] bg-[var(--surface)] shadow-sm', className)} style={style}>{children}</div>
}

export function V4CardPad({ children, className, style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return <V4Card className={cn('p-4', className)} style={style}>{children}</V4Card>
}

export function V4Metric({
  label,
  value,
  foot,
  tone = 'default',
}: {
  label: string
  value: string | number
  foot?: string
  tone?: 'default' | 'good' | 'warn' | 'bad'
}) {
  return (
    <V4CardPad>
      <div className="text-[12px] text-t2">{label}</div>
      <div className="mt-2 text-[28px] font-extrabold leading-none tracking-[-0.02em] text-t1 tabular-nums">{value}</div>
      {foot && (
        <div
          className={cn(
            'mt-2 text-[11.5px]',
            tone === 'good' && 'text-[var(--brand)]',
            tone === 'warn' && 'text-[var(--warning)]',
            tone === 'bad' && 'text-[var(--danger)]',
            tone === 'default' && 'text-t3',
          )}
        >
          {foot}
        </div>
      )}
    </V4CardPad>
  )
}

export function V4SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <div className="text-[14px] font-medium text-t1">{title}</div>
        {subtitle && <div className="mt-0.5 text-[12px] leading-5 text-t3">{subtitle}</div>}
      </div>
      {action}
    </div>
  )
}

export function V4Tag({
  children,
  tone = 'default',
  dot = false,
}: {
  children: ReactNode
  tone?: 'default' | 'green' | 'amber' | 'blue' | 'purple' | 'red'
  dot?: boolean
}) {
  const toneClass = {
    default: 'border-[var(--border)] bg-[var(--raised)] text-t2',
    green: 'border-[var(--brand-ring)] bg-[var(--brand-s)] text-[var(--brand)]',
    amber: 'border-[var(--warning)]/20 bg-[var(--warning)]/10 text-[var(--warning)]',
    blue: 'border-[var(--info)]/20 bg-[var(--info)]/10 text-[var(--info)]',
    purple: 'border-[var(--purple)]/20 bg-[var(--purple)]/10 text-[var(--purple)]',
    red: 'border-[var(--danger)]/20 bg-[var(--danger)]/10 text-[var(--danger)]',
  }[tone]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-medium', toneClass)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

export function V4Avatar({ name, color = '#2f8b68' }: { name: string; color?: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase()
  return (
    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white" style={{ background: color }}>
      {initials || '?'}
    </div>
  )
}

export function V4Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, style, ...rest } = props
  return (
    <input
      className={cn('h-9 rounded-[10px] border border-[var(--border)] px-3 text-[13px] outline-none placeholder:text-t3 focus:border-[var(--brand-ring)]', className)}
      style={{ background: 'var(--raised)', color: 'var(--t1)', ...style }}
      {...rest}
    />
  )
}

export function V4Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, style, ...rest } = props
  return (
    <select
      className={cn('h-9 appearance-none rounded-[10px] border border-[var(--border)] px-3 text-[13px] outline-none focus:border-[var(--brand-ring)]', className)}
      style={{ background: 'var(--raised)', color: 'var(--t1)', ...style }}
      {...rest}
    />
  )
}
