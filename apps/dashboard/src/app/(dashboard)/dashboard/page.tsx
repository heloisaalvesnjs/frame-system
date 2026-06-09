'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import {
  Users, Calendar, MessageSquare, TrendingUp,
  ArrowUpRight, Bot, Zap, Clock,
  Dot,
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface ActivityItem {
  type: 'new_lead' | 'appointment'
  occurred_at: string
  client_name: string | null
  client_phone: string
  scheduled_at?: string
  status?: string
}

interface Appointment {
  id: string
  client_name: string | null
  client_phone: string
  scheduled_at: string
  duration_minutes: number
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'blocked'
  modality?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, '')
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  return phone
}

function clientLabel(name: string | null, phone: string) {
  return name && name !== 'Cliente' ? name : formatPhone(phone)
}

const AVATAR_COLORS = [
  '#5B6EF5', '#E84393', '#F59823', '#27AE60',
  '#9B59B6', '#E74C3C', '#1ABC9C', '#2980B9',
]

function getAvatarColor(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function getInitials(name: string | null, phone: string) {
  if (name && name !== 'Cliente') {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  }
  return phone.replace(/\D/g, '').slice(-2)
}

const APT_STATUS: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  scheduled:  { label: 'Agendada',   color: '#2563EB', bg: '#EFF6FF', dot: '#3B82F6' },
  confirmed:  { label: 'Confirmada', color: '#059669', bg: '#ECFDF5', dot: '#10B981' },
  cancelled:  { label: 'Cancelada',  color: '#DC2626', bg: '#FEF2F2', dot: '#EF4444' },
  completed:  { label: 'Realizada',  color: '#6B7280', bg: '#F9FAFB', dot: '#9CA3AF' },
  blocked:    { label: 'Bloqueado',  color: '#9CA3AF', bg: '#F3F4F6', dot: '#D1D5DB' },
}

