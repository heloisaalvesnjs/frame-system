'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Bell, Menu, Search, Settings, Sparkles } from 'lucide-react'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Visão geral',
  '/conversas': 'Caixa de entrada',
  '/agenda': 'Agenda',
  '/clientes': 'Pacientes',
  '/treinamento': 'Assistente',
  '/followup': 'Automações',
  '/relatorios': 'Relatórios',
  '/disponibilidade': 'Disponibilidade',
  '/configuracoes': 'Configurações',
  '/onboarding': 'Configuração inicial',
  '/seguranca': 'Segurança',
  '/perfil': 'Perfil',
  '/admin': 'Admin',
  '/servicos': 'Serviços',
  '/financeiro': 'Financeiro',
  '/integracoes': 'Integrações',
  '/equipe': 'Equipe',
}

function getTitle(pathname: string) {
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
      className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center gap-4 border-b border-[var(--line-1)] px-4 backdrop-blur-xl md:left-[72px] md:px-6"
      style={{ background: 'color-mix(in oklab, var(--bg) 82%, transparent)' }}
    >
      <button
        onClick={onMenuClick}
        className="grid h-9 w-9 place-items-center rounded-lg transition-colors hover:bg-white/[0.04] md:hidden"
        style={{ color: 'var(--t2)' }}
        aria-label="Menu"
      >
        <Menu className="h-4 w-4" strokeWidth={1.75} />
      </button>

      <div className="min-w-0 flex-1 md:w-[220px] md:flex-none">
        <h1 className="truncate text-[14px] font-semibold leading-tight text-t1">{title}</h1>
      </div>

      <button
        className="group mx-auto hidden h-9 max-w-[520px] flex-1 items-center gap-2.5 rounded-lg border border-[var(--line-2)] bg-white/[0.02] px-3 text-left transition-all hover:border-[var(--line-3)] hover:bg-white/[0.04] md:flex"
        aria-label="Buscar"
      >
        <Search className="h-3.5 w-3.5 text-t3" />
        <span className="flex-1 text-[13px] text-t3">Buscar pacientes, conversas, ações...</span>
        <kbd className="font-mono text-[10.5px] text-t3">Ctrl K</kbd>
      </button>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => router.push('/treinamento')}
          className="grid h-9 w-9 place-items-center rounded-lg text-t2 transition-colors hover:bg-[#F4F5F0] hover:text-[#141618]"
          aria-label="Assistente IA"
          title="Assistente IA"
        >
          <Sparkles className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <button
          onClick={() => router.push('/conversas')}
          className="relative hidden h-9 w-9 place-items-center rounded-lg text-t2 transition-colors hover:bg-[#F4F5F0] hover:text-[#141618] sm:grid"
          aria-label="Notificações"
          title="Notificações"
        >
          <Bell className="h-4 w-4" strokeWidth={1.75} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--brand)] shadow-[0_0_6px_var(--brand)]" />
        </button>
        <button
          onClick={() => router.push('/configuracoes')}
          className="grid h-9 w-9 place-items-center rounded-lg text-t2 transition-colors hover:bg-[#F4F5F0] hover:text-[#141618]"
          aria-label="Configurações"
          title="Configurações"
        >
          <Settings className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
    </header>
  )
}
