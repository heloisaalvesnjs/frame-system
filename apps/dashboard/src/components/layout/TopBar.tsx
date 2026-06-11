'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Bell, HelpCircle, Menu, Search, Settings, Sparkles } from 'lucide-react'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/conversas': 'Conversas',
  '/agenda': 'Agenda',
  '/clientes': 'Pacientes',
  '/servicos': 'Planos',
  '/financeiro': 'Financeiro',
  '/followup': 'Automações',
  '/treinamento': 'Frame AI',
  '/disponibilidade': 'Disponibilidade',
  '/equipe': 'Equipe',
  '/integracoes': 'Integrações',
  '/configuracoes': 'Configurações',
  '/onboarding': 'Configuração inicial',
  '/seguranca': 'Segurança',
  '/perfil': 'Perfil',
  '/admin': 'Admin',
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
      className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center gap-4 px-4 backdrop-blur-xl md:left-[220px] md:px-6"
      style={{
        background: 'color-mix(in oklab, var(--bg) 82%, transparent)',
        borderBottom: '1px solid var(--line-1)',
      }}
    >
      <button
        onClick={onMenuClick}
        className="grid h-9 w-9 place-items-center rounded-lg transition-colors hover:bg-[var(--raised)] md:hidden"
        style={{ color: 'var(--t2)' }}
        aria-label="Menu"
      >
        <Menu className="h-4 w-4" strokeWidth={1.75} />
      </button>

      <div className="min-w-0 flex-1 md:w-[220px] md:flex-none">
        <h1 className="truncate text-[14px] font-semibold leading-tight" style={{ color: 'var(--t1)' }}>
          {title}
        </h1>
        <p className="hidden truncate text-[11.5px] md:block" style={{ color: 'var(--t3)' }}>
          Operação do consultório
        </p>
      </div>

      <button
        className="group mx-auto hidden h-9 max-w-[520px] flex-1 items-center gap-2.5 rounded-lg border px-3 text-left transition-all hover:border-[var(--line-3)] hover:bg-white/[0.04] md:flex"
        style={{ borderColor: 'var(--line-2)', background: 'rgba(255,255,255,0.02)' }}
        aria-label="Buscar"
      >
        <Search className="h-3.5 w-3.5" style={{ color: 'var(--t3)' }} />
        <span className="flex-1 text-[13px]" style={{ color: 'var(--t3)' }}>
          Buscar pacientes, conversas, ações...
        </span>
        <kbd className="font-mono text-[10.5px]" style={{ color: 'var(--t3)' }}>Ctrl K</kbd>
      </button>

      <div className="flex items-center gap-1.5">
        <button
          className="grid h-9 w-9 place-items-center rounded-lg transition-colors hover:bg-[var(--raised)]"
          style={{ color: 'var(--t2)' }}
          aria-label="Frame AI"
        >
          <Sparkles className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <button
          className="hidden h-9 w-9 place-items-center rounded-lg transition-colors hover:bg-[var(--raised)] sm:grid"
          style={{ color: 'var(--t2)' }}
          aria-label="Ajuda"
        >
          <HelpCircle className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <button
          className="relative grid h-9 w-9 place-items-center rounded-lg transition-colors hover:bg-[var(--raised)]"
          style={{ color: 'var(--t2)' }}
          aria-label="Notificações"
        >
          <Bell className="h-4 w-4" strokeWidth={1.75} />
          <span
            className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full"
            style={{ background: 'var(--brand)', boxShadow: '0 0 6px var(--brand)' }}
          />
        </button>
        <button
          onClick={() => router.push('/configuracoes')}
          className="grid h-9 w-9 place-items-center rounded-lg transition-colors hover:bg-[var(--raised)]"
          style={{ color: 'var(--t2)' }}
          aria-label="Configurações"
        >
          <Settings className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
    </header>
  )
}
