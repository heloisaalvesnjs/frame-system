'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  CheckCircle, XCircle, AlertCircle,
  MessageSquare, ChevronRight, Loader2,
  Bell, Star, RotateCcw, Zap,
} from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

// ── Status checker ────────────────────────────────────────────────
interface StatusItem {
  label: string; ok: boolean; warn?: boolean; detail?: string; href?: string
}

function StatusDot({ ok, warn }: { ok: boolean; warn?: boolean }) {
  if (ok)   return <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#059669' }} />
  if (warn) return <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#D97706' }} />
  return      <XCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#EF4444' }} />
}

function AIStatusChecker() {
  const { data: assistant } = useQuery<any>({ queryKey: ['assistant'], queryFn: async () => { const { data } = await api.get('/api/assistants'); return data.assistant } })
  const { data: slots }     = useQuery<any[]>({ queryKey: ['availability'], queryFn: async () => { const { data } = await api.get('/api/nutritionists/availability'); return data } })
  const { data: whatsapp }  = useQuery<any>({ queryKey: ['whatsapp-status'], queryFn: async () => { const { data } = await api.get('/api/whatsapp/status'); return data } })
  const { data: services }  = useQuery<any[]>({ queryKey: ['services'], queryFn: async () => { const { data } = await api.get('/api/services'); return data.services } })
  if (!assistant) return null
  const checks: StatusItem[] = [
    { label: 'Nome da assistente', ok: !!assistant?.name, detail: assistant?.name || 'Não configurado', href: '/configuracoes' },
    { label: 'Serviços e valores', ok: (services?.length ?? 0) > 0 || !!assistant?.service_plans, detail: (services?.length ?? 0) > 0 ? `${services!.length} serviço(s)` : 'Não configurado', warn: (services?.length ?? 0) === 0, href: '/servicos' },
    { label: 'Horários disponíveis', ok: (slots?.length ?? 0) > 0, detail: (slots?.length ?? 0) > 0 ? `${slots!.length} faixa(s)` : 'Não configurado', href: '/configuracoes' },
    { label: 'WhatsApp conectado', ok: whatsapp?.status === 'connected', detail: whatsapp?.status === 'connected' ? 'Conectado' : 'Desconectado', href: '/integracoes' },
  ]
  const score = checks.filter(c => c.ok).length
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Status da IA</p>
          <span
            className="font-mono text-lg font-bold"
            style={{ color: score === checks.length ? '#059669' : score >= 2 ? '#D97706' : '#EF4444' }}
          >
            {score}/{checks.length}
          </span>
        </div>
        <div className="space-y-2">
          {checks.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <StatusDot ok={item.ok} warn={item.warn} />
              <p className="text-xs flex-1" style={{ color: 'var(--t2)' }}>{item.label}</p>
              {!item.ok && item.href && (
                <a href={item.href} style={{ color: 'var(--t3)' }}>
                  <ChevronRight className="w-3 h-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Toggle Switch ─────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="relative w-10 flex-shrink-0 rounded-full transition-colors"
      style={{
        height: '22px',
        background: value ? 'var(--brand)' : 'var(--raised)',
        border: value ? 'none' : '1px solid var(--border)',
      }}
    >
      <span
        className="absolute top-[2px] w-[18px] h-[18px] bg-white rounded-full shadow-sm transition-transform"
        style={{ left: value ? '20px' : '2px' }}
      />
    </button>
  )
}

// ── Tags de variáveis ─────────────────────────────────────────────
function VarTags({ vars }: { vars: string[] }) {
  return (
    <div className="flex gap-1.5 flex-wrap items-center">
      <span className="text-[10px] font-mono" style={{ color: 'var(--t3)' }}>Variáveis:</span>
      {vars.map(v => (
        <span
          key={v}
          className="font-mono text-[10px] px-1.5 py-0.5 rounded"
          style={{ background: 'var(--brand-s)', color: 'var(--brand)' }}
        >
          {`{${v}}`}
        </span>
      ))}
    </div>
  )
}

// ── Shared mini card ──────────────────────────────────────────────
function MiniCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="px-5 py-4 space-y-4">{children}</div>
    </div>
  )
}

// ── Tab: Sem resposta ─────────────────────────────────────────────
const DELAY_OPTIONS = [1, 2, 3, 4, 6, 8, 12, 24]
const DEFAULT_MSG_1 = 'Oi{nome}! Aqui é {assistente}, da equipe de {nutri}. Ainda consigo garantir um horário pra você — prefere manhã ou tarde?'
const DEFAULT_MSG_2 = 'Oi{nome}! {assistente} aqui 😊 Ainda tenho horários disponíveis com {nutri} essa semana. É só me dizer manhã ou tarde que reservo pra você!'

