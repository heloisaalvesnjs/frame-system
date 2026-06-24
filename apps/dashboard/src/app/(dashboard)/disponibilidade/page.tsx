'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Clock, MapPin, Video, ChevronLeft, ChevronRight, X,
  Loader2, Save, Coffee, Trash2, ChevronDown, ChevronUp, CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { Badge, Btn, Card, SectionTitle } from '@/components/ui/finance-primitives'

// ─── Types ────────────────────────────────────────────────
interface DayConfig {
  day_of_week:   number
  label:         string
  abbr:          string
  is_active:     boolean
  start_time:    string
  end_time:      string
  has_break:     boolean
  break_start:   string
  break_end:     string
  slot_duration: number
  location_id:   string | null
}
interface DayConfigApi {
  day_of_week:   number
  is_active:     boolean
  start_time:    string
  end_time:      string
  slot_duration: number
  break_start:   string | null
  break_end:     string | null
  location_id:   string | null
}
interface Location {
  id: string; name: string; city?: string; address?: string; color?: string
  modality?: string; price?: string; payment_info?: string
  deposit_required?: boolean; deposit_amount?: string; confirmation_message?: string
}

const DAYS_META = [
  { day_of_week: 1, label: 'Segunda-feira', abbr: 'Seg' },
  { day_of_week: 2, label: 'Terça-feira',   abbr: 'Ter' },
  { day_of_week: 3, label: 'Quarta-feira',  abbr: 'Qua' },
  { day_of_week: 4, label: 'Quinta-feira',  abbr: 'Qui' },
  { day_of_week: 5, label: 'Sexta-feira',   abbr: 'Sex' },
  { day_of_week: 6, label: 'Sábado',        abbr: 'Sáb' },
  { day_of_week: 0, label: 'Domingo',       abbr: 'Dom' },
]
const SLOT_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 50, label: '50 min' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1h 30'  },
  { value: 120, label: '2 horas' },
]
const MONTHS    = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const WEEK_DAYS = ['D','S','T','Q','Q','S','S']
const LOCATION_COLORS = ['#00c27c','#6366f1','#f59e0b','#ec4899','#3b82f6','#10b981','#f97316']

function apiToConfig(d: DayConfigApi): Omit<DayConfig, 'label' | 'abbr'> {
  return {
    day_of_week:   d.day_of_week,
    is_active:     d.is_active,
    start_time:    d.start_time?.slice(0, 5) ?? '08:00',
    end_time:      d.end_time?.slice(0, 5)   ?? '18:00',
    has_break:     !!(d.break_start && d.break_end),
    break_start:   d.break_start?.slice(0, 5) ?? '12:00',
    break_end:     d.break_end?.slice(0, 5)   ?? '13:00',
    slot_duration: d.slot_duration ?? 60,
    location_id:   d.location_id ?? null,
  }
}
function configToApi(d: DayConfig): DayConfigApi {
  return {
    day_of_week:   d.day_of_week,
    is_active:     d.is_active,
    start_time:    d.start_time,
    end_time:      d.end_time,
    slot_duration: d.slot_duration,
    break_start:   d.has_break ? d.break_start : null,
    break_end:     d.has_break ? d.break_end   : null,
    location_id:   d.location_id ?? null,
  }
}

const DEFAULT_DAYS: DayConfig[] = DAYS_META.map(m => ({
  ...m,
  is_active:     m.day_of_week >= 1 && m.day_of_week <= 5,
  start_time:    '08:00',
  end_time:      '18:00',
  has_break:     false,
  break_start:   '12:00',
  break_end:     '13:00',
  slot_duration: 60,
  location_id:   null,
}))

// ─── helpers ─────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-all"
      style={{ background: checked ? 'var(--brand)' : 'var(--bg-surface)', border: checked ? 'none' : '1px solid var(--line-2)' }}>
      <span className="absolute top-0.5 inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }} />
    </button>
  )
}

function TimeInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-[10px] text-3 uppercase tracking-wider font-mono">{label}</span>}
      <input type="time" value={value} onChange={e => onChange(e.target.value)}
        className="rounded-lg px-2.5 py-2 text-sm font-mono text-1 focus:outline-none w-[100px]"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line-2)' }} />
    </div>
  )
}

function timeRanges(day: DayConfig): string[] {
  if (!day.is_active) return []
  if (day.has_break) return [`${day.start_time} – ${day.break_start}`, `${day.break_end} – ${day.end_time}`]
  return [`${day.start_time} – ${day.end_time}`]
}

