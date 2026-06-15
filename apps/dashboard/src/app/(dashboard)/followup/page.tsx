'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle, XCircle, AlertCircle, ChevronRight, Loader2, MessageSquare, Mail, Calendar, RotateCcw, type LucideIcon } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { V4Button, V4Card, V4CardPad, V4Metric, V4Page, V4Tag } from '@/components/v4/V4Primitives'

// ── Status checker (configuração da IA) ───────────────────────────
interface StatusItem {
  label: string; ok: boolean; warn?: boolean; detail?: string; href?: string
}

function StatusDot({ ok, warn }: { ok: boolean; warn?: boolean }) {
  if (ok)   return <CheckCircle className="h-4 w-4 shrink-0" style={{ color: 'var(--brand)' }} />
  if (warn) return <AlertCircle className="h-4 w-4 shrink-0" style={{ color: 'var(--warning)' }} />
  return      <XCircle className="h-4 w-4 shrink-0" style={{ color: 'var(--danger)' }} />
}

function AIStatusChecker() {
  const { data: assistant } = useQuery<any>({ queryKey: ['assistant'], queryFn: async () => { const { data } = await api.get('/api/assistants'); return data.assistant } })
  const { data: slots }     = useQuery<any[]>({ queryKey: ['availability'], queryFn: async () => { const { data } = await api.get('/api/nutritionists/availability'); return data } })
  const { data: whatsapp }  = useQuery<any>({ queryKey: ['whatsapp-status'], queryFn: async () => { const { data } = await api.get('/api/whatsapp/status'); return data } })
  const { data: services }  = useQuery<any[]>({ queryKey: ['services'], queryFn: async () => { const { data } = await api.get('/api/services'); return data.services } })
  if (!assistant) return null
  const checks: StatusItem[] = [
    { label: 'Nome da assistente', ok: !!assistant?.name, detail: assistant?.name || 'Não configurado', href: '/treinamento' },
    { label: 'Serviços e valores', ok: (services?.length ?? 0) > 0 || !!assistant?.service_plans, detail: (services?.length ?? 0) > 0 ? `${services!.length} serviço(s)` : 'Não configurado', warn: (services?.length ?? 0) === 0, href: '/servicos' },
    { label: 'Horários disponíveis', ok: (slots?.length ?? 0) > 0, detail: (slots?.length ?? 0) > 0 ? `${slots!.length} faixa(s)` : 'Não configurado', href: '/disponibilidade' },
    { label: 'WhatsApp conectado', ok: whatsapp?.status === 'connected', detail: whatsapp?.status === 'connected' ? 'Conectado' : 'Desconectado', href: '/integracoes' },
  ]
  const score = checks.filter(c => c.ok).length
  return (
    <V4CardPad>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[13px] font-medium text-t1">Configuração da IA</p>
        <span
          className="font-mono text-[16px] font-medium tabular-nums"
          style={{ color: score === checks.length ? 'var(--brand)' : score >= 2 ? 'var(--warning)' : 'var(--danger)' }}
        >
          {score}/{checks.length}
        </span>
      </div>
      <div className="space-y-2">
        {checks.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <StatusDot ok={item.ok} warn={item.warn} />
            <p className="flex-1 text-[12px] text-t2">{item.label}</p>
            {!item.ok && item.href && (
              <a href={item.href} className="text-t3">
                <ChevronRight className="h-3 w-3" />
              </a>
            )}
          </div>
        ))}
      </div>
    </V4CardPad>
  )
}

// ── Toggle ────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="relative h-[22px] w-10 shrink-0 rounded-full transition-colors"
      style={{
        background: value ? 'var(--brand)' : 'var(--raised)',
        border: value ? 'none' : '1px solid var(--border)',
      }}
    >
      <span
        className="absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform"
        style={{ left: value ? '20px' : '2px' }}
      />
    </button>
  )
}

// ── Tags de variáveis ─────────────────────────────────────────────
function VarTags({ vars }: { vars: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-mono text-t3">Variáveis:</span>
      {vars.map(v => (
        <span key={v} className="rounded px-1.5 py-0.5 font-mono text-[10px]" style={{ background: 'var(--brand-s)', color: 'var(--brand)' }}>
          {`{${v}}`}
        </span>
      ))}
    </div>
  )
}

