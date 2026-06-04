'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Zap, CheckCircle, XCircle, Loader2, Copy, ChevronDown, ChevronUp, FlaskConical } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface Integration {
  id:          string
  name:        string
  webhook_url: string
  events:      string[]
  is_active:   boolean
  created_at:  string
}

const ALL_EVENTS: { value: string; label: string; desc: string; color: string }[] = [
  {
    value: 'plans_stage_reached',
    label: 'Apresentação de planos',
    desc:  'A IA detectou que é hora de mostrar os planos/serviços para o cliente',
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  },
  {
    value: 'appointment_booked',
    label: 'Consulta agendada',
    desc:  'Uma consulta foi confirmada — envia local, preço e instruções',
    color: 'text-brand-400 bg-brand-500/10 border-brand-500/20',
  },
  {
    value: 'first_contact',
    label: 'Primeiro contato',
    desc:  'Novo lead enviou a primeira mensagem',
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  },
  {
    value: 'no_reply_24h',
    label: 'Sem resposta 24h',
    desc:  'Cliente não respondeu em 24 horas (reengajamento)',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
]

// ── Form de nova integração ────────────────────────────────────────────────────
function NewIntegrationForm({ onCancel, onCreate }: {
  onCancel: () => void
  onCreate: (data: any) => Promise<void>
}) {
  const [name,        setName]        = useState('n8n')
  const [webhookUrl,  setWebhookUrl]  = useState('')
  const [secret,      setSecret]      = useState('')
  const [events,      setEvents]      = useState<string[]>(['plans_stage_reached', 'appointment_booked'])
  const [saving,      setSaving]      = useState(false)

  function toggleEvent(value: string) {
    setEvents(prev => prev.includes(value) ? prev.filter(e => e !== value) : [...prev, value])
  }

  async function handleSave() {
    if (!webhookUrl.trim()) { toast.error('URL do webhook obrigatória'); return }
    if (events.length === 0) { toast.error('Selecione ao menos um evento'); return }
    setSaving(true)
    try {
      await onCreate({ name, webhook_url: webhookUrl, secret: secret || undefined, events })
    } finally { setSaving(false) }
  }

  return (
    <div className="rounded-xl border space-y-5 p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-brand-400" />
        <h3 className="text-sm font-semibold text-t1">Nova integração</h3>
      </div>

      {/* Nome */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-t2">Nome</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="n8n, Make, Zapier..."
          className="w-full rounded-lg px-3 py-2 text-sm text-t1 focus:outline-none"
          style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
        />
      </div>

      {/* URL do webhook */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-t2">URL do webhook <span className="text-red-400">*</span></label>
        <input
          value={webhookUrl}
          onChange={e => setWebhookUrl(e.target.value)}
          placeholder="https://sua-instancia.app.n8n.cloud/webhook/..."
          className="w-full rounded-lg px-3 py-2 text-sm text-t1 font-mono focus:outline-none"
          style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
        />
        <p className="text-[11px] text-t3">Cole a URL do nó Webhook no n8n (método POST)</p>
      </div>

      {/* Secret opcional */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-t2">Secret HMAC <span className="text-t3 font-normal">(opcional)</span></label>
        <input
          value={secret}
          onChange={e => setSecret(e.target.value)}
          placeholder="Chave para validar assinatura X-Frame-Signature"
          className="w-full rounded-lg px-3 py-2 text-sm text-t1 font-mono focus:outline-none"
          style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
        />
      </div>

      {/* Eventos */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-t2">Eventos que disparam o webhook</label>
        <div className="space-y-2">
          {ALL_EVENTS.map(ev => (
            <label key={ev.value} className={cn(
              'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all',
              events.includes(ev.value) ? ev.color : 'border-border hover:bg-raised'
            )}>
              <input
                type="checkbox"
                className="mt-0.5 accent-brand-500"
                checked={events.includes(ev.value)}
                onChange={() => toggleEvent(ev.value)}
              />
              <div>
                <p className="text-sm font-medium text-t1">{ev.label}</p>
                <p className="text-xs text-t3 mt-0.5">{ev.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border text-sm text-t2 hover:text-t1 transition-colors" style={{ borderColor: 'var(--border)' }}>
          Cancelar
        </button>
        <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-all disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Salvar integração'}
        </button>
      </div>
    </div>
  )
}

// ── Card de integração existente ───────────────────────────────────────────────
function IntegrationCard({ integration, onDelete, onToggle, onTest }: {
  integration: Integration
  onDelete: () => void
  onToggle: (active: boolean) => void
  onTest: () => Promise<{ ok: boolean; status?: number }>
}) {
  const [open,    setOpen]    = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; status?: number } | null>(null)

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await onTest()
      setTestResult(res)
    } finally { setTesting(false) }
  }

  const activeEvents = ALL_EVENTS.filter(e => integration.events.includes(e.value))

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden transition-all',
      integration.is_active ? 'border-border bg-surface' : 'border-border/50 bg-surface/60 opacity-60'
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-t1">{integration.name}</p>
          <p className="text-xs text-t3 font-mono truncate">{integration.webhook_url}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle ativo/inativo */}
          <button
            onClick={() => onToggle(!integration.is_active)}
            className={cn(
              'relative w-10 h-[22px] rounded-full transition-colors flex-shrink-0',
              integration.is_active ? 'bg-brand-500' : 'bg-raised'
            )}
            style={integration.is_active ? {} : { border: '1px solid var(--border)' }}
          >
            <span className={cn(
              'absolute top-[2px] w-[18px] h-[18px] bg-white rounded-full shadow-sm transition-transform',
              integration.is_active ? 'left-[20px]' : 'left-[2px]'
            )} />
          </button>
          <button onClick={() => setOpen(o => !o)} className="p-1.5 text-t3 hover:text-t1 transition-colors">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded */}
      {open && (
        <div className="px-4 pb-4 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>
          {/* Eventos ativos */}
          <div className="pt-3 flex flex-wrap gap-2">
            {activeEvents.map(ev => (
              <span key={ev.value} className={cn('text-[11px] font-mono px-2 py-0.5 rounded-full border', ev.color)}>
                {ev.label}
              </span>
            ))}
          </div>

          {/* Payload de exemplo */}
          <div className="rounded-lg p-3 space-y-1" style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] font-mono text-t3 uppercase tracking-wider mb-2">Payload enviado pelo Frame System</p>
            <pre className="text-[11px] text-t2 font-mono whitespace-pre-wrap leading-relaxed">{`{
  "event": "plans_stage_reached",
  "nutritionist_id": "uuid",
  "client_phone": "5511999999999",
  "conversation_id": "uuid",
  "timestamp": "2026-06-04T10:00:00Z",
  "data": {
    "instance_name": "minha-instancia",
    "plan_media_url": "https://api.../uploads/planos.pdf",
    "plan_message_text": "Sua mensagem configurada",
    "services": [...]
  }
}`}</pre>
            <button
              onClick={() => { navigator.clipboard.writeText('X-Frame-Event\nX-Frame-Signature'); toast.success('Copiado!') }}
              className="flex items-center gap-1.5 text-[11px] text-t3 hover:text-brand-400 transition-colors mt-1"
            >
              <Copy className="w-3 h-3" /> Copiar headers de validação
            </button>
          </div>

          {/* Teste */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleTest}
              disabled={testing}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-t2 hover:text-t1 hover:bg-raised transition-all disabled:opacity-50"
              style={{ borderColor: 'var(--border)' }}
            >
              {testing
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <FlaskConical className="w-3.5 h-3.5" />}
              Testar webhook
            </button>

            {testResult !== null && (
              <span className={cn('flex items-center gap-1.5 text-sm font-medium', testResult.ok ? 'text-emerald-400' : 'text-red-400')}>
                {testResult.ok
                  ? <><CheckCircle className="w-4 h-4" /> Recebido (HTTP {testResult.status})</>
                  : <><XCircle    className="w-4 h-4" /> Falhou (HTTP {testResult.status ?? 'timeout'})</>}
              </span>
            )}
          </div>

          <button
            onClick={onDelete}
            className="flex items-center gap-2 text-sm text-red-400/70 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Remover integração
          </button>
        </div>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function IntegracoesPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useQuery<{ integrations: Integration[] }>({
    queryKey: ['integrations'],
    queryFn: () => api.get('/api/integrations').then(r => r.data),
  })
  const integrations = data?.integrations ?? []

  const createMut = useMutation({
    mutationFn: (body: any) => api.post('/api/integrations', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['integrations'] }); setShowForm(false); toast.success('Integração criada!') },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Erro ao criar integração'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/integrations/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['integrations'] }); toast.success('Integração removida') },
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.patch(`/api/integrations/${id}`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations'] }),
  })

  async function handleTest(id: string) {
    try {
      const { data } = await api.post(`/api/integrations/${id}/test`)
      return { ok: data.ok, status: data.status }
    } catch (e: any) {
      return { ok: false, status: e?.response?.status }
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-t1">Integrações</h1>
          <p className="text-sm text-t3 mt-0.5">
            Conecte o Frame System ao n8n para automações inteligentes.
            O sistema dispara eventos nos momentos certos — seu fluxo n8n faz o resto.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Nova integração
          </button>
        )}
      </div>

      {/* Como funciona */}
      <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <p className="text-xs font-semibold text-t2 uppercase tracking-wider">Como funciona</p>
        <div className="grid grid-cols-3 gap-3 text-center text-xs">
          {[
            { icon: '💬', title: 'Conversa avança', desc: 'Cliente pede planos ou agenda consulta' },
            { icon: '⚡', title: 'Frame dispara', desc: 'POST para seu webhook n8n com payload completo' },
            { icon: '🤖', title: 'n8n executa', desc: 'Envia mídia, WhatsApp, notificação, planilha...' },
          ].map((s, i) => (
            <div key={i} className="space-y-1.5 p-3 rounded-xl" style={{ background: 'var(--raised)' }}>
              <span className="text-2xl">{s.icon}</span>
              <p className="font-medium text-t1">{s.title}</p>
              <p className="text-t3 leading-snug">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Form de nova integração */}
      {showForm && (
        <NewIntegrationForm
          onCancel={() => setShowForm(false)}
          onCreate={data => createMut.mutateAsync(data)}
        />
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : integrations.length === 0 && !showForm ? (
        <div className="text-center py-12 space-y-2">
          <Zap className="w-10 h-10 mx-auto text-t3 opacity-40" />
          <p className="text-sm text-t2 font-medium">Nenhuma integração configurada</p>
          <p className="text-xs text-t3">Adicione o webhook do seu n8n para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {integrations.map(integration => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              onDelete={() => deleteMut.mutate(integration.id)}
              onToggle={is_active => toggleMut.mutate({ id: integration.id, is_active })}
              onTest={() => handleTest(integration.id)}
            />
          ))}
        </div>
      )}

      {/* Link para templates n8n */}
      <div className="rounded-xl border px-4 py-3 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
        <div>
          <p className="text-sm font-medium text-t1">Precisa de um fluxo pronto?</p>
          <p className="text-xs text-t3 mt-0.5">Importe o template n8n do Frame System e adapte</p>
        </div>
        <button
          onClick={() => {
            const template = buildN8nTemplate()
            const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' })
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = 'frame-system-n8n-workflow.json'
            a.click()
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-t2 hover:text-brand-400 hover:border-brand-500/40 transition-all whitespace-nowrap"
          style={{ borderColor: 'var(--border)' }}
        >
          ⬇ Baixar template n8n
        </button>
      </div>
    </div>
  )
}

// ── Gera template n8n para importação ─────────────────────────────────────────
function buildN8nTemplate() {
  return {
    name: "Frame System — Atendimento Automático",
    nodes: [
      {
        id: "webhook-trigger",
        name: "Recebe Evento Frame System",
        type: "n8n-nodes-base.webhook",
        typeVersion: 2,
        position: [240, 300],
        parameters: {
          httpMethod: "POST",
          path: "frame-system",
          responseMode: "immediately",
          responseCode: 200,
        },
      },
      {
        id: "switch-event",
        name: "Tipo de Evento",
        type: "n8n-nodes-base.switch",
        typeVersion: 3,
        position: [460, 300],
        parameters: {
          mode: "rules",
          rules: {
            values: [
              { conditions: { options: { caseSensitive: true, leftValue: "", typeValidation: "strict" }, combinator: "and", conditions: [{ leftValue: "={{ $json.event }}", rightValue: "plans_stage_reached", operator: { type: "string", operation: "equals" } }] }, renameOutput: true, outputKey: "Apresentar Planos" },
              { conditions: { options: { caseSensitive: true, leftValue: "", typeValidation: "strict" }, combinator: "and", conditions: [{ leftValue: "={{ $json.event }}", rightValue: "appointment_booked", operator: { type: "string", operation: "equals" } }] }, renameOutput: true, outputKey: "Consulta Agendada" },
              { conditions: { options: { caseSensitive: true, leftValue: "", typeValidation: "strict" }, combinator: "and", conditions: [{ leftValue: "={{ $json.event }}", rightValue: "first_contact", operator: { type: "string", operation: "equals" } }] }, renameOutput: true, outputKey: "Primeiro Contato" },
            ],
          },
        },
      },
      {
        id: "send-plans-media",
        name: "Envia Mídia dos Planos",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.2,
        position: [700, 160],
        parameters: {
          method: "POST",
          url: "={{ 'https://SUA-EVOLUTION-API/message/sendMedia/' + $json.data.instance_name }}",
          sendHeaders: true,
          headerParameters: { parameters: [{ name: "apikey", value: "SUA_API_KEY" }] },
          sendBody: true,
          bodyParameters: {
            parameters: [
              { name: "number",   value: "={{ $json.client_phone }}" },
              { name: "mediatype", value: "={{ $json.data.plan_media_type ?? 'document' }}" },
              { name: "media",    value: "={{ $json.data.plan_media_url }}" },
              { name: "caption",  value: "={{ $json.data.plan_message_text ?? '' }}" },
            ],
          },
        },
        notes: "Substitua SUA-EVOLUTION-API e SUA_API_KEY pelos seus dados",
      },
      {
        id: "send-booking-confirmation",
        name: "Envia Confirmação de Agendamento",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.2,
        position: [700, 300],
        parameters: {
          method: "POST",
          url: "={{ 'https://SUA-EVOLUTION-API/message/sendText/' + $json.data.instance_name }}",
          sendHeaders: true,
          headerParameters: { parameters: [{ name: "apikey", value: "SUA_API_KEY" }] },
          sendBody: true,
          bodyParameters: {
            parameters: [
              { name: "number", value: "={{ $json.client_phone }}" },
              { name: "text",   value: "={{ $json.data.confirmation_message + '\\n\\n📍 ' + ($json.data.address ?? '') + '\\n💰 ' + ($json.data.price ?? '') }}" },
            ],
          },
        },
      },
    ],
    connections: {
      "Recebe Evento Frame System": { main: [[{ node: "Tipo de Evento", type: "main", index: 0 }]] },
      "Tipo de Evento": {
        main: [
          [{ node: "Envia Mídia dos Planos",              type: "main", index: 0 }],
          [{ node: "Envia Confirmação de Agendamento",    type: "main", index: 0 }],
        ],
      },
    },
    settings: { executionOrder: "v1" },
    meta: { templateId: "frame-system-v1" },
  }
}
