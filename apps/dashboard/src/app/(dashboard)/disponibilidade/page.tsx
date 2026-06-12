'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, X, ChevronLeft, ChevronRight, Coffee, Trash2, ChevronDown, ChevronUp, Plus, Save, Loader2, MapPin, Clock } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { Btn } from '@/components/ui/finance-primitives'

// ── Types ──────────────────────────────────────────────────────────────────────
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
}

interface DayConfigApi {
  day_of_week:   number
  is_active:     boolean
  start_time:    string
  end_time:      string
  slot_duration: number
  break_start:   string | null
  break_end:     string | null
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
  { value: 30,  label: '30 min' },
  { value: 45,  label: '45 min' },
  { value: 50,  label: '50 min' },
  { value: 60,  label: '1 hora' },
  { value: 90,  label: '1h 30'  },
  { value: 120, label: '2 horas'},
]

const MONTHS    = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const WEEK_DAYS = ['D','S','T','Q','Q','S','S']

// Convert API → DayConfig
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
  }
}

// Convert DayConfig → API
function configToApi(d: DayConfig): DayConfigApi {
  return {
    day_of_week:   d.day_of_week,
    is_active:     d.is_active,
    start_time:    d.start_time,
    end_time:      d.end_time,
    slot_duration: d.slot_duration,
    break_start:   d.has_break ? d.break_start : null,
    break_end:     d.has_break ? d.break_end   : null,
  }
}

// ── Toggle ─────────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-all duration-200"
      style={{ background: checked ? 'var(--brand)' : 'var(--raised)', border: checked ? 'none' : '1px solid var(--border)' }}
    >
      <span
        className="absolute top-0.5 inline-block h-4 w-4 transform rounded-full shadow transition-transform duration-200"
        style={{ background: checked ? '#fff' : 'var(--t3)', transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </button>
  )
}

// ── Field ──────────────────────────────────────────────────────────────────────
function Field({ label, hint, error, children }: {
  label: string; hint?: string; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {hint && <p className="text-[11px] mb-1.5" style={{ color: 'var(--t3)' }}>{hint}</p>}
      {children}
      {error && <p className="text-[12px] mt-1.5" style={{ color: '#EF4444' }}>{error}</p>}
    </div>
  )
}

// ── Locais de atendimento ────────────────────────────────────────────────────
interface Location {
  id: string; name: string; city?: string; address?: string; color?: string
  modality?: string; price?: string; payment_info?: string
  deposit_required?: boolean; deposit_amount?: string; confirmation_message?: string
}

const LOCATION_MODALITIES = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'online',     label: 'Online'     },
  { value: 'ambos',      label: 'Ambos'      },
]

const LOCATION_COLORS = ['#00c27c', '#6366f1', '#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#f97316']

