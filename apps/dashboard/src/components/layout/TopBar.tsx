'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':     'Dashboard',
  '/conversas':     'Conversas',
  '/agenda':        'Agenda',
  '/clientes':      'Clientes',
  '/configuracoes': 'Configurações',
  '/onboarding':    'Configuração inicial',
}

function getTitle(pathname: string): string {
  // exact match first
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  // prefix match (e.g. /clientes/abc)
  const prefix = Object.keys(PAGE_TITLES).find(k => pathname.startsWith(k) && k !== '/')
  return prefix ? PAGE_TITLES[prefix] : 'Frame'
}

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const title = getTitle(pathname)
  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  return (
    <header className="fixed top-0 left-0 right-0 md:left-60 h-14 bg-ui-bg/80 backdrop-blur-sm border-b border-white/5 flex items-center px-4 md:px-6 gap-4 z-10">
      {/* Hamburger (mobile only) */}
      <button
        onClick={onMenuClick}
        className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
        aria-label="Abrir menu"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Page title */}
      <h1 className="text-sm font-semibold text-white/80 flex-1">{title}</h1>

      {/* User avatar */}
      <div className="w-7 h-7 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
        <span className="text-[10px] font-bold text-brand-400">{initials}</span>
      </div>
    </header>
  )
}
