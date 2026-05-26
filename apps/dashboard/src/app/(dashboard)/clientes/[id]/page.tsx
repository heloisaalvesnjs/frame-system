'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import {
  ArrowLeft, Calendar, MessageSquare, Edit2, Save, X, Phone, Target,
  FileText, Clock, Send, TrendingUp, Droplets, Dumbbell, ClipboardList,
  Scale, ChevronUp, ChevronDown, Minus, KeyRound, Copy, RefreshCw, CheckCircle2
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Client {
  id: string; name: string | null; phone: string; goal: string | null
  notes: string | null; birthdate: string | null; created_at: string; updated_at: string
}
interface Appointment {
  id: string; scheduled_at: string; duration: number; modality: string
  status: string; notes: string | null; created_by: string
}
interface Conversation {
  id: string; status: string; created_at: string
  last_message_at: string | null; message_count: number
}
interface ProfileData { client: Client; appointments: Appointment[]; conversations: Conversation[] }

interface WeightEntry { id: string; weight_kg: string; waist_cm: string | null; hip_cm: string | null; notes: string | null; logged_at: string }
interface Checkin { id: string; week_start: string; hunger_score: number; energy_score: number; sleep_score: number; mood_score: number; notes: string | null; created_at: string }
interface ActivityEntry { id: string; activity_type: string; duration_minutes: number | null; notes: string | null; logged_at: string }
interface WaterStat { logged_at: string; total_ml: number }
interface TrackingData { weightLogs: WeightEntry[]; checkins: Checkin[]; activityLogs: ActivityEntry[]; waterStats: WaterStat[] }

interface InviteCode {
  id: string; code: string; client_id: string | null
  used_by: string | null; used_at: string | null
  expires_at: string; created_at: string
}

const STATUS_LABEL: Record<string, string> = { scheduled: 'Agendada', confirmed: 'Confirmada', cancelled: 'Cancelada', completed: 'Realizada' }
const STATUS_COLOR: Record<string, string> = {
  scheduled: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  confirmed:  'text-blue-400 bg-blue-500/10 border-blue-500/20',
  cancelled:  'text-red-400 bg-red-500/10 border-red-500/20',
  completed:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
}

function formatPhone(p: string) {
  const d = p.replace(/\D/g, '')
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  return p
}

