'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, MessageSquare, Calendar, Users,
  Settings, LogOut, Menu, X
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

function NavContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-500/30">
            <span className="text-white text-sm font-bold tracking-tight">F</span>
          </div>
          <span className="font-bold text-white text-[17px] tracking-tight">Frame</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-white/40 hover:text-white md:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-brand-500/10 text-brand-400'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-white/5">
        <div className="px-3 py-2 mb-1">
          <p className="text-sm font-medium text-white/80 truncate">{user?.name}</p>
          <p className="text-xs text-white/30 truncate">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/30 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Sair
        </button>
      </div>
    </>
  )
}

export function Sidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-60 bg-ui-sidebar flex-col z-20 border-r border-white/5">
        <NavContent />
      </aside>

      {/* Mobile hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-4 left-4 z-30 w-9 h-9 bg-ui-card border border-white/10 rounded-lg flex items-center justify-center text-white/60 hover:text-white transition-colors"
        aria-label="Abrir menu"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'md:hidden fixed left-0 top-0 h-screen w-72 bg-ui-sidebar flex flex-col z-50 border-r border-white/5 transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <NavContent onClose={() => setOpen(false)} />
      </aside>
    </>
  )
}
