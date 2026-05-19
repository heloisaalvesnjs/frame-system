'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, ChevronRight, Calendar, Clock, User, CheckCircle, XCircle, Plus
} from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, addMonths, subMonths, isToday, parseISO
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
  scheduled: { label: 'Agendado', variant: 'info' },
  confirmed: { label: 'Confirmado', variant: 'success' },
  cancelled: { label: 'Cancelado', variant: 'danger' },
  completed: { label: 'Realizado', variant: 'default' },
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
    <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-white hover:border-gray-200 transition-colors">
      <div className="flex-shrink-0 w-14 text-center">
        <p className="text-lg font-bold text-brand-600">{time}</p>
        <p className="text-xs text-gray-400">{appt.duration_minutes}min</p>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-gray-900 truncate">{appt.client_name}</p>
          <Badge variant={config.variant}>{config.label}</Badge>
        </div>
        <p className="text-xs text-gray-500">{appt.client_phone}</p>
        {appt.notes && <p className="text-xs text-gray-400 mt-1 truncate">{appt.notes}</p>}
      </div>
      {appt.status === 'scheduled' && (
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => updateStatus.mutate('confirmed')}
            className="p-1.5 rounded-md text-green-600 hover:bg-green-50 transition-colors"
            title="Confirmar"
          >
            <CheckCircle className="w-4 h-4" />
          </button>
          <button
            onClick={() => updateStatus.mutate('cancelled')}
            className="p-1.5 rounded-md text-red-500 hover:bg-red-50 transition-colors"
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

  // Calendar days
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Leading blank days (fill to start on Monday)
  const startDayOfWeek = (monthStart.getDay() + 6) % 7
  const leadingBlanks = Array.from({ length: startDayOfWeek })

  // Appointments on a given date
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
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie suas consultas agendadas</p>
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
              <h2 className="font-semibold text-gray-900 capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </h2>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Week headers */}
            <div className="grid grid-cols-7 mb-2">
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => (
                <div key={d} className="text-xs font-medium text-gray-400 text-center py-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-1">
              {leadingBlanks.map((_, i) => (
                <div key={`blank-${i}`} />
              ))}

              {days.map((day) => {
                const dayAppts = appointmentsOnDate(day)
                const hasAppts = dayAppts.length > 0
                const isSelected = isSameDay(day, selectedDate)
                const today = isToday(day)

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      'relative flex flex-col items-center justify-center rounded-lg h-10 text-sm font-medium transition-colors',
                      !isSameMonth(day, currentMonth) && 'text-gray-300',
                      isSelected
                        ? 'bg-brand-600 text-white'
                        : today
                          ? 'bg-brand-50 text-brand-700 font-bold'
                          : 'hover:bg-gray-50 text-gray-700'
                    )}
                  >
                    {format(day, 'd')}
                    {hasAppts && !isSelected && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-500" />
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
              <Calendar className="w-4 h-4 text-brand-600" />
              <h2 className="font-semibold text-gray-900">
                {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
              </h2>
            </div>
          </CardHeader>
          <CardContent className="px-4">
            {selectedAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Clock className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Nenhuma consulta</p>
                <p className="text-xs text-gray-400 mt-1">Sem agendamentos para este dia</p>
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

      {/* Upcoming appointments */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Próximas consultas</h2>
        <div className="flex flex-col gap-3">
          {appointments
            .filter((a) => ['scheduled', 'confirmed'].includes(a.status))
            .sort((a, b) => parseISO(a.scheduled_at).getTime() - parseISO(b.scheduled_at).getTime())
            .slice(0, 5)
            .map((appt) => (
              <div key={appt.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center gap-4">
                <div className="text-center flex-shrink-0">
                  <p className="text-xs text-gray-400 capitalize">
                    {format(parseISO(appt.scheduled_at), 'EEE', { locale: ptBR })}
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {format(parseISO(appt.scheduled_at), 'd')}
                  </p>
                  <p className="text-xs text-gray-400">
                    {format(parseISO(appt.scheduled_at), 'MMM', { locale: ptBR })}
                  </p>
                </div>
                <div className="w-px h-10 bg-gray-200 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{appt.client_name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-sm text-gray-500">
                      {format(parseISO(appt.scheduled_at), 'HH:mm')}
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-sm text-gray-500">{appt.duration_minutes} min</span>
                  </div>
                </div>
                <Badge variant={statusConfig[appt.status].variant}>
                  {statusConfig[appt.status].label}
                </Badge>
              </div>
            ))}

          {appointments.filter((a) => ['scheduled', 'confirmed'].includes(a.status)).length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhuma consulta agendada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
