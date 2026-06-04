'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, Info, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react'
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
  break_start:   string | null
  break_end:     string | null
}

const DAY_ABBR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const SLOT_OPTIONS = [
  { value: 30,  label: '30 min' },
  { value: 45,  label: '45 min' },
  { value: 50,  label: '50 min' },
  { value: 60,  label: '1 hora' },
  { value: 90,  label: '1h 30'  },
  { value: 120, label: '2 horas'},
]
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const WEEK_DAYS = ['D','S','T','Q','Q','S','S']

// ── Toggle ─────────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-all duration-200',
        checked ? 'bg-brand-500 shadow-[0_0_0_3px_rgba(0,194,124,0.18)]' : 'bg-zinc-700 border border-zinc-600'
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
function TimeInput({ value, onChange, disabled, placeholder }: {
  value: string; onChange: (v: string) => void; disabled?: boolean; placeholder?: string
}) {
  return (
    <input
      type="time"
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className={cn(
        'bg-raised border border-border rounded-lg px-3 py-2 text-sm text-t1 font-mono w-[110px]',
        'focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/60 transition-all',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    />
  )
}

// ── Mini Calendar ──────────────────────────────────────────────────────────────
function BlockedCalendar() {
  const qc = useQueryClient()
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [reason, setReason] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  const { data } = useQuery({
    queryKey: ['blocked-dates'],
    queryFn: () => api.get('/api/availability/blocked').then(r => r.data.blocked as { id: string; blocked_date: string; reason?: string }[]),
  })
  const blocked = data ?? []
  const blockedSet = new Set(blocked.map(b => b.blocked_date.slice(0, 10)))

  const addMut = useMutation({
    mutationFn: (body: { blocked_date: string; reason?: string }) =>
      api.post('/api/availability/blocked', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['blocked-dates'] }); setReason('') },
    onError: () => toast.error('Erro ao bloquear data'),
  })

  const delMut = useMutation({
    mutationFn: (date: string) => api.delete(`/api/availability/blocked/${date}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blocked-dates'] }),
    onError: () => toast.error('Erro ao remover bloqueio'),
  })

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  // days in month grid
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  function handleDayClick(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (blockedSet.has(dateStr)) {
      delMut.mutate(dateStr)
      if (selected === dateStr) setSelected(null)
    } else {
      setSelected(dateStr)
    }
  }

  function confirmBlock() {
    if (!selected) return
    addMut.mutate({ blocked_date: selected, reason: reason.trim() || undefined })
    setSelected(null)
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

  return (
    <div className="space-y-4">
      {/* Calendar */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <button onClick={prevMonth} className="p-1 rounded-lg text-t3 hover:text-t1 hover:bg-raised transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-t1">{MONTHS[month]} {year}</span>
          <button onClick={nextMonth} className="p-1 rounded-lg text-t3 hover:text-t1 hover:bg-raised transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Week day labels */}
        <div className="grid grid-cols-7 px-2 pt-2">
          {WEEK_DAYS.map((d, i) => (
            <div key={i} className="text-center text-[10px] font-mono text-t3 py-1">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-0.5 px-2 pb-3">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const isBlocked  = blockedSet.has(dateStr)
            const isSelected = selected === dateStr
            const isToday    = dateStr === todayStr
            const isPast     = dateStr < todayStr

            return (
              <button
                key={i}
                onClick={() => !isPast && handleDayClick(day)}
                disabled={isPast}
                className={cn(
                  'aspect-square flex items-center justify-center rounded-lg text-xs font-mono transition-all',
                  isPast  && 'opacity-30 cursor-not-allowed text-t3',
                  !isPast && !isBlocked && !isSelected && 'hover:bg-raised text-t2 cursor-pointer',
                  isToday && !isBlocked && !isSelected && 'ring-1 ring-brand-500/40 text-brand-400',
                  isSelected && 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40',
                  isBlocked  && 'bg-red-500/15 text-red-400 line-through',
                )}
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>

      {/* Confirm block panel */}
      {selected && (
        <div className="rounded-xl border px-4 py-3 space-y-3" style={{ borderColor: 'rgba(245,158,11,.3)', background: 'rgba(245,158,11,.06)' }}>
          <p className="text-sm font-medium text-amber-300">
            Bloquear {new Date(selected + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}?
          </p>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Motivo (opcional): folga, feriado, viagem..."
            className="w-full rounded-lg px-3 py-2 text-sm text-t1 focus:outline-none"
            style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
          />
          <div className="flex gap-2">
            <button onClick={() => setSelected(null)} className="flex-1 py-2 rounded-lg border text-sm text-t2 hover:text-t1 transition-colors" style={{ borderColor: 'var(--border)' }}>
              Cancelar
            </button>
            <button onClick={confirmBlock} className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors">
              Confirmar bloqueio
            </button>
          </div>
        </div>
      )}

      {/* Blocked list */}
      {blocked.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-t3 uppercase tracking-wider">Dias bloqueados</p>
          {blocked.map(b => (
            <div key={b.id} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
              <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-t1 font-mono">
                  {new Date(b.blocked_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                {b.reason && <span className="text-xs text-t3 ml-2">· {b.reason}</span>}
              </div>
              <button
                onClick={() => delMut.mutate(b.blocked_date.slice(0, 10))}
                className="p-1 rounded text-t3 hover:text-red-400 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function DisponibilidadePage() {
  const qc = useQueryClient()
  const [days, setDays] = useState<DayConfig[]>([])
  const [dirty, setDirty] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['availability'],
    queryFn: () => api.get('/api/availability').then(r => r.data.availability as DayConfig[]),
  })

  useEffect(() => {
    if (data) { setDays(data); setDirty(false) }
  }, [data])

  const saveMut = useMutation({
    mutationFn: (availability: DayConfig[]) =>
      api.put('/api/availability', { availability }).then(r => r.data),
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

  function toggleBreak(idx: number) {
    const day = days[idx]
    if (day.break_start) {
      update(idx, { break_start: null, break_end: null })
    } else {
      update(idx, { break_start: '12:00', break_end: '13:00' })
    }
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
    <div className="p-6 max-w-2xl mx-auto space-y-8">

      {/* ── Semana ── */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-t1">Disponibilidade</h1>
            <p className="text-sm text-t3 mt-0.5">
              Configure os dias, horários e pausas. A assistente usa isso para agendar consultas.
            </p>
          </div>
          <button
            onClick={() => saveMut.mutate(days)}
            disabled={!dirty || saveMut.isPending}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              dirty ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-sm' : 'bg-raised text-t3 cursor-not-allowed',
            )}
          >
            {saveMut.isPending
              ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <CheckCircle className="w-4 h-4" />}
            {dirty ? 'Salvar' : 'Salvo'}
          </button>
        </div>

        <div className="flex items-start gap-2.5 bg-brand-500/8 border border-brand-500/20 rounded-xl px-4 py-3">
          <Info className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
          <p className="text-sm text-t2">
            <span className="font-medium text-brand-400">{activeDays} {activeDays === 1 ? 'dia ativo' : 'dias ativos'}</span>
            {' '}configurados. A pausa impede agendamentos no horário de almoço.
          </p>
        </div>

        <div className="space-y-2">
          {days.map((day, idx) => (
            <div
              key={day.day_of_week}
              className={cn(
                'rounded-xl border transition-all overflow-hidden',
                day.is_active ? 'bg-surface border-border' : 'bg-surface/50 border-border/40'
              )}
            >
              {/* Linha principal */}
              <div className="flex items-center gap-3 px-4 py-3">
                <span className={cn(
                  'w-8 text-center font-mono text-xs font-semibold rounded-md py-1 flex-shrink-0',
                  day.is_active ? 'bg-brand-500/15 text-brand-400' : 'bg-raised text-t3'
                )}>
                  {DAY_ABBR[day.day_of_week]}
                </span>

                <span className={cn('flex-1 text-sm font-medium', day.is_active ? 'text-t1' : 'text-t3')}>
                  {day.label}
                </span>

                {day.is_active ? (
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <TimeInput value={day.start_time} onChange={v => update(idx, { start_time: v })} />
                    <span className="text-t3 text-sm">–</span>
                    <TimeInput value={day.end_time}   onChange={v => update(idx, { end_time: v })} />
                    <select
                      value={day.slot_duration}
                      onChange={e => update(idx, { slot_duration: Number(e.target.value) })}
                      className="bg-raised border border-border rounded-lg px-2 py-2 text-sm text-t2 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    >
                      {SLOT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                ) : (
                  <span className="text-xs text-t3 mr-2">Indisponível</span>
                )}

                <Toggle checked={day.is_active} onChange={v => update(idx, { is_active: v })} />
              </div>

              {/* Linha de pausa (só se ativo) */}
              {day.is_active && (
                <div className="flex items-center gap-3 px-4 py-2.5" style={{ borderTop: '1px solid var(--border)', background: 'var(--raised)' }}>
                  <span className="text-xs text-t3 w-8 text-center flex-shrink-0">⏸</span>
                  <span className="text-xs text-t3 flex-1">Pausa</span>

                  {day.break_start ? (
                    <div className="flex items-center gap-2">
                      <TimeInput
                        value={day.break_start}
                        onChange={v => update(idx, { break_start: v })}
                      />
                      <span className="text-t3 text-sm">–</span>
                      <TimeInput
                        value={day.break_end ?? ''}
                        onChange={v => update(idx, { break_end: v })}
                      />
                      <button
                        type="button"
                        onClick={() => toggleBreak(idx)}
                        className="p-1.5 rounded-lg text-t3 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleBreak(idx)}
                      className="flex items-center gap-1.5 text-xs text-t3 hover:text-brand-400 transition-colors px-2 py-1 rounded-lg hover:bg-brand-500/10"
                    >
                      <Plus className="w-3 h-3" />
                      Adicionar pausa
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Datas bloqueadas ── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-t1">Dias sem atendimento</h2>
          <p className="text-sm text-t3 mt-0.5">
            Clique em um dia para bloqueá-lo. A IA não vai oferecer agendamentos nessas datas.
          </p>
        </div>
        <BlockedCalendar />
      </div>

      <p className="text-xs text-t3 text-center">
        Feriados nacionais <strong>não</strong> são bloqueados automaticamente — adicione manualmente acima.
      </p>
    </div>
  )
}