// ── Indicador de status ────────────────────────────────────────────
function FlowStatusDot({ active }: { active: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-t2">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: active ? 'var(--brand)' : 'var(--t3)', boxShadow: active ? '0 0 6px var(--brand)' : 'none' }} />
      {active ? 'Ativo · automático' : 'Pausado'}
    </span>
  )
}

// ── Pills de opção (delay/horas/dias) ─────────────────────────────
function OptionPills({ options, value, onChange, format }: {
  options: number[]; value: number; onChange: (v: number) => void; format: (v: number) => string
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            'rounded-lg px-3 py-1.5 font-mono text-[11px] transition-all',
            value === o ? 'border-[1.5px] border-[var(--brand)] bg-[var(--brand-s)] text-[var(--brand)]' : 'border border-[var(--border)] text-t2',
          )}
        >
          {format(o)}
        </button>
      ))}
    </div>
  )
}

// ── Shell do auto-card ────────────────────────────────────────────
function AutoCard({ icon: Icon, iconColor, trigger, title, desc, enabled, onToggle, expanded, onEdit, children }: {
  icon: LucideIcon
  iconColor: string
  trigger: string; title: string; desc: string
  enabled: boolean; onToggle: (v: boolean) => void
  expanded: boolean; onEdit: () => void
  children?: React.ReactNode
}) {
  return (
    <V4CardPad className={enabled ? '' : 'opacity-75'}>
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--raised)]" style={{ color: iconColor }}>
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] font-medium text-t1">{title}</p>
            <V4Tag>{trigger}</V4Tag>
          </div>
          <p className="mt-0.5 text-[12px] leading-relaxed text-t3">{desc}</p>
        </div>
        <Toggle value={enabled} onChange={onToggle} />
      </div>

      <div className="mt-3 flex items-center gap-2.5 border-t border-[var(--border)] pt-2.5">
        <FlowStatusDot active={enabled} />
        <V4Button className="ml-auto h-8 px-3" onClick={onEdit}>
          {expanded ? 'Fechar' : 'Editar'}
        </V4Button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3.5 border-t border-[var(--border)] pt-3">
          {children}
        </div>
      )}
    </V4CardPad>
  )
}

function SaveBar({ saving, dirty, onSave }: { saving: boolean; dirty: boolean; onSave: () => void }) {
  return (
    <V4Button variant="primary" className="h-8 px-3" onClick={onSave} disabled={saving || !dirty}>
      {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      Salvar
    </V4Button>
  )
}

function ResetBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="font-mono text-[11px] text-t3 transition-colors hover:text-t1" onClick={onClick}>
      Restaurar padrão
    </button>
  )
}

// ── Defaults ──────────────────────────────────────────────────────
const DELAY_OPTIONS = [1, 2, 3, 4, 6, 8, 12, 24]
const DEFAULT_MSG_1 = 'Oi{nome}! Aqui é {assistente}, da equipe de {nutri}. Ainda consigo garantir um horário pra você — prefere manhã ou tarde?'
const DEFAULT_MSG_2 = 'Oi{nome}! {assistente} aqui 😊 Ainda tenho horários disponíveis com {nutri} essa semana. É só me dizer manhã ou tarde que reservo pra você!'
const DEFAULT_FEEDBACK = 'Oi {nome}! Aqui é {assistente} da equipe de {nutri} 😊 Queria saber como foi sua consulta — tudo certo? Alguma dúvida?'
const DEFAULT_REMINDER = 'Olá {nome}! Lembrando da sua consulta com {nutri} amanhã. Qualquer dúvida estou aqui 😊'
const DEFAULT_RETURN = 'Oi {nome}! Aqui é {assistente} da equipe de {nutri} 😊 Já faz um tempinho desde a sua última consulta — que tal marcarmos um retorno?'

const taStyle = { background: 'var(--raised)', border: '1px solid var(--border)', color: 'var(--t1)' } as const
const taClass = 'w-full rounded-lg px-3.5 py-3 text-sm resize-none leading-relaxed focus:outline-none'

