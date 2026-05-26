'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Bot, Smartphone, Clock, CheckCircle, Trash2, Upload, Wifi, WifiOff, Moon } from 'lucide-react'
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
})
type AssistantFormData = z.infer<typeof assistantSchema>

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

        {/* Nome */}
        <Input
          label="Nome da assistente"
          placeholder="Ex: Sofia, Lara, Ana..."
          error={errors.name?.message}
          {...register('name')}
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
          hint="A Sofia usará isso para apresentar seu trabalho"
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
                <p className="text-xs text-white/30">Sofia pausa o atendimento automático</p>
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
              hint="Enviada quando clientes tentam falar com a Sofia"
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
                    Sofia reengaja leads que param de responder
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

        <div className="flex items-center gap-3">
          <Button type="submit" loading={isSubmitting}>Salvar</Button>
        </div>
      </form>

      {/* PDF */}
      <div className="border-t border-ui-border pt-6">
        <h3 className="text-sm font-semibold text-white/80 mb-1">Manual de instruções (PDF)</h3>
        <p className="text-xs text-white/30 mb-4">
          Envie um PDF com seu protocolo, perguntas frequentes e como você gosta de atender.
          A assistente usará este documento como base de conhecimento.
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
          Defina quando a Sofia pode agendar consultas. Fora deste horário ela não responderá automaticamente.
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

// ─── Main Page ────────────────────────────────────────────────────
const tabs = [
  { id: 'profile',    label: 'Perfil',     icon: User },
  { id: 'assistant',  label: 'Assistente', icon: Bot },
  { id: 'horarios',   label: 'Horários',   icon: Clock },
  { id: 'whatsapp',   label: 'WhatsApp',   icon: Smartphone },
]

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Configurações</h1>
        <p className="text-sm text-white/30 mt-0.5">Gerencie seu perfil e as configurações da assistente</p>
      </div>

      <Card>
        {/* Tabs */}
        <div className="border-b border-ui-border px-6">
          <div className="flex gap-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-all duration-150 -mb-px',
                  activeTab === id
                    ? 'border-brand-500 text-brand-400'
                    : 'border-transparent text-white/30 hover:text-white/60'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <CardContent className="py-6">
          {activeTab === 'profile'   && <TabProfile />}
          {activeTab === 'assistant' && <TabAssistant />}
          {activeTab === 'horarios'  && <TabHorarios />}
          {activeTab === 'whatsapp'  && <TabWhatsApp />}
        </CardContent>
      </Card>
    </div>
  )
}
