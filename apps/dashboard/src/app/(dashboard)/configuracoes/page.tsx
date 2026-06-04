'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Moon, MapPin, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────
interface Assistant {
  id: string; name: string; tone: string; greeting_message: string
  consultation_price?: string; consultation_modalities?: string
  specialties?: string; vacation_mode?: boolean; vacation_message?: string
}

// ─── Tab: Assistente ─────────────────────────────────────────────

const assistantSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  tone: z.enum(['acolhedor', 'formal', 'descontraido']),
  greeting_message: z.string().min(10, 'Mensagem muito curta'),
  specialties: z.string().optional(),
  consultation_modalities: z.string().optional(),
  vacation_mode: z.boolean().optional(),
  vacation_message: z.string().optional(),
  nutri_display_name: z.string().optional(),
  emoji_level: z.number().min(1).max(5).default(3),
  func_prospeccao: z.boolean().default(true),
  func_triagem: z.boolean().default(true),
  func_agendamento: z.boolean().default(true),
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
  { value: 'acolhedor',    label: 'Acolhedor',     desc: 'Empático e próximo' },
  { value: 'formal',       label: 'Formal',         desc: 'Profissional e direto' },
  { value: 'descontraido', label: 'Descontraído',   desc: 'Leve e informal' },
]

const MODALITIES = [
  { value: 'online',             label: 'Online' },
  { value: 'presencial',         label: 'Presencial' },
  { value: 'online,presencial',  label: 'Ambos' },
]

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
        name: assistant.name,
        tone: (assistant.tone as any) || 'acolhedor',
        greeting_message: assistant.greeting_message || '',
        specialties: assistant.specialties || '',
        consultation_modalities: assistant.consultation_modalities || 'online',
        vacation_mode: assistant.vacation_mode ?? false,
        vacation_message: (assistant as any).vacation_message || '',
        nutri_display_name: (assistant as any).nutri_display_name || '',
        emoji_level: (assistant as any).emoji_level ?? 3,
        func_prospeccao:  (assistant as any).func_prospeccao  ?? true,
        func_triagem:     (assistant as any).func_triagem     ?? true,
        func_agendamento: (assistant as any).func_agendamento ?? true,
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

      <Input
        label="Nome da assistente"
        placeholder="Ex: Sofia, Lara, Ana..."
        error={errors.name?.message}
        {...register('name')}
      />

      <Input
        label="Como o nutricionista deve ser chamado no atendimento"
        placeholder="Ex: Dr. David, Dra. Ana..."
        hint="Se vazio, usa o nome da sua conta."
        {...register('nutri_display_name')}
      />

      {/* Tom */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-t2">Tom de voz</label>
        <div className="grid grid-cols-3 gap-2">
          {TONES.map(({ value, label, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => setValue('tone', value as any)}
              className={cn(
                'flex flex-col gap-0.5 px-3 py-2.5 rounded-lg border text-left transition-all',
                currentTone === value
                  ? 'border-brand-500 bg-brand-500/10'
                  : 'hover:bg-raised'
              )}
              style={{ borderColor: currentTone === value ? undefined : 'var(--border)' }}
            >
              <span className={cn('text-sm font-medium', currentTone === value ? 'text-brand-400' : 'text-t2')}>{label}</span>
              <span className="text-xs text-t3">{desc}</span>
            </button>
          ))}
        </div>
      </div>

      <Textarea
        label="Mensagem de boas-vindas"
        hint="Enviada no primeiro contato do cliente"
        rows={3}
        error={errors.greeting_message?.message}
        {...register('greeting_message')}
      />

      <Textarea
        label="Especialidades"
        hint="A assistente usará isso para apresentar seu trabalho"
        placeholder="Ex: Emagrecimento, nutrição esportiva, saúde feminina..."
        rows={2}
        {...register('specialties')}
      />

      {/* Modalidade */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-t2">Formato de consulta</label>
        <div className="flex gap-2">
          {MODALITIES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setValue('consultation_modalities', value)}
              className={cn(
                'px-4 py-2 rounded-lg border text-sm font-medium transition-all',
                currentModality === value
                  ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                  : 'text-t3 hover:bg-raised'
              )}
              style={{ borderColor: currentModality === value ? undefined : 'var(--border)' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Modo férias */}
      <div className={cn(
        'flex flex-col gap-3 rounded-xl border p-4 transition-colors',
        vacationMode ? 'border-amber-500/30 bg-amber-500/5' : ''
      )} style={{ borderColor: vacationMode ? undefined : 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Moon className={cn('w-4 h-4', vacationMode ? 'text-amber-400' : 'text-t3')} />
            <div>
              <p className={cn('text-sm font-medium', vacationMode ? 'text-amber-300' : 'text-t1')}>Modo férias</p>
              <p className="text-xs text-t3">A assistente pausa o atendimento automático</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setValue('vacation_mode', !vacationMode)}
            className={cn('relative w-11 h-6 rounded-full transition-colors flex-shrink-0', vacationMode ? 'bg-amber-500' : 'bg-raised')}
            style={vacationMode ? {} : { border: '1px solid var(--border)' }}
          >
            <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm', vacationMode ? 'translate-x-5' : 'translate-x-0')} />
          </button>
        </div>
        {vacationMode && (
          <Textarea
            label="Mensagem de ausência"
            hint="Enviada quando clientes tentam falar com a assistente"
            placeholder="Ex: Estamos em férias! Retornamos no dia 10/02. Até breve!"
            rows={2}
            {...register('vacation_message')}
          />
        )}
      </div>

      {/* Slider de emoji */}
      {(() => {
        const level = watch('emoji_level') ?? 3
        return (
          <div className="flex flex-col gap-3 rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-t1">Uso de emojis</p>
                <p className="text-xs text-t3">Define a frequência de emojis nas respostas</p>
              </div>
              <span className="font-mono text-[11px] text-brand-500 px-2 py-0.5 rounded-full bg-brand-500/10">
                {EMOJI_LABELS[level]}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-t3 w-14">Nenhum</span>
              <input
                type="range" min={1} max={5} step={1}
                value={level}
                onChange={e => setValue('emoji_level', Number(e.target.value))}
                className="flex-1 accent-brand-500 h-1.5 cursor-pointer"
              />
              <span className="font-mono text-[10px] text-t3 w-8">Muito</span>
            </div>
          </div>
        )
      })()}

      {/* Funções habilitadas */}
      <div className="flex flex-col gap-3 rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}>
        <div>
          <p className="text-sm font-medium text-t1">Funções habilitadas</p>
          <p className="text-xs text-t3">Controle o que a assistente pode fazer</p>
        </div>
        {FUNCOES.map(({ key, label, desc }) => {
          const enabled = watch(key) ?? true
          return (
            <div key={key} className="flex items-center justify-between">
              <div>
                <p className={cn('text-sm font-medium', enabled ? 'text-t1' : 'text-t2')}>{label}</p>
                <p className="text-xs text-t3">{desc}</p>
              </div>
              <button
                type="button"
                onClick={() => setValue(key, !enabled)}
                className={cn('relative w-10 h-[22px] rounded-full transition-colors flex-shrink-0', enabled ? 'bg-brand-500' : 'bg-raised')}
                style={enabled ? {} : { border: '1px solid var(--border)' }}
              >
                <span className={cn('absolute top-[2px] w-[18px] h-[18px] bg-white rounded-full shadow-sm transition-transform', enabled ? 'left-[20px]' : 'left-[2px]')} />
              </button>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" loading={isSubmitting}>Salvar</Button>
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
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

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
          day_of_week: int,
          start_time: schedule[key].start,
          end_time: schedule[key].end,
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
      <p className="text-sm text-t2">
        Defina quando a assistente pode agendar consultas. Fora deste horário ela não oferecerá agendamento automático.
      </p>

      <div className="flex flex-col gap-2">
        {DAYS.map(({ key, label }) => {
          const day = schedule[key]
          return (
            <div
              key={key}
              className={cn(
                'flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors',
                day.enabled ? 'border-brand-500/20 bg-brand-500/5' : ''
              )}
              style={{ borderColor: day.enabled ? undefined : 'var(--border)' }}
            >
              <button
                type="button"
                onClick={() => toggle(key)}
                className={cn(
                  'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                  day.enabled ? 'border-brand-500 bg-brand-500' : 'bg-transparent'
                )}
                style={{ borderColor: day.enabled ? undefined : 'var(--border)' }}
              >
                {day.enabled && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              <span className={cn('text-sm font-medium w-20', day.enabled ? 'text-t1' : 'text-t3')}>
                {label}
              </span>

              {day.enabled && (
                <div className="flex items-center gap-2 ml-auto flex-wrap">
                  <input
                    type="time"
                    value={day.start}
                    onChange={(e) => setField(key, 'start', e.target.value)}
                    className="text-sm rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                    style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--t1)' }}
                  />
                  <span className="text-t3 text-sm">até</span>
                  <input
                    type="time"
                    value={day.end}
                    onChange={(e) => setField(key, 'end', e.target.value)}
                    className="text-sm rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                    style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--t1)' }}
                  />
                  <select
                    value={day.slot}
                    onChange={(e) => setField(key, 'slot', Number(e.target.value))}
                    className="text-sm rounded-md px-2 py-1 focus:outline-none"
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

      <Button onClick={handleSave} loading={saving} className="w-fit">Salvar horários</Button>
    </div>
  )
}

// ─── Tab: Locais de Atendimento ───────────────────────────────────

interface Location {
  id: string
  name: string
  city?: string
  address?: string
  color?: string
  modality?: string
  price?: string
  payment_info?: string
  deposit_required?: boolean
  deposit_amount?: string
  confirmation_message?: string
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
  loc,
  onSave,
  onDelete,
}: {
  loc: Partial<Location> & { _new?: boolean }
  onSave: (data: Partial<Location>) => Promise<void>
  onDelete?: () => void
}) {
  const [open, setOpen] = useState(loc._new ?? false)
  const [form, setForm] = useState<Partial<Location>>({
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
    try {
      await onSave({ ...loc, ...form })
      setOpen(false)
    } finally { setSaving(false) }
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-raised transition-colors" onClick={() => setOpen(o => !o)}>
        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: form.color }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-t1 truncate">{form.name || <span className="text-t3 italic">Novo local</span>}</p>
          {form.city && <p className="text-xs text-t3 truncate">{form.city}{form.modality ? ` · ${form.modality}` : ''}</p>}
        </div>
        <div className="flex items-center gap-2">
          {onDelete && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onDelete() }}
              className="p-1.5 rounded-lg text-t3 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-t3" /> : <ChevronDown className="w-4 h-4 text-t3" />}
        </div>
      </div>

      {/* Form (collapsible) */}
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>

          <div className="grid grid-cols-2 gap-3 pt-3">
            <div className="col-span-2">
              <Input
                label="Nome do local"
                placeholder="Ex: Consultório Centro SP, Clínica Online..."
                value={form.name}
                onChange={e => set('name', e.target.value)}
              />
            </div>

            <Input
              label="Cidade"
              placeholder="São Paulo"
              value={form.city}
              onChange={e => set('city', e.target.value)}
            />

            {/* Modalidade */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-t2">Modalidade</label>
              <select
                value={form.modality}
                onChange={e => set('modality', e.target.value)}
                className="rounded-lg px-3 py-2 text-sm text-t1 focus:outline-none"
                style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
              >
                {LOCATION_MODALITIES.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <Input
                label="Endereço completo"
                placeholder="Rua das Flores, 100 — Sala 5 — Centro"
                value={form.address}
                onChange={e => set('address', e.target.value)}
              />
            </div>
          </div>

          {/* Valor + pagamento */}
          <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs font-semibold text-t2 uppercase tracking-wider">Valor & Pagamento</p>

            <Input
              label="Valor da consulta"
              placeholder="Ex: R$ 250,00 ou A partir de R$ 200"
              value={form.price}
              onChange={e => set('price', e.target.value)}
            />

            <Textarea
              label="Instruções de pagamento"
              placeholder="Ex: Pix: 11999999999 (João Silva) ou Cartão no local."
              rows={2}
              value={form.payment_info}
              onChange={e => set('payment_info', e.target.value)}
            />

            {/* Sinal / Depósito */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-sm font-medium text-t1">Exige sinal para confirmar</p>
                <p className="text-xs text-t3">Paciente precisa pagar antecipadamente</p>
              </div>
              <button
                type="button"
                onClick={() => set('deposit_required', !form.deposit_required)}
                className={cn(
                  'relative w-10 h-[22px] rounded-full transition-colors flex-shrink-0',
                  form.deposit_required ? 'bg-brand-500' : 'bg-raised'
                )}
                style={form.deposit_required ? {} : { border: '1px solid var(--border)' }}
              >
                <span className={cn(
                  'absolute top-[2px] w-[18px] h-[18px] bg-white rounded-full shadow-sm transition-transform',
                  form.deposit_required ? 'left-[20px]' : 'left-[2px]'
                )} />
              </button>
            </div>

            {form.deposit_required && (
              <Input
                label="Valor do sinal"
                placeholder="Ex: R$ 50,00 (10% do valor total)"
                value={form.deposit_amount}
                onChange={e => set('deposit_amount', e.target.value)}
              />
            )}
          </div>

          {/* Mensagem de confirmação */}
          <Textarea
            label="Mensagem de confirmação de agendamento"
            hint="Enviada automaticamente após o paciente agendar — inclui endereço e instruções"
            placeholder="Ex: Sua consulta está confirmada! 🎉 Aguardamos você no endereço abaixo..."
            rows={3}
            value={form.confirmation_message}
            onChange={e => set('confirmation_message', e.target.value)}
          />

          {/* Cor */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-t2">Cor na agenda</label>
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
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <Button onClick={handleSave} loading={saving} className="w-full">
            Salvar local
          </Button>
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

  function addNew() {
    setNewItems(prev => [...prev, { id: `_new_${Date.now()}` }])
  }

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-3">
      {locations.length === 0 && newItems.length === 0 && (
        <div className="text-center py-8 text-sm text-t3">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
          Nenhum local cadastrado ainda. Adicione seu consultório ou cidade de atendimento.
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
        onClick={addNew}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed text-sm text-t3 hover:text-brand-400 hover:border-brand-500/40 transition-colors"
        style={{ borderColor: 'var(--border)' }}
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
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="font-display font-bold text-[22px] tracking-tight text-t1">Configurações</h1>
        <p className="text-sm text-t2 mt-0.5">Configure sua assistente e horários de atendimento</p>
      </div>

      {/* Seção: Assistente */}
      <Card>
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold text-t1">Assistente</p>
          <p className="text-xs text-t3 mt-0.5">Personalidade, tom de voz e mensagem de boas-vindas</p>
        </div>
        <CardContent className="py-6">
          <TabAssistente />
        </CardContent>
      </Card>

      {/* Seção: Horários */}
      <Card>
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold text-t1">Horários de atendimento</p>
          <p className="text-xs text-t3 mt-0.5">Dias e horários disponíveis para agendamento</p>
        </div>
        <CardContent className="py-6">
          <TabHorarios />
        </CardContent>
      </Card>

      {/* Seção: Locais */}
      <Card>
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-t3" />
            <p className="text-sm font-semibold text-t1">Locais de atendimento</p>
          </div>
          <p className="text-xs text-t3 mt-0.5">Consultórios, cidades, modalidade, valor e mensagem de confirmação</p>
        </div>
        <CardContent className="py-6">
          <TabLocais />
        </CardContent>
      </Card>
    </div>
  )
}
