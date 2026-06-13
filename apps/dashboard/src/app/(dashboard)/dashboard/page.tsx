'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Line,
  LineChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CalendarDays,
  Clock,
  Clock3,
  Download,
  MessageCircle,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { Card, SectionTitle, Badge, KPI, Btn, Avatar } from '@/components/ui/finance-primitives'

const revenueSample = [
  { m: 'Jan', r: 12840, c: 1820 },
  { m: 'Fev', r: 13120, c: 1910 },
  { m: 'Mar', r: 14380, c: 2040 },
  { m: 'Abr', r: 15690, c: 2110 },
  { m: 'Mai', r: 15940, c: 2230 },
  { m: 'Jun', r: 16842, c: 2312 },
]

const aiActivitySample = [
  { h: '08h', v: 12 },
  { h: '10h', v: 28 },
  { h: '12h', v: 19 },
  { h: '14h', v: 34 },
  { h: '16h', v: 41 },
  { h: '18h', v: 22 },
  { h: '20h', v: 9 },
]

const tooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--line-2)',
  borderRadius: 10,
  fontSize: 12,
  color: 'var(--t1)',
}

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

const avatarPalette = ['blue', 'green', 'purple', 'orange', 'pink'] as const

const appointmentStatus: Record<Appointment['status'], { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'; bar: string }> = {
  scheduled: { label: 'Agendada', variant: 'info', bar: 'var(--info)' },
  confirmed: { label: 'Confirmada', variant: 'success', bar: 'var(--brand)' },
  cancelled: { label: 'Cancelada', variant: 'danger', bar: 'var(--danger)' },
  completed: { label: 'Realizada', variant: 'default', bar: 'var(--t4)' },
  blocked: { label: 'Bloqueado', variant: 'default', bar: 'var(--t4)' },
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
  return avatarPalette[Math.abs(hash) % avatarPalette.length]
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

function Hero({ userName, metrics }: { userName?: string; metrics?: Metrics | null }) {
  const hour = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })).getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  const newLeads = metrics?.new_leads_week ?? 0
  const openConversations = metrics?.active_conversations ?? 0
  const appointmentsWeek = metrics?.appointments_week ?? 0

  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-6"
      style={{
        borderColor: 'var(--line-1)',
        background: 'radial-gradient(120% 80% at 10% 0%, var(--brand-s) 0%, transparent 50%), var(--surface)',
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--t3)' }}>
            <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--brand)' }} />
            Frame AI &middot; Resumo do dia
          </div>
          <h1 className="font-display mt-2 text-[22px] font-bold tracking-tight md:text-[26px]" style={{ color: 'var(--t1)' }}>
            {greeting}, {userName || 'Heloisa'}.{' '}
            {newLeads > 0 ? (
              <>
                Sua clinica recebeu{' '}
                <span className="gradient-brand-text">{newLeads} {newLeads === 1 ? 'novo lead' : 'novos leads'}</span>{' '}
                esta semana.
              </>
            ) : (
              'Acompanhe leads, agenda e performance da assistente.'
            )}
          </h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-5" style={{ color: 'var(--t2)' }}>
            {openConversations > 0
              ? `${openConversations} ${openConversations === 1 ? 'conversa aberta aguarda resposta' : 'conversas abertas aguardam resposta'} e ${appointmentsWeek} ${appointmentsWeek === 1 ? 'consulta agendada' : 'consultas agendadas'} nos proximos 7 dias.`
              : 'Acompanhe leads, agenda e performance da assistente sem perder o controle do consultorio.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="#insights">
            <Btn variant="secondary" size="sm">
              Ver insights
            </Btn>
          </Link>
          <Link href="/followup">
            <Btn variant="primary" size="sm">
              <Zap className="h-3.5 w-3.5" />
              Executar follow-up
            </Btn>
          </Link>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl surface-2" style={{ color: 'var(--t3)' }}>
        <Sparkles className="h-5 w-5" />
      </div>
      <p className="text-[13px] font-semibold" style={{ color: 'var(--t1)' }}>{title}</p>
      <p className="mt-1 max-w-sm text-[12px] leading-5" style={{ color: 'var(--t3)' }}>{description}</p>
    </div>
  )
}

