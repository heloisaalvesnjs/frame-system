'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usePatient, patientApi } from '@/contexts/PatientContext'
import { PatientNav } from '@/components/patient/PatientNav'
import { TrendingUp, Plus, Loader2, Scale } from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface WeightEntry {
  id: string
  weight_kg: string
  waist_cm: string | null
  hip_cm: string | null
  notes: string | null
  logged_at: string
}

export default function PatientTrackingPage() {
  const { client, loading: authLoading } = usePatient()
  const router = useRouter()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [kg, setKg] = useState('')
  const [waist, setWaist] = useState('')
  const [hip, setHip] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!authLoading && !client) router.replace('/p')
  }, [client, authLoading, router])

  const { data, isLoading } = useQuery<WeightEntry[]>({
    queryKey: ['patient-weight'],
    queryFn: async () => {
      const { data } = await patientApi.get('/api/patient/weight')
      return data.entries
    },
    enabled: !!client,
    staleTime: 60_000,
  })

  const save = useMutation({
    mutationFn: () => patientApi.post('/api/patient/weight', {
      weight_kg: kg ? parseFloat(kg) : undefined,
      waist_cm:  waist ? parseFloat(waist) : undefined,
      hip_cm:    hip ? parseFloat(hip) : undefined,
      notes:     notes || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient-weight'] })
      qc.invalidateQueries({ queryKey: ['patient-me'] })
      toast.success('Registro salvo!')
      setShowForm(false)
      setKg(''); setWaist(''); setHip(''); setNotes('')
    },
    onError: () => toast.error('Erro ao salvar'),
  })

  const entries = data ?? []
  const latest = entries[0]
  const prev = entries[1]

  const weightChange = latest && prev && latest.weight_kg && prev.weight_kg
    ? parseFloat(latest.weight_kg) - parseFloat(prev.weight_kg)
    : null

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-bold text-white tracking-tight">Evolução</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold px-3 py-2 rounded-xl hover:bg-brand-500/15 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Registrar
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-4 mb-5">
          <p className="text-sm font-semibold text-white/70 mb-3">Novo registro</p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div>
              <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider block mb-1">Peso (kg)</label>
              <input
                type="number" step="0.1" placeholder="65.0"
                value={kg} onChange={e => setKg(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/40"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider block mb-1">Cintura (cm)</label>
              <input
                type="number" step="0.1" placeholder="72"
                value={waist} onChange={e => setWaist(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/40"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider block mb-1">Quadril (cm)</label>
              <input
                type="number" step="0.1" placeholder="95"
                value={hip} onChange={e => setHip(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/40"
              />
            </div>
          </div>
          <textarea
            placeholder="Observações (opcional)…"
            value={notes} onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/40 resize-none mb-3"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 py-2 rounded-xl text-sm text-white/40 hover:text-white/60 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending || (!kg && !waist && !hip)}
              className="flex-1 py-2 rounded-xl bg-brand-500 text-white text-sm font-semibold disabled:opacity-40 hover:bg-brand-400 active:scale-95 transition-all"
            >
              {save.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {/* Current stats */}
      {latest && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Peso', value: latest.weight_kg ? `${parseFloat(latest.weight_kg).toFixed(1)}kg` : '—', accent: 'bg-brand-500' },
            { label: 'Cintura', value: latest.waist_cm ? `${parseFloat(latest.waist_cm).toFixed(0)}cm` : '—', accent: 'bg-violet-500' },
            { label: 'Quadril', value: latest.hip_cm ? `${parseFloat(latest.hip_cm).toFixed(0)}cm` : '—', accent: 'bg-blue-500' },
          ].map(s => (
            <div key={s.label} className="bg-ui-card border border-white/[0.06] rounded-2xl p-3 relative overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-0.5 ${s.accent}`} />
              <p className="text-[10px] text-white/30 font-semibold uppercase tracking-wider mb-1">{s.label}</p>
              <p className="text-lg font-bold text-white">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Weight delta */}
      {weightChange !== null && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl mb-5 ${weightChange < 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
          <TrendingUp className={`w-4 h-4 flex-shrink-0 ${weightChange < 0 ? 'text-emerald-400' : 'text-amber-400'}`} />
          <p className={`text-sm font-medium ${weightChange < 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
            {weightChange < 0
              ? `Perdeu ${Math.abs(weightChange).toFixed(1)}kg desde o último registro`
              : `Ganhou ${weightChange.toFixed(1)}kg desde o último registro`}
          </p>
        </div>
      )}

      {/* History list */}
      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-brand-400 animate-spin" /></div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12">
          <Scale className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/30">Nenhum registro ainda</p>
          <p className="text-xs text-white/20 mt-1">Toque em "Registrar" para começar</p>
        </div>
      ) : (
        <div>
          <p className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-3">Histórico</p>
          <div className="bg-ui-card border border-white/[0.06] rounded-2xl overflow-hidden">
            <ul className="divide-y divide-white/[0.04]">
              {entries.slice(0, 20).map(entry => (
                <li key={entry.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="text-center flex-shrink-0 w-10">
                    <p className="text-[10px] text-white/30 capitalize">
                      {format(parseISO(entry.logged_at), 'MMM', { locale: ptBR })}
                    </p>
                    <p className="text-base font-bold text-white leading-tight">{format(parseISO(entry.logged_at), 'd')}</p>
                  </div>
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[10px] text-white/25">Peso</p>
                      <p className="text-sm font-semibold text-white/80">
                        {entry.weight_kg ? `${parseFloat(entry.weight_kg).toFixed(1)}kg` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/25">Cintura</p>
                      <p className="text-sm font-semibold text-white/80">
                        {entry.waist_cm ? `${parseFloat(entry.waist_cm).toFixed(0)}cm` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/25">Quadril</p>
                      <p className="text-sm font-semibold text-white/80">
                        {entry.hip_cm ? `${parseFloat(entry.hip_cm).toFixed(0)}cm` : '—'}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <PatientNav />
    </div>
  )
}