function scoreColor(n: number) {
  if (n >= 4) return 'text-emerald-400'
  if (n <= 2) return 'text-red-400'
  return 'text-amber-400'
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  const [tab, setTab] = useState<'appointments' | 'conversations' | 'tracking' | 'access'>('appointments')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', goal: '', notes: '', birthdate: '' })

  const { data, isLoading } = useQuery<ProfileData>({
    queryKey: ['client', id],
    queryFn: async () => {
      const { data: d } = await api.get(`/api/clients/${id}`)
      return d as ProfileData
    },
  })

  const { data: trackingData } = useQuery<TrackingData>({
    queryKey: ['client-tracking', id],
    queryFn: async () => {
      const { data: d } = await api.get(`/api/clients/${id}/tracking`)
      return d as TrackingData
    },
    enabled: tab === 'tracking',
    staleTime: 30_000,
  })

  const { data: inviteCodes, refetch: refetchCodes } = useQuery<InviteCode[]>({
    queryKey: ['invite-codes', id],
    queryFn: async () => {
      const { data: d } = await api.get('/api/patient/invite-codes')
      return (d.codes as InviteCode[]).filter((c: InviteCode) => c.client_id === id)
    },
    enabled: tab === 'access',
    staleTime: 30_000,
  })

  const generateCode = useMutation({
    mutationFn: () => api.post('/api/patient/invite-codes', { client_id: id }),
    onSuccess: () => { refetchCodes(); toast.success('Código gerado!') },
    onError: () => toast.error('Erro ao gerar código'),
  })

  function copyCode(code: string) {
    navigator.clipboard?.writeText(code).catch(() => {})
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  useEffect(() => {
    if (data?.client) {
      const c = data.client
      setForm({ name: c.name ?? '', goal: c.goal ?? '', notes: c.notes ?? '', birthdate: c.birthdate ? c.birthdate.slice(0, 10) : '' })
    }
  }, [data])

  const sendPortalLink = useMutation({
    mutationFn: () => api.post('/api/patient/auth/request', { clientId: id }),
    onSuccess: (res) => {
      const link = res.data?.link
      if (link) { navigator.clipboard?.writeText(link).catch(() => {}); toast.success('Link enviado via WhatsApp e copiado!', { duration: 5000 }) }
      else toast.success('Link enviado via WhatsApp!')
    },
    onError: () => toast.error('Erro ao gerar link. WhatsApp conectado?'),
  })

  const saveMutation = useMutation({
    mutationFn: async (body: typeof form) => {
      await api.patch(`/api/clients/${id}`, { name: body.name || undefined, goal: body.goal || undefined, notes: body.notes || undefined, birthdate: body.birthdate || undefined })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client', id] }); qc.invalidateQueries({ queryKey: ['clients'] }); setEditing(false); toast.success('Dados salvos!') },
    onError: () => toast.error('Erro ao salvar'),
  })

  if (isLoading) return (
    <div className="p-8 flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!data) return (
    <div className="p-8">
      <p className="text-white/40">Cliente não encontrado.</p>
      <button onClick={() => router.back()} className="mt-4 text-brand-400 text-sm">← Voltar</button>
    </div>
  )

  const { client, appointments, conversations } = data
  const displayName = (client.name && client.name !== 'Cliente') ? client.name : formatPhone(client.phone)

  // Weight delta
  const wLogs = trackingData?.weightLogs ?? []
  const weightDelta = wLogs.length >= 2 && wLogs[0].weight_kg && wLogs[1].weight_kg
    ? parseFloat(wLogs[0].weight_kg) - parseFloat(wLogs[1].weight_kg)
    : null

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      {/* Back */}
      <Link href="/clientes" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Clientes
      </Link>

      {/* Header card */}
      <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-6 mb-5">
        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/40 mb-1 block">Nome</label>
                <input className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/40"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome do paciente" />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Data de nascimento</label>
                <input type="date" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/40"
                  value={form.birthdate} onChange={e => setForm(f => ({ ...f, birthdate: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Objetivo</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/40"
                value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} placeholder="Ex: perda de peso, ganho de massa..." />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Anotações clínicas</label>
              <textarea rows={3} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/40 resize-none"
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Anotações clínicas, observações..." />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                <Save className="w-3.5 h-3.5" />{saveMutation.isPending ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={() => setEditing(false)} className="flex items-center gap-2 px-4 py-2 text-white/50 hover:text-white text-sm rounded-lg transition-colors">
                <X className="w-3.5 h-3.5" />Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-brand-400">{displayName.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{displayName}</h1>
                <div className="flex items-center gap-1.5 mt-1 text-sm text-white/40">
                  <Phone className="w-3.5 h-3.5" />{formatPhone(client.phone)}
                </div>
                {client.birthdate && (
                  <p className="text-xs text-white/30 mt-1">Nascimento: {format(new Date(client.birthdate + 'T12:00:00'), 'dd/MM/yyyy')}</p>
                )}
                {client.goal && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-white/50">
                    <Target className="w-3 h-3" />{client.goal}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => sendPortalLink.mutate()} disabled={sendPortalLink.isPending}
                title="Envia link de acesso ao portal do paciente via WhatsApp"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/15 border border-brand-500/20 text-brand-400 hover:text-brand-300 text-xs font-medium rounded-lg transition-colors disabled:opacity-50">
                <Send className="w-3 h-3" />{sendPortalLink.isPending ? 'Enviando…' : 'Portal do paciente'}
              </button>
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs rounded-lg transition-colors">
                <Edit2 className="w-3 h-3" />Editar
              </button>
            </div>
          </div>
        )}

        {/* Quick stats */}
        {!editing && (
          <div className="grid grid-cols-4 gap-3 mt-5 pt-5 border-t border-white/[0.05]">
            <div className="text-center">
              <p className="text-xl font-bold text-white">{appointments.length}</p>
              <p className="text-xs text-white/30 mt-0.5">Consultas</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-emerald-400">{appointments.filter((a: Appointment) => a.status === 'completed').length}</p>
              <p className="text-xs text-white/30 mt-0.5">Realizadas</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-white">{conversations.length}</p>
              <p className="text-xs text-white/30 mt-0.5">Conversas</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-brand-400">
                {trackingData ? (trackingData.checkins.length > 0 ? `${((trackingData.checkins[0].hunger_score + trackingData.checkins[0].energy_score + trackingData.checkins[0].sleep_score + trackingData.checkins[0].mood_score) / 4).toFixed(1)}` : '—') : '—'}
              </p>
              <p className="text-xs text-white/30 mt-0.5">Último check-in</p>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      {!editing && client.notes && (
        <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-4 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-3.5 h-3.5 text-white/30" />
            <span className="text-xs font-semibold text-white/40 uppercase tracking-wide">Anotações clínicas</span>
          </div>
          <p className="text-sm text-white/60 whitespace-pre-wrap">{client.notes}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 bg-ui-card border border-white/[0.06] rounded-xl w-fit flex-wrap">
        {([
          { key: 'appointments',  label: 'Consultas',       count: appointments.length },
          { key: 'conversations', label: 'Conversas',       count: conversations.length },
          { key: 'tracking',      label: 'Acompanhamento',  count: null },
          { key: 'access',        label: 'Acesso',          count: null },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-brand-500/10 text-brand-400' : 'text-white/40 hover:text-white'}`}>
            {t.label}
            {t.count !== null && <span className="text-xs opacity-60">({t.count})</span>}
          </button>
        ))}
      </div>

      {/* ── Tab: Consultas ── */}
      {tab === 'appointments' && (
        <div className="space-y-2">
          {appointments.length === 0 && <div className="text-center py-12 text-sm text-white/25">Nenhuma consulta registrada</div>}
          {appointments.map((appt: Appointment) => (
            <div key={appt.id} className="bg-ui-card border border-white/[0.06] rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-white/30" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  {new Date(appt.scheduled_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-xs text-white/30 mt-0.5">
                  {appt.modality === 'presencial' ? 'Presencial' : 'Online'} · {appt.duration} min
                  {appt.created_by === 'assistant' ? ' · Agendada pela IA' : ''}
                </p>
                {appt.notes && <p className="text-xs text-white/25 mt-1 truncate">{appt.notes}</p>}
              </div>
              <span className={`text-xs px-2 py-1 rounded-lg border font-medium ${STATUS_COLOR[appt.status] ?? 'text-white/40 bg-white/5 border-white/10'}`}>
                {STATUS_LABEL[appt.status] ?? appt.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab: Conversas ── */}
      {tab === 'conversations' && (
        <div className="space-y-2">
          {conversations.length === 0 && <div className="text-center py-12 text-sm text-white/25">Nenhuma conversa registrada</div>}
          {conversations.map((conv: Conversation) => (
            <Link key={conv.id} href={`/conversas?id=${conv.id}`}
              className="bg-ui-card border border-white/[0.06] rounded-xl p-4 flex items-center gap-4 hover:border-white/10 transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-4 h-4 text-white/30" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{conv.message_count} mensagen{conv.message_count !== 1 ? 's' : ''}</p>
                <p className="text-xs text-white/30 mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {conv.last_message_at ? formatDistanceToNow(new Date(conv.last_message_at), { locale: ptBR, addSuffix: true }) : 'Sem mensagens'}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-lg border font-medium flex-shrink-0 ${
                conv.status === 'active' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                conv.status === 'human_takeover' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                'text-white/30 bg-white/5 border-white/10'}`}>
                {conv.status === 'active' ? 'Ativa' : conv.status === 'human_takeover' ? 'Assumida' : 'Encerrada'}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* ── Tab: Acompanhamento ── */}
      {tab === 'tracking' && (
        <div className="space-y-5">

          {/* Peso */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Scale className="w-4 h-4 text-brand-400" />
              <h3 className="text-sm font-semibold text-white/80">Peso e medidas</h3>
              {wLogs.length > 0 && wLogs[0].weight_kg && (
                <span className="ml-auto text-lg font-bold text-white">
                  {parseFloat(wLogs[0].weight_kg).toFixed(1)}kg
                </span>
              )}
              {weightDelta !== null && (
                <span className={`flex items-center gap-0.5 text-xs font-semibold ${weightDelta < 0 ? 'text-emerald-400' : weightDelta > 0 ? 'text-amber-400' : 'text-white/30'}`}>
                  {weightDelta < 0 ? <ChevronDown className="w-3 h-3" /> : weightDelta > 0 ? <ChevronUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  {Math.abs(weightDelta).toFixed(1)}kg
                </span>
              )}
            </div>
            {wLogs.length === 0 ? (
              <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-6 text-center text-sm text-white/25">
                Nenhum registro de peso ainda
              </div>
            ) : (
              <div className="bg-ui-card border border-white/[0.06] rounded-2xl overflow-hidden">
                <ul className="divide-y divide-white/[0.04]">
                  {wLogs.slice(0, 10).map(w => (
                    <li key={w.id} className="flex items-center gap-4 px-4 py-3">
                      <p className="text-sm text-white/40 w-20 flex-shrink-0">{format(parseISO(w.logged_at), "dd/MM/yyyy")}</p>
                      <div className="flex-1 grid grid-cols-3 gap-4 text-sm">
                        <span className="font-semibold text-white">{w.weight_kg ? `${parseFloat(w.weight_kg).toFixed(1)}kg` : '—'}</span>
                        <span className="text-white/40">C: {w.waist_cm ? `${parseFloat(w.waist_cm).toFixed(0)}cm` : '—'}</span>
                        <span className="text-white/40">Q: {w.hip_cm ? `${parseFloat(w.hip_cm).toFixed(0)}cm` : '—'}</span>
                      </div>
                      {w.notes && <p className="text-xs text-white/25 truncate max-w-[120px]">{w.notes}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Check-ins */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-white/80">Check-ins semanais</h3>
              <span className="ml-auto text-xs text-white/30">{trackingData?.checkins.length ?? 0} registros</span>
            </div>
            {(trackingData?.checkins.length ?? 0) === 0 ? (
              <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-6 text-center text-sm text-white/25">
                Nenhum check-in enviado ainda
              </div>
            ) : (
              <div className="bg-ui-card border border-white/[0.06] rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-4 px-4 py-2 border-b border-white/[0.04]">
                  <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider w-20">Semana</p>
                  <div className="flex-1 grid grid-cols-4 gap-2 text-center">
                    {['🍽️ Fome', '⚡ Energia', '😴 Sono', '😊 Humor'].map(l => (
                      <p key={l} className="text-[10px] font-semibold text-white/25">{l}</p>
                    ))}
                  </div>
                  <p className="text-[10px] font-semibold text-white/25 w-12 text-center">Média</p>
                </div>
                <ul className="divide-y divide-white/[0.04]">
                  {trackingData?.checkins.map(c => {
                    const avg = ((c.hunger_score + c.energy_score + c.sleep_score + c.mood_score) / 4)
                    return (
                      <li key={c.id} className="flex items-center gap-4 px-4 py-3">
                        <p className="text-sm text-white/40 w-20 flex-shrink-0">
                          {format(parseISO(c.week_start), "dd/MM")}
                        </p>
                        <div className="flex-1 grid grid-cols-4 gap-2 text-center">
                          {[c.hunger_score, c.energy_score, c.sleep_score, c.mood_score].map((v, i) => (
                            <span key={i} className={`text-base font-bold ${scoreColor(v)}`}>{v}</span>
                          ))}
                        </div>
                        <div className="w-12 text-center">
                          <span className={`text-sm font-bold ${scoreColor(Math.round(avg))}`}>{avg.toFixed(1)}</span>
                        </div>
                        {c.notes && (
                          <p className="text-xs text-white/25 truncate max-w-[100px]" title={c.notes}>{c.notes}</p>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </section>

          {/* Água (últimos 7 dias) */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Droplets className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white/80">Água — últimos 7 dias</h3>
            </div>
            {(trackingData?.waterStats.length ?? 0) === 0 ? (
              <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-6 text-center text-sm text-white/25">
                Nenhum registro de água ainda
              </div>
            ) : (
              <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-4">
                <div className="flex items-end gap-2 h-20">
                  {(trackingData?.waterStats ?? []).map(w => {
                    const pct = Math.min(w.total_ml / 2000, 1)
                    return (
                      <div key={w.logged_at} className="flex-1 flex flex-col items-center gap-1">
                        <p className="text-[9px] text-white/30">{(w.total_ml / 1000).toFixed(1)}L</p>
                        <div className="w-full bg-white/5 rounded-sm overflow-hidden" style={{ height: '48px' }}>
                          <div
                            className={`w-full rounded-sm transition-all ${pct >= 1 ? 'bg-emerald-500' : pct >= 0.6 ? 'bg-cyan-500' : 'bg-cyan-500/40'}`}
                            style={{ height: `${pct * 100}%`, marginTop: `${(1 - pct) * 100}%` }}
                          />
                        </div>
                        <p className="text-[9px] text-white/25">{format(parseISO(w.logged_at), 'dd/MM')}</p>
                      </div>
                    )
                  })}
                </div>
                <p className="text-[10px] text-white/20 text-center mt-2">Meta: 2L/dia · Verde = atingiu a meta</p>
              </div>
            )}
          </section>

          {/* Atividades recentes */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Dumbbell className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-semibold text-white/80">Atividades físicas</h3>
            </div>
            {(trackingData?.activityLogs.length ?? 0) === 0 ? (
              <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-6 text-center text-sm text-white/25">
                Nenhuma atividade registrada ainda
              </div>
            ) : (
              <div className="bg-ui-card border border-white/[0.06] rounded-2xl overflow-hidden">
                <ul className="divide-y divide-white/[0.04]">
                  {trackingData?.activityLogs.slice(0, 10).map(a => (
                    <li key={a.id} className="flex items-center gap-4 px-4 py-3">
                      <p className="text-xs text-white/35 w-16 flex-shrink-0">{format(parseISO(a.logged_at), 'dd/MM')}</p>
                      <p className="flex-1 text-sm font-medium text-white/80">{a.activity_type}</p>
                      {a.duration_minutes && <p className="text-xs text-white/30 flex-shrink-0">{a.duration_minutes} min</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── Tab: Acesso ── */}
      {tab === 'access' && (
        <div className="space-y-5">

          {/* Info card */}
          <div className="flex items-start gap-3 bg-brand-500/5 border border-brand-500/15 rounded-2xl p-4">
            <KeyRound className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-brand-300/80 leading-relaxed">
              Gere um <strong>código de acesso</strong> para este paciente criar a conta no portal. O código expira em 7 dias e só pode ser usado uma vez.
              <br />
              <span className="text-white/35 mt-1 block">O paciente acessa o portal pelo link do site e usa o código para se cadastrar.</span>
            </div>
          </div>

          {/* Generate button */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white/80">Códigos de acesso</h3>
            <button
              onClick={() => generateCode.mutate()}
              disabled={generateCode.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white text-sm font-semibold rounded-xl transition-all active:scale-[0.97] disabled:opacity-50 shadow-lg shadow-brand-500/20"
            >
              {generateCode.isPending
                ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                : <KeyRound className="w-3.5 h-3.5" />}
              Gerar novo código
            </button>
          </div>

          {/* Codes list */}
          {!inviteCodes || inviteCodes.length === 0 ? (
            <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-8 text-center">
              <KeyRound className="w-8 h-8 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/25">Nenhum código gerado ainda</p>
              <p className="text-xs text-white/15 mt-1">Clique em "Gerar novo código" para liberar o acesso</p>
            </div>
          ) : (
            <div className="bg-ui-card border border-white/[0.06] rounded-2xl overflow-hidden">
              <ul className="divide-y divide-white/[0.04]">
                {inviteCodes.map(ic => {
                  const expired = new Date(ic.expires_at) < new Date()
                  const used = !!ic.used_by
                  return (
                    <li key={ic.id} className="flex items-center gap-4 px-5 py-4">
                      {/* Code badge */}
                      <div className={`font-mono text-lg font-bold tracking-widest px-3 py-1.5 rounded-xl border flex-shrink-0 ${
                        used
                          ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                          : expired
                            ? 'text-white/20 bg-white/5 border-white/10 line-through'
                            : 'text-brand-400 bg-brand-500/10 border-brand-500/20'
                      }`}>
                        {ic.code}
                      </div>

                      {/* Status */}
                      <div className="flex-1 min-w-0">
                        {used ? (
                          <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Utilizado
                          </p>
                        ) : expired ? (
                          <p className="text-xs text-white/25">Expirado</p>
                        ) : (
                          <p className="text-xs text-white/50">
                            Expira {formatDistanceToNow(new Date(ic.expires_at), { locale: ptBR, addSuffix: true })}
                          </p>
                        )}
                        <p className="text-[10px] text-white/20 mt-0.5">
                          Criado em {format(new Date(ic.created_at), "d 'de' MMM", { locale: ptBR })}
                        </p>
                      </div>

                      {/* Copy button (only if unused & not expired) */}
                      {!used && !expired && (
                        <button
                          onClick={() => copyCode(ic.code)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex-shrink-0 ${
                            copiedCode === ic.code
                              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                              : 'text-white/40 bg-white/5 border-white/10 hover:text-white/70 hover:border-white/20'
                          }`}
                          title="Copiar código"
                        >
                          {copiedCode === ic.code
                            ? <><CheckCircle2 className="w-3.5 h-3.5" /> Copiado</>
                            : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Quick share hint */}
          {inviteCodes && inviteCodes.some(c => !c.used_by && new Date(c.expires_at) > new Date()) && (
            <p className="text-xs text-white/20 text-center">
              Compartilhe o código com o paciente pelo WhatsApp. Ele acessa o site, clica em "Paciente → Criar conta" e insere o código.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
