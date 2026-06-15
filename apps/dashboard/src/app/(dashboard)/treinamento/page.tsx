'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Upload, Trash2, CheckCircle, MessageSquare,
  ArrowRight, ArrowLeft, FileText, Edit3,
  Plus, GripVertical, Clock, Loader2, Save,
  Power, Moon, Sun, BookOpen,
  Send, RotateCcw, Bot, User, PlayCircle, Brain,
} from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { Btn, KPI } from '@/components/ui/finance-primitives'
import { V4Page, V4Card, V4CardPad, V4Button, V4Metric, V4Tag } from '@/components/v4/V4Primitives'

// ═══════════════════════════════════════════════════════
// Shared helpers
// ═══════════════════════════════════════════════════════

function Field({ label, hint, error, children }: {
  label: string; hint?: string; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {hint && <p className="text-[11px] mb-1.5" style={{ color: 'var(--t3)' }}>{hint}</p>}
      {children}
      {error && <p className="text-[12px] mt-1.5" style={{ color: '#EF4444' }}>{error}</p>}
    </div>
  )
}

function SectionCard({ title, subtitle, icon, children }: {
  title: string; subtitle?: string; icon?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
        {icon && (
          <div className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0 bg-[var(--raised)]">
            {icon}
          </div>
        )}
        <div>
          <p className="text-[13px] font-medium text-t1">{title}</p>
          {subtitle && <p className="text-[11.5px] text-t3">{subtitle}</p>}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
      style={{
        background: enabled ? 'var(--brand)' : 'var(--raised)',
        border:     enabled ? 'none' : '1px solid var(--border)',
      }}
    >
      <span className={cn(
        'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform',
        enabled ? 'translate-x-5' : 'translate-x-0'
      )} />
    </button>
  )
}

// ═══════════════════════════════════════════════════════
// IA Power Toggle
// ═══════════════════════════════════════════════════════

function AIPowerToggle() {
  const qc = useQueryClient()
  const [paused, setPaused] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data: assistant } = useQuery<any>({
    queryKey: ['assistant'],
    queryFn: async () => { const { data } = await api.get('/api/assistants'); return data.assistant },
    staleTime: 30_000,
  })

  useEffect(() => {
    if (assistant) setPaused(assistant.ai_paused ?? false)
  }, [assistant])

  async function toggle() {
    const next = !paused
    setSaving(true)
    try {
      await api.patch('/api/assistants/toggle-ai', { paused: next })
      setPaused(next)
      qc.invalidateQueries({ queryKey: ['assistant'] })
      toast.success(next ? 'IA desativada — não vai responder nenhuma mensagem.' : 'IA ativada!')
    } catch { toast.error('Erro ao alterar.') }
    finally { setSaving(false) }
  }

  return (
    <div
      className="flex items-center gap-4 rounded-xl px-5 py-4 transition-colors"
      style={paused
        ? { background: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 28%, transparent)' }
        : { background: 'var(--brand-s)', border: '1px solid var(--brand-ring)' }
      }
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--raised)', color: paused ? 'var(--danger)' : 'var(--brand)' }}
      >
        <Power className="w-5 h-5" strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold" style={{ color: paused ? 'var(--danger)' : 'var(--brand)' }}>
          {paused ? 'IA desativada' : 'IA ativa'}
        </p>
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--t3)' }}>
          {paused
            ? 'A assistente não está respondendo nenhuma mensagem no momento'
            : 'A assistente está respondendo normalmente'}
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={saving}
        className="relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 disabled:opacity-60"
        style={{ background: paused ? 'var(--danger)' : 'var(--brand)' }}
      >
        <span className={cn(
          'inline-block h-5 w-5 m-1 transform rounded-full bg-white shadow transition-transform duration-200',
          paused ? 'translate-x-0' : 'translate-x-5'
        )} />
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// Interview Mode (Training Quiz)
// ═══════════════════════════════════════════════════════

const IQ = [
  {
    id: 0, type: 'textarea' as const,
    question: 'Como funciona a primeira consulta e o que ela inclui?',
    hint: 'Descreva o que o paciente vai receber e vivenciar',
    placeholder: 'Ex: Na primeira consulta faço anamnese completa, avalio composição corporal e entrego o plano alimentar no mesmo dia. Dura cerca de 1h...',
  },
  {
    id: 1, type: 'textarea' as const,
    question: 'Quais as 3 situações mais comuns no WhatsApp e como você responderia cada uma?',
    hint: 'Escreva como você mesmo responderia — no seu estilo natural',
    placeholder: '1. "Quanto custa?" →\n\n2. "Como funciona?" →\n\n3. "Já tentei antes e não funcionou" →',
  },
  {
    id: 2, type: 'chips_text' as const,
    question: 'Como você costuma se comunicar com os pacientes?',
    hint: 'Selecione seu estilo e, se quiser, exemplifique com uma frase',
    chips: ['Informal, como conversa de amigos', 'Acolhedor mas profissional', 'Direto e objetivo', 'Formal'],
    placeholder: 'Opcional: escreva uma frase como você falaria com um paciente novo...',
  },
  {
    id: 3, type: 'chips_single' as const,
    question: 'O que você quer que a assistente faça?',
    hint: 'Define a missão principal dela',
    chips: [
      { value: 'qualify',    label: 'Qualifica e nutre o lead',  desc: 'Entende o objetivo, apresenta o serviço e mantém o interesse aquecido' },
      { value: 'close',      label: 'Conduz ao fechamento',       desc: 'Foca em converter o contato em consulta agendada o mais rápido possível' },
      { value: 'reactivate', label: 'Reativa e não perde venda', desc: 'Acompanha quem não respondeu e faz follow-up estratégico' },
    ],
  },
  {
    id: 4, type: 'textarea' as const,
    question: 'O que ela nunca pode dizer ou prometer, em hipótese alguma?',
    hint: 'Protege sua reputação e credibilidade',
    placeholder: 'Ex: Nunca prometer emagrecer X kg em Y dias. Nunca dar orientações nutricionais pelo chat antes da consulta...',
  },
]

const MISSION: Record<string, string> = {
  qualify:    'Qualifica e nutre o lead — entenda o objetivo do paciente antes de oferecer agendamento. Mantenha o interesse aquecido. Não pressione.',
  close:      'Conduz ao fechamento — converta o contato em consulta agendada rapidamente. Crie urgência suave mencionando horários disponíveis.',
  reactivate: 'Reativa e não perde venda — faça follow-up com leads que pararam de responder. Seja persistente mas respeitosa.',
}

function compileInterview(answers: Record<number, any>): string {
  const parts: string[] = []
  if (answers[0]?.trim()) parts.push(`PRIMEIRA CONSULTA:\n${answers[0].trim()}`)
  if (answers[1]?.trim()) parts.push(`SITUAÇÕES COMUNS NO WHATSAPP — USE ESTAS RESPOSTAS EXATAS:\n${answers[1].trim()}`)
  if (answers[2]) {
    const { chips = [], text = '' } = answers[2]
    let s = `TOM DE COMUNICAÇÃO: ${chips.join(', ')}`
    if (text?.trim()) s += `\nExemplo real: "${text.trim()}"`
    parts.push(s)
  }
  if (answers[3]) parts.push(`MISSÃO PRINCIPAL DA ASSISTENTE:\n${MISSION[answers[3]] || answers[3]}`)
  if (answers[4]?.trim()) parts.push(`NUNCA DIZER OU PROMETER:\n${answers[4].trim()}`)
  return parts.join('\n\n')
}