// ── Card: Sem resposta ────────────────────────────────────────────
function SemRespostaCard({ assistant, onSave, expanded, onEdit }: {
  assistant: any; onSave: (data: any) => Promise<void>; expanded: boolean; onEdit: () => void
}) {
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

  async function toggle(v: boolean) {
    setEnabled(v)
    try { await onSave({ followup_enabled: v }) } catch { toast.error('Erro ao salvar.') }
  }

  async function save() {
    setSaving(true)
    try {
      await onSave({ followup_enabled: enabled, followup_delay_hours: delay, followup_message_1: msg1, followup_message_2: msg2 })
      setDirty(false)
      toast.success('Salvo!')
    } catch { toast.error('Erro ao salvar.') }
    finally { setSaving(false) }
  }

  return (
    <AutoCard
      icon={MessageSquare}
      iconColor="var(--brand)"
      trigger={`${delay}h sem resposta`}
      title="Sem resposta"
      desc="Recontata automaticamente leads que pararam de responder, com até 2 toques."
      enabled={enabled}
      onToggle={toggle}
      expanded={expanded}
      onEdit={onEdit}
    >
      <div>
        <p className="mb-2 text-xs font-medium text-t2">Enviar após quantas horas sem resposta?</p>
        <OptionPills options={DELAY_OPTIONS} value={delay} onChange={v => { setDelay(v); setDirty(true) }} format={h => h < 24 ? `${h}h` : '1 dia'} />
      </div>

      <div>
        <p className="text-xs font-medium text-t1">1º toque</p>
        <p className="mb-1.5 text-[11px] text-t3">Enviado após {delay}h de silêncio</p>
        <textarea value={msg1} onChange={e => { setMsg1(e.target.value); setDirty(true) }} rows={3} className={taClass} style={taStyle} />
        <div className="mt-1 flex items-center justify-between">
          <VarTags vars={['nome', 'assistente', 'nutri']} />
          <ResetBtn onClick={() => { setMsg1(DEFAULT_MSG_1); setDirty(true) }} />
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-t1">2º toque</p>
        <p className="mb-1.5 text-[11px] text-t3">Se o 1º for ignorado ({delay + 20}h depois)</p>
        <textarea value={msg2} onChange={e => { setMsg2(e.target.value); setDirty(true) }} rows={3} className={taClass} style={taStyle} />
        <div className="mt-1 flex items-center justify-between">
          <VarTags vars={['nome', 'assistente', 'nutri']} />
          <ResetBtn onClick={() => { setMsg2(DEFAULT_MSG_2); setDirty(true) }} />
        </div>
      </div>

      <SaveBar saving={saving} dirty={dirty} onSave={save} />
    </AutoCard>
  )
}

// ── Card: Pós-consulta ────────────────────────────────────────────
function FeedbackCard({ assistant, onSave, expanded, onEdit }: {
  assistant: any; onSave: (data: any) => Promise<void>; expanded: boolean; onEdit: () => void
}) {
  const [enabled, setEnabled] = useState(false)
  const [hours,   setHours]   = useState(2)
  const [msg,     setMsg]     = useState(DEFAULT_FEEDBACK)
  const [dirty,   setDirty]   = useState(false)
  const [saving,  setSaving]  = useState(false)
  const HOUR_OPTS = [1, 2, 3, 4, 6, 8, 12, 24]

  useEffect(() => {
    if (!assistant) return
    setEnabled(assistant.auto_feedback_enabled ?? false)
    setHours(assistant.auto_feedback_delay_hours ?? 2)
    setMsg(assistant.auto_feedback_message || DEFAULT_FEEDBACK)
  }, [assistant])

  async function toggle(v: boolean) {
    setEnabled(v)
    try { await onSave({ auto_feedback_enabled: v }) } catch { toast.error('Erro ao salvar.') }
  }

  async function save() {
    setSaving(true)
    try {
      await onSave({ auto_feedback_enabled: enabled, auto_feedback_delay_hours: hours, auto_feedback_message: msg })
      setDirty(false)
      toast.success('Salvo!')
    } catch { toast.error('Erro ao salvar.') }
    finally { setSaving(false) }
  }

  return (
    <AutoCard
      icon={Mail}
      iconColor="#B69CFF"
      trigger="Após a consulta"
      title="Pós-consulta"
      desc="Coleta feedback do paciente automaticamente após cada atendimento concluído."
      enabled={enabled}
      onToggle={toggle}
      expanded={expanded}
      onEdit={onEdit}
    >
      <div>
        <p className="mb-2 text-xs font-medium text-t2">Enviar quantas horas após a consulta?</p>
        <OptionPills options={HOUR_OPTS} value={hours} onChange={v => { setHours(v); setDirty(true) }} format={h => h < 24 ? `${h}h` : '1 dia'} />
      </div>

      <div>
        <p className="text-xs font-medium text-t1">Mensagem de feedback</p>
        <p className="mb-1.5 text-[11px] text-t3">Enviada {hours}h após a consulta concluída</p>
        <textarea value={msg} onChange={e => { setMsg(e.target.value); setDirty(true) }} rows={3} className={taClass} style={taStyle} />
        <div className="mt-1 flex items-center justify-between">
          <VarTags vars={['nome', 'assistente', 'nutri']} />
          <ResetBtn onClick={() => { setMsg(DEFAULT_FEEDBACK); setDirty(true) }} />
        </div>
      </div>

      <SaveBar saving={saving} dirty={dirty} onSave={save} />
    </AutoCard>
  )
}

