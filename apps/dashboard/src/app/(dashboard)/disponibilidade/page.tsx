'use client'

import { Clock, MapPin, Plus } from 'lucide-react'
import { V4Button, V4Card, V4CardPad, V4Page, V4Tag } from '@/components/v4/V4Primitives'

const week = [
  ['Segunda', '08:00-12:00', '14:00-18:00', true],
  ['Terça', '08:00-12:00', '14:00-18:00', true],
  ['Quarta', '08:00-12:00', '14:00-18:00', true],
  ['Quinta', '08:00-12:00', '15:00-19:00', true],
  ['Sexta', '08:00-13:00', 'Livre', true],
  ['Sábado', '09:00-12:00', 'Livre', true],
  ['Domingo', 'Sem atendimento', '', false],
]

export default function DisponibilidadePage() {
  return (
    <V4Page
      eyebrow="Agenda e atendimento"
      title="Disponibilidade"
      subtitle="Defina horários, locais, intervalos e dias em que a agenda não deve aceitar novos atendimentos."
      actions={<><V4Button>Adicionar exceção</V4Button><V4Button variant="primary"><Plus className="h-4 w-4" />Novo local</V4Button></>}
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <V4Card className="overflow-hidden">
          <div className="border-b border-[var(--border)] p-4">
            <div className="text-[14px] font-medium text-t1">Disponibilidade semanal</div>
            <div className="text-[12px] text-t3">Horários usados pela assistente ao oferecer agenda.</div>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {week.map(([day, first, second, active]) => (
              <div key={day as string} className="grid grid-cols-[150px_minmax(0,1fr)_110px] items-center gap-3 px-4 py-3">
                <div className="font-medium text-t1">{day as string}</div>
                <div className="flex flex-wrap gap-2">
                  <V4Tag tone={active ? 'green' : 'default'}><Clock className="h-3 w-3" />{first as string}</V4Tag>
                  {second && <V4Tag>{second as string}</V4Tag>}
                </div>
                <V4Tag tone={active ? 'green' : 'default'} dot>{active ? 'Ativo' : 'Pausado'}</V4Tag>
              </div>
            ))}
          </div>
        </V4Card>

        <aside className="space-y-4">
          <V4CardPad>
            <div className="text-[14px] font-medium text-t1">Regras</div>
            <div className="mt-3 space-y-2 text-[12px]">
              {[
                ['Duração padrão', '50 min'],
                ['Buffer entre consultas', '10 min'],
                ['Antecedência mínima', '12 h'],
                ['Limite por dia', '6 consultas'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-[var(--border)] pb-2 last:border-0">
                  <span className="text-t3">{label}</span>
                  <strong className="font-medium text-t1">{value}</strong>
                </div>
              ))}
            </div>
          </V4CardPad>
          <V4CardPad>
            <div className="text-[14px] font-medium text-t1">Exceções</div>
            <div className="mt-3 space-y-2">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--raised)] p-3">
                <div className="text-[13px] font-medium text-t1">24 de junho</div>
                <div className="text-[12px] text-t3">Bloqueio total · Congresso</div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--raised)] p-3">
                <div className="text-[13px] font-medium text-t1">01 de julho</div>
                <div className="text-[12px] text-t3">Atendimento apenas online</div>
              </div>
            </div>
          </V4CardPad>
        </aside>
      </div>

      <V4Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
          <div>
            <div className="text-[14px] font-medium text-t1">Locais de atendimento</div>
            <div className="text-[12px] text-t3">Endereços e modalidades disponíveis para agendamento.</div>
          </div>
          <V4Button>Adicionar</V4Button>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {[
            ['Atendimento online', 'Google Meet · link gerado automaticamente'],
            ['Clínica Jardins', 'Al. Santos, 1250 · Sala 42 · São Paulo'],
            ['Espaço Moema', 'Av. Pavão, 320 · Conj. 18 · São Paulo'],
          ].map(([name, desc]) => (
            <div key={name} className="flex items-center gap-3 px-4 py-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand-s)] text-[var(--brand)]"><MapPin className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-t1">{name}</div>
                <div className="text-[11.5px] text-t3">{desc}</div>
              </div>
              <V4Tag tone="green">Ativo</V4Tag>
            </div>
          ))}
        </div>
      </V4Card>
    </V4Page>
  )
}
