'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ArrowRight,
  Bot,
  CalendarDays,
  Clock3,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

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

const avatarColors = [
  '#4F46E5',
  '#DB2777',
  '#D97706',
  '#059669',
  '#7C3AED',
  '#DC2626',
  '#0891B2',
  '#2563EB',
]

const appointmentStatus: Record<Appointment['status'], { label: string; className: string; bar: string }> = {
  scheduled: { label: 'Agendada', className: 'bg-blue-500/10 text-blue-500', bar: '#3B82F6' },
  confirmed: { label: 'Confirmada', className: 'bg-emerald-500/10 text-emerald-500', bar: 'var(--brand)' },
  cancelled: { label: 'Cancelada', className: 'bg-red-500/10 text-red-500', bar: '#EF4444' },
  completed: { label: 'Realizada', className: 'bg-zinc-500/10 text-zinc-500', bar: '#A1A1AA' },
  blocked: { label: 'Bloqueado', className: 'bg-zinc-500/10 text-zinc-500', bar: '#A1A1AA' },
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 13) return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  return phone
}

function clientLabel(name: string | null, phone: string) {
  return name && name !== 'Cliente' ? name : formatPhone(phone)
}

function getAvatarColor(value: string) {
  let hash = 0
  for (let i = 0; i < value.length; i++) hash = value.charCodeAt(i) + ((hash << 5) - hash)
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

function getInitials(name: string | null, phone: string) {
  if (name && name !== 'Cliente') {
    return name
      .split(' ')
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  return phone.replace(/\D/g, '').slice(-2) || 'FS'
}

function formatSaoPauloTime(value: string) {
  return new Date(value).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function formatSaoPauloDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function PageHeader({ userName }: { userName?: string }) {
  const hour = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })).getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const dateLabel = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Sao_Paulo',
  })
  const displayDate = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)

  return (
    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div className="max-w-3xl">
        <div
          className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-semibold"
          style={{ borderColor: 'var(--border)', color: 'var(--brand-h)', background: 'var(--brand-s)' }}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Operacao de atendimento em tempo real
        </div>
        <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight md:text-[34px]" style={{ color: 'var(--t1)' }}>
          {greeting}, {userName || 'Heloisa'}
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-6" style={{ color: 'var(--t2)' }}>
          {displayDate}. Acompanhe leads, agenda e performance da assistente sem perder o controle do consultorio.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link href="/agenda" className="btn-secondary h-10 px-4 text-[13px]">
          <CalendarDays className="h-4 w-4" />
          Agenda
        </Link>
        <Link href="/conversas" className="btn-primary h-10 px-4 text-[13px]">
          <MessageCircle className="h-4 w-4" />
          Conversas
        </Link>
      </div>
    </div>
  )
}

function CommandCard({
  label,
  value,
  insight,
  href,
  icon: Icon,
  tone = 'default',
}: {
  label: string
  value: string | number
  insight: string
  href?: string
  icon: typeof Users
  tone?: 'default' | 'success' | 'warning' | 'info'
}) {
  const toneClass = {
    default: 'text-zinc-500 bg-zinc-500/10',
    success: 'text-emerald-500 bg-emerald-500/10',
    warning: 'text-amber-500 bg-amber-500/10',
    info: 'text-blue-500 bg-blue-500/10',
  }[tone]

  const content = (
    <div className="group h-full rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-frame-md" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="mb-5 flex items-center justify-between">
        <span className={cn('inline-flex h-9 w-9 items-center justify-center rounded-xl', toneClass)}>
          <Icon className="h-4 w-4" />
        </span>
        {href && <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-60" style={{ color: 'var(--t2)' }} />}
      </div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--t3)' }}>
        {label}
      </p>
      <div className="mt-2 flex items-end gap-2">
        <p className="font-display text-[32px] font-bold leading-none tracking-tight" style={{ color: 'var(--t1)' }}>
          {value}
        </p>
      </div>
      <p className="mt-3 min-h-[36px] text-[13px] leading-5" style={{ color: 'var(--t2)' }}>
        {insight}
      </p>
    </div>
  )

  return href ? <Link href={href}>{content}</Link> : content
}

