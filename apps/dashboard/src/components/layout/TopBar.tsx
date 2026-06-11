'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Menu, Bell, Settings } from 'lucide-react'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':     'Dashboard',
  '/conversas':     'Conversas',
  '/agenda':        'Agenda',
  '/clientes':      'Pacientes',
  '/servicos':      'Planos',
  '/followup':      'Automações',
  '/treinamento':   'Frame AI',
  '/disponibilidade': 'Disponibilidade',
  '/equipe':        'Equipe',
  '/integracoes':   'Integrações',
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
  const router = useRouter()
  const title = getTitle(pathname)

  return (
    <header
      className="fixed top-0 left-0 right-0 md:left-[220px] h-[60px] flex items-center px-5 gap-4 z-10"
      style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        boxShadow: '0 1px 0 var(--border)',
      }}
    >
      {/* Hamburger (mobile) */}
      <button
        onClick={onMenuClick}
        className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
        style={{ color: 'var(--t2)' }}
        aria-label="Menu"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Title */}
      <h1
        className="font-display font-bold text-[18px] tracking-tight flex-1 leading-none"
        style={{ color: 'var(--t1)' }}
      >
        {title}
      </h1>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        {/* Notification bell */}
        <button
          className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 hover:bg-raised"
          style={{ color: 'var(--t2)' }}
          aria-label="Notificações"
        >
          <Bell className="w-[18px] h-[18px]" />
          {/* Red dot indicator */}
          <span
            className="absolute top-2 right-2 w-2 h-2 rounded-full border-2"
            style={{ background: '#EF4444', borderColor: 'var(--surface)' }}
          />
        </button>

        {/* Settings shortcut */}
        <button
          onClick={() => router.push('/configuracoes')}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 hover:bg-raised"
          style={{ color: 'var(--t2)' }}
          aria-label="Configurações"
        >
          <Settings className="w-[18px] h-[18px]" />
        </button>
      </div>
    </header>
  )
}
