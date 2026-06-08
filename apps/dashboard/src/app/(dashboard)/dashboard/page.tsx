'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import {
  Users, Calendar, MessageSquare, ChevronRight,
  Clock, CheckCircle2, ClipboardList, Layers,
  TrendingUp, DollarSign,
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

const STAGE_COLORS: Record<Lead['stage'], { dot: string; badge: string; bar: string }> = {
  new:       { dot: 'bg-blue-400',    badge: 'bg-blue-50 text-blue-600 border-blue-100',       bar: 'bg-blue-400' },
  engaged:   { dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-600 border-amber-100',     bar: 'bg-amber-400' },
  scheduled: { dot: 'bg-violet-400',  badge: 'bg-violet-50 text-violet-600 border-violet-100',  bar: 'bg-violet-400' },
  converted: { dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-600 border-emerald-100', bar: 'bg-emerald-400' },
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

// ── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({
  label, value, sub, icon: Icon, iconColor, subColor = 'text-t3',
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  iconColor: string
  subColor?: string
}) {
  return (
    <div className="bg-surface border rounded-2xl p-5 flex flex-col gap-3" style={{ borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--t3)' }}>{label}</span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <p className="text-[32px] font-bold tracking-tight leading-none" style={{ color: 'var(--t1)' }}>{value}</p>
        {sub && <p className={`text-xs mt-1.5 font-medium ${subColor}`}>{sub}</p>}
      </div>
    </div>
  )
}

// ── Kanban Column ────────────────────────────────────────────────────────────

const KANBAN_STAGES: Lead['stage'][] = ['new', 'engaged', 'scheduled', 'converted']

function KanbanColumn({ stage, leads }: { stage: Lead['stage']; leads: Lead[] }) {
  const c = STAGE_COLORS[stage]
  return (
    <div className="flex-1 min-w-0">
      <div className="bg-surface border rounded-xl mb-2 overflow-hidden" style={{ borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}>
        <div className={`h-[3px] ${c.bar}`} />
        <div className="flex items-center justify-between px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--t3)' }}>
              {STAGE_LABELS[stage]}
            </span>
          </div>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${c.badge}`}>
            {leads.length}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {leads.length === 0 && (
          <div className="border border-dashed rounded-xl p-4 text-center text-xs" style={{ borderColor: 'var(--border)', color: 'var(--t3)' }}>
            Nenhum lead
          </div>
        )}
        {leads.map(lead => (
          <div
            key={lead.id}
            className="bg-surface border rounded-xl p-3 transition-all duration-150 cursor-default hover:shadow-sm"
            style={{ borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-[13px] font-medium truncate leading-snug" style={{ color: 'var(--t1)' }}>{clientLabel(lead)}</p>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium flex-shrink-0 ${c.badge}`}>
                {lead.message_count}msg
              </span>
            </div>
            {lead.next_appointment && (
              <p className="text-[11px] text-violet-500 flex items-center gap-1 mb-1.5 font-medium">
                <Calendar className="w-3 h-3 flex-shrink-0" />
                {new Date(lead.next_appointment).toLocaleString('pt-BR', {
                  timeZone: 'America/Sao_Paulo',
                  day: '2-digit', month: '2-digit',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            )}
            <p className="text-[11px] flex items-center gap-1" style={{ color: 'var(--t3)' }}>
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
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--t1)' }}>
            {greeting}, {firstName}! 👋
          </h1>
          <p className="text-sm mt-0.5 capitalize" style={{ color: 'var(--t3)' }}>
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long', day: '2-digit', month: 'long',
              timeZone: 'America/Sao_Paulo',
            })}
          </p>
        </div>
        <Link
          href="/conversas"
          className="flex-shrink-0 flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all duration-150"
          style={{ background: 'var(--brand-s)', color: 'var(--brand)', border: '1px solid var(--brand-s)' }}
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
            <div key={i} className="bg-surface border rounded-2xl p-5 h-28 animate-pulse" style={{ borderColor: 'var(--border)' }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            label="Total de leads"
            value={m?.total_leads ?? 0}
            sub={`+${m?.new_leads_week ?? 0} esta semana`}
            icon={Users}
            iconColor="bg-blue-50 text-blue-500"
            subColor="text-brand-500"
          />
          <MetricCard
            label="Agendamentos"
            value={m?.appointments_week ?? 0}
            sub="nos últimos 7 dias"
            icon={Calendar}
            iconColor="bg-violet-50 text-violet-500"
          />
          <MetricCard
            label="Taxa de conversão"
            value={m?.conversion_rate != null ? `${m.conversion_rate}%` : '—'}
            sub="leads → consulta"
            icon={TrendingUp}
            iconColor="bg-emerald-50 text-emerald-500"
            subColor="text-emerald-600"
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
            iconColor="bg-amber-50 text-amber-500"
          />
        </div>
      )}

      {/* Pipeline + Atividade */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">

        {/* Kanban */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[15px] font-semibold" style={{ color: 'var(--t1)' }}>Pipeline de Leads</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>{leads.length} lead{leads.length !== 1 ? 's' : ''} ativos</p>
            </div>
            <Link
              href="/clientes"
              className="text-xs flex items-center gap-1 transition-colors font-medium"
              style={{ color: 'var(--brand)' }}
            >
              Ver clientes <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {loadingPipeline ? (
            <div className="grid grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-40 bg-surface border rounded-2xl animate-pulse" style={{ borderColor: 'var(--border)' }} />
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

        {/* Atividade recente */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[15px] font-semibold" style={{ color: 'var(--t1)' }}>Atividade recente</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>Últimos 7 dias</p>
            </div>
          </div>

          <div className="bg-surface border rounded-2xl overflow-hidden" style={{ borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}>
            {!activityData || activityData.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--border)' }} />
                <p className="text-sm" style={{ color: 'var(--t3)' }}>Nenhuma atividade recente</p>
              </div>
            ) : (
              <ul>
                {activityData.map((item, i) => (
                  <li
                    key={i}
                    className="px-4 py-3 flex items-start gap-3 transition-colors"
                    style={{ borderBottom: i < activityData.length - 1 ? '1px solid var(--border)' : undefined }}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      item.type === 'new_lead'
                        ? 'bg-blue-50 text-blue-500'
                        : 'bg-emerald-50 text-emerald-500'
                    }`}>
                      {item.type === 'new_lead'
                        ? <MessageSquare className="w-3.5 h-3.5" />
                        : <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] truncate" style={{ color: 'var(--t3)' }}>
                        {item.type === 'new_lead' ? 'Novo lead' : 'Consulta agendada'}
                      </p>
                      <p className="text-[13px] font-medium truncate" style={{ color: 'var(--t1)' }}>
                        {item.client_name && item.client_name !== 'Cliente'
                          ? item.client_name
                          : formatPhone(item.client_phone)}
                      </p>
                      {item.scheduled_at && (
                        <p className="text-[11px] text-violet-500 mt-0.5 font-medium">
                          {new Date(item.scheduled_at).toLocaleString('pt-BR', {
                            timeZone: 'America/Sao_Paulo',
                            day: '2-digit', month: '2-digit',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      )}
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--t3)' }}>
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
            <div className="bg-surface border rounded-xl p-4 overflow-hidden" style={{ borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-3.5 h-3.5" style={{ color: 'var(--brand)' }} />
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--t3)' }}>
                  Conversas
                </p>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--t1)' }}>{m?.active_conversations ?? '—'}</p>
            </div>
            <div className="bg-surface border rounded-xl p-4 overflow-hidden" style={{ borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-3.5 h-3.5 text-blue-500" />
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--t3)' }}>
                  Clientes
                </p>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--t1)' }}>{m?.total_clients ?? '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Check-ins recentes */}
      {recentCheckins && recentCheckins.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-4 h-4 text-amber-500" />
            <div>
              <h2 className="text-[15px] font-semibold" style={{ color: 'var(--t1)' }}>Check-ins dos pacientes</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>Como seus pacientes estão se sentindo esta semana</p>
            </div>
          </div>

          <div className="bg-surface border rounded-2xl overflow-hidden" style={{ borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}>
            <div className="flex items-center gap-4 px-5 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider flex-1" style={{ color: 'var(--t3)' }}>Paciente</p>
              <div className="hidden md:flex gap-6 flex-shrink-0">
                {['🍽️', '⚡', '😴', '😊'].map(l => (
                  <p key={l} className="text-[11px] w-8 text-center">{l}</p>
                ))}
                <p className="text-[10px] font-semibold uppercase tracking-wider w-10 text-center" style={{ color: 'var(--t3)' }}>Média</p>
              </div>
            </div>
            <ul>
              {recentCheckins.slice(0, 8).map((c, i) => {
                const avg = (c.hunger_score + c.energy_score + c.sleep_score + c.mood_score) / 4
                const name = (c.client_name && c.client_name !== 'Cliente') ? c.client_name : formatPhone(c.client_phone)
                const sc = (v: number) => v >= 4 ? 'text-emerald-500' : v <= 2 ? 'text-red-500' : 'text-amber-500'
                return (
                  <li
                    key={i}
                    className="flex items-center gap-4 px-5 py-3 transition-colors"
                    style={{ borderBottom: i < recentCheckins.slice(0, 8).length - 1 ? '1px solid var(--border)' : undefined }}
                  >
                    <Link href={`/clientes/${c.client_id}`} className="flex-1 min-w-0 group">
                      <p className="text-[13px] font-medium truncate group-hover:text-brand-500 transition-colors" style={{ color: 'var(--t1)' }}>{name}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--t3)' }}>semana {c.week_start.slice(5).replace('-', '/')}</p>
                    </Link>
                    <div className="hidden md:flex gap-6 flex-shrink-0 items-center">
                      {[c.hunger_score, c.energy_score, c.sleep_score, c.mood_score].map((v, j) => (
                        <span key={j} className={`text-sm font-bold w-8 text-center ${sc(v)}`}>{v}</span>
                      ))}
                      <span className={`text-sm font-bold w-10 text-center ${sc(Math.round(avg))}`}>{avg.toFixed(1)}</span>
                    </div>
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