function Panel({
  title,
  eyebrow,
  action,
  children,
  className,
}: {
  title: string
  eyebrow?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('overflow-hidden rounded-2xl border', className)} style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}>
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
        <div>
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--t3)' }}>
              {eyebrow}
            </p>
          )}
          <h2 className="mt-0.5 text-[15px] font-bold" style={{ color: 'var(--t1)' }}>
            {title}
          </h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: 'var(--raised)', color: 'var(--t3)' }}>
        <Sparkles className="h-5 w-5" />
      </div>
      <p className="text-[14px] font-semibold" style={{ color: 'var(--t1)' }}>{title}</p>
      <p className="mt-1 max-w-sm text-[13px] leading-5" style={{ color: 'var(--t2)' }}>{description}</p>
    </div>
  )
}

function ActivityList({ items }: { items?: ActivityItem[] }) {
  if (!items || items.length === 0) {
    return <EmptyState title="Sem atividade recente" description="Novos leads, mensagens e agendamentos aparecerao aqui assim que a operacao comecar a rodar." />
  }

  return (
    <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
      {items.slice(0, 8).map((item, index) => {
        const name = clientLabel(item.client_name, item.client_phone)
        const initials = getInitials(item.client_name, item.client_phone)
        const color = getAvatarColor(name)
        const isLead = item.type === 'new_lead'
        const preview = isLead
          ? 'Novo lead iniciou conversa pelo WhatsApp'
          : item.scheduled_at
            ? `Consulta agendada para ${formatSaoPauloDateTime(item.scheduled_at)}`
            : 'Consulta agendada pela assistente'

        return (
          <li key={`${item.occurred_at}-${index}`} className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-raised">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: color }}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-[13px] font-bold" style={{ color: 'var(--t1)' }}>{name}</p>
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', isLead ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500')}>
                  {isLead ? 'Lead' : 'Agenda'}
                </span>
              </div>
              <p className="mt-0.5 truncate text-[12px]" style={{ color: 'var(--t2)' }}>{preview}</p>
            </div>
            <span className="hidden text-[11px] sm:block" style={{ color: 'var(--t3)' }}>
              {formatDistanceToNow(new Date(item.occurred_at), { locale: ptBR, addSuffix: true })}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function TodayAgenda({ appointments }: { appointments?: Appointment[] }) {
  const visibleAppointments = (appointments ?? []).filter(item => item.status !== 'blocked')

  if (visibleAppointments.length === 0) {
    return <EmptyState title="Agenda livre hoje" description="Quando houver consultas agendadas, elas ficam visiveis aqui com horario, paciente e status." />
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      {visibleAppointments.slice(0, 5).map(appointment => {
        const status = appointmentStatus[appointment.status] ?? appointmentStatus.scheduled
        const name = clientLabel(appointment.client_name, appointment.client_phone)

        return (
          <div key={appointment.id} className="flex items-center gap-3 rounded-xl px-3 py-3" style={{ background: 'var(--raised)' }}>
            <div className="w-12 flex-shrink-0">
              <p className="text-[13px] font-bold" style={{ color: 'var(--t1)' }}>{formatSaoPauloTime(appointment.scheduled_at)}</p>
            </div>
            <span className="h-10 w-[3px] flex-shrink-0 rounded-full" style={{ background: status.bar }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold" style={{ color: 'var(--t1)' }}>{name}</p>
              <p className="truncate text-[11px]" style={{ color: 'var(--t2)' }}>
                {appointment.modality ?? 'Consulta'} - {appointment.duration_minutes} min
              </p>
            </div>
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', status.className)}>
              {status.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function AssistantHealth({ metrics }: { metrics?: Metrics | null }) {
  const rows = [
    { label: 'Conversas sob controle', value: metrics?.active_conversations ?? 0 },
    { label: 'Agendamentos na semana', value: metrics?.appointments_week ?? 0 },
    { label: 'Consultas realizadas no mes', value: metrics?.completed_this_month ?? 0 },
  ]

  return (
    <div className="p-5">
      <div className="mb-5 rounded-2xl border p-4" style={{ borderColor: 'rgba(0,194,124,.22)', background: 'var(--brand-s)' }}>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-emerald-500" style={{ background: 'var(--surface)' }}>
            <Bot className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[13px] font-bold" style={{ color: 'var(--t1)' }}>Recepcionista ativa</p>
            <p className="mt-1 text-[12px] leading-5" style={{ color: 'var(--t2)' }}>
              A IA esta pronta para qualificar leads, tirar duvidas e conduzir agendamentos.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        {rows.map(row => (
          <div key={row.label} className="flex items-center justify-between rounded-xl px-1 py-2">
            <span className="text-[13px]" style={{ color: 'var(--t2)' }}>{row.label}</span>
            <span className="text-[13px] font-bold" style={{ color: 'var(--t1)' }}>{row.value}</span>
          </div>
        ))}
      </div>

      <Link href="/treinamento" className="mt-4 inline-flex items-center gap-1 text-[12px] font-bold transition-opacity hover:opacity-70" style={{ color: 'var(--brand-h)' }}>
        Ajustar treinamento
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}

function SkeletonGrid() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-[172px] animate-pulse rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} />
      ))}
    </>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()

  const { data: metrics, isLoading: loadingMetrics } = useQuery({
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

  const visibleAppointments = useMemo(
    () => (todayAppointments ?? []).filter(item => item.status !== 'blocked'),
    [todayAppointments]
  )
  const nextAppointment = visibleAppointments.find(item => item.status === 'confirmed' || item.status === 'scheduled')
  const conversionRate = metrics?.conversion_rate == null ? '--' : `${Math.round(metrics.conversion_rate)}%`

  return (
    <main className="min-h-[calc(100vh-60px)] px-5 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-6">
        <PageHeader userName={user?.name?.split(' ')[0]} />

        <section className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          {loadingMetrics ? (
            <SkeletonGrid />
          ) : (
            <>
              <CommandCard
                label="Clientes ativos"
                value={metrics?.total_clients ?? 0}
                insight={`${metrics?.new_leads_week ?? 0} novos leads nesta semana para nutrir.`}
                href="/clientes"
                icon={Users}
                tone="success"
              />
              <CommandCard
                label="Agenda de hoje"
                value={visibleAppointments.length}
                insight={nextAppointment ? `Proxima consulta as ${formatSaoPauloTime(nextAppointment.scheduled_at)}.` : 'Nenhuma consulta pendente hoje.'}
                href="/agenda"
                icon={CalendarDays}
                tone="info"
              />
              <CommandCard
                label="Conversas abertas"
                value={metrics?.active_conversations ?? 0}
                insight="Atendimentos que ainda podem virar consulta."
                href="/conversas"
                icon={MessageCircle}
                tone="warning"
              />
              <CommandCard
                label="Conversao"
                value={conversionRate}
                insight={`${metrics?.appointments_week ?? 0} agendamentos nos ultimos 7 dias.`}
                icon={TrendingUp}
                tone="default"
              />
            </>
          )}
        </section>

        <section className="grid grid-cols-1 gap-3.5 xl:grid-cols-[1.45fr_0.9fr]">
          <Panel
            title="Linha do tempo comercial"
            eyebrow="Atendimento"
            action={
              <Link href="/conversas" className="inline-flex items-center gap-1 text-[12px] font-bold transition-opacity hover:opacity-70" style={{ color: 'var(--brand-h)' }}>
                Ver conversas
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            <ActivityList items={activityData} />
          </Panel>

          <div className="flex flex-col gap-3.5">
            <Panel
              title="Agenda de hoje"
              eyebrow="Consultorio"
              action={
                <Link href="/agenda" className="inline-flex items-center gap-1 text-[12px] font-bold transition-opacity hover:opacity-70" style={{ color: 'var(--brand-h)' }}>
                  Abrir
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            >
              <TodayAgenda appointments={todayAppointments} />
            </Panel>

            <Panel title="Saude da assistente" eyebrow="IA">
              <AssistantHealth metrics={metrics} />
            </Panel>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
          {[
            {
              title: 'Velocidade de resposta',
              desc: 'Acompanhe se a recepcionista esta absorvendo a demanda antes que leads esfriem.',
              icon: Zap,
              href: '/conversas',
            },
            {
              title: 'Qualidade do treinamento',
              desc: 'Revise tom, limites e respostas da IA para manter a experiencia com cara de consultorio premium.',
              icon: Sparkles,
              href: '/treinamento',
            },
            {
              title: 'Follow-ups planejados',
              desc: 'Use automacoes para recuperar interessados que ainda nao marcaram consulta.',
              icon: Clock3,
              href: '/followup',
            },
          ].map(item => (
            <Link
              key={item.title}
              href={item.href}
              className="group rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-frame-md"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'var(--raised)', color: 'var(--t2)' }}>
                  <item.icon className="h-5 w-5" />
                </span>
                <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-60" style={{ color: 'var(--t2)' }} />
              </div>
              <h3 className="text-[14px] font-bold" style={{ color: 'var(--t1)' }}>{item.title}</h3>
              <p className="mt-2 text-[13px] leading-5" style={{ color: 'var(--t2)' }}>{item.desc}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  )
}
