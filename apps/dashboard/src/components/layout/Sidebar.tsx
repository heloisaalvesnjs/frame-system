'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, MessageSquare, Calendar, Users,
  Settings, LogOut
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/conversas',     label: 'Conversas',     icon: MessageSquare },
  { href: '/agenda',        label: 'Agenda',        icon: Calendar },
  { href: '/clientes',      label: 'Clientes',      icon: Users },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
]

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-500/30">
            <span className="text-white text-sm font-bold tracking-tight">F</span>
          </div>
          <div>
            <span className="font-bold text-white text-[15px] tracking-tight leading-none">Frame</span>
            <p className="text-[10px] text-white/25 leading-none mt-0.5">Recepcionista virtual</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-brand-500/10 text-brand-400'
                  : 'text-white/35 hover:text-white/80 hover:bg-white/[0.04]'
              )}
            >
              {/* Active accent bar */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-500 rounded-full" />
              )}
              <Icon className={cn('w-4 h-4 flex-shrink-0 transition-colors', active ? 'text-brand-400' : 'text-white/25 group-hover:text-white/60')} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-2 mb-1 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-brand-500/15 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-brand-400">
              {user?.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-white/70 truncate">{user?.name}</p>
            <p className="text-[10px] text-white/25 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/25 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Sair
        </button>
      </div>
    </div>
  )
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-60 bg-ui-sidebar flex-col z-20 border-r border-white/5">
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
          'md:hidden fixed left-0 top-0 h-screen w-72 bg-ui-sidebar flex flex-col z-50 border-r border-white/5 transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0 shadow-2xl shadow-black/50' : '-translate-x-full'
        )}
      >
        <SidebarContent onClose={onClose} />
      </aside>
    </>
  )
}
