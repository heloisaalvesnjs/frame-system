'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle, Bot, Clock, Smartphone, User, Upload } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

// ─── Schemas ──────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  specialty: z.string().min(2, 'Informe sua especialidade'),
  bio: z.string().optional(),
})

const assistantSchema = z.object({
  name: z.string().min(2, 'Dê um nome para a assistente'),
  greeting_message: z.string().min(10, 'Mensagem de boas-vindas muito curta'),
})

type ProfileData = z.infer<typeof profileSchema>
type AssistantData = z.infer<typeof assistantSchema>

// ─── Steps config ─────────────────────────────────────────────────────────────

const steps = [
  { id: 1, label: 'Perfil',     icon: User },
  { id: 2, label: 'Assistente', icon: Bot },
  { id: 3, label: 'Horários',   icon: Clock },
  { id: 4, label: 'WhatsApp',   icon: Smartphone },
]

const DAYS = [
  { key: 'sunday',    label: 'Dom', idx: 0 },
  { key: 'monday',    label: 'Seg', idx: 1 },
  { key: 'tuesday',   label: 'Ter', idx: 2 },
  { key: 'wednesday', label: 'Qua', idx: 3 },
  { key: 'thursday',  label: 'Qui', idx: 4 },
  { key: 'friday',    label: 'Sex', idx: 5 },
  { key: 'saturday',  label: 'Sáb', idx: 6 },
]

// ─── Input component ──────────────────────────────────────────────────────────

function Field({
  label, error, children,
}: {
  label: string; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-wide mb-1.5 block" style={{ color: 'var(--t3)' }}>
        {label}
      </label>
      {children}
      {error && <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{error}</p>}
    </div>
  )
}

function LightInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn('w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-colors', props.className)}
      style={{
        background: 'var(--raised)',
        border: '1px solid var(--border)',
        color: 'var(--t1)',
        ...(props.style as React.CSSProperties),
      }}
    />
  )
}

function LightTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn('w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-colors resize-none', props.className)}
      style={{
        background: 'var(--raised)',
        border: '1px solid var(--border)',
        color: 'var(--t1)',
        ...(props.style as React.CSSProperties),
      }}
    />
  )
}

// ─── Step 1: Perfil ───────────────────────────────────────────────────────────

