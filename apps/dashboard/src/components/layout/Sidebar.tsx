'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquare, Calendar, Settings, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/conversas', label: 'Conversas', icon: MessageSquare },
  { href: '/agenda', label: 'Agenda', icon: Calendar },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-ui-sidebar flex flex-col z-10 border-r border-white/5">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-500/30">
            <span className="text-white text-sm font-bold tracking-tight">F</span>
          </div>
          <span className="font-bold text-white text-[17px] tracking-tight">Frame</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
              pathname.startsWith(href)
                ? 'bg-brand-500/10 text-brand-400'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
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
    </aside>
  )
}
