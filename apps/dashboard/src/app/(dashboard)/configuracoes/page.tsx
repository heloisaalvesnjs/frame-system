'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Bot, Smartphone, Clock, CheckCircle, Trash2, Upload, Wifi, WifiOff, Moon, Send, RotateCcw, FlaskConical, BookOpen, ChevronDown, ChevronUp, MessageSquare, ArrowRight, ArrowLeft } from 'lucide-react'
import { useRef } from 'react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────
interface Assistant {
  id: string
  name: string
  tone: string
  greeting_message: string
  consultation_price?: string
  consultation_modalities?: string
  specialties?: string
  vacation_mode?: boolean
  vacation_message?: string
  followup_enabled?: boolean
  followup_delay_hours?: number
  pdf_filename?: string
}

interface WhatsAppStatus {
  status: 'connected' | 'disconnected' | 'connecting'
  phone?: string
}

// ─── Tab: Profile ─────────────────────────────────────────────────
const profileSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().optional(),
  specialty: z.string().optional(),
  bio: z.string().optional(),
})
type ProfileData = z.infer<typeof profileSchema>

function TabProfile() {
  const { user, refreshUser } = useAuth()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
  })

  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        specialty: user.specialty || '',
        bio: user.bio || '',
      })
    }
  }, [user, reset])

  async function onSubmit(data: ProfileData) {
    try {
      await api.put('/api/nutritionists/profile', data)
      await refreshUser()
      toast.success('Perfil salvo com sucesso!')
    } catch {
      toast.error('Erro ao salvar perfil. Tente novamente.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Nome completo" error={errors.name?.message} {...register('name')} />
        <Input label="E-mail" type="email" error={errors.email?.message} {...register('email')} />
        <Input label="WhatsApp pessoal" type="tel" placeholder="(11) 99999-9999" {...register('phone')} />
        <Input label="Especialidade" placeholder="Ex: Nutrição esportiva" {...register('specialty')} />
      </div>

      <Textarea
        label="Bio"
        placeholder="Fale um pouco sobre você e sua abordagem..."
        rows={4}
        {...register('bio')}
      />

      <div className="flex items-center gap-3">
        <Button type="submit" loading={isSubmitting}>
          Salvar alterações
        </Button>
      </div>
    </form>
  )
}

// ─── Tab: Assistant ───────────────────────────────────────────────
const assistantSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  tone: z.enum(['acolhedor', 'formal', 'descontraido']),
  greeting_message: z.string().min(10, 'Mensagem muito curta'),
  specialties: z.string().optional(),
  followup_enabled: z.boolean().optional(),
  followup_delay_hours: z.number().optional(),
  consultation_modalities: z.string().optional(),
  vacation_mode: z.boolean().optional(),
  vacation_message: z.string().optional(),
  service_plans: z.string().optional(),
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
  { value: 'acolhedor',   label: 'Acolhedor',    desc: 'Empático e próximo' },
  { value: 'formal',      label: 'Formal',        desc: 'Profissional e direto' },
  { value: 'descontraido', label: 'Descontraído', desc: 'Leve e informal' },
]

const MODALITIES = [
  { value: 'online',                label: 'Online' },
  { value: 'presencial',            label: 'Presencial' },
  { value: 'online,presencial',     label: 'Ambos' },
]

