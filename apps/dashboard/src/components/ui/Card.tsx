import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn('rounded-2xl shadow-frame', className)}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <div
      className={cn('px-6 py-4', className)}
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {children}
    </div>
  )
}

export function CardContent({ children, className }: CardProps) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>
}

export function CardFooter({ children, className }: CardProps) {
  return (
    <div
      className={cn('px-6 py-4', className)}
      style={{ borderTop: '1px solid var(--border)' }}
    >
      {children}
    </div>
  )
}
