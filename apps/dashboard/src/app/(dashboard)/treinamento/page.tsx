'use client'

import { useState } from 'react'
import { Bot } from 'lucide-react'
import { V4Button, V4Card, V4CardPad, V4Input, V4Page, V4Tag } from '@/components/v4/V4Primitives'

const tabs = ['Identidade', 'Serviços', 'Conhecimento', 'Limites e segurança', 'Fluxo comercial', 'Testar assistente', 'Desempenho']

export default function TreinamentoPage() {
  const [tab, setTab] = useState('Identidade')

  return (
    <V4Page
      eyebrow="Inteligência do consultório"
      title="Assistente"
      subtitle="Treine, teste e acompanhe sua recepção comercial com controle total."
      actions={<><V4Tag tone="green" dot>Ativa</V4Tag><V4Button variant="danger">Pausar assistente</V4Button></>}
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[240px_minmax(0,1fr)]">
        <V4Card className="h-max p-2">
          {tabs.map(item => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={tab === item ? 'mb-1 flex w-full rounded-[10px] bg-[var(--brand-s)] px-3 py-2 text-left text-[13px] font-medium text-[var(--brand)]' : 'mb-1 flex w-full rounded-[10px] px-3 py-2 text-left text-[13px] font-medium text-t2 hover:bg-[var(--raised)]'}
            >
              {item}
            </button>
          ))}
        </V4Card>

        <V4CardPad>
          {tab === 'Identidade' && (
            <div className="space-y-5">
              <div className="grid gap-4 rounded-xl border border-[var(--border)] bg-[var(--raised)] p-4 lg:grid-cols-[170px_minmax(0,1fr)]">
                <div className="grid h-[150px] w-[150px] place-items-center rounded-full border-[10px] border-[var(--brand-s)] text-[34px] font-medium text-[var(--brand)]">82%</div>
                <div>
                  <div className="text-[18px] font-medium text-t1">Assistente quase pronta</div>
                  <p className="mt-1 text-[13px] text-t3">Complete os itens abaixo para melhorar segurança e conversão.</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {['Identidade configurada', 'Serviços cadastrados', 'Horários conectados', 'Política de cancelamento', '3 respostas sem teste', 'Limites clínicos definidos'].map((item, index) => (
                      <div key={item} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[12px] text-t2">
                        <span className={index === 3 || index === 4 ? 'mr-2 text-[var(--warning)]' : 'mr-2 text-[var(--brand)]'}>{index === 3 || index === 4 ? '!' : '✓'}</span>{item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] text-t3">Nome da assistente</label>
                <V4Input className="w-full" defaultValue="Lia, assistente da Heloísa" />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] text-t3">Tom de voz</label>
                <div className="grid gap-3 md:grid-cols-3">
                  {['Profissional e acolhedora', 'Próxima e descontraída', 'Objetiva'].map((item, index) => (
                    <button key={item} className={index === 0 ? 'rounded-xl border border-[var(--brand-ring)] bg-[var(--brand-s)] p-4 text-left' : 'rounded-xl border border-[var(--border)] bg-[var(--raised)] p-4 text-left'}>
                      <strong className="text-[13px] font-medium text-t1">{item}</strong>
                      <p className="mt-1 text-[12px] leading-5 text-t3">Respostas simples, elegantes e com segurança clínica.</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] text-t3">Mensagem de apresentação</label>
                <textarea className="min-h-28 w-full rounded-xl border border-[var(--border)] bg-[var(--raised)] p-3 text-[13px] text-t1 outline-none" defaultValue="Olá! Sou a Lia, assistente da nutricionista Heloísa. Posso explicar como funciona o atendimento, tirar dúvidas e encontrar o melhor horário para você." />
              </div>
              <V4Button variant="primary">Salvar identidade</V4Button>
            </div>
          )}

          {tab === 'Serviços' && <Table title="Serviços disponíveis para a assistente" rows={[['Consulta inicial', '50 min', 'R$ 350', 'Online e presencial'], ['Acompanhamento trimestral', '3 encontros', 'R$ 690', 'Online'], ['Retorno', '40 min', 'Incluído', 'Online e presencial']]} />}
          {tab === 'Conhecimento' && <Knowledge />}
          {tab === 'Limites e segurança' && <List title="Limites e segurança" items={['Diagnóstico, sintomas ou condição clínica', 'Prescrição, suplemento ou medicamento', 'Reclamação sobre atendimento', 'Cancelamento e reembolso', 'Mensagem com urgência ou risco']} />}
          {tab === 'Fluxo comercial' && <Flow />}
          {tab === 'Testar assistente' && <Test />}
          {tab === 'Desempenho' && <Performance />}
        </V4CardPad>
      </div>
    </V4Page>
  )
}

function Table({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <div>
      <div className="mb-3 text-[15px] font-medium text-t1">{title}</div>
      <table className="w-full text-left text-[13px]">
        <tbody className="divide-y divide-[var(--border)]">
          {rows.map(row => <tr key={row[0]}>{row.map(cell => <td key={cell} className="py-3 text-t2">{cell}</td>)}<td><V4Tag tone="green">Ativo</V4Tag></td></tr>)}
        </tbody>
      </table>
    </div>
  )
}

function Knowledge() {
  return <div className="grid gap-3 md:grid-cols-2">{['FAQ do consultório', 'Política de cancelamento', 'Apresentação dos serviços', 'Sobre a profissional'].map((item, index) => <V4CardPad key={item}><div className="font-medium text-t1">{item}</div><p className="mt-1 text-[12px] leading-5 text-t3">Material usado pela assistente para responder com contexto correto.</p><div className="mt-3"><V4Tag tone={index === 1 ? 'amber' : 'green'}>{index === 1 ? 'Revisar' : 'Atualizado'}</V4Tag></div></V4CardPad>)}</div>
}

function List({ title, items }: { title: string; items: string[] }) {
  return <div><div className="text-[15px] font-medium text-t1">{title}</div><p className="mt-1 text-[13px] text-t3">Defina quando a assistente deve interromper e chamar você.</p><div className="mt-4 divide-y divide-[var(--border)]">{items.map(item => <div key={item} className="flex items-center justify-between py-3"><span className="text-[13px] text-t2">{item}</span><span className="h-5 w-9 rounded-full bg-[var(--brand)]"><span className="ml-[18px] mt-0.5 block h-4 w-4 rounded-full bg-white" /></span></div>)}</div></div>
}

function Flow() {
  return <div className="grid gap-3 md:grid-cols-5">{['Acolher', 'Qualificar', 'Apresentar', 'Agendar', 'Confirmar'].map((item, index) => <V4CardPad key={item} className="min-h-[220px]"><div className="text-[13px] font-medium text-t1">{index + 1}. {item}</div><p className="mt-4 text-[12px] leading-5 text-t3">Conduzir a conversa com segurança até a próxima ação.</p></V4CardPad>)}</div>
}

function Test() {
  return <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]"><div className="rounded-xl border border-[var(--border)] bg-[var(--raised)] p-4"><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 text-[13px] text-t1">Oi, queria saber o valor da consulta.</div><div className="ml-auto mt-3 max-w-[75%] rounded-2xl bg-[var(--brand)] p-3 text-[13px] text-[#0B2E1E]">Olá! A consulta inicial custa R$ 350 e dura cerca de 50 minutos. Você prefere atendimento online ou presencial?</div><div className="mt-4 flex gap-2"><V4Input className="flex-1" defaultValue="Atende quem tem diabetes?" /><V4Button variant="primary">Testar</V4Button></div></div><div className="space-y-3"><V4CardPad><Bot className="mb-2 h-4 w-4 text-[var(--brand)]" /><strong className="text-[13px] text-t1">Regra aplicada</strong><p className="mt-1 text-[12px] text-t3">Assunto clínico detectado. Encaminhar para avaliação profissional.</p></V4CardPad></div></div>
}

function Performance() {
  return <div className="grid gap-3 md:grid-cols-3"><V4CardPad><div className="text-t3">Conversas sem intervenção</div><div className="mt-2 text-3xl text-t1">81%</div></V4CardPad><V4CardPad><div className="text-t3">Agendamentos gerados</div><div className="mt-2 text-3xl text-t1">14</div></V4CardPad><V4CardPad><div className="text-t3">Respostas para revisar</div><div className="mt-2 text-3xl text-t1">2</div></V4CardPad></div>
}
