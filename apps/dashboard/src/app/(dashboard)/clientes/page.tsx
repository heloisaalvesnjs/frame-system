'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Search, Users, Calendar, MessageSquare, ChevronRight, Clock } from 'lucide-react'
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
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Clientes</h1>
          <p className="text-sm text-white/40 mt-1">
            {clients.length} paciente{clients.length !== 1 ? 's' : ''} cadastrado{clients.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
        <input
          type="text"
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-ui-card border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-brand-500/40 transition-colors"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-ui-card border border-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && clients.length === 0 && (
        <div className="text-center py-20">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <Users className="w-6 h-6 text-white/20" />
          </div>
          <p className="text-sm text-white/30">
            {search ? 'Nenhum cliente encontrado para essa busca' : 'Nenhum cliente cadastrado ainda'}
          </p>
        </div>
      )}

      {/* List */}
      {!isLoading && clients.length > 0 && (
        <div className="bg-ui-card border border-white/5 rounded-2xl overflow-hidden">
          <ul className="divide-y divide-white/5">
            {clients.map(client => (
              <li key={client.id}>
                <Link
                  href={`/clientes/${client.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors group"
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-brand-400">
                      {(client.name && client.name !== 'Cliente')
                        ? client.name.charAt(0).toUpperCase()
                        : '#'}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {client.name && client.name !== 'Cliente'
                        ? client.name
                        : formatPhone(client.phone)}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-white/30">{formatPhone(client.phone)}</span>
                      {client.goal && (
                        <span className="text-xs text-white/20 truncate max-w-[200px]">· {client.goal}</span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="hidden md:flex items-center gap-6 flex-shrink-0">
                    <div className="flex items-center gap-1.5 text-xs text-white/30">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{client.appointment_count} consulta{client.appointment_count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-white/30">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {client.last_contact
                          ? formatDistanceToNow(new Date(client.last_contact), { locale: ptBR, addSuffix: true })
                          : 'sem contato'}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0 group-hover:text-white/40 transition-colors" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
