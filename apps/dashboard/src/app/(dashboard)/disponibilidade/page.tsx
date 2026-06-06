'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, Plus, X, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────────
interface TimeSlot { start: string; end: string }

interface DayConfig {
  day_of_week:   number
  label:         string
  is_active:     boolean
  slots:         TimeSlot[]       // UI state: N slots
  slot_duration: number
}

// Persist format (API still uses start_time/end_time/break_start/break_end)
interface DayConfigApi {
  day_of_week:   number
  is_active:     boolean
  start_time:    string
  end_time:      string
  slot_duration: number
  break_start:   string | null
  break_end:     string | null
}

const DAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const DAY_ABBR   = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const SLOT_OPTIONS = [
  { value: 30,  label: '30 min' },
  { value: 45,  label: '45 min' },
  { value: 50,  label: '50 min' },
  { value: 60,  label: '1 hora' },
  { value: 90,  label: '1h 30'  },
  { value: 120, label: '2 horas'},
]
const MONTHS    = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const WEEK_DAYS = ['D','S','T','Q','Q','S','S']

// Converte API → UI: start/end/break → slots[]
function apiToSlots(d: DayConfigApi): TimeSlot[] {
  if (!d.is_active) return [{ start: d.start_time, end: d.end_time }]
  if (d.break_start && d.break_end) {
    return [
      { start: d.start_time,  end: d.break_start },
      { start: d.break_end,   end: d.end_time },
    ]
  }
  return [{ start: d.start_time, end: d.end_time }]
}

// Converte UI → API: slots[] → start/end/break
function slotsToApi(day: DayConfig): DayConfigApi {
  const s = day.slots.filter(sl => sl.start && sl.end)
  if (s.length === 0) {
    return { day_of_week: day.day_of_week, is_active: day.is_active, start_time: '08:00', end_time: '18:00', slot_duration: day.slot_duration, break_start: null, break_end: null }
  }
  if (s.length === 1) {
    return { day_of_week: day.day_of_week, is_active: day.is_active, start_time: s[0].start, end_time: s[0].end, slot_duration: day.slot_duration, break_start: null, break_end: null }
  }
  // 2+ slots: encode as start→break_start | break_end→end (use first and last)
  return {
    day_of_week:   day.day_of_week,
    is_active:     day.is_active,
    start_time:    s[0].start,
    end_time:      s[s.length - 1].end,
    slot_duration: day.slot_duration,
    break_start:   s[0].end,
    break_end:     s[s.length - 1].start,
  }
}

// ── Toggle ─────────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-all duration-200',
        checked ? 'bg-brand-500' : 'bg-zinc-600'
      )}
    >
      <span className={cn(
        'absolute top-0.5 inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200',
        checked ? 'translate-x-[18px]' : 'translate-x-0.5'
      )} />
    </button>
  )
}

