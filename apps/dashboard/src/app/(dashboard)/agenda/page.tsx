'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, ChevronRight, Calendar, Clock, CheckCircle, XCircle,
} from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, addMonths, subMonths, isToday, parseISO, getYear
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────
interface Appointment {
  id: string
  client_name: string
  client_phone: string
  scheduled_at: string
  duration_minutes: number
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed'
  notes?: string
}

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'default' | 'info' }> = {
  scheduled:  { label: 'Agendado',   variant: 'info' },
  confirmed:  { label: 'Confirmado', variant: 'success' },
  cancelled:  { label: 'Cancelado',  variant: 'danger' },
  completed:  { label: 'Realizado',  variant: 'default' },
}

const STATUS_PILL: Record<string, string> = {
  scheduled: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  completed: 'bg-white/5 text-white/30 border-white/10',
}

const STATUS_TIME_COLOR: Record<string, string> = {
  scheduled: 'text-blue-400',
  confirmed: 'text-emerald-400',
  cancelled: 'text-red-400',
  completed: 'text-white/30',
}

// ─── Appointment Card ─────────────────────────────────────────────
function AppointmentCard({ appt }: { appt: Appointment }) {
  const queryClient = useQueryClient()

  const updateStatus = useMutation({
    mutationFn: (status: string) =>
      api.patch(`/api/appointments/${appt.id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  })

  const config = statusConfig[appt.status]
  const time = format(parseISO(appt.scheduled_at), 'HH:mm')

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.03] transition-all duration-150">
      <div className="flex-shrink-0 w-12 text-center pt-0.5">
        <p className={`text-base font-bold ${STATUS_TIME_COLOR[appt.status]}`}>{time}</p>
        <p className="text-[10px] text-white/20 mt-0.5">{appt.duration_minutes}min</p>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-[13px] font-semibold text-white/90 truncate">{appt.client_name}</p>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium flex-shrink-0 ${STATUS_PILL[appt.status]}`}>
            {config.label}
          </span>
        </div>
        <p className="text-[11px] text-white/25">{appt.client_phone}</p>
        {appt.notes && <p className="text-[11px] text-white/20 mt-1 truncate">{appt.notes}</p>}
      </div>
      {appt.status === 'scheduled' && (
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => updateStatus.mutate('confirmed')}
            className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            title="Confirmar"
          >
            <CheckCircle className="w-4 h-4" />
          </button>
          <button
            onClick={() => updateStatus.mutate('cancelled')}
            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
            title="Cancelar"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────
export default function AgendaPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ['appointments'],
    queryFn: async () => {
      const { data } = await api.get('/api/appointments')
      return data.appointments
    },
    refetchInterval: 30000,
  })

  // Feriados do ano corrente e próximo (para navegação de mês)
  const { data: holidaysRaw = [] } = useQuery<{ date: string; name: string }[]>({
    queryKey: ['holidays', getYear(currentMonth)],
    queryFn: async () => {
      const { data } = await api.get(`/api/appointments/holidays?year=${getYear(currentMonth)}`)
      return data.holidays
    },
    staleTime: 1000 * 60 * 60 * 24, // 24h
  })
  const holidayMap = new Map(holidaysRaw.map((h) => [h.date, h.name]))

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startDayOfWeek = (monthStart.getDay() + 6) % 7
  const leadingBlanks = Array.from({ length: startDayOfWeek })

  function appointmentsOnDate(date: Date) {
    return appointments.filter((a) => isSameDay(parseISO(a.scheduled_at), date))
  }

  const selectedAppointments = appointmentsOnDate(selectedDate).sort(
    (a, b) => parseISO(a.scheduled_at).getTime() - parseISO(b.scheduled_at).getTime()
  )

  const scheduledCount = appointments.filter((a) => a.status === 'scheduled').length
  const confirmedCount = appointments.filter((a) => a.status === 'confirmed').length

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-white tracking-tight">Agenda</h1>
          <p className="text-sm text-white/35 mt-0.5">Gerencie suas consultas agendadas</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {scheduledCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              {scheduledCount} agendado{scheduledCount !== 1 ? 's' : ''}
            </span>
          )}
          {confirmedCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {confirmedCount} confirmado{confirmedCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </h2>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-1.5 rounded-md hover:bg-white/5 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-white/40" />
                </button>
                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-1.5 rounded-md hover:bg-white/5 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-white/40" />
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 mb-2">
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => (
                <div key={d} className="text-xs font-medium text-white/25 text-center py-2">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {leadingBlanks.map((_, i) => (
                <div key={`blank-${i}`} />
              ))}

              {days.map((day) => {
                const dayAppts = appointmentsOnDate(day)
                const hasAppts = dayAppts.length > 0
                const isSelected = isSameDay(day, selectedDate)
                const today = isToday(day)
                const dateKey = format(day, 'yyyy-MM-dd')
                const holidayName = holidayMap.get(dateKey)

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    title={holidayName ?? undefined}
                    className={cn(
                      'relative flex flex-col items-center justify-center rounded-lg h-10 text-sm font-medium transition-all duration-150',
                      !isSameMonth(day, currentMonth) && 'text-white/15',
                      holidayName && !isSelected && 'bg-amber-500/10 text-amber-400',
                      isSelected
                        ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30'
                        : today && !holidayName
                          ? 'bg-brand-500/10 text-brand-400 font-bold'
                          : !holidayName
                            ? 'hover:bg-white/5 text-white/50'
                            : ''
                    )}
                  >
                    {format(day, 'd')}
                    {hasAppts && !isSelected && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-500" />
                    )}
                    {holidayName && !hasAppts && !isSelected && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-500" />
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Day appointments */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-400" />
              <h2 className="font-semibold text-white">
                {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
              </h2>
            </div>
          </CardHeader>
          <CardContent className="px-4">
            {/* Indicador de feriado */}
            {holidayMap.get(format(selectedDate, 'yyyy-MM-dd')) && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <span className="text-amber-400 text-xs font-medium">
                  🇧🇷 Feriado: {holidayMap.get(format(selectedDate, 'yyyy-MM-dd'))}
                </span>
              </div>
            )}
            {selectedAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Clock className="w-7 h-7 text-white/10 mb-2" />
                <p className="text-sm text-white/30">Nenhuma consulta</p>
                <p className="text-xs text-white/20 mt-1">Sem agendamentos para este dia</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {selectedAppointments.map((appt) => (
                  <AppointmentCard key={appt.id} appt={appt} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white/80">Próximas consultas</h2>
        </div>
        <div className="bg-ui-card border border-white/[0.06] rounded-2xl overflow-hidden">
          {appointments.filter((a) => ['scheduled', 'confirmed'].includes(a.status)).length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-8 h-8 mx-auto mb-3 text-white/10" />
              <p className="text-sm text-white/25">Nenhuma consulta agendada</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {appointments
                .filter((a) => ['scheduled', 'confirmed'].includes(a.status))
                .sort((a, b) => parseISO(a.scheduled_at).getTime() - parseISO(b.scheduled_at).getTime())
                .slice(0, 5)
                .map((appt) => (
                  <li key={appt.id} className="flex items-center gap-5 px-5 py-4 hover:bg-white/[0.02] transition-colors">
                    <div className="text-center flex-shrink-0 w-10">
                      <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider capitalize">
                        {format(parseISO(appt.scheduled_at), 'EEE', { locale: ptBR })}
                      </p>
                      <p className="text-xl font-bold text-white leading-tight">
                        {format(parseISO(appt.scheduled_at), 'd')}
                      </p>
                      <p className="text-[10px] text-white/25 capitalize">
                        {format(parseISO(appt.scheduled_at), 'MMM', { locale: ptBR })}
                      </p>
                    </div>
                    <div className="w-px h-8 bg-white/[0.06] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-white/90 truncate">{appt.client_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-white/35 font-medium">
                          {format(parseISO(appt.scheduled_at), 'HH:mm')}
                        </span>
                        <span className="text-white/15 text-[10px]">·</span>
                        <span className="text-[11px] text-white/25">{appt.duration_minutes} min</span>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-md border font-semibold flex-shrink-0 ${STATUS_PILL[appt.status]}`}>
                      {statusConfig[appt.status].label}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
