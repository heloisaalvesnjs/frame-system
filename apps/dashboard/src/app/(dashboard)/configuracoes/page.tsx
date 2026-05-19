'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Bot, Smartphone, CheckCircle, Trash2, Upload, Wifi, WifiOff } from 'lucide-react'
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
  greeting_message: string
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
  const [success, setSuccess] = useState(false)

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
    await api.put('/api/nutritionists/profile', data)
    await refreshUser()
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
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
        {success && (
          <span className="flex items-center gap-1.5 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" />
            Salvo com sucesso
          </span>
        )}
      </div>
    </form>
  )
}

// ─── Tab: Assistant ───────────────────────────────────────────────
const assistantSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  greeting_message: z.string().min(10, 'Mensagem muito curta'),
})
type AssistantFormData = z.infer<typeof assistantSchema>

function TabAssistant() {
  const queryClient = useQueryClient()
  const [success, setSuccess] = useState(false)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const { data: assistant } = useQuery<Assistant>({
    queryKey: ['assistant'],
    queryFn: async () => {
      const { data } = await api.get('/api/assistants')
      return data.assistant
    },
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AssistantFormData>({
    resolver: zodResolver(assistantSchema),
  })

  useEffect(() => {
    if (assistant) {
      reset({ name: assistant.name, greeting_message: assistant.greeting_message })
    }
  }, [assistant, reset])

  async function onSubmit(data: AssistantFormData) {
    await api.post('/api/assistants', data)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
    queryClient.invalidateQueries({ queryKey: ['assistant'] })
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
      queryClient.invalidateQueries({ queryKey: ['assistant'] })
    } finally {
      setUploading(false)
    }
  }

  async function handleDeletePdf() {
    await api.delete('/api/assistants/pdf')
    queryClient.invalidateQueries({ queryKey: ['assistant'] })
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Nome da assistente"
          placeholder="Ex: Lara, Sofia, Ana..."
          error={errors.name?.message}
          {...register('name')}
        />

        <Textarea
          label="Mensagem de boas-vindas"
          hint="Mensagem enviada ao primeiro contato do cliente"
          rows={3}
          error={errors.greeting_message?.message}
          {...register('greeting_message')}
        />

        <div className="flex items-center gap-3">
          <Button type="submit" loading={isSubmitting}>Salvar</Button>
          {success && (
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" />
              Salvo
            </span>
          )}
        </div>
      </form>

      {/* PDF */}
      <div className="border-t border-gray-100 pt-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Manual de instruções (PDF)</h3>
        <p className="text-xs text-gray-500 mb-4">
          Envie um PDF com seu protocolo, perguntas frequentes e como você gosta de atender.
          A assistente usará este documento como base de conhecimento.
        </p>

        {assistant?.pdf_filename ? (
          <div className="flex items-center gap-3 p-3 bg-brand-50 border border-brand-200 rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-brand-700 truncate">{assistant.pdf_filename}</p>
              <p className="text-xs text-brand-500">PDF ativo</p>
            </div>
            <Button variant="danger" size="sm" onClick={handleDeletePdf}>
              <Trash2 className="w-3.5 h-3.5" />
              Remover
            </Button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-5 text-center">
            <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              id="pdf-replace"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
            />
            <label htmlFor="pdf-replace" className="cursor-pointer text-sm text-brand-600 font-medium hover:underline">
              Selecionar PDF
            </label>
            <p className="text-xs text-gray-400 mt-1">Até 10 MB</p>
          </div>
        )}

        {pdfFile && (
          <div className="flex items-center gap-3 mt-3">
            <p className="text-sm text-gray-600 flex-1 truncate">{pdfFile.name}</p>
            <Button size="sm" onClick={handleUploadPdf} loading={uploading}>
              Enviar
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab: WhatsApp ────────────────────────────────────────────────
function TabWhatsApp() {
  const [connecting, setConnecting] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [error, setError] = useState('')

  const { data: status, refetch } = useQuery<WhatsAppStatus>({
    queryKey: ['whatsapp-status'],
    queryFn: async () => {
      const { data } = await api.get('/api/whatsapp/status')
      return data
    },
    refetchInterval: 5000,
  })

  async function handleConnect() {
    setConnecting(true)
    setError('')
    try {
      await api.post('/api/whatsapp/connect')

      // Polling do QR code até aparecer (máx 60s)
      let attempts = 0
      const qrInterval = setInterval(async () => {
        attempts++
        if (attempts > 30) {
          clearInterval(qrInterval)
          setConnecting(false)
          setError('Tempo esgotado ao gerar QR Code. Tente novamente.')
          return
        }
        try {
          const { data: qrData } = await api.get('/api/whatsapp/qr')
          if (qrData.qrCode) {
            clearInterval(qrInterval)
            setConnecting(false)
            setQrCode(qrData.qrCode)

            // Polling do status após ter QR
            const statusInterval = setInterval(async () => {
              const { data: s } = await api.get('/api/whatsapp/status')
              if (s.status === 'connected') {
                clearInterval(statusInterval)
                setQrCode(null)
                refetch()
              }
            }, 3000)
          }
        } catch {}
      }, 2000)
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null
      setError(message || 'Erro ao iniciar conexão')
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    await api.post('/api/whatsapp/disconnect')
    refetch()
  }

  const isConnected = status?.status === 'connected'

  return (
    <div className="flex flex-col gap-6">
      {/* Status */}
      <div className={cn(
        'flex items-center gap-4 p-4 rounded-xl border',
        isConnected ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
      )}>
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center',
          isConnected ? 'bg-green-100' : 'bg-gray-200'
        )}>
          {isConnected ? (
            <Wifi className="w-5 h-5 text-green-600" />
          ) : (
            <WifiOff className="w-5 h-5 text-gray-500" />
          )}
        </div>
        <div>
          <p className="font-semibold text-gray-900">
            {isConnected ? 'Conectado' : 'Desconectado'}
          </p>
          <p className="text-sm text-gray-500">
            {isConnected
              ? `Número: ${status?.phone || 'WhatsApp ativo'}`
              : 'Nenhum número conectado'}
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
          <p className="text-sm text-gray-600">
            Sua assistente está ativa e respondendo mensagens no WhatsApp. Para desconectar o número,
            clique no botão abaixo.
          </p>
          <Button variant="danger" onClick={handleDisconnect} className="w-fit">
            Desconectar WhatsApp
          </Button>
        </div>
      ) : qrCode ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-gray-600 text-center">
            Abra o WhatsApp → Dispositivos vinculados → Vincular dispositivo → Escaneie o QR
          </p>
          <div className="border border-gray-200 rounded-xl p-4">
            <img src={qrCode} alt="QR Code WhatsApp" className="w-56 h-56" />
          </div>
          <p className="text-xs text-gray-400 animate-pulse">Aguardando conexão...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
            Recomendamos usar um número de WhatsApp exclusivo para o consultório.
            Não use seu número pessoal.
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button onClick={handleConnect} loading={connecting} className="w-fit">
            <Smartphone className="w-4 h-4" />
            Conectar WhatsApp
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────
const tabs = [
  { id: 'profile', label: 'Perfil', icon: User },
  { id: 'assistant', label: 'Assistente', icon: Bot },
  { id: 'whatsapp', label: 'WhatsApp', icon: Smartphone },
]

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gerencie seu perfil e as configurações da assistente</p>
      </div>

      <Card>
        {/* Tabs */}
        <div className="border-b border-gray-100 px-6">
          <div className="flex gap-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                  activeTab === id
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <CardContent className="py-6">
          {activeTab === 'profile' && <TabProfile />}
          {activeTab === 'assistant' && <TabAssistant />}
          {activeTab === 'whatsapp' && <TabWhatsApp />}
        </CardContent>
      </Card>
    </div>
  )
}
