'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Moon, MapPin, Plus, Trash2, ChevronDown, ChevronUp, Power, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────

interface Assistant {
  id: string; name: string; tone: string; greeting_message: string
  consultation_price?: string; consultation_modalities?: string
  specialties?: string; vacation_mode?: boolean; vacation_message?: string
}

// ─── Helpers ──────────────────────────────────────────────────────

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

// ─── Section Card ─────────────────────────────────────────────────

function SectionCard({ title, subtitle, icon, children }: {
  title: string; subtitle?: string; icon?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="card-header">
        <div className="flex items-center gap-2.5">
          {icon}
          <div>
            <p className="text-[14px] font-semibold" style={{ color: 'var(--t1)' }}>{title}</p>
            {subtitle && <p className="text-[12px]" style={{ color: 'var(--t3)' }}>{subtitle}</p>}
          </div>
        </div>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  )
}

// ─── IA Power Toggle ──────────────────────────────────────────────

function AIPowerToggle() {
  const qc = useQueryClient()
  const [paused, setPaused] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data: assistant } = useQuery<any>({
    queryKey: ['assistant'],
    queryFn: async () => { const { data } = await api.get('/api/assistants'); return data.assistant },
    staleTime: 30_000,
  })

  useEffect(() => {
    if (assistant) setPaused(assistant.ai_paused ?? false)
  }, [assistant])

  async function toggle() {
    const next = !paused
    setSaving(true)
    try {
      await api.patch('/api/assistants/toggle-ai', { paused: next })
      setPaused(next)
      qc.invalidateQueries({ queryKey: ['assistant'] })
      toast.success(next ? 'IA desativada — não vai responder nenhuma mensagem.' : 'IA ativada!')
    } catch { toast.error('Erro ao alterar.') }
    finally { setSaving(false) }
  }

  return (
    <div
      className="flex items-center gap-4 rounded-xl px-5 py-4 transition-colors"
      style={paused
        ? { background: '#FEF2F2', border: '1px solid #FECACA' }
        : { background: '#ECFDF5', border: '1px solid #A7F3D0' }
      }
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={paused
          ? { background: '#FEE2E2' }
          : { background: '#D1FAE5' }
        }
      >
        <Power className="w-5 h-5" style={{ color: paused ? '#DC2626' : '#059669' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold" style={{ color: paused ? '#DC2626' : '#059669' }}>
          {paused ? 'IA desativada' : 'IA ativa'}
        </p>
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--t3)' }}>
          {paused
            ? 'A assistente não está respondendo nenhuma mensagem no momento'
            : 'A assistente está respondendo normalmente'}
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={saving}
        className={cn(
          'relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 disabled:opacity-60',
          paused ? 'bg-red-500' : 'bg-emerald-500'
        )}
      >
        <span className={cn(
          'inline-block h-5 w-5 m-1 transform rounded-full bg-white shadow transition-transform duration-200',
          paused ? 'translate-x-0' : 'translate-x-5'
        )} />
      </button>
    </div>
  )
}

// ─── Tab: Assistente ──────────────────────────────────────────────

const assistantSchema = z.object({
  name:                    z.string().min(2, 'Nome obrigatório'),
  tone:                    z.enum(['acolhedor', 'formal', 'descontraido']),
  greeting_message:        z.string().min(10, 'Mensagem muito curta'),
  specialties:             z.string().optional(),
  consultation_modalities: z.string().optional(),
  vacation_mode:           z.boolean().optional(),
  vacation_message:        z.string().optional(),
  nutri_display_name:      z.string().optional(),
  emoji_level:             z.number().min(1).max(5).default(3),
  func_prospeccao:         z.boolean().default(true),
  func_triagem:            z.boolean().default(true),
  func_agendamento:        z.boolean().default(true),
})
type AssistantFormData = z.infer<typeof assistantSchema>

const EMOJI_LABELS: Record<number, string> = {
  1: 'Nenhum', 2: 'Raramente', 3: 'Moderado', 4: 'Frequente', 5: 'Muito'
}

