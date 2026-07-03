'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle, XCircle, AlertCircle, ChevronRight, Loader2, MessageSquare, Mail, Calendar, RotateCcw, MoreHorizontal, Pause, Play, Zap, type LucideIcon } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { Btn, Badge, Card, Toggle } from '@/components/ui/finance-primitives'

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
    <Card className="!p-4">
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
    </Card>
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
    <Card className={cn('!p-4', !enabled && 'opacity-75')}>
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--raised)]" style={{ color: iconColor }}>
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] font-medium text-t1">{title}</p>
            <Badge>{trigger}</Badge>
          </div>
          <p className="mt-0.5 text-[12px] leading-relaxed text-t3">{desc}</p>
        </div>
        <Toggle checked={enabled} onChange={onToggle} size="md" />
      </div>

      <div className="mt-3 flex items-center gap-2.5 border-t border-[var(--border)] pt-2.5">
        <FlowStatusDot active={enabled} />
        <Btn variant="secondary" size="sm" className="ml-auto" onClick={onEdit}>
          {expanded ? 'Fechar' : 'Editar'}
        </Btn>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3.5 border-t border-[var(--border)] pt-3">
          {children}
        </div>
      )}
    </Card>
  )
}

function SaveBar({ saving, dirty, onSave }: { saving: boolean; dirty: boolean; onSave: () => void }) {
  return (
    <Btn variant="primary" size="md" className="h-8 px-3" onClick={onSave} disabled={saving || !dirty}>
      {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      Salvar
    </Btn>
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

  const FLOW_ROWS = [
    { key: 'followup_enabled',      def: true,  label: 'Sem resposta',  desc: 'Retoma a conversa após horas sem retorno.', trigger: `${assistant?.followup_delay_hours ?? 4}h sem resposta`, icon: MessageSquare, color: 'var(--brand)',     cardId: 'sem_resposta' },
    { key: 'auto_feedback_enabled', def: false, label: 'Pós-consulta',  desc: 'Coleta feedback após cada atendimento.',     trigger: `${assistant?.auto_feedback_delay_hours ?? 2}h após a consulta`, icon: Mail,          color: '#B69CFF',       cardId: 'feedback'     },
    { key: 'auto_reminder_enabled', def: false, label: 'Lembrete',      desc: 'Envia data, horário e modalidade no mesmo dia.', trigger: `${assistant?.auto_reminder_hours_before ?? 24}h antes da consulta`, icon: Calendar,      color: '#6AA9FF',       cardId: 'lembrete'     },
    { key: 'auto_return_enabled',   def: false, label: 'Retorno',       desc: 'Convida pacientes inativos a retornar.',    trigger: `${assistant?.auto_return_days ?? 45} dias sem consulta`, icon: RotateCcw,     color: '#FFB454',       cardId: 'retorno'      },
  ] as const

  const visibleFlows = FLOWS.filter(f => {
    const on = assistant?.[f.key] ?? f.def
    if (flowFilter === 'active') return on
    if (flowFilter === 'paused') return !on
    return true
  })

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-6">
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-1">Automações</h1>
          <p className="mt-1 text-[13px] text-3">Fluxos disparados automaticamente via WhatsApp</p>
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="secondary" size="sm">Templates</Btn>
          <Btn variant="primary" size="sm">
            <span className="text-[16px] leading-none">+</span> Nova automação
          </Btn>
        </div>
      </div>

      {/* KPI row */}
      <div
        className="mb-6 grid grid-cols-2 overflow-hidden rounded-2xl lg:grid-cols-4"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line-1)', boxShadow: 'var(--shadow-sm)' }}
      >
        {[
          { label: 'Fluxos ativos', value: String(activeCount), hint: 'Operando normalmente' },
          { label: 'Execuções (7d)', value: '—', hint: 'aguardando rastreamento' },
          { label: 'Conversão média', value: '—', hint: 'sem dados suficientes' },
          { label: 'Tempo economizado', value: '—', hint: 'esta semana' },
        ].map((s, i) => (
          <div key={s.label} className="p-6" style={{ borderLeft: i > 0 ? '1px solid var(--line-1)' : 'none' }}>
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-3">{s.label}</div>
            <div className="mt-2 tabular-nums text-[24px] font-semibold tracking-tight text-1">{s.value}</div>
            {s.hint && <div className="mt-0.5 text-[11.5px] text-3">{s.hint}</div>}
          </div>
        ))}
      </div>

      {/* Flows table */}
      <div
        className="mb-6 overflow-hidden rounded-2xl"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line-1)' }}
      >
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
          style={{ borderBottom: '1px solid var(--line-1)' }}
        >
          <div>
            <h2 className="text-[13px] font-semibold text-1">Todos os fluxos</h2>
            <p className="mt-0.5 text-[11.5px] text-3">{FLOWS.length} fluxos · {activeCount} ativo{activeCount !== 1 ? 's' : ''} · {FLOWS.length - activeCount} pausado{FLOWS.length - activeCount !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-1">
            {FLOW_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFlowFilter(f.key)}
                className="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors"
                style={{
                  background: flowFilter === f.key ? 'var(--bg-surface)' : 'transparent',
                  color: flowFilter === f.key ? 'var(--text-1)' : 'var(--text-3)',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y" style={{ '--tw-divide-color': 'var(--line-1)' } as any}>
          {isLoading && (
            <div className="flex justify-center py-10 text-3">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {!isLoading && visibleFlows.map(f => {
            const row = FLOW_ROWS.find(r => r.key === f.key)!
            const on = assistant?.[f.key] ?? f.def
            const Icon = f.icon
            const isExpanded = expandedCard === row.cardId
            return (
              <div key={f.key}>
                <div
                  className="group flex cursor-pointer items-center gap-4 px-5 py-3.5 transition-colors"
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, white 2%, transparent)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <div
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                    style={{ background: 'var(--bg-surface)', color: f.color }}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13.5px] font-medium text-1">{f.label}</span>
                      <Badge>{row.trigger}</Badge>
                    </div>
                    <div className="truncate text-[12px] text-3">{row.desc}</div>
                  </div>
                  <div className="hidden w-24 md:block">
                    <div className="text-[11px] text-3">Execuções</div>
                    <div className="text-[13px] font-semibold text-1">—</div>
                  </div>
                  <div className="hidden w-24 md:block">
                    <div className="text-[11px] text-3">Conversão</div>
                    <div className="text-[13px] font-semibold text-1">—</div>
                  </div>
                  <div className="w-24">
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-2">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: on ? 'var(--brand)' : 'var(--text-3)', boxShadow: on ? '0 0 6px var(--brand)' : 'none' }}
                      />
                      {on ? 'Ativo' : 'Pausado'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      className="grid h-7 w-7 place-items-center rounded-md text-2 hover:bg-[var(--bg-surface)] hover:text-1 transition-colors"
                      onClick={() => handleSave({ [f.key]: !on })}
                    >
                      {on ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      className="grid h-7 w-7 place-items-center rounded-md text-2 hover:bg-[var(--bg-surface)] hover:text-1 transition-colors"
                      onClick={() => setExpandedCard(expandedCard === row.cardId ? null : row.cardId)}
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div
                    className="px-5 py-4"
                    style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--line-1)' }}
                  >
                    {row.cardId === 'sem_resposta' && <SemRespostaCard assistant={assistant} onSave={handleSave} expanded onEdit={() => setExpandedCard(null)} />}
                    {row.cardId === 'feedback'     && <FeedbackCard    assistant={assistant} onSave={handleSave} expanded onEdit={() => setExpandedCard(null)} />}
                    {row.cardId === 'lembrete'     && <LembreteCard    assistant={assistant} onSave={handleSave} expanded onEdit={() => setExpandedCard(null)} />}
                    {row.cardId === 'retorno'      && <RetornoCard     assistant={assistant} onSave={handleSave} expanded onEdit={() => setExpandedCard(null)} />}
                  </div>
                )}
              </div>
            )
          })}
          {!isLoading && visibleFlows.length === 0 && (
            <div className="px-5 py-8 text-center text-[12px] text-3">
              Nenhum fluxo {flowFilter === 'active' ? 'ativo' : 'pausado'}.
            </div>
          )}
        </div>
      </div>

      {/* Template cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[
          { t: 'Lead → Consulta', d: 'Qualifica WhatsApp em 4 mensagens', c: 'var(--brand)' },
          { t: 'Carrinho abandonado', d: 'Recupera vendas em até 24h', c: '#6AA9FF' },
          { t: 'Reativação inteligente', d: 'IA segmenta e personaliza copy', c: '#B69CFF' },
        ].map(tmpl => (
          <div
            key={tmpl.t}
            className="flex items-start gap-3 rounded-2xl p-5"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line-1)' }}
          >
            <div
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
              style={{ background: 'var(--bg-surface)', color: tmpl.c }}
            >
              <Zap className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-1">{tmpl.t}</div>
              <div className="mt-0.5 text-[11.5px] text-3">{tmpl.d}</div>
            </div>
            <Btn variant="outline" size="sm">Usar</Btn>
          </div>
        ))}
      </div>
    </div>
  )
}
