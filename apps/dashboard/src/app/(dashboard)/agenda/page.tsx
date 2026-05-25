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
    <div className="flex items-start gap-3 p-3 rounded-lg border border-ui-border bg-ui-elevated hover:border-white/15 transition-colors">
      <div className="flex-shrink-0 w-14 text-center">
        <p className="text-base font-bold text-brand-400">{time}</p>
        <p className="text-xs text-white/25">{appt.duration_minutes}min</p>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-white/80 truncate">{appt.client_name}</p>
          <Badge variant={config.variant}>{config.label}</Badge>
        </div>
        <p className="text-xs text-white/30">{appt.client_phone}</p>
        {appt.notes && <p className="text-xs text-white/20 mt-1 truncate">{appt.notes}</p>}
      </div>
      {appt.status === 'scheduled' && (
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => updateStatus.mutate('confirmed')}
            className="p-1.5 rounded-md text-brand-400 hover:bg-brand-500/10 transition-colors"
            title="Confirmar"
          >
            <CheckCircle className="w-4 h-4" />
          </button>
          <button
            onClick={() => updateStatus.mutate('cancelled')}
            className="p-1.5 rounded-md text-red-400 hover:bg-red-500/10 transition-colors"
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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Agenda</h1>
          <p className="text-sm text-white/30 mt-0.5">Gerencie suas consultas agendadas</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="info">{appointments.filter((a) => a.status === 'scheduled').length} agendados</Badge>
          <Badge variant="success">{appointments.filter((a) => a.status === 'confirmed').length} confirmados</Badge>
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
        <h2 className="text-base font-semibold text-white mb-4">Próximas consultas</h2>
        <div className="flex flex-col gap-3">
          {appointments
            .filter((a) => ['scheduled', 'confirmed'].includes(a.status))
            .sort((a, b) => parseISO(a.scheduled_at).getTime() - parseISO(b.scheduled_at).getTime())
            .slice(0, 5)
            .map((appt) => (
              <div key={appt.id} className="bg-ui-card border border-ui-border rounded-xl px-5 py-4 flex items-center gap-4 hover:border-white/10 transition-colors">
                <div className="text-center flex-shrink-0">
                  <p className="text-xs text-white/25 capitalize">
                    {format(parseISO(appt.scheduled_at), 'EEE', { locale: ptBR })}
                  </p>
                  <p className="text-xl font-bold text-white">
                    {format(parseISO(appt.scheduled_at), 'd')}
                  </p>
                  <p className="text-xs text-white/25">
                    {format(parseISO(appt.scheduled_at), 'MMM', { locale: ptBR })}
                  </p>
                </div>
                <div className="w-px h-10 bg-ui-border flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white/80">{appt.client_name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-sm text-white/30">
                      {format(parseISO(appt.scheduled_at), 'HH:mm')}
                    </span>
                    <span className="text-xs text-white/15">•</span>
                    <span className="text-sm text-white/30">{appt.duration_minutes} min</span>
                  </div>
                </div>
                <Badge variant={statusConfig[appt.status].variant}>
                  {statusConfig[appt.status].label}
                </Badge>
              </div>
            ))}

          {appointments.filter((a) => ['scheduled', 'confirmed'].includes(a.status)).length === 0 && (
            <div className="text-center py-10 text-white/20">
              <Calendar className="w-9 h-9 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhuma consulta agendada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
