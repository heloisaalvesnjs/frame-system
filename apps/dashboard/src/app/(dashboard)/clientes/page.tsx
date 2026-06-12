'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import {
  Search, UserPlus, X, Loader2, Phone,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { Badge, Btn, Avatar } from '@/components/ui/finance-primitives'

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

const AVATAR_COLORS = ['blue', 'green', 'purple', 'orange', 'pink'] as const

function getAvatarColor(id: string) {
  const n = id.charCodeAt(0) + id.charCodeAt(id.length - 1)
  return AVATAR_COLORS[n % AVATAR_COLORS.length]
}

// ── Status do paciente ────────────────────────────────────────────────────────

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

type ClientStatus = 'ativa' | 'pendente' | 'inativa'

function getStatus(client: Client): ClientStatus {
  const now = Date.now()
  if (client.last_contact && now - new Date(client.last_contact).getTime() < THIRTY_DAYS) return 'ativa'
  if (now - new Date(client.created_at).getTime() < THIRTY_DAYS) return 'pendente'
  return 'inativa'
}

function isNew(client: Client) {
  return Date.now() - new Date(client.created_at).getTime() < THIRTY_DAYS
}

const STATUS_BADGE: Record<ClientStatus, { label: string; variant: 'success' | 'warning' | 'default' }> = {
  ativa:    { label: 'Ativa',    variant: 'success' },
  pendente: { label: 'Pendente', variant: 'warning' },
  inativa:  { label: 'Inativa',  variant: 'default' },
}

function StatusTag({ status }: { status: ClientStatus }) {
  const s = STATUS_BADGE[status]
  return <Badge variant={s.variant}>{s.label}</Badge>
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
              <h2 className="text-[15px] font-bold" style={{ color: 'var(--t1)' }}>Novo paciente</h2>
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
                className="input pl-9"
              />
            </div>
          </div>

          <div>
            <label className="field-label">Nome completo</label>
            <input type="text" placeholder="Maria Silva" value={form.name}
              onChange={e => set('name', e.target.value)} className="input" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">E-mail</label>
              <input type="email" placeholder="email@exemplo.com" value={form.email}
                onChange={e => set('email', e.target.value)} className="input" />
            </div>
            <div>
              <label className="field-label">Nascimento</label>
              <input type="date" value={form.birthdate}
                onChange={e => set('birthdate', e.target.value)} className="input" />
            </div>
            <div>
              <label className="field-label">Sexo</label>
              <select value={form.gender} onChange={e => set('gender', e.target.value)} className="input cursor-pointer">
                <option value="">—</option>
                <option value="F">Feminino</option>
                <option value="M">Masculino</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
            <div>
              <label className="field-label">Altura (cm)</label>
              <input type="number" placeholder="165" value={form.height_cm}
                onChange={e => set('height_cm', e.target.value)} className="input" />
            </div>
          </div>

          <div>
            <label className="field-label">Objetivo</label>
            <input type="text" placeholder="Ex: perda de peso, ganho de massa…" value={form.goal}
              onChange={e => set('goal', e.target.value)} className="input" />
          </div>

          <div>
            <label className="field-label">Anotações clínicas</label>
            <textarea rows={3} placeholder="Histórico, alergias, observações relevantes…"
              value={form.notes} onChange={e => set('notes', e.target.value)}
              className="textarea" />
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
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button
            onClick={() => { setError(''); create.mutate() }}
            disabled={!form.phone.trim() || create.isPending}
            className="btn-primary flex-1"
          >
            {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cadastrar paciente'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

type Filter = 'todos' | 'ativos' | 'inativos' | 'novos'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'todos',    label: 'Todos' },
  { key: 'ativos',   label: 'Ativos' },
  { key: 'inativos', label: 'Inativos' },
  { key: 'novos',    label: 'Novos' },
]

const TH_STYLE: React.CSSProperties = {
  textAlign: 'left',
  padding: '11px 18px',
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--t2)',
  textTransform: 'uppercase',
  letterSpacing: '.05em',
}