function TabSemResposta({ assistant, onSave }: { assistant: any; onSave: (data: any) => Promise<void> }) {
  const [enabled, setEnabled] = useState(true)
  const [delay,   setDelay]   = useState(4)
  const [msg1,    setMsg1]    = useState(DEFAULT_MSG_1)
  const [msg2,    setMsg2]    = useState(DEFAULT_MSG_2)
  const [dirty,   setDirty]   = useState(false)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    if (!assistant) return
    setEnabled(assistant.followup_enabled ?? true)
    setDelay(assistant.followup_delay_hours ?? 4)
    setMsg1(assistant.followup_message_1 || DEFAULT_MSG_1)
    setMsg2(assistant.followup_message_2 || DEFAULT_MSG_2)
  }, [assistant])

  async function save() {
    setSaving(true)
    try {
      await onSave({ followup_enabled: enabled, followup_delay_hours: delay, followup_message_1: msg1, followup_message_2: msg2 })
      setDirty(false)
      toast.success('Salvo!')
    } catch { toast.error('Erro ao salvar.') }
    finally { setSaving(false) }
  }

  function mark() { setDirty(true) }

  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: 'var(--t2)' }}>Recontata automaticamente leads que pararam de responder.</p>

      <MiniCard>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--t1)' }}>Ativo</p>
            <p className="text-xs" style={{ color: 'var(--t3)' }}>Recontata automaticamente</p>
          </div>
          <Toggle value={enabled} onChange={v => { setEnabled(v); mark() }} />
        </div>

        {enabled && (
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--t2)' }}>Enviar após quantas horas sem resposta?</p>
            <div className="flex flex-wrap gap-1.5">
              {DELAY_OPTIONS.map(h => (
                <button key={h} type="button"
                  onClick={() => { setDelay(h); mark() }}
                  className="px-3 py-1.5 rounded-lg font-mono text-[11px] transition-all"
                  style={delay === h
                    ? { background: 'var(--brand-s)', border: '1.5px solid var(--brand)', color: 'var(--brand)' }
                    : { border: '1px solid var(--border)', color: 'var(--t2)' }
                  }
                >
                  {h < 24 ? `${h}h` : '1 dia'}
                </button>
              ))}
            </div>
          </div>
        )}
      </MiniCard>

      {enabled && (
        <>
          {[
            { label: '1º toque', sub: `Enviado após ${delay}h de silêncio`, value: msg1, set: setMsg1, def: DEFAULT_MSG_1 },
            { label: '2º toque', sub: `Se o 1º for ignorado (${delay + 20}h depois)`, value: msg2, set: setMsg2, def: DEFAULT_MSG_2 },
          ].map(({ label, sub, value, set, def }) => (
            <MiniCard key={label}>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--t1)' }}>{label}</p>
                <p className="text-xs" style={{ color: 'var(--t3)' }}>{sub}</p>
              </div>
              <VarTags vars={['nome', 'assistente', 'nutri']} />
              <textarea
                value={value}
                onChange={e => { set(e.target.value); mark() }}
                rows={3}
                className="w-full rounded-lg px-3.5 py-3 text-sm resize-none leading-relaxed focus:outline-none"
                style={{ background: 'var(--raised)', border: '1px solid var(--border)', color: 'var(--t1)' }}
              />
              <button
                className="text-[11px] font-mono transition-colors"
                style={{ color: 'var(--t3)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--brand)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--t3)'}
                onClick={() => { set(def); mark() }}
              >
                Restaurar padrão
              </button>
            </MiniCard>
          ))}
        </>
      )}

      <button onClick={save} disabled={saving || !dirty} className="btn-primary">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Salvar
      </button>
    </div>
  )
}

// ── Tab: Como foi a consulta ──────────────────────────────────────
const DEFAULT_FEEDBACK = 'Oi {nome}! Aqui é {assistente} da equipe de {nutri} 😊 Queria saber como foi sua consulta — tudo certo? Alguma dúvida?'

