'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { usePatient, patientApi } from '@/contexts/PatientContext'
import { PatientNav } from '@/components/patient/PatientNav'
import { Calendar, Clock, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { format, parseISO, isPast } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Appointment {
  id: string
  scheduled_at: string
  duration_minutes: number
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed'
  notes: string | null
  modality: string
}

const STATUS = {
  scheduled:  { label: 'Agendada',   pill: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  confirmed:  { label: 'Confirmada', pill: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  cancelled:  { label: 'Cancelada',  pill: 'bg-red-500/10 text-red-400 border-red-500/20' },
  completed:  { label: 'Realizada',  pill: 'bg-white/5 text-white/30 border-white/10' },
}

function StatusIcon({ s }: { s: string }) {
  if (s === 'completed') return <CheckCircle2 className="w-4 h-4 text-emerald-400" />
  if (s === 'cancelled')  return <XCircle className="w-4 h-4 text-red-400" />
  return <AlertCircle className="w-4 h-4 text-blue-400" />
}

export default function PatientAgendaPage() {
  const { client, loading: authLoading } = usePatient()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !client) router.replace('/p')
  }, [client, authLoading, router])

  const { data, isLoading } = useQuery<Appointment[]>({
    queryKey: ['patient-appointments'],
    queryFn: async () => {
      const { data } = await patientApi.get('/api/patient/appointments')
      return data.appointments
    },
    enabled: !!client,
    staleTime: 60_000,
  })

  const appts = data ?? []
  const upcoming = appts.filter(a => !isPast(parseISO(a.scheduled_at)) || a.status === 'scheduled' || a.status === 'confirmed')
  const past = appts.filter(a => isPast(parseISO(a.scheduled_at)) && (a.status === 'completed' || a.status === 'cancelled'))

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-28">
      <h1 className="text-[22px] font-bold text-white mb-6 tracking-tight">Agenda</h1>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
        </div>
      ) : appts.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/30">Nenhuma consulta encontrada</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="mb-6">
              <p className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-3">Próximas</p>
              <div className="flex flex-col gap-3">
                {upcoming.map(a => <ApptCard key={a.id} appt={a} />)}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-3">Histórico</p>
              <div className="flex flex-col gap-2">
                {past.map(a => <ApptCard key={a.id} appt={a} dim />)}
              </div>
            </section>
          )}
        </>
      )}

      <PatientNav />
    </div>
  )
}

function ApptCard({ appt, dim = false }: { appt: Appointment; dim?: boolean }) {
  const cfg = STATUS[appt.status]
  const date = parseISO(appt.scheduled_at)

  return (
    <div className={`bg-ui-card border border-white/[0.06] rounded-2xl p-4 flex gap-4 ${dim ? 'opacity-60' : ''}`}>
      {/* Date block */}
      <div className="flex-shrink-0 text-center w-12">
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider capitalize">
          {format(date, 'MMM', { locale: ptBR })}
        </p>
        <p className="text-2xl font-bold text-white leading-tight">{format(date, 'd')}</p>
        <p className="text-[10px] text-white/30">{format(date, 'yyyy')}</p>
      </div>

      <div className="w-px bg-white/[0.06] flex-shrink-0" />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <StatusIcon s={appt.status} />
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-semibold ${cfg.pill}`}>
              {cfg.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[12px] text-white/40">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(date, 'HH:mm')}
          </span>
          <span>{appt.duration_minutes}min</span>
          <span className="capitalize">{appt.modality}</span>
        </div>
        {appt.notes && (
          <p className="text-[11px] text-white/25 mt-1.5 truncate">{appt.notes}</p>
        )}
      </div>
    </div>
  )
}