function StepProfile({ onNext }: { onNext: () => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
  })

  async function onSubmit(data: ProfileData) {
    try {
      await api.put('/api/nutritionists/profile', data)
      onNext()
    } catch {
      toast.error('Erro ao salvar perfil. Tente novamente.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <Field label="Especialidade" error={errors.specialty?.message}>
        <LightInput
          placeholder="Ex: Nutrição esportiva, emagrecimento, saúde feminina..."
          {...register('specialty')}
        />
      </Field>
      <Field label="Bio (opcional)">
        <LightTextarea
          rows={3}
          placeholder="Fale um pouco sobre você e sua abordagem..."
          {...register('bio')}
        />
      </Field>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2.5 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 mt-1"
        style={{ background: 'var(--brand)' }}
      >
        {isSubmitting ? 'Salvando...' : 'Continuar →'}
      </button>
    </form>
  )
}

// ─── Step 2: Assistente ───────────────────────────────────────────────────────

function StepAssistant({ onNext }: { onNext: () => void }) {
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AssistantData>({
    resolver: zodResolver(assistantSchema),
    defaultValues: {
      greeting_message: 'Olá! 👋 Sou a assistente virtual do consultório. Como posso te ajudar hoje?',
    },
  })

  async function onSubmit(data: AssistantData) {
    try {
      await api.post('/api/assistants', data)

      if (pdfFile) {
        setUploading(true)
        const form = new FormData()
        form.append('pdf', pdfFile)
        await api.post('/api/assistants/upload-pdf', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        setUploading(false)
      }

      onNext()
    } catch {
      setUploading(false)
      toast.error('Erro ao configurar assistente. Tente novamente.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <Field label="Nome da assistente" error={errors.name?.message}>
        <LightInput placeholder="Ex: Sofia, Lara, Ana..." {...register('name')} />
      </Field>

      <Field label="Mensagem de boas-vindas" error={errors.greeting_message?.message}>
        <LightTextarea
          rows={3}
          placeholder="Mensagem que aparece no primeiro contato..."
          {...register('greeting_message')}
        />
      </Field>

      {/* PDF upload */}
      <div>
        <label className="text-xs font-medium uppercase tracking-wide mb-1.5 block" style={{ color: 'var(--t3)' }}>
          Protocolo de atendimento (PDF) — opcional
        </label>
        <label
          htmlFor="pdf-upload"
          className="flex items-center gap-3 border-2 border-dashed rounded-lg px-4 py-3 cursor-pointer transition-colors"
          style={pdfFile
            ? { borderColor: 'rgba(0,194,124,0.40)', background: 'var(--brand-s)' }
            : { borderColor: 'var(--border)', background: 'var(--raised)' }
          }
        >
          <Upload className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--t3)' }} />
          <span className="text-sm truncate" style={{ color: 'var(--t3)' }}>
            {pdfFile ? pdfFile.name : 'Clique para enviar PDF com seu protocolo'}
          </span>
          <input
            id="pdf-upload"
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={e => setPdfFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <p className="text-xs mt-1" style={{ color: 'var(--t3)' }}>
          Perguntas frequentes, como você atende, o que oferece
        </p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || uploading}
        className="w-full py-2.5 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 mt-1"
        style={{ background: 'var(--brand)' }}
      >
        {uploading ? 'Enviando PDF...' : isSubmitting ? 'Salvando...' : 'Continuar →'}
      </button>
    </form>
  )
}

// ─── Step 3: Horários ─────────────────────────────────────────────────────────

function StepAvailability({ onNext }: { onNext: () => void }) {
  const [saving, setSaving] = useState(false)
  const [schedule, setSchedule] = useState<Record<string, { enabled: boolean; start: string; end: string }>>({
    sunday:    { enabled: false, start: '08:00', end: '12:00' },
    monday:    { enabled: true,  start: '08:00', end: '18:00' },
    tuesday:   { enabled: true,  start: '08:00', end: '18:00' },
    wednesday: { enabled: true,  start: '08:00', end: '18:00' },
    thursday:  { enabled: true,  start: '08:00', end: '18:00' },
    friday:    { enabled: true,  start: '08:00', end: '18:00' },
    saturday:  { enabled: false, start: '08:00', end: '12:00' },
  })

  async function handleSave() {
    setSaving(true)
    try {
      const entries = DAYS
        .filter(d => schedule[d.key].enabled)
        .map(d => ({
          day_of_week:   d.idx,
          start_time:    schedule[d.key].start,
          end_time:      schedule[d.key].end,
          slot_duration: 60,
        }))
      await api.put('/api/nutritionists/availability', entries)
      onNext()
    } catch {
      toast.error('Erro ao salvar horários. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {DAYS.map(({ key, label }) => (
          <div
            key={key}
            className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors"
            style={schedule[key].enabled
              ? { border: '1px solid rgba(0,194,124,0.25)', background: 'var(--brand-s)' }
              : { border: '1px solid var(--border)', background: 'var(--raised)' }
            }
          >
            {/* Toggle */}
            <button
              type="button"
              onClick={() => setSchedule(p => ({ ...p, [key]: { ...p[key], enabled: !p[key].enabled } }))}
              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors"
              style={schedule[key].enabled
                ? { background: 'var(--brand)', border: '2px solid var(--brand)' }
                : { background: 'transparent', border: '2px solid var(--border)' }
              }
            >
              {schedule[key].enabled && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>

            <span
              className="text-sm font-medium w-8 flex-shrink-0"
              style={{ color: schedule[key].enabled ? 'var(--t1)' : 'var(--t3)' }}
            >
              {label}
            </span>

            {schedule[key].enabled ? (
              <div className="flex items-center gap-2 ml-auto">
                <input
                  type="time"
                  value={schedule[key].start}
                  onChange={e => setSchedule(p => ({ ...p, [key]: { ...p[key], start: e.target.value } }))}
                  className="rounded-md px-2 py-1 text-sm focus:outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--t1)' }}
                />
                <span className="text-xs" style={{ color: 'var(--t3)' }}>até</span>
                <input
                  type="time"
                  value={schedule[key].end}
                  onChange={e => setSchedule(p => ({ ...p, [key]: { ...p[key], end: e.target.value } }))}
                  className="rounded-md px-2 py-1 text-sm focus:outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--t1)' }}
                />
              </div>
            ) : (
              <span className="ml-auto text-xs" style={{ color: 'var(--t3)' }}>Fechado</span>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 mt-1"
        style={{ background: 'var(--brand)' }}
      >
        {saving ? 'Salvando...' : 'Salvar horários →'}
      </button>

      <button
        onClick={onNext}
        className="text-xs text-center transition-colors hover:opacity-70"
        style={{ color: 'var(--t3)' }}
      >
        Pular por agora
      </button>
    </div>
  )
}

// ─── Step 4: WhatsApp ─────────────────────────────────────────────────────────

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

      const interval = setInterval(async () => {
        const { data: status } = await api.get('/api/whatsapp/status')
        if (status.status === 'connected') {
          clearInterval(interval)
          setConnected(true)
          setQrCode(null)
          toast.success('WhatsApp conectado com sucesso!')
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

  if (connected) {
    return (
      <div className="flex flex-col items-center gap-5 py-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center border"
          style={{ background: 'var(--brand-s)', borderColor: 'rgba(0,194,124,0.25)' }}
        >
          <CheckCircle className="w-8 h-8" style={{ color: 'var(--brand)' }} />
        </div>
        <div className="text-center">
          <p className="font-semibold" style={{ color: 'var(--t1)' }}>WhatsApp conectado!</p>
          <p className="text-sm mt-1" style={{ color: 'var(--t3)' }}>Sua assistente já pode atender clientes 🎉</p>
        </div>
        <button
          onClick={onFinish}
          className="w-full py-2.5 text-white text-sm font-semibold rounded-lg transition-colors"
          style={{ background: 'var(--brand)' }}
        >
          Ir para o Dashboard →
        </button>
      </div>
    )
  }

  if (qrCode) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-center" style={{ color: 'var(--t3)' }}>
          Abra o WhatsApp → <strong style={{ color: 'var(--t1)' }}>Dispositivos vinculados</strong> → Vincular dispositivo → Escaneie o QR
        </p>
        <div className="rounded-2xl p-4 bg-white" style={{ border: '1px solid var(--border)' }}>
          <img src={qrCode} alt="QR Code WhatsApp" className="w-52 h-52" />
        </div>
        <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--t3)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Aguardando conexão...
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="rounded-xl px-4 py-3 text-sm"
        style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#2563EB' }}
      >
        💡 Use um número exclusivo do consultório (não seu número pessoal).
      </div>

      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}
        >
          {error}
        </div>
      )}

      <button
        onClick={handleConnect}
        disabled={connecting}
        className="w-full py-2.5 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
        style={{ background: 'var(--brand)' }}
      >
        {connecting ? 'Gerando QR Code...' : 'Conectar WhatsApp'}
      </button>

      <button
        onClick={onFinish}
        className="text-xs text-center transition-colors hover:opacity-70"
        style={{ color: 'var(--t3)' }}
      >
        Pular por agora (conectar depois em Configurações)
      </button>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const [current, setCurrent] = useState(1)
  const router = useRouter()

  function next() {
    setCurrent(s => Math.min(s + 1, 4))
  }

  function finish() {
    toast.success('Configuração concluída! Bem-vinda ao Frame 🎉')
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
            style={{ background: 'var(--brand)' }}
          >
            <Bot className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--t1)' }}>Configuração inicial</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--t3)' }}>
            Prepare sua assistente em {steps.length} passos rápidos
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1 mb-8">
          {steps.map((step, idx) => {
            const done   = current > step.id
            const active = current === step.id
            return (
              <div key={step.id} className="flex items-center gap-1">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200"
                    style={
                      done   ? { background: 'var(--brand)', color: '#fff' } :
                      active ? { background: 'var(--brand-s)', border: '2px solid var(--brand)', color: 'var(--brand)' } :
                               { background: 'var(--raised)', border: '1px solid var(--border)', color: 'var(--t3)' }
                    }
                  >
                    {done ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : step.id}
                  </div>
                  <span
                    className="text-[10px] font-medium transition-colors"
                    style={{ color: active ? 'var(--brand)' : 'var(--t3)' }}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className="h-px w-10 mb-4 transition-colors"
                    style={{ background: current > step.id + 1 ? 'var(--brand)' : done ? 'rgba(0,194,124,0.30)' : 'var(--border)' }}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
        >
          {/* Step header */}
          <div className="mb-6">
            <h2 className="text-base font-semibold" style={{ color: 'var(--t1)' }}>
              {steps[current - 1].label}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>
              {current === 1 && 'Vamos personalizar seu perfil'}
              {current === 2 && 'Configure sua recepcionista virtual'}
              {current === 3 && 'Defina seus horários de atendimento'}
              {current === 4 && 'Conecte o WhatsApp do consultório'}
            </p>
          </div>

          {current === 1 && <StepProfile onNext={next} />}
          {current === 2 && <StepAssistant onNext={next} />}
          {current === 3 && <StepAvailability onNext={next} />}
          {current === 4 && <StepWhatsApp onFinish={finish} />}
        </div>

        {/* Progress */}
        <p className="text-center text-xs mt-4" style={{ color: 'var(--t3)' }}>
          Passo {current} de {steps.length}
        </p>
      </div>
    </div>
  )
}