function TabFeedback({ assistant, onSave }: { assistant: any; onSave: (data: any) => Promise<void> }) {
  const [enabled, setEnabled] = useState(false)
  const [hours,   setHours]   = useState(2)
  const [msg,     setMsg]     = useState(DEFAULT_FEEDBACK)
  const [dirty,   setDirty]   = useState(false)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    if (!assistant) return
    setEnabled(assistant.auto_feedback_enabled ?? false)
    setHours(assistant.auto_feedback_delay_hours ?? 2)
    setMsg(assistant.auto_feedback_message || DEFAULT_FEEDBACK)
  }, [assistant])

  async function save() {
    setSaving(true)
    try {
      await onSave({ auto_feedback_enabled: enabled, auto_feedback_delay_hours: hours, auto_feedback_message: msg })
      setDirty(false)
      toast.success('Salvo!')
    } catch { toast.error('Erro ao salvar.') }
    finally { setSaving(false) }
  }

  function mark() { setDirty(true) }
  const HOUR_OPTS = [1, 2, 3, 4, 6, 8, 12, 24]

  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: 'var(--t2)' }}>Mensagem enviada automaticamente após a consulta ser concluída.</p>

      <MiniCard>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--t1)' }}>Ativo</p>
            <p className="text-xs" style={{ color: 'var(--t3)' }}>Envia após marcar consulta como concluída</p>
          </div>
          <Toggle value={enabled} onChange={v => { setEnabled(v); mark() }} />
        </div>

        {enabled && (
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--t2)' }}>Enviar quantas horas após a consulta?</p>
            <div className="flex flex-wrap gap-1.5">
              {HOUR_OPTS.map(h => (
                <button key={h} type="button"
                  onClick={() => { setHours(h); mark() }}
                  className="px-3 py-1.5 rounded-lg font-mono text-[11px] transition-all"
                  style={hours === h
                    ? { background: 'var(--brand-s)', border: '1.5px solid var(--brand)', color: 'var(--brand)' }
                    : { border: '1px solid var(--border)', color: 'var(--t2)' }
                  }
                >
                  {h < 24 ? `${h}h` : '1 dia'}
                </button>
              ))}
            </div>
          </div>
        )}
      </MiniCard>

      {enabled && (
        <MiniCard>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--t1)' }}>Mensagem de feedback</p>
            <p className="text-xs" style={{ color: 'var(--t3)' }}>Enviada {hours}h após a consulta concluída</p>
          </div>
          <VarTags vars={['nome', 'assistente', 'nutri']} />
          <textarea
            value={msg}
            onChange={e => { setMsg(e.target.value); mark() }}
            rows={3}
            className="w-full rounded-lg px-3.5 py-3 text-sm resize-none leading-relaxed focus:outline-none"
            style={{ background: 'var(--raised)', border: '1px solid var(--border)', color: 'var(--t1)' }}
          />
          <button
            className="text-[11px] font-mono transition-colors"
            style={{ color: 'var(--t3)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--brand)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--t3)'}
            onClick={() => { setMsg(DEFAULT_FEEDBACK); mark() }}
          >
            Restaurar padrão
          </button>
        </MiniCard>
      )}

      <button onClick={save} disabled={saving || !dirty} className="btn-primary">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Salvar
      </button>
    </div>
  )
}

// ── Tab: Lembrete de consulta ─────────────────────────────────────
const DEFAULT_REMINDER = 'Olá {nome}! Lembrando da sua consulta com {nutri} amanhã. Qualquer dúvida estou aqui 😊'

