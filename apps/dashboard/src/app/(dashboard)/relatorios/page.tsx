'use client'

import { useQuery } from '@tanstack/react-query'
import { Download, Lightbulb, TrendingUp } from 'lucide-react'
import api from '@/lib/api'
import { Badge, Btn, Card, KPI, SectionTitle } from '@/components/ui/finance-primitives'

interface Metrics {
  new_leads_week: number
  appointments_week: number
  active_conversations: number
  completed_this_month: number
  conversion_rate: number | null
}

const origins = [
  { label: 'Indicação', value: 88 },
  { label: 'Instagram', value: 64 },
  { label: 'Site', value: 51 },
  { label: 'Outros', value: 33 },
]

const weekly = [22, 31, 42, 39, 58, 67, 64, 82, 96, 102]

export default function RelatoriosPage() {
  const { data: metrics } = useQuery({
    queryKey: ['metrics-overview'],
    queryFn: async () => {
      const { data } = await api.get('/api/metrics/overview')
      return data.metrics as Metrics | null
    },
    staleTime: 60_000,
  })

  const conversion = metrics?.conversion_rate == null ? '--' : `${Math.round(metrics.conversion_rate)}%`

  return (
    <main className="px-6 py-6">
      <div className="mx-auto max-w-[1400px] space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-t3">Inteligência comercial</div>
            <h1 className="text-[22px] font-semibold tracking-tight text-t1">Relatórios</h1>
            <p className="mt-0.5 text-sm text-t3">Entenda de onde vêm as oportunidades e o que aumenta sua conversão.</p>
          </div>
          <div className="flex items-center gap-2">
            <select className="h-9 rounded-lg border border-[var(--line-2)] bg-[var(--raised)] px-3 text-[13px] text-t1 outline-none">
              <option>Últimos 30 dias</option>
              <option>Últimos 7 dias</option>
              <option>Este mês</option>
            </select>
            <Btn variant="secondary" size="sm">
              <Download className="h-3.5 w-3.5" />
              Exportar relatório
            </Btn>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPI label="Novos contatos" value={String(metrics?.new_leads_week ?? 0)} hint="Leads recebidos nesta semana" />
          <KPI label="Agendamentos" value={String(metrics?.appointments_week ?? 0)} hint="Consultas nos próximos 7 dias" />
          <KPI label="Conversão" value={conversion} hint="Leads que viraram agendamento" />
          <KPI label="Conversas abertas" value={String(metrics?.active_conversations ?? 0)} hint="Ainda podem virar consulta" />
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <SectionTitle title="Conversão por origem" hint="Leitura visual no padrão V4" />
            <div className="flex h-[220px] items-end gap-8 border-b border-l border-[var(--line-1)] px-8 pb-6 pt-4">
              {origins.map(item => (
                <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-[150px] w-full items-end justify-center">
                    <div className="w-10 rounded-t-md bg-[var(--brand)]" style={{ height: `${item.value}%` }} />
                  </div>
                  <span className="text-[11px] text-t3">{item.label}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle title="Agendamentos por semana" hint="Tendência operacional" />
            <div className="relative h-[220px] overflow-hidden rounded-xl border border-[var(--line-1)] bg-[var(--raised)]">
              <svg viewBox="0 0 500 170" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                <path d="M0 140 C70 130,90 110,150 115 S250 70,310 82 S410 25,500 35" fill="none" stroke="var(--brand)" strokeWidth="4" />
                <path d="M0 140 C70 130,90 110,150 115 S250 70,310 82 S410 25,500 35 L500 170 L0 170 Z" fill="var(--brand-s)" />
              </svg>
              <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between text-[10px] text-t3">
                {weekly.slice(0, 5).map((_, index) => <span key={index}>S{index + 1}</span>)}
              </div>
            </div>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <SectionTitle title="Onde as oportunidades esfriam" />
            <div className="divide-y divide-[var(--line-1)]">
              {[
                ['Após envio do preço', '43%'],
                ['Antes de escolher horário', '24%'],
                ['Após primeira resposta', '18%'],
                ['Outros', '15%'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between py-3 text-[13px]">
                  <span className="text-t2">{label}</span>
                  <strong className="font-semibold text-t1">{value}</strong>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle title="Recomendações do Frame" action={<Badge variant="success" dot>Ativo</Badge>} />
            <div className="space-y-2">
              {[
                'Teste uma mensagem de preço que inclua o que está incluso antes do valor.',
                'Crie uma automação de retomada 3 horas após o envio de horários.',
                'Indicações convertem melhor. Ative um pedido de indicação pós-consulta.',
              ].map(item => (
                <div key={item} className="flex gap-3 rounded-xl border border-[var(--line-1)] bg-[var(--raised)] p-3">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" />
                  <p className="text-[12.5px] leading-5 text-t2">{item}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <Card>
          <SectionTitle title="Resumo executivo" hint="Leitura rápida para tomada de decisão" />
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="success" dot>Assistente respondendo</Badge>
            <Badge variant="info">Agenda monitorada</Badge>
            <Badge variant="warning">Preço exige acompanhamento</Badge>
            <div className="ml-auto flex items-center gap-2 text-[12px] text-t3">
              <TrendingUp className="h-3.5 w-3.5 text-[var(--brand)]" />
              Dados conectados ao painel real quando disponíveis.
            </div>
          </div>
        </Card>
      </div>
    </main>
  )
}
