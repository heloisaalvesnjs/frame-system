'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import {
  LayoutDashboard, MessageSquare, CalendarDays, Users,
  LogOut, Shield, User, Settings, Lock, CreditCard,
  Sparkles, Clock, Plug, Building2, Layers, Wallet,
  Moon, Plus, Sun,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

// ── Nav items ─────────────────────────────────────────────────────

const navMain = [
  { href: '/dashboard',     label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/conversas',     label: 'Conversas',  icon: MessageSquare },
  { href: '/agenda',        label: 'Agenda',     icon: CalendarDays },
  { href: '/clientes',      label: 'Pacientes',  icon: Users },
]

const navInteligencia = [
  { href: '/followup',      label: 'Automações',       icon: Layers },
  { href: '/treinamento',   label: 'Frame AI',         icon: Sparkles },
]

const navWorkspace = [
  { href: '/servicos',        label: 'Planos',          icon: CreditCard },
  { href: '/financeiro',      label: 'Financeiro',      icon: Wallet },
  { href: '/disponibilidade', label: 'Disponibilidade', icon: Clock },
  { href: '/equipe',          label: 'Equipe',          icon: Building2 },
  { href: '/integracoes',     label: 'Integrações',     icon: Plug },
  { href: '/configuracoes',   label: 'Configurações',   icon: Settings },
]

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">
      {children}
    </p>
  )
}

// ── Frame mark logo ───────────────────────────────────────────────

function FrameMark({ size = 28 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-[8px] font-bold flex-shrink-0"
      style={{
        width: size, height: size,
        background: 'var(--brand)',
        color: '#02140C',
        fontSize: size * 0.5,
        letterSpacing: '-0.02em',
      }}
    >
      F.
    </div>
  )
}

// ── Nav item ──────────────────────────────────────────────────────

function NavItem({ href, label, icon: Icon, expanded, onClick }: {
  href: string; label: string; icon: any; expanded: boolean; onClick?: () => void
}) {
  const pathname = usePathname()
  const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  return (
    <Link
      href={href}
      onClick={onClick}
      title={!expanded ? label : undefined}
      className={cn(
        'relative flex items-center gap-3 rounded-xl transition-all duration-150 group overflow-hidden',
        expanded ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center',
        active
          ? 'bg-white/10 text-white'
          : 'text-white/45 hover:text-white/85 hover:bg-white/[0.07]'
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-5 rounded-r-full" style={{ background: 'var(--brand)' }} />
      )}
      <Icon className={cn(
        'flex-shrink-0 transition-colors',
        expanded ? 'w-[15px] h-[15px]' : 'w-[18px] h-[18px]',
        active ? 'text-white' : 'text-white/40 group-hover:text-white/80'
      )} />
      <span className={cn(
        'text-[13px] font-medium whitespace-nowrap transition-all duration-200 overflow-hidden',
        expanded ? 'opacity-100 max-w-[140px]' : 'opacity-0 max-w-0',
      )}>
        {label}
      </span>
    </Link>
  )
}

// ── User menu ─────────────────────────────────────────────────────

function UserMenu({ expanded, onClose }: { expanded: boolean; onClose?: () => void }) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
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
    <div ref={ref} className="relative px-2 py-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>

      {/* Dropdown popup — uses light theme tokens so it's always light */}
      {open && (
        <div
          className="absolute left-2 right-2 bottom-full mb-2 rounded-xl overflow-hidden z-50"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          }}
        >
          <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div
              className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold"
              style={{ background: 'var(--brand-s-solid)', color: 'var(--brand)', border: '1px solid rgba(0,194,124,.2)' }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold truncate leading-tight" style={{ color: 'var(--t1)' }}>{user?.name}</p>
              <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--t3)' }}>{user?.email}</p>
            </div>
          </div>

          <div className="p-1.5">
            <button
              onClick={() => go('/perfil')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left hover:bg-gray-50"
              style={{ color: 'var(--t2)' }}
            >
              <User className="w-[14px] h-[14px] flex-shrink-0" />
              <span className="text-[13px] font-medium">Meu Perfil</span>
            </button>
            <button
              onClick={() => go('/seguranca')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left hover:bg-gray-50"
              style={{ color: 'var(--t2)' }}
            >
              <Lock className="w-[14px] h-[14px] flex-shrink-0" />
              <span className="text-[13px] font-medium">Segurança</span>
            </button>
          </div>

          <div className="p-1.5" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              onClick={() => { setOpen(false); logout() }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left hover:bg-red-50 hover:text-red-500"
              style={{ color: 'var(--t3)' }}
            >
              <LogOut className="w-[14px] h-[14px] flex-shrink-0" />
              <span className="text-[13px] font-medium">Sair</span>
            </button>
          </div>
        </div>
      )}

      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        title={!expanded ? user?.name : undefined}
        className={cn(
          'w-full flex items-center rounded-xl transition-all duration-150',
          expanded ? 'gap-3 px-3 py-2' : 'justify-center py-2',
          open ? 'bg-white/10' : 'hover:bg-white/[0.07]'
        )}
      >
        <div
          className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
          style={{ background: 'var(--brand)', color: '#fff' }}
        >
          {initials}
        </div>
        <div className={cn(
          'min-w-0 flex-1 text-left transition-all duration-200 overflow-hidden',
          expanded ? 'opacity-100 max-w-[120px]' : 'opacity-0 max-w-0'
        )}>
          <p className="text-[12px] font-medium text-white truncate leading-tight">{user?.name}</p>
          <p className="text-[10px] text-white/40 truncate mt-0.5">{user?.email}</p>
        </div>
      </button>
    </div>
  )
}