function TabAssistant() {
  const queryClient = useQueryClient()
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const { data: assistant } = useQuery<Assistant>({
    queryKey: ['assistant'],
    queryFn: async () => {
      const { data } = await api.get('/api/assistants')
      return data.assistant
    },
  })

  const { register, handleSubmit, reset, watch, setValue, control, formState: { errors, isSubmitting } } = useForm<AssistantFormData>({
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
        vacation_message: assistant.vacation_message || '',
        followup_enabled: assistant.followup_enabled ?? true,
        followup_delay_hours: assistant.followup_delay_hours ?? 4,
        service_plans: (assistant as any).service_plans || '',
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

  async function handleUploadPdf() {
    if (!pdfFile) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('pdf', pdfFile)
      await api.post('/api/assistants/upload-pdf', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setPdfFile(null)
      toast.success('PDF enviado e processado!')
      queryClient.invalidateQueries({ queryKey: ['assistant'] })
    } catch {
      toast.error('Erro ao enviar PDF. Verifique o arquivo.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDeletePdf() {
    try {
      await api.delete('/api/assistants/pdf')
      toast.success('PDF removido.')
      queryClient.invalidateQueries({ queryKey: ['assistant'] })
    } catch {
      toast.error('Erro ao remover PDF.')
    }
  }

  const currentModality = watch('consultation_modalities')
  const currentTone     = watch('tone')

  return (
    <div className="flex flex-col gap-7">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

        {/* Nome da assistente */}
        <Input
          label="Nome da assistente"
          placeholder="Ex: Sofia, Lara, Ana..."
          error={errors.name?.message}
          {...register('name')}
        />

        {/* Nome do nutricionista para o atendimento */}
        <Input
          label="Como o nutricionista deve ser chamado no atendimento"
          placeholder="Ex: Dr. David, Dra. Ana, Dr. Carlos Silva..."
          hint="A assistente usará esse nome com os clientes. Se vazio, usa o nome da sua conta."
          {...register('nutri_display_name')}
        />

        {/* Tom */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-white/70">Tom de voz</label>
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
                    : 'border-ui-border bg-white/3 hover:border-white/20'
                )}
              >
                <span className={cn('text-sm font-medium', currentTone === value ? 'text-brand-400' : 'text-white/70')}>
                  {label}
                </span>
                <span className="text-xs text-white/30">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Mensagem de boas-vindas */}
        <Textarea
          label="Mensagem de boas-vindas"
          hint="Enviada no primeiro contato do cliente"
          rows={3}
          error={errors.greeting_message?.message}
          {...register('greeting_message')}
        />

        {/* Especialidades */}
        <Textarea
          label="Especialidades"
          hint="A assistente usará isso para apresentar seu trabalho"
          placeholder="Ex: Emagrecimento, nutrição esportiva, saúde feminina, nutrição clínica..."
          rows={2}
          {...register('specialties')}
        />

        {/* Modalidade */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-white/70">Formato de consulta</label>
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
                    : 'border-ui-border bg-white/3 text-white/50 hover:border-white/20'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Modo férias */}
        <div className={cn(
          'flex flex-col gap-3 rounded-xl border p-4 transition-colors',
          vacationMode ? 'border-amber-500/30 bg-amber-500/5' : 'border-ui-border'
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Moon className={cn('w-4 h-4', vacationMode ? 'text-amber-400' : 'text-white/30')} />
              <div>
                <p className={cn('text-sm font-medium', vacationMode ? 'text-amber-300' : 'text-white/70')}>
                  Modo férias
                </p>
                <p className="text-xs text-white/30">A assistente pausa o atendimento automático</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setValue('vacation_mode', !vacationMode)}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors flex-shrink-0',
                vacationMode ? 'bg-amber-500' : 'bg-white/10'
              )}
            >
              <span className={cn(
                'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm',
                vacationMode ? 'translate-x-5' : 'translate-x-0'
              )} />
            </button>
          </div>

          {vacationMode && (
            <Textarea
              label="Mensagem de ausência"
              hint="Enviada quando clientes tentam falar com a assistente"
              placeholder="Ex: Estamos em férias! Retornamos no dia 10/02. Até breve! 🌴"
              rows={2}
              {...register('vacation_message')}
            />
          )}
        </div>

        {/* Follow-up automático */}
        {(() => {
          const followupEnabled = watch('followup_enabled')
          return (
            <div className={cn(
              'flex flex-col gap-3 rounded-xl border p-4 transition-colors',
              followupEnabled ? 'border-brand-500/20 bg-brand-500/5' : 'border-ui-border'
            )}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={cn('text-sm font-medium', followupEnabled ? 'text-brand-300' : 'text-white/70')}>
                    Follow-up automático
                  </p>
                  <p className="text-xs text-white/30">
                    A assistente reengaja leads que param de responder
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setValue('followup_enabled', !followupEnabled)}
                  className={cn(
                    'relative w-11 h-6 rounded-full transition-colors flex-shrink-0',
                    followupEnabled ? 'bg-brand-500' : 'bg-white/10'
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm',
                    followupEnabled ? 'translate-x-5' : 'translate-x-0'
                  )} />
                </button>
              </div>

              {followupEnabled && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-white/50">
                    Enviar após quanto tempo sem resposta?
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {[2, 4, 6, 12, 24].map((h) => {
                      const current = watch('followup_delay_hours')
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setValue('followup_delay_hours', h)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                            current === h
                              ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                              : 'border-ui-border bg-white/3 text-white/40 hover:border-white/20'
                          )}
                        >
                          {h < 24 ? `${h}h` : '1 dia'}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-white/20 mt-1">
                    Apenas para leads sem agendamento. Máximo 1 mensagem a cada 24h.
                  </p>
                </div>
              )}
            </div>
          )
        })()}

        {/* Slider de emoji */}
        {(() => {
          const level = watch('emoji_level') ?? 3
          return (
            <div className="flex flex-col gap-3 rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-t1">Uso de emojis</p>
                  <p className="text-xs text-t3">Define a frequência de emojis nas respostas da assistente</p>
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
              <div className="flex justify-between px-[56px]">
                {[1,2,3,4,5].map(n => (
                  <span key={n} className={cn('font-mono text-[9px]', level === n ? 'text-brand-500' : 'text-t3')}>{n}</span>
                ))}
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

      {/* Serviços e planos */}
      <div className="border-t border-ui-border pt-6">
        <h3 className="text-sm font-semibold text-white/80 mb-1">Serviços e planos</h3>
        <p className="text-xs text-white/30 mb-3">
          Descreva seus pacotes, valores e o que está incluso. A assistente usará isso para responder perguntas sobre preço e planos.
        </p>
        <Textarea
          placeholder={`Ex:\nConsulta avulsa: R$ 250 (90 min) — inclui anamnese, plano alimentar e 1 retorno\nPacote trimestral: R$ 600 — 3 consultas + suporte por WhatsApp\nRetorno: R$ 150 (45 min)\n\nForma de pagamento: Pix, cartão ou transferência.`}
          rows={6}
          {...register('service_plans')}
        />
      </div>

      {/* PDF */}
      <div className="border-t border-ui-border pt-6">
        <div className="flex items-start justify-between gap-4 mb-1">
          <h3 className="text-sm font-semibold text-white/80">Manual de instruções (PDF)</h3>
          <a
            href="/template-instrucoes-sofia.md"
            download="template-instrucoes-sofia.md"
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-brand-400 transition-colors flex-shrink-0"
            title="Baixar template para preencher"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Baixar template
          </a>
        </div>
        <p className="text-xs text-white/30 mb-4">
          Envie um PDF com seu protocolo, perguntas frequentes e como você gosta de atender.
          A assistente usará este documento como base de conhecimento.{' '}
          <span className="text-white/20">Baixe o template acima para se guiar.</span>
        </p>

        {assistant?.pdf_filename ? (
          <div className="flex items-center gap-3 p-3 bg-brand-500/10 border border-brand-500/20 rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-brand-400 truncate">{assistant.pdf_filename}</p>
              <p className="text-xs text-brand-500/60">PDF ativo</p>
            </div>
            <Button variant="danger" size="sm" onClick={handleDeletePdf}>
              <Trash2 className="w-3.5 h-3.5" />
              Remover
            </Button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-ui-border rounded-lg p-5 text-center hover:border-white/15 transition-colors">
            <Upload className="w-6 h-6 text-white/20 mx-auto mb-2" />
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              id="pdf-replace"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
            />
            <label htmlFor="pdf-replace" className="cursor-pointer text-sm text-brand-400 font-medium hover:text-brand-300 transition-colors">
              Selecionar PDF
            </label>
            <p className="text-xs text-white/20 mt-1">Até 10 MB</p>
          </div>
        )}

        {pdfFile && (
          <div className="flex items-center gap-3 mt-3">
            <p className="text-sm text-white/50 flex-1 truncate">{pdfFile.name}</p>
            <Button size="sm" onClick={handleUploadPdf} loading={uploading}>
              Enviar
            </Button>
          </div>
        )}
      </div>
    </div>
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

  // Carrega horários existentes
  useEffect(() => {
    if (availabilityData && !loaded) {
      setLoaded(true)
      if (availabilityData.length > 0) {
        const newSchedule = { ...DEFAULT_SCHEDULE }
        // Desativa tudo primeiro, só habilita o que vier do banco
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
      <div>
        <p className="text-sm text-white/40">
          Defina quando a assistente pode agendar consultas. Fora deste horário ela não responderá automaticamente.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {DAYS.map(({ key, label }) => {
          const day = schedule[key]
          return (
            <div
              key={key}
              className={cn(
                'flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors',
                day.enabled ? 'border-brand-500/20 bg-brand-500/5' : 'border-ui-border bg-white/2'
              )}
            >
              {/* Toggle */}
              <button
                type="button"
                onClick={() => toggle(key)}
                className={cn(
                  'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                  day.enabled ? 'border-brand-500 bg-brand-500' : 'border-white/20 bg-transparent'
                )}
              >
                {day.enabled && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              <span className={cn('text-sm font-medium w-20', day.enabled ? 'text-white/80' : 'text-white/30')}>
                {label}
              </span>

              {day.enabled && (
                <div className="flex items-center gap-2 ml-auto flex-wrap">
                  <input
                    type="time"
                    value={day.start}
                    onChange={(e) => setField(key, 'start', e.target.value)}
                    className="text-sm border border-ui-border rounded-md px-2 py-1 bg-white/5 text-white/80 focus:outline-none focus:border-brand-500/50"
                  />
                  <span className="text-white/20 text-sm">até</span>
                  <input
                    type="time"
                    value={day.end}
                    onChange={(e) => setField(key, 'end', e.target.value)}
                    className="text-sm border border-ui-border rounded-md px-2 py-1 bg-white/5 text-white/80 focus:outline-none focus:border-brand-500/50"
                  />
                  <select
                    value={day.slot}
                    onChange={(e) => setField(key, 'slot', Number(e.target.value))}
                    className="text-sm border border-ui-border rounded-md px-2 py-1 bg-ui-elevated text-white/60 focus:outline-none"
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

      <div className="flex items-center gap-3 pt-1">
        <Button onClick={handleSave} loading={saving}>Salvar horários</Button>
      </div>
    </div>
  )
}

// ─── Tab: WhatsApp ────────────────────────────────────────────────
function TabWhatsApp() {
  const [connecting, setConnecting] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [pairingPhone, setPairingPhone] = useState('')
  const [loadingPairing, setLoadingPairing] = useState(false)
  const [mode, setMode] = useState<'qr' | 'code'>('code')
  const [error, setError] = useState('')

  const { data: status, refetch } = useQuery<WhatsAppStatus>({
    queryKey: ['whatsapp-status'],
    queryFn: async () => {
      const { data } = await api.get('/api/whatsapp/status')
      return data
    },
    refetchInterval: 5000,
  })

  function startStatusPolling() {
    const statusInterval = setInterval(async () => {
      const { data: s } = await api.get('/api/whatsapp/status')
      if (s.status === 'connected') {
        clearInterval(statusInterval)
        setQrCode(null)
        setPairingCode(null)
        refetch()
      }
    }, 3000)
  }

  async function handleConnect() {
    setConnecting(true)
    setError('')
    setPairingCode(null)
    setQrCode(null)
    try {
      await api.post('/api/whatsapp/connect')
      if (mode === 'qr') {
        let attempts = 0
        const qrInterval = setInterval(async () => {
          attempts++
          if (attempts > 30) {
            clearInterval(qrInterval)
            setConnecting(false)
            setError('Tempo esgotado. Tente novamente.')
            return
          }
          try {
            const { data: qrData } = await api.get('/api/whatsapp/qr')
            if (qrData.qrCode) {
              clearInterval(qrInterval)
              setConnecting(false)
              setQrCode(qrData.qrCode)
              startStatusPolling()
            }
          } catch {}
        }, 2000)
      } else {
        await handleRequestPairingCode(true)
        setConnecting(false)
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null
      setError(message || 'Erro ao iniciar conexão')
      setConnecting(false)
    }
  }

  async function handleRequestPairingCode(fromConnect = false) {
    if (!pairingPhone.trim()) return
    if (!fromConnect) setLoadingPairing(true)
    setError('')
    try {
      const { data } = await api.post('/api/whatsapp/pairing-code', { phone: pairingPhone })
      setPairingCode(data.code)
      startStatusPolling()
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null
      setError(message || 'Erro ao gerar código. Tente novamente.')
    } finally {
      setLoadingPairing(false)
    }
  }

  async function handleDisconnect() {
    await api.post('/api/whatsapp/disconnect')
    setPairingCode(null)
    setQrCode(null)
    refetch()
  }

  const isConnected = status?.status === 'connected'

  return (
    <div className="flex flex-col gap-6">
      {/* Status */}
      <div className={cn(
        'flex items-center gap-4 p-4 rounded-xl border transition-colors',
        isConnected ? 'bg-brand-500/10 border-brand-500/20' : 'bg-white/3 border-ui-border'
      )}>
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
          isConnected ? 'bg-brand-500/20' : 'bg-white/5'
        )}>
          {isConnected ? <Wifi className="w-5 h-5 text-brand-400" /> : <WifiOff className="w-5 h-5 text-white/30" />}
        </div>
        <div>
          <p className="font-semibold text-white">{isConnected ? 'Conectado' : 'Desconectado'}</p>
          <p className="text-sm text-white/30">
            {isConnected ? `Número: ${status?.phone || 'WhatsApp ativo'}` : 'Nenhum número conectado'}
          </p>
        </div>
        <div className="ml-auto">
          <Badge variant={isConnected ? 'success' : 'default'}>
            {isConnected ? 'Online' : 'Offline'}
          </Badge>
        </div>
      </div>

      {/* Actions */}
      {isConnected ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-white/40">
            Sua assistente está ativa e respondendo mensagens no WhatsApp.
          </p>
          <Button variant="danger" onClick={handleDisconnect} className="w-fit">
            Desconectar WhatsApp
          </Button>
        </div>
      ) : pairingCode ? (
        <div className="flex flex-col items-center gap-5">
          <p className="text-sm text-white/50 text-center">
            No WhatsApp → <strong className="text-white/80">Dispositivos vinculados</strong> → <strong className="text-white/80">Vincular com número de telefone</strong> → digite o código:
          </p>
          <div className="bg-ui-elevated border border-ui-border rounded-2xl px-10 py-6 text-center">
            <p className="text-4xl font-bold text-brand-400 tracking-[0.3em]">{pairingCode}</p>
            <p className="text-xs text-white/25 mt-2">O código expira em alguns minutos</p>
          </div>
          <p className="text-xs text-white/25 animate-pulse">Aguardando conexão...</p>
        </div>
      ) : qrCode ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-white/40 text-center">
            Abra o WhatsApp → Dispositivos vinculados → Vincular dispositivo → Escaneie o QR
          </p>
          <div className="border border-ui-border rounded-xl p-4 bg-white">
            <img src={qrCode} alt="QR Code WhatsApp" className="w-56 h-56" />
          </div>
          <p className="text-xs text-white/25 animate-pulse">Aguardando conexão...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3 text-sm text-blue-400">
            Recomendamos usar um número de WhatsApp exclusivo para o consultório.
          </div>

          <div className="flex gap-1 p-1 bg-white/5 rounded-lg w-fit">
            <button
              onClick={() => setMode('code')}
              className={cn(
                'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                mode === 'code' ? 'bg-brand-500 text-white' : 'text-white/40 hover:text-white'
              )}
            >
              Código
            </button>
            <button
              onClick={() => setMode('qr')}
              className={cn(
                'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                mode === 'qr' ? 'bg-brand-500 text-white' : 'text-white/40 hover:text-white'
              )}
            >
              QR Code
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {mode === 'code' ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-white/30">
                Digite seu número com código do país e DDD (ex: 5511999999999)
              </p>
              <div className="flex gap-3">
                <input
                  type="tel"
                  placeholder="5511999999999"
                  value={pairingPhone}
                  onChange={(e) => setPairingPhone(e.target.value)}
                  className="flex-1 h-9 rounded-lg border border-ui-border bg-white/5 px-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/50 transition-colors"
                />
                <Button
                  onClick={handleConnect}
                  loading={connecting}
                  disabled={!pairingPhone.trim()}
                >
                  <Smartphone className="w-4 h-4" />
                  Conectar
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={handleConnect} loading={connecting} className="w-fit">
              <Smartphone className="w-4 h-4" />
              Conectar via QR Code
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Interview Mode ───────────────────────────────────────────────

const IQ = [
  {
    id: 0, type: 'textarea' as const,
    question: 'Como funciona a primeira consulta e o que ela inclui?',
    hint: 'Descreva o que o paciente vai receber e vivenciar',
    placeholder: 'Ex: Na primeira consulta faço anamnese completa, avalio composição corporal e entrego o plano alimentar no mesmo dia. Dura cerca de 1h...',
  },
  {
    id: 1, type: 'textarea' as const,
    question: 'Quais as 3 situações mais comuns no WhatsApp e como você responderia cada uma?',
    hint: 'Escreva como você mesmo responderia — no seu estilo natural',
    placeholder: '1. "Quanto custa?" →\n\n2. "Como funciona?" →\n\n3. "Já tentei antes e não funcionou" →',
  },
  {
    id: 2, type: 'chips_text' as const,
    question: 'Como você costuma se comunicar com os pacientes?',
    hint: 'Selecione seu estilo e, se quiser, exemplifique com uma frase',
    chips: ['Informal, como conversa de amigos', 'Acolhedor mas profissional', 'Direto e objetivo', 'Formal'],
    placeholder: 'Opcional: escreva uma frase como você falaria com um paciente novo...',
  },
  {
    id: 3, type: 'chips_single' as const,
    question: 'O que você quer que a assistente faça?',
    hint: 'Define a missão principal dela',
    chips: [
      { value: 'qualify',    label: 'Qualifica e nutre o lead',    desc: 'Entende o objetivo, apresenta o serviço e mantém o interesse aquecido' },
      { value: 'close',      label: 'Conduz ao fechamento',         desc: 'Foca em converter o contato em consulta agendada o mais rápido possível' },
      { value: 'reactivate', label: 'Reativa e não perde venda',    desc: 'Acompanha quem não respondeu e faz follow-up estratégico' },
    ],
  },
  {
    id: 4, type: 'textarea' as const,
    question: 'O que ela nunca pode dizer ou prometer, em hipótese alguma?',
    hint: 'Protege sua reputação e credibilidade',
    placeholder: 'Ex: Nunca prometer emagrecer X kg em Y dias. Nunca dar orientações nutricionais pelo chat antes da consulta...',
  },
]

const MISSION: Record<string, string> = {
  qualify:    'Qualifica e nutre o lead — entenda o objetivo do paciente antes de oferecer agendamento. Mantenha o interesse aquecido. Não pressione.',
  close:      'Conduz ao fechamento — converta o contato em consulta agendada rapidamente. Crie urgência suave mencionando horários disponíveis.',
  reactivate: 'Reativa e não perde venda — faça follow-up com leads que pararam de responder. Seja persistente mas respeitosa.',
}

function compileInterview(answers: Record<number, any>): string {
  const parts: string[] = []
  if (answers[0]?.trim())
    parts.push(`PRIMEIRA CONSULTA:\n${answers[0].trim()}`)
  if (answers[1]?.trim())
    parts.push(`SITUAÇÕES COMUNS NO WHATSAPP — USE ESTAS RESPOSTAS EXATAS:\n${answers[1].trim()}`)
  if (answers[2]) {
    const { chips = [], text = '' } = answers[2]
    let s = `TOM DE COMUNICAÇÃO: ${chips.join(', ')}`
    if (text?.trim()) s += `\nExemplo real: "${text.trim()}"`
    parts.push(s)
  }
  if (answers[3])
    parts.push(`MISSÃO PRINCIPAL DA ASSISTENTE:\n${MISSION[answers[3]] || answers[3]}`)
  if (answers[4]?.trim())
    parts.push(`NUNCA DIZER OU PROMETER:\n${answers[4].trim()}`)
  return parts.join('\n\n')
}

function InterviewMode({ onSaved }: { onSaved: () => void }) {
  type Stage = 'intro' | 'q' | 'review'
  const [stage, setStage]   = useState<Stage>('intro')
  const [qi,    setQi]      = useState(0)
  const [ans,   setAns]     = useState<Record<number, any>>({})
  const [saving, setSaving] = useState(false)

  const q       = IQ[qi]
  const total   = IQ.length
  const pct     = Math.round(((qi + 1) / total) * 100)
  const compiled = compileInterview(ans)

  function canNext() {
    const a = ans[qi]
    if (q.type === 'textarea')    return !!a?.trim()
    if (q.type === 'chips_text')  return (a?.chips?.length ?? 0) > 0
    if (q.type === 'chips_single') return !!a
    return false
  }

  function next() {
    qi < total - 1 ? setQi(n => n + 1) : setStage('review')
  }

  function back() {
    if (stage === 'review')      { setStage('q'); return }
    if (qi > 0)                  { setQi(n => n - 1); return }
    setStage('intro')
  }

  function setChipsText(chips?: string[], text?: string) {
    setAns(a => ({ ...a, [qi]: { chips: chips ?? a[qi]?.chips ?? [], text: text ?? a[qi]?.text ?? '' } }))
  }

  async function save() {
    setSaving(true)
    try {
      await api.post('/api/assistants/interview', { content: compiled })
      toast.success('Treinamento salvo! A assistente já conhece o seu consultório.')
      onSaved()
    } catch {
      toast.error('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  /* ── Intro ──────────────────────────────────────────────────── */
  if (stage === 'intro') return (
    <div className="flex flex-col items-center text-center py-8 gap-5">
      <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
        <MessageSquare className="w-6 h-6 text-brand-500" />
      </div>
      <div>
        <h3 className="font-display font-bold text-[17px] tracking-tight text-t1 mb-2">Entrevista de treinamento</h3>
        <p className="text-sm text-t2 max-w-xs leading-relaxed mx-auto">
          5 perguntas para a assistente entender como você trabalha. Responda como você mesmo falaria.
        </p>
      </div>
      <Button onClick={() => setStage('q')}>
        Começar <ArrowRight className="w-3.5 h-3.5" />
      </Button>
    </div>
  )

  /* ── Review ─────────────────────────────────────────────────── */
  if (stage === 'review') return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <div>
          <p className="text-[12px] font-semibold text-emerald-400">Entrevista concluída</p>
          <p className="text-[11px] text-t2 mt-0.5">Revise o conteúdo antes de salvar</p>
        </div>
      </div>
      <textarea
        value={compiled} readOnly rows={13}
        className="w-full rounded-xl px-4 py-3 text-[12px] text-t2 resize-none leading-relaxed font-mono"
        style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
      />
      <div className="flex items-center gap-3">
        <Button onClick={save} loading={saving}>Salvar treinamento</Button>
        <Button variant="ghost" onClick={back}><ArrowLeft className="w-3.5 h-3.5" /> Ajustar</Button>
        <Button variant="ghost" onClick={() => { setStage('intro'); setQi(0); setAns({}) }}>Refazer</Button>
      </div>
    </div>
  )

  /* ── Question ───────────────────────────────────────────────── */
  return (
    <div className="space-y-6">

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="font-mono text-[10px] text-t3 tracking-wider">PERGUNTA {qi + 1} DE {total}</span>
          <span className="font-mono text-[10px] text-t3">{pct}%</span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--raised)' }}>
          <div className="h-full rounded-full bg-brand-500 transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Question text */}
      <div>
        <h3 className="font-display font-bold text-[17px] tracking-tight text-t1 leading-snug">{q.question}</h3>
        {q.hint && <p className="text-xs text-t3 mt-1">{q.hint}</p>}
      </div>

      {/* Textarea */}
      {q.type === 'textarea' && (
        <textarea
          value={ans[qi] || ''} rows={6} autoFocus
          onChange={e => setAns(a => ({ ...a, [qi]: e.target.value }))}
          placeholder={(q as any).placeholder}
          className="w-full rounded-xl px-4 py-3 text-sm text-t1 resize-none leading-relaxed"
          style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
        />
      )}

      {/* Chips + optional text */}
      {q.type === 'chips_text' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(q as any).chips.map((chip: string) => {
              const sel = (ans[qi]?.chips || []).includes(chip)
              return (
                <button key={chip} type="button"
                  onClick={() => {
                    const prev = ans[qi]?.chips || []
                    setChipsText(sel ? prev.filter((c: string) => c !== chip) : [...prev, chip])
                  }}
                  className={cn(
                    'px-3.5 py-2 rounded-xl text-sm border transition-all',
                    sel ? 'bg-brand-500/15 border-brand-500/40 text-brand-500' : 'border-theme text-t2 hover:text-t1 hover:bg-raised'
                  )}
                >
                  {chip}
                </button>
              )
            })}
          </div>
          <textarea
            value={ans[qi]?.text || ''} rows={3}
            onChange={e => setChipsText(undefined, e.target.value)}
            placeholder={(q as any).placeholder}
            className="w-full rounded-xl px-4 py-3 text-sm text-t1 resize-none leading-relaxed"
            style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
          />
        </div>
      )}

      {/* Single chips (radio cards) */}
      {q.type === 'chips_single' && (
        <div className="space-y-2">
          {(q as any).chips.map((chip: { value: string; label: string; desc: string }) => {
            const sel = ans[qi] === chip.value
            return (
              <button key={chip.value} type="button"
                onClick={() => setAns(a => ({ ...a, [qi]: chip.value }))}
                className={cn(
                  'w-full flex items-start gap-4 px-4 py-3.5 rounded-xl border text-left transition-all',
                  sel ? 'bg-brand-500/10 border-brand-500/40' : 'border-theme hover:bg-raised'
                )}
              >
                <div className={cn(
                  'w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all',
                  sel ? 'border-brand-500' : 'border-t3'
                )}>
                  {sel && <div className="w-2 h-2 rounded-full bg-brand-500" />}
                </div>
                <div>
                  <p className={cn('text-sm font-semibold', sel ? 'text-brand-500' : 'text-t1')}>{chip.label}</p>
                  <p className="text-xs text-t2 mt-0.5">{chip.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-1">
        <Button variant="ghost" size="sm" onClick={back}>
          <ArrowLeft className="w-3.5 h-3.5" /> Anterior
        </Button>
        <Button size="sm" onClick={next} disabled={!canNext()}>
          {qi === total - 1 ? 'Ver resultado' : 'Próxima'} <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ─── Chip selector helper ─────────────────────────────────────────
function ChipSelector({ options, selected, onChange, single = false }: {
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
  single?: boolean
}) {
  const toggle = (opt: string) => {
    if (single) {
      onChange(selected[0] === opt ? [] : [opt])
    } else {
      onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt])
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => toggle(opt)}
          className={cn(
            'px-3 py-1 rounded-full text-xs border transition-colors',
            selected.includes(opt)
              ? 'bg-brand-500/20 border-brand-500/40 text-brand-300'
              : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
          )}>
          {opt}
        </button>
      ))}
    </div>
  )
}

// ─── Tab: Treinamento ────────────────────────────────────────────
function TabTreinamento() {
  const [mode, setMode] = useState<'interview' | 'form'>('interview')
  const [openSection, setOpenSection] = useState<string | null>('identidade')
  const [saving, setSaving] = useState(false)
  const [activeSource, setActiveSource] = useState<'form' | 'pdf' | null>(null)
  const [dirty, setDirty] = useState(false)

  // Array fields (chips / checkboxes)
  const [especialidades, setEspecialidades] = useState<string[]>([])
  const [modalidade,     setModalidade]     = useState<string[]>([])
  const [experiencia,    setExperiencia]    = useState<string[]>([])
  const [faixaEtaria,    setFaixaEtaria]    = useState<string[]>([])
  const [objetivos,      setObjetivos]      = useState<string[]>([])
  const [sempre,         setSempre]         = useState<string[]>([])
  const [nunca,          setNunca]          = useState<string[]>([])

  // Text fields
  const [nomeTitulo,    setNomeTitulo]    = useState('')
  const [diferencial,   setDiferencial]   = useState('')
  const [resultados,    setResultados]    = useState('')
  const [faq,           setFaq]           = useState('')
  const [instrExtras,   setInstrExtras]   = useState('')

  const { data: assistant } = useQuery<any>({
    queryKey: ['assistant'],
    queryFn: async () => { const { data } = await api.get('/api/assistants'); return data.assistant },
  })

  const { data: formData, isLoading } = useQuery<any>({
    queryKey: ['training-form'],
    queryFn: async () => { const { data } = await api.get('/api/assistants/training-form'); return data.form },
  })

  useEffect(() => {
    if (!formData) {
      if (assistant?.pdf_filename) setActiveSource('pdf')
      return
    }
    // Carrega dados salvos (novo formato)
    if (formData.nome_titulo !== undefined) {
      setNomeTitulo(formData.nome_titulo    || '')
      setEspecialidades(formData.especialidades || [])
      setModalidade(formData.modalidade ? [formData.modalidade] : [])
      setExperiencia(formData.experiencia  ? [formData.experiencia] : [])
      setDiferencial(formData.diferencial  || '')
      setFaixaEtaria(formData.faixa_etaria || [])
      setObjetivos(formData.objetivos      || [])
      setResultados(formData.resultados    || '')
      setFaq(formData.faq                  || '')
      setSempre(formData.sempre            || [])
      setNunca(formData.nunca              || [])
      setInstrExtras(formData.instrucoes_extras || '')
    }
    setActiveSource('form')
  }, [formData, assistant])

  function markDirty() { setDirty(true) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/api/assistants/training-form', {
        nome_titulo:    nomeTitulo,
        especialidades,
        modalidade:     modalidade[0] || '',
        experiencia:    experiencia[0] || '',
        diferencial,
        faixa_etaria:   faixaEtaria,
        objetivos,
        resultados,
        faq,
        sempre,
        nunca,
        instrucoes_extras: instrExtras,
      })
      setActiveSource('form')
      setDirty(false)
      toast.success('Treinamento salvo! A assistente já usa as novas informações.')
    } catch {
      toast.error('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const field = (label: string, children: React.ReactNode, hint?: string) => (
    <div className="space-y-2">
      <label className="text-xs font-medium text-white/60">{label}</label>
      {hint && <p className="text-[11px] text-white/25 -mt-1">{hint}</p>}
      {children}
    </div>
  )

  const ta = (value: string, onChange: (v: string) => void, placeholder: string, rows = 3) => (
    <textarea value={value} onChange={e => { onChange(e.target.value); markDirty() }} rows={rows}
      placeholder={placeholder}
      className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-3 text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-brand-500/40 transition-colors resize-none leading-relaxed" />
  )

  const chips = (opts: string[], val: string[], set: (v: string[]) => void, single = false) => (
    <ChipSelector options={opts} selected={val} single={single}
      onChange={v => { set(v); markDirty() }} />
  )

  const checkList = (items: string[], selected: string[], setSelected: (v: string[]) => void) => (
    <div className="space-y-2">
      {items.map(item => (
        <label key={item} className="flex items-start gap-2.5 cursor-pointer group">
          <div
            onClick={() => { setSelected(selected.includes(item) ? selected.filter(s => s !== item) : [...selected, item]); markDirty() }}
            className={cn(
              'w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors cursor-pointer',
              selected.includes(item)
                ? 'bg-brand-500 border-brand-500'
                : 'border-white/20 bg-white/5 group-hover:border-white/30'
            )}
          >
            {selected.includes(item) && <CheckCircle className="w-2.5 h-2.5 text-white" />}
          </div>
          <span className="text-xs text-white/50 group-hover:text-white/70 transition-colors leading-relaxed">{item}</span>
        </label>
      ))}
    </div>
  )

  const sections = [
    {
      id: 'identidade',
      title: 'Identidade do consultório',
      description: 'Quem é o nutricionista e seus diferenciais',
      content: (
        <div className="space-y-5">
          {field('Nome e título', (
            <input value={nomeTitulo} onChange={e => { setNomeTitulo(e.target.value); markDirty() }}
              placeholder="Ex: Dr. David Effgen, nutricionista funcional e esportivo"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/40 transition-colors" />
          ))}
          {field('Especialidades', chips(
            ['Emagrecimento', 'Ganho de massa', 'Performance esportiva', 'Nutrição clínica', 'Gestação', 'Nutrição infantil', 'Doenças crônicas', 'Vegetariano/vegano'],
            especialidades, setEspecialidades
          ))}
          {field('Modalidade de atendimento', chips(
            ['Online', 'Presencial', 'Online e presencial'],
            modalidade, setModalidade, true
          ))}
          {field('Tempo de experiência', chips(
            ['Menos de 2 anos', '2 a 5 anos', '5 a 10 anos', 'Mais de 10 anos'],
            experiencia, setExperiencia, true
          ))}
          {field('Diferencial do método', ta(diferencial, setDiferencial,
            'O que torna seu trabalho único. Ex: não uso dietas padrão, investigo causas metabólicas e hormonais, crio um plano para a rotina real do paciente.'))}
        </div>
      )
    },
    {
      id: 'publico',
      title: 'Público atendido e resultados',
      description: 'Quem são seus pacientes e o que costumam alcançar',
      content: (
        <div className="space-y-5">
          {field('Faixa etária predominante', chips(
            ['18-25 anos', '25-35 anos', '35-45 anos', '45-60 anos', 'Todas as idades'],
            faixaEtaria, setFaixaEtaria
          ))}
          {field('Objetivos mais atendidos', chips(
            ['Emagrecer', 'Ganhar massa', 'Qualidade de vida', 'Performance atlética', 'Doenças crônicas', 'Pós-operatório', 'Gestação'],
            objetivos, setObjetivos
          ))}
          {field('Resultados típicos', ta(resultados, setResultados,
            'Ex: meus pacientes costumam perder entre 4-8kg no primeiro mês, com melhora de energia e redução de compulsão alimentar.'))}
        </div>
      )
    },
    {
      id: 'faq',
      title: 'Perguntas frequentes',
      description: 'Dúvidas comuns com as respostas exatas que a assistente deve usar',
      content: (
        <div className="space-y-3">
          <p className="text-[11px] text-white/30 leading-relaxed">
            Use o formato <code className="text-white/50 font-mono">P: pergunta</code> / <code className="text-white/50 font-mono">R: resposta</code>. A assistente vai usar estas respostas palavra por palavra.
          </p>
          {ta(faq, setFaq,
`P: Você atende pelo plano de saúde?
R: Não, o atendimento é particular. Os valores estão nos planos acima.

P: Quantas consultas são necessárias?
R: A frequência ideal definimos juntos na primeira consulta.

P: A consulta online funciona igual ao presencial?
R: Sim, é tão completa. Usamos videochamada e avalio tudo que preciso.`, 10)}
        </div>
      )
    },
    {
      id: 'instrucoes',
      title: 'Instruções especiais',
      description: 'O que a assistente deve sempre dizer e nunca prometer',
      content: (
        <div className="space-y-6">
          {field('Sempre mencionar', checkList(
            [
              'Que o atendimento é totalmente personalizado, sem dietas padrão',
              'Que temos pacientes com resultados reais e comprovados',
              'Que a primeira consulta já inclui a montagem do plano alimentar',
              'Os diferenciais do método do nutricionista',
              'Que fazemos acompanhamento próximo entre consultas',
            ],
            sempre, setSempre
          ))}
          {field('Nunca dizer ou prometer', checkList(
            [
              'Prometer emagrecer X kg em Y dias',
              'Recomendar dietas da moda (keto, detox, jejum sem contexto)',
              'Dizer que vai "resolver" o problema',
              'Comparar com outros profissionais ou métodos',
              'Dar orientações nutricionais pelo chat antes da consulta',
            ],
            nunca, setNunca
          ))}
          {field('Observações extras', ta(instrExtras, setInstrExtras,
            'Qualquer instrução adicional específica do seu consultório...', 3))}
        </div>
      )
    },
  ]

  if (isLoading) return <div className="py-8 text-center text-t2 text-sm">Carregando...</div>

  return (
    <div className="space-y-5">

      {/* Toggle */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--raised)' }}>
        {(['interview', 'form'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={cn(
              'flex-1 py-2 rounded-lg font-mono text-[11px] tracking-wide transition-all',
              mode === m ? 'bg-surface text-t1 shadow-frame' : 'text-t2 hover:text-t1'
            )}
          >
            {m === 'interview' ? 'Entrevista' : 'Formulário'}
          </button>
        ))}
      </div>

      {/* Interview mode */}
      {mode === 'interview' && <InterviewMode onSaved={() => setMode('form')} />}

      {/* Form mode */}
      {mode === 'form' && <div className="space-y-5">
      <div>
        <p className="text-xs text-t2">Preencha para que a assistente conheça o consultório em detalhe.</p>
      </div>

      {activeSource && (
        <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border text-xs',
          activeSource === 'form'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
        )}>
          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {activeSource === 'form'
            ? 'Usando informações do formulário abaixo'
            : `Usando PDF enviado (${assistant?.pdf_filename}). Salvar o formulário vai substituir o PDF.`}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-2">
        {sections.map(s => (
          <div key={s.id} className="border border-white/[0.08] rounded-xl overflow-hidden">
            <button type="button" onClick={() => setOpenSection(openSection === s.id ? null : s.id)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.02] transition-colors text-left">
              <div>
                <p className="text-sm font-medium text-white">{s.title}</p>
                <p className="text-xs text-white/30 mt-0.5">{s.description}</p>
              </div>
              {openSection === s.id
                ? <ChevronUp className="w-4 h-4 text-white/30 flex-shrink-0 ml-3" />
                : <ChevronDown className="w-4 h-4 text-white/30 flex-shrink-0 ml-3" />}
            </button>
            {openSection === s.id && (
              <div className="px-4 pb-5 pt-4 border-t border-white/[0.06] space-y-4">
                {s.content}
              </div>
            )}
          </div>
        ))}

        <div className="pt-2 flex items-center justify-between">
          <p className="text-xs text-t3">As informações são aplicadas imediatamente após salvar.</p>
          <Button type="submit" disabled={saving || !dirty} size="sm">
            {saving ? 'Salvando...' : 'Salvar treinamento'}
          </Button>
        </div>
      </form>
      </div>}

    </div>
  )
}

// ─── Tab: Testar IA ───────────────────────────────────────────────
interface TestMsg {
  role: 'user' | 'assistant' | 'system'
  content: string
  variant?: 'info' | 'success' | 'error'
}

const TRAINING_CATEGORIES = ['abertura', 'objecoes', 'agendamento', 'tom'] as const

function TabTestar() {
  const [messages, setMessages] = useState<TestMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetting, setResetting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: assistant } = useQuery<any>({
    queryKey: ['assistant'],
    queryFn: async () => { const { data } = await api.get('/api/assistants'); return data.assistant },
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function doReset(silent = false) {
    setResetting(true)
    try {
      await api.post('/api/assistants/test', { message: '__reset__', reset: true })
    } catch {}
    setMessages(silent ? [] : [{ role: 'system', content: 'Conversa reiniciada', variant: 'info' }])
    setResetting(false)
  }

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    // ── Comando /new ─────────────────────────────────────────
    if (text === '/new') {
      await doReset()
      return
    }

    // ── Comando /treinar ou /ajustar ─────────────────────────
    if (text.startsWith('/treinar ') || text.startsWith('/ajustar ')) {
      const raw = text.replace(/^\/(treinar|ajustar)\s+/, '').trim()
      const firstWord = raw.split(' ')[0].toLowerCase() as any
      const hasCategory = (TRAINING_CATEGORIES as readonly string[]).includes(firstWord)
      const category = hasCategory ? firstWord : 'geral'
      const content = hasCategory ? raw.slice(firstWord.length + 1).trim() : raw

      if (!content) {
        setMessages(prev => [...prev,
          { role: 'system', content: 'Uso: /treinar [categoria?] [observação]. Categorias: abertura objecoes agendamento tom', variant: 'error' }
        ])
        return
      }

      setMessages(prev => [...prev, { role: 'user', content: text }])
      setLoading(true)
      try {
        await api.post('/api/assistants/training', { content, category })
        const preview = content.length > 60 ? content.slice(0, 60) + '…' : content
        setMessages(prev => [...prev, {
          role: 'system',
          content: `✓ Treinamento salvo [${category}]: "${preview}"`,
          variant: 'success'
        }])
      } catch {
        setMessages(prev => [...prev, { role: 'system', content: 'Erro ao salvar treinamento.', variant: 'error' }])
      } finally {
        setLoading(false)
      }
      return
    }

    // ── Mensagem normal ──────────────────────────────────────
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)
    try {
      const { data } = await api.post('/api/assistants/test', { message: text })
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Erro ao processar. Verifique se a assistente está configurada.' }])
    } finally {
      setLoading(false)
    }
  }

  const assistantName = assistant?.name || 'Assistente'

  return (
    <div className="flex flex-col h-[640px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-sm font-semibold text-white">{assistantName}</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/20 text-amber-400 font-medium">MODO TESTE</span>
          </div>
          <p className="text-xs text-white/30 mt-0.5">Simule uma conversa de cliente para testar o atendimento</p>
        </div>
        <button
          onClick={() => doReset()}
          disabled={resetting || messages.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-white/40 hover:text-white/70 hover:border-white/20 transition-colors disabled:opacity-30"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reiniciar
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-3">
              <FlaskConical className="w-5 h-5 text-brand-400" />
            </div>
            <p className="text-sm font-medium text-white/30">Digite como se fosse um cliente</p>
            <p className="text-xs text-white/15 mt-1">"Oi, quero emagrecer" ou "Quanto custa a consulta?"</p>
          </div>
        )}

        {messages.map((m, i) => {
          // Mensagem de sistema (comando feedback)
          if (m.role === 'system') {
            return (
              <div key={i} className="flex justify-center py-0.5">
                <span className={`text-[11px] px-3 py-1 rounded-full border ${
                  m.variant === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : m.variant === 'error'   ? 'bg-red-500/10 border-red-500/20 text-red-400'
                  : 'bg-white/5 border-white/10 text-white/30'
                }`}>{m.content}</span>
              </div>
            )
          }

          return (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                  <Bot className="w-3 h-3 text-brand-400" />
                </div>
              )}
              <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-brand-500 text-white rounded-br-sm'
                  : 'bg-white/[0.07] text-white/85 rounded-bl-sm'
              }`}>
                {m.content}
              </div>
              {m.role === 'user' && (
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center ml-2 flex-shrink-0 mt-1">
                  <User className="w-3 h-3 text-white/40" />
                </div>
              )}
            </div>
          )
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center mr-2 flex-shrink-0">
              <Bot className="w-3 h-3 text-brand-400" />
            </div>
            <div className="bg-white/[0.07] px-3.5 py-2.5 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input + hint */}
      <div className="pt-4 border-t border-white/[0.06] mt-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Escreva como cliente, /new para reiniciar, /treinar para ajustar..."
            disabled={loading}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/40 transition-colors disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-xl bg-brand-500 hover:bg-brand-400 flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="text-[10px] text-white/15 mt-2 px-1">
          Comandos:{' '}
          <code className="text-white/25 font-mono">/new</code> reinicia conversa{' · '}
          <code className="text-white/25 font-mono">/treinar [obs]</code> salva ajuste geral{' · '}
          <code className="text-white/25 font-mono">/treinar objecoes|abertura|agendamento|tom [obs]</code> por categoria
        </p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────
const TABS = [
  { id: 'assistant',   label: 'Assistente',  icon: Bot          },
  { id: 'treinamento', label: 'Treinamento', icon: BookOpen     },
  { id: 'horarios',    label: 'Horários',    icon: Clock        },
  { id: 'whatsapp',    label: 'WhatsApp',    icon: Smartphone   },
  { id: 'testar',      label: 'Testar IA',   icon: FlaskConical },
]

const VALID_TABS = TABS.map(t => t.id)

export default function ConfiguracoesPage() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(() => {
    const t = searchParams.get('tab')
    return t && VALID_TABS.includes(t) ? t : 'assistant'
  })

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display font-bold text-[22px] tracking-tight text-t1">Configurações</h1>
        <p className="text-sm text-t2 mt-0.5">Assistente, treinamento, horários e WhatsApp</p>
      </div>

      <Card>
        <div className="px-6" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex gap-0.5 overflow-x-auto">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-3.5 text-[12px] font-mono border-b-2 transition-all duration-150 -mb-px whitespace-nowrap tracking-wide',
                  activeTab === id
                    ? 'border-brand-500 text-brand-500'
                    : 'border-transparent text-t3 hover:text-t2'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <CardContent className="py-6">
          {activeTab === 'assistant'   && <TabAssistant />}
          {activeTab === 'treinamento' && <TabTreinamento />}
          {activeTab === 'horarios'    && <TabHorarios />}
          {activeTab === 'whatsapp'    && <TabWhatsApp />}
          {activeTab === 'testar'      && <TabTestar />}
        </CardContent>
      </Card>
    </div>
  )
}
