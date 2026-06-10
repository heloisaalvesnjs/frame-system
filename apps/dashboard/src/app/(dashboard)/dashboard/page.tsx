'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
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

const APT_STATUS: Record<string, { label: string; color: string; bg: string; bar: string }> = {
  scheduled:  { label: 'Agendada',   color: '#2563EB', bg: 'rgba(59,130,246,0.1)',  bar: '#3B82F6' },
  confirmed:  { label: 'Confirmada', color: '#059669', bg: 'rgba(0,194,124,0.1)',   bar: 'var(--brand)' },
  cancelled:  { label: 'Cancelada',  color: '#DC2626', bg: 'rgba(239,68,68,0.1)',   bar: '#EF4444' },
  completed:  { label: 'Realizada',  color: '#6B7280', bg: 'var(--raised)',         bar: '#9CA3AF' },
  blocked:    { label: 'Bloqueado',  color: '#9CA3AF', bg: 'var(--raised)',         bar: '#D1D5DB' },
}

// ── Metric Card (mockup style) ────────────────────────────────────────────────

function MetricCard({
  label, value, sub, subColor, href,
}: {
  label: string
  value: string | number
  sub?: string
  subColor?: string
  href?: string
}) {
  const inner = (
    <div className="card !p-5 h-full transition-all duration-150 hover:shadow-sm">
      <p className="text-[12px] font-medium mb-2" style={{ color: 'var(--t2)' }}>
        {label}
      </p>
      <p className="text-[28px] font-bold tracking-tight leading-none mb-2" style={{ color: 'var(--t1)' }}>
        {value}
      </p>
      {sub && (
        <p className="text-[12px] font-medium" style={{ color: subColor ?? 'var(--t3)' }}>
          {sub}
        </p>
      )}
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

function MetricSkeleton() {
  return (
    <div
      className="rounded-2xl p-5 h-[110px] animate-pulse"
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
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1
            className="text-[24px] font-bold tracking-tight leading-tight"
            style={{ color: 'var(--t1)' }}
          >
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--t2)' }}>
            {dateStr}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/agenda" className="btn-secondary text-[13px] h-9 px-4">
            Agenda
          </Link>
          <Link href="/conversas" className="btn-primary text-[13px] h-9 px-4">
            Conversas
          </Link>
        </div>
      </div>

      {/* ── Metrics ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        {loadingMetrics ? (
          Array.from({ length: 4 }).map((_, i) => <MetricSkeleton key={i} />)
        ) : (
          <>
            <MetricCard
              label="Clientes ativos"
              value={m?.total_clients ?? 0}
              sub={`↑ +${m?.new_leads_week ?? 0} esta semana`}
              subColor="var(--brand-h)"
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
              href="/agenda"
            />
            <MetricCard
              label="Mensagens"
              value={m?.active_conversations ?? 0}
              sub="Conversas em aberto"
              subColor="#D97706"
              href="/conversas"
            />
            <MetricCard
              label="Esta semana"
              value={m?.appointments_week ?? 0}
              sub="Agendamentos nos 7 dias"
            />
          </>
        )}
      </div>

      {/* ── Two columns ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-3.5 items-start">

        {/* ── Atividade recente ───────────────────────────────────── */}
        <div className="card !p-0 overflow-hidden">
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <h2 className="text-[14px] font-semibold" style={{ color: 'var(--t1)' }}>
              Atividade recente
            </h2>
            <Link
              href="/conversas"
              className="text-[12px] font-semibold transition-opacity hover:opacity-70"
              style={{ color: 'var(--brand-h)' }}
            >
              Ver tudo
            </Link>
          </div>

          {!activityData || activityData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center px-6">
              <p className="text-[14px] font-medium" style={{ color: 'var(--t2)' }}>Sem atividade ainda</p>
              <p className="text-[13px] mt-1" style={{ color: 'var(--t3)' }}>
                As interações dos pacientes aparecerão aqui
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
                    className="flex items-center gap-3.5 px-5 py-3.5 transition-colors"
                    style={{
                      borderBottom: i < Math.min(activityData.length - 1, 7) ? '1px solid var(--border)' : undefined,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--raised)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold"
                      style={{ background: color, color: '#fff' }}
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
                            style={{ color: '#059669', background: 'rgba(0,194,124,0.1)' }}
                          >
                            Novo
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] truncate mt-0.5" style={{ color: 'var(--t2)' }}>
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

        {/* ── Right column ────────────────────────────────────────── */}
        <div className="flex flex-col gap-3.5">

          {/* Agenda de hoje */}
          <div className="card !p-0 overflow-hidden">
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <h2 className="text-[14px] font-semibold" style={{ color: 'var(--t1)' }}>
                Agenda de hoje
              </h2>
              <Link
                href="/agenda"
                className="text-[12px] font-semibold transition-opacity hover:opacity-70"
                style={{ color: 'var(--brand-h)' }}
              >
                Abrir
              </Link>
            </div>

            {visibleApts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-6">
                <p className="text-[13px]" style={{ color: 'var(--t3)' }}>Dia livre hoje</p>
              </div>
            ) : (
              <ul className="p-3 flex flex-col gap-2">
                {visibleApts.slice(0, 5).map((apt) => {
                  const s = APT_STATUS[apt.status] ?? APT_STATUS.scheduled
                  const timeStr = new Date(apt.scheduled_at).toLocaleTimeString('pt-BR', {
                    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
                  })
                  const name = clientLabel(apt.client_name, apt.client_phone)

                  return (
                    <li
                      key={apt.id}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                      style={{ background: 'var(--raised)' }}
                    >
                      <span className="text-[12px] font-bold flex-shrink-0 w-[40px]" style={{ color: 'var(--t1)' }}>
                        {timeStr}
                      </span>
                      <span
                        className="w-[3px] self-stretch rounded-full flex-shrink-0"
                        style={{ background: s.bar }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--t1)' }}>
                          {name}
                        </p>
                        <p className="text-[11px] truncate" style={{ color: 'var(--t2)' }}>
                          {apt.modality ?? 'Consulta'} · {apt.duration_minutes} min
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

          {/* Assistente IA — stat card (mockup style) */}
          <div className="card !p-0 overflow-hidden">
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <h2 className="text-[14px] font-semibold" style={{ color: 'var(--t1)' }}>
                Assistente IA
              </h2>
              <span className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: 'var(--brand-h)' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--brand)' }} />
                Ativo
              </span>
            </div>

            <div className="px-5 py-2">
              {[
                { label: 'Conversas ativas', value: String(m?.active_conversations ?? 0), accent: false },
                { label: 'Agendamentos na semana', value: String(m?.appointments_week ?? 0), accent: true },
                { label: 'Consultas realizadas no mês', value: String(m?.completed_this_month ?? 0), accent: false },
              ].map((row, i, arr) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between py-3"
                  style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : undefined }}
                >
                  <span className="text-[13px]" style={{ color: 'var(--t2)' }}>{row.label}</span>
                  <span
                    className="text-[13px] font-bold"
                    style={{ color: row.accent ? 'var(--brand-h)' : 'var(--t1)' }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="px-5 pb-4">
              <Link
                href="/treinamento"
                className="text-[12px] font-semibold transition-opacity hover:opacity-70"
                style={{ color: 'var(--brand-h)' }}
              >
                Configurar assistente →
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
