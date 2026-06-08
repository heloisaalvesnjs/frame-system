'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import {
  LayoutDashboard, MessageSquare, CalendarDays, Users,
  LogOut, Shield, User, Settings, Lock, CreditCard,
  Sparkles, Clock, Plug, Building2, Layers,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

const navMain = [
  { href: '/dashboard',     label: 'Painel',          icon: LayoutDashboard },
  { href: '/conversas',     label: 'Conversas',        icon: MessageSquare },
  { href: '/agenda',        label: 'Agenda',           icon: CalendarDays },
  { href: '/clientes',      label: 'Clientes',         icon: Users },
  { href: '/servicos',      label: 'Planos',           icon: CreditCard },
  { href: '/followup',      label: 'Automações',       icon: Layers },
]

const navConfig = [
  { href: '/treinamento',     label: 'Assistente',      icon: Sparkles },
  { href: '/disponibilidade', label: 'Disponibilidade', icon: Clock },
  { href: '/equipe',          label: 'Equipe',          icon: Building2 },
  { href: '/integracoes',     label: 'Integrações',     icon: Plug },
  { href: '/configuracoes',   label: 'Configurações',   icon: Settings },
]

// ── Frame mark ────────────────────────────────────────────────────
function FrameMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="7" fill="var(--brand-s-solid)" />
      <path d="M8 7h10" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 7v14" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 14h7"  stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" />
      <path d="M21 9v-2h-2"  stroke="var(--brand)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity=".45" />
      <path d="M21 19v2h-2"  stroke="var(--brand)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity=".45" />
    </svg>
  )
}

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
          ? 'bg-brand-s text-brand-500'
          : 'text-t2 hover:text-t1 hover:bg-raised'
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-5 bg-brand-500 rounded-r-full" />
      )}
      <Icon className={cn(
        'flex-shrink-0 transition-colors',
        expanded ? 'w-[15px] h-[15px]' : 'w-[18px] h-[18px]',
        active ? 'text-brand-500' : 'text-t3 group-hover:text-t2'
      )} />
      <span className={cn(
        'text-[13px] font-medium whitespace-nowrap transition-all duration-200 overflow-hidden',
        expanded ? 'opacity-100 max-w-[140px]' : 'opacity-0 max-w-0',
        active ? 'text-brand-500' : ''
      )}>
        {label}
      </span>
    </Link>
  )
}

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
    <div ref={ref} className="relative px-2 py-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>

      {/* Dropdown (abre para cima) */}
      {open && (
        <div
          className="absolute left-2 right-2 bottom-full mb-2 rounded-xl overflow-hidden z-50 shadow-card-md"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div
              className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold text-brand-500"
              style={{ background: 'var(--brand-s-solid)', border: '1px solid rgba(0,194,124,.2)' }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-t1 truncate leading-tight">{user?.name}</p>
              <p className="font-mono text-[10px] text-t3 truncate mt-0.5">{user?.email}</p>
            </div>
          </div>

          <div className="p-1.5">
            <button
              onClick={() => go('/perfil')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-t2 hover:text-t1 hover:bg-raised transition-all text-left"
            >
              <User className="w-[14px] h-[14px] flex-shrink-0" />
              <span className="text-[13px] font-medium">Meu Perfil</span>
            </button>
            <button
              onClick={() => go('/seguranca')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-t2 hover:text-t1 hover:bg-raised transition-all text-left"
            >
              <Lock className="w-[14px] h-[14px] flex-shrink-0" />
              <span className="text-[13px] font-medium">Segurança</span>
            </button>
          </div>

          <div style={{ borderTop: '1px solid var(--border)' }} className="p-1.5">
            <button
              onClick={() => { setOpen(false); logout() }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-t3 hover:text-red-400 hover:bg-red-500/[0.07] transition-all text-left"
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
          expanded ? 'gap-3 px-3 py-2.5' : 'justify-center py-2.5',
          open ? 'bg-raised' : 'hover:bg-raised'
        )}
      >
        <div
          className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-brand-500"
          style={{ background: 'var(--brand-s-solid)', border: '1px solid rgba(0,194,124,.2)' }}
        >
          {initials}
        </div>
        <div className={cn(
          'min-w-0 flex-1 text-left transition-all duration-200 overflow-hidden',
          expanded ? 'opacity-100 max-w-[120px]' : 'opacity-0 max-w-0'
        )}>
          <p className="text-[12px] font-medium text-t1 truncate leading-tight">{user?.name}</p>
          <p className="font-mono text-[10px] text-t3 truncate mt-0.5">{user?.email}</p>
        </div>
      </button>
    </div>
  )
}

function SidebarContent({ expanded, onClose }: { expanded: boolean; onClose?: () => void }) {
  const { user } = useAuth()
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>

      {/* Logo */}
      <div
        className={cn(
          'flex items-center h-[60px] flex-shrink-0 overflow-hidden transition-all duration-200',
          expanded ? 'gap-3 px-5' : 'justify-center px-0'
        )}
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex-shrink-0">
          <FrameMark size={28} />
        </div>
        <div className={cn(
          'transition-all duration-200 overflow-hidden whitespace-nowrap',
          expanded ? 'opacity-100 max-w-[120px]' : 'opacity-0 max-w-0'
        )}>
          <p className="font-display font-bold text-[16px] leading-none tracking-tight text-t1">
            Frame<span style={{ color: 'var(--brand)' }}>.</span>
          </p>
          <p className="font-label text-[9px] tracking-[0.14em] mt-[3px]" style={{ color: 'var(--t3)' }}>
            SYSTEM
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className={cn(
        'flex-1 flex flex-col gap-0.5 py-4 overflow-y-auto transition-all duration-200',
        expanded ? 'px-3' : 'px-2'
      )}>
        {navMain.map(item => (
          <NavItem key={item.href} {...item} expanded={expanded} onClick={onClose} />
        ))}

        <div className="my-2 mx-1" style={{ borderTop: '1px solid var(--border)' }} />

        {navConfig.map(item => (
          <NavItem key={item.href} {...item} expanded={expanded} onClick={onClose} />
        ))}

        {/* Admin */}
        {(user as any)?.is_master && (
          <>
            <div className="my-2 mx-1" style={{ borderTop: '1px solid var(--border)' }} />
            <Link
              href="/admin"
              onClick={onClose}
              title={!expanded ? 'Admin' : undefined}
              className={cn(
                'relative flex items-center rounded-xl transition-all duration-150 group overflow-hidden',
                expanded ? 'gap-3 px-3 py-2.5' : 'justify-center px-0 py-2.5',
                pathname.startsWith('/admin')
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'text-t2 hover:text-amber-400 hover:bg-amber-500/[0.07]'
              )}
            >
              {pathname.startsWith('/admin') && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-5 bg-amber-400 rounded-r-full" />
              )}
              <Shield className={cn(
                'flex-shrink-0 text-amber-500/60',
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

      {/* User menu */}
      <UserMenu expanded={expanded} onClose={onClose} />
    </div>
  )
}

export function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <>
      {/* Desktop — slim com hover expand */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          'hidden md:flex fixed left-0 top-0 h-screen flex-col z-20 transition-all duration-200 ease-in-out',
          hovered ? 'w-[210px]' : 'w-[64px]'
        )}
        style={{ borderRight: '1px solid var(--border)' }}
      >
        <SidebarContent expanded={hovered} />
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Mobile drawer — sempre expandido */}
      <aside
        className={cn(
          'md:hidden fixed left-0 top-0 h-screen w-[260px] flex flex-col z-50 transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        )}
        style={{ borderRight: '1px solid var(--border)' }}
      >
        <SidebarContent expanded={true} onClose={onClose} />
      </aside>
    </>
  )
}