// ── Sidebar content ───────────────────────────────────────────────

function SidebarContent({ expanded, onClose }: { expanded: boolean; onClose?: () => void }) {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full" style={{ background: '#0E0F11' }}>

      {/* Logo */}
      <div
        className={cn(
          'flex items-center h-[60px] flex-shrink-0 overflow-hidden transition-all duration-200',
          expanded ? 'gap-3 px-5' : 'justify-center px-0'
        )}
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex-shrink-0">
          <FrameMark size={30} />
        </div>
        <div className={cn(
          'transition-all duration-200 overflow-hidden whitespace-nowrap',
          expanded ? 'opacity-100 max-w-[120px]' : 'opacity-0 max-w-0'
        )}>
          <p className="font-display font-bold text-[16px] leading-none tracking-tight text-white">
            Frame<span style={{ color: 'var(--brand)' }}>.</span>
          </p>
          <p className="text-[9px] tracking-[0.14em] mt-[3px] text-white/30 font-medium">
            SYSTEM
          </p>
        </div>
      </div>

      <div className={cn('pb-3 transition-all duration-200', expanded ? 'px-3' : 'px-2')}>
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors',
            expanded ? 'justify-start' : 'justify-center',
          )}
          style={{
            background: 'rgba(255,255,255,0.02)',
            borderColor: 'rgba(255,255,255,0.10)',
            color: 'rgba(255,255,255,0.64)',
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          {expanded && (
            <>
              <span>Novo</span>
              <kbd className="ml-auto font-mono text-[10px] text-white/30">Ctrl N</kbd>
            </>
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className={cn(
        'flex-1 flex flex-col gap-0.5 py-2 overflow-y-auto transition-all duration-200',
        expanded ? 'px-3' : 'px-2'
      )}>
        {navMain.map(item => (
          <NavItem key={item.href} {...item} expanded={expanded} onClick={onClose} />
        ))}

        {expanded && <SectionLabel>Inteligência</SectionLabel>}
        {!expanded && <div className="my-2 mx-1" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />}
        {navInteligencia.map(item => (
          <NavItem key={item.href} {...item} expanded={expanded} onClick={onClose} />
        ))}

        {expanded && <SectionLabel>Workspace</SectionLabel>}
        {!expanded && <div className="my-2 mx-1" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />}
        {navWorkspace.map(item => (
          <NavItem key={item.href} {...item} expanded={expanded} onClick={onClose} />
        ))}

        {/* Admin */}
        {(user as any)?.is_master && (
          <>
            <div className="my-2 mx-1" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />
            <Link
              href="/admin"
              onClick={onClose}
              title={!expanded ? 'Admin' : undefined}
              className={cn(
                'relative flex items-center rounded-xl transition-all duration-150 group overflow-hidden',
                expanded ? 'gap-3 px-3 py-2.5' : 'justify-center px-0 py-2.5',
                pathname.startsWith('/admin')
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'text-white/40 hover:text-amber-300 hover:bg-amber-500/[0.12]'
              )}
            >
              {pathname.startsWith('/admin') && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-5 bg-amber-400 rounded-r-full" />
              )}
              <Shield className={cn(
                'flex-shrink-0 text-amber-400/70',
                expanded ? 'w-[15px] h-[15px]' : 'w-[18px] h-[18px]'
              )} />
              <span className={cn(
                'text-[13px] font-medium whitespace-nowrap transition-all duration-200 overflow-hidden',
                expanded ? 'opacity-100 max-w-[140px]' : 'opacity-0 max-w-0'
              )}>
                Admin
              </span>
            </Link>
          </>
        )}
      </nav>

      {expanded && (
        <div className="px-3 pb-2">
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
      )}

      {/* User menu */}
      <UserMenu expanded={expanded} onClose={onClose} />
    </div>
  )
}

// ── Export ────────────────────────────────────────────────────────

export function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  return (
    <>
      {/* Desktop — fixed 220px, sempre expandida */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-[220px] flex-col z-20">
        <SidebarContent expanded={true} />
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'md:hidden fixed left-0 top-0 h-screen w-[260px] flex flex-col z-50 transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        )}
      >
        <SidebarContent expanded={true} onClose={onClose} />
      </aside>
    </>
  )
}