// ── Card: Lembrete ────────────────────────────────────────────────
function LembreteCard({ assistant, onSave, expanded, onEdit }: {
  assistant: any; onSave: (data: any) => Promise<void>; expanded: boolean; onEdit: () => void
}) {
  const [enabled, setEnabled] = useState(false)
  const [hours,   setHours]   = useState(24)
  const [msg,     setMsg]     = useState(DEFAULT_REMINDER)
  const [dirty,   setDirty]   = useState(false)
  const [saving,  setSaving]  = useState(false)
  const HOUR_OPTS = [1, 2, 4, 6, 12, 24, 48]

  useEffect(() => {
    if (!assistant) return
    setEnabled(assistant.auto_reminder_enabled ?? false)
    setHours(assistant.auto_reminder_hours_before ?? 24)
    setMsg(assistant.auto_reminder_message || DEFAULT_REMINDER)
  }, [assistant])

  async function toggle(v: boolean) {
    setEnabled(v)
    try { await onSave({ auto_reminder_enabled: v }) } catch { toast.error('Erro ao salvar.') }
  }

  async function save() {
    setSaving(true)
    try {
      await onSave({ auto_reminder_enabled: enabled, auto_reminder_hours_before: hours, auto_reminder_message: msg })
      setDirty(false)
      toast.success('Salvo!')
    } catch { toast.error('Erro ao salvar.') }
    finally { setSaving(false) }
  }

  return (
    <AutoCard
      icon={Calendar}
      iconColor="#6AA9FF"
      trigger={`${hours < 24 ? `${hours}h` : `${hours / 24} dia(s)`} antes da consulta`}
      title="Lembrete"
      desc="Reduz faltas com lembrete automático antes da consulta agendada."
      enabled={enabled}
      onToggle={toggle}
      expanded={expanded}
      onEdit={onEdit}
    >
      <div>
        <p className="mb-2 text-xs font-medium text-t2">Enviar quantas horas antes?</p>
        <OptionPills options={HOUR_OPTS} value={hours} onChange={v => { setHours(v); setDirty(true) }} format={h => h < 24 ? `${h}h antes` : `${h / 24}d antes`} />
      </div>

      <div>
        <p className="text-xs font-medium text-t1">Mensagem de lembrete</p>
        <p className="mb-1.5 text-[11px] text-t3">Enviada {hours}h antes da consulta</p>
        <textarea value={msg} onChange={e => { setMsg(e.target.value); setDirty(true) }} rows={3} className={taClass} style={taStyle} />
        <div className="mt-1 flex items-center justify-between">
          <VarTags vars={['nome', 'assistente', 'nutri', 'data_consulta']} />
          <ResetBtn onClick={() => { setMsg(DEFAULT_REMINDER); setDirty(true) }} />
        </div>
      </div>

      <SaveBar saving={saving} dirty={dirty} onSave={save} />
    </AutoCard>
  )
}