function InterviewMode({ onSaved }: { onSaved: () => void }) {
  type Stage = 'intro' | 'q' | 'review'
  const [stage, setStage]   = useState<Stage>('intro')
  const [qi,    setQi]      = useState(0)
  const [ans,   setAns]     = useState<Record<number, any>>({})
  const [saving, setSaving] = useState(false)

  const q       = IQ[qi]
  const total   = IQ.length
  const pct     = Math.round(((qi + 1) / total) * 100)
  const compiled = compileInterview(ans)

  function canNext() {
    const a = ans[qi]
    if (q.type === 'textarea')     return !!a?.trim()
    if (q.type === 'chips_text')   return (a?.chips?.length ?? 0) > 0
    if (q.type === 'chips_single') return !!a
    return false
  }

  function next() { qi < total - 1 ? setQi(n => n + 1) : setStage('review') }
  function back() {
    if (stage === 'review') { setStage('q'); return }
    if (qi > 0) { setQi(n => n - 1); return }
    setStage('intro')
  }

  function setChipsText(chips?: string[], text?: string) {
    setAns(a => ({ ...a, [qi]: { chips: chips ?? a[qi]?.chips ?? [], text: text ?? a[qi]?.text ?? '' } }))
  }

  async function save() {
    setSaving(true)
    try {
      await api.post('/api/assistants/interview', { content: compiled })
      toast.success('Treinamento salvo! A assistente já conhece o seu consultório.')
      onSaved()
    } catch {
      toast.error('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  if (stage === 'intro') return (
    <div className="flex flex-col items-center text-center py-8 gap-5">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: 'var(--brand-s-solid)', border: '1px solid rgba(0,194,124,.2)' }}
      >
        <MessageSquare className="w-6 h-6" style={{ color: 'var(--brand)' }} />
      </div>
      <div>
        <h3 className="font-bold text-[17px] tracking-tight mb-2" style={{ color: 'var(--t1)' }}>
          Entrevista de treinamento
        </h3>
        <p className="text-sm max-w-xs leading-relaxed mx-auto" style={{ color: 'var(--t2)' }}>
          5 perguntas para a assistente entender como você trabalha. Responda como você mesmo falaria.
        </p>
      </div>
      <Btn onClick={() => setStage('q')}>
        Começar <ArrowRight className="w-3.5 h-3.5" />
      </Btn>
    </div>
  )

  if (stage === 'review') return (
    <div className="space-y-5">
      <div
        className="flex items-center gap-3 p-3 rounded-xl"
        style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}
      >
        <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#059669' }} />
        <div>
          <p className="text-[12px] font-semibold" style={{ color: '#059669' }}>Entrevista concluída</p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--t2)' }}>Revise o conteúdo antes de salvar</p>
        </div>
      </div>
      <textarea
        value={compiled} readOnly rows={13}
        className="w-full rounded-xl px-4 py-3 text-[12px] resize-none leading-relaxed font-mono"
        style={{ background: 'var(--raised)', border: '1px solid var(--border)', color: 'var(--t2)' }}
      />
      <div className="flex items-center gap-3">
        <Btn onClick={save} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Salvar treinamento
        </Btn>
        <Btn variant="ghost" size="sm" onClick={back}><ArrowLeft className="w-3.5 h-3.5" /> Ajustar</Btn>
        <Btn variant="ghost" size="sm" onClick={() => { setStage('intro'); setQi(0); setAns({}) }}>Refazer</Btn>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="font-mono text-[10px] tracking-wider" style={{ color: 'var(--t3)' }}>
            PERGUNTA {qi + 1} DE {total}
          </span>
          <span className="font-mono text-[10px]" style={{ color: 'var(--t3)' }}>{pct}%</span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--raised)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: 'var(--brand)' }}
          />
        </div>
      </div>

      <div>
        <h3 className="font-bold text-[17px] tracking-tight leading-snug" style={{ color: 'var(--t1)' }}>
          {q.question}
        </h3>
        {q.hint && <p className="text-xs mt-1" style={{ color: 'var(--t3)' }}>{q.hint}</p>}
      </div>

      {q.type === 'textarea' && (
        <textarea
          value={ans[qi] || ''} rows={6} autoFocus
          onChange={e => setAns(a => ({ ...a, [qi]: e.target.value }))}
          placeholder={(q as any).placeholder}
          className="textarea"
        />
      )}

      {q.type === 'chips_text' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(q as any).chips.map((chip: string) => {
              const sel = (ans[qi]?.chips || []).includes(chip)
              return (
                <button key={chip} type="button"
                  onClick={() => {
                    const prev = ans[qi]?.chips || []
                    setChipsText(sel ? prev.filter((c: string) => c !== chip) : [...prev, chip])
                  }}
                  className="px-3.5 py-2 rounded-xl text-sm transition-all"
                  style={sel
                    ? { background: 'var(--brand-s)', border: '1.5px solid var(--brand)', color: 'var(--brand)' }
                    : { border: '1px solid var(--border)', color: 'var(--t2)' }
                  }
                >
                  {chip}
                </button>
              )
            })}
          </div>
          <textarea
            value={ans[qi]?.text || ''} rows={3}
            onChange={e => setChipsText(undefined, e.target.value)}
            placeholder={(q as any).placeholder}
            className="textarea"
          />
        </div>
      )}

      {q.type === 'chips_single' && (
        <div className="space-y-2">
          {(q as any).chips.map((chip: { value: string; label: string; desc: string }) => {
            const sel = ans[qi] === chip.value
            return (
              <button key={chip.value} type="button"
                onClick={() => setAns(a => ({ ...a, [qi]: chip.value }))}
                className="w-full flex items-start gap-4 px-4 py-3.5 rounded-xl text-left transition-all"
                style={sel
                  ? { background: 'var(--brand-s)', border: '1.5px solid var(--brand)' }
                  : { border: '1px solid var(--border)' }
                }
              >
                <div
                  className="w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center"
                  style={{ borderColor: sel ? 'var(--brand)' : 'var(--t3)' }}
                >
                  {sel && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--brand)' }} />}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: sel ? 'var(--brand)' : 'var(--t1)' }}>
                    {chip.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--t2)' }}>{chip.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <Btn variant="ghost" size="sm" onClick={back}>
          <ArrowLeft className="w-3.5 h-3.5" /> Anterior
        </Btn>
        <Btn onClick={next} disabled={!canNext()}>
          {qi === total - 1 ? 'Ver resultado' : 'Próxima'} <ArrowRight className="w-3.5 h-3.5" />
        </Btn>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// Manual Section
// ═══════════════════════════════════════════════════════

const TEMPLATE_DEFAULT = `# MANUAL DE INSTRUÇÕES — [NOME DA ASSISTENTE]
## Assistente Virtual da [SEU NOME AQUI]

---

## SOBRE MIM

Sou [Nome completo], nutricionista formada em [Universidade], com [X anos] de experiência.
Minha especialidade é [ex: nutrição esportiva / emagrecimento feminino / nutrição clínica].
Atendo [online / presencialmente em [Cidade] / online e presencialmente].
CRN: [seu número]

---

## MEU MÉTODO E DIFERENCIAIS

[Descreva em 2-3 frases o que te diferencia.]

---

## PERGUNTAS FREQUENTES — RESPOSTAS EXATAS

**P: Quanto custa a consulta?**
R: [Ex: "O valor é R$ X. Inclui consulta + plano alimentar personalizado."]

**P: Como funciona o primeiro atendimento?**
R: "[Descreva o processo...]"

---

## O QUE A ASSISTENTE NUNCA DEVE FAZER

- Nunca dar diagnósticos ou prescrever dietas pelo WhatsApp
- Nunca prometer resultados específicos
- [Adicione suas regras aqui]`

function ManualSection() {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'choose' | 'editor' | 'pdf' | 'interview'>('choose')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const { data: assistant } = useQuery<any>({
    queryKey: ['assistant'],
    queryFn: async () => { const { data } = await api.get('/api/assistants'); return data.assistant },
  })

  const { data: manualData } = useQuery<any>({
    queryKey: ['manual-content'],
    queryFn: async () => { const { data } = await api.get('/api/assistants/manual-content'); return data },
  })

  useEffect(() => {
    if (manualData?.content) { setContent(manualData.content); setMode('editor') }
    else if (assistant?.pdf_filename) { setMode('pdf') }
  }, [manualData, assistant])

  async function handleSaveManual() {
    if (!content.trim()) return
    setSaving(true)
    try {
      await api.post('/api/assistants/interview', { content: content.trim() })
      toast.success('Manual salvo! A assistente já usa as novas informações.')
      queryClient.invalidateQueries({ queryKey: ['assistant'] })
      queryClient.invalidateQueries({ queryKey: ['manual-content'] })
    } catch {
      toast.error('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUploadPdf() {
    if (!pdfFile) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('pdf', pdfFile)
      await api.post('/api/assistants/upload-pdf', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setPdfFile(null)
      toast.success('PDF enviado e processado!')
      queryClient.invalidateQueries({ queryKey: ['assistant'] })
      queryClient.invalidateQueries({ queryKey: ['manual-content'] })
    } catch {
      toast.error('Erro ao enviar PDF. Verifique o arquivo.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete() {
    try {
      await api.delete('/api/assistants/pdf')
      setContent(''); setMode('choose')
      toast.success('Manual removido.')
      queryClient.invalidateQueries({ queryKey: ['assistant'] })
      queryClient.invalidateQueries({ queryKey: ['manual-content'] })
    } catch {
      toast.error('Erro ao remover.')
    }
  }

  if (mode === 'interview') return (
    <InterviewMode onSaved={() => {
      queryClient.invalidateQueries({ queryKey: ['assistant'] })
      queryClient.invalidateQueries({ queryKey: ['manual-content'] })
      setMode('editor')
    }} />
  )

  if (mode === 'choose') return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: 'var(--t2)' }}>
        Ensine a assistente como você trabalha, seus diferenciais e como responder clientes.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => setMode('interview')}
          className="flex flex-col items-start gap-2 p-4 rounded-xl text-left transition-colors"
          style={{ border: '1px solid var(--border)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--raised)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--brand-s-solid)' }}>
            <MessageSquare className="w-4 h-4" style={{ color: 'var(--brand)' }} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--t1)' }}>Entrevista guiada</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>5 perguntas rápidas para começar</p>
          </div>
        </button>
        <button
          onClick={() => { setContent(TEMPLATE_DEFAULT); setMode('editor') }}
          className="flex flex-col items-start gap-2 p-4 rounded-xl text-left transition-colors"
          style={{ border: '1px solid var(--border)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--raised)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--brand-s-solid)' }}>
            <Edit3 className="w-4 h-4" style={{ color: 'var(--brand)' }} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--t1)' }}>Editar no sistema</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>Preencha o template direto aqui</p>
          </div>
        </button>
        <button
          onClick={() => setMode('pdf')}
          className="flex flex-col items-start gap-2 p-4 rounded-xl text-left transition-colors"
          style={{ border: '1px solid var(--border)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--raised)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--raised)' }}>
            <Upload className="w-4 h-4" style={{ color: 'var(--t3)' }} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--t1)' }}>Enviar PDF</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>Faça upload de um arquivo PDF</p>
          </div>
        </button>
      </div>
    </div>
  )

  if (mode === 'editor') return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs" style={{ color: 'var(--t2)' }}>
          Preencha as informações do consultório. A assistente vai usar este conteúdo para atender.
        </p>
        <button
          onClick={handleDelete}
          className="flex items-center gap-1 text-xs flex-shrink-0 transition-colors"
          style={{ color: 'var(--t3)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#EF4444'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--t3)'}
        >
          <Trash2 className="w-3.5 h-3.5" /> Limpar
        </button>
      </div>
      {content && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
          style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#059669' }}
        >
          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
          Manual configurado — assistente usando estas instruções
        </div>
      )}
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        rows={18}
        placeholder="Preencha as instruções do consultório..."
        className="textarea font-mono text-[13px]"
      />
      <div className="flex items-center gap-3">
        <Btn onClick={handleSaveManual} disabled={saving || !content.trim()}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Salvar manual
        </Btn>
        <Btn variant="ghost" size="sm" onClick={() => setMode('pdf')}>
          <Upload className="w-3.5 h-3.5" /> Ou enviar PDF
        </Btn>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs" style={{ color: 'var(--t2)' }}>
          Envie um PDF com seu protocolo, perguntas frequentes e como você atende.
        </p>
        <button
          onClick={() => { setContent(TEMPLATE_DEFAULT); setMode('editor') }}
          className="flex items-center gap-1.5 text-xs flex-shrink-0 transition-colors"
          style={{ color: 'var(--brand)' }}
        >
          <Edit3 className="w-3.5 h-3.5" /> Editar no sistema
        </button>
      </div>
      {assistant?.pdf_filename ? (
        <div
          className="flex items-center gap-3 p-3 rounded-lg"
          style={{ background: 'var(--brand-s)', border: '1px solid rgba(0,194,124,.2)' }}
        >
          <FileText className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--brand)' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--brand)' }}>{assistant.pdf_filename}</p>
            <p className="text-xs" style={{ color: 'var(--t3)' }}>PDF ativo</p>
          </div>
          <Btn variant="secondary" size="sm" onClick={handleDelete} className="!text-[12px]">
            <Trash2 className="w-3.5 h-3.5" /> Remover
          </Btn>
        </div>
      ) : (
        <div
          className="border-2 border-dashed rounded-lg p-5 text-center transition-colors"
          style={{ borderColor: 'var(--border)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--raised)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
        >
          <Upload className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--t3)' }} />
          <input type="file" accept=".pdf" className="hidden" id="pdf-upload"
            onChange={e => setPdfFile(e.target.files?.[0] || null)} />
          <label htmlFor="pdf-upload" className="cursor-pointer text-sm font-medium" style={{ color: 'var(--brand)' }}>
            Selecionar PDF
          </label>
          <p className="text-xs mt-1" style={{ color: 'var(--t3)' }}>Até 10 MB</p>
        </div>
      )}
      {pdfFile && (
        <div className="flex items-center gap-3">
          <p className="text-sm flex-1 truncate" style={{ color: 'var(--t2)' }}>{pdfFile.name}</p>
          <Btn size="sm" onClick={handleUploadPdf} disabled={uploading} className="!text-[12px]">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Enviar
          </Btn>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// Automações Section
// ═══════════════════════════════════════════════════════

interface FollowupStep {
  id?: string; step_order: number; delay_hours: number; message: string; is_active?: boolean
}

function AutomacoesSection() {
  const queryClient = useQueryClient()

  const { data: assistant } = useQuery<any>({
    queryKey: ['assistant'],
    queryFn: async () => { const { data } = await api.get('/api/assistants'); return data.assistant },
  })

  const [posConsulta,    setPosConsulta]    = useState('')
  const [retornoMsg,     setRetornoMsg]     = useState('')
  const [retornoDays,    setRetornoDays]    = useState(30)
  const [savingAssist,   setSavingAssist]   = useState(false)

  useEffect(() => {
    if (!assistant) return
    setPosConsulta(assistant.pos_consulta_message ?? '')
    setRetornoMsg(assistant.retorno_message ?? '')
    setRetornoDays(assistant.retorno_days ?? 30)
  }, [assistant])

  async function saveAssistantFields() {
    setSavingAssist(true)
    try {
      await api.put('/api/assistants', {
        name:                    assistant?.name ?? '',
        tone:                    assistant?.tone ?? '',
        greeting_message:        assistant?.greeting_message ?? '',
        consultation_price:      assistant?.consultation_price ?? null,
        consultation_modalities: assistant?.consultation_modalities ?? [],
        specialties:             assistant?.specialties ?? [],
        emoji_level:             assistant?.emoji_level ?? 'medium',
        func_prospeccao:         assistant?.func_prospeccao ?? true,
        func_triagem:            assistant?.func_triagem ?? true,
        func_agendamento:        assistant?.func_agendamento ?? true,
        pos_consulta_message:    posConsulta.trim() || null,
        retorno_message:         retornoMsg.trim() || null,
        retorno_days:            retornoDays,
      })
      toast.success('Mensagens de automação salvas!')
      queryClient.invalidateQueries({ queryKey: ['assistant'] })
    } catch {
      toast.error('Erro ao salvar. Tente novamente.')
    } finally {
      setSavingAssist(false)
    }
  }

  const { data: seqData, isLoading: seqLoading } = useQuery<any>({
    queryKey: ['followup-sequences'],
    queryFn: async () => { const { data } = await api.get('/api/followup-sequences'); return data },
  })

  const [steps, setSteps] = useState<FollowupStep[]>([])

  useEffect(() => {
    if (seqData?.sequences) setSteps(seqData.sequences)
  }, [seqData])

  async function addStep() {
    const newStep = { step_order: steps.length + 1, delay_hours: 24, message: '' }
    try {
      const { data } = await api.post('/api/followup-sequences', newStep)
      setSteps(prev => [...prev, data.sequence])
      toast.success('Etapa adicionada!')
    } catch { toast.error('Erro ao adicionar etapa.') }
  }

  async function updateStep(index: number, field: keyof FollowupStep, value: any) {
    const step = steps[index]
    const updated = { ...step, [field]: value }
    setSteps(prev => prev.map((s, i) => i === index ? updated : s))
    if (!step.id) return
    try { await api.put(`/api/followup-sequences/${step.id}`, { [field]: value }) }
    catch { toast.error('Erro ao salvar etapa.') }
  }

  async function removeStep(index: number) {
    const step = steps[index]
    if (step.id) {
      try { await api.delete(`/api/followup-sequences/${step.id}`) }
      catch { toast.error('Erro ao remover etapa.'); return }
    }
    setSteps(prev => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, step_order: i + 1 })))
    toast.success('Etapa removida.')
    queryClient.invalidateQueries({ queryKey: ['followup-sequences'] })
  }

  return (
    <div className="space-y-8">
      {/* Follow-up */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--t1)' }}>
            <Clock className="w-3.5 h-3.5" style={{ color: 'var(--brand)' }} />
            Follow-up automático
          </h3>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--t2)' }}>
            Sequência de mensagens enviadas quando o lead para de responder.
            Use <code style={{ color: 'var(--brand)', fontFamily: 'monospace' }}>{'{nome}'}</code> para o nome do cliente.
          </p>
        </div>
        {seqLoading ? (
          <div className="text-xs" style={{ color: 'var(--t3)' }}>Carregando...</div>
        ) : (
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div
                key={step.id ?? `new-${i}`}
                className="rounded-xl p-4 space-y-3"
                style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-3.5 h-3.5" style={{ color: 'var(--t3)' }} />
                    <span className="text-xs font-mono font-semibold" style={{ color: 'var(--brand)' }}>Etapa {i + 1}</span>
                  </div>
                  <button
                    onClick={() => removeStep(i)}
                    className="transition-colors"
                    style={{ color: 'var(--t3)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#EF4444'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--t3)'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs flex-shrink-0" style={{ color: 'var(--t2)' }}>Enviar após</label>
                  <input
                    type="number" min={0.5} step={0.5}
                    value={step.delay_hours}
                    onChange={e => updateStep(i, 'delay_hours', Number(e.target.value))}
                    className="w-20 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--t1)' }}
                  />
                  <span className="text-xs" style={{ color: 'var(--t2)' }}>horas sem resposta</span>
                </div>
                <textarea
                  value={step.message}
                  onChange={e => updateStep(i, 'message', e.target.value)}
                  rows={3}
                  placeholder={`Mensagem da etapa ${i + 1}...`}
                  className="w-full rounded-lg px-3 py-2 text-sm resize-none leading-relaxed focus:outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--t1)' }}
                />
              </div>
            ))}
            <button
              onClick={addStep}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed text-xs transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--t3)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--t2)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--t3)'}
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar etapa de follow-up
            </button>
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--border)' }} />

      {/* Pós-consulta */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--t1)' }}>
            <CheckCircle className="w-3.5 h-3.5" style={{ color: 'var(--brand)' }} />
            Mensagem pós-consulta
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--t2)' }}>
            Enviada automaticamente ~3h após a consulta. Use <code style={{ color: 'var(--brand)', fontFamily: 'monospace' }}>{'{nome}'}</code>.
          </p>
        </div>
        <textarea
          value={posConsulta}
          onChange={e => setPosConsulta(e.target.value)}
          rows={4}
          placeholder="Olá {nome}! 🌿 Espero que sua consulta tenha sido ótima!"
          className="textarea"
        />
      </div>

      <div style={{ borderTop: '1px solid var(--border)' }} />

      {/* Retorno */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--t1)' }}>
            <ArrowRight className="w-3.5 h-3.5" style={{ color: 'var(--brand)' }} />
            Mensagem de retorno
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--t2)' }}>
            Para pacientes que não remarcaram após X dias.
            Use <code style={{ color: 'var(--brand)', fontFamily: 'monospace' }}>{'{nome}'}</code> e{' '}
            <code style={{ color: 'var(--brand)', fontFamily: 'monospace' }}>{'{dias}'}</code>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs flex-shrink-0" style={{ color: 'var(--t2)' }}>Enviar após</label>
          <input
            type="number" min={1} max={365}
            value={retornoDays}
            onChange={e => setRetornoDays(Number(e.target.value))}
            className="w-20 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none"
            style={{ background: 'var(--raised)', border: '1px solid var(--border)', color: 'var(--t1)' }}
          />
          <span className="text-xs" style={{ color: 'var(--t2)' }}>dias da última consulta</span>
        </div>
        <textarea
          value={retornoMsg}
          onChange={e => setRetornoMsg(e.target.value)}
          rows={4}
          placeholder="Olá {nome}! 😊 Faz {dias} dias desde nossa última consulta..."
          className="textarea"
        />
      </div>

      <Btn onClick={saveAssistantFields} disabled={savingAssist}>
        {savingAssist ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Salvar automações
      </Btn>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// Assistente Config (name, tone, greeting, etc.)
// ═══════════════════════════════════════════════════════

interface Assistant {
  id: string; name: string; tone: string; greeting_message: string
  consultation_price?: string; consultation_modalities?: string
  specialties?: string; vacation_mode?: boolean; vacation_message?: string
  farewell_message?: string; frases_proibidas?: string[]; frases_preferidas?: string[]
  custom_objections?: { gatilho: string; resposta: string }[]
  conversation_examples?: { situacao: string; resposta: string }[]
  clinical_rules?: string[]
}

const assistantSchema = z.object({
  name:                    z.string().min(2, 'Nome obrigatório'),
  tone:                    z.enum(['acolhedor', 'formal', 'descontraido']),
  greeting_message:        z.string().min(10, 'Mensagem muito curta'),
  specialties:             z.string().optional(),
  consultation_modalities: z.string().optional(),
  vacation_mode:           z.boolean().optional(),
  vacation_message:        z.string().optional(),
  farewell_message:        z.string().optional(),
  frases_proibidas:        z.string().optional(),
  frases_preferidas:       z.string().optional(),
  custom_objections:       z.string().optional(),
  conversation_examples:   z.string().optional(),
  clinical_rules:          z.string().optional(),
  nutri_display_name:      z.string().optional(),
  emoji_level:             z.number().min(1).max(5).default(3),
  func_prospeccao:         z.boolean().default(true),
  func_triagem:            z.boolean().default(true),
  func_agendamento:        z.boolean().default(true),
})
type AssistantFormData = z.infer<typeof assistantSchema>

const EMOJI_LABELS: Record<number, string> = {
  1: 'Nenhum', 2: 'Raramente', 3: 'Moderado', 4: 'Frequente', 5: 'Muito'
}

const FUNCOES = [
  { key: 'func_prospeccao'  as const, label: 'Prospecção',  desc: 'Reengaja leads que param de responder' },
  { key: 'func_triagem'     as const, label: 'Triagem',     desc: 'Qualifica pacientes com perguntas de objetivo' },
  { key: 'func_agendamento' as const, label: 'Agendamento', desc: 'Oferece e confirma consultas automaticamente' },
]

const TONES = [
  { value: 'acolhedor',    label: 'Acolhedor',     desc: 'Empático e próximo' },
  { value: 'formal',       label: 'Formal',         desc: 'Profissional e direto' },
  { value: 'descontraido', label: 'Descontraído',   desc: 'Leve e informal' },
]

const MODALITIES = [
  { value: 'online',            label: 'Online' },
  { value: 'presencial',        label: 'Presencial' },
  { value: 'online,presencial', label: 'Ambos' },
]

function TabAssistente() {
  const queryClient = useQueryClient()

  const { data: assistant } = useQuery<Assistant>({
    queryKey: ['assistant'],
    queryFn: async () => { const { data } = await api.get('/api/assistants'); return data.assistant },
  })

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<AssistantFormData>({
    resolver: zodResolver(assistantSchema),
    defaultValues: { tone: 'acolhedor', consultation_modalities: 'online', vacation_mode: false },
  })

  const vacationMode = watch('vacation_mode')

  useEffect(() => {
    if (assistant) {
      reset({
        name:                    assistant.name,
        tone:                    (assistant.tone as any) || 'acolhedor',
        greeting_message:        assistant.greeting_message || '',
        specialties:             assistant.specialties || '',
        consultation_modalities: assistant.consultation_modalities || 'online',
        vacation_mode:           assistant.vacation_mode ?? false,
        vacation_message:        (assistant as any).vacation_message || '',
        farewell_message:        assistant.farewell_message || '',
        frases_proibidas:        (assistant.frases_proibidas || []).join('\n'),
        frases_preferidas:       (assistant.frases_preferidas || []).join('\n'),
        custom_objections:       (assistant.custom_objections || []).map(o => `${o.gatilho} :: ${o.resposta}`).join('\n'),
        conversation_examples:   (assistant.conversation_examples || []).map(e => `${e.situacao} :: ${e.resposta}`).join('\n'),
        clinical_rules:          (assistant.clinical_rules || []).join('\n'),
        nutri_display_name:      (assistant as any).nutri_display_name || '',
        emoji_level:             (assistant as any).emoji_level ?? 3,
        func_prospeccao:         (assistant as any).func_prospeccao  ?? true,
        func_triagem:            (assistant as any).func_triagem     ?? true,
        func_agendamento:        (assistant as any).func_agendamento ?? true,
      })
    }
  }, [assistant, reset])

  async function onSubmit(data: AssistantFormData) {
    try {
      await api.post('/api/assistants', {
        ...data,
        frases_proibidas:  (data.frases_proibidas  || '').split('\n').map(s => s.trim()).filter(Boolean),
        frases_preferidas: (data.frases_preferidas || '').split('\n').map(s => s.trim()).filter(Boolean),
        custom_objections: (data.custom_objections || '').split('\n').map(s => s.trim()).filter(Boolean).map(line => {
          const [gatilho, ...rest] = line.split('::')
          return { gatilho: gatilho.trim(), resposta: rest.join('::').trim() }
        }).filter(o => o.gatilho && o.resposta),
        conversation_examples: (data.conversation_examples || '').split('\n').map(s => s.trim()).filter(Boolean).map(line => {
          const [situacao, ...rest] = line.split('::')
          return { situacao: situacao.trim(), resposta: rest.join('::').trim() }
        }).filter(e => e.situacao && e.resposta),
        clinical_rules: (data.clinical_rules || '').split('\n').map(s => s.trim()).filter(Boolean),
      })
      toast.success('Assistente salva com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['assistant'] })
    } catch {
      toast.error('Erro ao salvar. Tente novamente.')
    }
  }

  const currentModality = watch('consultation_modalities')
  const currentTone     = watch('tone')
  const emojiLevel      = watch('emoji_level') ?? 3

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

      <Field label="Nome da assistente" error={errors.name?.message}>
        <input {...register('name')} placeholder="Ex: Sofia, Lara, Ana..." className="input"
          style={errors.name ? { borderColor: '#EF4444' } : undefined} />
      </Field>

      <Field label="Como o nutricionista deve ser chamado" hint="Se vazio, usa o nome da sua conta.">
        <input {...register('nutri_display_name')} placeholder="Ex: Dr. David, Dra. Ana..." className="input" />
      </Field>

      {/* Tom de voz */}
      <div className="flex flex-col gap-2">
        <label className="field-label">Tom de voz</label>
        <div className="grid grid-cols-3 gap-2">
          {TONES.map(({ value, label, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => setValue('tone', value as any)}
              className="flex flex-col gap-0.5 px-3 py-2.5 rounded-xl text-left transition-all"
              style={currentTone === value
                ? { border: '1.5px solid var(--brand)', background: 'var(--brand-s)' }
                : { border: '1px solid var(--border)', background: 'var(--raised)' }
              }
            >
              <span className="text-[13px] font-medium" style={{ color: currentTone === value ? 'var(--brand)' : 'var(--t1)' }}>{label}</span>
              <span className="text-[11px]" style={{ color: 'var(--t3)' }}>{desc}</span>
            </button>
          ))}
        </div>
      </div>

      <Field label="Mensagem de boas-vindas" hint="Enviada no primeiro contato do cliente" error={errors.greeting_message?.message}>
        <textarea
          {...register('greeting_message')}
          rows={3}
          className="textarea"
          style={errors.greeting_message ? { borderColor: '#EF4444' } : undefined}
        />
      </Field>

      <Field label="Mensagem de despedida" hint="Sugestão de como a assistente encerra a conversa">
        <textarea
          {...register('farewell_message')}
          rows={2}
          placeholder="Ex: Foi um prazer falar com você! Qualquer coisa é só chamar 😊"
          className="textarea"
        />
      </Field>

      <Field label="Frases proibidas" hint="Uma por linha — palavras ou expressões que a assistente nunca deve usar">
        <textarea
          {...register('frases_proibidas')}
          rows={3}
          placeholder={'Ex: garantimos resultado\nbarato'}
          className="textarea"
        />
      </Field>

      <Field label="Frases preferidas" hint="Uma por linha — expressões que combinam com o tom da sua marca">
        <textarea
          {...register('frases_preferidas')}
          rows={3}
          placeholder={'Ex: vamos juntas nessa\nbeleza!'}
          className="textarea"
        />
      </Field>

      <Field label="Objeções personalizadas" hint="Uma por linha, no formato: situação :: resposta. A assistente já tem respostas padrão para preço, hesitação, etc — use isto para casos específicos do seu consultório.">
        <textarea
          {...register('custom_objections')}
          rows={3}
          placeholder={'Ex: Atende plano de saúde? :: Não trabalhamos com convênio, mas emitimos nota para reembolso.'}
          className="textarea"
        />
      </Field>

      <Field label="Exemplos de conversas" hint="Uma por linha, no formato: situação :: resposta ideal. Use para ensinar a assistente a responder do jeito que você prefere em casos específicos.">
        <textarea
          {...register('conversation_examples')}
          rows={3}
          placeholder={'Ex: Paciente pergunta se emagrece rápido :: Cada corpo responde de um jeito, mas com acompanhamento certo os resultados aparecem com consistência. Vamos conversar sobre seu caso?'}
          className="textarea"
        />
      </Field>

      <Field label="Regras clínicas / limites adicionais" hint="Uma por linha — temas ou condutas extras que a assistente deve evitar ou encaminhar para você">
        <textarea
          {...register('clinical_rules')}
          rows={3}
          placeholder={'Ex: Não comentar sobre uso de medicamentos sem indicação médica\nNão sugerir jejum prolongado'}
          className="textarea"
        />
      </Field>

      <Field label="Especialidades" hint="A assistente usará isso para apresentar seu trabalho">
        <textarea
          {...register('specialties')}
          rows={2}
          placeholder="Ex: Emagrecimento, nutrição esportiva, saúde feminina..."
          className="textarea"
        />
      </Field>

      {/* Modalidade */}
      <div className="flex flex-col gap-2">
        <label className="field-label">Formato de consulta</label>
        <div className="flex gap-2">
          {MODALITIES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setValue('consultation_modalities', value)}
              className="px-4 py-2 rounded-xl text-[13px] font-medium transition-all"
              style={currentModality === value
                ? { border: '1.5px solid var(--brand)', background: 'var(--brand-s)', color: 'var(--brand)' }
                : { border: '1px solid var(--border)', color: 'var(--t3)' }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Modo férias */}
      <div
        className="flex flex-col gap-3 rounded-xl p-4 transition-colors"
        style={vacationMode
          ? { border: '1px solid #FDE68A', background: '#FFFBEB' }
          : { border: '1px solid var(--border)' }
        }
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Moon className="w-4 h-4" style={{ color: vacationMode ? '#D97706' : 'var(--t3)' }} />
            <div>
              <p className="text-[13px] font-medium" style={{ color: vacationMode ? '#D97706' : 'var(--t1)' }}>
                Modo férias
              </p>
              <p className="text-[11px]" style={{ color: 'var(--t3)' }}>A assistente pausa o atendimento automático</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setValue('vacation_mode', !vacationMode)}
            className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
            style={{ background: vacationMode ? '#D97706' : 'var(--raised)', border: vacationMode ? 'none' : '1px solid var(--border)' }}
          >
            <span className={cn(
              'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm',
              vacationMode ? 'translate-x-5' : 'translate-x-0'
            )} />
          </button>
        </div>
        {vacationMode && (
          <Field label="Mensagem de ausência" hint="Enviada quando clientes tentam falar com a assistente">
            <textarea
              {...register('vacation_message')}
              rows={2}
              placeholder="Ex: Estamos em férias! Retornamos no dia 10/02. Até breve!"
              className="textarea"
            />
          </Field>
        )}
      </div>

      {/* Slider de emoji */}
      <div className="flex flex-col gap-3 rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium" style={{ color: 'var(--t1)' }}>Uso de emojis</p>
            <p className="text-[11px]" style={{ color: 'var(--t3)' }}>Define a frequência de emojis nas respostas</p>
          </div>
          <span
            className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'var(--brand-s)', color: 'var(--brand)' }}
          >
            {EMOJI_LABELS[emojiLevel]}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] w-14" style={{ color: 'var(--t3)' }}>Nenhum</span>
          <input
            type="range" min={1} max={5} step={1}
            value={emojiLevel}
            onChange={e => setValue('emoji_level', Number(e.target.value))}
            className="flex-1 h-1.5 cursor-pointer"
            style={{ accentColor: 'var(--brand)' }}
          />
          <span className="font-mono text-[10px] w-8" style={{ color: 'var(--t3)' }}>Muito</span>
        </div>
      </div>

      {/* Funções habilitadas */}
      <div className="flex flex-col gap-3 rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}>
        <div>
          <p className="text-[13px] font-medium" style={{ color: 'var(--t1)' }}>Funções habilitadas</p>
          <p className="text-[11px]" style={{ color: 'var(--t3)' }}>Controle o que a assistente pode fazer</p>
        </div>
        {FUNCOES.map(({ key, label, desc }) => {
          const enabled = watch(key) ?? true
          return (
            <div key={key} className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium" style={{ color: enabled ? 'var(--t1)' : 'var(--t3)' }}>{label}</p>
                <p className="text-[11px]" style={{ color: 'var(--t3)' }}>{desc}</p>
              </div>
              <Toggle enabled={enabled} onChange={() => setValue(key, !enabled)} />
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-3 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
        <Btn type="submit" disabled={isSubmitting} className="mt-4">
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar configurações
        </Btn>
      </div>
    </form>
  )
}

// ═══════════════════════════════════════════════════════
// Horário de Funcionamento da IA
// ═══════════════════════════════════════════════════════

const DAYS = [
  { key: 'monday',    label: 'Segunda',  int: 1 },
  { key: 'tuesday',   label: 'Terça',    int: 2 },
  { key: 'wednesday', label: 'Quarta',   int: 3 },
  { key: 'thursday',  label: 'Quinta',   int: 4 },
  { key: 'friday',    label: 'Sexta',    int: 5 },
  { key: 'saturday',  label: 'Sábado',   int: 6 },
  { key: 'sunday',    label: 'Domingo',  int: 0 },
]

const DEFAULT_SCHEDULE: Record<string, { enabled: boolean; start: string; end: string; slot: number }> = {
  monday:    { enabled: true,  start: '08:00', end: '18:00', slot: 60 },
  tuesday:   { enabled: true,  start: '08:00', end: '18:00', slot: 60 },
  wednesday: { enabled: true,  start: '08:00', end: '18:00', slot: 60 },
  thursday:  { enabled: true,  start: '08:00', end: '18:00', slot: 60 },
  friday:    { enabled: true,  start: '08:00', end: '18:00', slot: 60 },
  saturday:  { enabled: false, start: '08:00', end: '12:00', slot: 60 },
  sunday:    { enabled: false, start: '08:00', end: '12:00', slot: 60 },
}

function HorarioFuncionamento() {
  const qc = useQueryClient()

  // 24/7 toggle — loaded from assistant
  const [is24h,            setIs24h]            = useState(false)
  const [outOfHoursMsg,    setOutOfHoursMsg]    = useState('')
  const [savingSettings,   setSavingSettings]   = useState(false)

  // Schedule
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE)
  const [savingSched, setSavingSched] = useState(false)
  const [loaded,      setLoaded]      = useState(false)

  const { data: assistant } = useQuery<any>({
    queryKey: ['assistant'],
    queryFn: async () => { const { data } = await api.get('/api/assistants'); return data.assistant },
    staleTime: 30_000,
  })

  const { data: availabilityData } = useQuery<any[]>({
    queryKey: ['availability'],
    queryFn: async () => { const { data } = await api.get('/api/nutritionists/availability'); return data },
  })

  useEffect(() => {
    if (assistant) {
      setIs24h(assistant.respond_24h ?? false)
      setOutOfHoursMsg(assistant.out_of_hours_message ?? '')
    }
  }, [assistant])

  useEffect(() => {
    if (availabilityData && !loaded) {
      setLoaded(true)
      if (availabilityData.length > 0) {
        const newSchedule = { ...DEFAULT_SCHEDULE }
        Object.keys(newSchedule).forEach(k => { newSchedule[k] = { ...newSchedule[k], enabled: false } })
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        for (const row of availabilityData) {
          const key = dayNames[row.day_of_week]
          if (key) {
            newSchedule[key] = {
              enabled: true,
              start: row.start_time.slice(0, 5),
              end: row.end_time.slice(0, 5),
              slot: row.slot_duration || 60,
            }
          }
        }
        setSchedule(newSchedule)
      }
    }
  }, [availabilityData, loaded])

  function toggleDay(day: string) {
    setSchedule(prev => ({ ...prev, [day]: { ...prev[day], enabled: !prev[day].enabled } }))
  }

  function setField(day: string, field: string, value: string | number) {
    setSchedule(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }))
  }

  async function save24hSettings() {
    setSavingSettings(true)
    try {
      await api.put('/api/assistants', {
        name:                 assistant?.name ?? '',
        tone:                 assistant?.tone ?? '',
        greeting_message:     assistant?.greeting_message ?? '',
        respond_24h:          is24h,
        out_of_hours_message: outOfHoursMsg.trim() || null,
      })
      toast.success('Configurações de horário salvas!')
      qc.invalidateQueries({ queryKey: ['assistant'] })
    } catch {
      toast.error('Erro ao salvar.')
    } finally {
      setSavingSettings(false)
    }
  }

  async function saveSchedule() {
    setSavingSched(true)
    try {
      const entries = DAYS
        .filter(({ key }) => schedule[key].enabled)
        .map(({ key, int }) => ({
          day_of_week:   int,
          start_time:    schedule[key].start,
          end_time:      schedule[key].end,
          slot_duration: schedule[key].slot,
        }))
      await api.put('/api/nutritionists/availability', entries)
      toast.success('Horários salvos com sucesso!')
    } catch {
      toast.error('Erro ao salvar horários.')
    } finally {
      setSavingSched(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">

      {/* 24/7 Toggle */}
      <div
        className="flex items-center justify-between rounded-xl px-5 py-4 transition-colors"
        style={is24h
          ? { background: 'var(--brand-s)', border: '1px solid rgba(0,194,124,.25)' }
          : { border: '1px solid var(--border)' }
        }
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: is24h ? 'rgba(0,194,124,.15)' : 'var(--raised)' }}
          >
            <Sun className="w-4 h-4" style={{ color: is24h ? 'var(--brand)' : 'var(--t3)' }} />
          </div>
          <div>
            <p className="text-[13px] font-semibold" style={{ color: is24h ? 'var(--brand)' : 'var(--t1)' }}>
              Disponível 24 horas por dia, 7 dias por semana
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--t3)' }}>
              {is24h
                ? 'A IA responde a qualquer hora, sem restrição de horário'
                : 'A IA responde apenas nos horários configurados abaixo'}
            </p>
          </div>
        </div>
        <Toggle enabled={is24h} onChange={() => setIs24h(v => !v)} />
      </div>

      {/* Schedule grid — hidden when 24/7 ON */}
      {!is24h && (
        <div className="flex flex-col gap-2">
          <p className="text-[12px]" style={{ color: 'var(--t2)' }}>
            Defina quando a assistente pode agendar consultas fora deste horário ela não oferecerá agendamento automático.
          </p>
          {DAYS.map(({ key, label }) => {
            const day = schedule[key]
            return (
              <div
                key={key}
                className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors"
                style={day.enabled
                  ? { border: '1px solid rgba(0,194,124,.2)', background: 'var(--brand-s)' }
                  : { border: '1px solid var(--border)' }
                }
              >
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={() => toggleDay(key)}
                  className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
                  style={day.enabled
                    ? { background: 'var(--brand)', border: '2px solid var(--brand)' }
                    : { background: 'transparent', border: '2px solid var(--border)' }
                  }
                >
                  {day.enabled && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <span className="text-[13px] font-medium w-20" style={{ color: day.enabled ? 'var(--t1)' : 'var(--t3)' }}>
                  {label}
                </span>
                {day.enabled && (
                  <div className="flex items-center gap-2 ml-auto flex-wrap">
                    <input
                      type="time"
                      value={day.start}
                      onChange={e => setField(key, 'start', e.target.value)}
                      className="text-[13px] rounded-lg px-2 py-1.5 focus:outline-none"
                      style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--t1)' }}
                    />
                    <span className="text-[12px]" style={{ color: 'var(--t3)' }}>até</span>
                    <input
                      type="time"
                      value={day.end}
                      onChange={e => setField(key, 'end', e.target.value)}
                      className="text-[13px] rounded-lg px-2 py-1.5 focus:outline-none"
                      style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--t1)' }}
                    />
                    <select
                      value={day.slot}
                      onChange={e => setField(key, 'slot', Number(e.target.value))}
                      className="text-[13px] rounded-lg px-2 py-1.5 focus:outline-none"
                      style={{ border: '1px solid var(--border)', background: 'var(--raised)', color: 'var(--t2)' }}
                    >
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>1h</option>
                      <option value={90}>1h30</option>
                    </select>
                  </div>
                )}
              </div>
            )
          })}
          <Btn
            type="button"
            variant="secondary"
            onClick={saveSchedule}
            disabled={savingSched}
            className="w-fit mt-1"
          >
            {savingSched ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar horários
          </Btn>
        </div>
      )}

      {/* Mensagem fora do horário */}
      <div className="rounded-xl p-4 flex flex-col gap-3" style={{ border: '1px solid var(--border)' }}>
        <div>
          <p className="text-[13px] font-medium" style={{ color: 'var(--t1)' }}>
            Mensagem fora do horário
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--t3)' }}>
            Enviada quando alguém manda mensagem fora do horário de funcionamento.
            Use <code className="font-mono text-[11px]" style={{ color: 'var(--brand)' }}>{'{nome}'}</code> para o nome do contato.
          </p>
        </div>
        <textarea
          value={outOfHoursMsg}
          onChange={e => setOutOfHoursMsg(e.target.value)}
          rows={3}
          placeholder="Ex: Olá {nome}! Nosso atendimento funciona de seg–sex das 8h às 18h. Retornaremos em breve! 🌿"
          className="textarea"
        />
      </div>

      <Btn
        type="button"
        onClick={save24hSettings}
        disabled={savingSettings}
        className="w-fit"
      >
        {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Salvar configurações de horário
      </Btn>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// Testar Atendimento
// ═══════════════════════════════════════════════════════

type TestMessage = { role: 'user' | 'assistant'; content: string; action?: any }

const SUGGESTED_MESSAGES = [
  'Oi, quero saber mais sobre a consulta',
  'Quero emagrecer',
  'Quanto custa?',
  'Achei caro',
  'Me passa uma dieta?',
  'Tenho um exame alterado',
  'Quero remarcar minha consulta',
  'Pode atender online?',
]

function TestarAtendimentoSection() {
  const [messages, setMessages] = useState<TestMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [resetting, setResetting] = useState(false)

  async function sendMessage(text: string) {
    const content = text.trim()
    if (!content || sending) return

    const history = messages.map(({ role, content }) => ({ role, content }))
    setMessages(m => [...m, { role: 'user', content }])
    setInput('')
    setSending(true)
    try {
      const { data } = await api.post('/api/assistants/test', {
        message: content,
        history,
      })
      setMessages(m => [...m, { role: 'assistant', content: data.response, action: data.action }])
    } catch {
      toast.error('Erro ao testar atendimento. Tente novamente.')
      setMessages(m => m.slice(0, -1))
    } finally {
      setSending(false)
    }
  }

  async function handleReset() {
    setResetting(true)
    try {
      await api.post('/api/assistants/test', { message: 'reset', reset: true })
      setMessages([])
      toast.success('Conversa de teste reiniciada.')
    } catch {
      toast.error('Erro ao reiniciar conversa de teste.')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--brand-s-solid)', border: '1px solid rgba(0,194,124,.2)' }}
          >
            <PlayCircle className="w-4.5 h-4.5" style={{ color: 'var(--brand)' }} />
          </div>
          <div>
            <h3 className="font-bold text-[15px] tracking-tight" style={{ color: 'var(--t1)' }}>
              Simule uma conversa
            </h3>
            <p className="text-[12px] mt-0.5 max-w-md" style={{ color: 'var(--t3)' }}>
              Converse com a sua assistente como se fosse um paciente, usando o
              treinamento e as configurações salvas. Nada aqui é enviado pelo WhatsApp.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleReset}
          disabled={resetting || messages.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors flex-shrink-0 disabled:opacity-50"
          style={{ border: '1px solid var(--border)', color: 'var(--t2)' }}
        >
          {resetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
          Reiniciar
        </button>
      </div>

      {/* Mensagens sugeridas */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_MESSAGES.map(msg => (
            <button
              key={msg}
              type="button"
              onClick={() => sendMessage(msg)}
              className="px-3 py-1.5 rounded-full text-[12px] transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--t2)' }}
            >
              {msg}
            </button>
          ))}
        </div>
      )}

      {/* Janela de chat */}
      <div
        className="rounded-xl flex flex-col"
        style={{ background: 'var(--raised)', border: '1px solid var(--border)', minHeight: 320 }}
      >
        <div className="flex-1 p-4 space-y-3 overflow-y-auto" style={{ maxHeight: 420 }}>
          {messages.length === 0 && !sending && (
            <div className="h-full flex flex-col items-center justify-center text-center py-10 gap-2">
              <Bot className="w-7 h-7" style={{ color: 'var(--t3)' }} />
              <p className="text-[12px]" style={{ color: 'var(--t3)' }}>
                Envie uma mensagem para começar a simulação
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={cn('flex gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              {m.role === 'assistant' && (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--brand-s-solid)' }}
                >
                  <Bot className="w-3.5 h-3.5" style={{ color: 'var(--brand)' }} />
                </div>
              )}
              <div className="max-w-[75%] space-y-1">
                <div
                  className="px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap"
                  style={{
                    background: m.role === 'user' ? 'var(--brand)' : 'var(--surface)',
                    color: m.role === 'user' ? '#fff' : 'var(--t1)',
                    border: m.role === 'user' ? 'none' : '1px solid var(--border)',
                  }}
                >
                  {m.content}
                </div>
                {m.action && (
                  <div
                    className="px-3 py-1.5 rounded-lg text-[11px] flex items-center gap-1.5"
                    style={{ background: 'var(--brand-s-solid)', color: 'var(--brand)' }}
                  >
                    <CheckCircle className="w-3 h-3" />
                    Ação detectada: {typeof m.action === 'string' ? m.action : JSON.stringify(m.action)}
                  </div>
                )}
              </div>
              {m.role === 'user' && (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <User className="w-3.5 h-3.5" style={{ color: 'var(--t3)' }} />
                </div>
              )}
            </div>
          ))}

          {sending && (
            <div className="flex gap-2 justify-start">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--brand-s-solid)' }}
              >
                <Bot className="w-3.5 h-3.5" style={{ color: 'var(--brand)' }} />
              </div>
              <div
                className="px-3.5 py-2.5 rounded-2xl flex items-center"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--t3)' }} />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 p-3" style={{ borderTop: '1px solid var(--border)' }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
            placeholder="Digite como se fosse o paciente..."
            disabled={sending}
            className="flex-1 px-3.5 py-2.5 rounded-lg text-[13px] outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--t1)' }}
          />
          <button
            type="button"
            onClick={() => sendMessage(input)}
            disabled={sending || !input.trim()}
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-opacity disabled:opacity-40"
            style={{ background: 'var(--brand)' }}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════

