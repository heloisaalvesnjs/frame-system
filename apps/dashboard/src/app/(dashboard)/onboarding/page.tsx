'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle, Bot, Clock, Smartphone, User } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { cn } from '@/lib/utils'

// ─── Step schemas ────────────────────────────────────────────────
const assistantSchema = z.object({
  name: z.string().min(2, 'Nome da assistente obrigatório'),
  greeting_message: z.string().min(10, 'Mensagem de boas-vindas muito curta'),
})

const profileSchema = z.object({
  specialty: z.string().min(2, 'Especialidade obrigatória'),
  bio: z.string().optional(),
})

type AssistantData = z.infer<typeof assistantSchema>
type ProfileData = z.infer<typeof profileSchema>

// ─── Steps config ────────────────────────────────────────────────
const steps = [
  { id: 1, title: 'Perfil', icon: User },
  { id: 2, title: 'Assistente', icon: Bot },
  { id: 3, title: 'Horários', icon: Clock },
  { id: 4, title: 'WhatsApp', icon: Smartphone },
]

const DAYS = [
  { key: 'monday', label: 'Segunda' },
  { key: 'tuesday', label: 'Terça' },
  { key: 'wednesday', label: 'Quarta' },
  { key: 'thursday', label: 'Quinta' },
  { key: 'friday', label: 'Sexta' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
]

// ─── Step 1: Profile ─────────────────────────────────────────────
function StepProfile({ onNext }: { onNext: () => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
  })

  async function onSubmit(data: ProfileData) {
    await api.put('/api/nutritionists/profile', data)
    onNext()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Sobre você</h3>
        <p className="text-sm text-gray-500">Vamos personalizar sua conta</p>
      </div>

      <Input
        label="Especialidade"
        placeholder="Ex: Nutrição esportiva, emagrecimento, saúde feminina..."
        error={errors.specialty?.message}
        {...register('specialty')}
      />

      <Textarea
        label="Bio (opcional)"
        placeholder="Fale um pouco sobre você e sua abordagem..."
        rows={4}
        {...register('bio')}
      />

      <Button type="submit" loading={isSubmitting} className="w-full mt-2">
        Continuar
      </Button>
    </form>
  )
}