// ── Card: Retorno ─────────────────────────────────────────────────
function RetornoCard({ assistant, onSave, expanded, onEdit }: {
  assistant: any; onSave: (data: any) => Promise<void>; expanded: boolean; onEdit: () => void
}) {
  const [enabled, setEnabled] = useState(false)
  const [days,    setDays]    = useState(30)
  const [msg,     setMsg]     = useState(DEFAULT_RETURN)
  const [dirty,   setDirty]   = useState(false)
  const [saving,  setSaving]  = useState(false)
  const DAY_OPTS = [15, 21, 30, 45, 60, 90]

  useEffect(() => {
    if (!assistant) return
    setEnabled(assistant.auto_return_enabled ?? false)
    setDays(assistant.auto_return_days ?? 30)
    setMsg(assistant.auto_return_message || DEFAULT_RETURN)
  }, [assistant])

  async function toggle(v: boolean) {
    setEnabled(v)
    try { await onSave({ auto_return_enabled: v }) } catch { toast.error('Erro ao salvar.') }
  }

  async function save() {
    setSaving(true)
    try {
      await onSave({ auto_return_enabled: enabled, auto_return_days: days, auto_return_message: msg })
      setDirty(false)
      toast.success('Salvo!')
    } catch { toast.error('Erro ao salvar.') }
    finally { setSaving(false) }
  }

  return (
    <AutoCard
      icon={RotateCcw}
      iconColor="#FFB454"
      trigger={`Paciente inativo há ${days}+ dias`}
      title="Retorno"
      desc="Reativa pacientes que não agendam há muito tempo com um convite de retorno."
      enabled={enabled}
      onToggle={toggle}
      expanded={expanded}
      onEdit={onEdit}
    >
      <div>
        <p className="mb-2 text-xs font-medium text-t2">Enviar após quantos dias sem consulta?</p>
        <OptionPills options={DAY_OPTS} value={days} onChange={v => { setDays(v); setDirty(true) }} format={d => `${d} dias`} />
      </div>

      <div>
        <p className="text-xs font-medium text-t1">Mensagem de retorno</p>
        <p className="mb-1.5 text-[11px] text-t3">Enviada quando o paciente está há {days} dias sem consulta</p>
        <textarea value={msg} onChange={e => { setMsg(e.target.value); setDirty(true) }} rows={3} className={taClass} style={taStyle} />
        <div className="mt-1 flex items-center justify-between">
          <VarTags vars={['nome', 'assistente', 'nutri', 'dias_ausente']} />
          <ResetBtn onClick={() => { setMsg(DEFAULT_RETURN); setDirty(true) }} />
        </div>
      </div>

      <SaveBar saving={saving} dirty={dirty} onSave={save} />
    </AutoCard>
  )
}

// ── Página ────────────────────────────────────────────────────────
const FLOWS = [
  { key: 'followup_enabled',      def: true,  label: 'Sem resposta',  icon: MessageSquare, color: 'var(--brand)' },
  { key: 'auto_feedback_enabled', def: false, label: 'Pós-consulta',  icon: Mail,          color: '#B69CFF' },
  { key: 'auto_reminder_enabled', def: false, label: 'Lembrete',      icon: Calendar,      color: '#6AA9FF' },
  { key: 'auto_return_enabled',   def: false, label: 'Retorno',       icon: RotateCcw,     color: '#FFB454' },
] as const

const FLOW_FILTERS: { key: 'all' | 'active' | 'paused'; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'Ativos' },
  { key: 'paused', label: 'Pausados' },
]