const TRAINING_TABS = [
  { id: 'manual',    label: 'Manual',      icon: FileText },
  { id: 'automacoes',label: 'Automações',  icon: Clock },
  { id: 'testar',    label: 'Testar atendimento', icon: PlayCircle },
]

const V4_TABS = [
  { id: 'identidade',  label: 'Identidade',         icon: Bot },
  { id: 'conhecimento',label: 'Conhecimento',        icon: BookOpen },
  { id: 'automacoes',  label: 'Automações',          icon: Clock },
  { id: 'horarios',    label: 'Horários',            icon: Clock },
  { id: 'testar',      label: 'Testar assistente',   icon: PlayCircle },
  { id: 'desempenho',  label: 'Desempenho',          icon: Brain },
] as const
type V4Tab = typeof V4_TABS[number]['id']

export default function TreinamentoPage() {
  const [tab, setTab] = useState<V4Tab>('identidade')

  const { data: convStats } = useQuery<any>({
    queryKey: ['conversations-stats'],
    queryFn: async () => { const { data } = await api.get('/api/conversations/stats'); return data.stats },
    staleTime: 30_000,
  })

  return (
    <V4Page
      eyebrow="Inteligência do consultório"
      title="Assistente IA"
      subtitle="Treine, teste e acompanhe a recepção comercial da sua assistente."
      actions={
        <>
          <AIPowerToggleBadge />
          <V4Button onClick={() => setTab('testar')}>
            <PlayCircle className="h-4 w-4" />Testar no playground
          </V4Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
        {/* Nav lateral */}
        <V4Card className="h-max p-2">
          {V4_TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'mb-1 flex w-full rounded-[10px] px-3 py-2 text-left text-[13px] font-medium transition',
                tab === id
                  ? 'bg-[var(--brand-s)] text-[var(--brand)]'
                  : 'text-t2 hover:bg-[var(--raised)]'
              )}
            >
              {label}
            </button>
          ))}
        </V4Card>

        {/* Conteúdo */}
        <V4CardPad className="min-h-[480px]">
          {tab === 'identidade'   && <TabAssistente />}
          {tab === 'conhecimento' && <ManualSection />}
          {tab === 'automacoes'   && <AutomacoesSection />}
          {tab === 'horarios'     && <HorarioFuncionamento />}
          {tab === 'testar'       && <TestarAtendimentoSection />}
          {tab === 'desempenho'   && (
            <div className="space-y-4">
              <div>
                <div className="text-[15px] font-medium text-t1">Desempenho da assistente</div>
                <p className="mt-1 text-[13px] text-t3">Métricas em tempo real da IA no seu consultório.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <V4Metric label="Conversas ativas" value={convStats?.active ?? 0} foot="Aguardando resposta" />
                <V4Metric label="Agendamentos via IA" value={convStats?.agendou ?? 0} foot="Total" tone="good" />
                <V4Metric label="Vendas via IA" value={convStats?.comprou ?? 0} foot="Total" tone="good" />
                <V4Metric label="Mensagens enviadas" value={convStats?.ai_messages ?? 0} foot="Pela IA" />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <V4Metric label="Resolvidas" value={convStats?.resolved ?? 0} foot="Total" />
                <V4Metric label="Sem retorno" value={convStats?.sem_resposta ?? 0} foot="Total" tone={convStats?.sem_resposta > 0 ? 'warn' : 'default'} />
                <V4Metric label="Intervenção humana" value={convStats?.human_takeover ?? 0} foot="Precisaram de você" tone={convStats?.human_takeover > 0 ? 'warn' : 'default'} />
              </div>
            </div>
          )}
        </V4CardPad>
      </div>
    </V4Page>
  )
}

