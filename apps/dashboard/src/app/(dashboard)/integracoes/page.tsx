'use client'

import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Loader2, Plus, Upload } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Badge, Btn, Card } from '@/components/ui/finance-primitives'

type IntegrationId = 'whatsapp' | 'instagram' | 'calendar' | 'stripe' | 'asaas' | 'mailchimp' | 'zapier' | 'webhook' | 'import'

function LogoMark({ type }: { type: IntegrationId }) {
  const base = 'grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[12px] font-bold text-white'
  const map: Record<IntegrationId, string> = {
    whatsapp: 'bg-gradient-to-br from-[#25D366] to-[#128C7E]',
    instagram: 'bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]',
    calendar: 'bg-white text-[#1A73E8] border border-[var(--line-2)]',
    stripe: 'bg-gradient-to-br from-[#635BFF] to-[#3D32D6]',
    asaas: 'bg-gradient-to-br from-[#00C27C] to-[#00A86B]',
    mailchimp: 'bg-gradient-to-br from-[#FFE01B] to-[#E0C400] text-[#241C15]',
    zapier: 'bg-gradient-to-br from-[#FF4A00] to-[#C93B00]',
    webhook: 'bg-gradient-to-br from-[#6AA9FF] to-[#3F7DD9]',
    import: 'bg-gradient-to-br from-[#22C55E] to-[#15803D]',
  }

  if (type === 'calendar') {
    return (
      <div className={`${base} ${map[type]}`}>
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
          <path fill="#4285F4" d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5V9H4z" />
          <path fill="#34A853" d="M4 9h4v12H6.5A2.5 2.5 0 0 1 4 18.5z" />
          <path fill="#FBBC05" d="M8 9h6v12H8z" />
          <path fill="#EA4335" d="M14 9h6v9.5a2.5 2.5 0 0 1-2.5 2.5H14z" />
          <path fill="#fff" d="M7 12h10v6H7z" />
          <path fill="#1A73E8" d="M10.8 16.9h2.6v-.7h-.8v-3.1h-.7l-1.2.8.4.6.7-.5v2.2h-1z" />
        </svg>
      </div>
    )
  }

  if (type === 'whatsapp') {
    return (
      <div className={`${base} ${map[type]}`}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path fill="currentColor" d="M12.04 3.5a8.43 8.43 0 0 0-7.22 12.78L3.8 20.5l4.33-1.01a8.43 8.43 0 1 0 3.91-15.99Zm0 1.5a6.93 6.93 0 0 1 5.93 10.52l-.17.27.6 2.5-2.56-.6-.26.16A6.93 6.93 0 1 1 12.04 5Zm-2.38 3.4c-.16 0-.42.06-.64.3-.22.25-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.66 2.66 4.1 3.62 2.03.8 2.44.64 2.88.6.44-.04 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.42-1.34-1.66-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46Z" />
        </svg>
      </div>
    )
  }

  if (type === 'instagram') {
    return (
      <div className={`${base} ${map[type]}`}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path fill="none" stroke="currentColor" strokeWidth="2" d="M8 3.8h8A4.2 4.2 0 0 1 20.2 8v8a4.2 4.2 0 0 1-4.2 4.2H8A4.2 4.2 0 0 1 3.8 16V8A4.2 4.2 0 0 1 8 3.8Z" />
          <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="16.7" cy="7.3" r="1" fill="currentColor" />
        </svg>
      </div>
    )
  }

  if (type === 'stripe') {
    return <div className={`${base} ${map[type]} text-[15px] normal-case`}>stripe</div>
  }

  if (type === 'zapier') {
    return <div className={`${base} ${map[type]} text-[18px]`}>*</div>
  }

  const labels: Record<IntegrationId, string> = {
    whatsapp: 'WA',
    instagram: 'IG',
    calendar: 'GC',
    stripe: 'ST',
    asaas: 'AS',
    mailchimp: 'MC',
    zapier: 'ZP',
    webhook: 'WH',
    import: 'CSV',
  }

  return <div className={`${base} ${map[type]}`}>{labels[type]}</div>
}

