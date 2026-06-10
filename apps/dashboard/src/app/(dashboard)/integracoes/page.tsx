'use client'

import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Loader2, ExternalLink, Upload, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

type IntegrationId = 'whatsapp' | 'gcal' | 'import'

// ── Badge de status ───────────────────────────────────────────────
function StatusBadge({ loading, connected }: { loading?: boolean; connected?: boolean }) {
  if (loading) return <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--t3)' }} />
  if (connected) return (
    <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: '#059669' }}>
      <CheckCircle className="w-3.5 h-3.5" /> Conectado
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--t3)' }}>
      <XCircle className="w-3.5 h-3.5" /> Não conectado
    </span>
  )
}

// ── Tile da grade ─────────────────────────────────────────────────
function IntegrationTile({ emoji, iconBg, name, desc, selected, onClick, badge }: {
  emoji: string; iconBg: string; name: string; desc: string
  selected: boolean; onClick: () => void; badge: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="card flex items-start gap-3 text-left transition-all"
      style={{
        padding: '16px',
        borderColor: selected ? 'var(--brand)' : undefined,
        boxShadow: selected ? '0 0 0 3px rgba(0,194,124,0.12)' : undefined,
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-[22px]"
        style={{ background: iconBg }}
      >
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold" style={{ color: 'var(--t1)' }}>{name}</p>
        <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--t2)' }}>{desc}</p>
        <div className="mt-2">{badge}</div>
      </div>
    </button>
  )
}

// ── Detalhe: WhatsApp ─────────────────────────────────────────────
function WhatsAppDetail({ data, isLoading }: { data: any; isLoading: boolean }) {
  const qc = useQueryClient()
  const connected = data?.status === 'connected'
  const phone = data?.phone

  async function handleDisconnect() {
    try {
      await api.delete('/api/whatsapp/disconnect')
      qc.invalidateQueries({ queryKey: ['whatsapp-status'] })
      toast.success('WhatsApp desconectado')
    } catch {
      toast.error('Erro ao desconectar')
    }
  }

  if (isLoading) return <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--t3)' }} />

  return connected ? (
    <div className="space-y-4">
      <div
        className="flex items-center gap-3 p-3 rounded-xl"
        style={{ background: 'var(--brand-s)', border: '1px solid rgba(0,194,124,0.2)' }}
      >
        <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#059669' }} />
        <div>
          <p className="text-sm font-medium" style={{ color: '#059669' }}>Conectado</p>
          {phone && <p className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>{phone}</p>}
        </div>
      </div>
      <p className="text-xs" style={{ color: 'var(--t3)' }}>
        Para trocar o número ou reconectar, desconecte e leia o QR code novamente.
      </p>
      <button
        onClick={handleDisconnect}
        className="text-xs transition-colors hover:text-red-500"
        style={{ color: '#EF4444', opacity: 0.8 }}
      >
        Desconectar
      </button>
    </div>
  ) : (
    <div className="space-y-3">
      <p className="text-sm" style={{ color: 'var(--t2)' }}>
        Conecte seu WhatsApp para que a IA possa atender seus pacientes automaticamente.
      </p>
      <a
        href="/integracoes"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
        style={{ background: 'var(--brand)', color: '#fff' }}
      >
        Conectar WhatsApp <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  )
}

