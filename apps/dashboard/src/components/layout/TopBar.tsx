'use client'

import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':     'Painel',
  '/conversas':     'Conversas',
  '/agenda':        'Agenda',
  '/clientes':      'Clientes',
  '/servicos':      'Serviços',
  '/followup':      'Follow-up',
  '/treinamento':   'Assistente',
  '/whatsapp':      'WhatsApp',
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
  const title = getTitle(pathname)

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
    </header>
  )
}
