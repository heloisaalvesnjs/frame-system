'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  CheckCircle, XCircle, AlertCircle, RefreshCw,
  MessageSquare, Clock, Zap, ChevronRight
} from 'lucide-react'
import api from '@/lib/api'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

// ── Status checker ────────────────────────────────────────────────

interface StatusItem {
  label: string
  ok: boolean
  warn?: boolean
  detail?: string
  action?: string
  href?: string
}

function StatusDot({ ok, warn }: { ok: boolean; warn?: boolean }) {
  if (ok)   return <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
  if (warn) return <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
  return      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
}

function AIStatusChecker() {
  const { data: assistant } = useQuery<any>({
    queryKey: ['assistant'],
    queryFn: async () => { const { data } = await api.get('/api/assistants'); return data.assistant },
  })
  const { data: slots } = useQuery<any[]>({
    queryKey: ['availability'],
    queryFn: async () => { const { data } = await api.get('/api/nutritionists/availability'); return data },
  })
  const { data: whatsapp } = useQuery<any>({
    queryKey: ['whatsapp-status'],
    queryFn: async () => { const { data } = await api.get('/api/whatsapp/status'); return data },
  })
  const { data: services } = useQuery<any[]>({
    queryKey: ['services'],
    queryFn: async () => { const { data } = await api.get('/api/services'); return data.services },
  })

  if (!assistant) return null

  const checks: StatusItem[] = [
    {
      label: 'Nome da assistente',
      ok: !!assistant?.name,
      detail: assistant?.name || 'Não configurado',
      href: '/configuracoes',
    },
    {
      label: 'Nome do nutricionista',
      ok: !!assistant?.nutri_display_name,
      detail: assistant?.nutri_display_name || 'Usando nome da conta',
      warn: !assistant?.nutri_display_name,
      href: '/configuracoes',
    },
    {
      label: 'Mensagem de boas-vindas',
      ok: !!assistant?.greeting_message,
      detail: assistant?.greeting_message
        ? `${assistant.greeting_message.slice(0, 40)}...`
        : 'Não configurada — IA gera automaticamente',
      warn: !assistant?.greeting_message,
      href: '/configuracoes',
    },
    {
      label: 'Serviços e valores',
      ok: (services?.length ?? 0) > 0 || !!assistant?.service_plans,
      detail: (services?.length ?? 0) > 0
        ? `${services!.length} serviço(s) cadastrado(s)`
        : 'Não configurado — IA pedirá contato direto',
      warn: (services?.length ?? 0) === 0 && !assistant?.service_plans,
      href: '/configuracoes',
    },
    {
      label: 'Horários disponíveis',
      ok: (slots?.length ?? 0) > 0,
      detail: (slots?.length ?? 0) > 0
        ? `${slots!.length} faixa(s) de horário`
        : 'Não configurado — IA não consegue agendar',
      href: '/configuracoes',
    },
    {
      label: 'WhatsApp conectado',
      ok: whatsapp?.status === 'connected',
      detail: whatsapp?.status === 'connected'
        ? `Conectado${whatsapp?.phone ? ` — ${whatsapp.phone}` : ''}`
        : 'Desconectado — mensagens não serão enviadas',
      href: '/configuracoes',
    },
    {
      label: 'Treinamento da IA',
      ok: !!assistant?.pdf_content,
      detail: assistant?.pdf_content
        ? 'Instruções carregadas'
        : 'Sem treinamento — IA usa configurações padrão',
      warn: !assistant?.pdf_content,
      href: '/configuracoes',
    },
    {
      label: 'Follow-up automático',
      ok: !!assistant?.followup_enabled,
      detail: assistant?.followup_enabled
        ? `Ativo — reativa após ${assistant.followup_delay_hours ?? 4}h de silêncio`
        : 'Desativado',
      warn: !assistant?.followup_enabled,
    },
  ]

  const score = checks.filter(c => c.ok).length
  const total = checks.length
  const scoreColor = score === total ? 'text-emerald-400' : score >= total * 0.7 ? 'text-amber-400' : 'text-red-400'

  return (
    <Card>
      <CardContent className="py-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-t1">Status da IA</p>
            <p className="text-xs text-t2 mt-0.5">Verificação de todas as configurações</p>
          </div>
          <span className={cn('font-display font-bold text-2xl', scoreColor)}>
            {score}/{total}
          </span>
        </div>

        <div className="space-y-2.5">
          {checks.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <StatusDot ok={item.ok} warn={item.warn} />
              <div className="flex-1 min-w-0">
                <p className={cn('text-[13px] font-medium leading-tight', item.ok ? 'text-t1' : item.warn ? 'text-amber-300' : 'text-red-300')}>
                  {item.label}
                </p>
                {item.detail && (
                  <p className="text-[11px] text-t3 mt-0.5 truncate">{item.detail}</p>
                )}
              </div>
              {!item.ok && item.href && (
                <a href={item.href} className="flex-shrink-0 text-t3 hover:text-brand-500 transition-colors">
                  <ChevronRight className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main Page ─────────────────────────────────────────────────────

const DELAY_OPTIONS = [1, 2, 3, 4, 6, 8, 12, 24]

const DEFAULT_MSG_1 = 'Oi{nome}! Aqui é {assistente}, da equipe de {nutri}. Ainda consigo garantir um horário pra você — prefere manhã ou tarde?'
const DEFAULT_MSG_2 = 'Oi{nome}! {assistente} aqui 😊 Ainda tenho horários disponíveis com {nutri} essa semana. É só me dizer manhã ou tarde que reservo pra você!'

export default function FollowupPage() {
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)

  const [enabled,   setEnabled]   = useState(true)
  const [delay,     setDelay]     = useState(4)
  const [msg1,      setMsg1]      = useState(DEFAULT_MSG_1)
  const [msg2,      setMsg2]      = useState(DEFAULT_MSG_2)
  const [dirty,     setDirty]     = useState(false)

  const { data: assistant, isLoading } = useQuery<any>({
    queryKey: ['assistant'],
    queryFn: async () => { const { data } = await api.get('/api/assistants'); return data.assistant },
  })

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
      await api.post('/api/assistants', {
        ...assistant,
        followup_enabled: enabled,
        followup_delay_hours: delay,
        followup_message_1: msg1 === DEFAULT_MSG_1 ? null : msg1,
        followup_message_2: msg2 === DEFAULT_MSG_2 ? null : msg2,
      })
      qc.invalidateQueries({ queryKey: ['assistant'] })
      toast.success('Follow-up salvo!')
      setDirty(false)
    } catch { toast.error('Erro ao salvar.') }
    finally { setSaving(false) }
  }

  if (isLoading) return <div className="p-6 text-t2 text-sm">Carregando...</div>

  const Tag = ({ label }: { label: string }) => (
    <span
      onClick={() => { /* insert at cursor — not needed for now */ }}
      className="font-mono text-[10px] px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity text-brand-500"
      style={{ background: 'var(--brand-s)' }}
      title={`Variável: ${label}`}
    >
      {`{${label}}`}
    </span>
  )

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-[22px] tracking-tight text-t1">Follow-up Automático</h1>
        <p className="text-sm text-t2 mt-0.5">Reativa leads que pararam de responder e não deixa vendas escaparem</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">

        {/* Configurações */}
        <div className="space-y-5">

          {/* Toggle + delay */}
          <Card>
            <CardContent className="py-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-t1">Follow-up ativo</p>
                  <p className="text-xs text-t2 mt-0.5">A IA recontata automaticamente</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setEnabled(v => !v); setDirty(true) }}
                  className={cn('relative w-10 h-[22px] rounded-full transition-colors flex-shrink-0', enabled ? 'bg-brand-500' : 'bg-raised')}
                  style={enabled ? {} : { border: '1px solid var(--border)' }}
                >
                  <span className={cn('absolute top-[2px] w-[18px] h-[18px] bg-white rounded-full shadow-sm transition-transform', enabled ? 'left-[20px]' : 'left-[2px]')} />
                </button>
              </div>

              {enabled && (
                <div>
                  <p className="text-xs font-medium text-t2 font-mono tracking-wide mb-2">Enviar após quantas horas sem resposta?</p>
                  <div className="flex flex-wrap gap-1.5">
                    {DELAY_OPTIONS.map(h => (
                      <button key={h} type="button"
                        onClick={() => { setDelay(h); setDirty(true) }}
                        className={cn(
                          'px-3 py-1.5 rounded-lg font-mono text-[11px] border transition-all',
                          delay === h ? 'bg-brand-500/15 border-brand-500/40 text-brand-500' : 'border-theme text-t2 hover:text-t1 hover:bg-raised'
                        )}
                      >
                        {h < 24 ? `${h}h` : '1 dia'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mensagens */}
          {enabled && (
            <>
              <Card>
                <CardContent className="py-5 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-t1">1º toque</p>
                    <p className="text-xs text-t2 mt-0.5">Enviado após o tempo configurado</p>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <span className="text-[10px] text-t3 font-mono">Variáveis:</span>
                    <Tag label="nome" /><Tag label="assistente" /><Tag label="nutri" />
                  </div>
                  <textarea
                    value={msg1}
                    onChange={e => { setMsg1(e.target.value); setDirty(true) }}
                    rows={3}
                    className="w-full rounded-lg px-3.5 py-3 text-sm text-t1 resize-none leading-relaxed"
                    style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
                  />
                  <button className="text-[11px] text-t3 hover:text-brand-500 transition-colors font-mono" onClick={() => { setMsg1(DEFAULT_MSG_1); setDirty(true) }}>
                    Restaurar padrão
                  </button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-5 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-t1">2º toque</p>
                    <p className="text-xs text-t2 mt-0.5">Se o 1º for ignorado (20h depois)</p>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <span className="text-[10px] text-t3 font-mono">Variáveis:</span>
                    <Tag label="nome" /><Tag label="assistente" /><Tag label="nutri" />
                  </div>
                  <textarea
                    value={msg2}
                    onChange={e => { setMsg2(e.target.value); setDirty(true) }}
                    rows={3}
                    className="w-full rounded-lg px-3.5 py-3 text-sm text-t1 resize-none leading-relaxed"
                    style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
                  />
                  <button className="text-[11px] text-t3 hover:text-brand-500 transition-colors font-mono" onClick={() => { setMsg2(DEFAULT_MSG_2); setDirty(true) }}>
                    Restaurar padrão
                  </button>
                </CardContent>
              </Card>
            </>
          )}

          <Button onClick={save} loading={saving} disabled={!dirty} className="w-full">
            Salvar configurações
          </Button>
        </div>

        {/* Status da IA */}
        <div className="space-y-4">
          <AIStatusChecker />

          {enabled && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-brand-500" />
                  <p className="text-sm font-semibold text-t1">Como funciona</p>
                </div>
                <div className="space-y-2.5 text-[12px] text-t2">
                  <div className="flex gap-2">
                    <span className="font-mono text-brand-500 flex-shrink-0">1h</span>
                    <span>Lead para de responder</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-mono text-brand-500 flex-shrink-0">{delay}h</span>
                    <span>1º toque enviado automaticamente</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-mono text-brand-500 flex-shrink-0">{delay + 20}h</span>
                    <span>2º toque se o 1º for ignorado</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-mono text-brand-500 flex-shrink-0">72h</span>
                    <span>Para de tentar após 3 dias</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-mono text-emerald-500 flex-shrink-0">✅</span>
                    <span>Para imediatamente quando lead agendar</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
