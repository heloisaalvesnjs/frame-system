'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Wifi, WifiOff, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

interface WhatsAppStatus {
  status: 'connected' | 'disconnected' | 'connecting'
  phone?: string
}

export default function WhatsAppPage() {
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
        toast.success('WhatsApp conectado com sucesso!')
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
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as any).response?.data?.error : null
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
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as any).response?.data?.error : null
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
    toast.success('WhatsApp desconectado.')
  }

  const isConnected = status?.status === 'connected'

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display font-bold text-[22px] tracking-tight text-t1">WhatsApp</h1>
        <p className="text-sm text-t2 mt-0.5">Conecte o número de WhatsApp do seu consultório à assistente</p>
      </div>

      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col gap-6">

            {/* Status */}
            <div className={cn(
              'flex items-center gap-4 p-4 rounded-xl border transition-colors',
              isConnected ? 'bg-brand-500/10 border-brand-500/20' : ''
            )} style={{ borderColor: isConnected ? undefined : 'var(--border)' }}>
              <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', isConnected ? 'bg-brand-500/20' : 'bg-raised')}>
                {isConnected
                  ? <Wifi className="w-5 h-5 text-brand-400" />
                  : <WifiOff className="w-5 h-5 text-t3" />}
              </div>
              <div>
                <p className="font-semibold text-t1">{isConnected ? 'Conectado' : 'Desconectado'}</p>
                <p className="text-sm text-t3">
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
                <p className="text-sm text-t2">
                  Sua assistente está ativa e respondendo mensagens no WhatsApp.
                </p>
                <Button variant="danger" onClick={handleDisconnect} className="w-fit">
                  Desconectar WhatsApp
                </Button>
              </div>

            ) : pairingCode ? (
              <div className="flex flex-col items-center gap-5">
                <p className="text-sm text-t2 text-center">
                  No WhatsApp → <strong className="text-t1">Dispositivos vinculados</strong> → <strong className="text-t1">Vincular com número de telefone</strong> → digite o código:
                </p>
                <div className="rounded-2xl px-10 py-6 text-center" style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
                  <p className="text-4xl font-bold text-brand-400 tracking-[0.3em]">{pairingCode}</p>
                  <p className="text-xs text-t3 mt-2">O código expira em alguns minutos</p>
                </div>
                <p className="text-xs text-t3 animate-pulse">Aguardando conexão...</p>
              </div>

            ) : qrCode ? (
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm text-t2 text-center">
                  Abra o WhatsApp → Dispositivos vinculados → Vincular dispositivo → Escaneie o QR
                </p>
                <div className="rounded-xl p-4 bg-white border border-t3/20">
                  <img src={qrCode} alt="QR Code WhatsApp" className="w-56 h-56" />
                </div>
                <p className="text-xs text-t3 animate-pulse">Aguardando conexão...</p>
              </div>

            ) : (
              <div className="flex flex-col gap-5">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3 text-sm text-blue-500">
                  Recomendamos usar um número de WhatsApp exclusivo para o consultório.
                </div>

                <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--raised)' }}>
                  {(['code', 'qr'] as const).map(m => (
                    <button key={m}
                      onClick={() => setMode(m)}
                      className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                        mode === m ? 'bg-brand-500 text-white' : 'text-t3 hover:text-t1'
                      )}
                    >
                      {m === 'code' ? 'Código' : 'QR Code'}
                    </button>
                  ))}
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                )}

                {mode === 'code' ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-xs text-t3">
                      Digite seu número com código do país e DDD (ex: 5511999999999)
                    </p>
                    <div className="flex gap-3">
                      <input
                        type="tel"
                        placeholder="5511999999999"
                        value={pairingPhone}
                        onChange={(e) => setPairingPhone(e.target.value)}
                        className="flex-1 h-9 rounded-lg px-3 text-sm text-t1 placeholder:text-t3 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-colors"
                        style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
                      />
                      <Button onClick={handleConnect} loading={connecting} disabled={!pairingPhone.trim()}>
                        <Smartphone className="w-4 h-4" /> Conectar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button onClick={handleConnect} loading={connecting} className="w-fit">
                    <Smartphone className="w-4 h-4" /> Conectar via QR Code
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
