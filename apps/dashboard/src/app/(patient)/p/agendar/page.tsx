'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usePatient, patientApi } from '@/contexts/PatientContext'
import { PatientNav } from '@/components/patient/PatientNav'
import { Calendar, Clock, Loader2, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO, addMonths, subMonths, isSameMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface AvailDate { date: string; slots: string[] }

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export default function PatientSchedulePage() {
  const { client, loading: authLoading } = usePatient()
  const router = useRouter()
  const qc = useQueryClient()

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [modality, setModality] = useState<'online' | 'presencial'>('online')
  const [viewMonth, setViewMonth] = useState(new Date())
  const [booked, setBooked] = useState(false)

  useEffect(() => {
    if (!authLoading && !client) router.replace('/login')
  }, [client, authLoading, router])

  const { data: availability, isLoading } = useQuery<AvailDate[]>({
    queryKey: ['patient-availability'],
    queryFn: async () => {
      const { data } = await patientApi.get('/api/patient/availability')
      return data.dates
    },
    enabled: !!client,
    staleTime: 60_000,
  })

  const bookAppt = useMutation({
    mutationFn: () => patientApi.post('/api/patient/appointments', {
      date: selectedDate,
      time: selectedTime,
      modality,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient-availability'] })
      qc.invalidateQueries({ queryKey: ['patient-appointments'] })
      qc.invalidateQueries({ queryKey: ['patient-me'] })
      setBooked(true)
      toast.success('Consulta agendada com sucesso! 🎉')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error ?? 'Erro ao agendar. Tente outro horário.'
      toast.error(msg)
    },
  })

  const avail = availability ?? []
  const availSet = new Set(avail.map(a => a.date))

  // Calendar grid
  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const selectedSlots = avail.find(a => a.date === selectedDate)?.slots ?? []

  if (booked) {
    return (
      <div className="max-w-md mx-auto px-4 pt-16 pb-28 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Consulta agendada!</h1>
        <p className="text-sm text-white/50 mb-2">
          {selectedDate && format(parseISO(selectedDate), "d 'de' MMMM", { locale: ptBR })} às {selectedTime}
        </p>
        <p className="text-xs text-white/30 mb-8 capitalize">{modality}</p>
        <button
          onClick={() => { setBooked(false); setSelectedDate(null); setSelectedTime(null) }}
          className="px-6 py-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm font-medium hover:bg-brand-500/15 transition-colors"
        >
          Agendar outra
        </button>
        <PatientNav />
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-28">
      <h1 className="text-[22px] font-bold text-white mb-1 tracking-tight">Agendar consulta</h1>
      <p className="text-sm text-white/35 mb-6">Escolha um dia e horário disponível</p>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-brand-400 animate-spin" /></div>
      ) : avail.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/30">Nenhum horário disponível no momento</p>
          <p className="text-xs text-white/20 mt-1">Entre em contato com sua nutricionista</p>
        </div>
      ) : (
        <>
          {/* Calendar */}
          <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-4 mb-4">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setViewMonth(m => subMonths(m, 1))}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                <ChevronLeft className="w-4 h-4 text-white/40" />
              </button>
              <p className="text-sm font-semibold text-white capitalize">
                {MONTH_NAMES[month]} {year}
              </p>
              <button onClick={() => setViewMonth(m => addMonths(m, 1))}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                <ChevronRight className="w-4 h-4 text-white/40" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-2">
              {WEEK_DAYS.map(d => (
                <p key={d} className="text-[10px] font-semibold text-white/25 text-center py-1">{d}</p>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                const isAvail = availSet.has(dateStr)
                const isSel = selectedDate === dateStr
                const isPast = new Date(dateStr) < new Date()

                return (
                  <button
                    key={dayNum}
                    disabled={!isAvail || isPast}
                    onClick={() => { setSelectedDate(dateStr); setSelectedTime(null) }}
                    className={`h-9 rounded-lg text-sm font-medium transition-all ${
                      isSel
                        ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30 scale-105'
                        : isAvail && !isPast
                          ? 'bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 border border-brand-500/20'
                          : 'text-white/20 cursor-default'
                    }`}
                  >
                    {dayNum}
                  </button>
                )
              })}
            </div>

            <p className="text-[10px] text-white/20 text-center mt-3">
              Dias com fundo verde = horários disponíveis
            </p>
          </div>

          {/* Time slots */}
          {selectedDate && (
            <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-4 mb-4">
              <p className="text-xs font-semibold text-white/50 mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Horários disponíveis em {format(parseISO(selectedDate), "d 'de' MMMM", { locale: ptBR })}
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedSlots.map(t => (
                  <button
                    key={t}
                    onClick={() => setSelectedTime(t)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                      selectedTime === t
                        ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30'
                        : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Modality */}
          {selectedDate && selectedTime && (
            <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-4 mb-4">
              <p className="text-xs font-semibold text-white/50 mb-3">Modalidade</p>
              <div className="flex gap-2">
                {(['online', 'presencial'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setModality(m)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all ${
                      modality === m
                        ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
                        : 'bg-white/5 text-white/40 border border-white/10 hover:text-white/60'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Confirm button */}
          {selectedDate && selectedTime && (
            <button
              onClick={() => bookAppt.mutate()}
              disabled={bookAppt.isPending}
              className="w-full py-3.5 rounded-2xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-400 active:scale-[0.98] transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50"
            >
              {bookAppt.isPending
                ? <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                : `Confirmar — ${format(parseISO(selectedDate), "d/MM")} às ${selectedTime}`}
            </button>
          )}
        </>
      )}

      <PatientNav />
    </div>
  )
}
