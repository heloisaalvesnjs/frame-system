'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, CheckCircle, XCircle,
  CheckCheck, Clock, Plus, ExternalLink, Unlink, CalendarDays, Video, MapPin
} from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, addMonths, subMonths, isToday,
  parseISO, getYear, startOfWeek, endOfWeek, eachHourOfInterval,
  addDays, isBefore, isAfter
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

interface Appointment {
  id: string
  client_name: string
  client_phone: string
  scheduled_at: string
  duration_minutes: number
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed'
  modality?: 'online' | 'presencial'
  notes?: string
}

// ── Status config ─────────────────────────────────────────────────
const STATUS: Record<string, { label: string; dot: string; badge: string; event: string; text: string }> = {
  scheduled: {
    label: 'Agendado',
    dot:   'bg-blue-500',
    badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    event: 'bg-blue-500/15 border-l-[3px] border-blue-500 text-blue-600',
    text:  'text-blue-500',
  },
  confirmed: {
    label: 'Confirmado',
    dot:   'bg-emerald-500',
    badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    event: 'bg-emerald-500/15 border-l-[3px] border-emerald-500 text-emerald-600',
    text:  'text-emerald-500',
  },
  cancelled: {
    label: 'Cancelado',
    dot:   'bg-red-400',
    badge: 'bg-red-500/10 text-red-400 border-red-500/20',
    event: 'bg-red-500/10 border-l-[3px] border-red-400 text-red-400 opacity-60',
    text:  'text-red-400',
  },
  completed: {
    label: 'Realizado',
    dot:   'bg-t3',
    badge: 'bg-t3/10 text-t3 border-t3/20',
    event: 'bg-t3/10 border-l-[3px] border-t3 text-t3 opacity-70',
    text:  'text-t3',
  },
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 07:00 – 20:00

// ── Mini Calendar ─────────────────────────────────────────────────
function MiniCalendar({
  currentMonth, selectedDate, appointments, holidays,
  onSelectDate, onPrevMonth, onNextMonth,
}: {
  currentMonth: Date
  selectedDate: Date
  appointments: Appointment[]
  holidays: Map<string, string>
  onSelectDate: (d: Date) => void
  onPrevMonth: () => void
  onNextMonth: () => void
}) {
  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const leading = Array.from({ length: (startOfMonth(currentMonth).getDay() + 6) % 7 })

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-semibold text-t1 capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </p>
        <div className="flex gap-0.5">
          <button onClick={onPrevMonth} className="p-1 rounded-md hover:bg-raised text-t3 hover:text-t1 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button onClick={onNextMonth} className="p-1 rounded-md hover:bg-raised text-t3 hover:text-t1 transition-colors">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {['S','T','Q','Q','S','S','D'].map((d, i) => (
          <div key={i} className="text-center font-mono text-[9px] text-t3 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {leading.map((_, i) => <div key={`b-${i}`} />)}
        {days.map((day) => {
          const key      = format(day, 'yyyy-MM-dd')
          const hasAppts = appointments.some(a => isSameDay(parseISO(a.scheduled_at), day))
          const isHoliday = holidays.has(key)
          const isSel    = isSameDay(day, selectedDate)
          const isNow    = isToday(day)

          return (
            <button
              key={key}
              onClick={() => onSelectDate(day)}
              className={cn(
                'relative flex items-center justify-center h-7 w-7 mx-auto rounded-full text-[12px] font-medium transition-all',
                isSel  ? 'bg-brand-500 text-white shadow-sm' :
                isNow  ? 'text-brand-500 font-bold' :
                isHoliday ? 'text-amber-500' :
                !isSameMonth(day, currentMonth) ? 'text-t3/40' :
                'text-t2 hover:bg-raised'
              )}
            >
              {format(day, 'd')}
              {hasAppts && !isSel && (
                <span className={cn(
                  'absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full',
                  isNow ? 'bg-brand-500' : 'bg-brand-500/60'
                )} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Appointment pill in day view ──────────────────────────────────
function EventPill({ appt, onAction }: { appt: Appointment; onAction: (id: string, status: string) => void }) {
  const cfg  = STATUS[appt.status]
  const time = format(parseISO(appt.scheduled_at), 'HH:mm')

  return (
    <div className={cn(
      'rounded-r-lg px-2.5 py-1.5 text-left w-full mb-1 transition-all group',
      cfg.event
    )}>
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold truncate leading-tight">{appt.client_name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-mono opacity-80">{time}</span>
            {appt.modality === 'presencial'
              ? <MapPin className="w-2.5 h-2.5 opacity-60" />
              : <Video className="w-2.5 h-2.5 opacity-60" />
            }
            <span className="text-[10px] opacity-70">{appt.duration_minutes ?? 50}min</span>
          </div>
        </div>
        {appt.status === 'scheduled' && (
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              onClick={() => onAction(appt.id, 'confirmed')}
              className="p-0.5 rounded text-emerald-500 hover:bg-emerald-500/15 transition-colors"
              title="Confirmar"
            >
              <CheckCircle className="w-3 h-3" />
            </button>
            <button
              onClick={() => onAction(appt.id, 'cancelled')}
              className="p-0.5 rounded text-red-400 hover:bg-red-500/15 transition-colors"
              title="Cancelar"
            >
              <XCircle className="w-3 h-3" />
            </button>
          </div>
        )}
        {appt.status === 'confirmed' && (
          <button
            onClick={() => onAction(appt.id, 'completed')}
            className="p-0.5 rounded text-t3 hover:text-emerald-500 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
            title="Marcar realizado"
          >
            <CheckCheck className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Google Calendar connect card ──────────────────────────────────
function GoogleCalendarCard() {
  const qc = useQueryClient()
  const { data: gcalStatus, isLoading } = useQuery<{ connected: boolean; calendar_id: string }>({
    queryKey: ['gcal-status'],
    queryFn: async () => { const { data } = await api.get('/api/google-calendar/status'); return data },
  })

  async function connect() {
    const { data } = await api.get('/api/google-calendar/auth-url')
    window.location.href = data.url
  }

  async function disconnect() {
    await api.delete('/api/google-calendar/disconnect')
    qc.invalidateQueries({ queryKey: ['gcal-status'] })
    toast.success('Google Agenda desconectado.')
  }

  if (isLoading) return null

  return (
    <div className="rounded-xl p-3 space-y-2" style={{ border: '1px solid var(--border)', background: 'var(--raised)' }}>
      <div className="flex items-center gap-2">
        {/* Google logo SVG */}
        <svg width="16" height="16" viewBox="0 0 48 48" className="flex-shrink-0">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.2 30.2 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.8 6C12.3 13 17.7 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.6 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.5-4.1 7.1-10.2 7.1-17.1z"/>
          <path fill="#FBBC05" d="M10.4 28.8c-.6-1.7-.9-3.5-.9-5.3s.3-3.6.9-5.3L2.6 12C.9 15.4 0 19.1 0 23.5s.9 8.1 2.6 11.5l7.8-6.2z"/>
          <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.6-5.9c-2 1.4-4.6 2.2-7.6 2.2-6.3 0-11.7-4.2-13.6-10l-7.8 6C6.6 42.6 14.6 48 24 48z"/>
        </svg>
        <p className="text-[12px] font-semibold text-t1">Google Agenda</p>
        {gcalStatus?.connected && (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-mono text-emerald-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Conectado
          </span>
        )}
      </div>

      {gcalStatus?.connected ? (
        <div className="space-y-1.5">
          <p className="text-[11px] text-t3 leading-relaxed">
            Consultas agendadas pela IA aparecem automaticamente na sua agenda.
          </p>
          <button
            onClick={disconnect}
            className="flex items-center gap-1.5 text-[11px] text-t3 hover:text-red-400 transition-colors"
          >
            <Unlink className="w-3 h-3" />
            Desconectar
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] text-t3 leading-relaxed">
            Conecte para sincronizar agendamentos automaticamente.
          </p>
          <button
            onClick={connect}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium text-t1 hover:bg-raised transition-colors"
            style={{ border: '1px solid var(--border)' }}
          >
            <ExternalLink className="w-3.5 h-3.5 text-t3" />
            Conectar Google Agenda
          </button>
        </div>
      )}
    </div>
  )
}

// ── Day column view ───────────────────────────────────────────────
function DayView({ date, appointments, onAction }: {
  date: Date
  appointments: Appointment[]
  onAction: (id: string, status: string) => void
}) {
  const dayAppts = appointments
    .filter(a => isSameDay(parseISO(a.scheduled_at), date))
    .sort((a, b) => parseISO(a.scheduled_at).getTime() - parseISO(b.scheduled_at).getTime())

  const apptByHour: Record<number, Appointment[]> = {}
  dayAppts.forEach(a => {
    const h = parseISO(a.scheduled_at).getHours()
    if (!apptByHour[h]) apptByHour[h] = []
    apptByHour[h].push(a)
  })

  return (
    <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
      {/* Date header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="text-center">
          <p className="text-[11px] font-mono text-t3 uppercase tracking-wider">
            {format(date, 'EEE', { locale: ptBR })}
          </p>
          <div className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center text-[18px] font-bold mx-auto mt-0.5',
            isToday(date) ? 'bg-brand-500 text-white' : 'text-t1'
          )}>
            {format(date, 'd')}
          </div>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-t1 capitalize">
            {format(date, "d 'de' MMMM", { locale: ptBR })}
          </p>
          {dayAppts.length > 0 && (
            <p className="text-[11px] text-t3 mt-0.5">
              {dayAppts.filter(a => a.status !== 'cancelled').length} consulta{dayAppts.filter(a => a.status !== 'cancelled').length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Time grid */}
      <div className="relative">
        {HOURS.map(hour => (
          <div key={hour} className="flex" style={{ minHeight: '56px', borderBottom: '1px solid var(--border)' }}>
            <div className="w-14 flex-shrink-0 pt-1 pr-3 text-right">
              <span className="text-[10px] font-mono text-t3">{String(hour).padStart(2, '0')}:00</span>
            </div>
            <div className="flex-1 py-1 pr-2 space-y-0.5">
              {(apptByHour[hour] || []).map(appt => (
                <EventPill key={appt.id} appt={appt} onAction={onAction} />
              ))}
            </div>
          </div>
        ))}

        {dayAppts.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center py-16 text-center pointer-events-none">
            <CalendarDays className="w-8 h-8 text-t3/30 mb-2" />
            <p className="text-sm text-t3">Sem consultas</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
export default function AgendaPage() {
  const searchParams = useSearchParams()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const qc = useQueryClient()

  // Feedback da conexão Google
  useEffect(() => {
    if (searchParams.get('google_connected') === 'true') {
      toast.success('Google Agenda conectado com sucesso!')
      qc.invalidateQueries({ queryKey: ['gcal-status'] })
      window.history.replaceState({}, '', '/agenda')
    }
    if (searchParams.get('google_error') === 'true') {
      toast.error('Erro ao conectar Google Agenda. Tente novamente.')
      window.history.replaceState({}, '', '/agenda')
    }
  }, [searchParams, qc])

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ['appointments'],
    queryFn: async () => { const { data } = await api.get('/api/appointments'); return data.appointments },
    refetchInterval: 30_000,
  })

  const { data: holidaysRaw = [] } = useQuery<{ date: string; name: string }[]>({
    queryKey: ['holidays', getYear(currentMonth)],
    queryFn: async () => { const { data } = await api.get(`/api/appointments/holidays?year=${getYear(currentMonth)}`); return data.holidays },
    staleTime: 86_400_000,
  })
  const holidayMap = new Map(holidaysRaw.map(h => [h.date, h.name]))

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/appointments/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      toast.success('Status atualizado!')
    },
  })

  const scheduledCount = appointments.filter(a => a.status === 'scheduled').length
  const confirmedCount = appointments.filter(a => a.status === 'confirmed').length

  const upcoming = appointments
    .filter(a => ['scheduled', 'confirmed'].includes(a.status) && isAfter(parseISO(a.scheduled_at), new Date()))
    .sort((a, b) => parseISO(a.scheduled_at).getTime() - parseISO(b.scheduled_at).getTime())
    .slice(0, 6)

  const holiday = holidayMap.get(format(selectedDate, 'yyyy-MM-dd'))

  return (
    <div className="h-[calc(100vh-60px)] flex flex-col overflow-hidden">

      {/* ── Top bar ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <h1 className="font-display font-bold text-[20px] tracking-tight text-t1">Agenda</h1>
          <div className="flex items-center gap-1.5">
            {scheduledCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                {scheduledCount}
              </span>
            )}
            {confirmedCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {confirmedCount}
              </span>
            )}
          </div>
        </div>
        {/* Navega dias no topbar */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => { const d = new Date(); setSelectedDate(d); setCurrentMonth(d) }}
            className="px-3 py-1.5 text-[12px] font-medium rounded-lg text-t2 hover:bg-raised transition-colors"
            style={{ border: '1px solid var(--border)' }}
          >
            Hoje
          </button>
          <button onClick={() => setSelectedDate(d => addDays(d, -1))} className="p-1.5 rounded-lg text-t3 hover:text-t1 hover:bg-raised transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setSelectedDate(d => addDays(d, 1))} className="p-1.5 rounded-lg text-t3 hover:text-t1 hover:bg-raised transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Main layout ────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left sidebar ──────────────────────────────── */}
        <div className="w-[220px] flex-shrink-0 flex flex-col gap-4 p-4 overflow-y-auto" style={{ borderRight: '1px solid var(--border)' }}>

          {/* Mini calendar */}
          <MiniCalendar
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            appointments={appointments}
            holidays={holidayMap}
            onSelectDate={(d) => { setSelectedDate(d); setCurrentMonth(d) }}
            onPrevMonth={() => setCurrentMonth(m => subMonths(m, 1))}
            onNextMonth={() => setCurrentMonth(m => addMonths(m, 1))}
          />

          {/* Feriado */}
          {holiday && (
            <div className="px-2.5 py-2 rounded-lg text-[11px] text-amber-500 bg-amber-500/10 border border-amber-500/20">
              🇧🇷 {holiday}
            </div>
          )}

          {/* Legenda status */}
          <div className="space-y-1.5">
            <p className="font-mono text-[9px] text-t3 tracking-wider">STATUS</p>
            {Object.entries(STATUS).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-2">
                <span className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg.dot)} />
                <span className="text-[11px] text-t2">{cfg.label}</span>
              </div>
            ))}
          </div>

          {/* Google Calendar */}
          <GoogleCalendarCard />
        </div>

        {/* ── Day view (center) ──────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--surface)' }}>
          <DayView
            date={selectedDate}
            appointments={appointments}
            onAction={(id, status) => updateStatus.mutate({ id, status })}
          />
        </div>

        {/* ── Upcoming panel (right) ─────────────────────── */}
        <div className="w-[220px] flex-shrink-0 flex flex-col overflow-hidden" style={{ borderLeft: '1px solid var(--border)' }}>
          <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-[12px] font-semibold text-t1">Próximas</p>
            <p className="font-mono text-[10px] text-t3 mt-0.5">Consultas confirmadas</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {upcoming.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <Clock className="w-6 h-6 text-t3/30 mb-2" />
                <p className="text-[12px] text-t3">Nenhuma consulta</p>
              </div>
            ) : (
              <ul>
                {upcoming.map((appt, i) => {
                  const cfg = STATUS[appt.status]
                  const d   = parseISO(appt.scheduled_at)
                  const isToday_ = isToday(d)
                  return (
                    <li
                      key={appt.id}
                      onClick={() => { setSelectedDate(d); setCurrentMonth(d) }}
                      className="flex items-start gap-2.5 px-4 py-3 cursor-pointer hover:bg-raised transition-colors"
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      {/* Date stamp */}
                      <div className={cn(
                        'w-8 flex-shrink-0 text-center rounded-lg py-1',
                        isToday_ ? 'bg-brand-500/10' : 'bg-raised'
                      )}>
                        <p className={cn('text-[9px] font-mono uppercase tracking-wide', isToday_ ? 'text-brand-500' : 'text-t3')}>
                          {format(d, 'EEE', { locale: ptBR })}
                        </p>
                        <p className={cn('text-[15px] font-bold leading-tight', isToday_ ? 'text-brand-500' : 'text-t1')}>
                          {format(d, 'd')}
                        </p>
                      </div>
                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold text-t1 truncate leading-tight">{appt.client_name}</p>
                        <p className="text-[10px] text-t3 font-mono mt-0.5">{format(d, 'HH:mm')}</p>
                        <span className={cn('inline-flex items-center gap-1 text-[9px] font-semibold mt-1 px-1.5 py-0.5 rounded-md border', cfg.badge)}>
                          <span className={cn('w-1 h-1 rounded-full', cfg.dot)} />
                          {cfg.label}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
