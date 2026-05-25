'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import {
  ArrowLeft, Calendar, MessageSquare, Edit2, Save, X, Phone, Target, FileText, Clock
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ── Types ────────────────────────────────────────────────────────────────────

interface Client {
  id: string
  name: string | null
  phone: string
  goal: string | null
  notes: string | null
  birthdate: string | null
  created_at: string
  updated_at: string
}

interface Appointment {
  id: string
  scheduled_at: string
  duration: number
  modality: string
  status: string
  notes: string | null
  created_by: string
}

interface Conversation {
  id: string
  status: string
  created_at: string
  last_message_at: string | null
  message_count: number
}

interface ProfileData {
  client: Client
  appointments: Appointment[]
  conversations: Conversation[]
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Agendada',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Realizada',
}

const STATUS_COLOR: Record<string, string> = {
  scheduled: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  confirmed:  'text-blue-400 bg-blue-500/10 border-blue-500/20',
  cancelled:  'text-red-400 bg-red-500/10 border-red-500/20',
  completed:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
}

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, '')
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  return phone
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  const [tab, setTab] = useState<'appointments' | 'conversations'>('appointments')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', goal: '', notes: '', birthdate: '' })

  const { data, isLoading } = useQuery<ProfileData>({
    queryKey: ['client', id],
    queryFn: async () => {
      const { data: d } = await api.get(`/api/clients/${id}`)
      return d as ProfileData
    },
  })

  // Populate form when data loads
  useEffect(() => {
    if (data?.client) {
      const c = data.client
      setForm({
        name:      c.name ?? '',
        goal:      c.goal ?? '',
        notes:     c.notes ?? '',
        birthdate: c.birthdate ? c.birthdate.slice(0, 10) : '',
      })
    }
  }, [data])

  const saveMutation = useMutation({
    mutationFn: async (body: typeof form) => {
      await api.patch(`/api/clients/${id}`, {
        name:      body.name || undefined,
        goal:      body.goal || undefined,
        notes:     body.notes || undefined,
        birthdate: body.birthdate || undefined,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client', id] })
      qc.invalidateQueries({ queryKey: ['clients'] })
      setEditing(false)
    },
  })

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8">
        <p className="text-white/40">Cliente não encontrado.</p>
        <button onClick={() => router.back()} className="mt-4 text-brand-400 text-sm">
          ← Voltar
        </button>
      </div>
    )
  }

  const { client, appointments, conversations } = data
  const displayName = (client.name && client.name !== 'Cliente') ? client.name : formatPhone(client.phone)

  return (
    <div className="p-8 max-w-4xl">
      {/* Back */}
      <Link
        href="/clientes"
        className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Clientes
      </Link>

      {/* Header card */}
      <div className="bg-ui-card border border-white/5 rounded-2xl p-6 mb-6">
        {editing ? (
          /* Edit form */
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/40 mb-1 block">Nome</label>
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/40"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nome do paciente"
                />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Data de nascimento</label>
                <input
                  type="date"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/40"
                  value={form.birthdate}
                  onChange={e => setForm(f => ({ ...f, birthdate: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Objetivo</label>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/40"
                value={form.goal}
                onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
                placeholder="Ex: perda de peso, ganho de massa..."
              />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Anotações</label>
              <textarea
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/40 resize-none"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Anotações clínicas, observações..."
              />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => saveMutation.mutate(form)}
                disabled={saveMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex items-center gap-2 px-4 py-2 text-white/50 hover:text-white text-sm rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          /* View mode */
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-brand-400">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{displayName}</h1>
                <div className="flex items-center gap-1.5 mt-1 text-sm text-white/40">
                  <Phone className="w-3.5 h-3.5" />
                  {formatPhone(client.phone)}
                </div>
                {client.birthdate && (
                  <p className="text-xs text-white/30 mt-1">
                    Nascimento: {format(new Date(client.birthdate + 'T12:00:00'), 'dd/MM/yyyy')}
                  </p>
                )}
                {client.goal && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-white/50">
                    <Target className="w-3 h-3" />
                    {client.goal}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs rounded-lg transition-colors"
            >
              <Edit2 className="w-3 h-3" />
              Editar
            </button>
          </div>
        )}

        {/* Quick stats */}
        {!editing && (
          <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-white/5">
            <div className="text-center">
              <p className="text-xl font-bold text-white">{appointments.length}</p>
              <p className="text-xs text-white/30 mt-0.5">Consultas total</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-emerald-400">
                {appointments.filter((a: Appointment) => a.status === 'completed').length}
              </p>
              <p className="text-xs text-white/30 mt-0.5">Realizadas</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-white">{conversations.length}</p>
              <p className="text-xs text-white/30 mt-0.5">Conversas</p>
            </div>
          </div>
        )}
      </div>

      {/* Notes quick view */}
      {!editing && client.notes && (
        <div className="bg-ui-card border border-white/5 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-3.5 h-3.5 text-white/30" />
            <span className="text-xs font-semibold text-white/40 uppercase tracking-wide">Anotações</span>
          </div>
          <p className="text-sm text-white/60 whitespace-pre-wrap">{client.notes}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 bg-ui-card border border-white/5 rounded-xl w-fit">
        {([
          { key: 'appointments',  label: 'Consultas',  count: appointments.length },
          { key: 'conversations', label: 'Conversas',  count: conversations.length },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-brand-500/10 text-brand-400'
                : 'text-white/40 hover:text-white'
            }`}
          >
            {t.label}
            <span className="text-xs opacity-60">({t.count})</span>
          </button>
        ))}
      </div>

      {/* Tab: Consultas */}
      {tab === 'appointments' && (
        <div className="space-y-2">
          {appointments.length === 0 && (
            <div className="text-center py-12 text-sm text-white/25">
              Nenhuma consulta registrada
            </div>
          )}
          {appointments.map((appt: Appointment) => (
            <div
              key={appt.id}
              className="bg-ui-card border border-white/5 rounded-xl p-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-white/30" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  {new Date(appt.scheduled_at).toLocaleString('pt-BR', {
                    timeZone: 'America/Sao_Paulo',
                    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
                <p className="text-xs text-white/30 mt-0.5">
                  {appt.modality === 'presencial' ? 'Presencial' : 'Online'} · {appt.duration} min
                  {appt.created_by === 'assistant' ? ' · Agendada pela Sofia' : ''}
                </p>
                {appt.notes && (
                  <p className="text-xs text-white/25 mt-1 truncate">{appt.notes}</p>
                )}
              </div>
              <span className={`text-xs px-2 py-1 rounded-lg border font-medium ${STATUS_COLOR[appt.status] ?? 'text-white/40 bg-white/5 border-white/10'}`}>
                {STATUS_LABEL[appt.status] ?? appt.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Conversas */}
      {tab === 'conversations' && (
        <div className="space-y-2">
          {conversations.length === 0 && (
            <div className="text-center py-12 text-sm text-white/25">
              Nenhuma conversa registrada
            </div>
          )}
          {conversations.map((conv: Conversation) => (
            <Link
              key={conv.id}
              href={`/conversas?id=${conv.id}`}
              className="bg-ui-card border border-white/5 rounded-xl p-4 flex items-center gap-4 hover:border-white/10 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-4 h-4 text-white/30" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  {conv.message_count} mensagen{conv.message_count !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-white/30 mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {conv.last_message_at
                    ? formatDistanceToNow(new Date(conv.last_message_at), { locale: ptBR, addSuffix: true })
                    : 'Sem mensagens'}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-lg border font-medium flex-shrink-0 ${
                conv.status === 'active'         ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                conv.status === 'human_takeover' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                                                    'text-white/30 bg-white/5 border-white/10'
              }`}>
                {conv.status === 'active'         ? 'Ativa' :
                 conv.status === 'human_takeover' ? 'Assumida' : 'Encerrada'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
