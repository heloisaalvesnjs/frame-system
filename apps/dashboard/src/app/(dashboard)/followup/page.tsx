'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle, XCircle, AlertCircle, ChevronRight, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import { Card, Badge, Btn } from '@/components/ui/finance-primitives'

// ── Status checker (configuração da IA) ───────────────────────────
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
    <Card className="!p-[18px]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Configuração da IA</p>
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
    </Card>
  )
}

// ── Toggle ────────────────────────────────────────────────────────
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

// ── Tag de status ─────────────────────────────────────────────────
function FlowTag({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? 'success' : 'default'}>
      {active ? 'Ativa' : 'Inativa'}
    </Badge>
  )
}

// ── Pills de opção (delay/horas/dias) ─────────────────────────────
function OptionPills({ options, value, onChange, format }: {
  options: number[]; value: number; onChange: (v: number) => void; format: (v: number) => string
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => (
        <button key={o} type="button"
          onClick={() => onChange(o)}
          className="px-3 py-1.5 rounded-lg font-mono text-[11px] transition-all"
          style={value === o
            ? { background: 'var(--brand-s)', border: '1.5px solid var(--brand)', color: 'var(--brand)' }
            : { border: '1px solid var(--border)', color: 'var(--t2)' }
          }
        >
          {format(o)}
        </button>
      ))}
    </div>
  )
}

// ── Shell do auto-card ────────────────────────────────────────────
function AutoCard({ trigger, title, desc, enabled, onToggle, expanded, onEdit, children }: {
  trigger: string; title: string; desc: string
  enabled: boolean; onToggle: (v: boolean) => void
  expanded: boolean; onEdit: () => void
  children?: React.ReactNode
}) {
  return (
    <div className="card" style={{ padding: '16px 18px', opacity: enabled ? 1 : 0.75 }}>
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-mono mb-1" style={{ color: 'var(--t3)' }}>Gatilho: {trigger}</p>
          <p className="text-sm font-bold" style={{ color: 'var(--t1)' }}>{title}</p>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--t2)' }}>{desc}</p>
        </div>
        <Toggle value={enabled} onChange={onToggle} />
      </div>

      <div className="flex items-center gap-2.5 mt-3 pt-2.5" style={{ borderTop: '1px solid var(--border)' }}>
        <FlowTag active={enabled} />
        <span className="text-[11px]" style={{ color: 'var(--t3)' }}>
          {enabled ? 'Executada automaticamente pela IA' : 'Fluxo pausado'}
        </span>
        <Btn variant="secondary" size="sm" onClick={onEdit} className="ml-auto">
          {expanded ? 'Fechar' : 'Editar'}
        </Btn>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 space-y-3.5" style={{ borderTop: '1px solid var(--border)' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function SaveBar({ saving, dirty, onSave }: { saving: boolean; dirty: boolean; onSave: () => void }) {
  return (
    <Btn size="sm" onClick={onSave} disabled={saving || !dirty}>
      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      Salvar
    </Btn>
  )
}

function ResetBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="text-[11px] font-mono transition-colors"
      style={{ color: 'var(--t3)' }}
      onClick={onClick}
    >
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
      trigger={`${delay}h sem resposta`}
      title="Sem resposta"
      desc="Recontata automaticamente leads que pararam de responder, com até 2 toques."
      enabled={enabled}
      onToggle={toggle}
      expanded={expanded}
      onEdit={onEdit}
    >
      <div>
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--t2)' }}>Enviar após quantas horas sem resposta?</p>
        <OptionPills options={DELAY_OPTIONS} value={delay} onChange={v => { setDelay(v); setDirty(true) }} format={h => h < 24 ? `${h}h` : '1 dia'} />
      </div>

      <div>
        <p className="text-xs font-medium" style={{ color: 'var(--t1)' }}>1º toque</p>
        <p className="text-[11px] mb-1.5" style={{ color: 'var(--t3)' }}>Enviado após {delay}h de silêncio</p>
        <textarea value={msg1} onChange={e => { setMsg1(e.target.value); setDirty(true) }} rows={3} className={taClass} style={taStyle} />
        <div className="flex items-center justify-between mt-1">
          <VarTags vars={['nome', 'assistente', 'nutri']} />
          <ResetBtn onClick={() => { setMsg1(DEFAULT_MSG_1); setDirty(true) }} />
        </div>
      </div>

      <div>
        <p className="text-xs font-medium" style={{ color: 'var(--t1)' }}>2º toque</p>
        <p className="text-[11px] mb-1.5" style={{ color: 'var(--t3)' }}>Se o 1º for ignorado ({delay + 20}h depois)</p>
        <textarea value={msg2} onChange={e => { setMsg2(e.target.value); setDirty(true) }} rows={3} className={taClass} style={taStyle} />
        <div className="flex items-center justify-between mt-1">
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
      trigger="Após a consulta"
      title="Pós-consulta"
      desc="Coleta feedback do paciente automaticamente após cada atendimento concluído."
      enabled={enabled}
      onToggle={toggle}
      expanded={expanded}
      onEdit={onEdit}
    >
      <div>
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--t2)' }}>Enviar quantas horas após a consulta?</p>
        <OptionPills options={HOUR_OPTS} value={hours} onChange={v => { setHours(v); setDirty(true) }} format={h => h < 24 ? `${h}h` : '1 dia'} />
      </div>

      <div>
        <p className="text-xs font-medium" style={{ color: 'var(--t1)' }}>Mensagem de feedback</p>
        <p className="text-[11px] mb-1.5" style={{ color: 'var(--t3)' }}>Enviada {hours}h após a consulta concluída</p>
        <textarea value={msg} onChange={e => { setMsg(e.target.value); setDirty(true) }} rows={3} className={taClass} style={taStyle} />
        <div className="flex items-center justify-between mt-1">
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
      trigger={`${hours < 24 ? `${hours}h` : `${hours / 24} dia(s)`} antes da consulta`}
      title="Lembrete"
      desc="Reduz faltas com lembrete automático antes da consulta agendada."
      enabled={enabled}
      onToggle={toggle}
      expanded={expanded}
      onEdit={onEdit}
    >
      <div>
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--t2)' }}>Enviar quantas horas antes?</p>
        <OptionPills options={HOUR_OPTS} value={hours} onChange={v => { setHours(v); setDirty(true) }} format={h => h < 24 ? `${h}h antes` : `${h / 24}d antes`} />
      </div>

      <div>
        <p className="text-xs font-medium" style={{ color: 'var(--t1)' }}>Mensagem de lembrete</p>
        <p className="text-[11px] mb-1.5" style={{ color: 'var(--t3)' }}>Enviada {hours}h antes da consulta</p>
        <textarea value={msg} onChange={e => { setMsg(e.target.value); setDirty(true) }} rows={3} className={taClass} style={taStyle} />
        <div className="flex items-center justify-between mt-1">
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
      trigger={`Paciente inativo há ${days}+ dias`}
      title="Retorno"
      desc="Reativa pacientes que não agendam há muito tempo com um convite de retorno."
      enabled={enabled}
      onToggle={toggle}
      expanded={expanded}
      onEdit={onEdit}
    >
      <div>
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--t2)' }}>Enviar após quantos dias sem consulta?</p>
        <OptionPills options={DAY_OPTS} value={days} onChange={v => { setDays(v); setDirty(true) }} format={d => `${d} dias`} />
      </div>

      <div>
        <p className="text-xs font-medium" style={{ color: 'var(--t1)' }}>Mensagem de retorno</p>
        <p className="text-[11px] mb-1.5" style={{ color: 'var(--t3)' }}>Enviada quando o paciente está há {days} dias sem consulta</p>
        <textarea value={msg} onChange={e => { setMsg(e.target.value); setDirty(true) }} rows={3} className={taClass} style={taStyle} />
        <div className="flex items-center justify-between mt-1">
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
  { key: 'followup_enabled',      def: true,  label: 'Sem resposta' },
  { key: 'auto_feedback_enabled', def: false, label: 'Pós-consulta' },
  { key: 'auto_reminder_enabled', def: false, label: 'Lembrete' },
  { key: 'auto_return_enabled',   def: false, label: 'Retorno' },
]