// ── Day Card ───────────────────────────────────────────────────────────────────
function DayCard({
  day, onToggle, onAddSlot, onRemoveSlot, onUpdateSlot, onUpdateDuration
}: {
  day: DayConfig
  onToggle: () => void
  onAddSlot: () => void
  onRemoveSlot: (i: number) => void
  onUpdateSlot: (i: number, field: 'start' | 'end', v: string) => void
  onUpdateDuration: (v: number) => void
}) {
  return (
    <div className={cn(
      'rounded-xl border flex flex-col transition-all',
      day.is_active ? 'border-border bg-surface' : 'border-border/40 bg-surface/40'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: day.is_active ? '1px solid var(--border)' : undefined }}>
        <div className="flex items-center gap-2.5">
          <span className={cn(
            'w-9 h-9 flex items-center justify-center rounded-lg text-xs font-bold font-mono flex-shrink-0',
            day.is_active ? 'bg-brand-500/15 text-brand-400' : 'bg-raised text-t3'
          )}>
            {DAY_ABBR[day.day_of_week]}
          </span>
          <span className={cn('text-sm font-medium', day.is_active ? 'text-t1' : 'text-t3')}>
            {day.label}
          </span>
        </div>
        <Toggle checked={day.is_active} onChange={onToggle} />
      </div>

      {day.is_active && (
        <div className="px-4 py-3 space-y-3">
          {/* Slots */}
          {day.slots.map((slot, i) => (
            <div key={i} className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-t3 flex-shrink-0" />
              <input
                type="time"
                value={slot.start}
                onChange={e => onUpdateSlot(i, 'start', e.target.value)}
                className="flex-1 min-w-0 rounded-lg px-2 py-1.5 text-sm font-mono text-t1 focus:outline-none focus:ring-1 focus:ring-brand-500/40"
                style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
              />
              <span className="text-t3 text-xs flex-shrink-0">–</span>
              <input
                type="time"
                value={slot.end}
                onChange={e => onUpdateSlot(i, 'end', e.target.value)}
                className="flex-1 min-w-0 rounded-lg px-2 py-1.5 text-sm font-mono text-t1 focus:outline-none focus:ring-1 focus:ring-brand-500/40"
                style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
              />
              {day.slots.length > 1 && (
                <button
                  onClick={() => onRemoveSlot(i)}
                  className="p-1 text-t3 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}

          {/* Add slot + duration */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={onAddSlot}
              className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
            >
              <Plus className="w-3 h-3" /> Adicionar horário
            </button>
            <select
              value={day.slot_duration}
              onChange={e => onUpdateDuration(Number(e.target.value))}
              className="text-xs rounded-lg px-2 py-1 text-t2 focus:outline-none"
              style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
            >
              {SLOT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      )}

      {!day.is_active && (
        <div className="px-4 py-2">
          <p className="text-xs text-t3">Indisponível</p>
        </div>
      )}
    </div>
  )
}

// ── Blocked Calendar ───────────────────────────────────────────────────────────
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
    mutationFn: (body: { blocked_date: string; reason?: string }) => api.post('/api/availability/blocked', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['blocked-dates'] }); setReason('') },
    onError: () => toast.error('Erro ao bloquear data'),
  })
  const delMut = useMutation({
    mutationFn: (date: string) => api.delete(`/api/availability/blocked/${date}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blocked-dates'] }),
  })

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

  function handleDayClick(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (blockedSet.has(dateStr)) { delMut.mutate(dateStr); if (selected === dateStr) setSelected(null) }
    else setSelected(dateStr)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <button onClick={prevMonth} className="p-1 rounded-lg text-t3 hover:text-t1 hover:bg-raised transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-semibold text-t1">{MONTHS[month]} {year}</span>
          <button onClick={nextMonth} className="p-1 rounded-lg text-t3 hover:text-t1 hover:bg-raised transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-7 px-2 pt-2">
          {WEEK_DAYS.map((d, i) => <div key={i} className="text-center text-[10px] font-mono text-t3 py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-0.5 px-2 pb-3">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />
            const dateStr   = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const isBlocked  = blockedSet.has(dateStr)
            const isSelected = selected === dateStr
            const isPast     = dateStr < todayStr
            return (
              <button key={i} onClick={() => !isPast && handleDayClick(day)} disabled={isPast}
                className={cn(
                  'aspect-square flex items-center justify-center rounded-lg text-xs font-mono transition-all',
                  isPast && 'opacity-30 cursor-not-allowed text-t3',
                  !isPast && !isBlocked && !isSelected && 'hover:bg-raised text-t2 cursor-pointer',
                  dateStr === todayStr && !isBlocked && !isSelected && 'ring-1 ring-brand-500/40 text-brand-400',
                  isSelected && 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40',
                  isBlocked  && 'bg-red-500/15 text-red-400 line-through',
                )}
              >{day}</button>
            )
          })}
        </div>
      </div>

      {selected && (
        <div className="rounded-xl border px-4 py-3 space-y-3" style={{ borderColor: 'rgba(245,158,11,.3)', background: 'rgba(245,158,11,.06)' }}>
          <p className="text-sm font-medium text-amber-300">
            Bloquear {new Date(selected + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}?
          </p>
          <input type="text" value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Motivo (opcional): folga, feriado, viagem..."
            className="w-full rounded-lg px-3 py-2 text-sm text-t1 focus:outline-none"
            style={{ background: 'var(--raised)', border: '1px solid var(--border)' }} />
          <div className="flex gap-2">
            <button onClick={() => setSelected(null)} className="flex-1 py-2 rounded-lg border text-sm text-t2 hover:text-t1 transition-colors" style={{ borderColor: 'var(--border)' }}>Cancelar</button>
            <button onClick={() => { addMut.mutate({ blocked_date: selected, reason: reason.trim() || undefined }); setSelected(null) }}
              className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors">Confirmar</button>
          </div>
        </div>
      )}

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
              <button onClick={() => delMut.mutate(b.blocked_date.slice(0, 10))} className="p-1 rounded text-t3 hover:text-red-400 transition-colors">
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
    queryFn: () => api.get('/api/availability').then(r => r.data.availability as DayConfigApi[]),
  })

  useEffect(() => {
    if (data) {
      setDays(data.map(d => ({
        day_of_week:   d.day_of_week,
        label:         DAY_LABELS[d.day_of_week],
        is_active:     d.is_active,
        slot_duration: d.slot_duration,
        slots:         apiToSlots(d),
      })))
      setDirty(false)
    }
  }, [data])

  const saveMut = useMutation({
    mutationFn: (days: DayConfig[]) =>
      api.put('/api/availability', { availability: days.map(slotsToApi) }),
    onSuccess: () => { toast.success('Disponibilidade salva!'); setDirty(false); qc.invalidateQueries({ queryKey: ['availability'] }) },
    onError: () => toast.error('Erro ao salvar'),
  })

  function updateDay(idx: number, patch: Partial<DayConfig>) {
    setDays(prev => { const next = [...prev]; next[idx] = { ...next[idx], ...patch }; return next })
    setDirty(true)
  }

  function addSlot(idx: number) {
    const day = days[idx]
    const lastEnd = day.slots[day.slots.length - 1]?.end ?? '18:00'
    // Suggest next slot 1h after last end
    const [h, m] = lastEnd.split(':').map(Number)
    const newStart = `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    const newEnd   = `${String(h + 2).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    updateDay(idx, { slots: [...day.slots, { start: newStart, end: newEnd }] })
  }

  function removeSlot(dayIdx: number, slotIdx: number) {
    const day = days[dayIdx]
    if (day.slots.length <= 1) return
    updateDay(dayIdx, { slots: day.slots.filter((_, i) => i !== slotIdx) })
  }

  function updateSlot(dayIdx: number, slotIdx: number, field: 'start' | 'end', value: string) {
    const day = days[dayIdx]
    const slots = day.slots.map((s, i) => i === slotIdx ? { ...s, [field]: value } : s)
    updateDay(dayIdx, { slots })
  }

  const activeDays = days.filter(d => d.is_active).length

  if (isLoading) return (
    <div className="p-8 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // Split: work days (Mon-Fri) first, then weekend
  const workDays    = days.filter(d => d.day_of_week >= 1 && d.day_of_week <= 5)
  const weekendDays = days.filter(d => d.day_of_week === 0 || d.day_of_week === 6)

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-t1">Disponibilidade</h1>
          <p className="text-sm text-t3 mt-0.5">
            Configure os dias e horários. A assistente usa isso para agendar consultas.
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

      {activeDays > 0 && (
        <p className="text-sm text-brand-400 font-medium">
          {activeDays} {activeDays === 1 ? 'dia ativo' : 'dias ativos'}
        </p>
      )}

      {/* Days de semana — 5 colunas */}
      <div>
        <p className="text-xs font-mono text-t3 uppercase tracking-wider mb-3">Dias úteis</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {workDays.map((day, i) => {
            const globalIdx = days.findIndex(d => d.day_of_week === day.day_of_week)
            return (
              <DayCard
                key={day.day_of_week}
                day={day}
                onToggle={() => updateDay(globalIdx, { is_active: !day.is_active })}
                onAddSlot={() => addSlot(globalIdx)}
                onRemoveSlot={si => removeSlot(globalIdx, si)}
                onUpdateSlot={(si, f, v) => updateSlot(globalIdx, si, f, v)}
                onUpdateDuration={v => updateDay(globalIdx, { slot_duration: v })}
              />
            )
          })}
        </div>
      </div>

      {/* Fim de semana — 2 colunas */}
      <div>
        <p className="text-xs font-mono text-t3 uppercase tracking-wider mb-3">Fim de semana</p>
        <div className="grid grid-cols-2 gap-3 max-w-xs">
          {weekendDays.map(day => {
            const globalIdx = days.findIndex(d => d.day_of_week === day.day_of_week)
            return (
              <DayCard
                key={day.day_of_week}
                day={day}
                onToggle={() => updateDay(globalIdx, { is_active: !day.is_active })}
                onAddSlot={() => addSlot(globalIdx)}
                onRemoveSlot={si => removeSlot(globalIdx, si)}
                onUpdateSlot={(si, f, v) => updateSlot(globalIdx, si, f, v)}
                onUpdateDuration={v => updateDay(globalIdx, { slot_duration: v })}
              />
            )
          })}
        </div>
      </div>

      {/* Datas bloqueadas */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-t1">Dias sem atendimento</h2>
          <p className="text-sm text-t3 mt-0.5">Clique em um dia para bloqueá-lo. A IA não vai oferecer agendamentos nessas datas.</p>
        </div>
        <BlockedCalendar />
      </div>

      <p className="text-xs text-t3 text-center">
        Feriados nacionais <strong>não</strong> são bloqueados automaticamente — adicione manualmente acima.
      </p>
    </div>
  )
}