export default function ClientesPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('todos')
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

  const filtered = clients.filter(c => {
    if (filter === 'todos') return true
    if (filter === 'novos') return isNew(c)
    const status = getStatus(c)
    if (filter === 'ativos') return status === 'ativa'
    return status !== 'ativa'
  })

  const activeCount = clients.filter(c => getStatus(c) === 'ativa').length
  const newCount = clients.filter(isNew).length
  const appointmentCount = clients.reduce((sum, client) => sum + (client.appointment_count || 0), 0)

  return (
    <div className="px-6 py-6">
      {showModal && <NovoClienteModal onClose={() => setShowModal(false)} />}
      <div className="mx-auto max-w-[1280px]">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-t1">Pacientes</h1>
          <p className="mt-0.5 text-sm text-t3">
            {isLoading
              ? 'Carregando CRM...'
              : `${clients.length} pacientes · ${activeCount} ativos`}
          </p>
        </div>
        <Btn onClick={() => setShowModal(true)} className="flex-shrink-0">
          <UserPlus className="w-4 h-4" />
          Novo paciente
        </Btn>
      </div>

      {!isLoading && (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Total de pacientes', value: clients.length, hint: 'base atual' },
            { label: 'Ativos', value: activeCount, hint: 'com contato recente' },
            { label: 'Novos', value: newCount, hint: 'últimos 30 dias' },
            { label: 'Consultas', value: appointmentCount, hint: 'histórico registrado' },
          ].map(item => (
            <div key={item.label} className="surface p-4">
              <div className="text-[22px] font-semibold tabular-nums text-t1">{item.value}</div>
              <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-t3">{item.label}</div>
              <div className="mt-1 text-[11.5px] text-t3">{item.hint}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search + filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--t3)' }} />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={filter === f.key
                ? { background: 'var(--brand-s)', color: 'var(--brand-h)', border: '1px solid rgba(0,194,124,0.25)' }
                : { background: 'var(--surface)', color: 'var(--t2)', border: '1px solid var(--border)' }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-[60px] rounded-xl animate-pulse"
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
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-20">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
          >
            {search || filter !== 'todos'
              ? <Search className="w-6 h-6" style={{ color: 'var(--t3)' }} />
              : <UserPlus className="w-6 h-6" style={{ color: 'var(--t3)' }} />
            }
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--t3)' }}>
            {search || filter !== 'todos' ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado ainda'}
          </p>
          {!search && filter === 'todos' && (
            <Btn onClick={() => setShowModal(true)} className="mt-4 mx-auto">
              <UserPlus className="w-4 h-4" /> Cadastrar primeiro paciente
            </Btn>
          )}
          {(search || filter !== 'todos') && (
            <p className="text-xs mt-1" style={{ color: 'var(--t3)' }}>Tente outro nome, número ou filtro</p>
          )}
        </div>
      )}

      {/* Tabela */}
      {!isLoading && filtered.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden overflow-x-auto"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
        >
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--raised)' }}>
                <th style={TH_STYLE}>Paciente</th>
                <th style={TH_STYLE} className="hidden md:table-cell">Contato</th>
                <th style={TH_STYLE} className="hidden lg:table-cell">Consultas</th>
                <th style={TH_STYLE} className="hidden lg:table-cell">Último contato</th>
                <th style={TH_STYLE}>Status</th>
                <th style={TH_STYLE} />
              </tr>
            </thead>
            <tbody>
              {filtered.map(client => {
                const name = (client.name && client.name !== 'Cliente') ? client.name : null
                const color = getAvatarColor(client.id)
                const status = getStatus(client)

                return (
                  <tr
                    key={client.id}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--raised)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                  >
                    <td style={{ padding: '13px 18px' }}>
                      <Link href={`/clientes/${client.id}`} className="flex items-center gap-3">
                        <Avatar name={name ?? '#'} color={color} size={32} />
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold truncate leading-snug" style={{ color: 'var(--t1)' }}>
                            {name ?? formatPhone(client.phone)}
                          </p>
                          {client.goal && (
                            <p className="text-[11px] truncate max-w-[200px]" style={{ color: 'var(--t2)' }}>
                              {client.goal}
                            </p>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td style={{ padding: '13px 18px' }} className="hidden md:table-cell">
                      <span className="text-[12px] whitespace-nowrap" style={{ color: 'var(--t2)' }}>
                        {formatPhone(client.phone)}
                      </span>
                    </td>
                    <td style={{ padding: '13px 18px' }} className="hidden lg:table-cell">
                      <span className="text-[12px] whitespace-nowrap" style={{ color: 'var(--t2)' }}>
                        {client.completed_count > 0
                          ? `${client.completed_count} de ${client.appointment_count}`
                          : `${client.appointment_count}`}
                      </span>
                    </td>
                    <td style={{ padding: '13px 18px' }} className="hidden lg:table-cell">
                      <span className="text-[12px] whitespace-nowrap" style={{ color: 'var(--t2)' }}>
                        {client.last_contact
                          ? formatDistanceToNow(new Date(client.last_contact), { locale: ptBR, addSuffix: true })
                          : 'sem contato'}
                      </span>
                    </td>
                    <td style={{ padding: '13px 18px' }}>
                      <StatusTag status={status} />
                    </td>
                    <td style={{ padding: '13px 18px', textAlign: 'right' }}>
                      <Link href={`/clientes/${client.id}`}>
                        <Btn variant="secondary" size="sm">Ver</Btn>
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  )
}
