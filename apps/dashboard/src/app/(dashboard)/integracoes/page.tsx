'use client'

import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  MessageCircle, Calendar, FileSpreadsheet,
  CheckCircle, XCircle, Loader2, ExternalLink,
  Upload, AlertCircle, ChevronDown, ChevronUp,
} from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

// ── WhatsApp Card ──────────────────────────────────────────────────────────────
function WhatsAppCard() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)

  const { data, isLoading } = useQuery<any>({
    queryKey: ['whatsapp-status'],
    queryFn: () => api.get('/api/whatsapp/status').then(r => r.data),
    refetchInterval: 5000,
  })

  const connected = data?.status === 'connected'
  const phone     = data?.phone

  async function handleDisconnect() {
    try {
      await api.delete('/api/whatsapp/disconnect')
      qc.invalidateQueries({ queryKey: ['whatsapp-status'] })
      toast.success('WhatsApp desconectado')
    } catch {
      toast.error('Erro ao desconectar')
    }
  }

  return (
    <IntegrationCard
      icon={<MessageCircle className="w-5 h-5 text-emerald-400" />}
      iconBg="bg-emerald-500/10"
      title="WhatsApp"
      description="Número conectado via Evolution API — a IA atende por aqui"
      connected={connected}
      loading={isLoading}
      open={open}
      onToggleOpen={() => setOpen(o => !o)}
    >
      {connected ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-400">Conectado</p>
              {phone && <p className="text-xs text-t3 mt-0.5">{phone}</p>}
            </div>
          </div>
          <p className="text-xs text-t3">
            Para trocar o número ou reconectar, vá para{' '}
            <a href="/whatsapp" className="text-brand-400 hover:underline">Configurações → WhatsApp</a>.
          </p>
          <button
            onClick={handleDisconnect}
            className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
          >
            Desconectar
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-t2">
            Conecte seu WhatsApp para que a IA possa atender seus pacientes automaticamente.
          </p>
          <a
            href="/whatsapp"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-all"
          >
            Conectar WhatsApp <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </IntegrationCard>
  )
}

// ── Google Calendar Card ───────────────────────────────────────────────────────
function GoogleCalendarCard() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [connecting, setConnecting] = useState(false)

  const { data, isLoading } = useQuery<any>({
    queryKey: ['google-calendar-status'],
    queryFn: () => api.get('/api/google-calendar/status').then(r => r.data),
  })

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

  return (
    <IntegrationCard
      icon={<Calendar className="w-5 h-5 text-blue-400" />}
      iconBg="bg-blue-500/10"
      title="Google Calendar"
      description="Sincronize consultas agendadas pela IA com sua agenda Google"
      connected={connected}
      loading={isLoading}
      open={open}
      onToggleOpen={() => setOpen(o => !o)}
    >
      {connected ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-400">Conectado</p>
              {data?.calendar_id && (
                <p className="text-xs text-t3 mt-0.5 font-mono truncate">{data.calendar_id}</p>
              )}
            </div>
          </div>
          <p className="text-xs text-t2 leading-relaxed">
            Consultas agendadas pela IA são adicionadas automaticamente à sua agenda.
          </p>
          <button
            onClick={handleDisconnect}
            className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
          >
            Desconectar
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-t2 leading-relaxed">
            Quando conectado, toda consulta agendada pela IA cria automaticamente um evento no Google Calendar.
          </p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-all disabled:opacity-60"
          >
            {connecting
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <ExternalLink className="w-3.5 h-3.5" />}
            Conectar com Google
          </button>
        </div>
      )}
    </IntegrationCard>
  )
}

