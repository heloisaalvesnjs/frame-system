'use client'

import { usePathname } from 'next/navigation'
import { Menu, Sun, Moon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':     'Painel',
  '/conversas':     'Conversas',
  '/agenda':        'Agenda',
  '/clientes':      'Clientes',
  '/configuracoes': 'Configurações',
  '/onboarding':    'Configuração inicial',
  '/admin':         'Admin',
}

function getTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  const prefix = Object.keys(PAGE_TITLES).find(k => pathname.startsWith(k) && k !== '/')
  return prefix ? PAGE_TITLES[prefix] : 'Frame'
}

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const title = getTitle(pathname)

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  return (
    <header
      className="fixed top-0 left-0 right-0 md:left-[220px] h-[60px] flex items-center px-5 gap-4 z-10 backdrop-blur-md"
      style={{
        background: 'color-mix(in srgb, var(--bg) 90%, transparent)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Hamburger (mobile) */}
      <button
        onClick={onMenuClick}
        className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-t2 hover:text-t1 hover:bg-raised"
        aria-label="Menu"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Title */}
      <h1 className="font-display font-bold text-[18px] tracking-tight text-t1 flex-1 leading-none">
        {title}
      </h1>

      {/* Actions */}
      <div className="flex items-center gap-2">

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Mudar para claro' : 'Mudar para escuro'}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-t2 hover:text-t1 hover:bg-raised"
          style={{ border: '1px solid var(--border)' }}
        >
          {theme === 'dark'
            ? <Sun className="w-[15px] h-[15px]" />
            : <Moon className="w-[15px] h-[15px]" />}
        </button>

        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-brand-500 flex-shrink-0"
          style={{
            background: 'var(--brand-s-solid)',
            border: '1.5px solid rgba(0,194,124,.25)',
          }}
        >
          {initials}
        </div>
      </div>
    </header>
  )
}
