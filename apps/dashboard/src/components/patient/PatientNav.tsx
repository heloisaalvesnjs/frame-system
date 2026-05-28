'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, UtensilsCrossed, MessageCircle, Droplets } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/p/home',   label: 'Início',    icon: Home },
  { href: '/p/plano',  label: 'Plano',     icon: UtensilsCrossed },
  { href: '/p/habits', label: 'Hábitos',   icon: Droplets },
  { href: '/p/agenda', label: 'Consultas', icon: Calendar },
  { href: '/p/chat',   label: 'Chat',      icon: MessageCircle },
]

export function PatientNav({
  chatUnread = 0,
}: {
  checkinPending?: boolean  // mantido por compatibilidade
  chatUnread?: number
}) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-ui-sidebar border-t border-white/[0.06] pb-safe">
      <div className="flex items-stretch max-w-md mx-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          const isChat = href === '/p/chat'
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors relative',
                active ? 'text-brand-400' : 'text-white/30 hover:text-white/60'
              )}
            >
              <div className="relative">
                <Icon className={cn('w-5 h-5', active ? 'text-brand-400' : 'text-white/30')} />
                {isChat && chatUnread > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] bg-brand-500 rounded-full border border-ui-sidebar flex items-center justify-center text-[9px] font-bold text-white px-0.5">
                    {chatUnread > 9 ? '9+' : chatUnread}
                  </span>
                )}
              </div>
              <span>{label}</span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-brand-500 rounded-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
