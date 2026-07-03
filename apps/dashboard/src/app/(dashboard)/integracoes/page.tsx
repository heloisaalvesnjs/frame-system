'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Loader2, Search, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Badge, Btn } from '@/components/ui/finance-primitives'

function IntegrationCard({ i }: {
  i: {
    id: string; name: string; desc: string; category: string; bg: string
    iconColor?: string; connected?: boolean; account?: string
    action?: React.ReactNode; extra?: React.ReactNode; comingSoon?: boolean
  }
}) {
  return (
    <div
      className="group flex flex-col rounded-2xl p-5 transition-all"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line-1)', minHeight: '200px' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--line-3)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--line-1)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
    >
      <div className="flex items-start gap-3.5">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl overflow-hidden" style={{ background: i.bg, color: i.iconColor }}>
          {i.id === 'whatsapp' && (
            <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
              <path fill="currentColor" d="M12.04 3.5a8.43 8.43 0 0 0-7.22 12.78L3.8 20.5l4.33-1.01a8.43 8.43 0 1 0 3.91-15.99Zm0 1.5a6.93 6.93 0 0 1 5.93 10.52l-.17.27.6 2.5-2.56-.6-.26.16A6.93 6.93 0 1 1 12.04 5Zm-2.38 3.4c-.16 0-.42.06-.64.3-.22.25-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.66 2.66 4.1 3.62 2.03.8 2.44.64 2.88.6.44-.04 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.42-1.34-1.66-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46Z" />
            </svg>
          )}
          {i.id === 'calendar' && (
            <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true">
              <path fill="#4285F4" d="M5 5.5A2.5 2.5 0 0 1 7.5 3H12v6H5z" />
              <path fill="#34A853" d="M5 9h7v12H7.5A2.5 2.5 0 0 1 5 18.5z" />
              <path fill="#FBBC04" d="M12 3h4.5A2.5 2.5 0 0 1 19 5.5V9h-7z" />
              <path fill="#EA4335" d="M12 9h7v9.5a2.5 2.5 0 0 1-2.5 2.5H12z" />
              <path fill="#fff" d="M8 10h8v7H8z" />
              <path fill="#1A73E8" d="M10.4 15.9h3.2v-.8h-1v-3.3h-.8l-1.4.9.4.7.8-.5v2.2h-1.2z" />
            </svg>
          )}
          {i.id === 'instagram' && (
            <div className="flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#515BD4] text-white">
              <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
                <rect x="5" y="5" width="14" height="14" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="16.4" cy="7.6" r="1" fill="currentColor" />
              </svg>
            </div>
          )}
          {!['whatsapp', 'calendar', 'instagram'].includes(i.id) && (
            <span className="text-[11px] font-bold" style={{ color: i.iconColor || 'var(--text-2)' }}>
              {i.id === 'stripe' ? 'stripe' : i.id === 'asaas' ? 'asaas' : i.id === 'mailchimp' ? 'mc' : i.id === 'zapier' ? 'zapier' : i.id === 'webhook' ? '{}' : 'CSV'}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[14px] font-semibold text-1">{i.name}</h3>
            {i.connected && <Badge variant="success"><Check className="h-2.5 w-2.5" /> Conectado</Badge>}
          </div>
          <div className="mt-0.5 text-[11px] text-3">{i.category}</div>
        </div>
      </div>
      <p className="mt-3 flex-1 text-[12.5px] leading-relaxed text-2" style={{ minHeight: '36px' }}>
        {i.connected && i.account ? i.account : i.desc}
      </p>
      {i.extra}
      <div className="mt-4 flex items-center justify-between pt-4" style={{ borderTop: '1px solid var(--line-1)' }}>
        <span className="truncate text-[11.5px] text-3">
          {i.connected ? 'Ativo no sistema' : i.comingSoon ? 'Integração futura' : i.id === 'import' ? 'Arquivo local' : 'Pronto para conectar'}
        </span>
        {i.action ?? <Btn variant="secondary" size="sm" disabled>Em breve</Btn>}
      </div>
    </div>
  )
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
      toast.error(error?.response?.data?.error ?? 'Erro ao importar')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => onChange(e.target.files?.[0])} />
      <Btn variant="primary" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        Importar
      </Btn>
    </>
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
    if (waConnected && qrCode) { setQrCode(null); toast.success('WhatsApp conectado!') }
  }, [waConnected, qrCode])
  useEffect(() => { return () => { if (pollRef.current) clearInterval(pollRef.current) } }, [])

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
        let attempts = 0
        const interval = setInterval(async () => {
          attempts++
          try { const { data: qrData } = await api.get('/api/whatsapp/qr'); if (qrData?.qrCode) { setQrCode(qrData.qrCode); clearInterval(interval) } } catch {}
          if (attempts >= 5) clearInterval(interval)
        }, 2000)
        pollRef.current = interval
      }
      qc.invalidateQueries({ queryKey: ['whatsapp-status'] })
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Erro ao iniciar conexão')
    } finally { setConnecting(false) }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      await api.post('/api/whatsapp/disconnect')
      setQrCode(null)
      qc.invalidateQueries({ queryKey: ['whatsapp-status'] })
      toast.success('WhatsApp desconectado')
    } catch { toast.error('Erro ao desconectar') }
    finally { setDisconnecting(false) }
  }

  return (
    <IntegrationCard i={{
      id: 'whatsapp',
      name: 'WhatsApp Business',
      category: 'Comunicação',
      desc: 'Canal principal de atendimento via WhatsApp.',
      bg: '#E8FBEF',
      iconColor: '#25D366',
      connected: waConnected,
      account: waData?.phone || 'Instância conectada',
      extra: qrCode ? (
        <div className="my-3 flex flex-col items-center gap-2 rounded-xl p-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--line-1)' }}>
          <p className="text-[11px] text-3">Escaneie o QR code com o WhatsApp</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCode} alt="QR Code WhatsApp" className="h-40 w-40 rounded-lg" />
          <button onClick={() => setQrCode(null)} className="flex items-center gap-1 text-[11px] text-3 hover:text-1">
            <X className="h-3 w-3" /> Cancelar
          </button>
        </div>
      ) : null,
      action: waConnected ? (
        <Btn variant="outline" size="sm" onClick={handleDisconnect} disabled={disconnecting}>
          {disconnecting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Gerenciar
        </Btn>
      ) : (
        <Btn variant="primary" size="sm" onClick={handleConnect} disabled={connecting || !!qrCode}>
          {connecting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {qrCode ? 'Aguardando...' : 'Conectar'}
        </Btn>
      ),
    }} />
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
    try { const { data } = await api.get('/api/google-calendar/auth-url'); if (data?.url) window.location.href = data.url }
    catch { toast.error('Erro ao conectar Google Calendar') }
  }
  async function disconnectCalendar() {
    try { await api.delete('/api/google-calendar/disconnect'); qc.invalidateQueries({ queryKey: ['google-calendar-status'] }); toast.success('Google Calendar desconectado') }
    catch { toast.error('Erro ao desconectar') }
  }

  return (
    <div className="mx-auto max-w-[1240px] space-y-10 px-8 py-8">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-1">Integrações</h1>
        <p className="mt-1 text-[13px] text-3">{activeCount} conectada{activeCount !== 1 ? 's' : ''} · disponíveis para conectar</p>
      </div>

      {/* Search */}
      <div className="relative" style={{ maxWidth: '460px' }}>
        <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-3" />
        <input
          className="h-10 w-full rounded-xl pl-10 pr-3 text-[13px] text-1 outline-none transition"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line-1)' }}
          placeholder="Buscar integrações…"
        />
      </div>

      {/* Conectadas */}
      {(waConnected || calendarConnected) && (
        <section>
          <h2 className="mb-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-3">Conectadas</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {waConnected && <WhatsAppCard />}
            {calendarConnected && (
              <IntegrationCard i={{
                id: 'calendar', name: 'Google Agenda', category: 'Agenda',
                desc: calendarLoading ? 'Verificando conexão...' : 'Sincronização bidirecional com Google Calendar.',
                bg: '#EAF1FE', connected: true, account: calendarData?.calendar_id,
                action: <Btn variant="outline" size="sm" onClick={disconnectCalendar}>Gerenciar</Btn>,
              }} />
            )}
          </div>
        </section>
      )}

      {/* Disponíveis */}
      <section>
        <h2 className="mb-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-3">Disponíveis</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {!waConnected && <WhatsAppCard />}
          {!calendarConnected && (
            <IntegrationCard i={{
              id: 'calendar', name: 'Google Agenda', category: 'Agenda',
              desc: 'Sincronize compromissos bidirecionalmente com o Google.',
              bg: '#EAF1FE', connected: false,
              action: <Btn variant="primary" size="sm" onClick={connectCalendar}>Conectar</Btn>,
            }} />
          )}
          <IntegrationCard i={{ id: 'instagram', name: 'Instagram Direct', category: 'Comunicação', desc: 'Responda DMs e comentários do Instagram diretamente.', bg: '#FDECEF', comingSoon: true }} />
          <IntegrationCard i={{ id: 'stripe', name: 'Stripe', category: 'Pagamento', desc: 'Receba pagamentos recorrentes, assinaturas e cobranças.', bg: '#EEEAFF', iconColor: '#635BFF', comingSoon: true }} />
          <IntegrationCard i={{ id: 'asaas', name: 'Asaas', category: 'Pagamento', desc: 'PIX, boleto, cobrança e assinatura nacional.', bg: '#E0F5EC', iconColor: '#00A868', comingSoon: true }} />
          <IntegrationCard i={{ id: 'mailchimp', name: 'Mailchimp', category: 'Captação', desc: 'Campanhas de e-mail e nutrição de leads.', bg: '#FFF9E0', comingSoon: true }} />
          <IntegrationCard i={{ id: 'zapier', name: 'Zapier', category: 'Captação', desc: 'Conexão com ferramentas externas sem código.', bg: '#FFE8DF', iconColor: '#FF4A00', comingSoon: true }} />
          <IntegrationCard i={{ id: 'webhook', name: 'Webhook', category: 'Captação', desc: 'Envio de eventos em tempo real para sua API.', bg: 'var(--bg-surface)', comingSoon: true }} />
          <IntegrationCard i={{ id: 'import', name: 'Importar pacientes', category: 'Dados', desc: 'Importação de base por CSV ou planilha.', bg: 'var(--bg-surface)', action: <ImportButton /> }} />
        </div>
      </section>
    </div>
  )
}
