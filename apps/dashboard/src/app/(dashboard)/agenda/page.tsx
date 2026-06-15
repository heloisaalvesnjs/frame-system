'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarPlus } from 'lucide-react'
import api from '@/lib/api'
import { V4Button, V4CardPad, V4Page, V4Tag } from '@/components/v4/V4Primitives'

interface Appointment {
  id: string
  client_name: string | null
  client_phone: string
  scheduled_at: string
  duration_minutes: number
  status: string
  modality?: string
}

const days = [
  ['SEG', '8'],
  ['TER', '9'],
  ['QUA', '10'],
  ['QUI', '11'],
  ['SEX', '12'],
  ['SÁB', '13'],
  ['DOM', '14'],
]
const hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']
const events = [
  { day: 0, top: 52, label: 'Camila · 09:00', tone: 'green' },
  { day: 1, top: 208, label: 'Pedro · 12:00', tone: 'blue' },
  { day: 2, top: 104, label: 'Juliana · 10:00', tone: 'green' },
  { day: 3, top: 364, label: 'Amanda · 15:00', tone: 'amber' },
  { day: 4, top: 52, label: 'Maria · 09:00', tone: 'green' },
  { day: 4, top: 312, label: 'João · 14:00', tone: 'blue' },
  { day: 4, top: 442, label: 'Ana · 16:30', tone: 'amber' },
]

function eventColor(tone: string) {
  if (tone === 'blue') return 'border-[var(--info)] bg-[var(--info)]/10 text-[var(--info)]'
  if (tone === 'amber') return 'border-[var(--warning)] bg-[var(--warning)]/10 text-[var(--warning)]'
  return 'border-[var(--brand)] bg-[var(--brand-s)] text-[var(--brand)]'
}

export default function AgendaPage() {
  const { data } = useQuery({
    queryKey: ['appointments-week-v4'],
    queryFn: async () => {
      const { data } = await api.get('/api/appointments')
      return data.appointments as Appointment[]
    },
    staleTime: 30_000,
  })
  const appointments = data ?? []
  const activeAppointments = useMemo(() => appointments.filter(item => item.status !== 'cancelled'), [appointments])

  return (
    <V4Page
      eyebrow="Organização do consultório"
      title="Agenda"
      subtitle="Consultas, disponibilidade, confirmações e bloqueios em um único lugar."
      actions={
        <>
          <V4Button>Bloquear período</V4Button>
          <V4Button variant="primary"><CalendarPlus className="h-4 w-4" />Nova consulta</V4Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-3">
            <div className="flex gap-1.5">
              <V4Button className="h-8 px-3">‹</V4Button>
              <V4Button className="h-8 px-3">Hoje</V4Button>
              <V4Button className="h-8 px-3">›</V4Button>
            </div>
            <div className="text-[14px] font-medium text-t1">8-14 de junho de 2026</div>
            <div className="flex gap-1.5">
              <V4Button variant="primary" className="h-8 px-3">Semana</V4Button>
              <V4Button className="h-8 px-3">Dia</V4Button>
              <V4Button className="h-8 px-3">Lista</V4Button>
            </div>
          </div>

          <div className="overflow-auto">
            <div className="grid min-w-[860px] grid-cols-[70px_repeat(7,minmax(110px,1fr))] border-b border-[var(--border)]">
              <div />
              {days.map(([label, number], index) => (
                <div key={label} className={index === 4 ? 'bg-[var(--brand-s)] p-3 text-center' : 'p-3 text-center'}>
                  <div className="text-[10px] font-medium text-t3">{label}</div>
                  <div className="mt-1 text-[18px] font-medium text-t1">{number}</div>
                </div>
              ))}
            </div>
            <div className="relative grid min-w-[860px] grid-cols-[70px_repeat(7,minmax(110px,1fr))]">
              <div className="border-r border-[var(--border)]">
                {hours.map(hour => <div key={hour} className="h-16 border-b border-[var(--border)] px-2 py-1 text-[10px] text-t3">{hour}</div>)}
              </div>
              {days.map((_, dayIndex) => (
                <div key={dayIndex} className={dayIndex === 4 ? 'relative h-[704px] border-r border-[var(--border)] bg-[var(--brand-s)]/40 last:border-r-0' : 'relative h-[704px] border-r border-[var(--border)] last:border-r-0'}>
                  {hours.map(hour => <div key={hour} className="h-16 border-b border-[var(--border)]" />)}
                  {events.filter(event => event.day === dayIndex).map(event => (
                    <div key={event.label} className={`absolute left-2 right-2 h-[45px] rounded-lg border px-2 py-1.5 text-[11px] font-medium ${eventColor(event.tone)}`} style={{ top: event.top }}>
                      {event.label}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <V4CardPad>
            <div className="text-[11px] text-t3">Próxima consulta</div>
            <div className="mt-2 text-[36px] font-medium leading-none text-t1">14:00</div>
            <div className="mt-2 text-[13px] text-t2">João Costa · Primeira consulta presencial</div>
            <div className="mt-4 space-y-2 text-[12px]">
              <div className="flex justify-between"><span className="text-t3">Confirmação</span><V4Tag tone="blue">Agendada</V4Tag></div>
              <div className="flex justify-between"><span className="text-t3">Pagamento</span><V4Tag tone="amber">Pendente</V4Tag></div>
              <div className="flex justify-between"><span className="text-t3">Formulário</span><V4Tag tone="green">Recebido</V4Tag></div>
            </div>
            <V4Button variant="primary" className="mt-4 w-full">Abrir atendimento</V4Button>
          </V4CardPad>

          <V4CardPad>
            <div className="text-[14px] font-medium text-t1">Ações rápidas</div>
            <div className="mt-3 space-y-2 text-[12px]">
              {['Enviar confirmação para Ana', 'Compartilhar horário das 18h', 'Revisar lista de espera'].map((item, index) => (
                <div key={item} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--raised)] p-3">
                  <span className="text-t2">{item}</span>
                  <V4Button className="h-8 px-3">{index === 0 ? 'Enviar' : index === 1 ? 'Copiar link' : 'Abrir'}</V4Button>
                </div>
              ))}
            </div>
          </V4CardPad>

          <V4CardPad>
            <div className="text-[14px] font-medium text-t1">Capacidade da semana</div>
            <div className="mt-1 text-[12px] text-t3">{activeAppointments.length || 18} de 24 horários preenchidos</div>
            <div className="mt-3 h-2 rounded-full bg-[var(--raised)]">
              <div className="h-2 rounded-full bg-[var(--brand)]" style={{ width: '75%' }} />
            </div>
            <div className="mt-2 text-[11px] text-t3">75% de ocupação</div>
          </V4CardPad>
        </aside>
      </div>
    </V4Page>
  )
}