const FUNCOES = [
  { key: 'func_prospeccao'  as const, label: 'Prospecção',  desc: 'Reengaja leads que param de responder' },
  { key: 'func_triagem'     as const, label: 'Triagem',     desc: 'Qualifica pacientes com perguntas de objetivo' },
  { key: 'func_agendamento' as const, label: 'Agendamento', desc: 'Oferece e confirma consultas automaticamente' },
]

const TONES = [
  { value: 'acolhedor',    label: 'Acolhedor',   desc: 'Empático e próximo' },
  { value: 'formal',       label: 'Formal',       desc: 'Profissional e direto' },
  { value: 'descontraido', label: 'Descontraído', desc: 'Leve e informal' },
]

const MODALITIES = [
  { value: 'online',            label: 'Online' },
  { value: 'presencial',        label: 'Presencial' },
  { value: 'online,presencial', label: 'Ambos' },
]

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn('relative w-10 h-[22px] rounded-full transition-colors flex-shrink-0', enabled ? 'bg-brand-500' : '')}
      style={enabled ? {} : { background: 'var(--raised)', border: '1px solid var(--border)' }}
    >
      <span className={cn(
        'absolute top-[2px] w-[18px] h-[18px] bg-white rounded-full shadow-sm transition-transform',
        enabled ? 'left-[20px]' : 'left-[2px]'
      )} />
    </button>
  )
}

