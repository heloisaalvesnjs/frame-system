import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-white/8 text-white/50',
    success: 'bg-brand-500/15 text-brand-400',
    warning: 'bg-yellow-500/15 text-yellow-400',
    danger:  'bg-red-500/15 text-red-400',
    info:    'bg-blue-500/15 text-blue-400',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
