'use client'

import { useRouter } from 'next/navigation'
import { Bell, Menu, Search, Sparkles } from 'lucide-react'

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter()

  return (
    <header
      className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center gap-4 border-b border-[var(--line-1)] px-4 backdrop-blur-xl md:left-[72px] md:px-6"
      style={{ background: 'color-mix(in oklab, var(--bg) 82%, transparent)' }}
    >
      <button
        onClick={onMenuClick}
        className="grid h-9 w-9 place-items-center rounded-lg text-t2 transition-colors hover:bg-[var(--raised)] hover:text-t1 md:hidden"
        aria-label="Menu"
      >
        <Menu className="h-4 w-4" strokeWidth={1.75} />
      </button>

      <button
        onClick={() => router.push('/clientes')}
        className="group mx-auto hidden h-9 max-w-[560px] flex-1 items-center gap-2.5 rounded-lg border border-[var(--line-2)] bg-white/[0.02] px-3 text-left transition-all hover:border-[var(--line-3)] hover:bg-white/[0.04] md:flex"
        aria-label="Buscar pacientes e conversas"
      >
        <Search className="h-3.5 w-3.5 text-t3" />
        <span className="flex-1 text-[13px] text-t3">Buscar pacientes e conversas...</span>
        <kbd className="font-mono text-[10.5px] text-t3">Ctrl K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          onClick={() => router.push('/treinamento')}
          className="grid h-9 w-9 place-items-center rounded-lg text-t2 transition-colors hover:bg-[var(--raised)] hover:text-t1"
          aria-label="Assistente IA"
          title="Assistente IA"
        >
          <Sparkles className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <button
          onClick={() => router.push('/conversas?filter=unread')}
          className="relative hidden h-9 w-9 place-items-center rounded-lg text-t2 transition-colors hover:bg-[var(--raised)] hover:text-t1 sm:grid"
          aria-label="Notificações"
          title="Notificações"
        >
          <Bell className="h-4 w-4" strokeWidth={1.75} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--brand)] shadow-[0_0_6px_var(--brand)]" />
        </button>
      </div>
    </header>
  )
}
