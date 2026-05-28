'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usePatient, patientApi } from '@/contexts/PatientContext'
import { PatientNav } from '@/components/patient/PatientNav'
import {
  Droplets, TrendingUp, Calendar, ClipboardCheck,
  Plus, ChevronRight, Loader2, UtensilsCrossed, FolderOpen, MessageCircle
} from 'lucide-react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Summary {
  waterToday: number
  waterGoalMl: number
  lastWeight: { weight_kg: string; logged_at: string } | null
  nextAppointment: { scheduled_at: string; status: string } | null
  checkinPending: boolean
}

interface MeData {
  client: { id: string; name: string | null; goal: string | null }
  summary: Summary
}

function WaterRing({ current, goal }: { current: number; goal: number }) {
  const pct = Math.min(current / goal, 1)
  const r = 48
  const circ = 2 * Math.PI * r
  const dash = circ * pct

  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg viewBox="0 0 112 112" className="w-full h-full -rotate-90">
        <circle cx="56" cy="56" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
        <circle
          cx="56" cy="56" r={r} fill="none"
          stroke="#22d3ee" strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Droplets className="w-5 h-5 text-cyan-400 mb-0.5" />
        <p className="text-lg font-bold text-white leading-none">{(current / 1000).toFixed(1)}L</p>
        <p className="text-[10px] text-white/30">de {goal / 1000}L</p>
      </div>
    </div>
  )
}

export default function PatientHomePage() {
  const { client, loading: authLoading } = usePatient()
  const router = useRouter()
  const qc = useQueryClient()

  useEffect(() => {
    if (!authLoading && !client) router.replace('/p')
  }, [client, authLoading, router])

  const { data, isLoading } = useQuery<MeData>({
    queryKey: ['patient-me'],
    queryFn: async () => {
      const { data } = await patientApi.get('/api/patient/me')
      return data
    },
    enabled: !!client,
    staleTime: 30_000,
  })

  const addWater = useMutation({
    mutationFn: (ml: number) => patientApi.post('/api/patient/water', { amount_ml: ml }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patient-me'] }),
  })

  if (authLoading || isLoading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    )
  }

  const { summary } = data
  const hour = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })).getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const firstName = data.client.name?.split(' ')[0] ?? 'você'

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-28">
      {/* Header */}
      <div className="mb-6">
        <p className="text-white/40 text-sm">{greeting} 👋</p>
        <h1 className="text-2xl font-bold text-white mt-0.5">{firstName}</h1>
        {data.client.goal && (
          <p className="text-sm text-white/30 mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" />
            {data.client.goal}
          </p>
        )}
      </div>

      {/* Water card */}
      <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] font-semibold text-white/35 uppercase tracking-wider">Água hoje</p>
            <p className="text-sm text-white/60 mt-0.5">
              {summary.waterToday >= summary.waterGoalMl ? '✅ Meta atingida!' : `Faltam ${((summary.waterGoalMl - summary.waterToday) / 1000).toFixed(1)}L`}
            </p>
          </div>
          <Link href="/p/habits" className="text-xs text-cyan-400 flex items-center gap-0.5 hover:text-cyan-300">
            ver mais <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <WaterRing current={summary.waterToday} goal={summary.waterGoalMl} />

        {/* Quick add buttons */}
        <div className="flex gap-2 mt-4">
          {[150, 250, 350, 500].map(ml => (
            <button
              key={ml}
              onClick={() => addWater.mutate(ml)}
              disabled={addWater.isPending}
              className="flex-1 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold hover:bg-cyan-500/15 active:scale-95 transition-all"
            >
              +{ml}ml
            </button>
          ))}
        </div>
      </div>

      {/* Weight + Next appt */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Weight */}
        <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-brand-500" />
          <TrendingUp className="w-4 h-4 text-brand-400 mb-2" />
          <p className="text-[10px] font-semibold text-white/35 uppercase tracking-wider">Peso atual</p>
          <p className="text-xl font-bold text-white mt-1">
            {summary.lastWeight ? `${parseFloat(summary.lastWeight.weight_kg).toFixed(1)}kg` : '—'}
          </p>
          {summary.lastWeight && (
            <p className="text-[10px] text-white/25 mt-0.5">
              {format(parseISO(summary.lastWeight.logged_at), "d 'de' MMM", { locale: ptBR })}
            </p>
          )}
          <Link href="/p/tracking" className="absolute bottom-3 right-3">
            <Plus className="w-4 h-4 text-white/20 hover:text-white/50 transition-colors" />
          </Link>
        </div>

        {/* Next appointment */}
        <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-violet-500" />
          <Calendar className="w-4 h-4 text-violet-400 mb-2" />
          <p className="text-[10px] font-semibold text-white/35 uppercase tracking-wider">Próxima consulta</p>
          {summary.nextAppointment ? (
            <>
              <p className="text-base font-bold text-white mt-1">
                {format(parseISO(summary.nextAppointment.scheduled_at), "d MMM", { locale: ptBR })}
              </p>
              <p className="text-[10px] text-white/40 mt-0.5">
                {format(parseISO(summary.nextAppointment.scheduled_at), 'HH:mm')}
              </p>
            </>
          ) : (
            <p className="text-sm text-white/25 mt-1">Nenhuma</p>
          )}
          <Link href="/p/agenda" className="absolute bottom-3 right-3">
            <ChevronRight className="w-4 h-4 text-white/20 hover:text-white/50 transition-colors" />
          </Link>
        </div>
      </div>

      {/* Check-in banner */}
      {summary.checkinPending && (
        <Link
          href="/p/checkin"
          className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 hover:bg-amber-500/15 transition-colors mb-4"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
            <ClipboardCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-300">Check-in semanal pendente</p>
            <p className="text-xs text-amber-400/60">Como você está se sentindo esta semana?</p>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-400/50 flex-shrink-0" />
        </Link>
      )}

      {/* Atalhos rápidos */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { href: '/p/plano', label: 'Plano alimentar', icon: UtensilsCrossed, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { href: '/p/documentos', label: 'Documentos', icon: FolderOpen, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
          { href: '/p/agendar', label: 'Agendar', icon: Calendar, color: 'text-brand-400', bg: 'bg-brand-500/10 border-brand-500/20' },
        ].map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-2 p-3 rounded-2xl border ${item.bg} hover:opacity-80 transition-opacity`}
          >
            <item.icon className={`w-5 h-5 ${item.color}`} />
            <span className="text-[10px] font-medium text-white/50 text-center leading-tight">{item.label}</span>
          </Link>
        ))}
      </div>

      <PatientNav checkinPending={summary.checkinPending} />
    </div>
  )
}