// ── Metric Card ───────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  subColor,
  href,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  accent: string
  subColor?: string
  href?: string
}) {
  const inner = (
    <div
      className="rounded-2xl p-5 relative overflow-hidden group transition-all duration-150 cursor-default"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Accent left bar */}
      <div
        className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full"
        style={{ background: accent }}
      />

      {/* Icon */}
      <div
        className="absolute top-4 right-4 w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-150 group-hover:scale-110"
        style={{ background: `${accent}14` }}
      >
        <Icon className="w-4 h-4" style={{ color: accent }} />
      </div>

      <div className="pl-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.07em] mb-3" style={{ color: 'var(--t3)' }}>
          {label}
        </p>
        <p className="text-[34px] font-bold tracking-tight leading-none mb-2" style={{ color: 'var(--t1)' }}>
          {value}
        </p>
        {sub && (
          <p className="text-[12px] font-medium flex items-center gap-1" style={{ color: subColor ?? 'var(--t3)' }}>
            {subColor === 'var(--brand)' && <ArrowUpRight className="w-3 h-3" />}
            {sub}
          </p>
        )}
      </div>
    </div>
  )

  return href ? <Link href={href}>{inner}</Link> : inner
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function MetricSkeleton() {
  return (
    <div
      className="rounded-2xl p-5 h-[118px] animate-pulse"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    />
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth()

  const { data: m, isLoading: loadingMetrics } = useQuery({
    queryKey: ['metrics-overview'],
    queryFn: async () => {
      const { data } = await api.get('/api/metrics/overview')
      return data.metrics as Metrics | null
    },
    staleTime: 60_000,
  })

  const { data: activityData } = useQuery({
    queryKey: ['metrics-activity'],
    queryFn: async () => {
      const { data } = await api.get('/api/metrics/recent-activity')
      return data.activity as ActivityItem[]
    },
    staleTime: 30_000,
  })

  const { data: todayAppointments } = useQuery({
    queryKey: ['appointments-today'],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10)
      const { data } = await api.get(`/api/appointments?date=${today}`)
      return (data.appointments ?? []) as Appointment[]
    },
    staleTime: 30_000,
  })

  // Greeting
  const hour = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })
  ).getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const firstName = user?.name?.split(' ')[0] ?? ''

  const dateLabel = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
    timeZone: 'America/Sao_Paulo',
  })
  const dateStr = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)

  const visibleApts = (todayAppointments ?? []).filter(a => a.status !== 'blocked')
  const nextApt = visibleApts.find(a => a.status === 'confirmed' || a.status === 'scheduled')

  return (
    <div className="p-6 md:p-8 max-w-[1400px]">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1
            className="text-[26px] font-bold tracking-tight leading-tight"
            style={{ color: 'var(--t1)' }}
          >
            {greeting}, {firstName}
          </h1>
          <p className="text-[13px] mt-1 flex items-center gap-1.5" style={{ color: 'var(--t3)' }}>
            <Clock className="w-3.5 h-3.5" />
            {dateStr}
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <Link href="/agenda" className="btn-secondary text-[13px] h-9 px-4">
            <Calendar className="w-3.5 h-3.5" />
            Agenda
          </Link>
          <Link href="/conversas" className="btn-primary text-[13px] h-9 px-4">
            <Zap className="w-3.5 h-3.5" />
            Conversas
          </Link>
        </div>
      </div>

      {/* ── Metrics ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loadingMetrics ? (
          Array.from({ length: 4 }).map((_, i) => <MetricSkeleton key={i} />)
        ) : (
          <>
            <MetricCard
              label="Clientes ativos"
              value={m?.total_clients ?? 0}
              sub={`+${m?.new_leads_week ?? 0} esta semana`}
              icon={Users}
              accent="#00C27C"
              subColor="var(--brand)"
              href="/clientes"
            />
            <MetricCard
              label="Consultas hoje"
              value={visibleApts.length}
              sub={nextApt
                ? `Próxima às ${new Date(nextApt.scheduled_at).toLocaleTimeString('pt-BR', {
                    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
                  })}`
                : 'Nenhuma próxima'
              }
              icon={Calendar}
              accent="#3B82F6"
              href="/agenda"
            />
            <MetricCard
              label="Mensagens ativas"
              value={m?.active_conversations ?? 0}
              sub="conversas em aberto"
              icon={MessageSquare}
              accent="#8B5CF6"
              href="/conversas"
            />
            <MetricCard
              label="Esta semana"
              value={m?.appointments_week ?? 0}
              sub="agendamentos nos 7 dias"
              icon={TrendingUp}
              accent="#F59E0B"
            />
          </>
        )}
      </div>

      {/* ── Two columns ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">

        {/* ── Atividade recente ───────────────────────────────────── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div className="card-header">
            <div>
              <h2 className="text-[15px] font-semibold" style={{ color: 'var(--t1)' }}>
                Atividade recente
              </h2>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--t3)' }}>
                Últimas interações dos clientes
              </p>
            </div>
            <Link
              href="/conversas"
              className="flex items-center gap-1 text-[12px] font-semibold transition-opacity hover:opacity-70"
              style={{ color: 'var(--brand)' }}
            >
              Ver tudo
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {!activityData || activityData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
              >
                <MessageSquare className="w-5 h-5" style={{ color: 'var(--t3)' }} />
              </div>
              <p className="text-[14px] font-medium" style={{ color: 'var(--t2)' }}>Sem atividade ainda</p>
              <p className="text-[13px] mt-1" style={{ color: 'var(--t3)' }}>
                As interações dos clientes aparecerão aqui
              </p>
            </div>
          ) : (
            <ul>
              {activityData.slice(0, 8).map((item, i) => {
                const name = clientLabel(item.client_name, item.client_phone)
                const initials = getInitials(item.client_name, item.client_phone)
                const color = getAvatarColor(name)
                const timeAgo = formatDistanceToNow(new Date(item.occurred_at), {
                  locale: ptBR, addSuffix: false,
                })
                const isLead = item.type === 'new_lead'
                const preview = isLead
                  ? 'Novo lead iniciou conversa pelo WhatsApp'
                  : item.scheduled_at
                    ? `Consulta agendada para ${new Date(item.scheduled_at).toLocaleString('pt-BR', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                        timeZone: 'America/Sao_Paulo',
                      })}`
                    : 'Consulta agendada'

                return (
                  <li
                    key={i}
                    className="flex items-center gap-4 px-5 py-3.5 transition-colors"
                    style={{
                      borderBottom: i < Math.min(activityData.length - 1, 7) ? '1px solid var(--border)' : undefined,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--raised)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    {/* Avatar */}
                    <div
                      className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold text-white shadow-sm"
                      style={{ background: color }}
                    >
                      {initials}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--t1)' }}>
                          {name}
                        </p>
                        {isLead && (
                          <span
                            className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                            style={{ color: '#059669', background: '#ECFDF5' }}
                          >
                            Novo
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] truncate mt-0.5" style={{ color: 'var(--t3)' }}>
                        {preview}
                      </p>
                    </div>

                    <span className="text-[11px] flex-shrink-0 font-medium" style={{ color: 'var(--t3)' }}>
                      {timeAgo}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* ── Right column ────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">

          {/* Agenda de hoje */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
          >
            <div className="card-header">
              <div>
                <h2 className="text-[15px] font-semibold" style={{ color: 'var(--t1)' }}>
                  Hoje
                </h2>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--t3)' }}>
                  {visibleApts.length === 0 ? 'Sem consultas' : `${visibleApts.length} consulta${visibleApts.length !== 1 ? 's' : ''}`}
                </p>
              </div>
              <Link
                href="/agenda"
                className="text-[12px] font-semibold flex items-center gap-1 transition-opacity hover:opacity-70"
                style={{ color: 'var(--brand)' }}
              >
                Abrir
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {visibleApts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: 'var(--raised)' }}
                >
                  <Calendar className="w-4.5 h-4.5" style={{ color: 'var(--t3)' }} />
                </div>
                <p className="text-[13px]" style={{ color: 'var(--t3)' }}>Dia livre hoje</p>
              </div>
            ) : (
              <ul>
                {visibleApts.slice(0, 5).map((apt, i, arr) => {
                  const s = APT_STATUS[apt.status] ?? APT_STATUS.scheduled
                  const timeStr = new Date(apt.scheduled_at).toLocaleTimeString('pt-BR', {
                    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
                  })
                  const name = clientLabel(apt.client_name, apt.client_phone)

                  return (
                    <li
                      key={apt.id}
                      className="flex items-center gap-3 px-4 py-3"
                      style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : undefined }}
                    >
                      {/* Dot indicator */}
                      <Dot className="w-5 h-5 flex-shrink-0 -ml-0.5" style={{ color: s.dot }} />

                      {/* Time */}
                      <div className="flex-shrink-0" style={{ minWidth: 38 }}>
                        <p className="text-[13px] font-bold leading-tight" style={{ color: 'var(--t1)' }}>
                          {timeStr}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--t3)' }}>
                          {apt.duration_minutes}min
                        </p>
                      </div>

                      {/* Name + status */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate" style={{ color: 'var(--t1)' }}>
                          {name}
                        </p>
                        <p className="text-[11px] truncate" style={{ color: 'var(--t3)' }}>
                          {apt.modality ?? 'Consulta'}
                        </p>
                      </div>

                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ color: s.color, background: s.bg }}
                      >
                        {s.label}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Assistente IA — status card */}
          <div
            className="rounded-2xl p-5 relative overflow-hidden"
            style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {/* Glow */}
            <div
              className="absolute -top-8 -right-8 w-40 h-40 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(0,194,124,0.18) 0%, transparent 70%)' }}
            />

            <div className="relative z-10 flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(0,194,124,0.15)', border: '1px solid rgba(0,194,124,0.2)' }}
              >
                <Bot className="w-5 h-5" style={{ color: 'var(--brand)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[14px] font-semibold text-white">Assistente ativa</p>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--brand)' }} />
                </div>
                <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Respondendo clientes automaticamente no WhatsApp
                </p>
                <Link
                  href="/treinamento"
                  className="inline-flex items-center gap-1.5 mt-3 text-[12px] font-semibold transition-opacity hover:opacity-70"
                  style={{ color: 'var(--brand)' }}
                >
                  Configurar assistente
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
