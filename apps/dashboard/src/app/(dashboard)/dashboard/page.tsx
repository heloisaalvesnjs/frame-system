'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { V4Avatar, V4Button, V4Card, V4Page, V4Tag } from '@/components/v4/V4Primitives'
import { AlertTriangle, ArrowUpRight, CalendarCheck, RefreshCw, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Metrics {
  new_leads_week: number
  active_conversations: number
  appointments_week: number
  total_clients: number
  conversion_rate: number | null
}

interface ConversationStats {
  active: number
  human_takeover: number
  resolved: number
  agendou: number
  comprou: number
  nao_avancou: number
  sem_resposta: number
  outro: number
  sem_classificacao: number
  ai_messages: number
}

interface Appointment {
  id: string
  client_name: string
  scheduled_at: string
  duration_minutes: number | null
  status: string
  modality?: string | null
}

interface ActivityItem {
  type: 'new_lead' | 'appointment'
  occurred_at: string
  client_name: string | null
  client_phone: string
  scheduled_at?: string
  status?: string
}

const APPT_STATUS: Record<string, { label: string; tone: 'default' | 'green' | 'amber' | 'blue' | 'red' }> = {
  scheduled: { label: 'Agendada', tone: 'blue' },
  confirmed: { label: 'Confirmada', tone: 'green' },
  completed: { label: 'Realizada', tone: 'default' },
  cancelled: { label: 'Cancelada', tone: 'red' },
}

const AVATAR_COLORS = ['#8867a9', '#427fa1', '#b26d54', '#5f916f', '#a16c42', '#6a7fa1']
function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function CommandCard({
  icon: Icon,
  title,
  copy,
  count,
  alert,
  href,
}: {
  icon: React.ElementType
  title: string
  copy: string
  count: number | string
  alert?: boolean
  href: string
}) {
  return (
    <Link href={href}>
      <div
        className={cn(
          'flex cursor-pointer items-center gap-3 rounded-[11px] border border-[var(--border)] bg-[var(--surface)] p-4 transition-all hover:border-[rgba(0,194,124,0.35)]',
          alert && 'bg-[#FFFDF8]',
        )}
      >
        <div
          className={cn(
            'grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[9px]',
            alert ? 'bg-[var(--amber-soft)] text-[var(--amber)]' : 'bg-[var(--brand-s)] text-[var(--brand)]',
          )}
        >
          <Icon className="h-[17px] w-[17px]" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold text-t1">{title}</div>
          <div className="mt-0.5 text-[11px] text-t3">{copy}</div>
        </div>
        <div className="text-[22px] font-bold leading-none tracking-tight text-t1">{count}</div>
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()

  const { data: metrics } = useQuery({
    queryKey: ['metrics-overview'],
    queryFn: async () => {
      const { data } = await api.get('/api/metrics/overview')
      return data.metrics as Metrics | null
    },
    staleTime: 60_000,
  })

  const { data: convStats } = useQuery({
    queryKey: ['conversations-stats'],
    queryFn: async () => {
      const { data } = await api.get('/api/conversations/stats')
      return data.stats as ConversationStats
    },
    staleTime: 60_000,
  })

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const { data: todayAppointments } = useQuery({
    queryKey: ['appointments-today', todayStr],
    queryFn: async () => {
      const { data } = await api.get('/api/appointments', { params: { date: todayStr } })
      return (data.appointments ?? []) as Appointment[]
    },
    staleTime: 60_000,
  })

  const { data: activity } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const { data } = await api.get('/api/metrics/recent-activity')
      return (data.activity ?? []) as ActivityItem[]
    },
    staleTime: 60_000,
  })

  const { data: whatsapp } = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: async () => {
      const { data } = await api.get('/api/whatsapp/status')
      return data as { status: string; phone?: string }
    },
    staleTime: 60_000,
  })

  const firstName = user?.name?.split(' ')[0] || 'Heloísa'
  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Sao_Paulo',
  })

  const upcomingToday = (todayAppointments ?? []).filter(a => a.status !== 'cancelled')
  const needsYou = convStats?.human_takeover ?? 0
  const hotLeads = metrics?.new_leads_week ?? 0
  const pendingConfirm = upcomingToday.filter(a => a.status === 'scheduled').length
  const followups = convStats?.sem_resposta ?? 0

  const whatsConnected = whatsapp?.status === 'connected'

  // Funil usando dados reais de conversas
  const total = (convStats?.active ?? 0) + (convStats?.resolved ?? 0)
  const funnelSteps = [
    { label: 'Novos contatos', value: hotLeads },
    { label: 'Em atendimento', value: convStats?.active ?? 0 },
    { label: 'Aguardando', value: convStats?.human_takeover ?? 0 },
    { label: 'Agendamentos', value: convStats?.agendou ?? 0 },
    { label: 'Resolvidos', value: convStats?.resolved ?? 0 },
  ]
  const conversionPct = total > 0 ? Math.round(((convStats?.agendou ?? 0) / total) * 100) : 0

  return (
    <V4Page
      eyebrow="Central de operação"
      title={`Bom dia, ${firstName}`}
      subtitle={`${today.charAt(0).toUpperCase() + today.slice(1)} · Estas são as prioridades do seu consultório hoje.`}
      actions={
        <>
          <Link href="/agenda"><V4Button>Bloquear horário</V4Button></Link>
          <Link href="/conversas"><V4Button variant="primary">Abrir caixa de entrada</V4Button></Link>
        </>
      }
    >
      {/* Command strip */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CommandCard icon={AlertTriangle} title="Precisam de você" copy="Intervenção humana recomendada" count={needsYou} alert href="/conversas" />
        <CommandCard icon={ArrowUpRight} title="Leads quentes" copy="Novos contatos esta semana" count={hotLeads} href="/clientes" />
        <CommandCard icon={CalendarCheck} title="Confirmações pendentes" copy="Consultas sem confirmação" count={pendingConfirm} href="/agenda" />
        <CommandCard icon={RefreshCw} title="Follow-ups hoje" copy="Contatos sem retorno" count={followups} href="/followup" />
      </section>

      {/* Main grid */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,0.8fr)]">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          {/* Funil */}
          <V4Card className="overflow-hidden">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-4">
              <div>
                <div className="text-[14px] font-semibold text-t1">Funil de atendimento</div>
                <div className="mt-0.5 text-[12px] text-t3">Últimos 30 dias</div>
              </div>
              <Link href="/conversas" className="text-[11px] font-semibold text-[var(--brand)]">Ver conversas</Link>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-5 gap-2">
                {funnelSteps.map(s => (
                  <div key={s.label} className="rounded-[10px] border border-[var(--border)] bg-[var(--raised)] p-3 text-center">
                    <div className="text-[20px] font-bold tracking-tight text-t1">{s.value}</div>
                    <div className="mt-1 text-[10px] text-t3 leading-tight">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-t3">Conversão total</span>
                <span className="text-[16px] font-bold text-[var(--brand)]">{conversionPct}%</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--raised)]">
                <div className="h-full rounded-full bg-[var(--brand)] transition-all" style={{ width: `${conversionPct}%` }} />
              </div>
            </div>
          </V4Card>

          {/* Atividade recente */}
          <V4Card className="overflow-hidden">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-4">
              <div>
                <div className="text-[14px] font-semibold text-t1">Atividade recente</div>
                <div className="mt-0.5 text-[12px] text-t3">Novos leads e consultas dos últimos 7 dias</div>
              </div>
              <Link href="/conversas" className="text-[11px] font-semibold text-[var(--brand)]">Ver todas</Link>
            </div>
            <div>
              {(activity ?? []).length === 0 ? (
                <div className="px-4 py-6 text-center text-[13px] text-t3">Nenhuma atividade recente.</div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--raised)]">
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-t3">Contato</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-t3">Evento</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-t3">Quando</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activity ?? []).slice(0, 5).map((item, idx) => {
                      const name = item.client_name || item.client_phone
                      const color = avatarColor(name)
                      return (
                        <tr key={idx} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--raised)]">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white"
                                style={{ background: color }}
                              >
                                {name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-[12px] font-semibold text-t1">{name}</div>
                                <div className="text-[10px] text-t3">{item.client_phone}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <V4Tag tone={item.type === 'new_lead' ? 'blue' : 'green'}>
                              {item.type === 'new_lead' ? 'Novo lead' : 'Consulta'}
                            </V4Tag>
                          </td>
                          <td className="px-4 py-3 text-right text-[11px] text-t3">
                            {formatDistanceToNow(new Date(item.occurred_at), { addSuffix: true, locale: ptBR })}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </V4Card>

          {/* Insights */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--raised)] p-3.5">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px] bg-[var(--brand-s)] text-[var(--brand)]">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
              </div>
              <div>
                <div className="text-[12px] font-semibold text-t1">Saúde do atendimento</div>
                <p className="mt-0.5 text-[11px] leading-[1.5] text-t3">
                  {(convStats?.ai_messages ?? 0).toLocaleString('pt-BR')} mensagens enviadas pela IA. {needsYou > 0 ? `${needsYou} conversa${needsYou > 1 ? 's' : ''} precisam da sua atenção.` : 'Tudo operando normalmente.'}
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--raised)] p-3.5">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px] bg-[var(--brand-s)] text-[var(--brand)]">
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} />
              </div>
              <div>
                <div className="text-[12px] font-semibold text-t1">Agenda da semana</div>
                <p className="mt-0.5 text-[11px] leading-[1.5] text-t3">
                  {metrics?.appointments_week ?? 0} consulta{(metrics?.appointments_week ?? 0) !== 1 ? 's' : ''} agendada{(metrics?.appointments_week ?? 0) !== 1 ? 's' : ''} nos últimos 7 dias.
                  {pendingConfirm > 0 ? ` ${pendingConfirm} aguardando confirmação.` : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Agenda de hoje */}
          <V4Card className="overflow-hidden">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-4">
              <div>
                <div className="text-[14px] font-semibold text-t1">Agenda de hoje</div>
                <div className="mt-0.5 text-[12px] text-t3">{upcomingToday.length} consulta{upcomingToday.length !== 1 ? 's' : ''}{upcomingToday.length > 0 ? ` · ${upcomingToday.filter(a => a.status === 'scheduled').length > 0 ? `${upcomingToday.filter(a => a.status === 'scheduled').length} pendente${upcomingToday.filter(a => a.status === 'scheduled').length > 1 ? 's' : ''}` : 'todas confirmadas'}` : ''}</div>
              </div>
              <Link href="/agenda" className="text-[11px] font-semibold text-[var(--brand)]">Abrir agenda</Link>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {upcomingToday.length === 0 ? (
                <div className="px-4 py-6 text-center text-[13px] text-t3">Nenhuma consulta hoje.</div>
              ) : (
                upcomingToday.map(appt => {
                  const status = APPT_STATUS[appt.status] ?? { label: appt.status, tone: 'default' as const }
                  const barColor = appt.status === 'confirmed' ? 'var(--brand)' : appt.status === 'scheduled' ? 'var(--info)' : 'var(--warning)'
                  return (
                    <div key={appt.id} className="grid grid-cols-[52px_4px_1fr_auto] items-center gap-3 px-4 py-3">
                      <div className="text-[12px] font-bold text-t1">{format(new Date(appt.scheduled_at), 'HH:mm')}</div>
                      <div className="h-8 w-[3px] rounded-full" style={{ background: barColor }} />
                      <div className="min-w-0">
                        <div className="truncate text-[12px] font-semibold text-t1">{appt.client_name}</div>
                        <div className="truncate text-[10px] text-t3">{appt.modality === 'online' ? 'Online' : appt.modality === 'in_person' ? 'Presencial' : 'Consulta'}</div>
                      </div>
                      <V4Tag tone={status.tone}>{status.label}</V4Tag>
                    </div>
                  )
                })
              )}
            </div>
          </V4Card>

          {/* Saúde da assistente */}
          <V4Card className="overflow-hidden">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-4">
              <div>
                <div className="text-[14px] font-semibold text-t1">Saúde da assistente</div>
                <div className="mt-0.5 text-[12px] text-t3">Operação em tempo real</div>
              </div>
              <V4Tag tone={whatsConnected ? 'green' : 'red'} dot>
                {whatsConnected ? 'Operando' : 'Offline'}
              </V4Tag>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {[
                ['WhatsApp', whatsConnected ? 'Conectado' : 'Desconectado', whatsConnected],
                ['Mensagens pela IA', (convStats?.ai_messages ?? 0).toLocaleString('pt-BR'), null],
                ['Sem intervenção', convStats != null ? `${Math.round(((convStats.active - convStats.human_takeover) / Math.max(convStats.active, 1)) * 100)}%` : '—', null],
                ['Transferências hoje', String(convStats?.human_takeover ?? 0), null],
                ['Para revisar', String(convStats?.human_takeover ?? 0), (convStats?.human_takeover ?? 0) > 0],
              ].map(([label, value, highlight]) => (
                <div key={String(label)} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[11px] text-t3">{label}</span>
                  <strong className={cn('text-[11px] font-semibold', highlight === true ? 'text-[var(--brand)]' : highlight === false ? 'text-[var(--warning)]' : 'text-t1')}>
                    {String(value)}
                  </strong>
                </div>
              ))}
            </div>
            <div className="p-4 pt-3">
              <Link href="/treinamento">
                <V4Button className="w-full"><Sparkles className="h-4 w-4" />Ver desempenho da assistente</V4Button>
              </Link>
            </div>
          </V4Card>
        </div>
      </section>
    </V4Page>
  )
}
