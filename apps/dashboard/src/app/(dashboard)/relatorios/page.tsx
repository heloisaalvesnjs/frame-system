'use client'

import { useQuery } from '@tanstack/react-query'
import { Download, Lightbulb, TrendingUp } from 'lucide-react'
import api from '@/lib/api'
import { V4Button, V4Card, V4CardPad, V4Metric, V4Page, V4Select, V4SectionTitle, V4Tag } from '@/components/v4/V4Primitives'

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

export default function RelatoriosPage() {
  const { data: metrics } = useQuery({
    queryKey: ['metrics-overview'],
    queryFn: async () => {
      const { data } = await api.get('/api/metrics/overview')
      return data.metrics as Metrics | null
    },
    staleTime: 60_000,
  })

  const conversion = metrics?.conversion_rate == null ? '—' : `${Math.round(metrics.conversion_rate)}%`

  return (
    <V4Page
      eyebrow="Inteligência comercial"
      title="Relatórios"
      subtitle="Entenda de onde vêm as oportunidades e o que aumenta sua conversão."
      actions={
        <>
          <V4Select>
            <option>Últimos 30 dias</option>
            <option>Últimos 7 dias</option>
            <option>Este mês</option>
          </V4Select>
          <V4Button>
            <Download className="h-3.5 w-3.5" />
            Exportar
          </V4Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <V4Metric label="Novos contatos" value={metrics?.new_leads_week ?? 0} foot="Esta semana" />
        <V4Metric label="Agendamentos" value={metrics?.appointments_week ?? 0} foot="Próximos 7 dias" tone="good" />
        <V4Metric label="Conversão" value={conversion} foot="Leads → agendamento" tone={metrics?.conversion_rate ? 'good' : 'default'} />
        <V4Metric label="Conversas abertas" value={metrics?.active_conversations ?? 0} foot="Podem virar consulta" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <V4CardPad>
          <V4SectionTitle title="Conversão por origem" subtitle="Volume de leads por canal" />
          <div className="flex h-[180px] items-end gap-6 border-b border-l border-[var(--border)] px-6 pb-4 pt-3">
            {origins.map(item => (
              <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-[130px] w-full items-end justify-center">
                  <div
                    className="w-10 rounded-t-md"
                    style={{ height: `${item.value}%`, background: 'var(--brand)' }}
                  />
                </div>
                <span className="text-[11px] text-t3">{item.label}</span>
              </div>
            ))}
          </div>
        </V4CardPad>

        <V4CardPad>
          <V4SectionTitle title="Agendamentos por semana" subtitle="Tendência operacional" />
          <div className="relative h-[180px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--raised)]">
            <svg viewBox="0 0 500 160" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
              <path d="M0 130 C70 120,90 100,150 105 S250 65,310 75 S410 20,500 28" fill="none" stroke="var(--brand)" strokeWidth="3.5" />
              <path d="M0 130 C70 120,90 100,150 105 S250 65,310 75 S410 20,500 28 L500 160 L0 160 Z" fill="var(--brand-s)" />
            </svg>
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[10px] text-t3">
              {['S1','S2','S3','S4','S5'].map(s => <span key={s}>{s}</span>)}
            </div>
          </div>
        </V4CardPad>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <V4CardPad>
          <V4SectionTitle title="Onde as oportunidades esfriam" />
          <div className="divide-y divide-[var(--border)]">
            {[
              ['Após envio do preço', '43%'],
              ['Antes de escolher horário', '24%'],
              ['Após primeira resposta', '18%'],
              ['Outros', '15%'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between py-3 text-[13px]">
                <span className="text-t2">{label}</span>
                <strong className="font-medium text-t1">{value}</strong>
              </div>
            ))}
          </div>
        </V4CardPad>

        <V4CardPad>
          <V4SectionTitle
            title="Recomendações do Frame"
            action={<V4Tag tone="green" dot>Ativo</V4Tag>}
          />
          <div className="space-y-2">
            {[
              'Teste uma mensagem de preço que inclua o que está incluso antes do valor.',
              'Crie uma automação de retomada 3 horas após o envio de horários.',
              'Indicações convertem melhor. Ative um pedido de indicação pós-consulta.',
            ].map(item => (
              <div key={item} className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--raised)] p-3">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" />
                <p className="text-[12.5px] leading-5 text-t2">{item}</p>
              </div>
            ))}
          </div>
        </V4CardPad>
      </div>

      <V4Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <TrendingUp className="h-4 w-4 text-[var(--brand)]" />
          <span className="text-[13px] font-medium text-t1">Resumo executivo</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <V4Tag tone="green" dot>Assistente respondendo</V4Tag>
            <V4Tag tone="blue">Agenda monitorada</V4Tag>
            <V4Tag tone="amber">Preço exige acompanhamento</V4Tag>
          </div>
        </div>
      </V4Card>
    </V4Page>
  )
}
