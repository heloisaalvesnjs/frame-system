'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarPlus, Clock, MessageSquare, Sparkles, UserPlus } from 'lucide-react'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { V4Avatar, V4Button, V4Card, V4CardPad, V4Metric, V4Page, V4SectionTitle, V4Tag } from '@/components/v4/V4Primitives'

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

export default function DashboardPage() {
  const { user } = useAuth()

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

  return (
    <V4Page
      eyebrow="Central de operação"
      title={`Bom dia, ${firstName}`}
      subtitle={`${today.charAt(0).toUpperCase() + today.slice(1)} · Estas são as prioridades do seu consultório hoje.`}
      actions={
        <>
          <Link href="/agenda"><V4Button><Clock className="h-4 w-4" />Bloquear horário</V4Button></Link>
          <Link href="/conversas"><V4Button variant="primary">Abrir caixa de entrada</V4Button></Link>
        </>
      }
    >
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <V4Metric label="Precisam de você" value={convStats?.human_takeover ?? 0} foot="Intervenção humana recomendada" tone={(convStats?.human_takeover ?? 0) > 0 ? 'warn' : 'default'} />
        <V4Metric label="Conversas ativas" value={metrics?.active_conversations ?? 0} foot="Com a IA no momento" tone="default" />
        <V4Metric label="Novos leads (7d)" value={metrics?.new_leads_week ?? 0} foot="Prontos para avançar" tone="good" />
        <V4Metric label="Consultas hoje" value={upcomingToday.length} foot="Confira a agenda do dia" tone="default" />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.8fr)]">
        <V4Card className="overflow-hidden">
          <div className="border-b border-[var(--border)] p-4">
            <V4SectionTitle title="Atividade recente" subtitle="Novos leads e consultas dos últimos 7 dias" action={<Link href="/conversas" className="text-[12px] font-medium text-[var(--brand)]">Ver conversas</Link>} />
          </div>
          <div className="divide-y divide-[var(--border)]">
            {(activity ?? []).length === 0 && (
              <div className="px-4 py-6 text-center text-[13px] text-t3">Nenhuma atividade recente.</div>
            )}
            {(activity ?? []).map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 px-4 py-3 text-[13px]">
                <V4Avatar name={item.client_name || item.client_phone} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-t1">{item.client_name || item.client_phone}</div>
                  <div className="truncate text-[11.5px] text-t3">
                    {item.type === 'new_lead'
                      ? 'Iniciou uma conversa'
                      : `Consulta ${item.status === 'completed' ? 'realizada' : 'agendada'}${item.scheduled_at ? ` para ${format(new Date(item.scheduled_at), "d 'de' MMM 'às' HH:mm", { locale: ptBR })}` : ''}`}
                  </div>
                </div>
                <div className="shrink-0 text-[11.5px] text-t3">
                  {formatDistanceToNow(new Date(item.occurred_at), { addSuffix: true, locale: ptBR })}
                </div>
              </div>
            ))}
          </div>
        </V4Card>

        <V4CardPad>
          <V4SectionTitle title="Agenda de hoje" subtitle={`${upcomingToday.length} consulta${upcomingToday.length !== 1 ? 's' : ''}`} action={<Link href="/agenda" className="text-[12px] font-medium text-[var(--brand)]">Abrir agenda</Link>} />
          <div className="space-y-2">
            {upcomingToday.length === 0 && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--raised)] p-3 text-center text-[12.5px] text-t3">
                Nenhuma consulta marcada para hoje.
              </div>
            )}
            {upcomingToday.map(appt => {
              const status = APPT_STATUS[appt.status] ?? { label: appt.status, tone: 'default' as const }
              return (
                <div key={appt.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--raised)] p-3">
                  <div className="w-12 text-[13px] font-medium text-t1">{format(new Date(appt.scheduled_at), 'HH:mm')}</div>
                  <div className="h-9 w-[3px] rounded-full bg-[var(--brand)]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-t1">{appt.client_name}</div>
                    <div className="truncate text-[11.5px] text-t3">{appt.duration_minutes ? `${appt.duration_minutes} min` : ''}</div>
                  </div>
                  <V4Tag tone={status.tone}>{status.label}</V4Tag>
                </div>
              )
            })}
          </div>
        </V4CardPad>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.9fr)]">
        <V4CardPad>
          <V4SectionTitle title="Saúde da assistente" subtitle="Operação em tempo real" action={
            <V4Tag tone={whatsapp?.status === 'connected' ? 'green' : 'red'} dot>
              {whatsapp?.status === 'connected' ? 'WhatsApp conectado' : 'WhatsApp desconectado'}
            </V4Tag>
          } />
          <div className="space-y-3 text-[13px]">
            {[
              ['Mensagens enviadas pela IA', (convStats?.ai_messages ?? 0).toLocaleString('pt-BR')],
              ['Conversas que precisam de você', String(convStats?.human_takeover ?? 0)],
              ['Conversas resolvidas', String(convStats?.resolved ?? 0)],
              ['Agendamentos via IA', String(convStats?.agendou ?? 0)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between border-b border-[var(--border)] pb-2 last:border-0">
                <span className="text-t3">{label}</span>
                <strong className="font-medium text-t1">{value}</strong>
              </div>
            ))}
          </div>
          <Link href="/treinamento"><V4Button className="mt-4 w-full"><Sparkles className="h-4 w-4" />Configurar assistente</V4Button></Link>
        </V4CardPad>

        <V4CardPad>
          <V4SectionTitle title="Conversão" subtitle="Da conversa ao agendamento" />
          <div className="space-y-3 text-[13px]">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <span className="text-t3">Taxa de conversão</span>
              <strong className="font-medium text-t1">{metrics?.conversion_rate != null ? `${metrics.conversion_rate}%` : '—'}</strong>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <span className="text-t3">Total de pacientes</span>
              <strong className="font-medium text-t1">{metrics?.total_clients ?? 0}</strong>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <span className="text-t3">Consultas nos últimos 7 dias</span>
              <strong className="font-medium text-t1">{metrics?.appointments_week ?? 0}</strong>
            </div>
            <div className="flex items-center justify-between pb-2 last:border-0">
              <span className="text-t3">Sem retorno</span>
              <strong className="font-medium text-t1">{convStats?.sem_resposta ?? 0}</strong>
            </div>
          </div>
        </V4CardPad>
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Link href="/conversas">
          <V4CardPad className="flex gap-3 transition hover:border-[var(--brand-ring)]">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--brand-s)] text-[var(--brand)]">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[13px] font-medium text-t1">Caixa de entrada</div>
              <p className="mt-1 text-[12px] leading-5 text-t3">Veja as conversas que precisam da sua atenção.</p>
            </div>
          </V4CardPad>
        </Link>
        <Link href="/agenda">
          <V4CardPad className="flex gap-3 transition hover:border-[var(--brand-ring)]">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--brand-s)] text-[var(--brand)]">
              <CalendarPlus className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[13px] font-medium text-t1">Agenda</div>
              <p className="mt-1 text-[12px] leading-5 text-t3">Confirme consultas, bloqueie horários e organize sua semana.</p>
            </div>
          </V4CardPad>
        </Link>
        <Link href="/clientes">
          <V4CardPad className="flex gap-3 transition hover:border-[var(--brand-ring)]">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--brand-s)] text-[var(--brand)]">
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[13px] font-medium text-t1">Pacientes</div>
              <p className="mt-1 text-[12px] leading-5 text-t3">Acompanhe novos contatos e o histórico de cada paciente.</p>
            </div>
          </V4CardPad>
        </Link>
      </section>
    </V4Page>
  )
}
