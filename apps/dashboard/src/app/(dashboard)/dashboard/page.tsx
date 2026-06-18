'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Card, SectionTitle, Btn, Avatar, Badge, KPI } from '@/components/ui/finance-primitives'
import {
  Sparkles, CheckCircle2, AlertCircle, Inbox, Calendar,
  ChevronRight, ArrowUpRight, Plus,
} from 'lucide-react'

interface Metrics {
  new_leads_week: number
  active_conversations: number
  appointments_week: number
  total_clients: number
  conversion_rate: number | null
}
interface ConvStats { open: number; waiting: number; resolved: number; no_return: number; ai_messages?: number }
interface Appointment { id: string; client_name: string; starts_at: string; duration_minutes?: number; modality?: string; status?: string }
interface ActivityItem { client_name?: string; description?: string; created_at: string }

const gradColors = ['blue', 'green', 'purple', 'orange', 'pink'] as const

export default function DashboardPage() {
  const { user } = useAuth()
  const today = format(new Date(), 'yyyy-MM-dd')

  const { data: metrics } = useQuery<Metrics>({
    queryKey: ['metrics-overview'],
    queryFn: async () => { const { data } = await api.get('/api/metrics/overview'); return data },
  })

  const { data: convStats } = useQuery<ConvStats>({
    queryKey: ['conversations-stats'],
    queryFn: async () => { const { data } = await api.get('/api/conversations/stats'); return data },
  })

  const { data: todayData } = useQuery<{ appointments: Appointment[] }>({
    queryKey: ['appointments-today', today],
    queryFn: async () => { const { data } = await api.get('/api/appointments', { params: { date: today } }); return data },
  })

  const { data: activity } = useQuery<{ activity: ActivityItem[] }>({
    queryKey: ['recent-activity'],
    queryFn: async () => { const { data } = await api.get('/api/metrics/recent-activity'); return data },
  })

  const { data: whatsapp } = useQuery<{ connected: boolean; last_message_at?: string }>({
    queryKey: ['whatsapp-status'],
    queryFn: async () => { const { data } = await api.get('/api/whatsapp/status'); return data },
  })

  const todayAppts = todayData?.appointments ?? []
  const recentActivity = activity?.activity ?? []
  const greetingHour = new Date().getHours()
  const greeting = greetingHour < 12 ? 'Bom dia' : greetingHour < 18 ? 'Boa tarde' : 'Boa noite'
  const firstName = (user as any)?.name?.split(' ')[0] || 'Nutricionista'
  const todayLabel = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })
  const todayLabelCap = todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)

  return (
    <div className="mx-auto max-w-[1240px] px-8 py-8">
      {/* Hero */}
      <div
        className="relative mb-8 overflow-hidden rounded-2xl"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--line-1)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div className="pointer-events-none absolute inset-0" style={{ background: 'var(--gradient-hero)' }} />
        <div className="relative flex flex-wrap items-start justify-between gap-8 p-8">
          <div className="max-w-xl">
            <div
              className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11.5px] font-medium"
              style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}
            >
              <Sparkles className="h-3 w-3" /> Frame AI · Resumo
            </div>
            <h2 className="mt-4 text-[26px] font-semibold leading-snug tracking-tight text-1">
              {greeting}, {firstName}.<br />
              <span className="text-2 text-[20px] font-normal">
                {todayLabelCap} · {todayAppts.length > 0 ? `${todayAppts.length} consulta${todayAppts.length !== 1 ? 's' : ''} hoje` : 'Sem consultas hoje'}
              </span>
            </h2>
            <div className="mt-5 flex items-center gap-2">
              <Link href="/conversas">
                <Btn variant="primary" size="sm">Ver caixa de entrada</Btn>
              </Link>
              <Link href="/treinamento">
                <Btn variant="ghost" size="sm">
                  Como a IA está respondendo? <ArrowUpRight className="h-3 w-3" />
                </Btn>
              </Link>
            </div>
          </div>

          {/* Assistant status */}
          <div
            className="min-w-[260px] rounded-xl p-5"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--line-1)' }}
          >
            <div
              className="flex items-center gap-2 text-[11.5px] font-medium uppercase tracking-wider text-3"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: 'var(--brand)', boxShadow: '0 0 6px var(--brand)' }}
              />
              {whatsapp?.connected ? 'Assistente ativa' : 'WhatsApp desconectado'}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div
                className="grid h-10 w-10 place-items-center rounded-xl"
                style={{ background: 'var(--gradient-brand)' }}
              >
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-[14px] font-semibold text-1">Assistente Frame</div>
                <div className="text-[11.5px] text-3">IA · Acolhedora</div>
              </div>
            </div>
            <div
              className="mt-4 grid grid-cols-2 gap-3 border-t pt-4"
              style={{ borderColor: 'var(--line-1)' }}
            >
              <div>
                <div className="text-[10.5px] uppercase tracking-wider text-3">Conversas abertas</div>
                <div className="tabular-nums text-[15px] font-semibold text-1">
                  {convStats?.open ?? '—'}
                </div>
              </div>
              <div>
                <div className="text-[10.5px] uppercase tracking-wider text-3">Mensagens IA (7d)</div>
                <div className="tabular-nums text-[15px] font-semibold text-1">
                  {convStats?.ai_messages ?? '—'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div
        className="mb-10 grid grid-cols-2 overflow-hidden rounded-2xl lg:grid-cols-4"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line-1)', boxShadow: 'var(--shadow-sm)' }}
      >
        {[
          { label: 'Novos leads (semana)', value: String(metrics?.new_leads_week ?? '—'), hint: 'WhatsApp' },
          { label: 'Conversas abertas',    value: String(convStats?.open ?? '—'),          hint: `${convStats?.waiting ?? 0} aguardando você` },
          { label: 'Consultas hoje',       value: String(todayAppts.length),               hint: todayAppts.length ? 'Confirmadas' : 'Agenda livre' },
          { label: 'Clientes ativos',      value: String(metrics?.total_clients ?? '—'),   hint: 'total cadastrado' },
        ].map((s, i) => (
          <div key={s.label} className="p-6" style={{ borderLeft: i > 0 ? '1px solid var(--line-1)' : 'none' }}>
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-3">{s.label}</div>
            <div className="mt-2 tabular-nums text-[24px] font-semibold tracking-tight text-1">{s.value}</div>
            {s.hint && <div className="mt-0.5 text-[11.5px] text-3">{s.hint}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Agenda hoje */}
        <Card className="lg:col-span-2">
          <SectionTitle
            title="Agenda de hoje"
            hint={`${todayAppts.length} compromisso${todayAppts.length !== 1 ? 's' : ''}`}
            action={
              <Link href="/agenda">
                <Btn variant="ghost" size="sm">Ver agenda <ChevronRight className="h-3 w-3" /></Btn>
              </Link>
            }
          />
          {todayAppts.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-3">Sem consultas hoje</div>
          ) : (
            <div className="space-y-1">
              {todayAppts.slice(0, 6).map((appt, i) => {
                const t = format(new Date(appt.starts_at), 'HH:mm')
                return (
                  <div
                    key={appt.id}
                    className="flex cursor-pointer items-center gap-4 rounded-xl px-3 py-3 transition hover:bg-[var(--bg-surface)]"
                  >
                    <div className="w-14 text-[12px] font-mono tabular-nums font-semibold text-2">{t}</div>
                    <div className="h-8 w-px bg-[var(--line-1)]" />
                    <Avatar name={appt.client_name} color={gradColors[i % gradColors.length]} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-medium text-1">{appt.client_name}</div>
                      <div className="text-[11.5px] text-3">
                        {appt.duration_minutes ? `${appt.duration_minutes} min` : '50 min'} ·{' '}
                        {appt.modality === 'online' ? 'Online' : 'Presencial'}
                      </div>
                    </div>
                    <Btn variant="ghost" size="sm">Abrir</Btn>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Prioridades */}
        <Card>
          <SectionTitle title="Prioridades" hint="Precisam de você" />
          <div className="space-y-3">
            {[
              convStats?.waiting
                ? { icon: AlertCircle, text: `${convStats.waiting} paciente${convStats.waiting !== 1 ? 's' : ''} aguardando resposta`, v: 'warning' as const }
                : null,
              convStats?.open
                ? { icon: Inbox, text: `${convStats.open} conversa${convStats.open !== 1 ? 's' : ''} abertas`, v: 'info' as const }
                : null,
              todayAppts.length > 0
                ? { icon: CheckCircle2, text: `${todayAppts.length} consulta${todayAppts.length !== 1 ? 's' : ''} hoje`, v: 'success' as const }
                : null,
              !whatsapp?.connected
                ? { icon: AlertCircle, text: 'WhatsApp desconectado', v: 'danger' as const }
                : null,
            ].filter(Boolean).slice(0, 3).map((p, i) => {
              if (!p) return null
              const Icon = p.icon
              return (
                <div
                  key={i}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition hover:border-[var(--line-2)]"
                  style={{ borderColor: 'var(--line-1)' }}
                >
                  <div
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                    style={{ background: 'var(--bg-surface)' }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: 'var(--brand)' }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-medium text-1">{p.text}</div>
                    <div className="mt-1 text-[11px]">
                      <Badge variant={p.v}>Ação sugerida</Badge>
                    </div>
                  </div>
                </div>
              )
            })}
            {recentActivity.length === 0 && convStats?.open === 0 && (
              <div className="py-6 text-center text-[13px] text-3">Tudo em dia 🎉</div>
            )}
          </div>
        </Card>
      </div>

      {/* Shortcuts */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { href: '/conversas',   label: 'Caixa de entrada', desc: `${convStats?.open ?? 0} abertas`,                         icon: Inbox },
          { href: '/agenda',      label: 'Agenda',            desc: `${todayAppts.length} consultas hoje`,                     icon: Calendar },
          { href: '/treinamento', label: 'Assistente',        desc: 'Configurar assistente',                                   icon: Sparkles },
          { href: '/followup',    label: 'Automações',        desc: 'Fluxos automáticos',                                     icon: CheckCircle2 },
        ].map((s) => {
          const Icon = s.icon
          return (
            <Link
              key={s.href}
              href={s.href}
              className="group flex items-center gap-3 rounded-xl border p-4 transition-all hover:border-[var(--brand-ring)] hover:shadow-md"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--line-1)' }}
            >
              <div
                className="grid h-9 w-9 place-items-center rounded-lg"
                style={{ background: 'var(--bg-surface)', color: 'var(--brand)' }}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-1">{s.label}</div>
                <div className="truncate text-[11.5px] text-3">{s.desc}</div>
              </div>
              <ChevronRight
                className="h-4 w-4 transition group-hover:translate-x-0.5"
                style={{ color: 'var(--text-3)' }}
              />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