function AIPowerToggleBadge() {
  const [paused, setPaused] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data: assistant } = useQuery<any>({
    queryKey: ['assistant'],
    queryFn: async () => { const { data } = await api.get('/api/assistants'); return data.assistant },
    staleTime: 30_000,
  })

  useEffect(() => {
    if (assistant) setPaused(assistant.ai_paused ?? false)
  }, [assistant])

  async function toggle() {
    setSaving(true)
    try {
      const next = !paused
      await api.patch('/api/assistants/toggle-ai', { paused: next })
      setPaused(next)
      toast.success(next ? 'IA desativada.' : 'IA ativada!')
    } catch { toast.error('Erro ao alterar.') }
    finally { setSaving(false) }
  }

  return (
    <button
      onClick={toggle}
      disabled={saving}
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium transition disabled:opacity-50"
      style={paused
        ? { borderColor: 'color-mix(in srgb, var(--danger) 28%, transparent)', background: 'color-mix(in srgb, var(--danger) 10%, transparent)', color: 'var(--danger)' }
        : { borderColor: 'var(--brand-ring)', background: 'var(--brand-s)', color: 'var(--brand)' }
      }
    >
      <Power className="h-3.5 w-3.5" />
      {paused ? 'IA pausada — reativar' : 'IA ativa'}
    </button>
  )
}