// ─── Day Row (Lovable flat style, expands to edit) ─────
function DayRow({
  day, onChange, locations,
}: {
  day: DayConfig
  onChange: (p: Partial<DayConfig>) => void
  locations: Location[]
}) {
  const [open, setOpen] = useState(false)
  const ranges = timeRanges(day)
  const selectedLoc = locations.find(l => l.id === day.location_id)

  return (
    <div>
      <div className="flex items-center gap-4 py-3.5 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className="w-28 text-[13px] font-medium text-1 shrink-0">{day.label.split('-')[0]}</div>
        <div className="flex-1 flex flex-wrap gap-1.5 items-center">
          {ranges.length === 0 ? (
            <span className="text-[12px] text-3 italic">Folga</span>
          ) : (
            <>
              {ranges.map((r, i) => (
                <span key={i} className="text-[11.5px] font-mono tabular-nums px-2.5 py-1 rounded-md inline-flex items-center gap-1.5"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--line-1)', color: 'var(--text-1)' }}>
                  <Clock className="w-3 h-3" style={{ color: 'var(--brand)' }} /> {r}
                </span>
              ))}
              {selectedLoc && (
                <span className="text-[11.5px] px-2.5 py-1 rounded-md inline-flex items-center gap-1.5"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--line-1)', color: 'var(--text-2)' }}>
                  {selectedLoc.modality === 'online'
                    ? <Video className="w-3 h-3" style={{ color: selectedLoc.color ?? 'var(--brand)' }} />
                    : <MapPin className="w-3 h-3" style={{ color: selectedLoc.color ?? 'var(--brand)' }} />}
                  {selectedLoc.name}
                </span>
              )}
            </>
          )}
        </div>
        <Badge variant={day.is_active ? 'success' : 'default'}>{day.is_active ? 'Ativo' : 'Folga'}</Badge>
        {open ? <ChevronUp className="w-4 h-4 text-3 shrink-0" /> : <ChevronDown className="w-4 h-4 text-3 shrink-0" />}
      </div>

      {open && (
        <div className="pb-4 pt-2 pl-32" style={{ borderTop: '1px solid var(--line-1)' }}>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className="text-[12px] text-2 shrink-0">Ativo</span>
            <Toggle checked={day.is_active} onChange={v => onChange({ is_active: v })} />
          </div>
          {day.is_active && (
            <>
              <div className="flex items-end gap-3 flex-wrap">
                <TimeInput label="Início" value={day.start_time} onChange={v => onChange({ start_time: v })} />
                <span className="text-2 text-sm mb-2">–</span>
                <TimeInput label="Fim" value={day.end_time} onChange={v => onChange({ end_time: v })} />
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-3 uppercase tracking-wider font-mono">Pausa almoço</span>
                  <div className="flex items-center gap-2 h-[38px]">
                    <Toggle checked={day.has_break} onChange={v => onChange({ has_break: v })} />
                    <Coffee className={cn('w-3.5 h-3.5', day.has_break ? 'text-amber-400' : 'text-3')} />
                  </div>
                </div>
                {day.has_break && (
                  <>
                    <TimeInput label="Início pausa" value={day.break_start} onChange={v => onChange({ break_start: v })} />
                    <span className="text-2 text-sm mb-2">–</span>
                    <TimeInput label="Fim pausa" value={day.break_end} onChange={v => onChange({ break_end: v })} />
                  </>
                )}
                <div className="flex flex-col gap-1 ml-auto">
                  <span className="text-[10px] text-3 uppercase tracking-wider font-mono">Duração</span>
                  <select value={day.slot_duration} onChange={e => onChange({ slot_duration: Number(e.target.value) })}
                    className="h-[38px] rounded-lg px-3 text-sm text-1 focus:outline-none"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line-2)' }}>
                    {SLOT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              {locations.length > 0 && (
                <div className="mt-3 flex flex-col gap-1">
                  <span className="text-[10px] text-3 uppercase tracking-wider font-mono">Local de atendimento neste dia</span>
                  <select
                    value={day.location_id ?? ''}
                    onChange={e => onChange({ location_id: e.target.value || null })}
                    className="h-[38px] rounded-lg px-3 text-sm text-1 focus:outline-none max-w-xs"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line-2)' }}
                  >
                    <option value="">— Sem local definido —</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.modality === 'online' ? '🌐' : '📍'} {l.name}{l.city ? ` · ${l.city}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-3 mt-0.5">
                    A IA usa essa informação para oferecer o local correto ao agendar neste dia.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Month Calendar (multi-select) ─────────────────────
function MonthCalendar({ year, month, blockedSet, overridesMap, selectedDates, onToggle, onPrev, onNext }:{
  year: number; month: number
  blockedSet: Set<string>
  overridesMap: Map<string, string>
  selectedDates: Set<string>
  onToggle: (dateStr: string) => void
  onPrev: () => void; onNext: () => void
}) {
  const today    = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={onPrev} className="w-8 h-8 rounded-lg grid place-items-center text-2 hover:bg-[var(--bg-surface)]">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-[13px] font-semibold text-1 tracking-tight">{MONTHS[month]} {year}</div>
        <button onClick={onNext} className="w-8 h-8 rounded-lg grid place-items-center text-2 hover:bg-[var(--bg-surface)]">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {WEEK_DAYS.map((d, i) => (
          <div key={i} className="text-center text-[10.5px] font-semibold uppercase tracking-wider text-3 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const dateStr        = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isBlocked      = blockedSet.has(dateStr)
          const hasLocOverride = overridesMap.has(dateStr)
          const isSelected     = selectedDates.has(dateStr)
          const isToday        = dateStr === todayStr
          const isPast         = dateStr < todayStr
          return (
            <button key={i} onClick={() => !isPast && onToggle(dateStr)} disabled={isPast}
              className={cn(
                'relative aspect-square rounded-lg text-[12.5px] font-medium transition-all border',
                isPast && 'opacity-30 cursor-not-allowed',
                isBlocked && !isSelected && 'line-through',
              )}
              style={
                isSelected
                  ? { background: '#013F32', color: '#E7FE25', borderColor: '#013F32', fontWeight: 700, boxShadow: '0 0 0 2px #E7FE2544' }
                  : isBlocked
                  ? { background: 'color-mix(in oklab, var(--danger) 12%, transparent)', color: 'var(--danger)', borderColor: 'color-mix(in oklab, var(--danger) 25%, transparent)' }
                  : hasLocOverride
                  ? { background: 'color-mix(in oklab, var(--brand) 10%, transparent)', color: 'var(--brand)', borderColor: 'var(--brand-ring)', fontWeight: 600 }
                  : isToday
                  ? { background: 'var(--brand-soft)', color: 'var(--brand)', borderColor: 'var(--brand-ring)', fontWeight: 600 }
                  : { background: 'var(--bg-elevated)', borderColor: 'var(--line-1)', color: 'var(--text-1)' }
              }>
              {day}
              {!isSelected && isBlocked      && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--danger)]" />}
              {!isSelected && hasLocOverride && !isBlocked && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--brand)]" />}
            </button>
          )
        })}
      </div>
      <div className="mt-4 flex items-center gap-4 text-[11px] text-3 flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded" style={{ background: '#013F32' }} /> Selecionado</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded" style={{ background: 'color-mix(in oklab, var(--danger) 12%, transparent)' }} /> Bloqueado</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded" style={{ background: 'color-mix(in oklab, var(--brand) 10%, transparent)', border: '1px solid var(--brand-ring)' }} /> Local definido</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-[var(--bg-elevated)] border border-[var(--line-2)]" /> Disponível</span>
      </div>
    </div>
  )
}

// ─── Location card (Lovable style, expands to edit) ────
function LocationCard({ loc, onSave, onDelete }: {
  loc: Partial<Location> & { _new?: boolean }
  onSave: (data: Partial<Location>) => Promise<void>
  onDelete?: () => void
}) {
  const [open, setOpen] = useState(loc._new ?? false)
  const [form, setForm] = useState<Partial<Location>>({
    name: loc.name ?? '', city: loc.city ?? '', address: loc.address ?? '',
    color: loc.color ?? '#00c27c', modality: loc.modality ?? 'presencial',
    price: loc.price ?? '', payment_info: loc.payment_info ?? '',
    deposit_required: loc.deposit_required ?? false, deposit_amount: loc.deposit_amount ?? '',
    confirmation_message: loc.confirmation_message ?? '',
  })
  const [saving, setSaving] = useState(false)

  function set(field: keyof Location, value: any) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSave() {
    if (!form.name?.trim()) { toast.error('Nome obrigatório'); return }
    setSaving(true)
    try { await onSave({ ...loc, ...form }); setOpen(false) }
    finally { setSaving(false) }
  }

  const isOnline = form.modality === 'online'
  const Icon = isOnline ? Video : MapPin
  const iconColor = form.color ?? '#00c27c'

  if (!open) {
    return (
      <div className="p-5 rounded-2xl border transition hover:border-[var(--line-2)]"
        style={{ background: 'var(--bg-base)', borderColor: 'var(--line-1)' }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0"
            style={{ background: 'var(--bg-elevated)', color: iconColor, border: '1px solid var(--line-1)' }}>
            <Icon className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold text-1">
                {form.name || <span className="italic text-3">Novo local</span>}
              </h3>
              <Badge variant={isOnline ? 'info' : 'success'}>
                {form.modality === 'online' ? 'Online' : form.modality === 'ambos' ? 'Ambos' : 'Presencial'}
              </Badge>
            </div>
            <p className="text-[12px] text-3 mt-0.5">
              {[form.address, form.city].filter(Boolean).join(' · ') || 'Sem endereço'}
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          {onDelete && (
            <Btn variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5" />
            </Btn>
          )}
          <Btn variant="ghost" size="sm" onClick={() => setOpen(true)}>Editar</Btn>
          <Btn variant="outline" size="sm" onClick={() => setOpen(true)}>Horários</Btn>
        </div>
      </div>
    )
  }

  return (
    <div className="p-5 rounded-2xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--brand-ring)' }}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-1">Editar local</span>
          <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-md grid place-items-center text-3 hover:bg-[var(--bg-surface)] hover:text-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-[11.5px] text-3 mb-1 block">Nome</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Consultório Centro SP"
              className="w-full h-9 px-3 rounded-lg text-[13px] text-1 outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-ring)]"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--line-2)' }} />
          </div>
          <div>
            <label className="text-[11.5px] text-3 mb-1 block">Cidade</label>
            <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="São Paulo"
              className="w-full h-9 px-3 rounded-lg text-[13px] text-1 outline-none"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--line-2)' }} />
          </div>
          <div>
            <label className="text-[11.5px] text-3 mb-1 block">Modalidade</label>
            <select value={form.modality} onChange={e => set('modality', e.target.value)}
              className="w-full h-9 px-3 rounded-lg text-[13px] text-1 outline-none"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--line-2)' }}>
              <option value="presencial">Presencial</option>
              <option value="online">Online</option>
              <option value="ambos">Ambos</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-[11.5px] text-3 mb-1 block">Endereço</label>
            <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Rua das Flores, 100 — Sala 5"
              className="w-full h-9 px-3 rounded-lg text-[13px] text-1 outline-none"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--line-2)' }} />
          </div>
          <div>
            <label className="text-[11.5px] text-3 mb-1 block">Valor</label>
            <input value={form.price} onChange={e => set('price', e.target.value)} placeholder="R$ 250,00"
              className="w-full h-9 px-3 rounded-lg text-[13px] text-1 outline-none"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--line-2)' }} />
          </div>
          <div>
            <label className="text-[11.5px] text-3 mb-1 block">Cor na agenda</label>
            <div className="flex gap-1.5 flex-wrap pt-1">
              {LOCATION_COLORS.map(c => (
                <button key={c} type="button" onClick={() => set('color', c)}
                  className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ background: c, borderColor: form.color === c ? 'white' : 'transparent', outline: form.color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Btn variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancelar</Btn>
          <Btn variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Salvar local
          </Btn>
        </div>
      </div>
    </div>
  )
}

interface DateOverride {
  id: string; date: string; location_id: string | null
  location_name?: string; modality?: string; color?: string
}

interface SchedulingRules {
  buffer_between_minutes:  number
  min_advance_hours:        number
  max_appointments_per_day: number
}

// ─── Modal de configuração de data ────────────────────────
function DayConfigModal({
  dateStr, isBlocked, override, locations, reason, setReason,
  onBlock, onUnblock, onSetLocation, onRemoveLocation, onClose,
}: {
  dateStr: string; isBlocked: boolean; override: DateOverride | null
  locations: Location[]; reason: string; setReason: (v: string) => void
  onBlock: () => void; onUnblock: () => void
  onSetLocation: (locId: string | null) => void
  onRemoveLocation: () => void; onClose: () => void
}) {
  const [mode, setMode] = useState<'block' | 'location'>(isBlocked ? 'block' : override ? 'location' : 'block')
  const [locId, setLocId] = useState<string>(override?.location_id ?? '')

  const d = new Date(dateStr + 'T12:00:00')
  const label = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-sm rounded-2xl p-5 shadow-xl" style={{ background: 'var(--bg-base)', border: '1px solid var(--line-1)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[14px] font-semibold text-1 capitalize">{label}</div>
            <div className="text-[11.5px] text-3 mt-0.5">O que deseja configurar para este dia?</div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-md grid place-items-center text-3 hover:text-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(['block', 'location'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className="flex-1 py-2 rounded-xl text-[12.5px] font-semibold transition-colors"
              style={mode === m
                ? { background: 'var(--brand-soft)', color: 'var(--brand)', border: '1px solid var(--brand-ring)' }
                : { background: 'var(--bg-elevated)', color: 'var(--text-3)', border: '1px solid var(--line-1)' }}>
              {m === 'block' ? '🚫 Bloquear' : '📍 Local'}
            </button>
          ))}
        </div>

        {mode === 'block' && (
          <div className="space-y-3">
            {isBlocked ? (
              <>
                <p className="text-[13px] text-2">Este dia está bloqueado.</p>
                <div className="flex gap-2">
                  <Btn variant="ghost" size="sm" onClick={onClose} className="flex-1">Cancelar</Btn>
                  <Btn variant="danger" size="sm" onClick={onUnblock} className="flex-1">Desbloquear</Btn>
                </div>
              </>
            ) : (
              <>
                <input type="text" value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="Motivo (opcional): folga, feriado…"
                  className="w-full rounded-lg px-3 py-2 text-[13px] text-1 outline-none"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line-2)' }} />
                <div className="flex gap-2">
                  <Btn variant="ghost" size="sm" onClick={onClose} className="flex-1">Cancelar</Btn>
                  <Btn variant="primary" size="sm" onClick={onBlock} className="flex-1">Bloquear dia</Btn>
                </div>
              </>
            )}
          </div>
        )}

        {mode === 'location' && (
          <div className="space-y-3">
            <p className="text-[12px] text-3">Define o local de atendimento para esta data específica, substituindo o padrão da semana.</p>
            <select value={locId} onChange={e => setLocId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl text-[13px] text-1 outline-none"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line-2)' }}>
              <option value="">— Usar padrão da semana —</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>
                  {l.modality === 'online' ? '🌐' : '📍'} {l.name}{l.city ? ` · ${l.city}` : ''}
                </option>
              ))}
            </select>
            {override && (
              <p className="text-[11.5px] text-3">Atual: <strong className="text-1">{override.location_name || '—'}</strong></p>
            )}
            <div className="flex gap-2">
              <Btn variant="ghost" size="sm" onClick={onClose} className="flex-1">Cancelar</Btn>
              {override && !locId && (
                <Btn variant="ghost" size="sm" onClick={onRemoveLocation} className="flex-1">Remover</Btn>
              )}
              <Btn variant="primary" size="sm" onClick={() => onSetLocation(locId || null)} className="flex-1" disabled={!locId && !override}>
                Confirmar
              </Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────
export default function DisponibilidadePage() {
  const qc = useQueryClient()
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [actionMode, setActionMode]       = useState<'block' | 'location'>('location')
  const [actionLocId, setActionLocId]     = useState<string>('')
  const [reason, setReason]               = useState('')
  const [modalDate, setModalDate]         = useState<string | null>(null)

  function toggleDate(dateStr: string) {
    setSelectedDates(prev => {
      const next = new Set(prev)
      next.has(dateStr) ? next.delete(dateStr) : next.add(dateStr)
      return next
    })
  }
  function clearSelection() { setSelectedDates(new Set()); setReason(''); setActionLocId('') }
  const [days, setDays] = useState<DayConfig[]>(DEFAULT_DAYS)
  const [dirty, setDirty] = useState(false)
  const [newLocItems, setNewLocItems] = useState<{ id: string }[]>([])
  const [rules, setRules] = useState<SchedulingRules>({ buffer_between_minutes: 10, min_advance_hours: 3, max_appointments_per_day: 8 })
  const [rulesDirty, setRulesDirty] = useState(false)

  // availability
  const { data: availData, isLoading } = useQuery({
    queryKey: ['availability'],
    queryFn: () => api.get('/api/availability').then(r => r.data.availability as DayConfigApi[]),
  })
  useEffect(() => {
    if (availData) {
      setDays(DAYS_META.map(m => {
        const found = availData.find(d => d.day_of_week === m.day_of_week)
        if (found) return { ...m, ...apiToConfig(found) }
        return { ...m, is_active: false, start_time: '08:00', end_time: '18:00', has_break: false, break_start: '12:00', break_end: '13:00', slot_duration: 60, location_id: null }
      }))
      setDirty(false)
    }
  }, [availData])

  // scheduling rules
  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get('/api/nutritionists/profile').then(r => r.data),
  })
  useEffect(() => {
    if (profileData) {
      setRules({
        buffer_between_minutes:  profileData.buffer_between_minutes  ?? 10,
        min_advance_hours:        profileData.min_advance_hours        ?? 3,
        max_appointments_per_day: profileData.max_appointments_per_day ?? 8,
      })
      setRulesDirty(false)
    }
  }, [profileData])

  const saveRulesMut = useMutation({
    mutationFn: (r: SchedulingRules) => api.put('/api/nutritionists/scheduling-rules', r),
    onSuccess: () => { toast.success('Regras salvas!'); setRulesDirty(false); qc.invalidateQueries({ queryKey: ['profile'] }) },
    onError: () => toast.error('Erro ao salvar regras'),
  })

  function patchRule(field: keyof SchedulingRules, val: number) {
    setRules(r => ({ ...r, [field]: val }))
    setRulesDirty(true)
  }

  const saveMut = useMutation({
    mutationFn: (d: DayConfig[]) => api.put('/api/availability', { availability: d.map(configToApi) }),
    onSuccess: () => { toast.success('Horários salvos!'); setDirty(false); qc.invalidateQueries({ queryKey: ['availability'] }) },
    onError: () => toast.error('Erro ao salvar'),
  })

  function updateDay(idx: number, patch: Partial<DayConfig>) {
    setDays(prev => { const next = [...prev]; next[idx] = { ...next[idx], ...patch }; return next })
    setDirty(true)
  }

  // blocked dates
  const { data: blockedData } = useQuery({
    queryKey: ['blocked-dates'],
    queryFn: () => api.get('/api/availability/blocked').then(r => r.data.blocked as { id: string; blocked_date: string; reason?: string }[]),
  })
  const blocked = blockedData ?? []
  const blockedSet = new Set(blocked.map(b => b.blocked_date.slice(0, 10)))

  const addBlockMut = useMutation({
    mutationFn: (body: { blocked_date: string; reason?: string }) => api.post('/api/availability/blocked', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blocked-dates'] }),
  })
  const delBlockMut = useMutation({
    mutationFn: (date: string) => api.delete(`/api/availability/blocked/${date}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['blocked-dates'] }); setModalDate(null) },
  })

  // date-location overrides
  const { data: overridesData } = useQuery({
    queryKey: ['date-locations'],
    queryFn: () => api.get('/api/availability/date-locations').then(r => r.data.overrides as DateOverride[]),
  })
  const overrides = overridesData ?? []
  const overridesMap = new Map(overrides.map(o => [o.date.slice(0, 10), o.location_name ?? '']))

  const setLocOverrideMut = useMutation({
    mutationFn: (body: { date: string; location_id: string | null }) => api.post('/api/availability/date-locations', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['date-locations'] }),
  })
  const delLocOverrideMut = useMutation({
    mutationFn: (date: string) => api.delete(`/api/availability/date-locations/${date}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['date-locations'] }); setModalDate(null) },
  })

  async function applyToSelected() {
    const dates = Array.from(selectedDates)
    if (actionMode === 'block') {
      await Promise.all(dates.map(d => addBlockMut.mutateAsync({ blocked_date: d, reason: reason.trim() || undefined })))
      toast.success(`${dates.length} dia(s) bloqueado(s)`)
    } else {
      if (!actionLocId) return toast.error('Selecione um local')
      await Promise.all(dates.map(d => setLocOverrideMut.mutateAsync({ date: d, location_id: actionLocId })))
      toast.success(`Local definido para ${dates.length} dia(s)`)
    }
    clearSelection()
  }

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 11) { setMonth(0);  setYear(y => y + 1) } else setMonth(m => m + 1) }

  // locations
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: () => api.get('/api/locations').then(r => r.data.locations ?? r.data),
  })
  const locSaveMut = useMutation({
    mutationFn: async (data: Partial<Location>) => {
      if (data.id && !String(data.id).startsWith('_new')) await api.put(`/api/locations/${data.id}`, data)
      else { const { id: _i, _new: _j, ...rest } = data as any; await api.post('/api/locations', rest) }
    },
    onSuccess: () => { toast.success('Local salvo!'); qc.invalidateQueries({ queryKey: ['locations'] }); setNewLocItems([]) },
    onError: () => toast.error('Erro ao salvar local'),
  })
  const locDelMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/locations/${id}`),
    onSuccess: () => { toast.success('Local removido'); qc.invalidateQueries({ queryKey: ['locations'] }) },
  })

  // derived rules
  const activeDays = days.filter(d => d.is_active)
  const commonSlot = activeDays.length > 0
    ? activeDays.map(d => d.slot_duration).sort((a, b) =>
        activeDays.filter(d => d.slot_duration === b).length - activeDays.filter(d => d.slot_duration === a).length)[0]
    : 60

  // upcoming blocked dates (next 30 days)
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
  const limit30 = new Date(today); limit30.setDate(limit30.getDate() + 30)
  const limit30Str = `${limit30.getFullYear()}-${String(limit30.getMonth()+1).padStart(2,'0')}-${String(limit30.getDate()).padStart(2,'0')}`
  const upcomingBlocked = blocked
    .filter(b => { const d = b.blocked_date.slice(0, 10); return d >= todayStr && d <= limit30Str })
    .sort((a, b) => a.blocked_date.localeCompare(b.blocked_date))
    .slice(0, 6)

  if (isLoading) return (
    <div className="mx-auto max-w-[1280px] px-8 py-8 flex justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--brand)' }} />
    </div>
  )

  return (
    <div className="mx-auto max-w-[1280px] px-8 py-8 space-y-6">
      {/* Sub-header */}
      <div className="flex items-center justify-between gap-4 flex-wrap -mt-2">
        <p className="text-[13px] text-2">Calendário, locais de atendimento e horários</p>
        <div className="flex items-center gap-2">
          <Btn variant="secondary" size="sm" onClick={async () => {
            try {
              // Verifica se já está conectado
              const { data: status } = await api.get('/api/google-calendar/status')
              if (!status.connected) {
                const { data } = await api.get('/api/google-calendar/auth-url')
                if (data.url) window.location.href = data.url
                return
              }
              // Já conectado — sincroniza agendamentos
              const { data: sync } = await api.post('/api/google-calendar/sync')
              if (sync.total === 0) {
                toast.success('Nenhum agendamento futuro para sincronizar.')
              } else if (sync.synced === 0) {
                toast.error(`Falha ao sincronizar (${sync.total} consulta(s) encontrada(s)). Verifique a conexão.`)
              } else {
                toast.success(`${sync.synced} de ${sync.total} consulta(s) enviada(s) ao Google Calendar!`)
              }
            } catch (e: any) {
              toast.error(e?.response?.data?.error ?? 'Erro ao sincronizar Google Calendar')
            }
          }}>Sincronizar Google</Btn>
          {selectedDates.size > 0 && (
            <Btn variant="ghost" size="sm" onClick={clearSelection}>Limpar seleção</Btn>
          )}
        </div>
      </div>

      {/* Calendário de bloqueios + Próximos bloqueios */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <SectionTitle title="Calendário" hint="Clique para selecionar dias, depois aplique bloqueio ou local" />
          <MonthCalendar
            year={year} month={month} blockedSet={blockedSet} overridesMap={overridesMap}
            selectedDates={selectedDates} onToggle={toggleDate}
            onPrev={prevMonth} onNext={nextMonth}
          />

          {/* Barra de ação para dias selecionados */}
          {selectedDates.size > 0 && (
            <div className="mt-4 pt-4 space-y-3" style={{ borderTop: '1px solid var(--line-1)' }}>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-1">{selectedDates.size} dia(s) selecionado(s)</span>
                <button onClick={clearSelection} className="text-[12px] text-3 hover:text-1">Limpar</button>
              </div>

              {/* Tabs ação */}
              <div className="flex gap-2">
                {(['location', 'block'] as const).map(m => (
                  <button key={m} onClick={() => setActionMode(m)}
                    className="flex-1 py-1.5 rounded-lg text-[12.5px] font-semibold transition-colors"
                    style={actionMode === m
                      ? { background: 'var(--brand-soft)', color: 'var(--brand)', border: '1px solid var(--brand-ring)' }
                      : { background: 'var(--bg-elevated)', color: 'var(--text-3)', border: '1px solid var(--line-1)' }}>
                    {m === 'location' ? '📍 Definir local' : '🚫 Bloquear'}
                  </button>
                ))}
              </div>

              {actionMode === 'location' && (
                <select value={actionLocId} onChange={e => setActionLocId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg text-[13px] text-1 outline-none"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line-2)' }}>
                  <option value="">— Selecione o local —</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.modality === 'online' ? '🌐' : '📍'} {l.name}{l.city ? ` · ${l.city}` : ''}
                    </option>
                  ))}
                </select>
              )}

              {actionMode === 'block' && (
                <input type="text" value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="Motivo (opcional): folga, feriado…"
                  className="w-full h-9 px-3 rounded-lg text-[13px] text-1 outline-none"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line-2)' }} />
              )}

              <Btn variant="primary" size="sm" className="w-full" onClick={applyToSelected}
                disabled={addBlockMut.isPending || setLocOverrideMut.isPending}>
                {(addBlockMut.isPending || setLocOverrideMut.isPending)
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : null}
                Aplicar para {selectedDates.size} dia(s)
              </Btn>
            </div>
          )}

          {/* Modal de 1 data (clique duplo / detalhes) */}
          {modalDate && (
            <DayConfigModal
              dateStr={modalDate}
              isBlocked={blockedSet.has(modalDate)}
              override={overrides.find(o => o.date.slice(0,10) === modalDate) ?? null}
              locations={locations}
              reason={reason} setReason={setReason}
              onBlock={() => addBlockMut.mutate({ blocked_date: modalDate, reason: reason.trim() || undefined })}
              onUnblock={() => delBlockMut.mutate(modalDate)}
              onSetLocation={(locId) => setLocOverrideMut.mutate({ date: modalDate, location_id: locId })}
              onRemoveLocation={() => delLocOverrideMut.mutate(modalDate)}
              onClose={() => { setModalDate(null); setReason('') }}
            />
          )}
        </Card>

        <Card>
          <SectionTitle title="Configurações por data" hint="Próximos 30 dias" />
          <div className="space-y-2">
            {upcomingBlocked.length === 0 && overrides.length === 0 && (
              <p className="text-[12px] text-3 py-4">Nenhuma configuração nos próximos 30 dias.</p>
            )}
            {upcomingBlocked.map(b => {
              const d = new Date(b.blocked_date + 'T12:00:00')
              const [mon, num] = [d.toLocaleDateString('pt-BR', { month: 'short' }), d.getDate()]
              return (
                <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--line-1)]">
                  <div className="text-center w-10 shrink-0">
                    <div className="text-[10px] text-3 uppercase font-semibold tracking-wider">{mon}</div>
                    <div className="text-[14px] font-bold text-1 tabular-nums leading-none">{num}</div>
                  </div>
                  <div className="w-px h-7 bg-[var(--line-1)]" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium truncate" style={{ color: 'var(--danger)' }}>🚫 {b.reason || 'Bloqueado'}</div>
                    <div className="text-[11px] text-3">Dia todo</div>
                  </div>
                  <button onClick={() => delBlockMut.mutate(b.blocked_date.slice(0, 10))}
                    className="w-7 h-7 grid place-items-center rounded-md text-3 hover:bg-[var(--bg-surface)] hover:text-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
            {overrides.slice(0, 6).map(o => {
              const d = new Date(o.date + 'T12:00:00')
              const [mon, num] = [d.toLocaleDateString('pt-BR', { month: 'short' }), d.getDate()]
              return (
                <div key={o.id} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--line-1)]">
                  <div className="text-center w-10 shrink-0">
                    <div className="text-[10px] text-3 uppercase font-semibold tracking-wider">{mon}</div>
                    <div className="text-[14px] font-bold text-1 tabular-nums leading-none">{num}</div>
                  </div>
                  <div className="w-px h-7 bg-[var(--line-1)]" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-1 truncate">
                      {o.modality === 'online' ? '🌐' : '📍'} {o.location_name || 'Local definido'}
                    </div>
                    <div className="text-[11px] text-3">Local específico</div>
                  </div>
                  <button onClick={() => delLocOverrideMut.mutate(o.date.slice(0, 10))}
                    className="w-7 h-7 grid place-items-center rounded-md text-3 hover:bg-[var(--bg-surface)] hover:text-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Locais de atendimento */}
      <Card>
        <SectionTitle title="Locais de atendimento" hint="Configure onde você atende e em quais dias"
          action={
            <Btn variant="outline" size="sm" onClick={() => setNewLocItems(prev => [...prev, { id: `_new_${Date.now()}` }])}>
              <Plus className="w-3.5 h-3.5" /> Novo local
            </Btn>
          } />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {locations.map(loc => (
            <LocationCard key={loc.id} loc={loc}
              onSave={data => locSaveMut.mutateAsync(data)}
              onDelete={() => locDelMut.mutate(loc.id)} />
          ))}
          {newLocItems.map(item => (
            <LocationCard key={item.id} loc={{ _new: true } as any}
              onSave={data => locSaveMut.mutateAsync(data)}
              onDelete={() => setNewLocItems(prev => prev.filter(n => n.id !== item.id))} />
          ))}
          {locations.length === 0 && newLocItems.length === 0 && (
            <div className="col-span-2 py-8 text-center text-[13px] text-3">
              Nenhum local cadastrado. Clique em "Novo local" para adicionar.
            </div>
          )}
        </div>
      </Card>

      {/* Horários da semana + Regras */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <SectionTitle title="Horários da semana" hint="Janelas em que a assistente pode agendar" />
            {dirty && (
              <Btn variant="primary" size="sm" onClick={() => saveMut.mutate(days)} disabled={saveMut.isPending}>
                {saveMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                Salvar
              </Btn>
            )}
          </div>
          <div className="divide-y divide-[var(--line-1)]">
            {days.map(day => {
              const idx = days.findIndex(d => d.day_of_week === day.day_of_week)
              return <DayRow key={day.day_of_week} day={day} onChange={patch => updateDay(idx, patch)} locations={locations} />
            })}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <SectionTitle title="Regras de agendamento" />
            {rulesDirty && (
              <Btn variant="primary" size="sm" onClick={() => saveRulesMut.mutate(rules)} disabled={saveRulesMut.isPending}>
                {saveRulesMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Salvar
              </Btn>
            )}
          </div>
          <div className="space-y-4 text-[13px]">
            <div className="flex justify-between items-center pb-3 border-b border-[var(--line-1)]">
              <span className="text-2">Duração padrão</span>
              <span className="text-1 font-semibold font-mono tabular-nums">{SLOT_OPTIONS.find(o => o.value === commonSlot)?.label ?? '—'}</span>
            </div>
            {([
              { key: 'buffer_between_minutes' as const,  label: 'Intervalo entre consultas', unit: 'min',  min: 0, max: 120 },
              { key: 'min_advance_hours' as const,        label: 'Antecedência mínima',       unit: 'h',    min: 0, max: 168 },
              { key: 'max_appointments_per_day' as const, label: 'Limite por dia',            unit: '/dia', min: 1, max: 50 },
            ] as const).map(({ key, label, unit, min, max }) => (
              <div key={key} className="flex justify-between items-center pb-3 border-b border-[var(--line-1)] last:border-0 last:pb-0">
                <span className="text-2">{label}</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={min} max={max}
                    value={rules[key]}
                    onChange={e => patchRule(key, Math.max(min, Math.min(max, Number(e.target.value))))}
                    className="w-16 h-7 px-2 rounded-md text-[13px] font-semibold font-mono tabular-nums text-1 text-right outline-none focus:border-[var(--brand)]"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line-2)' }}
                  />
                  <span className="text-3 text-[11px]">{unit}</span>
                </div>
              </div>
            ))}
            <div className="flex justify-between items-center">
              <span className="text-2">Antecedência máxima</span>
              <span className="text-1 font-semibold font-mono tabular-nums">60 dias</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
