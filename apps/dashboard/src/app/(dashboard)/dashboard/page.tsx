'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { CalendarPlus, Clock, MessageSquare, Plus, Sparkles } from 'lucide-react'
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

const funnel = [
  ['42', 'Novos contatos'],
  ['27', 'Qualificados'],
  ['18', 'Propostas enviadas'],
  ['14', 'Agendamentos'],
  ['11', 'Comparecimentos'],
]

const opportunities = [
  ['Amanda Souza', 'Instagram · Emagrecimento', 'Alta intenção', 'Agendamento', 'há 18 min', '#8867a9'],
  ['Larissa Costa', 'Indicação · Esportiva', 'Preço enviado', 'Follow-up', 'há 2 h', '#b26d54'],
  ['Marina Rocha', 'Site · Consulta online', 'Precisa de você', 'Qualificação', 'há 4 h', '#427fa1'],
]

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

  const firstName = user?.name?.split(' ')[0] || 'Heloísa'
  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Sao_Paulo',
  })

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
        <V4Metric label="Precisam de você" value={metrics?.active_conversations ?? 0} foot="Intervenção humana recomendada" tone="warn" />
        <V4Metric label="Leads quentes" value={metrics?.new_leads_week ?? 0} foot="Prontos para avançar" tone="good" />
        <V4Metric label="Confirmações pendentes" value={metrics?.appointments_week ?? 0} foot="Consultas nas próximas 24h" tone="default" />
        <V4Metric label="Follow-ups de hoje" value={8} foot="Contatos que não responderam" tone="bad" />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.8fr)]">
        <V4CardPad>
          <V4SectionTitle title="Funil de oportunidades" subtitle="Da primeira conversa até o comparecimento" action={<Link href="/oportunidades" className="text-[12px] font-medium text-[var(--brand)]">Ver pipeline</Link>} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
            {funnel.map(([value, label]) => (
              <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--raised)] p-3">
                <div className="text-[22px] font-medium text-t1">{value}</div>
                <div className="mt-1 text-[11.5px] text-t3">{label}</div>
              </div>
            ))}
          </div>
        </V4CardPad>

        <V4CardPad>
          <V4SectionTitle title="Agenda de hoje" subtitle="3 consultas · 1 horário livre" action={<Link href="/agenda" className="text-[12px] font-medium text-[var(--brand)]">Abrir agenda</Link>} />
          <div className="space-y-2">
            {[
              ['09:00', 'Maria Oliveira', 'Retorno · Online', 'Confirmada', 'green'],
              ['14:00', 'João Costa', 'Primeira consulta · Presencial', 'Agendada', 'blue'],
              ['16:30', 'Ana Martins', 'Acompanhamento · Online', 'Pendente', 'amber'],
            ].map(([time, name, meta, status, tone]) => (
              <div key={time} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--raised)] p-3">
                <div className="w-12 text-[13px] font-medium text-t1">{time}</div>
                <div className="h-9 w-[3px] rounded-full bg-[var(--brand)]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-t1">{name}</div>
                  <div className="truncate text-[11.5px] text-t3">{meta}</div>
                </div>
                <V4Tag tone={tone as any}>{status}</V4Tag>
              </div>
            ))}
          </div>
        </V4CardPad>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.9fr)]">
        <V4Card className="overflow-hidden">
          <div className="border-b border-[var(--border)] p-4">
            <V4SectionTitle title="Oportunidades que exigem ação" subtitle="Ordenadas por urgência e intenção" />
          </div>
          <div className="divide-y divide-[var(--border)]">
            {opportunities.map(([name, meta, tag, stage, age, color]) => (
              <div key={name} className="grid grid-cols-[minmax(220px,1fr)_140px_140px_90px_150px] items-center gap-3 px-4 py-3 text-[13px]">
                <div className="flex items-center gap-3">
                  <V4Avatar name={name} color={color} />
                  <div>
                    <div className="font-medium text-t1">{name}</div>
                    <div className="text-[11.5px] text-t3">{meta}</div>
                  </div>
                </div>
                <V4Tag tone={tag === 'Alta intenção' ? 'green' : tag === 'Preço enviado' ? 'amber' : 'red'}>{tag}</V4Tag>
                <span className="text-t2">{stage}</span>
                <span className="text-t3">{age}</span>
                <V4Button variant="primary" className="h-8 px-3">Confirmar horário</V4Button>
              </div>
            ))}
          </div>
        </V4Card>

        <V4CardPad>
          <V4SectionTitle title="Saúde da assistente" subtitle="Operação em tempo real" action={<V4Tag tone="green" dot>Operando</V4Tag>} />
          <div className="space-y-3 text-[13px]">
            {[
              ['WhatsApp', 'Conectado'],
              ['Tempo médio de resposta', '7 segundos'],
              ['Conversas sem intervenção', '81%'],
              ['Transferências hoje', '3'],
              ['Respostas para revisar', '2'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between border-b border-[var(--border)] pb-2 last:border-0">
                <span className="text-t3">{label}</span>
                <strong className="font-medium text-t1">{value}</strong>
              </div>
            ))}
          </div>
          <Link href="/treinamento"><V4Button className="mt-4 w-full"><Sparkles className="h-4 w-4" />Ver desempenho da assistente</V4Button></Link>
        </V4CardPad>
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {[
          ['Maior abandono após preço', '6 pessoas pararam de responder depois do envio do valor. Revise a mensagem ou teste uma abordagem com mais contexto.', MessageSquare],
          ['Quinta-feira com capacidade livre', 'Há quatro horários disponíveis. Considere uma campanha de preenchimento para leads em avaliação.', CalendarPlus],
          ['Ação rápida', 'Crie uma retomada para oportunidades em agendamento pendente.', Plus],
        ].map(([title, desc, Icon]) => (
          <V4CardPad key={title as string} className="flex gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--brand-s)] text-[var(--brand)]">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[13px] font-medium text-t1">{title as string}</div>
              <p className="mt-1 text-[12px] leading-5 text-t3">{desc as string}</p>
            </div>
          </V4CardPad>
        ))}
      </section>
    </V4Page>
  )
}
