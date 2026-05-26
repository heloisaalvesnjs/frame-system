'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import {
  Users, Calendar, TrendingUp, DollarSign,
  MessageSquare, ChevronRight, Clock, CheckCircle2, ClipboardList
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ── Types ────────────────────────────────────────────────────────────────────

interface Metrics {
  total_leads: number
  new_leads_week: number
  active_conversations: number
  total_appointments: number
  appointments_week: number
  completed_appointments: number
  completed_this_month: number
  total_clients: number
  consultation_price: string | null
  conversion_rate: number | null
}

interface Lead {
  id: string
  client_phone: string
  client_name: string | null
  client_id: string | null
  message_count: number
  last_message_at: string
  next_appointment: string | null
  stage: 'new' | 'engaged' | 'scheduled' | 'converted'
}

interface ActivityItem {
  type: 'new_lead' | 'appointment'
  occurred_at: string
  client_name: string | null
  client_phone: string
  scheduled_at?: string
  status?: string
}

interface RecentCheckin {
  client_id: string
  client_name: string | null
  client_phone: string
  week_start: string
  hunger_score: number
  energy_score: number
  sleep_score: number
  mood_score: number
  notes: string | null
  created_at: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<Lead['stage'], string> = {
  new:       'Novo lead',
  engaged:   'Em conversa',
  scheduled: 'Agendado',
  converted: 'Convertido',
}

const STAGE_COLORS: Record<Lead['stage'], string> = {
  new:       'bg-blue-500/10 text-blue-400 border-blue-500/20',
  engaged:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  scheduled: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  converted: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}

const STAGE_DOT: Record<Lead['stage'], string> = {
  new:       'bg-blue-400',
  engaged:   'bg-amber-400',
  scheduled: 'bg-violet-400',
  converted: 'bg-emerald-400',
}

const STAGE_HEADER_BAR: Record<Lead['stage'], string> = {
  new:       'bg-blue-500',
  engaged:   'bg-amber-500',
  scheduled: 'bg-violet-500',
  converted: 'bg-emerald-500',
}

const STAGE_COUNT_BG: Record<Lead['stage'], string> = {
  new:       'bg-blue-500/10 text-blue-400',
  engaged:   'bg-amber-500/10 text-amber-400',
  scheduled: 'bg-violet-500/10 text-violet-400',
  converted: 'bg-emerald-500/10 text-emerald-400',
}

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, '')
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  return phone
}

function clientLabel(lead: { client_name?: string | null; client_phone: string }) {
  return lead.client_name && lead.client_name !== 'Cliente'
    ? lead.client_name
    : formatPhone(lead.client_phone)
}

// ── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  label, value, sub, icon: Icon, accent,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  accent: { top: string; icon: string; glow: string }
}) {
  return (
    <div className={`relative bg-ui-card border border-white/5 rounded-2xl p-5 flex flex-col gap-3 overflow-hidden group hover:border-white/10 transition-colors`}>
      {/* Colored top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${accent.top}`} />
      {/* Subtle corner glow */}
      <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${accent.glow} blur-2xl`} />
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white/35 uppercase tracking-wider">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent.icon}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
        {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

// ── Kanban column ────────────────────────────────────────────────────────────

const KANBAN_STAGES: Lead['stage'][] = ['new', 'engaged', 'scheduled', 'converted']

function KanbanColumn({ stage, leads }: { stage: Lead['stage']; leads: Lead[] }) {
  return (
    <div className="flex-1 min-w-0">
      {/* Column header */}
      <div className="bg-ui-card border border-white/5 rounded-xl mb-2 overflow-hidden">
        <div className={`h-0.5 ${STAGE_HEADER_BAR[stage]}`} />
        <div className="flex items-center justify-between px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${STAGE_DOT[stage]}`} />
            <span className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">
              {STAGE_LABELS[stage]}
            </span>
          </div>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${STAGE_COUNT_BG[stage]}`}>
            {leads.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2">
        {leads.length === 0 && (
          <div className="border border-dashed border-white/5 rounded-xl p-4 text-center text-xs text-white/20">
            Nenhum lead
          </div>
        )}
        {leads.map(lead => (
          <div
            key={lead.id}
            className="bg-ui-card border border-white/5 rounded-xl p-3 hover:border-white/10 transition-all duration-150 cursor-default"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-sm font-medium text-white/90 truncate leading-snug">{clientLabel(lead)}</p>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium flex-shrink-0 ${STAGE_COLORS[stage]}`}>
                {lead.message_count}msg
              </span>
            </div>
            {lead.next_appointment && (
              <p className="text-[11px] text-violet-400 flex items-center gap-1 mb-1.5 font-medium">
                <Calendar className="w-3 h-3 flex-shrink-0" />
                {new Date(lead.next_appointment).toLocaleString('pt-BR', {
                  timeZone: 'America/Sao_Paulo',
                  day: '2-digit', month: '2-digit',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            )}
            <p className="text-[11px] text-white/25 flex items-center gap-1">
              <Clock className="w-3 h-3 flex-shrink-0" />
              {lead.last_message_at
                ? formatDistanceToNow(new Date(lead.last_message_at), { locale: ptBR, addSuffix: true })
                : '—'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth()

  const { data: metricsData, isLoading: loadingMetrics } = useQuery({
    queryKey: ['metrics-overview'],
    queryFn: async () => {
      const { data } = await api.get('/api/metrics/overview')
      return data.metrics as Metrics | null
    },
    staleTime: 60_000,
  })

  const { data: pipelineData, isLoading: loadingPipeline } = useQuery({
    queryKey: ['metrics-pipeline'],
    queryFn: async () => {
      const { data } = await api.get('/api/metrics/pipeline')
      return data.leads as Lead[]
    },
    staleTime: 30_000,
  })

  const { data: activityData } = useQuery({
    queryKey: ['metrics-activity'],
    queryFn: async () => {
      const { data } = await api.get('/api/metrics/recent-activity')
      return data.activity as ActivityItem[]
    },
    staleTime: 30_000,
  })

  const { data: recentCheckins } = useQuery({
    queryKey: ['patient-checkins-recent'],
    queryFn: async () => {
      const { data } = await api.get('/api/patient/checkin/clients')
      return data.checkins as RecentCheckin[]
    },
    staleTime: 60_000,
  })

  const m = metricsData
  const leads = pipelineData ?? []

  const byStage = Object.fromEntries(
    KANBAN_STAGES.map(s => [s, leads.filter(l => l.stage === s)])
  ) as Record<Lead['stage'], Lead[]>

  const hour = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })).getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const firstName = user?.name?.split(' ')[0] ?? ''

  const priceNum = m?.consultation_price
    ? parseFloat(m.consultation_price.replace(/[^0-9,.]/g, '').replace(',', '.'))
    : null
  const revenueMonth = priceNum && m ? (m.completed_this_month * priceNum) : null

  return (
    <div className="p-6 md:p-8 max-w-[1400px]">
      {/* Header */}
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-white tracking-tight">
            {greeting}, {firstName}! 👋
          </h1>
          <p className="text-sm text-white/35 mt-0.5 capitalize">
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long', day: '2-digit', month: 'long',
              timeZone: 'America/Sao_Paulo',
            })}
          </p>
        </div>
        <Link
          href="/conversas"
          className="flex-shrink-0 flex items-center gap-2 bg-brand-500/10 hover:bg-brand-500/15 border border-brand-500/20 text-brand-400 hover:text-brand-300 text-xs font-semibold px-3.5 py-2 rounded-lg transition-all duration-150"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Conversas
          {(m?.active_conversations ?? 0) > 0 && (
            <span className="bg-brand-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {m!.active_conversations}
            </span>
          )}
        </Link>
      </div>

      {/* Metric cards */}
      {loadingMetrics ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-ui-card border border-white/5 rounded-2xl p-5 h-28 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            label="Total de leads"
            value={m?.total_leads ?? 0}
            sub={`+${m?.new_leads_week ?? 0} esta semana`}
            icon={Users}
            accent={{ top: 'bg-blue-500', icon: 'bg-blue-500/10 text-blue-400', glow: 'bg-blue-500' }}
          />
          <MetricCard
            label="Agendamentos"
            value={m?.appointments_week ?? 0}
            sub="nos últimos 7 dias"
            icon={Calendar}
            accent={{ top: 'bg-violet-500', icon: 'bg-violet-500/10 text-violet-400', glow: 'bg-violet-500' }}
          />
          <MetricCard
            label="Taxa de conversão"
            value={m?.conversion_rate != null ? `${m.conversion_rate}%` : '—'}
            sub="leads → consulta"
            icon={TrendingUp}
            accent={{ top: 'bg-brand-500', icon: 'bg-brand-500/10 text-brand-400', glow: 'bg-brand-500' }}
          />
          <MetricCard
            label="Receita estimada"
            value={
              revenueMonth != null
                ? revenueMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                : m?.consultation_price ? `${m.completed_this_month} × ${m.consultation_price}` : '—'
            }
            sub={`${m?.completed_this_month ?? 0} consulta(s) este mês`}
            icon={DollarSign}
            accent={{ top: 'bg-emerald-500', icon: 'bg-emerald-500/10 text-emerald-400', glow: 'bg-emerald-500' }}
          />
        </div>
      )}

      {/* CRM Pipeline + Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">

        {/* Kanban */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white/80">Pipeline de Leads</h2>
              <p className="text-xs text-white/30 mt-0.5">{leads.length} lead{leads.length !== 1 ? 's' : ''} ativos</p>
            </div>
            <Link
              href="/clientes"
              className="text-xs text-white/35 hover:text-white/60 flex items-center gap-1 transition-colors"
            >
              Ver clientes <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {loadingPipeline ? (
            <div className="grid grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-40 bg-ui-card border border-white/5 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {KANBAN_STAGES.map(stage => (
                <KanbanColumn key={stage} stage={stage} leads={byStage[stage]} />
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white/80">Atividade recente</h2>
              <p className="text-xs text-white/30 mt-0.5">Últimos 7 dias</p>
            </div>
          </div>

          <div className="bg-ui-card border border-white/5 rounded-2xl overflow-hidden">
            {!activityData || activityData.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-8 h-8 text-white/10 mx-auto mb-2" />
                <p className="text-sm text-white/25">Nenhuma atividade recente</p>
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.04]">
                {activityData.map((item, i) => (
                  <li key={i} className="px-4 py-3 flex items-start gap-3 hover:bg-white/[0.02] transition-colors">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      item.type === 'new_lead'
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {item.type === 'new_lead'
                        ? <MessageSquare className="w-3.5 h-3.5" />
                        : <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-white/50 truncate">
                        {item.type === 'new_lead' ? 'Novo lead' : 'Consulta agendada'}
                      </p>
                      <p className="text-[13px] font-medium text-white/90 truncate">
                        {item.client_name && item.client_name !== 'Cliente'
                          ? item.client_name
                          : formatPhone(item.client_phone)}
                      </p>
                      {item.scheduled_at && (
                        <p className="text-[11px] text-violet-400 mt-0.5 font-medium">
                          {new Date(item.scheduled_at).toLocaleString('pt-BR', {
                            timeZone: 'America/Sao_Paulo',
                            day: '2-digit', month: '2-digit',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      )}
                      <p className="text-[11px] text-white/25 mt-0.5">
                        {formatDistanceToNow(new Date(item.occurred_at), { locale: ptBR, addSuffix: true })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Quick stats */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="bg-ui-card border border-white/5 rounded-xl p-3 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-brand-500" />
              <p className="text-[11px] font-semibold text-white/35 uppercase tracking-wider mb-1.5">
                Conversas ativas
              </p>
              <p className="text-2xl font-bold text-white">{m?.active_conversations ?? '—'}</p>
            </div>
            <div className="bg-ui-card border border-white/5 rounded-xl p-3 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" />
              <p className="text-[11px] font-semibold text-white/35 uppercase tracking-wider mb-1.5">
                Clientes
              </p>
              <p className="text-2xl font-bold text-white">{m?.total_clients ?? '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Check-ins recentes dos pacientes */}
      {recentCheckins && recentCheckins.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-4 h-4 text-amber-400" />
            <div>
              <h2 className="text-sm font-semibold text-white/80">Check-ins dos pacientes</h2>
              <p className="text-xs text-white/30 mt-0.5">Como seus pacientes estão se sentindo esta semana</p>
            </div>
          </div>

          <div className="bg-ui-card border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="flex items-center gap-4 px-5 py-2 border-b border-white/[0.04]">
              <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider flex-1">Paciente</p>
              <div className="hidden md:flex gap-6 flex-shrink-0">
                {['🍽️', '⚡', '😴', '😊'].map(l => (
                  <p key={l} className="text-[11px] w-8 text-center">{l}</p>
                ))}
                <p className="text-[10px] font-semibold text-white/25 w-10 text-center">Média</p>
              </div>
            </div>
            <ul className="divide-y divide-white/[0.04]">
              {recentCheckins.slice(0, 8).map((c, i) => {
                const avg = (c.hunger_score + c.energy_score + c.sleep_score + c.mood_score) / 4
                const name = (c.client_name && c.client_name !== 'Cliente') ? c.client_name : formatPhone(c.client_phone)
                const sc = (v: number) => v >= 4 ? 'text-emerald-400' : v <= 2 ? 'text-red-400' : 'text-amber-400'
                return (
                  <li key={i} className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                    <Link href={`/clientes/${c.client_id}`} className="flex-1 min-w-0 group">
                      <p className="text-[13px] font-medium text-white/80 group-hover:text-white transition-colors truncate">{name}</p>
                      <p className="text-[10px] text-white/25 mt-0.5">semana {c.week_start.slice(5).replace('-', '/')}</p>
                    </Link>
                    <div className="hidden md:flex gap-6 flex-shrink-0 items-center">
                      {[c.hunger_score, c.energy_score, c.sleep_score, c.mood_score].map((v, j) => (
                        <span key={j} className={`text-sm font-bold w-8 text-center ${sc(v)}`}>{v}</span>
                      ))}
                      <span className={`text-sm font-bold w-10 text-center ${sc(Math.round(avg))}`}>{avg.toFixed(1)}</span>
                    </div>
                    {/* Mobile: só a média */}
                    <span className={`md:hidden text-sm font-bold flex-shrink-0 ${sc(Math.round(avg))}`}>{avg.toFixed(1)}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