function ActivityList({ items }: { items?: ActivityItem[] }) {
  if (!items || items.length === 0) {
    return <EmptyState title="Sem atividade recente" description="Novos leads, mensagens e agendamentos aparecerao aqui assim que a operacao comecar a rodar." />
  }

  return (
    <div className="space-y-1">
      {items.slice(0, 8).map((item, index) => {
        const name = clientLabel(item.client_name, item.client_phone)
        const isLead = item.type === 'new_lead'
        const preview = isLead
          ? 'Novo lead iniciou conversa pelo WhatsApp'
          : item.scheduled_at
            ? `Consulta agendada para ${formatSaoPauloDateTime(item.scheduled_at)}`
            : 'Consulta agendada pela assistente'

        return (
          <div
            key={`${item.occurred_at}-${index}`}
            className="flex items-center gap-3 rounded-xl border border-transparent p-3 transition-all duration-200 hover:bg-white/[0.015] hover:border-[var(--line-1)]"
          >
            <Avatar name={name} color={getAvatarColor(name)} size={32} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="truncate text-[13px] font-medium" style={{ color: 'var(--t1)' }}>{name}</p>
                <Badge variant={isLead ? 'success' : 'info'}>{isLead ? 'Lead' : 'Agenda'}</Badge>
              </div>
              <p className="mt-0.5 truncate text-[12px]" style={{ color: 'var(--t3)' }}>{preview}</p>
            </div>
            <span className="hidden shrink-0 text-[11px] sm:block" style={{ color: 'var(--t3)' }}>
              {formatDistanceToNow(new Date(item.occurred_at), { locale: ptBR, addSuffix: true })}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function TodayAgenda({ appointments }: { appointments?: Appointment[] }) {
  const visibleAppointments = (appointments ?? []).filter(item => item.status !== 'blocked')

  if (visibleAppointments.length === 0) {
    return <EmptyState title="Agenda livre hoje" description="Quando houver consultas agendadas, elas ficam visiveis aqui com horario, paciente e status." />
  }

  return (
    <div className="space-y-2">
      {visibleAppointments.slice(0, 5).map(appointment => {
        const status = appointmentStatus[appointment.status] ?? appointmentStatus.scheduled
        const name = clientLabel(appointment.client_name, appointment.client_phone)

        return (
          <div key={appointment.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 surface-2">
            <span className="h-9 w-[3px] flex-shrink-0 rounded-full" style={{ background: status.bar }} />
            <div className="w-12 flex-shrink-0">
              <p className="font-mono text-[12px] font-medium tabular-nums" style={{ color: 'var(--t1)' }}>{formatSaoPauloTime(appointment.scheduled_at)}</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium" style={{ color: 'var(--t1)' }}>{name}</p>
              <p className="truncate text-[11.5px]" style={{ color: 'var(--t3)' }}>
                {appointment.modality ?? 'Consulta'} &middot; {appointment.duration_minutes} min
              </p>
            </div>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        )
      })}
    </div>
  )
}

function InsightsList({ metrics }: { metrics?: Metrics | null }) {
  const newLeads = metrics?.new_leads_week ?? 0
  const openConversations = metrics?.active_conversations ?? 0
  const conversionRate = metrics?.conversion_rate

  const items: { icon: typeof MessageCircle; title: string; desc: string; href: string; suggested: boolean }[] = []

  if (openConversations > 0) {
    items.push({
      icon: MessageCircle,
      title: `${openConversations} ${openConversations === 1 ? 'conversa aberta pode' : 'conversas abertas podem'} virar consulta`,
      desc: 'Responda agora para nao perder o momento com o lead.',
      href: '/conversas',
      suggested: true,
    })
  }

  if (newLeads > 0) {
    items.push({
      icon: TrendingUp,
      title: `${newLeads} ${newLeads === 1 ? 'novo lead chegou' : 'novos leads chegaram'} esta semana`,
      desc: 'Configure um follow-up para acompanhar quem ainda nao respondeu.',
      href: '/followup',
      suggested: true,
    })
  }

  if (conversionRate != null) {
    items.push({
      icon: AlertCircle,
      title: `Taxa de conversao de ${Math.round(conversionRate)}%`,
      desc: `${metrics?.appointments_week ?? 0} agendamentos nos ultimos 7 dias.`,
      href: '/agenda',
      suggested: false,
    })
  }

  if (items.length === 0) {
    return <EmptyState title="Sem insights por enquanto" description="Conforme leads, conversas e agendamentos forem chegando, a Frame AI vai sugerir acoes aqui." />
  }

  return (
    <div className="space-y-1">
      {items.map(item => (
        <Link
          key={item.title}
          href={item.href}
          className="flex items-start gap-3 rounded-xl border border-transparent p-3 transition-all duration-200 hover:bg-white/[0.015] hover:border-[var(--line-1)]"
        >
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg surface-2" style={{ color: 'var(--brand)' }}>
            <item.icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[13px] font-medium" style={{ color: 'var(--t1)' }}>{item.title}</p>
              {item.suggested && <Badge variant="info">Acao sugerida</Badge>}
            </div>
            <p className="mt-0.5 text-[12px] leading-5" style={{ color: 'var(--t3)' }}>{item.desc}</p>
          </div>
        </Link>
      ))}
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
    <div>
      <div className="mb-4 flex items-start gap-3 rounded-xl p-3" style={{ background: 'var(--brand-s)', border: '1px solid var(--brand-ring)' }}>
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg surface-2" style={{ color: 'var(--brand)' }}>
          <Bot className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[13px] font-medium" style={{ color: 'var(--t1)' }}>Recepcionista ativa</p>
          <p className="mt-0.5 text-[12px] leading-5" style={{ color: 'var(--t3)' }}>
            A IA esta pronta para qualificar leads, tirar duvidas e conduzir agendamentos.
          </p>
        </div>
      </div>

      <div className="space-y-1">
        {rows.map(row => (
          <div key={row.label} className="flex items-center justify-between px-1 py-1.5">
            <span className="text-[12.5px]" style={{ color: 'var(--t2)' }}>{row.label}</span>
            <span className="font-mono text-[13px] font-medium tabular-nums" style={{ color: 'var(--t1)' }}>{row.value}</span>
          </div>
        ))}
      </div>

      <Link href="/treinamento" className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium transition-opacity hover:opacity-70" style={{ color: 'var(--brand)' }}>
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
        <div key={index} className="surface skeleton h-[110px]" />
      ))}
    </>
  )
}

function PageHeader() {
  const dateLabel = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Sao_Paulo',
  })
  const displayDate = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)

  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display font-bold text-[22px] tracking-tight" style={{ color: 'var(--t1)' }}>
          Visão Geral
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--t3)' }}>{displayDate}</p>
      </div>
      <div className="flex items-center gap-2">
        <Btn variant="secondary" size="sm">
          <Clock3 className="h-3.5 w-3.5" />
          Últimos 7 dias
        </Btn>
        <Btn variant="outline" size="sm">
          <Download className="h-3.5 w-3.5" />
          Exportar
        </Btn>
      </div>
    </div>
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
    <main className="px-6 py-6">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
        <PageHeader />
        <Hero userName={user?.name?.split(' ')[0]} metrics={metrics} />

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loadingMetrics ? (
            <SkeletonGrid />
          ) : (
            <>
              <KPI
                label="Clientes ativos"
                value={String(metrics?.total_clients ?? 0)}
                hint={`${metrics?.new_leads_week ?? 0} novos leads esta semana`}
              />
              <KPI
                label="Agenda de hoje"
                value={String(visibleAppointments.length)}
                hint={nextAppointment ? `Proxima consulta as ${formatSaoPauloTime(nextAppointment.scheduled_at)}` : 'Nenhuma consulta pendente hoje'}
              />
              <KPI
                label="Conversas abertas"
                value={String(metrics?.active_conversations ?? 0)}
                hint="Podem virar consulta"
              />
              <KPI
                label="Taxa de conversao"
                value={conversionRate}
                hint={`${metrics?.appointments_week ?? 0} agendamentos / 7 dias`}
              />
            </>
          )}
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <SectionTitle title="Receita" hint="Receita x custo de aquisicao (ilustrativo)" />
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueSample} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line-1)" vertical={false} />
                  <XAxis dataKey="m" stroke="var(--t3)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--t3)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="r" name="Receita" stroke="var(--brand)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--brand)' }} />
                  <Line type="monotone" dataKey="c" name="CAC" stroke="var(--info)" strokeWidth={2} dot={{ r: 3, fill: 'var(--info)' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <SectionTitle title="Performance da IA" hint="Mensagens respondidas por hora (ilustrativo)" />
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aiActivitySample} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line-1)" vertical={false} />
                  <XAxis dataKey="h" stroke="var(--t3)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--t3)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="v" name="Mensagens" fill="var(--brand)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        <div id="insights">
          <Card>
            <SectionTitle title="Insights inteligentes" hint="Sugestoes da Frame AI com base nos seus dados" />
            <InsightsList metrics={metrics} />
          </Card>
        </div>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <SectionTitle
              title="Linha do tempo comercial"
              hint="Leads e agendamentos recentes"
              action={
                <Link href="/conversas">
                  <Btn variant="ghost" size="sm">
                    Ver conversas
                    <ArrowRight className="h-3 w-3" />
                  </Btn>
                </Link>
              }
            />
            <ActivityList items={activityData} />
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <SectionTitle
                title="Próximas consultas"
                action={
                  <Link href="/agenda">
                    <Btn variant="ghost" size="sm">
                      Abrir
                      <ArrowRight className="h-3 w-3" />
                    </Btn>
                  </Link>
                }
              />
              <TodayAgenda appointments={todayAppointments} />
            </Card>

            <Card>
              <SectionTitle title="Saude da assistente" hint="IA" />
              <AssistantHealth metrics={metrics} />
            </Card>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
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
            <Link key={item.title} href={item.href} className="group surface p-5 transition-all duration-200 hover:border-[var(--line-2)]">
              <div className="mb-4 flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg surface-2" style={{ color: 'var(--t2)' }}>
                  <item.icon className="h-4 w-4" />
                </span>
                <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-60" style={{ color: 'var(--t3)' }} />
              </div>
              <h3 className="text-[13px] font-semibold" style={{ color: 'var(--t1)' }}>{item.title}</h3>
              <p className="mt-2 text-[12.5px] leading-5" style={{ color: 'var(--t3)' }}>{item.desc}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  )
}
