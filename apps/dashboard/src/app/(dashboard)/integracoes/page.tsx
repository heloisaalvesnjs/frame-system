'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { V4Button, V4Card, V4Page, V4Tag } from '@/components/v4/V4Primitives'

type IntegrationId = 'whatsapp' | 'instagram' | 'calendar' | 'stripe' | 'asaas' | 'mailchimp' | 'zapier' | 'webhook' | 'import'

function Logo({ id }: { id: IntegrationId }) {
  const common = 'grid h-12 w-12 place-items-center rounded-[14px] border border-[var(--line-2)] shadow-sm'

  if (id === 'whatsapp') {
    return (
      <div className={`${common} bg-[#25D366] text-white`}>
        <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
          <path fill="currentColor" d="M12.04 3.5a8.43 8.43 0 0 0-7.22 12.78L3.8 20.5l4.33-1.01a8.43 8.43 0 1 0 3.91-15.99Zm0 1.5a6.93 6.93 0 0 1 5.93 10.52l-.17.27.6 2.5-2.56-.6-.26.16A6.93 6.93 0 1 1 12.04 5Zm-2.38 3.4c-.16 0-.42.06-.64.3-.22.25-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.66 2.66 4.1 3.62 2.03.8 2.44.64 2.88.6.44-.04 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.42-1.34-1.66-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46Z" />
        </svg>
      </div>
    )
  }

  if (id === 'instagram') {
    return (
      <div className={`${common} bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#515BD4] text-white`}>
        <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
          <rect x="5" y="5" width="14" height="14" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="16.4" cy="7.6" r="1" fill="currentColor" />
        </svg>
      </div>
    )
  }

  if (id === 'calendar') {
    return (
      <div className={`${common} bg-white`}>
        <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true">
          <path fill="#4285F4" d="M5 5.5A2.5 2.5 0 0 1 7.5 3H12v6H5z" />
          <path fill="#34A853" d="M5 9h7v12H7.5A2.5 2.5 0 0 1 5 18.5z" />
          <path fill="#FBBC04" d="M12 3h4.5A2.5 2.5 0 0 1 19 5.5V9h-7z" />
          <path fill="#EA4335" d="M12 9h7v9.5a2.5 2.5 0 0 1-2.5 2.5H12z" />
          <path fill="#fff" d="M8 10h8v7H8z" />
          <path fill="#1A73E8" d="M10.4 15.9h3.2v-.8h-1v-3.3h-.8l-1.4.9.4.7.8-.5v2.2h-1.2z" />
        </svg>
      </div>
    )
  }

  const text: Record<IntegrationId, string> = {
    whatsapp: 'WA', instagram: 'IG', calendar: 'G',
    stripe: 'stripe', asaas: 'asaas', mailchimp: 'mc',
    zapier: 'zapier', webhook: '{}', import: 'CSV',
  }
  const color: Record<IntegrationId, string> = {
    whatsapp: '', instagram: '', calendar: '',
    stripe: 'bg-[#635BFF] text-white',
    asaas: 'bg-[#00A868] text-white',
    mailchimp: 'bg-[#FFE01B] text-[#241C15]',
    zapier: 'bg-[#FF4A00] text-white',
    webhook: 'bg-[#141618] text-white',
    import: 'bg-[var(--brand-s)] text-[var(--brand)]',
  }
  return <div className={`${common} ${color[id]} text-[13px] font-semibold lowercase`}>{text[id]}</div>
}

function ImportButton() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function onChange(file?: File | null) {
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post('/api/clients/import-csv', form, { headers: { 'Content-Type': 'multipart/form-data' } })
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
      <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => onChange(e.target.files?.[0])} />
      <V4Button className="h-8" onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        Importar
      </V4Button>
    </>
  )
}

function IntegrationCard({
  id, name, desc, connected, comingSoon, account, action, extra,
}: {
  id: IntegrationId
  name: string
  desc: string
  connected?: boolean
  comingSoon?: boolean
  account?: string
  action?: React.ReactNode
  extra?: React.ReactNode
}) {
  return (
    <V4Card className="flex min-h-[190px] flex-col justify-between p-4 transition-colors hover:border-[var(--line-3)]">
      <div>
        <div className="mb-5 flex items-start justify-between gap-3">
          <Logo id={id} />
          {connected ? (
            <V4Tag tone="green" dot>Conectado</V4Tag>
          ) : comingSoon ? (
            <V4Tag tone="amber">Em breve</V4Tag>
          ) : (
            <V4Tag tone="default">{id === 'import' ? 'Disponível' : 'Desconectado'}</V4Tag>
          )}
        </div>
        <h3 className="text-[14px] font-medium text-t1">{name}</h3>
        <p className="mt-1.5 min-h-10 text-[12px] leading-5 text-t3">{connected && account ? account : desc}</p>
      </div>
      {extra}
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--line-1)] pt-3">
        <span className="text-[11px] text-t3">
          {connected ? 'Ativo no sistema' : comingSoon ? 'Integração futura' : id === 'import' ? 'Arquivo local' : 'Pronto para conectar'}
        </span>
        {action ?? (
          <V4Button className="h-8" disabled>Em breve</V4Button>
        )}
      </div>
    </V4Card>
  )
}

