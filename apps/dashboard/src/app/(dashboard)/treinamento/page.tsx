'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Upload, Trash2, CheckCircle, MessageSquare,
  ArrowRight, ArrowLeft, FileText, Edit3,
  Zap, Plus, GripVertical, Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

// ─── Chip Selector ────────────────────────────────────────────────
function ChipSelector({ options, selected, onChange, single = false }: {
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
  single?: boolean
}) {
  const toggle = (opt: string) => {
    if (single) onChange(selected[0] === opt ? [] : [opt])
    else onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt])
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => toggle(opt)}
          className={cn(
            'px-3 py-1 rounded-full text-xs border transition-colors',
            selected.includes(opt)
              ? 'bg-brand-500/20 border-brand-500/40 text-brand-500'
              : 'border-theme text-t2 hover:border-brand-500/30 hover:text-t1'
          )}
          style={{ borderColor: selected.includes(opt) ? undefined : 'var(--border)' }}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

// ─── Interview Mode ───────────────────────────────────────────────
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
      { value: 'qualify',    label: 'Qualifica e nutre o lead',    desc: 'Entende o objetivo, apresenta o serviço e mantém o interesse aquecido' },
      { value: 'close',      label: 'Conduz ao fechamento',         desc: 'Foca em converter o contato em consulta agendada o mais rápido possível' },
      { value: 'reactivate', label: 'Reativa e não perde venda',    desc: 'Acompanha quem não respondeu e faz follow-up estratégico' },
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
      <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
        <MessageSquare className="w-6 h-6 text-brand-500" />
      </div>
      <div>
        <h3 className="font-display font-bold text-[17px] tracking-tight text-t1 mb-2">Entrevista de treinamento</h3>
        <p className="text-sm text-t2 max-w-xs leading-relaxed mx-auto">
          5 perguntas para a assistente entender como você trabalha. Responda como você mesmo falaria.
        </p>
      </div>
      <Button onClick={() => setStage('q')}>
        Começar <ArrowRight className="w-3.5 h-3.5" />
      </Button>
    </div>
  )

  if (stage === 'review') return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <div>
          <p className="text-[12px] font-semibold text-emerald-400">Entrevista concluída</p>
          <p className="text-[11px] text-t2 mt-0.5">Revise o conteúdo antes de salvar</p>
        </div>
      </div>
      <textarea
        value={compiled} readOnly rows={13}
        className="w-full rounded-xl px-4 py-3 text-[12px] text-t2 resize-none leading-relaxed font-mono"
        style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
      />
      <div className="flex items-center gap-3">
        <Button onClick={save} loading={saving}>Salvar treinamento</Button>
        <Button variant="ghost" onClick={back}><ArrowLeft className="w-3.5 h-3.5" /> Ajustar</Button>
        <Button variant="ghost" onClick={() => { setStage('intro'); setQi(0); setAns({}) }}>Refazer</Button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="font-mono text-[10px] text-t3 tracking-wider">PERGUNTA {qi + 1} DE {total}</span>
          <span className="font-mono text-[10px] text-t3">{pct}%</span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--raised)' }}>
          <div className="h-full rounded-full bg-brand-500 transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div>
        <h3 className="font-display font-bold text-[17px] tracking-tight text-t1 leading-snug">{q.question}</h3>
        {q.hint && <p className="text-xs text-t3 mt-1">{q.hint}</p>}
      </div>

      {q.type === 'textarea' && (
        <textarea
          value={ans[qi] || ''} rows={6} autoFocus
          onChange={e => setAns(a => ({ ...a, [qi]: e.target.value }))}
          placeholder={(q as any).placeholder}
          className="w-full rounded-xl px-4 py-3 text-sm text-t1 resize-none leading-relaxed"
          style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
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
                  className={cn(
                    'px-3.5 py-2 rounded-xl text-sm border transition-all',
                    sel ? 'bg-brand-500/15 border-brand-500/40 text-brand-500' : 'text-t2 hover:text-t1 hover:bg-raised'
                  )}
                  style={{ borderColor: sel ? undefined : 'var(--border)' }}
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
            className="w-full rounded-xl px-4 py-3 text-sm text-t1 resize-none leading-relaxed"
            style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
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
                className={cn(
                  'w-full flex items-start gap-4 px-4 py-3.5 rounded-xl border text-left transition-all',
                  sel ? 'bg-brand-500/10 border-brand-500/40' : 'hover:bg-raised'
                )}
                style={{ borderColor: sel ? undefined : 'var(--border)' }}
              >
                <div className={cn('w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center', sel ? 'border-brand-500' : 'border-t3')}>
                  {sel && <div className="w-2 h-2 rounded-full bg-brand-500" />}
                </div>
                <div>
                  <p className={cn('text-sm font-semibold', sel ? 'text-brand-500' : 'text-t1')}>{chip.label}</p>
                  <p className="text-xs text-t2 mt-0.5">{chip.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <Button variant="ghost" size="sm" onClick={back}><ArrowLeft className="w-3.5 h-3.5" /> Anterior</Button>
        <Button size="sm" onClick={next} disabled={!canNext()}>
          {qi === total - 1 ? 'Ver resultado' : 'Próxima'} <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ─── Template padrão ─────────────────────────────────────────────
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

[Descreva em 2-3 frases o que te diferencia. Ex:]
"Trabalho com reeducação alimentar sem dietas restritivas. Meu foco é ensinar o paciente a se relacionar bem com a comida, sem culpa e sem sofrimento."

---

## MEU PÚBLICO IDEAL

Atendo principalmente:
- [Perfil 1: ex: mulheres entre 25-45 anos que querem emagrecer sem sofrimento]
- [Perfil 2: ex: pessoas com síndrome metabólica ou diabetes tipo 2]
- [Perfil 3: ex: atletas amadores que querem melhorar performance]

---

## PERGUNTAS FREQUENTES — RESPOSTAS EXATAS

**P: Quanto custa a consulta?**
R: [Ex: "O valor é R$ X. Inclui consulta + plano alimentar personalizado."]

**P: Quanto tempo dura a consulta?**
R: "A primeira consulta dura aproximadamente [X] minutos."

**P: Como funciona o primeiro atendimento?**
R: "[Descreva: ex: Fazemos anamnese alimentar, análise de exames e você sai com o plano no mesmo dia.]"

**P: Aceita plano de saúde?**
R: "[Sim/Não]"

---

## SITUAÇÕES ESPECIAIS

### Quando o cliente mencionar ansiedade ou compulsão alimentar:
Valide o sentimento primeiro, DEPOIS ofereça a consulta.
Ex: "Isso é muito mais comum do que as pessoas imaginam, e tem solução. A [Seu Nome] tem muita experiência com isso."

### Quando o cliente disser que não tem dinheiro:
Ex: "Entendo! Temos opção de parcelamento — quer que eu verifique?"

---

## O QUE A ASSISTENTE NUNCA DEVE FAZER

- Nunca dar diagnósticos ou prescrever dietas pelo WhatsApp
- Nunca prometer resultados específicos (ex: "você vai perder 10kg")
- Nunca confirmar horário sem ter horário real disponível
- [Adicione suas regras aqui]

---

## O QUE A ASSISTENTE SEMPRE DEVE ENFATIZAR

- [Seu maior diferencial]
- [Seu método ou abordagem única]
- [O que os pacientes mais elogiam em você]`

// ─── PDF / Manual Section ─────────────────────────────────────────
function ManualSection() {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'choose' | 'editor' | 'pdf'>('choose')
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
    if (manualData?.content) {
      setContent(manualData.content)
      setMode('editor')
    } else if (assistant?.pdf_filename) {
      setMode('pdf')
    }
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
      setContent('')
      setMode('choose')
      toast.success('Manual removido.')
      queryClient.invalidateQueries({ queryKey: ['assistant'] })
      queryClient.invalidateQueries({ queryKey: ['manual-content'] })
    } catch {
      toast.error('Erro ao remover.')
    }
  }

  // Tela inicial (sem manual configurado)
  if (mode === 'choose') return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-t1">Manual de instruções</h3>
        <p className="text-xs text-t2 mt-0.5">
          Ensine a assistente como você trabalha, seus diferenciais e como responder clientes.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => { setContent(TEMPLATE_DEFAULT); setMode('editor') }}
          className="flex flex-col items-start gap-2 p-4 rounded-xl border text-left hover:bg-raised transition-colors"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
            <Edit3 className="w-4 h-4 text-brand-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-t1">Editar no sistema</p>
            <p className="text-xs text-t3 mt-0.5">Preencha o template direto aqui</p>
          </div>
        </button>
        <button
          onClick={() => setMode('pdf')}
          className="flex flex-col items-start gap-2 p-4 rounded-xl border text-left hover:bg-raised transition-colors"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="w-8 h-8 rounded-lg bg-t3/10 flex items-center justify-center">
            <Upload className="w-4 h-4 text-t3" />
          </div>
          <div>
            <p className="text-sm font-medium text-t1">Enviar PDF</p>
            <p className="text-xs text-t3 mt-0.5">Faça upload de um arquivo PDF</p>
          </div>
        </button>
      </div>
    </div>
  )

  // Editor de texto
  if (mode === 'editor') return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-t1">Manual de instruções</h3>
          <p className="text-xs text-t2 mt-0.5">
            Preencha as informações do consultório. A assistente vai usar este conteúdo para atender.
          </p>
        </div>
        <button
          onClick={handleDelete}
          className="flex items-center gap-1 text-xs text-t3 hover:text-red-400 transition-colors flex-shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Limpar
        </button>
      </div>

      {content && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-emerald-500/10 border-emerald-500/20 text-xs text-emerald-500">
          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
          Manual configurado — assistente usando estas instruções
        </div>
      )}

      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        rows={20}
        placeholder="Preencha as instruções do consultório..."
        className="w-full rounded-xl px-4 py-3 text-[13px] text-t1 resize-none leading-relaxed font-mono placeholder:text-t3 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
      />

      <div className="flex items-center gap-3">
        <Button onClick={handleSaveManual} loading={saving} disabled={!content.trim()}>
          Salvar manual
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setMode('pdf')}>
          <Upload className="w-3.5 h-3.5" /> Ou enviar PDF
        </Button>
      </div>
    </div>
  )

  // Upload PDF
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-t1">Manual de instruções (PDF)</h3>
          <p className="text-xs text-t2 mt-0.5">
            Envie um PDF com seu protocolo, perguntas frequentes e como você atende.
          </p>
        </div>
        <button
          onClick={() => { setContent(TEMPLATE_DEFAULT); setMode('editor') }}
          className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors flex-shrink-0"
        >
          <Edit3 className="w-3.5 h-3.5" />
          Editar no sistema
        </button>
      </div>

      {assistant?.pdf_filename ? (
        <div className="flex items-center gap-3 p-3 bg-brand-500/10 border border-brand-500/20 rounded-lg">
          <FileText className="w-4 h-4 text-brand-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-brand-400 truncate">{assistant.pdf_filename}</p>
            <p className="text-xs text-brand-500/60">PDF ativo</p>
          </div>
          <Button variant="danger" size="sm" onClick={handleDelete}>
            <Trash2 className="w-3.5 h-3.5" /> Remover
          </Button>
        </div>
      ) : (
        <div className="border-2 border-dashed rounded-lg p-5 text-center hover:bg-raised transition-colors" style={{ borderColor: 'var(--border)' }}>
          <Upload className="w-6 h-6 text-t3 mx-auto mb-2" />
          <input type="file" accept=".pdf" className="hidden" id="pdf-upload" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
          <label htmlFor="pdf-upload" className="cursor-pointer text-sm text-brand-400 font-medium hover:text-brand-300 transition-colors">
            Selecionar PDF
          </label>
          <p className="text-xs text-t3 mt-1">Até 10 MB</p>
        </div>
      )}

      {pdfFile && (
        <div className="flex items-center gap-3">
          <p className="text-sm text-t2 flex-1 truncate">{pdfFile.name}</p>
          <Button size="sm" onClick={handleUploadPdf} loading={uploading}>Enviar</Button>
        </div>
      )}
    </div>
  )
}

// ─── Automações Section ───────────────────────────────────────────────────────
interface FollowupStep {
  id?: string
  step_order: number
  delay_hours: number
  message: string
  is_active?: boolean
}

function AutomacoesSection() {
  const queryClient = useQueryClient()

  // ── Assistant (pos_consulta, retorno) ──
  const { data: assistant } = useQuery<any>({
    queryKey: ['assistant'],
    queryFn: async () => { const { data } = await api.get('/api/assistants'); return data.assistant },
  })

  const [posConsulta,       setPosConsulta]       = useState('')
  const [retornoMsg,        setRetornoMsg]         = useState('')
  const [retornoDays,       setRetornoDays]        = useState(30)
  const [savingAssistant,   setSavingAssistant]    = useState(false)

  useEffect(() => {
    if (!assistant) return
    setPosConsulta(assistant.pos_consulta_message ?? '')
    setRetornoMsg(assistant.retorno_message ?? '')
    setRetornoDays(assistant.retorno_days ?? 30)
  }, [assistant])

  async function saveAssistantFields() {
    setSavingAssistant(true)
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
      setSavingAssistant(false)
    }
  }

  // ── Follow-up sequences ──
  const { data: seqData, isLoading: seqLoading } = useQuery<any>({
    queryKey: ['followup-sequences'],
    queryFn: async () => { const { data } = await api.get('/api/followup-sequences'); return data },
  })

  const [steps, setSteps] = useState<FollowupStep[]>([])

  useEffect(() => {
    if (seqData?.sequences) setSteps(seqData.sequences)
  }, [seqData])

  async function addStep() {
    const newStep = {
      step_order: steps.length + 1,
      delay_hours: 24,
      message: '',
    }
    try {
      const { data } = await api.post('/api/followup-sequences', newStep)
      setSteps(prev => [...prev, data.sequence])
      toast.success('Etapa adicionada!')
    } catch {
      toast.error('Erro ao adicionar etapa.')
    }
  }

  async function updateStep(index: number, field: keyof FollowupStep, value: any) {
    const step = steps[index]
    const updated = { ...step, [field]: value }
    setSteps(prev => prev.map((s, i) => i === index ? updated : s))
    if (!step.id) return
    try {
      await api.put(`/api/followup-sequences/${step.id}`, { [field]: value })
    } catch {
      toast.error('Erro ao salvar etapa.')
    }
  }

  async function removeStep(index: number) {
    const step = steps[index]
    if (step.id) {
      try {
        await api.delete(`/api/followup-sequences/${step.id}`)
      } catch {
        toast.error('Erro ao remover etapa.')
        return
      }
    }
    setSteps(prev => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, step_order: i + 1 })))
    toast.success('Etapa removida.')
    queryClient.invalidateQueries({ queryKey: ['followup-sequences'] })
  }

  return (
    <div className="space-y-8">

      {/* Follow-up por etapas */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-t1 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-brand-500" />
            Follow-up automático
          </h3>
          <p className="text-xs text-t2 mt-1 leading-relaxed">
            Sequência de mensagens enviadas quando o lead para de responder.
            Cada etapa tem seu próprio delay. Use <code className="text-brand-400 font-mono">{'{nome}'}</code> para o nome do cliente.
          </p>
        </div>

        {seqLoading ? (
          <div className="text-xs text-t3">Carregando...</div>
        ) : (
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div
                key={step.id ?? `new-${i}`}
                className="rounded-xl border p-4 space-y-3"
                style={{ borderColor: 'var(--border)', background: 'var(--raised)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-3.5 h-3.5 text-t3" />
                    <span className="text-xs font-mono text-brand-500 font-semibold">Etapa {i + 1}</span>
                  </div>
                  <button onClick={() => removeStep(i)} className="text-t3 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs text-t2 flex-shrink-0">Enviar após</label>
                  <input
                    type="number" min={0.5} step={0.5}
                    value={step.delay_hours}
                    onChange={e => updateStep(i, 'delay_hours', Number(e.target.value))}
                    className="w-20 rounded-lg px-3 py-1.5 text-sm text-t1 text-center focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                  />
                  <span className="text-xs text-t2">horas sem resposta</span>
                </div>

                <textarea
                  value={step.message}
                  onChange={e => updateStep(i, 'message', e.target.value)}
                  rows={3}
                  placeholder={`Mensagem da etapa ${i + 1}...`}
                  className="w-full rounded-lg px-3 py-2 text-sm text-t1 resize-none leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                />
              </div>
            ))}

            <button
              onClick={addStep}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed text-xs text-t3 hover:text-t2 hover:border-brand-500/30 transition-colors"
              style={{ borderColor: 'var(--border)' }}
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
          <h3 className="text-sm font-semibold text-t1 flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-brand-500" />
            Mensagem pós-consulta
          </h3>
          <p className="text-xs text-t2 mt-1">
            Enviada automaticamente ~3h após a consulta. Use <code className="text-brand-400 font-mono">{'{nome}'}</code> para o nome do paciente.
          </p>
        </div>
        <textarea
          value={posConsulta}
          onChange={e => setPosConsulta(e.target.value)}
          rows={4}
          placeholder="Olá {nome}! 🌿 Espero que sua consulta tenha sido ótima! Qualquer dúvida é só falar. 😊"
          className="w-full rounded-xl px-4 py-3 text-sm text-t1 resize-none leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
        />
      </div>

      <div style={{ borderTop: '1px solid var(--border)' }} />

      {/* Retorno */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-t1 flex items-center gap-2">
            <ArrowRight className="w-3.5 h-3.5 text-brand-500" />
            Mensagem de retorno
          </h3>
          <p className="text-xs text-t2 mt-1">
            Enviada para pacientes que fizeram consulta e <strong>não remarcaram</strong> após X dias.
            Use <code className="text-brand-400 font-mono">{'{nome}'}</code> e <code className="text-brand-400 font-mono">{'{dias}'}</code>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-t2 flex-shrink-0">Enviar após</label>
          <input
            type="number" min={1} max={365}
            value={retornoDays}
            onChange={e => setRetornoDays(Number(e.target.value))}
            className="w-20 rounded-lg px-3 py-1.5 text-sm text-t1 text-center focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
          />
          <span className="text-xs text-t2">dias da última consulta</span>
        </div>

        <textarea
          value={retornoMsg}
          onChange={e => setRetornoMsg(e.target.value)}
          rows={4}
          placeholder="Olá {nome}! 😊 Faz {dias} dias desde nossa última consulta. Que tal agendarmos seu retorno? 🌱"
          className="w-full rounded-xl px-4 py-3 text-sm text-t1 resize-none leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
        />
      </div>

      <Button onClick={saveAssistantFields} loading={savingAssistant}>
        Salvar automações
      </Button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────
const TABS = [
  { id: 'interview',  label: 'Entrevista',  icon: MessageSquare },
  { id: 'pdf',        label: 'Manual',      icon: FileText },
]

export default function TreinamentoPage() {
  const [activeTab, setActiveTab] = useState('interview')

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display font-bold text-[22px] tracking-tight text-t1">Treinamento</h1>
        <p className="text-sm text-t2 mt-0.5">Ensine à assistente como você trabalha e atende seus pacientes</p>
      </div>

      <Card>
        <div className="px-6" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex gap-0.5 overflow-x-auto">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-3.5 text-[12px] font-mono border-b-2 transition-all duration-150 -mb-px whitespace-nowrap tracking-wide',
                  activeTab === id ? 'border-brand-500 text-brand-500' : 'border-transparent text-t3 hover:text-t2'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <CardContent className="py-6">
          {activeTab === 'interview'  && <InterviewMode onSaved={() => setActiveTab('pdf')} />}
          {activeTab === 'pdf'        && <ManualSection />}
        </CardContent>
      </Card>
    </div>
  )
}