// ── Webdiet Card ───────────────────────────────────────────────────────────────
function WebdietCard() {
  const [open,     setOpen]     = useState(false)
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
    <IntegrationCard
      icon={<FileSpreadsheet className="w-5 h-5 text-orange-400" />}
      iconBg="bg-orange-500/10"
      title="Importar pacientes"
      description="Importe sua lista de pacientes do Webdiet, Nutrium ou planilha CSV"
      connected={false}
      showBadge={false}
      open={open}
      onToggleOpen={() => setOpen(o => !o)}
    >
      <div className="space-y-4">
        <div className="rounded-xl p-3 space-y-1" style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
          <p className="text-[11px] font-mono text-t3 uppercase tracking-wider mb-2">Formato esperado (CSV)</p>
          <pre className="text-[11px] text-t2 font-mono">{`nome,telefone,email\nAna Silva,5511999999999,ana@email.com\nCarlos Souza,5521888888888,`}</pre>
          <p className="text-[11px] text-t3 mt-2">
            • Colunas obrigatórias: <code className="text-brand-400">nome</code> e <code className="text-brand-400">telefone</code>{'\n'}
            • Telefone no formato internacional (55 + DDD + número){'\n'}
            • Excel (.xlsx) também é aceito
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all',
            dragging ? 'border-brand-500/60 bg-brand-500/5' : 'hover:bg-raised'
          )}
          style={{ borderColor: dragging ? undefined : 'var(--border)' }}
        >
          <Upload className="w-5 h-5 text-t3 mx-auto mb-2" />
          {file ? (
            <p className="text-sm font-medium text-t1">{file.name}</p>
          ) : (
            <>
              <p className="text-sm text-t2">Arraste o arquivo ou <span className="text-brand-400">clique para selecionar</span></p>
              <p className="text-xs text-t3 mt-1">CSV ou Excel — até 10MB</p>
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
            className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Importando...' : 'Importar pacientes'}
          </button>
        )}

        {result && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-400">{result.imported} pacientes importados</p>
              {result.skipped > 0 && (
                <p className="text-xs text-t3 mt-0.5">{result.skipped} ignorados (duplicados ou dados inválidos)</p>
              )}
            </div>
          </div>
        )}

        <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
          <AlertCircle className="w-3.5 h-3.5 text-t3 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-t3 leading-relaxed">
            No Webdiet: <strong className="text-t2">Pacientes → Exportar → CSV</strong>.
            No Nutrium: <strong className="text-t2">Pacientes → Exportar lista</strong>.
            Renomeie as colunas para <code className="text-brand-400">nome</code> e <code className="text-brand-400">telefone</code> se necessário.
          </p>
        </div>
      </div>
    </IntegrationCard>
  )
}

// ── Componente genérico de card ────────────────────────────────────────────────
function IntegrationCard({
  icon, iconBg, title, description, connected, loading,
  showBadge = true, open, onToggleOpen, children,
}: {
  icon: React.ReactNode
  iconBg: string
  title: string
  description: string
  connected?: boolean
  loading?: boolean
  showBadge?: boolean
  open: boolean
  onToggleOpen: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <button
        onClick={onToggleOpen}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-raised/40 transition-colors"
      >
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', iconBg)}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-t1">{title}</p>
          <p className="text-xs text-t3 mt-0.5 truncate">{description}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {showBadge && (
            loading ? (
              <Loader2 className="w-4 h-4 text-t3 animate-spin" />
            ) : connected ? (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5" /> Conectado
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-medium text-t3">
                <XCircle className="w-3.5 h-3.5" /> Não conectado
              </span>
            )
          )}
          {open
            ? <ChevronUp className="w-4 h-4 text-t3" />
            : <ChevronDown className="w-4 h-4 text-t3" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="pt-4">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function IntegracoesPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-[22px] tracking-tight text-t1">Integrações</h1>
        <p className="text-sm text-t2 mt-0.5">
          Conecte suas ferramentas externas e importe seus dados existentes.
        </p>
      </div>

      <div className="space-y-3">
        <WhatsAppCard />
        <GoogleCalendarCard />
        <WebdietCard />
      </div>
    </div>
  )
}