// ── Detalhe: Google Calendar ──────────────────────────────────────
function GoogleCalendarDetail({ data, isLoading }: { data: any; isLoading: boolean }) {
  const qc = useQueryClient()
  const [connecting, setConnecting] = useState(false)
  const connected = !!data?.calendar_id

  async function handleConnect() {
    setConnecting(true)
    try {
      const { data: authData } = await api.get('/api/google-calendar/auth-url')
      if (authData?.url) {
        window.location.href = authData.url
      }
    } catch {
      toast.error('Erro ao obter URL de autorização')
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    try {
      await api.delete('/api/google-calendar/disconnect')
      qc.invalidateQueries({ queryKey: ['google-calendar-status'] })
      toast.success('Google Calendar desconectado')
    } catch {
      toast.error('Erro ao desconectar')
    }
  }

  if (isLoading) return <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--t3)' }} />

  return connected ? (
    <div className="space-y-4">
      <div
        className="flex items-center gap-3 p-3 rounded-xl"
        style={{ background: 'rgba(10,132,255,0.08)', border: '1px solid rgba(10,132,255,0.2)' }}
      >
        <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#2563EB' }} />
        <div className="min-w-0">
          <p className="text-sm font-medium" style={{ color: '#2563EB' }}>Conectado</p>
          {data?.calendar_id && (
            <p className="text-xs mt-0.5 font-mono truncate" style={{ color: 'var(--t3)' }}>{data.calendar_id}</p>
          )}
        </div>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--t2)' }}>
        Consultas agendadas pela IA são adicionadas automaticamente à sua agenda.
      </p>
      <button
        onClick={handleDisconnect}
        className="text-xs transition-colors hover:text-red-500"
        style={{ color: '#EF4444', opacity: 0.8 }}
      >
        Desconectar
      </button>
    </div>
  ) : (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed" style={{ color: 'var(--t2)' }}>
        Quando conectado, toda consulta agendada pela IA cria automaticamente um evento no Google Calendar.
      </p>
      <button
        onClick={handleConnect}
        disabled={connecting}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
        style={{ background: '#3B82F6', color: '#fff' }}
      >
        {connecting
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <ExternalLink className="w-3.5 h-3.5" />}
        Conectar com Google
      </button>
    </div>
  )
}