// ─── Step 2: Assistant ────────────────────────────────────────────
function StepAssistant({ onNext }: { onNext: () => void }) {
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [assistantId, setAssistantId] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AssistantData>({
    resolver: zodResolver(assistantSchema),
    defaultValues: {
      greeting_message: 'Olá! Sou a assistente virtual da Dra. {name}. Como posso te ajudar hoje?',
    },
  })

  async function onSubmit(data: AssistantData) {
    const res = await api.post('/api/assistants', data)
    const id = res.data.assistant?.id
    setAssistantId(id)

    if (pdfFile && id) {
      setUploading(true)
      const form = new FormData()
      form.append('pdf', pdfFile)
      await api.post('/api/assistants/upload-pdf', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setUploading(false)
    }

    onNext()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Sua assistente virtual</h3>
        <p className="text-sm text-gray-500">Configure a recepcionista que vai atender seus clientes</p>
      </div>

      <Input
        label="Nome da assistente"
        placeholder="Ex: Lara, Sofia, Ana..."
        error={errors.name?.message}
        {...register('name')}
      />

      <Textarea
        label="Mensagem de boas-vindas"
        placeholder="Mensagem que a assistente envia ao primeiro contato..."
        rows={3}
        error={errors.greeting_message?.message}
        {...register('greeting_message')}
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">
          Manual de instruções (PDF) — opcional
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-brand-400 transition-colors">
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            id="pdf-upload"
            onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
          />
          <label htmlFor="pdf-upload" className="cursor-pointer">
            {pdfFile ? (
              <span className="text-sm text-brand-600 font-medium">{pdfFile.name}</span>
            ) : (
              <span className="text-sm text-gray-500">
                Clique para enviar um PDF com seu protocolo de atendimento
              </span>
            )}
          </label>
        </div>
        <p className="text-xs text-gray-400">
          Ex: como você atende, o que você oferece, perguntas frequentes
        </p>
      </div>

      <Button type="submit" loading={isSubmitting || uploading} className="w-full mt-2">
        {uploading ? 'Enviando PDF...' : 'Continuar'}
      </Button>
    </form>
  )
}

// ─── Step 3: Availability ─────────────────────────────────────────
function StepAvailability({ onNext }: { onNext: () => void }) {
  const [saving, setSaving] = useState(false)
  const [schedule, setSchedule] = useState<Record<string, { enabled: boolean; start: string; end: string }>>({
    monday: { enabled: true, start: '08:00', end: '18:00' },
    tuesday: { enabled: true, start: '08:00', end: '18:00' },
    wednesday: { enabled: true, start: '08:00', end: '18:00' },
    thursday: { enabled: true, start: '08:00', end: '18:00' },
    friday: { enabled: true, start: '08:00', end: '18:00' },
    saturday: { enabled: false, start: '08:00', end: '12:00' },
    sunday: { enabled: false, start: '08:00', end: '12:00' },
  })

  const dayToInt: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  }

  async function handleSave() {
    setSaving(true)
    try {
      const entries = Object.entries(schedule)
        .filter(([, v]) => v.enabled)
        .map(([day, v]) => ({
          day_of_week: dayToInt[day],
          start_time: v.start,
          end_time: v.end,
          slot_duration: 60,
        }))

      await Promise.all(entries.map((entry) => api.post('/api/nutritionists/availability', entry)))
      onNext()
    } finally {
      setSaving(false)
    }
  }

  function toggle(day: string) {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled },
    }))
  }

  function setTime(day: string, field: 'start' | 'end', value: string) {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }))
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Horários de atendimento</h3>
        <p className="text-sm text-gray-500">Defina quando você está disponível para consultas</p>
      </div>

      <div className="flex flex-col gap-2">
        {DAYS.map(({ key, label }) => (
          <div
            key={key}
            className={cn(
              'flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors',
              schedule[key].enabled ? 'border-brand-200 bg-brand-50' : 'border-gray-200 bg-white'
            )}
          >
            <button
              type="button"
              onClick={() => toggle(key)}
              className={cn(
                'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                schedule[key].enabled
                  ? 'border-brand-600 bg-brand-600'
                  : 'border-gray-300 bg-white'
              )}
            >
              {schedule[key].enabled && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>

            <span className="text-sm font-medium text-gray-700 w-20">{label}</span>

            {schedule[key].enabled && (
              <div className="flex items-center gap-2 ml-auto">
                <input
                  type="time"
                  value={schedule[key].start}
                  onChange={(e) => setTime(key, 'start', e.target.value)}
                  className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:border-brand-500"
                />
                <span className="text-gray-400 text-sm">até</span>
                <input
                  type="time"
                  value={schedule[key].end}
                  onChange={(e) => setTime(key, 'end', e.target.value)}
                  className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:border-brand-500"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <Button onClick={handleSave} loading={saving} className="w-full mt-2">
        Salvar horários
      </Button>
    </div>
  )
}

// ─── Step 4: WhatsApp ─────────────────────────────────────────────
function StepWhatsApp({ onFinish }: { onFinish: () => void }) {
  const [connecting, setConnecting] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState('')

  async function handleConnect() {
    setConnecting(true)
    setError('')
    try {
      const { data } = await api.post('/api/whatsapp/connect')
      setQrCode(data.qrCode)

      // Poll for connection status
      const interval = setInterval(async () => {
        const { data: status } = await api.get('/api/whatsapp/status')
        if (status.status === 'connected') {
          clearInterval(interval)
          setConnected(true)
          setQrCode(null)
        }
      }, 3000)
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null
      setError(message || 'Erro ao gerar QR Code. Tente novamente.')
    } finally {
      setConnecting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Conectar WhatsApp</h3>
        <p className="text-sm text-gray-500">
          Conecte o número do seu consultório para a assistente começar a atender
        </p>
      </div>

      {connected ? (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-900">WhatsApp conectado!</p>
            <p className="text-sm text-gray-500 mt-1">Sua assistente já pode atender clientes</p>
          </div>
          <Button onClick={onFinish} className="w-full">
            Ir para o dashboard
          </Button>
        </div>
      ) : qrCode ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-gray-600 text-center">
            Abra o WhatsApp no celular → Dispositivos vinculados → Vincular dispositivo → Escaneie o QR
          </p>
          <div className="border border-gray-200 rounded-xl p-4">
            <img src={qrCode} alt="QR Code WhatsApp" className="w-56 h-56" />
          </div>
          <p className="text-xs text-gray-400">Aguardando conexão...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
            Use um número de WhatsApp exclusivo para o consultório (não seu número pessoal).
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button onClick={handleConnect} loading={connecting} className="w-full">
            Gerar QR Code
          </Button>

          <button
            onClick={onFinish}
            className="text-sm text-gray-400 hover:text-gray-600 underline text-center"
          >
            Pular por agora (configurar depois)
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main Onboarding ──────────────────────────────────────────────
export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const router = useRouter()

  function nextStep() {
    setCurrentStep((s) => Math.min(s + 1, 4))
  }

  function finish() {
    router.push('/conversas')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-600 mb-4">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Configuração inicial</h1>
          <p className="text-gray-500 mt-1 text-sm">Vamos preparar sua assistente virtual em 4 passos</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex items-center gap-2">
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-colors',
                  currentStep > step.id
                    ? 'bg-brand-600 text-white'
                    : currentStep === step.id
                      ? 'bg-brand-600 text-white ring-4 ring-brand-100'
                      : 'bg-gray-200 text-gray-500'
                )}
              >
                {currentStep > step.id ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.id
                )}
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 w-8',
                    currentStep > step.id + 1 ? 'bg-brand-600' : 'bg-gray-200'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {currentStep === 1 && <StepProfile onNext={nextStep} />}
          {currentStep === 2 && <StepAssistant onNext={nextStep} />}
          {currentStep === 3 && <StepAvailability onNext={nextStep} />}
          {currentStep === 4 && <StepWhatsApp onFinish={finish} />}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Passo {currentStep} de {steps.length}
        </p>
      </div>
    </div>
  )
}