function LocationCard({
  loc, onSave, onDelete,
}: {
  loc: Partial<Location> & { _new?: boolean }
  onSave: (data: Partial<Location>) => Promise<void>
  onDelete?: () => void
}) {
  const [open,   setOpen]   = useState(loc._new ?? false)
  const [form,   setForm]   = useState<Partial<Location>>({
    name: loc.name ?? '', city: loc.city ?? '', address: loc.address ?? '',
    color: loc.color ?? '#00c27c', modality: loc.modality ?? 'presencial',
    price: loc.price ?? '', payment_info: loc.payment_info ?? '',
    deposit_required: loc.deposit_required ?? false, deposit_amount: loc.deposit_amount ?? '',
    confirmation_message: loc.confirmation_message ?? '',
  })
  const [saving, setSaving] = useState(false)

  function set(field: keyof Location, value: any) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    if (!form.name?.trim()) { toast.error('Nome obrigatório'); return }
    setSaving(true)
    try { await onSave({ ...loc, ...form }); setOpen(false) }
    finally { setSaving(false) }
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
        onClick={() => setOpen(o => !o)}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--raised)')}
        onMouseLeave={e => (e.currentTarget.style.background = '')}
      >
        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: form.color }} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium truncate" style={{ color: 'var(--t1)' }}>
            {form.name || <span className="italic" style={{ color: 'var(--t3)' }}>Novo local</span>}
          </p>
          {form.city && (
            <p className="text-[11px] truncate" style={{ color: 'var(--t3)' }}>
              {form.city}{form.modality ? ` · ${form.modality}` : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onDelete && (
            <span
              role="button"
              onClick={e => { e.stopPropagation(); onDelete() }}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--t3)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#EF4444'; (e.currentTarget as HTMLElement).style.background = '#FEF2F2' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t3)'; (e.currentTarget as HTMLElement).style.background = '' }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </span>
          )}
          {open ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--t3)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--t3)' }} />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="grid grid-cols-2 gap-3 pt-3">
            <div className="col-span-2">
              <Field label="Nome do local">
                <input placeholder="Ex: Consultório Centro SP, Clínica Online..." value={form.name} onChange={e => set('name', e.target.value)} className="input" />
              </Field>
            </div>
            <Field label="Cidade">
              <input placeholder="São Paulo" value={form.city} onChange={e => set('city', e.target.value)} className="input" />
            </Field>
            <Field label="Modalidade">
              <select value={form.modality} onChange={e => set('modality', e.target.value)} className="input">
                {LOCATION_MODALITIES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </Field>
            <div className="col-span-2">
              <Field label="Endereço completo">
                <input placeholder="Rua das Flores, 100 — Sala 5 — Centro" value={form.address} onChange={e => set('address', e.target.value)} className="input" />
              </Field>
            </div>
          </div>

          <div className="rounded-xl p-4 space-y-3" style={{ border: '1px solid var(--border)', background: 'var(--raised)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--t3)' }}>Valor & Pagamento</p>
            <Field label="Valor da consulta">
              <input placeholder="Ex: R$ 250,00" value={form.price} onChange={e => set('price', e.target.value)} className="input" />
            </Field>
            <Field label="Instruções de pagamento">
              <textarea placeholder="Ex: Pix: 11999999999..." rows={2} value={form.payment_info} onChange={e => set('payment_info', e.target.value)} className="textarea" />
            </Field>
            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-[13px] font-medium" style={{ color: 'var(--t1)' }}>Exige sinal para confirmar</p>
                <p className="text-[11px]" style={{ color: 'var(--t3)' }}>Paciente precisa pagar antecipadamente</p>
              </div>
              <Toggle checked={!!form.deposit_required} onChange={() => set('deposit_required', !form.deposit_required)} />
            </div>
            {form.deposit_required && (
              <Field label="Valor do sinal">
                <input placeholder="Ex: R$ 50,00" value={form.deposit_amount} onChange={e => set('deposit_amount', e.target.value)} className="input" />
              </Field>
            )}
          </div>

          <Field label="Mensagem de confirmação de agendamento" hint="Enviada automaticamente após o paciente agendar">
            <textarea placeholder="Ex: Sua consulta está confirmada! Aguardamos você..." rows={3} value={form.confirmation_message} onChange={e => set('confirmation_message', e.target.value)} className="textarea" />
          </Field>

          <div className="flex flex-col gap-2">
            <label className="field-label">Cor na agenda</label>
            <div className="flex gap-2 flex-wrap">
              {LOCATION_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('color', c)}
                  className={cn('w-7 h-7 rounded-full border-2 transition-transform hover:scale-110', form.color === c ? 'border-white scale-110' : 'border-transparent')}
                  style={{ background: c, outline: form.color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
                />
              ))}
            </div>
          </div>

          <Btn type="button" onClick={handleSave} disabled={saving} className="w-full justify-center">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar local
          </Btn>
        </div>
      )}
    </div>
  )
}