export default function AutomacoesPage() {
  const qc = useQueryClient()
  const [expandedCard, setExpandedCard] = useState<string | null>(null)

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

  const activeCount = FLOWS.filter(f => (assistant?.[f.key] ?? f.def)).length

  function toggleExpand(id: string) {
    setExpandedCard(prev => prev === id ? null : id)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-[22px] tracking-tight" style={{ color: 'var(--t1)' }}>Automações</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--t3)' }}>Fluxos de atendimento automático via WhatsApp</p>
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4 items-start">
        {/* ── Coluna esquerda ─────────────────────────────────────── */}
        <div className="space-y-2.5">
          {/* Status da IA */}
          <div
            className="rounded-2xl p-[18px]"
            style={{ background: 'rgba(0,194,124,0.04)', border: '1px solid rgba(0,194,124,0.2)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-bold" style={{ color: 'var(--t1)' }}>Status da IA</p>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'var(--brand-s-solid)', color: 'var(--brand-h)' }}
              >
                {activeCount}/{FLOWS.length} ativos
              </span>
            </div>
            <div className="space-y-1.5">
              {FLOWS.map(f => {
                const on = assistant?.[f.key] ?? f.def
                return (
                  <div key={f.key} className="flex items-center gap-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: on ? 'var(--brand)' : 'var(--t3)' }}
                    />
                    <p className="text-xs" style={{ color: 'var(--t1)' }}>{f.label}</p>
                    <p className="text-[11px] ml-auto" style={{ color: 'var(--t2)' }}>{on ? '✓ ativo' : 'inativo'}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <SemRespostaCard assistant={assistant} onSave={handleSave} expanded={expandedCard === 'sem_resposta'} onEdit={() => toggleExpand('sem_resposta')} />
          <FeedbackCard    assistant={assistant} onSave={handleSave} expanded={expandedCard === 'feedback'}     onEdit={() => toggleExpand('feedback')} />
          <LembreteCard    assistant={assistant} onSave={handleSave} expanded={expandedCard === 'lembrete'}     onEdit={() => toggleExpand('lembrete')} />
          <RetornoCard     assistant={assistant} onSave={handleSave} expanded={expandedCard === 'retorno'}      onEdit={() => toggleExpand('retorno')} />
        </div>

        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <div className="space-y-4 lg:sticky lg:top-6">
          <Card className="!p-[18px]">
            <p className="text-[15px] font-bold" style={{ color: 'var(--t1)' }}>Como funciona</p>
            <p className="text-xs mt-0.5 mb-4" style={{ color: 'var(--t2)' }}>Os fluxos são executados automaticamente pela IA via WhatsApp</p>

            <div className="space-y-3.5">
              {[
                { n: 1, title: 'Gatilho detectado', desc: 'O sistema monitora eventos como consultas, silêncio do paciente e retorno' },
                { n: 2, title: 'IA envia mensagem', desc: 'A assistente envia automaticamente pelo WhatsApp com o tom configurado' },
                { n: 3, title: 'Você é notificada', desc: 'Recebe alerta quando o paciente responde ou quando precisa de atenção especial' },
              ].map(step => (
                <div key={step.n} className="flex gap-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(0,194,124,0.1)' }}
                  >
                    <span className="text-[13px] font-bold" style={{ color: 'var(--brand)' }}>{step.n}</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--t1)' }}>{step.title}</p>
                    <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--t2)' }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <AIStatusChecker />

          <div
            className="rounded-xl px-3.5 py-3 text-[11px] leading-relaxed"
            style={{ background: 'rgba(10,132,255,0.06)', border: '1px solid rgba(10,132,255,0.15)', color: 'var(--t2)' }}
          >
            💡 Os fluxos usam <strong style={{ color: 'var(--t1)' }}>n8n</strong> como motor de automação. Para editar os gatilhos avançados, acesse o painel n8n.
          </div>
        </div>
      </div>
    </div>
  )
}
