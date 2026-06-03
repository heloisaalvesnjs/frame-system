'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Upload, Trash2, CheckCircle, MessageSquare,
  ArrowRight, ArrowLeft, ChevronDown, ChevronUp, BookOpen,
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

// ─── Treinamento Form ─────────────────────────────────────────────
function TreinamentoForm() {
  const queryClient = useQueryClient()
  const [openSection, setOpenSection] = useState<string | null>('identidade')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [activeSource, setActiveSource] = useState<'form' | 'pdf' | null>(null)

  const [especialidades, setEspecialidades] = useState<string[]>([])
  const [modalidade,     setModalidade]     = useState<string[]>([])
  const [experiencia,    setExperiencia]    = useState<string[]>([])
  const [faixaEtaria,    setFaixaEtaria]    = useState<string[]>([])
  const [objetivos,      setObjetivos]      = useState<string[]>([])
  const [sempre,         setSempre]         = useState<string[]>([])
  const [nunca,          setNunca]          = useState<string[]>([])
  const [nomeTitulo,     setNomeTitulo]     = useState('')
  const [diferencial,    setDiferencial]    = useState('')
  const [resultados,     setResultados]     = useState('')
  const [faq,            setFaq]            = useState('')
  const [instrExtras,    setInstrExtras]    = useState('')

  const { data: assistant } = useQuery<any>({
    queryKey: ['assistant'],
    queryFn: async () => { const { data } = await api.get('/api/assistants'); return data.assistant },
  })

  const { data: formData, isLoading } = useQuery<any>({
    queryKey: ['training-form'],
    queryFn: async () => { const { data } = await api.get('/api/assistants/training-form'); return data.form },
  })

  useEffect(() => {
    if (!formData) {
      if (assistant?.pdf_filename) setActiveSource('pdf')
      return
    }
    if (formData.nome_titulo !== undefined) {
      setNomeTitulo(formData.nome_titulo    || '')
      setEspecialidades(formData.especialidades || [])
      setModalidade(formData.modalidade ? [formData.modalidade] : [])
      setExperiencia(formData.experiencia ? [formData.experiencia] : [])
      setDiferencial(formData.diferencial  || '')
      setFaixaEtaria(formData.faixa_etaria || [])
      setObjetivos(formData.objetivos      || [])
      setResultados(formData.resultados    || '')
      setFaq(formData.faq                  || '')
      setSempre(formData.sempre            || [])
      setNunca(formData.nunca              || [])
      setInstrExtras(formData.instrucoes_extras || '')
    }
    setActiveSource('form')
  }, [formData, assistant])

  function markDirty() { setDirty(true) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/api/assistants/training-form', {
        nome_titulo: nomeTitulo, especialidades,
        modalidade: modalidade[0] || '', experiencia: experiencia[0] || '',
        diferencial, faixa_etaria: faixaEtaria, objetivos, resultados,
        faq, sempre, nunca, instrucoes_extras: instrExtras,
      })
      setActiveSource('form')
      setDirty(false)
      toast.success('Treinamento salvo! A assistente já usa as novas informações.')
    } catch {
      toast.error('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const ta = (value: string, onChange: (v: string) => void, placeholder: string, rows = 3) => (
    <textarea value={value} onChange={e => { onChange(e.target.value); markDirty() }} rows={rows}
      placeholder={placeholder}
      className="w-full rounded-lg px-3.5 py-3 text-sm text-t1 placeholder:text-t3 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-colors resize-none leading-relaxed"
      style={{ background: 'var(--raised)', border: '1px solid var(--border)' }} />
  )

  const chips = (opts: string[], val: string[], set: (v: string[]) => void, single = false) => (
    <ChipSelector options={opts} selected={val} single={single} onChange={v => { set(v); markDirty() }} />
  )

  const checkList = (items: string[], selected: string[], setSelected: (v: string[]) => void) => (
    <div className="space-y-2">
      {items.map(item => (
        <label key={item} className="flex items-start gap-2.5 cursor-pointer group">
          <div
            onClick={() => { setSelected(selected.includes(item) ? selected.filter(s => s !== item) : [...selected, item]); markDirty() }}
            className={cn('w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors cursor-pointer', selected.includes(item) ? 'bg-brand-500 border-brand-500' : 'group-hover:border-brand-500/30')}
            style={{ borderColor: selected.includes(item) ? undefined : 'var(--border)', background: selected.includes(item) ? undefined : 'var(--raised)' }}
          >
            {selected.includes(item) && <CheckCircle className="w-2.5 h-2.5 text-white" />}
          </div>
          <span className="text-xs text-t2 group-hover:text-t1 transition-colors leading-relaxed">{item}</span>
        </label>
      ))}
    </div>
  )

  const sections = [
    {
      id: 'identidade', title: 'Identidade do consultório', description: 'Quem é o nutricionista e seus diferenciais',
      content: (
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-medium text-t2">Nome e título</label>
            <input value={nomeTitulo} onChange={e => { setNomeTitulo(e.target.value); markDirty() }}
              placeholder="Ex: Dr. David Effgen, nutricionista funcional e esportivo"
              className="w-full rounded-lg px-3.5 py-2.5 text-sm text-t1 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-colors"
              style={{ background: 'var(--raised)', border: '1px solid var(--border)' }} />
          </div>
          <div className="space-y-2"><label className="text-xs font-medium text-t2">Especialidades</label>{chips(['Emagrecimento', 'Ganho de massa', 'Performance esportiva', 'Nutrição clínica', 'Gestação', 'Nutrição infantil', 'Doenças crônicas', 'Vegetariano/vegano'], especialidades, setEspecialidades)}</div>
          <div className="space-y-2"><label className="text-xs font-medium text-t2">Modalidade de atendimento</label>{chips(['Online', 'Presencial', 'Online e presencial'], modalidade, setModalidade, true)}</div>
          <div className="space-y-2"><label className="text-xs font-medium text-t2">Tempo de experiência</label>{chips(['Menos de 2 anos', '2 a 5 anos', '5 a 10 anos', 'Mais de 10 anos'], experiencia, setExperiencia, true)}</div>
          <div className="space-y-2"><label className="text-xs font-medium text-t2">Diferencial do método</label>{ta(diferencial, setDiferencial, 'O que torna seu trabalho único. Ex: não uso dietas padrão, investigo causas metabólicas e hormonais...')}</div>
        </div>
      )
    },
    {
      id: 'publico', title: 'Público atendido e resultados', description: 'Quem são seus pacientes e o que costumam alcançar',
      content: (
        <div className="space-y-5">
          <div className="space-y-2"><label className="text-xs font-medium text-t2">Faixa etária predominante</label>{chips(['18-25 anos', '25-35 anos', '35-45 anos', '45-60 anos', 'Todas as idades'], faixaEtaria, setFaixaEtaria)}</div>
          <div className="space-y-2"><label className="text-xs font-medium text-t2">Objetivos mais atendidos</label>{chips(['Emagrecer', 'Ganhar massa', 'Qualidade de vida', 'Performance atlética', 'Doenças crônicas', 'Pós-operatório', 'Gestação'], objetivos, setObjetivos)}</div>
          <div className="space-y-2"><label className="text-xs font-medium text-t2">Resultados típicos</label>{ta(resultados, setResultados, 'Ex: meus pacientes costumam perder entre 4-8kg no primeiro mês, com melhora de energia...')}</div>
        </div>
      )
    },
    {
      id: 'faq', title: 'Perguntas frequentes', description: 'Dúvidas comuns com as respostas exatas que a assistente deve usar',
      content: (
        <div className="space-y-3">
          <p className="text-[11px] text-t3 leading-relaxed">
            Use o formato <code className="text-t2 font-mono">P: pergunta</code> / <code className="text-t2 font-mono">R: resposta</code>. A assistente vai usar estas respostas palavra por palavra.
          </p>
          {ta(faq, setFaq, `P: Você atende pelo plano de saúde?\nR: Não, o atendimento é particular.\n\nP: Quantas consultas são necessárias?\nR: A frequência ideal definimos juntos na primeira consulta.`, 10)}
        </div>
      )
    },
    {
      id: 'instrucoes', title: 'Instruções especiais', description: 'O que a assistente deve sempre dizer e nunca prometer',
      content: (
        <div className="space-y-6">
          <div className="space-y-2"><label className="text-xs font-medium text-t2">Sempre mencionar</label>{checkList(['Que o atendimento é totalmente personalizado, sem dietas padrão', 'Que temos pacientes com resultados reais e comprovados', 'Que a primeira consulta já inclui a montagem do plano alimentar', 'Os diferenciais do método do nutricionista', 'Que fazemos acompanhamento próximo entre consultas'], sempre, setSempre)}</div>
          <div className="space-y-2"><label className="text-xs font-medium text-t2">Nunca dizer ou prometer</label>{checkList(['Prometer emagrecer X kg em Y dias', 'Recomendar dietas da moda (keto, detox, jejum sem contexto)', 'Dizer que vai "resolver" o problema', 'Comparar com outros profissionais ou métodos', 'Dar orientações nutricionais pelo chat antes da consulta'], nunca, setNunca)}</div>
          <div className="space-y-2"><label className="text-xs font-medium text-t2">Observações extras</label>{ta(instrExtras, setInstrExtras, 'Qualquer instrução adicional específica do seu consultório...', 3)}</div>
        </div>
      )
    },
  ]

  if (isLoading) return <div className="py-8 text-center text-t2 text-sm">Carregando...</div>

  return (
    <div className="space-y-5">
      {activeSource && (
        <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border text-xs',
          activeSource === 'form' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
        )}>
          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {activeSource === 'form' ? 'Usando informações do formulário abaixo' : `Usando PDF enviado (${assistant?.pdf_filename}). Salvar o formulário vai substituir o PDF.`}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-2">
        {sections.map(s => (
          <div key={s.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <button type="button" onClick={() => setOpenSection(openSection === s.id ? null : s.id)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-raised transition-colors text-left">
              <div>
                <p className="text-sm font-medium text-t1">{s.title}</p>
                <p className="text-xs text-t3 mt-0.5">{s.description}</p>
              </div>
              {openSection === s.id
                ? <ChevronUp className="w-4 h-4 text-t3 flex-shrink-0 ml-3" />
                : <ChevronDown className="w-4 h-4 text-t3 flex-shrink-0 ml-3" />}
            </button>
            {openSection === s.id && (
              <div className="px-4 pb-5 pt-4 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>
                {s.content}
              </div>
            )}
          </div>
        ))}

        <div className="pt-2 flex items-center justify-between">
          <p className="text-xs text-t3">As informações são aplicadas imediatamente após salvar.</p>
          <Button type="submit" disabled={saving || !dirty} size="sm">
            {saving ? 'Salvando...' : 'Salvar treinamento'}
          </Button>
        </div>
      </form>
    </div>
  )
}

// ─── PDF Section ──────────────────────────────────────────────────
function PdfSection() {
  const queryClient = useQueryClient()
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const { data: assistant } = useQuery<any>({
    queryKey: ['assistant'],
    queryFn: async () => { const { data } = await api.get('/api/assistants'); return data.assistant },
  })

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
    } catch {
      toast.error('Erro ao enviar PDF. Verifique o arquivo.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDeletePdf() {
    try {
      await api.delete('/api/assistants/pdf')
      toast.success('PDF removido.')
      queryClient.invalidateQueries({ queryKey: ['assistant'] })
    } catch {
      toast.error('Erro ao remover PDF.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-t1">Manual de instruções (PDF)</h3>
          <p className="text-xs text-t2 mt-0.5">
            Envie um PDF com seu protocolo, perguntas frequentes e como você gosta de atender.
            A assistente usará como base de conhecimento.
          </p>
        </div>
        <a
          href="/template-instrucoes-sofia.md"
          download="template-instrucoes-sofia.md"
          className="flex items-center gap-1.5 text-xs text-t3 hover:text-brand-400 transition-colors flex-shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Baixar template
        </a>
      </div>

      {assistant?.pdf_filename ? (
        <div className="flex items-center gap-3 p-3 bg-brand-500/10 border border-brand-500/20 rounded-lg">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-brand-400 truncate">{assistant.pdf_filename}</p>
            <p className="text-xs text-brand-500/60">PDF ativo</p>
          </div>
          <Button variant="danger" size="sm" onClick={handleDeletePdf}>
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

// ─── Main Page ────────────────────────────────────────────────────
const TABS = [
  { id: 'interview', label: 'Entrevista',  icon: MessageSquare },
  { id: 'form',      label: 'Formulário',  icon: BookOpen },
  { id: 'pdf',       label: 'PDF Manual',  icon: Upload },
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
          {activeTab === 'interview' && <InterviewMode onSaved={() => setActiveTab('form')} />}
          {activeTab === 'form'      && <TreinamentoForm />}
          {activeTab === 'pdf'       && <PdfSection />}
        </CardContent>
      </Card>
    </div>
  )
}