function WhatsAppCard() {
  const qc = useQueryClient()
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: waData } = useQuery<any>({
    queryKey: ['whatsapp-status'],
    queryFn: () => api.get('/api/whatsapp/status').then(r => r.data),
    refetchInterval: qrCode ? 3000 : 8000,
  })

  const waConnected = waData?.status === 'connected'

  useEffect(() => {
    if (waConnected && qrCode) {
      setQrCode(null)
      toast.success('WhatsApp conectado com sucesso!')
    }
  }, [waConnected, qrCode])

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  async function handleConnect() {
    setConnecting(true)
    try {
      await api.post('/api/whatsapp/connect')
      await new Promise(r => setTimeout(r, 1500))
      const { data } = await api.get('/api/whatsapp/qr')
      if (data?.qrCode) {
        setQrCode(data.qrCode)
      } else {
        toast.info('Instância criada. Aguardando QR code...')
        // Tenta buscar o QR por mais alguns segundos
        let attempts = 0
        const interval = setInterval(async () => {
          attempts++
          try {
            const { data: qrData } = await api.get('/api/whatsapp/qr')
            if (qrData?.qrCode) {
              setQrCode(qrData.qrCode)
              clearInterval(interval)
            }
          } catch {}
          if (attempts >= 5) clearInterval(interval)
        }, 2000)
        pollRef.current = interval
      }
      qc.invalidateQueries({ queryKey: ['whatsapp-status'] })
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Erro ao iniciar conexão')
    } finally {
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      await api.post('/api/whatsapp/disconnect')
      setQrCode(null)
      qc.invalidateQueries({ queryKey: ['whatsapp-status'] })
      toast.success('WhatsApp desconectado')
    } catch {
      toast.error('Erro ao desconectar')
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <IntegrationCard
      id="whatsapp"
      name="WhatsApp Business"
      desc="Canal principal de atendimento via Evolution API."
      connected={waConnected}
      account={waData?.phone || 'Instância conectada'}
      extra={qrCode ? (
        <div className="my-3 flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--raised)] p-3">
          <p className="text-[11px] text-t3">Escaneie o QR code com o WhatsApp</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCode} alt="QR Code WhatsApp" className="h-40 w-40 rounded-lg" />
          <button onClick={() => setQrCode(null)} className="flex items-center gap-1 text-[11px] text-t3 hover:text-t1">
            <X className="h-3 w-3" /> Cancelar
          </button>
        </div>
      ) : null}
      action={
        waConnected ? (
          <V4Button className="h-8" onClick={handleDisconnect} disabled={disconnecting}>
            {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Desconectar
          </V4Button>
        ) : (
          <V4Button className="h-8" onClick={handleConnect} disabled={connecting || !!qrCode}>
            {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {qrCode ? 'Aguardando...' : 'Conectar'}
          </V4Button>
        )
      }
    />
  )
}

export default function IntegracoesPage() {
  const qc = useQueryClient()

  const { data: calendarData, isLoading: calendarLoading } = useQuery<any>({
    queryKey: ['google-calendar-status'],
    queryFn: () => api.get('/api/google-calendar/status').then(r => r.data),
  })

  const { data: waData } = useQuery<any>({
    queryKey: ['whatsapp-status'],
    queryFn: () => api.get('/api/whatsapp/status').then(r => r.data),
    refetchInterval: 8000,
  })

  const waConnected = waData?.status === 'connected'
  const calendarConnected = !!calendarData?.calendar_id || !!calendarData?.connected
  const activeCount = (waConnected ? 1 : 0) + (calendarConnected ? 1 : 0)

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

  return (
    <V4Page
      eyebrow="Workspace"
      title="Integrações"
      subtitle={`${activeCount} integração(ões) ativa(s). Conecte e gerencie suas integrações diretamente aqui.`}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <WhatsAppCard />
        <IntegrationCard
          id="calendar"
          name="Google Calendar"
          desc={calendarLoading ? 'Verificando conexão...' : 'Sincronização da agenda com Google Calendar.'}
          connected={calendarConnected}
          account={calendarData?.calendar_id}
          action={
            <V4Button className="h-8" onClick={calendarConnected ? disconnectCalendar : connectCalendar}>
              {calendarConnected ? 'Desconectar' : 'Conectar'}
            </V4Button>
          }
        />
        <IntegrationCard id="instagram" name="Instagram Direct" desc="DMs, respostas a stories e captação de leads." comingSoon />
        <IntegrationCard id="stripe" name="Stripe" desc="Pagamentos recorrentes, assinaturas e cartão." comingSoon />
        <IntegrationCard id="asaas" name="Asaas" desc="PIX, boleto, cobrança e assinatura nacional." comingSoon />
        <IntegrationCard id="mailchimp" name="Mailchimp" desc="Campanhas de e-mail e nutrição de leads." comingSoon />
        <IntegrationCard id="zapier" name="Zapier" desc="Conexão com ferramentas externas sem código." comingSoon />
        <IntegrationCard id="webhook" name="Webhook" desc="Envio de eventos em tempo real para sua API." comingSoon />
        <IntegrationCard id="import" name="Importar pacientes" desc="Importação de base por CSV ou planilha." action={<ImportButton />} />
      </div>
    </V4Page>
  )
}
