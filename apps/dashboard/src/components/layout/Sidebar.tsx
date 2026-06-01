'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import {
  LayoutDashboard, MessageSquare, Calendar, Users,
  LogOut, Shield, User, Settings, ChevronUp, Lock, RefreshCw, ShoppingBag,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Painel',     icon: LayoutDashboard },
  { href: '/conversas', label: 'Conversas',  icon: MessageSquare },
  { href: '/agenda',    label: 'Agenda',     icon: Calendar },
  { href: '/clientes',  label: 'Clientes',   icon: Users },
  { href: '/servicos',  label: 'Serviços',   icon: ShoppingBag },
  { href: '/followup',  label: 'Follow-up',  icon: RefreshCw },
]

// ── Frame mark (bracket-style F, sem arquivo de logo) ────────────
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

function NavItem({ href, label, icon: Icon, onClick }: {
  href: string; label: string; icon: any; onClick?: () => void
}) {
  const pathname = usePathname()
  const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group',
        active
          ? 'bg-brand-s text-brand-500'
          : 'text-t2 hover:text-t1 hover:bg-raised'
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-5 bg-brand-500 rounded-r-full" />
      )}
      <Icon className={cn('w-[15px] h-[15px] flex-shrink-0 transition-colors', active ? 'text-brand-500' : 'text-t3 group-hover:text-t2')} />
      <span className={cn(
        'font-mono text-[11px] tracking-[0.06em] transition-colors',
        active ? 'text-brand-500' : ''
      )}>
        {label}
      </span>
    </Link>
  )
}

function UserMenu({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  // Fecha ao clicar fora
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
    <div ref={ref} className="relative px-3 py-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>

      {/* ── Dropdown (abre para cima) ────────────────────── */}
      {open && (
        <div
          className="absolute left-3 right-3 bottom-full mb-2 rounded-xl overflow-hidden z-50 shadow-card-md"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {/* Cabeçalho do menu */}
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

          {/* Ações */}
          <div className="p-1.5">
            <button
              onClick={() => go('/perfil')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-t2 hover:text-t1 hover:bg-raised transition-all text-left"
            >
              <User className="w-[14px] h-[14px] flex-shrink-0" />
              <span className="font-mono text-[11px] tracking-[0.05em]">Meu Perfil</span>
            </button>
            <button
              onClick={() => go('/configuracoes')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-t2 hover:text-t1 hover:bg-raised transition-all text-left"
            >
              <Settings className="w-[14px] h-[14px] flex-shrink-0" />
              <span className="font-mono text-[11px] tracking-[0.05em]">Configurações</span>
            </button>
            <button
              onClick={() => go('/seguranca')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-t2 hover:text-t1 hover:bg-raised transition-all text-left"
            >
              <Lock className="w-[14px] h-[14px] flex-shrink-0" />
              <span className="font-mono text-[11px] tracking-[0.05em]">Segurança</span>
            </button>
          </div>

          <div style={{ borderTop: '1px solid var(--border)' }} className="p-1.5">
            <button
              onClick={() => { setOpen(false); logout() }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-t3 hover:text-red-400 hover:bg-red-500/[0.07] transition-all text-left"
            >
              <LogOut className="w-[14px] h-[14px] flex-shrink-0" />
              <span className="font-mono text-[11px] tracking-[0.05em]">Sair</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Trigger ──────────────────────────────────────── */}
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group',
          open ? 'bg-raised' : 'hover:bg-raised'
        )}
      >
        <div
          className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-brand-500"
          style={{ background: 'var(--brand-s-solid)', border: '1px solid rgba(0,194,124,.2)' }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-[12px] font-medium text-t1 truncate leading-tight">{user?.name}</p>
          <p className="font-mono text-[10px] text-t3 truncate mt-0.5">{user?.email}</p>
        </div>
        <ChevronUp className={cn(
          'w-3.5 h-3.5 text-t3 flex-shrink-0 transition-transform duration-200',
          open ? 'rotate-0' : 'rotate-180'
        )} />
      </button>
    </div>
  )
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { user } = useAuth()
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>

      {/* ── Logo ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 h-[60px] flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <FrameMark size={28} />
        <div>
          <p className="font-display font-bold text-[16px] leading-none tracking-tight text-t1">
            Frame<span style={{ color: 'var(--brand)' }}>.</span>
          </p>
          <p className="font-label text-[9px] tracking-[0.14em] mt-[3px]" style={{ color: 'var(--t3)' }}>
            SYSTEM
          </p>
        </div>
      </div>

      {/* ── Nav ──────────────────────────────────────────────── */}
      <nav className="flex-1 flex flex-col gap-0.5 px-3 py-4 overflow-y-auto">
        {navItems.map(item => (
          <NavItem key={item.href} {...item} onClick={onClose} />
        ))}

        {/* Admin */}
        {(user as any)?.is_master && (
          <>
            <div className="my-2 mx-1" style={{ borderTop: '1px solid var(--border)' }} />
            <Link
              href="/admin"
              onClick={onClose}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group',
                pathname.startsWith('/admin')
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'text-t2 hover:text-amber-400 hover:bg-amber-500/[0.07]'
              )}
            >
              {pathname.startsWith('/admin') && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-5 bg-amber-400 rounded-r-full" />
              )}
              <Shield className="w-[15px] h-[15px] flex-shrink-0 text-amber-500/60" />
              <span className="font-mono text-[11px] tracking-[0.06em]">Admin</span>
            </Link>
          </>
        )}
      </nav>

      {/* ── User menu ────────────────────────────────────────── */}
      <UserMenu onClose={onClose} />
    </div>
  )
}

export function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  return (
    <>
      {/* Desktop */}
      <aside
        className="hidden md:flex fixed left-0 top-0 h-screen w-[220px] flex-col z-20"
        style={{ borderRight: '1px solid var(--border)' }}
      >
        <SidebarContent />
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
        style={{ borderRight: '1px solid var(--border)' }}
      >
        <SidebarContent onClose={onClose} />
      </aside>
    </>
  )
}
