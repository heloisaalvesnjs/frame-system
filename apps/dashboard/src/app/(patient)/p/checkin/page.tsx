'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usePatient, patientApi } from '@/contexts/PatientContext'
import { PatientNav } from '@/components/patient/PatientNav'
import { ClipboardList, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Checkin {
  id: string
  week_start: string
  hunger_score: number
  energy_score: number
  sleep_score: number
  mood_score: number
  notes: string | null
  created_at: string
}

const QUESTIONS: { key: 'hunger_score' | 'energy_score' | 'sleep_score' | 'mood_score'; label: string; emoji: string; low: string; high: string }[] = [
  { key: 'hunger_score', label: 'Fome / Saciedade', emoji: '🍽️', low: 'Muita fome', high: 'Bem saciada' },
  { key: 'energy_score', label: 'Energia', emoji: '⚡', low: 'Muito cansada', high: 'Cheia de energia' },
  { key: 'sleep_score', label: 'Sono', emoji: '😴', low: 'Mal dormindo', high: 'Dormindo muito bem' },
  { key: 'mood_score', label: 'Humor', emoji: '😊', low: 'Muito mal', high: 'Ótima' },
]

function ScoreSelector({
  label, emoji, low, high, value, onChange,
}: {
  label: string; emoji: string; low: string; high: string; value: number; onChange: (v: number) => void
}) {
  return (
    <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{emoji}</span>
        <p className="text-sm font-semibold text-white/80">{label}</p>
        <span className="ml-auto text-lg font-bold text-brand-400">{value}</span>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`flex-1 h-10 rounded-xl text-sm font-bold transition-all active:scale-95 ${
              value === n
                ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30 scale-105'
                : 'bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/60'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-white/25">{low}</span>
        <span className="text-[10px] text-white/25">{high}</span>
      </div>
    </div>
  )
}

export default function PatientCheckinPage() {
  const { client, loading: authLoading } = usePatient()
  const router = useRouter()
  const qc = useQueryClient()

  const [scores, setScores] = useState({ hunger_score: 3, energy_score: 3, sleep_score: 3, mood_score: 3 })
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!authLoading && !client) router.replace('/p')
  }, [client, authLoading, router])

  const { data: checkins, isLoading } = useQuery<Checkin[]>({
    queryKey: ['patient-checkins'],
    queryFn: async () => {
      const { data } = await patientApi.get('/api/patient/checkin')
      return data.checkins
    },
    enabled: !!client,
    staleTime: 60_000,
  })

  const submit = useMutation({
    mutationFn: () => patientApi.post('/api/patient/checkin', { ...scores, notes: notes || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient-checkins'] })
      qc.invalidateQueries({ queryKey: ['patient-me'] })
      toast.success('Check-in enviado! 🎉')
      setNotes('')
    },
    onError: () => toast.error('Erro ao enviar check-in'),
  })

  // Current week Monday
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now); monday.setDate(now.getDate() + diff)
  const weekStart = monday.toISOString().slice(0, 10)

  const thisWeekDone = checkins?.some(c => c.week_start === weekStart)
  const history = checkins?.filter(c => c.week_start !== weekStart) ?? []

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-28">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center">
          <ClipboardList className="w-4.5 h-4.5 text-brand-400" />
        </div>
        <div>
          <h1 className="text-[22px] font-bold text-white tracking-tight leading-none">Check-in semanal</h1>
          <p className="text-xs text-white/30 mt-0.5 capitalize">
            Semana de {format(monday, "d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-brand-400 animate-spin" /></div>
      ) : thisWeekDone ? (
        /* Already submitted this week */
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="text-base font-semibold text-emerald-300">Check-in da semana enviado!</p>
          <p className="text-sm text-emerald-400/60 mt-1">Volte na próxima semana</p>
        </div>
      ) : (
        /* Form */
        <div className="flex flex-col gap-3 mb-6">
          {QUESTIONS.map(q => (
            <ScoreSelector
              key={q.key}
              label={q.label}
              emoji={q.emoji}
              low={q.low}
              high={q.high}
              value={scores[q.key]}
              onChange={v => setScores(prev => ({ ...prev, [q.key]: v }))}
            />
          ))}

          {/* Notes */}
          <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-4">
            <p className="text-sm font-semibold text-white/60 mb-2">Observações (opcional)</p>
            <textarea
              placeholder="Como foi a semana? Algo que queira compartilhar com a nutricionista…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/40 resize-none"
            />
          </div>

          <button
            onClick={() => submit.mutate()}
            disabled={submit.isPending}
            className="w-full py-3.5 rounded-2xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-400 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-brand-500/20"
          >
            {submit.isPending ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Enviar check-in'}
          </button>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-3">Histórico</p>
          <div className="bg-ui-card border border-white/[0.06] rounded-2xl overflow-hidden">
            <ul className="divide-y divide-white/[0.04]">
              {history.map(c => {
                const avg = ((c.hunger_score + c.energy_score + c.sleep_score + c.mood_score) / 4).toFixed(1)
                return (
                  <li key={c.id} className="px-4 py-3 flex items-center gap-4">
                    <div className="flex-shrink-0 text-center w-10">
                      <p className="text-[10px] text-white/30">semana</p>
                      <p className="text-sm font-bold text-white">
                        {format(parseISO(c.week_start), "d/MM")}
                      </p>
                    </div>
                    <div className="flex-1 grid grid-cols-4 gap-1">
                      {['🍽️', '⚡', '😴', '😊'].map((emoji, i) => {
                        const val = [c.hunger_score, c.energy_score, c.sleep_score, c.mood_score][i]
                        return (
                          <div key={i} className="text-center">
                            <p className="text-[10px]">{emoji}</p>
                            <p className={`text-sm font-bold ${val >= 4 ? 'text-emerald-400' : val <= 2 ? 'text-red-400' : 'text-white/60'}`}>{val}</p>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex-shrink-0 text-center">
                      <p className="text-[10px] text-white/25">média</p>
                      <p className="text-sm font-bold text-brand-400">{avg}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}

      <PatientNav />
    </div>
  )
}