export default function AutomacoesPage() {
  const qc = useQueryClient()
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [flowFilter, setFlowFilter] = useState<'all' | 'active' | 'paused'>('all')

  const { data: assistant, isLoading } = useQuery<any>({
    queryKey: ['assistant'],
    queryFn: async () => { const { data } = await api.get('/api/assistants'); return data.assistant },
  })

  async function handleSave(data: any) {
    await api.post('/api/assistants', { ...assistant, ...data })
    qc.invalidateQueries({ queryKey: ['assistant'] })
  }

  const activeCount = FLOWS.filter(f => (assistant?.[f.key] ?? f.def)).length

  function toggleExpand(id: string) {
    setExpandedCard(prev => prev === id ? null : id)
  }

  const visibleFlows = FLOWS.filter(f => {
    const on = assistant?.[f.key] ?? f.def
    if (flowFilter === 'active') return on
    if (flowFilter === 'paused') return !on
    return true
  })

  return (
    <V4Page
      eyebrow="Operação automática"
      title="Automações"
      subtitle="Fluxos de atendimento automático via WhatsApp, executados pela IA."
    >
      {isLoading ? (
        <div className="py-12 text-center text-[13px] text-t3">Carregando…</div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <V4Metric label="Fluxos ativos" value={activeCount} foot={`${FLOWS.length} configurados`} tone="good" />
            <V4Metric label="Execuções (7d)" value="—" foot="aguardando eventos reais" />
            <V4Metric label="Conversão média" value="—" foot="sem dados suficientes" />
            <V4Metric label="Tempo economizado" value={`${activeCount * 4}h`} foot="estimativa operacional" tone="good" />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_340px]">
            <div className="space-y-3">
              <V4Card className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] p-4">
                  <div>
                    <div className="text-[14px] font-medium text-t1">Todos os fluxos</div>
                    <div className="mt-0.5 text-[12px] text-t3">
                      {FLOWS.length} fluxos · {activeCount} ativo(s) · {FLOWS.length - activeCount} pausado(s)
                    </div>
                  </div>
                  <div className="flex items-center gap-1 rounded-lg bg-[var(--raised)] p-0.5">
                    {FLOW_FILTERS.map(f => (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setFlowFilter(f.key)}
                        className={cn('rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors', flowFilter === f.key ? 'bg-[var(--surface)] text-t1' : 'text-t3')}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-2 text-[10.5px] font-medium uppercase tracking-wide text-t3">
                  <span className="flex-1">Fluxo</span>
                  <span className="w-20 text-right">Execuções</span>
                  <span className="w-20 text-right">Conversão</span>
                  <span className="w-28 text-right">Status</span>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {visibleFlows.map(f => {
                    const on = assistant?.[f.key] ?? f.def
                    const Icon = f.icon
                    return (
                      <div key={f.key} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--raised)]" style={{ color: f.color }}>
                            <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                          </div>
                          <p className="text-[13px] text-t1">{f.label}</p>
                        </div>
                        <span className="w-20 text-right text-[12px] text-t3">—</span>
                        <span className="w-20 text-right text-[12px] text-t3">—</span>
                        <button
                          type="button"
                          className="flex w-28 justify-end"
                          onClick={() => handleSave({ [f.key]: !on })}
                          title="Clique para alternar"
                        >
                          <V4Tag tone={on ? 'green' : 'default'} dot>{on ? 'Ativo' : 'Pausado'}</V4Tag>
                        </button>
                      </div>
                    )
                  })}
                  {visibleFlows.length === 0 && (
                    <div className="px-4 py-6 text-center text-[12px] text-t3">
                      Nenhum fluxo {flowFilter === 'active' ? 'ativo' : 'pausado'}.
                    </div>
                  )}
                </div>
              </V4Card>

              <SemRespostaCard assistant={assistant} onSave={handleSave} expanded={expandedCard === 'sem_resposta'} onEdit={() => toggleExpand('sem_resposta')} />
              <FeedbackCard    assistant={assistant} onSave={handleSave} expanded={expandedCard === 'feedback'}     onEdit={() => toggleExpand('feedback')} />
              <LembreteCard    assistant={assistant} onSave={handleSave} expanded={expandedCard === 'lembrete'}     onEdit={() => toggleExpand('lembrete')} />
              <RetornoCard     assistant={assistant} onSave={handleSave} expanded={expandedCard === 'retorno'}      onEdit={() => toggleExpand('retorno')} />
            </div>

            <aside className="space-y-4">
              <V4CardPad>
                <p className="text-[14px] font-medium text-t1">Como funciona</p>
                <p className="mb-4 mt-0.5 text-[12px] text-t3">Os fluxos são executados automaticamente pela IA via WhatsApp.</p>
                <div className="space-y-3.5">
                  {[
                    { n: 1, title: 'Gatilho detectado', desc: 'O sistema monitora eventos como consultas, silêncio do paciente e retorno.' },
                    { n: 2, title: 'IA envia mensagem', desc: 'A assistente envia automaticamente pelo WhatsApp com o tom configurado.' },
                    { n: 3, title: 'Você é notificada', desc: 'Recebe alerta quando o paciente responde ou quando precisa de atenção especial.' },
                  ].map(step => (
                    <div key={step.n} className="flex gap-3">
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full" style={{ background: 'var(--brand-s)' }}>
                        <span className="text-[13px] font-medium text-[var(--brand)]">{step.n}</span>
                      </div>
                      <div>
                        <p className="text-[12px] font-medium text-t1">{step.title}</p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-t3">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </V4CardPad>

              <AIStatusChecker />

              <div className="rounded-xl border border-[var(--info)]/15 bg-[var(--info)]/5 px-3.5 py-3 text-[11px] leading-relaxed text-t2">
                💡 Os fluxos usam <strong className="text-t1">n8n</strong> como motor de automação. Para editar os gatilhos avançados, acesse o painel n8n.
              </div>
            </aside>
          </section>
        </>
      )}
    </V4Page>
  )
}
