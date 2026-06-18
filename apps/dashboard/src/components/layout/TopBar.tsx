'use client'

import { usePathname } from 'next/navigation'
import { Bell, HelpCircle, Menu, Moon, Search, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':       'Início',
  '/conversas':       'Conversas',
  '/agenda':          'Agenda',
  '/clientes':        'Pacientes',
  '/treinamento':     'Assistente IA',
  '/followup':        'Automações',
  '/disponibilidade': 'Disponibilidade',
  '/integracoes':     'Integrações',
  '/relatorios':      'Relatórios',
  '/configuracoes':   'Configurações',
  '/admin':           'Admin',
  '/equipe':          'Equipe',
  '/financeiro':      'Financeiro',
  '/servicos':        'Serviços',
  '/perfil':          'Perfil',
  '/seguranca':       'Segurança',
}

interface TopBarProps {
  onMenuClick?: () => void
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()

  const title = PAGE_TITLES[pathname] ?? 'Frame System'

  return (
    <header
      className="sticky top-0 z-30 backdrop-blur-xl"
      style={{
        background: 'color-mix(in srgb, var(--bg-base) 80%, transparent)',
        borderBottom: '1px solid var(--line-1)',
        height: '64px',
      }}
    >
      <div className="flex h-full items-center gap-6 px-8">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="grid h-8 w-8 place-items-center rounded-lg transition-colors hover:bg-[var(--bg-surface)] md:hidden"
          style={{ color: 'var(--text-2)' }}
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Page title */}
        <div className="min-w-0">
          <h1
            className="truncate text-[15px] font-semibold leading-tight tracking-tight"
            style={{ color: 'var(--text-1)' }}
          >
            {title}
          </h1>
        </div>

        {/* Search */}
        <div className="ml-auto flex-1 max-w-[460px]">
          <button
            className="flex h-9 w-full items-center gap-2.5 rounded-xl px-3.5 text-left transition-all"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--line-1)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Search className="h-3.5 w-3.5" style={{ color: 'var(--text-3)' }} />
            <span className="flex-1 text-[12.5px]" style={{ color: 'var(--text-3)' }}>
              Buscar pacientes, conversas…
            </span>
            <kbd
              className="rounded border px-1.5 py-0.5 font-mono text-[10.5px]"
              style={{ color: 'var(--text-3)', borderColor: 'var(--line-1)' }}
            >
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="grid h-9 w-9 place-items-center rounded-lg transition-colors"
            style={{ color: 'var(--text-2)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            aria-label="Alternar tema"
          >
            {theme === 'dark'
              ? <Sun className="h-4 w-4" strokeWidth={1.75} />
              : <Moon className="h-4 w-4" strokeWidth={1.75} />}
          </button>
          <button
            className="grid h-9 w-9 place-items-center rounded-lg transition-colors"
            style={{ color: 'var(--text-2)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <HelpCircle className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <button
            className="relative grid h-9 w-9 place-items-center rounded-lg transition-colors"
            style={{ color: 'var(--text-2)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <Bell className="h-4 w-4" strokeWidth={1.75} />
            <span
              className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full"
              style={{ background: 'var(--brand)' }}
            />
          </button>
        </div>
      </div>
    </header>
  )
}
