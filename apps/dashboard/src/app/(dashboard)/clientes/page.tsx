'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import {
  Search, Calendar, ChevronRight, Clock, UserPlus, X, Loader2, Phone,
} from 'lucide-react'
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
  '#5B6EF5', '#E84393', '#F5A623', '#27AE60',
  '#9B59B6', '#E74C3C', '#1ABC9C', '#2980B9',
]

function getAvatarColor(id: string) {
  const n = id.charCodeAt(0) + id.charCodeAt(id.length - 1)
  return AVATAR_COLORS[n % AVATAR_COLORS.length]
}

// ── Modal de novo cliente ─────────────────────────────────────────────────────

function NovoClienteModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const router = useRouter()
  const [form, setForm] = useState({
    name: '', phone: '', email: '', goal: '', notes: '', birthdate: '', gender: '', height_cm: '',
  })
  const [error, setError] = useState('')

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  const create = useMutation({
    mutationFn: () => api.post('/api/clients', {
      name:      form.name.trim() || undefined,
      phone:     form.phone.trim(),
      email:     form.email.trim() || undefined,
      goal:      form.goal.trim() || undefined,
      notes:     form.notes.trim() || undefined,
      birthdate: form.birthdate || undefined,
      gender:    form.gender.trim() || undefined,
      height_cm: form.height_cm.trim() ? Number(form.height_cm) : undefined,
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Cliente cadastrado!')
      onClose()
      router.push(`/clientes/${res.data.client.id}`)
    },
    onError: (err: any) => setError(err?.response?.data?.error ?? 'Erro ao cadastrar cliente'),
  })

  const inputCls = "w-full h-9 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 transition-all"
  const inputStyle = {
    background: 'var(--raised)',
    border: '1px solid var(--border)',
    color: 'var(--t1)',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl z-10 flex flex-col"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--brand-s)', border: '1px solid rgba(0,194,124,0.2)' }}
            >
              <UserPlus className="w-4 h-4" style={{ color: 'var(--brand)' }} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold" style={{ color: 'var(--t1)' }}>Novo cliente</h2>
              <p className="text-xs" style={{ color: 'var(--t3)' }}>Cadastro manual</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-raised transition-colors"
            style={{ color: 'var(--t3)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--t3)' }}>
              Telefone / WhatsApp <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--t3)' }} />
              <input
                type="tel"
                placeholder="(11) 99999-9999"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                className="w-full h-9 rounded-lg pl-9 pr-3 text-sm focus:outline-none transition-all"
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--t3)' }}>Nome completo</label>
            <input
              type="text"
              placeholder="Maria Silva"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className={inputCls}
              style={inputStyle}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--t3)' }}>E-mail</label>
              <input type="email" placeholder="email@exemplo.com" value={form.email}
                onChange={e => set('email', e.target.value)}
                className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--t3)' }}>Nascimento</label>
              <input type="date" value={form.birthdate}
                onChange={e => set('birthdate', e.target.value)}
                className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--t3)' }}>Sexo</label>
              <select value={form.gender} onChange={e => set('gender', e.target.value)}
                className={inputCls + ' cursor-pointer'} style={inputStyle}>
                <option value="">—</option>
                <option value="F">Feminino</option>
                <option value="M">Masculino</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--t3)' }}>Altura (cm)</label>
              <input type="number" placeholder="Ex: 165" value={form.height_cm}
                onChange={e => set('height_cm', e.target.value)}
                className={inputCls} style={inputStyle} />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--t3)' }}>Objetivo</label>
            <input
              type="text"
              placeholder="Ex: perda de peso, ganho de massa…"
              value={form.goal}
              onChange={e => set('goal', e.target.value)}
              className={inputCls}
              style={inputStyle}
            />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--t3)' }}>Anotações clínicas</label>
            <textarea
              rows={3}
              placeholder="Histórico, alergias, observações relevantes…"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none transition-all"
              style={{ ...inputStyle, height: 'auto' }}
            />
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm text-red-500"
              style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex gap-3 px-6 py-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-raised"
            style={{ border: '1px solid var(--border)', color: 'var(--t2)' }}
          >
            Cancelar
          </button>
          <button
            onClick={() => { setError(''); create.mutate() }}
            disabled={!form.phone.trim() || create.isPending}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'var(--brand)' }}
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

// ── Página principal ──────────────────────────────────────────────────────────

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
          <h1 className="font-display font-bold text-[22px] tracking-tight" style={{ color: 'var(--t1)' }}>
            Clientes
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--t3)' }}>
            {isLoading
              ? '…'
              : `${clients.length} paciente${clients.length !== 1 ? 's' : ''} cadastrado${clients.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl transition-all active:scale-[0.98] flex-shrink-0"
          style={{ background: 'var(--brand)' }}
        >
          <UserPlus className="w-4 h-4" />
          Novo cliente
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--t3)' }} />
        <input
          type="text"
          placeholder="Buscar por nome ou telefone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--t1)',
          }}
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-[68px] rounded-xl animate-pulse"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                opacity: 1 - i * 0.12,
              }}
            />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && clients.length === 0 && (
        <div className="text-center py-20">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
          >
            {search
              ? <Search className="w-6 h-6" style={{ color: 'var(--t3)' }} />
              : <UserPlus className="w-6 h-6" style={{ color: 'var(--t3)' }} />
            }
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--t3)' }}>
            {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado ainda'}
          </p>
          {!search && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl mx-auto hover:opacity-80 transition-opacity"
              style={{
                background: 'var(--brand-s)',
                border: '1px solid rgba(0,194,124,0.2)',
                color: 'var(--brand)',
              }}
            >
              <UserPlus className="w-4 h-4" /> Cadastrar primeiro cliente
            </button>
          )}
          {search && <p className="text-xs mt-1" style={{ color: 'var(--t3)' }}>Tente outro nome ou número</p>}
        </div>
      )}

      {/* List */}
      {!isLoading && clients.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
        >
          <ul>
            {clients.map((client, i) => {
              const name = (client.name && client.name !== 'Cliente') ? client.name : null
              const initials = name
                ? name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
                : '#'
              const color = getAvatarColor(client.id)

              return (
                <li key={client.id}>
                  <Link
                    href={`/clientes/${client.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-raised/50 group"
                    style={{
                      borderTop: i > 0 ? '1px solid var(--border)' : undefined,
                    }}
                  >
                    {/* Avatar */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[13px] font-bold text-white"
                      style={{ background: color }}
                    >
                      {initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate leading-snug" style={{ color: 'var(--t1)' }}>
                        {name ?? formatPhone(client.phone)}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {name && (
                          <span className="text-[11px]" style={{ color: 'var(--t3)' }}>
                            {formatPhone(client.phone)}
                          </span>
                        )}
                        {client.goal && (
                          <span className="text-[11px] truncate max-w-[180px]" style={{ color: 'var(--t3)' }}>
                            {name ? '· ' : ''}{client.goal}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="hidden md:flex items-center gap-5 flex-shrink-0">
                      <div className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--t3)' }}>
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {client.completed_count > 0
                            ? `${client.completed_count} de ${client.appointment_count}`
                            : `${client.appointment_count} consulta${client.appointment_count !== 1 ? 's' : ''}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--t3)' }}>
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {client.last_contact
                            ? formatDistanceToNow(new Date(client.last_contact), { locale: ptBR, addSuffix: true })
                            : 'sem contato'}
                        </span>
                      </div>
                    </div>

                    <ChevronRight
                      className="w-4 h-4 flex-shrink-0 transition-colors group-hover:opacity-80"
                      style={{ color: 'var(--t3)' }}
                    />
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