function IntegrationCard({
  id,
  name,
  desc,
  connected,
  account,
  onAction,
  actionLabel,
}: {
  id: IntegrationId
  name: string
  desc: string
  connected?: boolean
  account?: string
  onAction?: () => void
  actionLabel?: string
}) {
  return (
    <Card className="!p-4 flex items-center gap-4 transition-colors hover:border-[var(--line-2)]">
      <LogoMark type={id} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[13px] font-semibold text-t1">{name}</h3>
          {connected && (
            <Badge variant="success">
              <Check className="size-2.5" />
              Conectado
            </Badge>
          )}
        </div>
        <p className="mt-0.5 truncate text-[11.5px] text-t3">{connected && account ? account : desc}</p>
      </div>
      <Btn variant={connected ? 'ghost' : 'secondary'} size="sm" onClick={onAction} disabled={!onAction}>
        {actionLabel ?? (connected ? 'Configurar' : 'Conectar')}
      </Btn>
    </Card>
  )
}

function ImportHiddenInput() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function onChange(file?: File | null) {
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post('/api/clients/import-csv', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success(`${data.imported ?? 0} pacientes importados`)
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Erro ao importar pacientes')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={event => onChange(event.target.files?.[0])}
      />
      <Btn variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
        Importar
      </Btn>
    </>
  )
}

export default function IntegracoesPage() {
  const qc = useQueryClient()
  const { data: waData } = useQuery<any>({
    queryKey: ['whatsapp-status'],
    queryFn: () => api.get('/api/whatsapp/status').then(r => r.data),
    refetchInterval: 5000,
  })
  const { data: calendarData, isLoading: calendarLoading } = useQuery<any>({
    queryKey: ['google-calendar-status'],
    queryFn: () => api.get('/api/google-calendar/status').then(r => r.data),
  })

  const waConnected = waData?.status === 'connected'
  const calendarConnected = !!calendarData?.calendar_id
  const activeCount = (waConnected ? 1 : 0) + (calendarConnected ? 1 : 0)
  const total = 9

  async function connectCalendar() {
    try {
      const { data } = await api.get('/api/google-calendar/auth-url')
      if (data?.url) window.location.href = data.url
    } catch {
      toast.error('Erro ao conectar Google Calendar')
    }
  }

  async function disconnectCalendar() {
    try {
      await api.delete('/api/google-calendar/disconnect')
      qc.invalidateQueries({ queryKey: ['google-calendar-status'] })
      toast.success('Google Calendar desconectado')
    } catch {
      toast.error('Erro ao desconectar Google Calendar')
    }
  }

  const integrations = [
    {
      id: 'whatsapp' as const,
      name: 'WhatsApp Business',
      desc: 'Canal oficial Meta · mensagens, templates e mídia',
      connected: waConnected,
      account: waData?.phone || 'Instância conectada',
      onAction: () => toast.info('Use a configuração de WhatsApp já conectada ao sistema.'),
    },
    {
      id: 'instagram' as const,
      name: 'Instagram Direct',
      desc: 'DMs e respostas a stories',
      connected: false,
    },
    {
      id: 'calendar' as const,
      name: 'Google Calendar',
      desc: calendarLoading ? 'Verificando conexão...' : 'Sincronização bidirecional de agenda',
      connected: calendarConnected,
      account: calendarData?.calendar_id,
      onAction: calendarConnected ? disconnectCalendar : connectCalendar,
      actionLabel: calendarConnected ? 'Desconectar' : 'Conectar',
    },
    {
      id: 'stripe' as const,
      name: 'Stripe',
      desc: 'Pagamentos recorrentes e cobranças',
      connected: false,
    },
    {
      id: 'asaas' as const,
      name: 'Asaas',
      desc: 'Boletos, PIX e assinaturas',
      connected: false,
    },
    {
      id: 'mailchimp' as const,
      name: 'Mailchimp',
      desc: 'Campanhas de e-mail e automações',
      connected: false,
    },
    {
      id: 'zapier' as const,
      name: 'Zapier',
      desc: 'Conecte a 5.000+ aplicativos',
      connected: false,
    },
    {
      id: 'webhook' as const,
      name: 'Webhook',
      desc: 'Eventos em tempo real para sua API',
      connected: false,
    },
  ]

  return (
    <main className="px-6 py-6">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-t1">Integrações</h1>
            <p className="mt-0.5 text-sm text-t3">
              {activeCount} ativas · {total - activeCount} disponíveis
            </p>
          </div>
          <Btn variant="primary" size="sm">
            <Plus className="size-3.5" />
            Adicionar
          </Btn>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {integrations.map(item => (
            <IntegrationCard key={item.id} {...item} />
          ))}
          <div className="hidden">
            <ImportHiddenInput />
          </div>
        </div>
      </div>
    </main>
  )
}
