'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  Calendar,
  ChevronsLeft,
  Clock,
  FileBarChart,
  LayoutDashboard,
  Lock,
  LogOut,
  MessageSquare,
  Moon,
  Plug,
  Plus,
  Settings,
  Shield,
  Sparkles,
  Sun,
  Users,
  Workflow,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

const groups: Array<{
  label?: string
  items: Array<{ href: string; label: string; icon: any }>
}> = [
  {
    label: 'Operação',
    items: [
      { href: '/dashboard', label: 'Visão geral', icon: LayoutDashboard },
      { href: '/conversas', label: 'Caixa de entrada', icon: MessageSquare },
      { href: '/agenda', label: 'Agenda', icon: Calendar },
      { href: '/clientes', label: 'Pacientes', icon: Users },
    ],
  },
  {
    label: 'Inteligência',
    items: [
      { href: '/treinamento', label: 'Assistente', icon: Sparkles },
      { href: '/followup', label: 'Automações', icon: Workflow },
      { href: '/relatorios', label: 'Relatórios', icon: FileBarChart },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { href: '/disponibilidade', label: 'Disponibilidade', icon: Clock },
      { href: '/integracoes', label: 'Integrações', icon: Plug },
      { href: '/configuracoes', label: 'Configurações', icon: Settings },
    ],
  },
]

function initialsFrom(name?: string | null) {
  if (!name) return 'FS'
  return name
    .split(' ')
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase()
}

function NavLink({
  href,
  label,
  icon: Icon,
  onClick,
}: {
  href: string
  label: string
  icon: any
  onClick?: () => void
}) {
  const pathname = usePathname()
  const active = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'group/item relative flex h-10 items-center gap-3 rounded-[10px] px-3 text-[13px] font-medium transition-all duration-150',
        active ? 'bg-[var(--brand-s)] text-[var(--brand)]' : 'text-t3 hover:bg-[var(--sidebar-hover)] hover:text-t1',
      )}
    >
      {active && (
        <span
          className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full"
          style={{ background: 'linear-gradient(180deg, var(--brand-h), var(--brand))' }}
        />
      )}
      <Icon
        className={cn('h-[18px] w-[18px] shrink-0 transition-colors', active ? 'text-[var(--brand)]' : 'text-t3 group-hover/item:text-t2')}
        strokeWidth={1.75}
      />
      <span className="flex-1 max-w-0 overflow-hidden truncate opacity-0 transition-all duration-200 group-hover/sidebar:max-w-[140px] group-hover/sidebar:opacity-100">{label}</span>
      {active && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--brand)] opacity-0 shadow-[0_0_8px_var(--brand)] transition-opacity duration-150 group-hover/sidebar:opacity-100" />
      )}
    </Link>
  )
}

