'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  Home,
  Inbox,
  Calendar,
  Users,
  Sparkles,
  Workflow,
  Clock,
  Plug,
  Settings,
  ChevronsLeft,
  Plus,
} from 'lucide-react'

const groups: Array<{
  label: string
  items: Array<{ href: string; label: string; icon: any; badge?: string }>
}> = [
  {
    label: 'Operação',
    items: [
      { href: '/dashboard', label: 'Início',            icon: Home },
      { href: '/conversas', label: 'Caixa de entrada',  icon: Inbox, badge: '12' },
      { href: '/agenda',    label: 'Agenda',             icon: Calendar },
      { href: '/clientes',  label: 'Pacientes',          icon: Users },
    ],
  },
  {
    label: 'Inteligência',
    items: [
      { href: '/treinamento', label: 'Assistente IA', icon: Sparkles },
      { href: '/followup',    label: 'Automações',    icon: Workflow },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { href: '/disponibilidade', label: 'Disponibilidade', icon: Clock },
      { href: '/integracoes',     label: 'Integrações',     icon: Plug },
      { href: '/configuracoes',   label: 'Configurações',   icon: Settings },
    ],
  },
]

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useAuth()

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-[244px] flex-col transition-transform duration-200 md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{
          background: 'var(--sidebar)',
          color: 'var(--sidebar-foreground)',
          borderRight: '1px solid var(--sidebar-border)',
        }}
      >
        {/* Brand */}
        <div className="px-4 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold text-[#0A0D14]"
              style={{ background: 'var(--gradient-lime)' }}
            >
              FS
            </div>
            <div className="min-w-0 flex-1">
              <div
                className="truncate text-[13.5px] font-semibold tracking-tight"
                style={{ color: '#FFFFFF' }}
              >
                Frame System
              </div>
              <div
                className="truncate text-[11px]"
                style={{ color: 'var(--sidebar-foreground-muted)' }}
              >
                {(user as any)?.clinic_name || 'Minha clínica'}
              </div>
            </div>
            <button
              onClick={onClose}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-md opacity-60 transition hover:opacity-100"
              style={{ color: 'var(--sidebar-foreground-muted)' }}
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Quick action */}
        <div className="px-3 pb-2">
          <Link
            href="/agenda"
            className="flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-[12.5px] transition-colors"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#E5E7EB',
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nova ação</span>
            <kbd className="ml-auto font-mono text-[10px] opacity-60">⌘N</kbd>
          </Link>
        </div>

        {/* Nav */}
        <nav className="mt-2 flex-1 overflow-y-auto px-2 pb-3">
          {groups.map((g) => (
            <div key={g.label} className="mb-2">
              <div
                className="px-3 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: 'var(--sidebar-foreground-muted)' }}
              >
                {g.label}
              </div>
              {g.items.map((item) => {
                const active = isActive(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="relative mb-0.5 flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-all duration-150"
                    style={
                      active
                        ? { background: 'rgba(255,255,255,0.06)', color: '#FFFFFF' }
                        : { color: 'var(--sidebar-foreground)' }
                    }
                    onMouseEnter={(e) => {
                      if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
                    }}
                    onMouseLeave={(e) => {
                      if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
                    }}
                  >
                    {active && (
                      <span
                        className="absolute bottom-1.5 left-0 top-1.5 w-[2px] rounded-r-full"
                        style={{ background: 'var(--brand-lime)' }}
                      />
                    )}
                    <Icon
                      className="h-[16px] w-[16px] shrink-0"
                      strokeWidth={1.75}
                      style={{
                        color: active ? 'var(--brand-lime)' : 'var(--sidebar-foreground-muted)',
                      }}
                    />
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span
                        className="ml-auto rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{
                          background: 'rgba(168,241,60,0.14)',
                          color: 'var(--brand-lime)',
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Footer user */}
        <div
          className="px-3 py-3"
          style={{ borderTop: '1px solid var(--sidebar-border)' }}
        >
          <div className="flex h-11 w-full items-center gap-2.5 rounded-lg px-2 transition-colors hover:bg-white/[0.04]">
            <div
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white"
              style={{ background: 'var(--gradient-brand)' }}
            >
              {(user as any)?.name
                ? (user as any).name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
                : 'DR'}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div
                className="truncate text-[12.5px] font-medium"
                style={{ color: '#FFFFFF' }}
              >
                {(user as any)?.name || 'Nutricionista'}
              </div>
              <div
                className="truncate text-[11px]"
                style={{ color: 'var(--sidebar-foreground-muted)' }}
              >
                {(user as any)?.email || ''}
              </div>
            </div>
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: 'var(--brand-lime)',
                boxShadow: '0 0 6px var(--brand-lime)',
              }}
            />
          </div>
        </div>
      </aside>
    </>
  )
}
