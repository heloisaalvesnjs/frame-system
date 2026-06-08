'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { Search, Users, Calendar, ChevronRight, Clock, UserPlus, X, Loader2, Phone } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

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

// ── Modal de novo cliente ───────────────────────────────────────────────────

function NovoClienteModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const router = useRouter()
  const [form, setForm] = useState({ name: '', phone: '', email: '', goal: '', notes: '', birthdate: '', gender: '', height_cm: '' })
  const [error, setError] = useState('')

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  const create = useMutation({
    mutationFn: () => api.post('/api/clients', {
      name:      form.name.trim() || undefined,
      phone:     form.phone.trim(),
      email:     form.email.trim() || undefined,
      goal:      form.goal.trim() || undefined,
      notes:     form.notes.trim()    || undefined,
      birthdate: form.birthdate        || undefined,
      gender:    form.gender.trim()    || undefined,
      height_cm: form.height_cm.trim() ? Number(form.height_cm) : undefined,
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Cliente cadastrado!')
      onClose()
      router.push(`/clientes/${res.data.client.id}`)
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error ?? 'Erro ao cadastrar cliente')
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-ui-sidebar border border-white/[0.08] rounded-2xl w-full max-w-md shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500/15 border border-brand-500/20 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-white">Novo cliente</h2>
              <p className="text-xs text-white/30">Cadastro manual</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* Telefone — campo principal */}
          <div>
            <label className="text-xs font-semibold text-white/50 block mb-1.5">
              Telefone / WhatsApp <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
              <input
                type="tel"
                placeholder="(11) 99999-9999"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/50 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-white/50 block mb-1.5">Nome completo</label>
            <input
              type="text"
              placeholder="Maria Silva"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/50 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-white/50 block mb-1.5">E-mail</label>
              <input type="email" placeholder="email@exemplo.com" value={form.email}
                onChange={e => set('email', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/50 transition-colors" />
            </div>
            <div>
              <label className="text-xs font-semibold text-white/50 block mb-1.5">Nascimento</label>
              <input type="date" value={form.birthdate}
                onChange={e => set('birthdate', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500/50 transition-colors" />
            </div>
            <div>
              <label className="text-xs font-semibold text-white/50 block mb-1.5">Sexo</label>
              <select value={form.gender} onChange={e => set('gender', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500/50 transition-colors">
                <option value="">—</option>
                <option value="F">Feminino</option>
                <option value="M">Masculino</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-white/50 block mb-1.5">Altura (cm)</label>
              <input type="number" placeholder="Ex: 165" value={form.height_cm}
                onChange={e => set('height_cm', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/50 transition-colors" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-white/50 block mb-1.5">Objetivo</label>
            <input
              type="text"
              placeholder="Ex: perda de peso, ganho de massa, reeducação alimentar…"
              value={form.goal}
              onChange={e => set('goal', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/50 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-white/50 block mb-1.5">Anotações clínicas</label>
            <textarea
              rows={3}
              placeholder="Histórico, alergias, observações relevantes…"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/50 transition-colors resize-none"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-white/[0.06]">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-medium text-white/40 hover:text-white/70 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => { setError(''); create.mutate() }}
            disabled={!form.phone.trim() || create.isPending}
            className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-brand-500/20"
          >
            {create.isPending
              ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              : 'Cadastrar cliente'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ────────────────────────────────────────────────────────

export default function ClientesPage() {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)

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
      {showModal && <NovoClienteModal onClose={() => setShowModal(false)} />}

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="font-display font-bold text-[22px] tracking-tight text-t1">Clientes</h1>
          <p className="text-sm text-t2 mt-0.5">
            {isLoading ? '…' : `${clients.length} paciente${clients.length !== 1 ? 's' : ''} cadastrado${clients.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-brand-500/20"
          >
            <UserPlus className="w-4 h-4" />
            Novo cliente
          </button>
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
            {search ? <Search className="w-6 h-6 text-white/15" /> : <UserPlus className="w-6 h-6 text-white/15" />}
          </div>
          <p className="text-sm font-medium text-white/30">
            {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado ainda'}
          </p>
          {!search && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm font-medium rounded-xl mx-auto hover:bg-brand-500/15 transition-colors"
            >
              <UserPlus className="w-4 h-4" /> Cadastrar primeiro cliente
            </button>
          )}
          {search && <p className="text-xs text-white/20 mt-1">Tente outro nome ou número</p>}
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
                    <div className={`w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0 ${color}`}>
                      <span className="text-sm font-bold">{initials}</span>
                    </div>

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
