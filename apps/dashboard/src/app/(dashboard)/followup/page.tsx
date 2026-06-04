'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  CheckCircle, XCircle, AlertCircle, RefreshCw,
  MessageSquare, Clock, Zap, ChevronRight,
  Bell, Star, RotateCcw,
} from 'lucide-react'
import api from '@/lib/api'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

// ── Status checker ────────────────────────────────────────────────
interface StatusItem {
  label: string; ok: boolean; warn?: boolean; detail?: string; href?: string
}

function StatusDot({ ok, warn }: { ok: boolean; warn?: boolean }) {
  if (ok)   return <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
  if (warn) return <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
  return      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
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
    { label: 'WhatsApp conectado', ok: whatsapp?.status === 'connected', detail: whatsapp?.status === 'connected' ? 'Conectado' : 'Desconectado', href: '/whatsapp' },
  ]
  const score = checks.filter(c => c.ok).length
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-t1">Status da IA</p>
          <span className={cn('font-mono text-lg font-bold', score === checks.length ? 'text-emerald-400' : score >= 2 ? 'text-amber-400' : 'text-red-400')}>{score}/{checks.length}</span>
        </div>
        <div className="space-y-2">
          {checks.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <StatusDot ok={item.ok} warn={item.warn} />
              <p className="text-xs text-t2 flex-1">{item.label}</p>
              {!item.ok && item.href && <a href={item.href} className="text-t3 hover:text-brand-500"><ChevronRight className="w-3 h-3" /></a>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Toggle Switch ─────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={cn('relative w-10 h-[22px] rounded-full transition-colors flex-shrink-0', value ? 'bg-brand-500' : 'bg-raised')}
      style={value ? {} : { border: '1px solid var(--border)' }}
    >
      <span className={cn('absolute top-[2px] w-[18px] h-[18px] bg-white rounded-full shadow-sm transition-transform', value ? 'left-[20px]' : 'left-[2px]')} />
    </button>
  )
}