function TabAssistente() {
  const queryClient = useQueryClient()

  const { data: assistant } = useQuery<Assistant>({
    queryKey: ['assistant'],
    queryFn: async () => {
      const { data } = await api.get('/api/assistants')
      return data.assistant
    },
  })

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<AssistantFormData>({
    resolver: zodResolver(assistantSchema),
    defaultValues: { tone: 'acolhedor', consultation_modalities: 'online', vacation_mode: false },
  })

  const vacationMode = watch('vacation_mode')

  useEffect(() => {
    if (assistant) {
      reset({
        name:                    assistant.name,
        tone:                    (assistant.tone as any) || 'acolhedor',
        greeting_message:        assistant.greeting_message || '',
        specialties:             assistant.specialties || '',
        consultation_modalities: assistant.consultation_modalities || 'online',
        vacation_mode:           assistant.vacation_mode ?? false,
        vacation_message:        (assistant as any).vacation_message || '',
        nutri_display_name:      (assistant as any).nutri_display_name || '',
        emoji_level:             (assistant as any).emoji_level ?? 3,
        func_prospeccao:         (assistant as any).func_prospeccao  ?? true,
        func_triagem:            (assistant as any).func_triagem     ?? true,
        func_agendamento:        (assistant as any).func_agendamento ?? true,
      })
    }
  }, [assistant, reset])

  async function onSubmit(data: AssistantFormData) {
    try {
      await api.post('/api/assistants', data)
      toast.success('Assistente salva com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['assistant'] })
    } catch {
      toast.error('Erro ao salvar. Tente novamente.')
    }
  }

  const currentModality = watch('consultation_modalities')
  const currentTone     = watch('tone')
  const emojiLevel      = watch('emoji_level') ?? 3

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

      <Field label="Nome da assistente" error={errors.name?.message}>
        <input {...register('name')} placeholder="Ex: Sofia, Lara, Ana..." className="input"
          style={errors.name ? { borderColor: '#EF4444' } : undefined} />
      </Field>

      <Field label="Como o nutricionista deve ser chamado" hint="Se vazio, usa o nome da sua conta.">
        <input {...register('nutri_display_name')} placeholder="Ex: Dr. David, Dra. Ana..." className="input" />
      </Field>

      {/* Tom de voz */}
      <div className="flex flex-col gap-2">
        <label className="field-label">Tom de voz</label>
        <div className="grid grid-cols-3 gap-2">
          {TONES.map(({ value, label, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => setValue('tone', value as any)}
              className="flex flex-col gap-0.5 px-3 py-2.5 rounded-xl text-left transition-all"
              style={currentTone === value
                ? { border: '1.5px solid var(--brand)', background: 'var(--brand-s)' }
                : { border: '1px solid var(--border)', background: 'var(--raised)' }
              }
            >
              <span className="text-[13px] font-medium" style={{ color: currentTone === value ? 'var(--brand)' : 'var(--t1)' }}>{label}</span>
              <span className="text-[11px]" style={{ color: 'var(--t3)' }}>{desc}</span>
            </button>
          ))}
        </div>
      </div>

      <Field label="Mensagem de boas-vindas" hint="Enviada no primeiro contato do cliente" error={errors.greeting_message?.message}>
        <textarea
          {...register('greeting_message')}
          rows={3}
          className="textarea"
          style={errors.greeting_message ? { borderColor: '#EF4444' } : undefined}
        />
      </Field>

      <Field label="Especialidades" hint="A assistente usará isso para apresentar seu trabalho">
        <textarea
          {...register('specialties')}
          rows={2}
          placeholder="Ex: Emagrecimento, nutrição esportiva, saúde feminina..."
          className="textarea"
        />
      </Field>

      {/* Modalidade */}
      <div className="flex flex-col gap-2">
        <label className="field-label">Formato de consulta</label>
        <div className="flex gap-2">
          {MODALITIES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setValue('consultation_modalities', value)}
              className="px-4 py-2 rounded-xl text-[13px] font-medium transition-all"
              style={currentModality === value
                ? { border: '1.5px solid var(--brand)', background: 'var(--brand-s)', color: 'var(--brand)' }
                : { border: '1px solid var(--border)', color: 'var(--t3)' }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Modo férias */}
      <div
        className="flex flex-col gap-3 rounded-xl p-4 transition-colors"
        style={vacationMode
          ? { border: '1px solid #FDE68A', background: '#FFFBEB' }
          : { border: '1px solid var(--border)' }
        }
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Moon className="w-4 h-4" style={{ color: vacationMode ? '#D97706' : 'var(--t3)' }} />
            <div>
              <p className="text-[13px] font-medium" style={{ color: vacationMode ? '#D97706' : 'var(--t1)' }}>
                Modo férias
              </p>
              <p className="text-[11px]" style={{ color: 'var(--t3)' }}>
                A assistente pausa o atendimento automático
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setValue('vacation_mode', !vacationMode)}
            className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
            style={{ background: vacationMode ? '#D97706' : 'var(--raised)', border: vacationMode ? 'none' : '1px solid var(--border)' }}
          >
            <span className={cn(
              'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm',
              vacationMode ? 'translate-x-5' : 'translate-x-0'
            )} />
          </button>
        </div>
        {vacationMode && (
          <Field label="Mensagem de ausência" hint="Enviada quando clientes tentam falar com a assistente">
            <textarea
              {...register('vacation_message')}
              rows={2}
              placeholder="Ex: Estamos em férias! Retornamos no dia 10/02. Até breve!"
              className="textarea"
            />
          </Field>
        )}
      </div>

      {/* Slider de emoji */}
      <div className="flex flex-col gap-3 rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium" style={{ color: 'var(--t1)' }}>Uso de emojis</p>
            <p className="text-[11px]" style={{ color: 'var(--t3)' }}>Define a frequência de emojis nas respostas</p>
          </div>
          <span
            className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'var(--brand-s)', color: 'var(--brand)' }}
          >
            {EMOJI_LABELS[emojiLevel]}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] w-14" style={{ color: 'var(--t3)' }}>Nenhum</span>
          <input
            type="range" min={1} max={5} step={1}
            value={emojiLevel}
            onChange={e => setValue('emoji_level', Number(e.target.value))}
            className="flex-1 accent-brand-500 h-1.5 cursor-pointer"
          />
          <span className="font-mono text-[10px] w-8" style={{ color: 'var(--t3)' }}>Muito</span>
        </div>
      </div>

      {/* Funções habilitadas */}
      <div className="flex flex-col gap-3 rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}>
        <div>
          <p className="text-[13px] font-medium" style={{ color: 'var(--t1)' }}>Funções habilitadas</p>
          <p className="text-[11px]" style={{ color: 'var(--t3)' }}>Controle o que a assistente pode fazer</p>
        </div>
        {FUNCOES.map(({ key, label, desc }) => {
          const enabled = watch(key) ?? true
          return (
            <div key={key} className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium" style={{ color: enabled ? 'var(--t1)' : 'var(--t3)' }}>{label}</p>
                <p className="text-[11px]" style={{ color: 'var(--t3)' }}>{desc}</p>
              </div>
              <Toggle enabled={enabled} onChange={() => setValue(key, !enabled)} />
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-3 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
        <button type="submit" disabled={isSubmitting} className="btn-primary mt-4">
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar
        </button>
      </div>
    </form>
  )
}

// ─── Tab: Horários ────────────────────────────────────────────────

const DAYS = [
  { key: 'monday',    label: 'Segunda',  int: 1 },
  { key: 'tuesday',   label: 'Terça',    int: 2 },
  { key: 'wednesday', label: 'Quarta',   int: 3 },
  { key: 'thursday',  label: 'Quinta',   int: 4 },
  { key: 'friday',    label: 'Sexta',    int: 5 },
  { key: 'saturday',  label: 'Sábado',   int: 6 },
  { key: 'sunday',    label: 'Domingo',  int: 0 },
]

const DEFAULT_SCHEDULE: Record<string, { enabled: boolean; start: string; end: string; slot: number }> = {
  monday:    { enabled: true,  start: '08:00', end: '18:00', slot: 60 },
  tuesday:   { enabled: true,  start: '08:00', end: '18:00', slot: 60 },
  wednesday: { enabled: true,  start: '08:00', end: '18:00', slot: 60 },
  thursday:  { enabled: true,  start: '08:00', end: '18:00', slot: 60 },
  friday:    { enabled: true,  start: '08:00', end: '18:00', slot: 60 },
  saturday:  { enabled: false, start: '08:00', end: '12:00', slot: 60 },
  sunday:    { enabled: false, start: '08:00', end: '12:00', slot: 60 },
}

function TabHorarios() {
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE)
  const [saving,   setSaving]   = useState(false)
  const [loaded,   setLoaded]   = useState(false)

  const { data: availabilityData } = useQuery<any[]>({
    queryKey: ['availability'],
    queryFn: async () => {
      const { data } = await api.get('/api/nutritionists/availability')
      return data
    },
  })

  useEffect(() => {
    if (availabilityData && !loaded) {
      setLoaded(true)
      if (availabilityData.length > 0) {
        const newSchedule = { ...DEFAULT_SCHEDULE }
        Object.keys(newSchedule).forEach(k => { newSchedule[k] = { ...newSchedule[k], enabled: false } })
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        for (const row of availabilityData) {
          const key = dayNames[row.day_of_week]
          if (key) {
            newSchedule[key] = {
              enabled: true,
              start: row.start_time.slice(0, 5),
              end: row.end_time.slice(0, 5),
              slot: row.slot_duration || 60,
            }
          }
        }
        setSchedule(newSchedule)
      }
    }
  }, [availabilityData, loaded])

  function toggle(day: string) {
    setSchedule(prev => ({ ...prev, [day]: { ...prev[day], enabled: !prev[day].enabled } }))
  }

  function setField(day: string, field: string, value: string | number) {
    setSchedule(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const entries = DAYS
        .filter(({ key }) => schedule[key].enabled)
        .map(({ key, int }) => ({
          day_of_week:   int,
          start_time:    schedule[key].start,
          end_time:      schedule[key].end,
          slot_duration: schedule[key].slot,
        }))
      await api.put('/api/nutritionists/availability', entries)
      toast.success('Horários salvos com sucesso!')
    } catch {
      toast.error('Erro ao salvar horários.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[13px]" style={{ color: 'var(--t2)' }}>
        Defina quando a assistente pode agendar consultas. Fora deste horário ela não oferecerá agendamento automático.
      </p>

      <div className="flex flex-col gap-2">
        {DAYS.map(({ key, label }) => {
          const day = schedule[key]
          return (
            <div
              key={key}
              className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors"
              style={day.enabled
                ? { border: '1px solid rgba(0,194,124,.2)', background: 'var(--brand-s)' }
                : { border: '1px solid var(--border)' }
              }
            >
              {/* Checkbox */}
              <button
                type="button"
                onClick={() => toggle(key)}
                className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
                style={day.enabled
                  ? { background: 'var(--brand)', border: '2px solid var(--brand)' }
                  : { background: 'transparent', border: '2px solid var(--border)' }
                }
              >
                {day.enabled && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              <span className="text-[13px] font-medium w-20" style={{ color: day.enabled ? 'var(--t1)' : 'var(--t3)' }}>
                {label}
              </span>

              {day.enabled && (
                <div className="flex items-center gap-2 ml-auto flex-wrap">
                  <input
                    type="time"
                    value={day.start}
                    onChange={e => setField(key, 'start', e.target.value)}
                    className="text-[13px] rounded-lg px-2 py-1.5 focus:outline-none"
                    style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--t1)' }}
                  />
                  <span className="text-[12px]" style={{ color: 'var(--t3)' }}>até</span>
                  <input
                    type="time"
                    value={day.end}
                    onChange={e => setField(key, 'end', e.target.value)}
                    className="text-[13px] rounded-lg px-2 py-1.5 focus:outline-none"
                    style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--t1)' }}
                  />
                  <select
                    value={day.slot}
                    onChange={e => setField(key, 'slot', Number(e.target.value))}
                    className="text-[13px] rounded-lg px-2 py-1.5 focus:outline-none"
                    style={{ border: '1px solid var(--border)', background: 'var(--raised)', color: 'var(--t2)' }}
                  >
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>1h</option>
                    <option value={90}>1h30</option>
                  </select>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="btn-primary w-fit"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Salvar horários
      </button>
    </div>
  )
}

// ─── Tab: Locais de Atendimento ───────────────────────────────────

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

const LOCATION_COLORS = [
  '#00c27c', '#6366f1', '#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#f97316'
]

function LocationCard({
  loc, onSave, onDelete,
}: {
  loc: Partial<Location> & { _new?: boolean }
  onSave: (data: Partial<Location>) => Promise<void>
  onDelete?: () => void
}) {
  const [open,   setOpen]   = useState(loc._new ?? false)
  const [form,   setForm]   = useState<Partial<Location>>({
    name:                 loc.name                 ?? '',
    city:                 loc.city                 ?? '',
    address:              loc.address              ?? '',
    color:                loc.color                ?? '#00c27c',
    modality:             loc.modality             ?? 'presencial',
    price:                loc.price                ?? '',
    payment_info:         loc.payment_info         ?? '',
    deposit_required:     loc.deposit_required     ?? false,
    deposit_amount:       loc.deposit_amount       ?? '',
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
      {/* Header */}
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

      {/* Form */}
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="grid grid-cols-2 gap-3 pt-3">
            <div className="col-span-2">
              <Field label="Nome do local">
                <input
                  placeholder="Ex: Consultório Centro SP, Clínica Online..."
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  className="input"
                />
              </Field>
            </div>

            <Field label="Cidade">
              <input
                placeholder="São Paulo"
                value={form.city}
                onChange={e => set('city', e.target.value)}
                className="input"
              />
            </Field>

            <Field label="Modalidade">
              <select
                value={form.modality}
                onChange={e => set('modality', e.target.value)}
                className="input"
              >
                {LOCATION_MODALITIES.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </Field>

            <div className="col-span-2">
              <Field label="Endereço completo">
                <input
                  placeholder="Rua das Flores, 100 — Sala 5 — Centro"
                  value={form.address}
                  onChange={e => set('address', e.target.value)}
                  className="input"
                />
              </Field>
            </div>
          </div>

          {/* Valor & Pagamento */}
          <div className="rounded-xl p-4 space-y-3" style={{ border: '1px solid var(--border)', background: 'var(--raised)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--t3)' }}>Valor & Pagamento</p>

            <Field label="Valor da consulta">
              <input
                placeholder="Ex: R$ 250,00 ou A partir de R$ 200"
                value={form.price}
                onChange={e => set('price', e.target.value)}
                className="input"
              />
            </Field>

            <Field label="Instruções de pagamento">
              <textarea
                placeholder="Ex: Pix: 11999999999 (João Silva) ou Cartão no local."
                rows={2}
                value={form.payment_info}
                onChange={e => set('payment_info', e.target.value)}
                className="textarea"
              />
            </Field>

            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-[13px] font-medium" style={{ color: 'var(--t1)' }}>Exige sinal para confirmar</p>
                <p className="text-[11px]" style={{ color: 'var(--t3)' }}>Paciente precisa pagar antecipadamente</p>
              </div>
              <Toggle enabled={!!form.deposit_required} onChange={() => set('deposit_required', !form.deposit_required)} />
            </div>

            {form.deposit_required && (
              <Field label="Valor do sinal">
                <input
                  placeholder="Ex: R$ 50,00 (10% do valor total)"
                  value={form.deposit_amount}
                  onChange={e => set('deposit_amount', e.target.value)}
                  className="input"
                />
              </Field>
            )}
          </div>

          <Field label="Mensagem de confirmação de agendamento" hint="Enviada automaticamente após o paciente agendar — inclui endereço e instruções">
            <textarea
              placeholder="Ex: Sua consulta está confirmada! Aguardamos você no endereço abaixo..."
              rows={3}
              value={form.confirmation_message}
              onChange={e => set('confirmation_message', e.target.value)}
              className="textarea"
            />
          </Field>

          {/* Cor */}
          <div className="flex flex-col gap-2">
            <label className="field-label">Cor na agenda</label>
            <div className="flex gap-2 flex-wrap">
              {LOCATION_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('color', c)}
                  className={cn(
                    'w-7 h-7 rounded-full border-2 transition-transform hover:scale-110',
                    form.color === c ? 'border-white scale-110' : 'border-transparent'
                  )}
                  style={{ background: c, outline: form.color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar local
          </button>
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
        const { id: _ignore, _new: _ignore2, ...rest } = data as any
        await api.post('/api/locations', rest)
      }
    },
    onSuccess: () => {
      toast.success('Local salvo!')
      qc.invalidateQueries({ queryKey: ['locations'] })
      setNewItems([])
    },
    onError: () => toast.error('Erro ao salvar local'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/locations/${id}`),
    onSuccess: () => {
      toast.success('Local removido')
      qc.invalidateQueries({ queryKey: ['locations'] })
    },
    onError: () => toast.error('Erro ao remover'),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

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
        <LocationCard
          key={loc.id}
          loc={loc}
          onSave={data => saveMut.mutateAsync(data)}
          onDelete={() => deleteMut.mutate(loc.id)}
        />
      ))}

      {newItems.map(item => (
        <LocationCard
          key={item.id}
          loc={{ _new: true } as any}
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

// ─── Main Page ────────────────────────────────────────────────────

export default function ConfiguracoesPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-bold text-[22px] tracking-tight" style={{ color: 'var(--t1)' }}>Configurações</h1>
        <p className="text-[14px] mt-0.5" style={{ color: 'var(--t2)' }}>Configure sua assistente e horários de atendimento</p>
      </div>

      <SectionCard title="Status da assistente" subtitle="Ative ou pause a IA em tempo real">
        <AIPowerToggle />
      </SectionCard>

      <SectionCard title="Assistente" subtitle="Personalidade, tom de voz e mensagem de boas-vindas">
        <TabAssistente />
      </SectionCard>

      <SectionCard title="Horários de atendimento" subtitle="Dias e horários disponíveis para agendamento">
        <TabHorarios />
      </SectionCard>

      <SectionCard
        title="Locais de atendimento"
        subtitle="Consultórios, cidades, modalidade, valor e mensagem de confirmação"
        icon={<MapPin className="w-4 h-4" style={{ color: 'var(--t3)' }} />}
      >
        <TabLocais />
      </SectionCard>
    </div>
  )
}