function TabLembrete({ assistant, onSave }: { assistant: any; onSave: (data: any) => Promise<void> }) {
  const [enabled, setEnabled] = useState(false)
  const [hours,   setHours]   = useState(24)
  const [msg,     setMsg]     = useState(DEFAULT_REMINDER)
  const [dirty,   setDirty]   = useState(false)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    if (!assistant) return
    setEnabled(assistant.auto_reminder_enabled ?? false)
    setHours(assistant.auto_reminder_hours_before ?? 24)
    setMsg(assistant.auto_reminder_message || DEFAULT_REMINDER)
  }, [assistant])

  async function save() {
    setSaving(true)
    try {
      await onSave({ auto_reminder_enabled: enabled, auto_reminder_hours_before: hours, auto_reminder_message: msg })
      setDirty(false)
      toast.success('Salvo!')
    } catch { toast.error('Erro ao salvar.') }
    finally { setSaving(false) }
  }

  function mark() { setDirty(true) }
  const HOUR_OPTS = [1, 2, 4, 6, 12, 24, 48]

  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: 'var(--t2)' }}>Lembrete enviado automaticamente antes da consulta agendada.</p>

      <MiniCard>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--t1)' }}>Ativo</p>
            <p className="text-xs" style={{ color: 'var(--t3)' }}>Lembrete automático antes da consulta</p>
          </div>
          <Toggle value={enabled} onChange={v => { setEnabled(v); mark() }} />
        </div>

        {enabled && (
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--t2)' }}>Enviar quantas horas antes?</p>
            <div className="flex flex-wrap gap-1.5">
              {HOUR_OPTS.map(h => (
                <button key={h} type="button"
                  onClick={() => { setHours(h); mark() }}
                  className="px-3 py-1.5 rounded-lg font-mono text-[11px] transition-all"
                  style={hours === h
                    ? { background: 'var(--brand-s)', border: '1.5px solid var(--brand)', color: 'var(--brand)' }
                    : { border: '1px solid var(--border)', color: 'var(--t2)' }
                  }
                >
                  {h < 24 ? `${h}h antes` : `${h/24}d antes`}
                </button>
              ))}
            </div>
          </div>
        )}
      </MiniCard>

      {enabled && (
        <MiniCard>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--t1)' }}>Mensagem de lembrete</p>
            <p className="text-xs" style={{ color: 'var(--t3)' }}>Enviada {hours}h antes da consulta</p>
          </div>
          <VarTags vars={['nome', 'assistente', 'nutri', 'data_consulta']} />
          <textarea
            value={msg}
            onChange={e => { setMsg(e.target.value); mark() }}
            rows={3}
            className="w-full rounded-lg px-3.5 py-3 text-sm resize-none leading-relaxed focus:outline-none"
            style={{ background: 'var(--raised)', border: '1px solid var(--border)', color: 'var(--t1)' }}
          />
          <button
            className="text-[11px] font-mono transition-colors"
            style={{ color: 'var(--t3)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--brand)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--t3)'}
            onClick={() => { setMsg(DEFAULT_REMINDER); mark() }}
          >
            Restaurar padrão
          </button>
        </MiniCard>
      )}

      <button onClick={save} disabled={saving || !dirty} className="btn-primary">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Salvar
      </button>
    </div>
  )
}

// ── Tab: Retorno do paciente ──────────────────────────────────────
const DEFAULT_RETURN = 'Oi {nome}! Aqui é {assistente} da equipe de {nutri} 😊 Já faz um tempinho desde a sua última consulta — que tal marcarmos um retorno?'

function TabRetorno({ assistant, onSave }: { assistant: any; onSave: (data: any) => Promise<void> }) {
  const [enabled, setEnabled] = useState(false)
  const [days,    setDays]    = useState(30)
  const [msg,     setMsg]     = useState(DEFAULT_RETURN)
  const [dirty,   setDirty]   = useState(false)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    if (!assistant) return
    setEnabled(assistant.auto_return_enabled ?? false)
    setDays(assistant.auto_return_days ?? 30)
    setMsg(assistant.auto_return_message || DEFAULT_RETURN)
  }, [assistant])

  async function save() {
    setSaving(true)
    try {
      await onSave({ auto_return_enabled: enabled, auto_return_days: days, auto_return_message: msg })
      setDirty(false)
      toast.success('Salvo!')
    } catch { toast.error('Erro ao salvar.') }
    finally { setSaving(false) }
  }

  function mark() { setDirty(true) }
  const DAY_OPTS = [15, 21, 30, 45, 60, 90]

  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: 'var(--t2)' }}>Mensagem enviada quando o paciente não agenda há muito tempo.</p>

      <MiniCard>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--t1)' }}>Ativo</p>
            <p className="text-xs" style={{ color: 'var(--t3)' }}>Reativa pacientes antigos automaticamente</p>
          </div>
          <Toggle value={enabled} onChange={v => { setEnabled(v); mark() }} />
        </div>

        {enabled && (
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--t2)' }}>Enviar após quantos dias sem consulta?</p>
            <div className="flex flex-wrap gap-1.5">
              {DAY_OPTS.map(d => (
                <button key={d} type="button"
                  onClick={() => { setDays(d); mark() }}
                  className="px-3 py-1.5 rounded-lg font-mono text-[11px] transition-all"
                  style={days === d
                    ? { background: 'var(--brand-s)', border: '1.5px solid var(--brand)', color: 'var(--brand)' }
                    : { border: '1px solid var(--border)', color: 'var(--t2)' }
                  }
                >
                  {d} dias
                </button>
              ))}
            </div>
          </div>
        )}
      </MiniCard>

      {enabled && (
        <MiniCard>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--t1)' }}>Mensagem de retorno</p>
            <p className="text-xs" style={{ color: 'var(--t3)' }}>Enviada quando paciente está há {days} dias sem consulta</p>
          </div>
          <VarTags vars={['nome', 'assistente', 'nutri', 'dias_ausente']} />
          <textarea
            value={msg}
            onChange={e => { setMsg(e.target.value); mark() }}
            rows={3}
            className="w-full rounded-lg px-3.5 py-3 text-sm resize-none leading-relaxed focus:outline-none"
            style={{ background: 'var(--raised)', border: '1px solid var(--border)', color: 'var(--t1)' }}
          />
          <button
            className="text-[11px] font-mono transition-colors"
            style={{ color: 'var(--t3)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--brand)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--t3)'}
            onClick={() => { setMsg(DEFAULT_RETURN); mark() }}
          >
            Restaurar padrão
          </button>
        </MiniCard>
      )}

      <button onClick={save} disabled={saving || !dirty} className="btn-primary">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Salvar
      </button>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