// ── Tags de variáveis ─────────────────────────────────────────────
function VarTags({ vars }: { vars: string[] }) {
  return (
    <div className="flex gap-1.5 flex-wrap items-center">
      <span className="text-[10px] text-t3 font-mono">Variáveis:</span>
      {vars.map(v => (
        <span key={v} className="font-mono text-[10px] px-1.5 py-0.5 rounded text-brand-500" style={{ background: 'var(--brand-s)' }}>{`{${v}}`}</span>
      ))}
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
      <p className="text-xs text-t2">Recontata automaticamente leads que pararam de responder.</p>

      <Card>
        <CardContent className="py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-t1">Ativo</p>
              <p className="text-xs text-t3">Recontata automaticamente</p>
            </div>
            <Toggle value={enabled} onChange={v => { setEnabled(v); mark() }} />
          </div>

          {enabled && (
            <div>
              <p className="text-xs font-medium text-t2 mb-2">Enviar após quantas horas sem resposta?</p>
              <div className="flex flex-wrap gap-1.5">
                {DELAY_OPTIONS.map(h => (
                  <button key={h} type="button"
                    onClick={() => { setDelay(h); mark() }}
                    className={cn('px-3 py-1.5 rounded-lg font-mono text-[11px] border transition-all',
                      delay === h ? 'bg-brand-500/15 border-brand-500/40 text-brand-500' : 'text-t2 hover:bg-raised')}
                    style={{ borderColor: delay === h ? undefined : 'var(--border)' }}
                  >{h < 24 ? `${h}h` : '1 dia'}</button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {enabled && (
        <>
          {[
            { label: '1º toque', sub: `Enviado após ${delay}h de silêncio`, value: msg1, set: setMsg1, def: DEFAULT_MSG_1 },
            { label: '2º toque', sub: `Se o 1º for ignorado (${delay + 20}h depois)`, value: msg2, set: setMsg2, def: DEFAULT_MSG_2 },
          ].map(({ label, sub, value, set, def }) => (
            <Card key={label}>
              <CardContent className="py-4 space-y-3">
                <div>
                  <p className="text-sm font-medium text-t1">{label}</p>
                  <p className="text-xs text-t3">{sub}</p>
                </div>
                <VarTags vars={['nome', 'assistente', 'nutri']} />
                <textarea value={value} onChange={e => { set(e.target.value); mark() }} rows={3}
                  className="w-full rounded-lg px-3.5 py-3 text-sm text-t1 resize-none leading-relaxed"
                  style={{ background: 'var(--raised)', border: '1px solid var(--border)' }} />
                <button className="text-[11px] text-t3 hover:text-brand-500 font-mono" onClick={() => { set(def); mark() }}>Restaurar padrão</button>
              </CardContent>
            </Card>
          ))}
        </>
      )}

      <Button onClick={save} loading={saving} disabled={!dirty}>Salvar</Button>
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
      <p className="text-xs text-t2">Mensagem enviada automaticamente após a consulta ser concluída.</p>

      <Card>
        <CardContent className="py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-t1">Ativo</p>
              <p className="text-xs text-t3">Envia após marcar consulta como concluída</p>
            </div>
            <Toggle value={enabled} onChange={v => { setEnabled(v); mark() }} />
          </div>

          {enabled && (
            <div>
              <p className="text-xs font-medium text-t2 mb-2">Enviar quantas horas após a consulta?</p>
              <div className="flex flex-wrap gap-1.5">
                {HOUR_OPTS.map(h => (
                  <button key={h} type="button"
                    onClick={() => { setHours(h); mark() }}
                    className={cn('px-3 py-1.5 rounded-lg font-mono text-[11px] border transition-all',
                      hours === h ? 'bg-brand-500/15 border-brand-500/40 text-brand-500' : 'text-t2 hover:bg-raised')}
                    style={{ borderColor: hours === h ? undefined : 'var(--border)' }}
                  >{h < 24 ? `${h}h` : '1 dia'}</button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {enabled && (
        <Card>
          <CardContent className="py-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-t1">Mensagem de feedback</p>
              <p className="text-xs text-t3">Enviada {hours}h após a consulta concluída</p>
            </div>
            <VarTags vars={['nome', 'assistente', 'nutri']} />
            <textarea value={msg} onChange={e => { setMsg(e.target.value); mark() }} rows={3}
              className="w-full rounded-lg px-3.5 py-3 text-sm text-t1 resize-none leading-relaxed"
              style={{ background: 'var(--raised)', border: '1px solid var(--border)' }} />
            <button className="text-[11px] text-t3 hover:text-brand-500 font-mono" onClick={() => { setMsg(DEFAULT_FEEDBACK); mark() }}>Restaurar padrão</button>
          </CardContent>
        </Card>
      )}

      <Button onClick={save} loading={saving} disabled={!dirty}>Salvar</Button>
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
      <p className="text-xs text-t2">Lembrete enviado automaticamente antes da consulta agendada.</p>

      <Card>
        <CardContent className="py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-t1">Ativo</p>
              <p className="text-xs text-t3">Lembrete automático antes da consulta</p>
            </div>
            <Toggle value={enabled} onChange={v => { setEnabled(v); mark() }} />
          </div>

          {enabled && (
            <div>
              <p className="text-xs font-medium text-t2 mb-2">Enviar quantas horas antes?</p>
              <div className="flex flex-wrap gap-1.5">
                {HOUR_OPTS.map(h => (
                  <button key={h} type="button"
                    onClick={() => { setHours(h); mark() }}
                    className={cn('px-3 py-1.5 rounded-lg font-mono text-[11px] border transition-all',
                      hours === h ? 'bg-brand-500/15 border-brand-500/40 text-brand-500' : 'text-t2 hover:bg-raised')}
                    style={{ borderColor: hours === h ? undefined : 'var(--border)' }}
                  >{h < 24 ? `${h}h antes` : `${h/24}d antes`}</button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {enabled && (
        <Card>
          <CardContent className="py-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-t1">Mensagem de lembrete</p>
              <p className="text-xs text-t3">Enviada {hours}h antes da consulta</p>
            </div>
            <VarTags vars={['nome', 'assistente', 'nutri', 'data_consulta']} />
            <textarea value={msg} onChange={e => { setMsg(e.target.value); mark() }} rows={3}
              className="w-full rounded-lg px-3.5 py-3 text-sm text-t1 resize-none leading-relaxed"
              style={{ background: 'var(--raised)', border: '1px solid var(--border)' }} />
            <button className="text-[11px] text-t3 hover:text-brand-500 font-mono" onClick={() => { setMsg(DEFAULT_REMINDER); mark() }}>Restaurar padrão</button>
          </CardContent>
        </Card>
      )}

      <Button onClick={save} loading={saving} disabled={!dirty}>Salvar</Button>
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
      <p className="text-xs text-t2">Mensagem enviada quando o paciente não agenda há muito tempo.</p>

      <Card>
        <CardContent className="py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-t1">Ativo</p>
              <p className="text-xs text-t3">Reativa pacientes antigos automaticamente</p>
            </div>
            <Toggle value={enabled} onChange={v => { setEnabled(v); mark() }} />
          </div>

          {enabled && (
            <div>
              <p className="text-xs font-medium text-t2 mb-2">Enviar após quantos dias sem consulta?</p>
              <div className="flex flex-wrap gap-1.5">
                {DAY_OPTS.map(d => (
                  <button key={d} type="button"
                    onClick={() => { setDays(d); mark() }}
                    className={cn('px-3 py-1.5 rounded-lg font-mono text-[11px] border transition-all',
                      days === d ? 'bg-brand-500/15 border-brand-500/40 text-brand-500' : 'text-t2 hover:bg-raised')}
                    style={{ borderColor: days === d ? undefined : 'var(--border)' }}
                  >{d} dias</button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {enabled && (
        <Card>
          <CardContent className="py-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-t1">Mensagem de retorno</p>
              <p className="text-xs text-t3">Enviada quando paciente está há {days} dias sem consulta</p>
            </div>
            <VarTags vars={['nome', 'assistente', 'nutri', 'dias_ausente']} />
            <textarea value={msg} onChange={e => { setMsg(e.target.value); mark() }} rows={3}
              className="w-full rounded-lg px-3.5 py-3 text-sm text-t1 resize-none leading-relaxed"
              style={{ background: 'var(--raised)', border: '1px solid var(--border)' }} />
            <button className="text-[11px] text-t3 hover:text-brand-500 font-mono" onClick={() => { setMsg(DEFAULT_RETURN); mark() }}>Restaurar padrão</button>
          </CardContent>
        </Card>
      )}

      <Button onClick={save} loading={saving} disabled={!dirty}>Salvar</Button>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
const TABS = [
  { id: 'sem_resposta', label: 'Sem resposta',   icon: MessageSquare, desc: 'Reengaja leads parados' },
  { id: 'feedback',     label: 'Pós-consulta',   icon: Star,          desc: 'Como foi o atendimento?' },
  { id: 'lembrete',     label: 'Lembrete',        icon: Bell,          desc: 'Antes da consulta' },
  { id: 'retorno',      label: 'Retorno',         icon: RotateCcw,     desc: 'Reativa pacientes' },
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

  if (isLoading) return <div className="p-6 text-t2 text-sm">Carregando...</div>

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-[22px] tracking-tight text-t1">Automações</h1>
        <p className="text-sm text-t2 mt-0.5">Configure mensagens automáticas para cada etapa da jornada do paciente</p>
      </div>

      <div className="grid md:grid-cols-[1fr_220px] gap-6">
        <div className="space-y-4">
          {/* Tab nav */}
          <div className="grid grid-cols-2 gap-2">
            {TABS.map(({ id, label, icon: Icon, desc }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={cn(
                  'flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all',
                  activeTab === id
                    ? 'border-brand-500/40 bg-brand-500/8'
                    : 'hover:bg-raised'
                )}
                style={{ borderColor: activeTab === id ? undefined : 'var(--border)' }}
              >
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                  activeTab === id ? 'bg-brand-500/15' : 'bg-raised')}>
                  <Icon className={cn('w-3.5 h-3.5', activeTab === id ? 'text-brand-500' : 'text-t3')} />
                </div>
                <div>
                  <p className={cn('text-[12px] font-semibold', activeTab === id ? 'text-brand-500' : 'text-t1')}>{label}</p>
                  <p className="text-[10px] text-t3 mt-0.5">{desc}</p>
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
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-brand-500" />
                <p className="text-sm font-semibold text-t1">Como funciona</p>
              </div>
              <div className="space-y-2 text-[11px] text-t2 leading-relaxed">
                <p><span className="text-brand-500 font-mono">Sem resposta</span> — Detecta silêncio e reengaja automaticamente</p>
                <p><span className="text-brand-500 font-mono">Pós-consulta</span> — Coleta feedback após cada atendimento concluído</p>
                <p><span className="text-brand-500 font-mono">Lembrete</span> — Reduz no-shows com aviso automático antes da consulta</p>
                <p><span className="text-brand-500 font-mono">Retorno</span> — Reativa pacientes que sumiram depois de um tempo</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