function UserMenu({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const initials = initialsFrom(user?.name)

  useEffect(() => {
    function handler(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function go(href: string) {
    setOpen(false)
    onClose?.()
    router.push(href)
  }

  return (
    <div ref={ref} className="relative border-t border-[var(--line-1)] px-3 py-3">
      {open && (
        <div className="absolute bottom-full left-3 mb-2 w-[260px] overflow-hidden rounded-xl border border-[var(--line-2)] bg-[var(--surface)] shadow-2xl">
          <div className="border-b border-[var(--line-1)] px-4 py-3">
            <p className="truncate text-[13px] font-semibold leading-tight text-t1">{user?.name}</p>
            <p className="mt-0.5 truncate text-[10.5px] text-t3">{user?.email}</p>
          </div>
          <div className="p-1.5">
            <button onClick={() => go('/configuracoes')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-t2 transition-colors hover:bg-[var(--raised)] hover:text-t1">
              <Settings className="h-[14px] w-[14px]" />
              Configurações da conta
            </button>
            {(user as any)?.is_master && (
              <button onClick={() => go('/admin')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-t2 transition-colors hover:bg-[var(--raised)] hover:text-t1">
                <Shield className="h-[14px] w-[14px]" />
                Central administrativa
              </button>
            )}
            <button onClick={() => go('/seguranca')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-t2 transition-colors hover:bg-[var(--raised)] hover:text-t1">
              <Lock className="h-[14px] w-[14px]" />
              Segurança
            </button>
          </div>
          <div className="border-t border-[var(--line-1)] p-1.5">
            <button
              onClick={() => {
                setOpen(false)
                logout()
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-t3 transition-colors hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
            >
              <LogOut className="h-[14px] w-[14px]" />
              Sair
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(v => !v)}
        className={cn('flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors', open ? 'bg-[var(--raised)]' : 'hover:bg-[var(--sidebar-hover)]')}
      >
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#00C27C] to-[#00E892] text-[11px] font-semibold text-[#02140C]">
          {initials}
        </div>
        <div className="flex-1 max-w-0 overflow-hidden opacity-0 transition-all duration-200 group-hover/sidebar:max-w-[140px] group-hover/sidebar:opacity-100">
          <div className="truncate text-[12.5px] font-medium text-t1">{user?.name || 'Frame System'}</div>
          <div className="mt-0.5 truncate text-[11px] text-t3">{user?.email || 'Nutricionista'}</div>
        </div>
        <div className="h-1.5 w-1.5 rounded-full bg-[var(--brand)] opacity-0 transition-opacity duration-150 group-hover/sidebar:opacity-100" />
      </button>
    </div>
  )
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="group/sidebar flex h-full flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)]">
      {/* overflow-x-hidden aqui clipa textos que passam dos 72px colapsados */}
      <div className="flex flex-1 flex-col overflow-x-hidden">
        <div className="px-3 pb-3 pt-4">
          <button className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--sidebar-hover)]">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-[#0B0C0E] text-[11px] font-bold text-[#00E892]">
              FS
            </div>
            <div className="min-w-0 flex-1 text-left opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
              <div className="truncate text-[13px] font-semibold text-t1">Frame System</div>
              <div className="truncate text-[11px] text-t3">{user?.name || 'Clínica Nutri Plus'}</div>
            </div>
            <ChevronsLeft className="h-3.5 w-3.5 shrink-0 text-t3 opacity-0 transition-opacity group-hover/sidebar:opacity-100" />
          </button>
        </div>

        <div className="px-3 pb-3">
          <button
            className="flex h-9 w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--raised)] px-2.5 text-[12px] font-medium text-t3 transition-colors hover:bg-[var(--sidebar-hover)] hover:text-t1"
            type="button"
            onClick={() => onClose?.()}
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">Novo</span>
            <kbd className="font-mono text-[10px] text-t3 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">Ctrl N</kbd>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          {groups.map((group, index) => (
            <div key={group.label || index} className="mb-1">
              {group.label && (
                <div className="px-3 pb-1.5 pt-3 text-[10.5px] font-medium uppercase tracking-wider text-t3 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
                  {group.label}
                </div>
              )}
              {group.items.map(item => (
                <NavLink key={item.href} {...item} onClick={onClose} />
              ))}
            </div>
          ))}
        </nav>

        <div className="px-3 pb-3">
          <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--raised)] p-0.5">
            <button
              type="button"
              onClick={() => theme === 'light' && toggleTheme()}
              className={cn('flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md text-[11.5px] font-medium transition-colors', theme === 'dark' ? 'bg-[var(--surface)] text-t1 shadow-sm' : 'text-t3 hover:text-t1')}
              aria-label="Tema escuro"
            >
              <Moon className="h-3 w-3" />
              <span className="opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">Dark</span>
            </button>
            <button
              type="button"
              onClick={() => theme === 'dark' && toggleTheme()}
              className={cn('flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md text-[11.5px] font-medium transition-colors', theme === 'light' ? 'bg-[var(--surface)] text-t1 shadow-sm' : 'text-t3 hover:text-t1')}
              aria-label="Tema claro"
            >
              <Sun className="h-3 w-3" />
              <span className="opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">Light</span>
            </button>
          </div>
        </div>
      </div>

      {/* UserMenu fora do overflow-x-hidden para o popup não ser cortado */}
      <UserMenu onClose={onClose} />
    </div>
  )
}

export function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  return (
    <>
      <aside className="fixed left-0 top-0 z-20 hidden h-screen w-[72px] shrink-0 flex-col overflow-visible transition-[width] duration-200 hover:w-[210px] md:flex">
        <SidebarContent />
      </aside>

      {open && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={onClose} />}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col transition-transform duration-300 ease-in-out md:hidden',
          open ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
        )}
      >
        <SidebarContent onClose={onClose} />
      </aside>
    </>
  )
}