const TABS = [
  { id: 'sem_resposta', label: 'Sem resposta',  icon: MessageSquare, desc: 'Reengaja leads parados' },
  { id: 'feedback',     label: 'Pós-consulta',  icon: Star,          desc: 'Como foi o atendimento?' },
  { id: 'lembrete',     label: 'Lembrete',       icon: Bell,          desc: 'Antes da consulta' },
  { id: 'retorno',      label: 'Retorno',        icon: RotateCcw,     desc: 'Reativa pacientes' },
]

export default function AutomacoesPage() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('sem_resposta')

  const { data: assistant, isLoading } = useQuery<any>({
    queryKey: ['assistant'],
    queryFn: async () => { const { data } = await api.get('/api/assistants'); return data.assistant },
  })

  async function handleSave(data: any) {
    await api.post('/api/assistants', { ...assistant, ...data })
    qc.invalidateQueries({ queryKey: ['assistant'] })
  }

  if (isLoading) return (
    <div className="p-6 text-sm" style={{ color: 'var(--t2)' }}>Carregando...</div>
  )

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-bold text-[22px] tracking-tight" style={{ color: 'var(--t1)' }}>Automações</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--t2)' }}>Configure mensagens automáticas para cada etapa da jornada do paciente</p>
      </div>

      <div className="grid md:grid-cols-[1fr_220px] gap-6">
        <div className="space-y-4">
          {/* Tab nav */}
          <div className="grid grid-cols-2 gap-2">
            {TABS.map(({ id, label, icon: Icon, desc }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className="flex items-start gap-3 p-3.5 rounded-xl text-left transition-all"
                style={activeTab === id
                  ? { border: '1.5px solid var(--brand)', background: 'var(--brand-s)' }
                  : { border: '1px solid var(--border)' }
                }
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: activeTab === id ? 'var(--brand-s-solid)' : 'var(--raised)' }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: activeTab === id ? 'var(--brand)' : 'var(--t3)' }} />
                </div>
                <div>
                  <p className="text-[12px] font-semibold" style={{ color: activeTab === id ? 'var(--brand)' : 'var(--t1)' }}>{label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--t3)' }}>{desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'sem_resposta' && <TabSemResposta assistant={assistant} onSave={handleSave} />}
          {activeTab === 'feedback'     && <TabFeedback assistant={assistant} onSave={handleSave} />}
          {activeTab === 'lembrete'     && <TabLembrete assistant={assistant} onSave={handleSave} />}
          {activeTab === 'retorno'      && <TabRetorno assistant={assistant} onSave={handleSave} />}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <AIStatusChecker />
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4" style={{ color: 'var(--brand)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Como funciona</p>
              </div>
              <div className="space-y-2 text-[11px] leading-relaxed" style={{ color: 'var(--t2)' }}>
                <p><span className="font-mono" style={{ color: 'var(--brand)' }}>Sem resposta</span> — Detecta silêncio e reengaja automaticamente</p>
                <p><span className="font-mono" style={{ color: 'var(--brand)' }}>Pós-consulta</span> — Coleta feedback após cada atendimento concluído</p>
                <p><span className="font-mono" style={{ color: 'var(--brand)' }}>Lembrete</span> — Reduz no-shows com aviso automático antes da consulta</p>
                <p><span className="font-mono" style={{ color: 'var(--brand)' }}>Retorno</span> — Reativa pacientes que sumiram depois de um tempo</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
