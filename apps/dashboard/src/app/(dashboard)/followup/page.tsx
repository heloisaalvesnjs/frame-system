'use client'

import { Calendar, Check, Clock, Mail, MessageSquare, Plus, RotateCcw, Zap } from 'lucide-react'
import { V4Button, V4Card, V4CardPad, V4Metric, V4Page, V4Tag } from '@/components/v4/V4Primitives'

const automations = [
  ['Recuperação de lead sem resposta', 'Retoma contatos que pararam antes do agendamento.', MessageSquare, 'Ativo', '4h após última mensagem'],
  ['Confirmação de consulta', 'Pede confirmação humana nas próximas 24h.', Check, 'Ativo', '24h antes'],
  ['Lembrete pré-consulta', 'Envia instruções antes do horário marcado.', Clock, 'Ativo', '2h antes'],
  ['Pós-consulta', 'Reforça próximos passos e coleta feedback.', Mail, 'Ativo', '2h depois'],
  ['Retorno programado', 'Reativa pacientes depois do ciclo combinado.', RotateCcw, 'Pausado', '30 dias'],
]

export default function AutomacoesPage() {
  return (
    <V4Page
      eyebrow="Operação automática"
      title="Automações"
      subtitle="Acompanhe mensagens automáticas, confirmações e retomadas sem perder o controle do atendimento."
      actions={<><V4Button>Ver logs</V4Button><V4Button variant="primary"><Plus className="h-4 w-4" />Nova automação</V4Button></>}
    >
      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <V4Metric label="Fluxos ativos" value="4" foot="1 pausado" tone="good" />
        <V4Metric label="Execuções hoje" value="18" foot="Mensagens programadas" />
        <V4Metric label="Conversão média" value="26%" foot="Baseado em agendamentos" tone="good" />
        <V4Metric label="Tempo economizado" value="5h" foot="Estimativa semanal" tone="good" />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <V4Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
            <div>
              <div className="text-[14px] font-medium text-t1">Todos os fluxos</div>
              <div className="text-[12px] text-t3">Automação, execução, conversão e status.</div>
            </div>
            <div className="flex gap-1.5">
              <V4Button className="h-8">Todos</V4Button>
              <V4Button className="h-8">Ativos</V4Button>
              <V4Button className="h-8">Pausados</V4Button>
            </div>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {automations.map(([title, desc, Icon, status, trigger]) => (
              <div key={title as string} className="grid grid-cols-[minmax(260px,1fr)_120px_120px_120px] items-center gap-4 px-4 py-3 text-[13px]">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand-s)] text-[var(--brand)]"><Icon className="h-4 w-4" /></div>
                  <div>
                    <div className="font-medium text-t1">{title as string}</div>
                    <div className="text-[11.5px] text-t3">{desc as string}</div>
                    <div className="mt-1"><V4Tag>{trigger as string}</V4Tag></div>
                  </div>
                </div>
                <span className="text-t2">—</span>
                <span className="text-t2">—</span>
                <V4Tag tone={status === 'Ativo' ? 'green' : 'default'} dot>{status as string}</V4Tag>
              </div>
            ))}
          </div>
        </V4Card>

        <aside className="space-y-4">
          <V4CardPad>
            <div className="text-[14px] font-medium text-t1">Sugestões inteligentes</div>
            <div className="mt-3 space-y-3">
              {[
                'Criar retomada 3 horas após envio de preço.',
                'Enviar lembrete para pacientes sem formulário.',
                'Pedir indicação após consulta realizada.',
              ].map(item => (
                <div key={item} className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--raised)] p-3">
                  <Zap className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" />
                  <p className="text-[12px] leading-5 text-t2">{item}</p>
                </div>
              ))}
            </div>
          </V4CardPad>
          <V4CardPad>
            <div className="text-[14px] font-medium text-t1">Programadas para hoje</div>
            <div className="mt-3 space-y-2 text-[12px] text-t2">
              <div className="flex justify-between"><span>Confirmações</span><strong>6</strong></div>
              <div className="flex justify-between"><span>Retomadas</span><strong>8</strong></div>
              <div className="flex justify-between"><span>Pós-consulta</span><strong>4</strong></div>
            </div>
            <V4Button className="mt-4 w-full"><Calendar className="h-4 w-4" />Ver agenda</V4Button>
          </V4CardPad>
        </aside>
      </section>
    </V4Page>
  )
}