function TabLocais() {
  const qc = useQueryClient()

  const { data: locations = [], isLoading } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: () => api.get('/api/locations').then(r => r.data.locations ?? r.data),
  })

  const [newItems, setNewItems] = useState<{ id: string }[]>([])

  const saveMut = useMutation({
    mutationFn: async (data: Partial<Location>) => {
      if (data.id && !String(data.id).startsWith('_new')) {
        await api.put(`/api/locations/${data.id}`, data)
      } else {
        const { id: _i, _new: _j, ...rest } = data as any
        await api.post('/api/locations', rest)
      }
    },
    onSuccess: () => { toast.success('Local salvo!'); qc.invalidateQueries({ queryKey: ['locations'] }); setNewItems([]) },
    onError: () => toast.error('Erro ao salvar local'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/locations/${id}`),
    onSuccess: () => { toast.success('Local removido'); qc.invalidateQueries({ queryKey: ['locations'] }) },
    onError: () => toast.error('Erro ao remover'),
  })

  if (isLoading) return (
    <div className="flex justify-center py-8">
      <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="space-y-3">
      {locations.length === 0 && newItems.length === 0 && (
        <div className="text-center py-8">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" style={{ color: 'var(--t3)' }} />
          <p className="text-[13px]" style={{ color: 'var(--t3)' }}>
            Nenhum local cadastrado. Adicione seu consultório ou cidade de atendimento.
          </p>
        </div>
      )}
      {locations.map(loc => (
        <LocationCard key={loc.id} loc={loc}
          onSave={data => saveMut.mutateAsync(data)}
          onDelete={() => deleteMut.mutate(loc.id)}
        />
      ))}
      {newItems.map(item => (
        <LocationCard key={item.id} loc={{ _new: true } as any}
          onSave={data => saveMut.mutateAsync(data)}
          onDelete={() => setNewItems(prev => prev.filter(n => n.id !== item.id))}
        />
      ))}
      <button
        type="button"
        onClick={() => setNewItems(prev => [...prev, { id: `_new_${Date.now()}` }])}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed text-[13px] transition-all"
        style={{ borderColor: 'var(--border)', color: 'var(--t3)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--brand)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,194,124,.4)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t3)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
      >
        <Plus className="w-4 h-4" />
        Adicionar local de atendimento
      </button>
    </div>
  )
}

// ── TimeInput ──────────────────────────────────────────────────────────────────
function TimeInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-[10px] text-t3 uppercase tracking-wider font-mono">{label}</span>}
      <input
        type="time"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="rounded-lg px-2.5 py-2 text-sm font-mono text-t1 focus:outline-none focus:ring-1 focus:ring-brand-500/40 w-[100px]"
        style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
      />
    </div>
  )
}

// ── Day Row ────────────────────────────────────────────────────────────────────
function DayRow({ day, onChange }: {
  day: DayConfig
  onChange: (patch: Partial<DayConfig>) => void
}) {
  return (
    <div
      className="rounded-2xl transition-all overflow-hidden"
      style={{
        border: day.is_active ? '1px solid var(--border)' : '1px solid rgba(0,0,0,0.06)',
        background: day.is_active ? 'var(--surface)' : 'var(--raised)',
        opacity: day.is_active ? 1 : 0.7,
      }}
    >
      {/* Row header */}
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Day badge */}
        <div className={cn(
          'w-10 h-10 flex items-center justify-center rounded-xl text-xs font-bold font-mono flex-shrink-0',
          day.is_active ? 'bg-brand-500/15 text-brand-400' : 'bg-raised text-t3'
        )}>
          {day.abbr}
        </div>

        {/* Day name */}
        <div className="w-32 flex-shrink-0">
          <p className={cn('text-sm font-medium', day.is_active ? 'text-t1' : 'text-t3')}>
            {day.label}
          </p>
          {!day.is_active && (
            <p className="text-xs text-t3 mt-0.5">Indisponível</p>
          )}
        </div>

        {/* Toggle */}
        <div className="flex-shrink-0">
          <Toggle checked={day.is_active} onChange={v => onChange({ is_active: v })} />
        </div>

        {/* Time fields — only when active */}
        {day.is_active && (
          <div className="flex items-end gap-3 ml-4 flex-wrap flex-1">
            {/* Manhã/tarde */}
            <div className="flex items-end gap-2">
              <TimeInput label="Início" value={day.start_time} onChange={v => onChange({ start_time: v })} />
              <span className="text-t3 text-sm mb-2.5">–</span>
              <TimeInput label="Fim" value={day.end_time} onChange={v => onChange({ end_time: v })} />
            </div>

            {/* Separator */}
            <div className="h-8 w-px self-end mb-1 bg-border flex-shrink-0" />

            {/* Almoço toggle */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-t3 uppercase tracking-wider font-mono">Pausa almoço</span>
              <div className="flex items-center gap-2 h-[38px]">
                <Toggle checked={day.has_break} onChange={v => onChange({ has_break: v })} />
                <Coffee className={cn('w-3.5 h-3.5 flex-shrink-0', day.has_break ? 'text-amber-400' : 'text-t3')} />
              </div>
            </div>

            {/* Break times — only when has_break */}
            {day.has_break && (
              <div className="flex items-end gap-2">
                <TimeInput label="Início pausa" value={day.break_start} onChange={v => onChange({ break_start: v })} />
                <span className="text-t3 text-sm mb-2.5">–</span>
                <TimeInput label="Fim pausa" value={day.break_end} onChange={v => onChange({ break_end: v })} />
              </div>
            )}

            {/* Duration — pushed right */}
            <div className="flex flex-col gap-1 ml-auto">
              <span className="text-[10px] text-t3 uppercase tracking-wider font-mono">Duração consulta</span>
              <select
                value={day.slot_duration}
                onChange={e => onChange({ slot_duration: Number(e.target.value) })}
                className="h-[38px] rounded-lg px-3 text-sm text-t1 focus:outline-none"
                style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
              >
                {SLOT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Compact Day Row ────────────────────────────────────────────────────────────
function timeRanges(day: DayConfig): string[] {
  if (!day.is_active) return []
  if (day.has_break) return [`${day.start_time} – ${day.break_start}`, `${day.break_end} – ${day.end_time}`]
  return [`${day.start_time} – ${day.end_time}`]
}

function CompactDayRow({ day, onChange }: {
  day: DayConfig
  onChange: (patch: Partial<DayConfig>) => void
}) {
  const [open, setOpen] = useState(false)
  const ranges = timeRanges(day)

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors"
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--raised)')}
        onMouseLeave={e => (e.currentTarget.style.background = '')}
      >
        <div className="w-28 flex-shrink-0">
          <p className="text-sm font-medium" style={{ color: 'var(--t1)' }}>{day.label}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {ranges.length > 0 ? ranges.map((r, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono" style={{ background: 'var(--raised)', border: '1px solid var(--border)', color: 'var(--t2)' }}>
              <Clock className="w-3 h-3" style={{ color: 'var(--t3)' }} />
              {r}
            </span>
          )) : (
            <span className="text-xs" style={{ color: 'var(--t3)' }}>Sem horários</span>
          )}
        </div>
        <span
          className="text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0"
          style={day.is_active
            ? { background: 'rgba(0,194,124,.12)', color: 'var(--brand)' }
            : { background: 'var(--raised)', color: 'var(--t3)' }}
        >
          {day.is_active ? 'Ativo' : 'Pausado'}
        </span>
        {open
          ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--t3)' }} />
          : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--t3)' }} />}
      </button>
      {open && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <DayRow day={day} onChange={onChange} />
        </div>
      )}
    </div>
  )
}

// ── Regras & Exceções ──────────────────────────────────────────────────────────
function mostCommonDuration(days: DayConfig[]): string {
  const active = days.filter(d => d.is_active)
  if (active.length === 0) return '—'
  const counts = new Map<number, number>()
  for (const d of active) counts.set(d.slot_duration, (counts.get(d.slot_duration) ?? 0) + 1)
  let best = active[0].slot_duration
  let bestCount = 0
  counts.forEach((count, val) => { if (count > bestCount) { best = val; bestCount = count } })
  return SLOT_OPTIONS.find(o => o.value === best)?.label ?? '—'
}

function RulesCard({ days }: { days: DayConfig[] }) {
  const rows = [
    { label: 'Duração padrão',         value: mostCommonDuration(days) },
    { label: 'Buffer entre consultas', value: '—' },
    { label: 'Antecedência mínima',    value: '—' },
    { label: 'Limite por dia',         value: '—' },
  ]
  return (
    <div className="rounded-2xl p-5 space-y-3" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
      <h3 className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Regras</h3>
      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.label} className="flex items-center justify-between text-sm">
            <span style={{ color: 'var(--t3)' }}>{r.label}</span>
            <span className="font-mono" style={{ color: 'var(--t1)' }}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ExceptionsCard() {
  const { data } = useQuery({
    queryKey: ['blocked-dates'],
    queryFn: () => api.get('/api/availability/blocked').then(r => r.data.blocked as { id: string; blocked_date: string; reason?: string }[]),
  })
  const blocked = data ?? []

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const limit = new Date(today)
  limit.setDate(limit.getDate() + 60)
  const limitStr = `${limit.getFullYear()}-${String(limit.getMonth() + 1).padStart(2, '0')}-${String(limit.getDate()).padStart(2, '0')}`

  const upcoming = blocked
    .filter(b => { const d = b.blocked_date.slice(0, 10); return d >= todayStr && d <= limitStr })
    .sort((a, b) => a.blocked_date.localeCompare(b.blocked_date))

  return (
    <div className="rounded-2xl p-5 space-y-3" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
      <div>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Exceções</h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>Próximos 60 dias</p>
      </div>
      {upcoming.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--t3)' }}>Nenhum bloqueio nos próximos 60 dias.</p>
      ) : (
        <div className="space-y-2">
          {upcoming.map(b => (
            <div key={b.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0">
                <p className="font-mono text-xs" style={{ color: 'var(--t1)' }}>
                  {new Date(b.blocked_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
                {b.reason && <p className="text-xs truncate" style={{ color: 'var(--t3)' }}>{b.reason}</p>}
              </div>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(245,158,11,.12)', color: '#F59E0B' }}>
                Bloqueio total
              </span>
            </div>
          ))}
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Calendar */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <Btn variant="ghost" size="sm" onClick={prevMonth} className="!px-2">
            <ChevronLeft className="w-4 h-4" /></Btn>
          <span className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>{MONTHS[month]} {year}</span>
          <Btn variant="ghost" size="sm" onClick={nextMonth} className="!px-2">
            <ChevronRight className="w-4 h-4" /></Btn>
        </div>
        <div className="grid grid-cols-7 px-3 pt-3">
          {WEEK_DAYS.map((d, i) => <div key={i} className="text-center text-[10px] font-mono text-t3 py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1 px-3 pb-4">
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
                  !isPast && !isBlocked && !isSelected && 'cursor-pointer',
                  dateStr === todayStr && !isBlocked && !isSelected && 'ring-1 ring-brand-400',
                  isSelected && 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40',
                  isBlocked  && 'bg-red-500/15 text-red-400 line-through',
                )}
              >{day}</button>
            )
          })}
        </div>
      </div>

      {/* Right column: confirm + list */}
      <div className="space-y-4">
        {selected ? (
          <div className="rounded-2xl border px-5 py-4 space-y-3" style={{ borderColor: 'rgba(245,158,11,.3)', background: 'rgba(245,158,11,.06)' }}>
            <p className="text-sm font-medium text-amber-300">
              Bloquear {new Date(selected + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}?
            </p>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Motivo (opcional): folga, feriado, viagem..."
              className="w-full rounded-lg px-3 py-2 text-sm text-t1 focus:outline-none"
              style={{ background: 'var(--raised)', border: '1px solid var(--border)' }} />
            <div className="flex gap-2">
              <Btn variant="outline" onClick={() => setSelected(null)} className="flex-1">Cancelar</Btn>
              <Btn
                onClick={() => { addMut.mutate({ blocked_date: selected, reason: reason.trim() || undefined }); setSelected(null) }}
                className="flex-1 !bg-[#F59E0B] hover:!bg-[#D97706]"
              >Confirmar</Btn>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border px-5 py-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <p className="text-sm text-t3">Clique em um dia no calendário para bloqueá-lo. A assistente não vai oferecer agendamentos nessas datas.</p>
          </div>
        )}

        {blocked.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-mono text-t3 uppercase tracking-wider">Dias bloqueados</p>
            {blocked.map(b => (
              <div key={b.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
                <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-t1 font-mono">
                    {new Date(b.blocked_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  {b.reason && <span className="text-xs text-t3 ml-2">· {b.reason}</span>}
                </div>
                <Btn variant="ghost" size="sm" onClick={() => delMut.mutate(b.blocked_date.slice(0, 10))} className="!px-1.5 !text-[var(--t3)] hover:!text-[var(--danger)]">
                  <X className="w-3.5 h-3.5" />
                </Btn>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
const DEFAULT_DAYS: DayConfig[] = DAYS_META.map(m => ({
  ...m,
  is_active:     m.day_of_week >= 1 && m.day_of_week <= 5,
  start_time:    '08:00',
  end_time:      '18:00',
  has_break:     false,
  break_start:   '12:00',
  break_end:     '13:00',
  slot_duration: 60,
}))

export default function DisponibilidadePage() {
  const qc = useQueryClient()
  const [days, setDays] = useState<DayConfig[]>(DEFAULT_DAYS)
  const [dirty, setDirty] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['availability'],
    queryFn: () => api.get('/api/availability').then(r => r.data.availability as DayConfigApi[]),
  })

  useEffect(() => {
    if (data) {
      setDays(DAYS_META.map(m => {
        const found = data.find(d => d.day_of_week === m.day_of_week)
        if (found) return { ...m, ...apiToConfig(found) }
        return { ...m, is_active: false, start_time: '08:00', end_time: '18:00', has_break: false, break_start: '12:00', break_end: '13:00', slot_duration: 60 }
      }))
      setDirty(false)
    }
  }, [data])

  const saveMut = useMutation({
    mutationFn: (days: DayConfig[]) =>
      api.put('/api/availability', { availability: days.map(configToApi) }),
    onSuccess: () => { toast.success('Disponibilidade salva!'); setDirty(false); qc.invalidateQueries({ queryKey: ['availability'] }) },
    onError: () => toast.error('Erro ao salvar'),
  })

  function updateDay(idx: number, patch: Partial<DayConfig>) {
    setDays(prev => { const next = [...prev]; next[idx] = { ...next[idx], ...patch }; return next })
    setDirty(true)
  }

  const activeDays = days.filter(d => d.is_active).length

  if (isLoading) return (
    <div className="p-8 flex items-center justify-center">
      <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-10">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-[22px] tracking-tight" style={{ color: 'var(--t1)' }}>Disponibilidade</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--t3)' }}>
            Configure seus horários, pausas e dias sem atendimento
          </p>
          {activeDays > 0 && (
            <p className="text-sm text-brand-400 font-medium mt-2">
              {activeDays} {activeDays === 1 ? 'dia ativo' : 'dias ativos'}
            </p>
          )}
        </div>
        <Btn
          onClick={() => saveMut.mutate(days)}
          disabled={!dirty || saveMut.isPending}
          variant={dirty ? 'primary' : 'secondary'}
          className="whitespace-nowrap flex-shrink-0"
        >
          {saveMut.isPending
            ? <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: '#fff' }} />
            : <CheckCircle className="w-4 h-4" />}
          {dirty ? 'Salvar' : 'Salvo'}
        </Btn>
      </div>

      {/* Horário semanal padrão + Regras/Exceções */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <div>
            <h2 className="text-base font-semibold text-t1">Horário semanal padrão</h2>
            <p className="text-sm text-t3 mt-0.5">Slots utilizados pela IA para sugerir agendamentos.</p>
          </div>
          <div className="space-y-3">
            {days.map(day => {
              const idx = days.findIndex(d => d.day_of_week === day.day_of_week)
              return <CompactDayRow key={day.day_of_week} day={day} onChange={patch => updateDay(idx, patch)} />
            })}
          </div>
        </div>

        <div className="space-y-6">
          <RulesCard days={days} />
          <ExceptionsCard />
        </div>
      </div>

      {/* Datas bloqueadas */}
      <div className="space-y-5">
        <div>
          <h2 className="text-base font-semibold text-t1">Dias sem atendimento</h2>
          <p className="text-sm text-t3 mt-0.5">Feriados, folgas ou qualquer data que não haverá atendimento.</p>
        </div>
        <BlockedCalendar />
        <p className="text-xs text-t3">
          Feriados nacionais <strong>não</strong> são bloqueados automaticamente — adicione manualmente acima.
        </p>
      </div>

      {/* Locais de atendimento */}
      <div className="space-y-5">
        <div>
          <h2 className="text-base font-semibold text-t1">Locais de atendimento</h2>
          <p className="text-sm text-t3 mt-0.5">Consultórios, cidades, valor e mensagem de confirmação.</p>
        </div>
        <TabLocais />
      </div>

    </div>
  )
}
