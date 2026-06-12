'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  Calendar,
  ChevronsLeft,
  Clock,
  LayoutDashboard,
  Lock,
  LogOut,
  MessageSquare,
  Moon,
  Palette,
  Plug,
  Plus,
  Settings,
  Shield,
  Sparkles,
  Sun,
  User,
  UserCog,
  Users,
  Wallet,
  Workflow,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

const groups: Array<{
  label?: string
  items: Array<{ href: string; label: string; icon: any; badge?: string }>
}> = [
  {
    items: [
      { href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
      { href: '/conversas', label: 'Conversas', icon: MessageSquare },
      { href: '/agenda', label: 'Agenda', icon: Calendar },
      { href: '/clientes', label: 'Clientes', icon: Users },
      { href: '/financeiro', label: 'Financeiro', icon: Wallet },
      { href: '/followup', label: 'Automações', icon: Workflow },
    ],
  },
  {
    label: 'Operação',
    items: [
      { href: '/treinamento', label: 'Assistente IA', icon: Sparkles },
      { href: '/disponibilidade', label: 'Disponibilidade', icon: Clock },
      { href: '/equipe', label: 'Equipe', icon: UserCog },
      { href: '/integracoes', label: 'Integrações', icon: Plug },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { href: '/design-system', label: 'Design System', icon: Palette },
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
  badge,
  onClick,
}: {
  href: string
  label: string
  icon: any
  badge?: string
  onClick?: () => void
}) {
  const pathname = usePathname()
  const active = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-all duration-150',
        active ? 'bg-white/[0.06] text-white' : 'text-white/55 hover:bg-white/[0.04] hover:text-white',
      )}
    >
      <Icon
        className={cn(
          'h-[15px] w-[15px] shrink-0 transition-colors',
          active ? 'text-[var(--brand)]' : 'text-white/35 group-hover:text-white/65',
        )}
        strokeWidth={1.75}
      />
      <span className="truncate">{label}</span>
      {badge && (
        <span className="ml-auto rounded-md px-1.5 py-0.5 text-[10px] font-medium text-[var(--brand)]" style={{ background: 'var(--brand-s)' }}>
          {badge}
        </span>
      )}
      {active && !badge && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--brand)] shadow-[0_0_8px_var(--brand)]" />}
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
    <div ref={ref} className="relative px-3 py-3 border-t border-white/[0.06]">
      {open && (
        <div className="absolute bottom-full left-3 right-3 mb-2 overflow-hidden rounded-xl border border-[var(--line-2)] bg-[var(--surface)] shadow-2xl">
          <div className="flex items-center gap-3 border-b border-[var(--line-1)] px-4 py-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#6AA9FF] to-[#B69CFF] text-[11px] font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold leading-tight text-t1">{user?.name}</p>
              <p className="mt-0.5 truncate text-[10px] text-t3">{user?.email}</p>
            </div>
          </div>

          <div className="p-1.5">
            <button onClick={() => go('/perfil')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-t2 transition-colors hover:bg-[var(--raised)] hover:text-t1">
              <User className="h-[14px] w-[14px]" />
              Meu Perfil
            </button>
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
        className={cn(
          'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors',
          open ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]',
        )}
      >
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#6AA9FF] to-[#B69CFF] text-[11px] font-semibold text-white">
          {initials}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="truncate text-[12.5px] font-medium text-white">{user?.name || 'Frame System'}</div>
          <div className="mt-0.5 truncate text-[11px] text-white/35">{user?.email || 'Nutricionista'}</div>
        </div>
        <div className="h-1.5 w-1.5 rounded-full bg-[var(--brand)]" />
      </button>
    </div>
  )
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col bg-[#0E0F11]">
      <div className="px-3 pb-3 pt-4">
        <button className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.04]">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-[#00C27C] to-[#00E892] text-[11px] font-bold text-[#02140C]">
            FS
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="truncate text-[13px] font-medium text-white">Frame System</div>
            <div className="truncate text-[11px] text-white/35">{user?.name || 'Clínica Nutri Plus'}</div>
          </div>
          <ChevronsLeft className="h-3.5 w-3.5 text-white/35 opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
      </div>

      <div className="px-3 pb-3">
        <button
          className="flex h-8 w-full items-center gap-2 rounded-lg border border-white/[0.10] bg-white/[0.02] px-2.5 text-[12px] font-medium text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white"
          type="button"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Novo</span>
          <kbd className="ml-auto font-mono text-[10px] text-white/30">Ctrl N</kbd>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {groups.map((group, index) => (
          <div key={group.label || index} className="mb-1">
            {group.label && (
              <div className="px-3 pb-1.5 pt-3 text-[10.5px] font-medium uppercase tracking-wider text-white/35">
                {group.label}
              </div>
            )}
            {group.items.map(item => (
              <NavLink key={item.href} {...item} onClick={onClose} />
            ))}
            {group.label === 'Workspace' && (user as any)?.is_master && (
              <NavLink href="/admin" label="Admin" icon={Shield} onClick={onClose} />
            )}
          </div>
        ))}
      </nav>

      <div className="px-3 pb-3">
        <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] p-0.5">
          <button
            type="button"
            onClick={() => theme === 'light' && toggleTheme()}
            className={cn(
              'flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md text-[11.5px] font-medium transition-colors',
              theme === 'dark' ? 'bg-white/[0.07] text-white shadow-sm' : 'text-white/35 hover:text-white/65',
            )}
            aria-label="Tema escuro"
          >
            <Moon className="h-3 w-3" />
            Dark
          </button>
          <button
            type="button"
            onClick={() => theme === 'dark' && toggleTheme()}
            className={cn(
              'flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md text-[11.5px] font-medium transition-colors',
              theme === 'light' ? 'bg-white/[0.07] text-white shadow-sm' : 'text-white/35 hover:text-white/65',
            )}
            aria-label="Tema claro"
          >
            <Sun className="h-3 w-3" />
            Light
          </button>
        </div>
      </div>

      <UserMenu onClose={onClose} />
    </div>
  )
}

export function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  return (
    <>
      <aside className="fixed left-0 top-0 z-20 hidden h-screen w-[240px] shrink-0 flex-col md:flex">
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
