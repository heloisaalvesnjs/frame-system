'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Search, Users, Calendar, ChevronRight, Clock, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Client {
  id: string
  name: string | null
  phone: string
  goal: string | null
  created_at: string
  last_contact: string | null
  appointment_count: number
  completed_count: number
}

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, '')
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  return phone
}

const AVATAR_COLORS = [
  'bg-blue-500/15 border-blue-500/25 text-blue-400',
  'bg-violet-500/15 border-violet-500/25 text-violet-400',
  'bg-emerald-500/15 border-emerald-500/25 text-emerald-400',
  'bg-amber-500/15 border-amber-500/25 text-amber-400',
  'bg-pink-500/15 border-pink-500/25 text-pink-400',
]

function avatarColor(id: string) {
  const n = id.charCodeAt(0) + id.charCodeAt(id.length - 1)
  return AVATAR_COLORS[n % AVATAR_COLORS.length]
}

export default function ClientesPage() {
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search],
    queryFn: async () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : ''
      const { data } = await api.get(`/api/clients${params}`)
      return data.clients as Client[]
    },
    staleTime: 30_000,
  })

  const clients = data ?? []

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-white tracking-tight">Clientes</h1>
          <p className="text-sm text-white/35 mt-0.5">
            {isLoading ? '…' : `${clients.length} paciente${clients.length !== 1 ? 's' : ''} cadastrado${clients.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
        <input
          type="text"
          placeholder="Buscar por nome ou telefone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-ui-card border border-white/[0.07] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/40 focus:bg-white/[0.03] transition-all duration-150"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-[68px] bg-ui-card border border-white/5 rounded-xl animate-pulse" style={{ opacity: 1 - i * 0.12 }} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && clients.length === 0 && (
        <div className="text-center py-20">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center mx-auto mb-4">
            {search ? (
              <Search className="w-6 h-6 text-white/15" />
            ) : (
              <UserPlus className="w-6 h-6 text-white/15" />
            )}
          </div>
          <p className="text-sm font-medium text-white/30">
            {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado ainda'}
          </p>
          {search && (
            <p className="text-xs text-white/20 mt-1">Tente outro nome ou número</p>
          )}
        </div>
      )}

      {/* List */}
      {!isLoading && clients.length > 0 && (
        <div className="bg-ui-card border border-white/[0.06] rounded-2xl overflow-hidden">
          <ul className="divide-y divide-white/[0.04]">
            {clients.map(client => {
              const name = (client.name && client.name !== 'Cliente') ? client.name : null
              const initials = name
                ? name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
                : '#'
              const color = avatarColor(client.id)

              return (
                <li key={client.id}>
                  <Link
                    href={`/clientes/${client.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.025] transition-colors group"
                  >
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0 ${color}`}>
                      <span className="text-sm font-bold">{initials}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-white/90 truncate leading-snug">
                        {name ?? formatPhone(client.phone)}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {name && (
                          <span className="text-[11px] text-white/30 font-mono">{formatPhone(client.phone)}</span>
                        )}
                        {client.goal && (
                          <span className="text-[11px] text-white/20 truncate max-w-[180px]">
                            {name ? '· ' : ''}{client.goal}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="hidden md:flex items-center gap-5 flex-shrink-0">
                      <div className="flex items-center gap-1.5 text-[12px] text-white/30">
                        <Calendar className="w-3.5 h-3.5 text-white/20" />
                        <span>
                          {client.completed_count > 0
                            ? `${client.completed_count} de ${client.appointment_count}`
                            : `${client.appointment_count} consulta${client.appointment_count !== 1 ? 's' : ''}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[12px] text-white/30">
                        <Clock className="w-3.5 h-3.5 text-white/20" />
                        <span>
                          {client.last_contact
                            ? formatDistanceToNow(new Date(client.last_contact), { locale: ptBR, addSuffix: true })
                            : 'sem contato'}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-white/15 flex-shrink-0 group-hover:text-white/35 transition-colors" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
