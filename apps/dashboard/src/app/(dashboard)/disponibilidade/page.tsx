'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, Plus, Trash2, CheckCircle, Info } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────────
interface DayConfig {
  day_of_week:   number
  label:         string
  is_active:     boolean
  start_time:    string
  end_time:      string
  slot_duration: number
}

const DAY_ABBR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const SLOT_OPTIONS = [
  { value: 30,  label: '30 min' },
  { value: 45,  label: '45 min' },
  { value: 50,  label: '50 min' },
  { value: 60,  label: '1 hora' },
  { value: 90,  label: '1h 30' },
  { value: 120, label: '2 horas' },
]

// ── Toggle ─────────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-all duration-200',
        checked
          ? 'bg-brand-500 shadow-[0_0_0_3px_rgba(0,194,124,0.18)]'
          : 'bg-zinc-700 border border-zinc-600'
      )}
    >
      <span className={cn(
        'absolute top-0.5 inline-block h-5 w-5 transform rounded-full shadow-sm transition-transform duration-200',
        checked ? 'translate-x-[22px] bg-white' : 'translate-x-0.5 bg-zinc-400'
      )} />
    </button>
  )
}

// ── Time input ─────────────────────────────────────────────────────────────────
function TimeInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <input
      type="time"
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        'bg-raised border border-border rounded-lg px-3 py-2 text-sm text-t1 font-mono',
        'focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/60 transition-all',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    />
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function DisponibilidadePage() {
  const qc = useQueryClient()
  const [days, setDays] = useState<DayConfig[]>([])
  const [dirty, setDirty] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['availability'],
    queryFn: () => api.get('/availability').then(r => r.data.availability as DayConfig[]),
  })

  useEffect(() => {
    if (data) {
      setDays(data)
      setDirty(false)
    }
  }, [data])

  const saveMut = useMutation({
    mutationFn: (availability: DayConfig[]) =>
      api.put('/availability', { availability }).then(r => r.data),
    onSuccess: () => {
      toast.success('Disponibilidade salva!')
      setDirty(false)
      qc.invalidateQueries({ queryKey: ['availability'] })
    },
    onError: () => toast.error('Erro ao salvar'),
  })

  function update(idx: number, patch: Partial<DayConfig>) {
    setDays(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], ...patch }
      return next
    })
    setDirty(true)
  }

  const activeDays = days.filter(d => d.is_active).length

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-t1">Disponibilidade</h1>
          <p className="text-sm text-t3 mt-0.5">
            Configure os dias e horários em que você atende.
            A assistente vai usar esses horários para agendar consultas.
          </p>
        </div>
        <button
          onClick={() => saveMut.mutate(days)}
          disabled={!dirty || saveMut.isPending}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            dirty
              ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-sm'
              : 'bg-raised text-t3 cursor-not-allowed',
          )}
        >
          {saveMut.isPending ? (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          {dirty ? 'Salvar' : 'Salvo'}
        </button>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2.5 bg-brand-500/8 border border-brand-500/20 rounded-xl px-4 py-3">
        <Info className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
        <p className="text-sm text-t2">
          <span className="font-medium text-brand-400">{activeDays} {activeDays === 1 ? 'dia ativo' : 'dias ativos'}</span>
          {' '}configurados. A duração da consulta define o intervalo entre slots disponíveis.
        </p>
      </div>

      {/* Days grid */}
      <div className="space-y-2">
        {days.map((day, idx) => (
          <div
            key={day.day_of_week}
            className={cn(
              'rounded-xl border transition-all',
              day.is_active
                ? 'bg-surface border-border'
                : 'bg-surface/50 border-border/40'
            )}
          >
            <div className="flex items-center gap-4 px-4 py-3.5">
              {/* Day abbr */}
              <span className={cn(
                'w-8 text-center font-mono text-xs font-semibold rounded-md py-1',
                day.is_active ? 'bg-brand-500/15 text-brand-400' : 'bg-raised text-t3'
              )}>
                {DAY_ABBR[day.day_of_week]}
              </span>

              {/* Label */}
              <span className={cn('flex-1 text-sm font-medium', day.is_active ? 'text-t1' : 'text-t3')}>
                {day.label}
              </span>

              {day.is_active ? (
                /* Time range + slot duration */
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <TimeInput value={day.start_time} onChange={v => update(idx, { start_time: v })} />
                  <span className="text-t3 text-sm">–</span>
                  <TimeInput value={day.end_time}   onChange={v => update(idx, { end_time: v })} />
                  <select
                    value={day.slot_duration}
                    onChange={e => update(idx, { slot_duration: Number(e.target.value) })}
                    className="bg-raised border border-border rounded-lg px-2 py-2 text-sm text-t2 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  >
                    {SLOT_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-xs text-t3 mr-2">Indisponível</span>
              )}

              {/* Toggle */}
              <Toggle checked={day.is_active} onChange={v => update(idx, { is_active: v })} />
            </div>
          </div>
        ))}
      </div>

      {/* Hint */}
      <p className="text-xs text-t3 text-center">
        Feriados nacionais são bloqueados automaticamente. Use a Agenda para bloqueios pontuais.
      </p>
    </div>
  )
}
