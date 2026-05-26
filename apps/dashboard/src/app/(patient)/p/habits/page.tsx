'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usePatient, patientApi } from '@/contexts/PatientContext'
import { PatientNav } from '@/components/patient/PatientNav'
import { Droplets, Dumbbell, Plus, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface WaterData {
  total: number
  entries: { id: string; amount_ml: number; created_at: string }[]
}

interface ActivityEntry {
  id: string
  activity_type: string
  duration_minutes: number | null
  notes: string | null
  logged_at: string
}

const WATER_GOAL = 2000
const QUICK_AMOUNTS = [150, 200, 250, 300, 350, 500]

const ACTIVITIES = ['Caminhada', 'Corrida', 'Musculação', 'Ciclismo', 'Natação', 'Yoga', 'Pilates', 'Funcional', 'Dança', 'Outro']

function WaterBar({ current, goal }: { current: number; goal: number }) {
  const pct = Math.min((current / goal) * 100, 100)
  return (
    <div className="relative h-4 bg-white/5 rounded-full overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-400 rounded-full transition-all duration-700"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export default function PatientHabitsPage() {
  const { client, loading: authLoading } = usePatient()
  const router = useRouter()
  const qc = useQueryClient()
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [activityType, setActivityType] = useState('')
  const [duration, setDuration] = useState('')
  const [activityNotes, setActivityNotes] = useState('')

  useEffect(() => {
    if (!authLoading && !client) router.replace('/p')
  }, [client, authLoading, router])

  const { data: waterData, isLoading: loadingWater } = useQuery<WaterData>({
    queryKey: ['patient-water-today'],
    queryFn: async () => {
      const { data } = await patientApi.get('/api/patient/water/today')
      return data
    },
    enabled: !!client,
    staleTime: 15_000,
    refetchInterval: 30_000,
  })

  const { data: activityData, isLoading: loadingActivity } = useQuery<ActivityEntry[]>({
    queryKey: ['patient-activity'],
    queryFn: async () => {
      const { data } = await patientApi.get('/api/patient/activity')
      return data.entries
    },
    enabled: !!client,
    staleTime: 60_000,
  })

  const addWater = useMutation({
    mutationFn: (ml: number) => patientApi.post('/api/patient/water', { amount_ml: ml }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient-water-today'] })
      qc.invalidateQueries({ queryKey: ['patient-me'] })
    },
    onError: () => toast.error('Erro ao registrar água'),
  })

  const addActivity = useMutation({
    mutationFn: () => patientApi.post('/api/patient/activity', {
      activity_type: activityType,
      duration_minutes: duration ? parseInt(duration) : undefined,
      notes: activityNotes || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient-activity'] })
      toast.success('Atividade registrada!')
      setShowActivityForm(false)
      setActivityType(''); setDuration(''); setActivityNotes('')
    },
    onError: () => toast.error('Erro ao salvar'),
  })

  const water = waterData?.total ?? 0
  const activities = activityData ?? []
  const todayActivities = activities.filter(a => a.logged_at === new Date().toISOString().slice(0, 10))

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-28">
      <h1 className="text-[22px] font-bold text-white mb-6 tracking-tight">Hábitos</h1>

      {/* Water section */}
      <section className="mb-6">
        <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <Droplets className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white/80">Água</p>
                <p className="text-[10px] text-white/30">Meta diária: 2L</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-white">{(water / 1000).toFixed(2)}L</p>
              <p className="text-[10px] text-white/30">de {WATER_GOAL / 1000}L</p>
            </div>
          </div>

          <WaterBar current={water} goal={WATER_GOAL} />

          {water >= WATER_GOAL && (
            <p className="text-xs text-emerald-400 font-medium mt-2 text-center">✅ Meta atingida hoje!</p>
          )}

          {/* Quick add */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            {QUICK_AMOUNTS.map(ml => (
              <button
                key={ml}
                onClick={() => addWater.mutate(ml)}
                disabled={addWater.isPending}
                className="py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/15 text-cyan-400 text-xs font-bold hover:bg-cyan-500/20 active:scale-95 transition-all"
              >
                +{ml}ml
              </button>
            ))}
          </div>

          {/* Today's log */}
          {(waterData?.entries ?? []).length > 0 && (
            <div className="mt-4 border-t border-white/[0.04] pt-3">
              <p className="text-[10px] text-white/25 font-semibold uppercase tracking-wider mb-2">Registros de hoje</p>
              <div className="flex flex-wrap gap-1.5">
                {(waterData?.entries ?? []).map(e => (
                  <span key={e.id} className="text-[10px] px-2 py-1 rounded-lg bg-white/5 text-white/40">
                    {e.amount_ml}ml
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Activity section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Dumbbell className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <p className="text-sm font-semibold text-white/80">Atividade física</p>
          </div>
          <button
            onClick={() => setShowActivityForm(!showActivityForm)}
            className="flex items-center gap-1 text-xs text-brand-400 font-semibold hover:text-brand-300 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
        </div>

        {/* Activity form */}
        {showActivityForm && (
          <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-4 mb-3">
            <p className="text-xs font-semibold text-white/50 mb-3">Que atividade você fez?</p>
            {/* Type selector */}
            <div className="flex flex-wrap gap-2 mb-3">
              {ACTIVITIES.map(a => (
                <button
                  key={a}
                  onClick={() => setActivityType(a)}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${activityType === a ? 'bg-brand-500/15 border-brand-500/30 text-brand-400' : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'}`}
                >
                  {a}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider block mb-1">Duração (min)</label>
                <input
                  type="number" placeholder="30"
                  value={duration} onChange={e => setDuration(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/40"
                />
              </div>
              <div>
                <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider block mb-1">Obs. (opcional)</label>
                <input
                  type="text" placeholder="Como foi?"
                  value={activityNotes} onChange={e => setActivityNotes(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/40"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowActivityForm(false)} className="flex-1 py-2 rounded-xl text-sm text-white/30">Cancelar</button>
              <button
                onClick={() => addActivity.mutate()}
                disabled={addActivity.isPending || !activityType}
                className="flex-1 py-2 rounded-xl bg-brand-500 text-white text-sm font-semibold disabled:opacity-40 hover:bg-brand-400 active:scale-95 transition-all"
              >
                {addActivity.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Salvar'}
              </button>
            </div>
          </div>
        )}

        {/* Today */}
        {todayActivities.length > 0 && (
          <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-4 mb-3">
            <p className="text-[10px] text-white/25 font-semibold uppercase tracking-wider mb-2">Hoje</p>
            <div className="flex flex-col gap-2">
              {todayActivities.map(a => (
                <div key={a.id} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <Dumbbell className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/80">{a.activity_type}</p>
                    {a.duration_minutes && (
                      <p className="text-[11px] text-white/30">{a.duration_minutes} min</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent history */}
        {loadingActivity ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-brand-400 animate-spin" /></div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-white/20">
            <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhuma atividade registrada ainda</p>
          </div>
        ) : (
          <div>
            <p className="text-[10px] text-white/25 font-semibold uppercase tracking-wider mb-2">Recentes</p>
            <div className="bg-ui-card border border-white/[0.06] rounded-2xl overflow-hidden">
              <ul className="divide-y divide-white/[0.04]">
                {activities.filter(a => a.logged_at !== new Date().toISOString().slice(0, 10)).slice(0, 10).map(a => (
                  <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                    <p className="text-[11px] text-white/25 w-10 flex-shrink-0">{a.logged_at.slice(5).replace('-', '/')}</p>
                    <p className="flex-1 text-sm text-white/70">{a.activity_type}</p>
                    {a.duration_minutes && (
                      <p className="text-[11px] text-white/30 flex-shrink-0">{a.duration_minutes}min</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      <PatientNav />
    </div>
  )
}