// ── Detalhe: Importar pacientes ───────────────────────────────────
function ImportDetail() {
  const [dragging, setDragging] = useState(false)
  const [file,     setFile]     = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result,   setResult]   = useState<{ imported: number; skipped: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith('.csv') || f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) {
      setFile(f)
    } else {
      toast.error('Arquivo inválido. Use CSV ou Excel (.xlsx)')
    }
  }

  async function handleImport() {
    if (!file) return
    setUploading(true)
    setResult(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post('/api/clients/import-csv', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult({ imported: data.imported ?? 0, skipped: data.skipped ?? 0 })
      toast.success(`${data.imported} pacientes importados!`)
      setFile(null)
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? 'Erro ao importar. Verifique o formato do arquivo.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="space-y-4">
        <div className="rounded-xl p-3 space-y-1" style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
          <p className="text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--t3)' }}>Formato esperado (CSV)</p>
          <pre className="text-[11px] font-mono" style={{ color: 'var(--t2)' }}>{`nome,telefone,email\nAna Silva,5511999999999,ana@email.com\nCarlos Souza,5521888888888,`}</pre>
          <p className="text-[11px] mt-2 leading-relaxed" style={{ color: 'var(--t3)' }}>
            • Colunas obrigatórias: <code style={{ color: 'var(--brand)' }}>nome</code> e <code style={{ color: 'var(--brand)' }}>telefone</code><br />
            • Telefone no formato internacional (55 + DDD + número)<br />
            • Excel (.xlsx) também é aceito
          </p>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--t3)' }} />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--t3)' }}>
            No Webdiet: <strong style={{ color: 'var(--t2)' }}>Pacientes → Exportar → CSV</strong>.
            No Nutrium: <strong style={{ color: 'var(--t2)' }}>Pacientes → Exportar lista</strong>.
            Renomeie as colunas para <code style={{ color: 'var(--brand)' }}>nome</code> e <code style={{ color: 'var(--brand)' }}>telefone</code> se necessário.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="rounded-xl p-6 text-center cursor-pointer transition-all"
          style={{
            border: '2px dashed',
            borderColor: dragging ? 'var(--brand)' : 'var(--border)',
            background: dragging ? 'rgba(0,194,124,0.05)' : undefined,
          }}
        >
          <Upload className="w-5 h-5 mx-auto mb-2" style={{ color: 'var(--t3)' }} />
          {file ? (
            <p className="text-sm font-medium" style={{ color: 'var(--t1)' }}>{file.name}</p>
          ) : (
            <>
              <p className="text-sm" style={{ color: 'var(--t2)' }}>
                Arraste o arquivo ou <span style={{ color: 'var(--brand)' }}>clique para selecionar</span>
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--t3)' }}>CSV ou Excel — até 10MB</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {file && (
          <button
            onClick={handleImport}
            disabled={uploading}
            className="btn-primary w-full justify-center"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Importando...' : 'Importar pacientes'}
          </button>
        )}

        {result && (
          <div
            className="flex items-start gap-2 p-3 rounded-xl text-sm"
            style={{ background: 'var(--brand-s)', border: '1px solid rgba(0,194,124,0.2)' }}
          >
            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#059669' }} />
            <div>
              <p className="font-semibold" style={{ color: '#059669' }}>{result.imported} pacientes importados</p>
              {result.skipped > 0 && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>{result.skipped} ignorados (duplicados ou dados inválidos)</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────
export default function IntegracoesPage() {
  const [selected, setSelected] = useState<IntegrationId>('whatsapp')

  const { data: waData, isLoading: waLoading } = useQuery<any>({
    queryKey: ['whatsapp-status'],
    queryFn: () => api.get('/api/whatsapp/status').then(r => r.data),
    refetchInterval: 5000,
  })

  const { data: gcData, isLoading: gcLoading } = useQuery<any>({
    queryKey: ['google-calendar-status'],
    queryFn: () => api.get('/api/google-calendar/status').then(r => r.data),
  })

  const waConnected = waData?.status === 'connected'
  const gcConnected = !!gcData?.calendar_id

  const DETAIL_TITLES: Record<IntegrationId, string> = {
    whatsapp: 'WhatsApp Business',
    gcal: 'Google Calendar',
    import: 'Importar pacientes',
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-bold text-[22px] tracking-tight" style={{ color: 'var(--t1)' }}>Integrações</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--t2)' }}>Conecte suas ferramentas favoritas</p>
      </div>

      {/* Grade de integrações */}
      <div className="grid md:grid-cols-3 gap-3.5">
        <IntegrationTile
          emoji="💬"
          iconBg="#EFF6FF"
          name="WhatsApp Business"
          desc="A IA atende seus pacientes por aqui"
          selected={selected === 'whatsapp'}
          onClick={() => setSelected('whatsapp')}
          badge={<StatusBadge loading={waLoading} connected={waConnected} />}
        />
        <IntegrationTile
          emoji="📅"
          iconBg="#F0FDF4"
          name="Google Calendar"
          desc="Sincroniza consultas automaticamente"
          selected={selected === 'gcal'}
          onClick={() => setSelected('gcal')}
          badge={<StatusBadge loading={gcLoading} connected={gcConnected} />}
        />
        <IntegrationTile
          emoji="📊"
          iconBg="#FFF9E6"
          name="Importar pacientes"
          desc="Webdiet, Nutrium ou planilha CSV"
          selected={selected === 'import'}
          onClick={() => setSelected('import')}
          badge={
            <span className="text-[11px] font-medium" style={{ color: 'var(--t3)' }}>
              CSV / Excel
            </span>
          }
        />
      </div>

      {/* Painel de detalhe */}
      <div className="card" style={{ padding: '20px' }}>
        <p className="text-sm font-bold mb-4" style={{ color: 'var(--t1)' }}>{DETAIL_TITLES[selected]}</p>
        {selected === 'whatsapp' && <WhatsAppDetail data={waData} isLoading={waLoading} />}
        {selected === 'gcal'     && <GoogleCalendarDetail data={gcData} isLoading={gcLoading} />}
        {selected === 'import'   && <ImportDetail />}
      </div>
    </div>
  )
}
