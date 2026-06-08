'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import {
  Users, Calendar, MessageSquare, TrendingUp,
  ChevronRight, Activity,
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
  '#5B6EF5', '#E84393', '#F5A623', '#27AE60',
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

const STATUS_LABELS: Record<string, string> = {
  scheduled:  'Agendada',
  confirmed:  'Confirmada',
  cancelled:  'Cancelada',
  completed:  'Realizada',
  blocked:    'Bloqueada',
}

const STATUS_COLORS: Record<string, { text: string; bg: string }> = {
  scheduled: { text: '#2563EB', bg: '#EFF6FF' },
  confirmed: { text: '#059669', bg: '#ECFDF5' },
  cancelled: { text: '#DC2626', bg: '#FEF2F2' },
  completed: { text: '#6B7280', bg: '#F9FAFB' },
  blocked:   { text: '#9CA3AF', bg: '#F3F4F6' },
}

// ── Metric Card ───────────────────────────────────────────────────────────────

function MetricCard({
  label, value, sub, icon: Icon, subColor,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  subColor?: string
}) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
      }}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-[14px] h-[14px]" style={{ color: 'var(--t3)' }} />
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--t3)' }}>
          {label}
        </span>
      </div>
      <p className="text-[38px] font-bold tracking-tight leading-none" style={{ color: 'var(--t1)' }}>
        {value}
      </p>
      {sub && (
        <p className="text-[12px] font-medium" style={{ color: subColor ?? 'var(--t3)' }}>
          {sub}
        </p>
      )}
    </div>
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

  // Today's visible appointments
  const visibleApts = (todayAppointments ?? []).filter(a => a.status !== 'blocked')
  const nextApt = visibleApts.find(a => a.status === 'confirmed' || a.status === 'scheduled')

  return (
    <div className="p-6 md:p-8 max-w-[1400px]">

      {/* Header */}
      <div className="mb-7">
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--t1)' }}>
          {greeting}, {firstName}! 👋
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--t3)' }}>{dateStr}</p>
      </div>

      {/* Metrics row */}
      {loadingMetrics ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl h-28 animate-pulse"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
          <MetricCard
            label="Clientes ativos"
            value={m?.total_clients ?? 0}
            sub={`+${m?.new_leads_week ?? 0} esta semana`}
            icon={Users}
            subColor="var(--brand)"
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
          />
          <MetricCard
            label="Mensagens"
            value={m?.active_conversations ?? 0}
            sub="conversas ativas"
            icon={MessageSquare}
          />
          <MetricCard
            label="Agendamentos"
            value={m?.appointments_week ?? 0}
            sub="nos últimos 7 dias"
            icon={TrendingUp}
          />
        </div>
      )}

      {/* 2-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">

        {/* Atividade recente */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <h2 className="text-[15px] font-semibold" style={{ color: 'var(--t1)' }}>
              Atividade recente
            </h2>
            <Link
              href="/conversas"
              className="flex items-center gap-1 text-[12px] font-semibold transition-opacity hover:opacity-70"
              style={{ color: 'var(--brand)' }}
            >
              Ver tudo <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {!activityData || activityData.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Activity className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--border)' }} />
              <p className="text-sm" style={{ color: 'var(--t3)' }}>Nenhuma atividade recente</p>
            </div>
          ) : (
            <ul>
              {activityData.map((item, i) => {
                const name = clientLabel(item.client_name, item.client_phone)
                const initials = getInitials(item.client_name, item.client_phone)
                const color = getAvatarColor(name)
                const timeAgo = formatDistanceToNow(new Date(item.occurred_at), {
                  locale: ptBR, addSuffix: false,
                })
                const preview = item.type === 'new_lead'
                  ? 'Novo lead iniciou conversa'
                  : item.scheduled_at
                    ? `Consulta agendada para ${new Date(item.scheduled_at).toLocaleString('pt-BR', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                        timeZone: 'America/Sao_Paulo',
                      })}`
                    : 'Consulta agendada'

                return (
                  <li
                    key={i}
                    className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-raised/40 cursor-default"
                    style={{
                      borderBottom: i < activityData.length - 1 ? '1px solid var(--border)' : undefined,
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-[12px] font-bold text-white"
                      style={{ background: color }}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--t1)' }}>
                        {name}
                      </p>
                      <p className="text-[12px] truncate mt-0.5" style={{ color: 'var(--t3)' }}>
                        {preview}
                      </p>
                    </div>
                    <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--t3)' }}>
                      {timeAgo}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">

          {/* Agenda de hoje */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow)',
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <h2 className="text-[15px] font-semibold" style={{ color: 'var(--t1)' }}>
                Agenda de hoje
              </h2>
              <Link
                href="/agenda"
                className="text-[12px] font-semibold transition-opacity hover:opacity-70"
                style={{ color: 'var(--brand)' }}
              >
                Ver agenda
              </Link>
            </div>

            {visibleApts.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <Calendar className="w-7 h-7 mx-auto mb-2" style={{ color: 'var(--border)' }} />
                <p className="text-sm" style={{ color: 'var(--t3)' }}>Sem consultas hoje</p>
              </div>
            ) : (
              <ul>
                {visibleApts.slice(0, 4).map((apt, i, arr) => {
                  const sc = STATUS_COLORS[apt.status] ?? STATUS_COLORS.scheduled
                  const timeStr = new Date(apt.scheduled_at).toLocaleTimeString('pt-BR', {
                    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
                  })
                  const name = clientLabel(apt.client_name, apt.client_phone)
                  return (
                    <li
                      key={apt.id}
                      className="flex items-center gap-3 px-5 py-3.5"
                      style={{
                        borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : undefined,
                      }}
                    >
                      {/* Time */}
                      <div className="flex-shrink-0 text-right" style={{ minWidth: 40 }}>
                        <p className="text-[13px] font-bold" style={{ color: 'var(--t1)' }}>{timeStr}</p>
                        <p className="text-[10px]" style={{ color: 'var(--t3)' }}>{apt.duration_minutes}min</p>
                      </div>
                      {/* Color bar */}
                      <div className="w-[3px] h-8 rounded-full flex-shrink-0" style={{ background: sc.text }} />
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--t1)' }}>{name}</p>
                        <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--t3)' }}>
                          {apt.modality ?? 'Consulta'}
                        </p>
                      </div>
                      {/* Badge */}
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ color: sc.text, background: sc.bg }}
                      >
                        {STATUS_LABELS[apt.status] ?? apt.status}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Assistente IA */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow)',
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <h2 className="text-[15px] font-semibold" style={{ color: 'var(--t1)' }}>
                Assistente IA
              </h2>
              <div className="flex items-center gap-1.5">
                <span className="w-[7px] h-[7px] rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[12px] font-medium" style={{ color: '#10b981' }}>Ativo</span>
              </div>
            </div>
            <div className="px-5 py-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px]" style={{ color: 'var(--t2)' }}>Mensagens hoje</span>
                <span className="text-[13px] font-bold" style={{ color: 'var(--t1)' }}>
                  {m?.active_conversations ?? '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px]" style={{ color: 'var(--t2)' }}>Taxa de conversão</span>
                <span className="text-[13px] font-bold" style={{ color: 'var(--brand)' }}>
                  {m?.conversion_rate != null ? `${m.conversion_rate}%` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px]" style={{ color: 'var(--t2)' }}>Modo férias</span>
                <span className="text-[13px]" style={{ color: 'var(--t3)' }}>Desativado</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
