'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Brain, Sparkles, CheckCircle2, Activity, Upload, FileText,
  Send, RotateCcw, Bot, User, Loader2, PlayCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { Badge, Btn, Card, KPI, SectionTitle } from '@/components/ui/finance-primitives'

// ─── static chart data ────────────────────────────────────
const PERF_DATA = Array.from({ length: 20 }, (_, i) => ({
  x: i,
  v: 60 + Math.sin(i / 2) * 12 + i * 0.8,
}))

const CAPABILITIES = [
  { t: 'Qualificação de leads', v: 96 },
  { t: 'Agendamento automático', v: 91 },
  { t: 'FAQ & suporte', v: 88 },
  { t: 'Sugestão de planos', v: 72 },
  { t: 'Detecção de objeção', v: 64 },
]

// ─── Test Chat ────────────────────────────────────────────
type TestMsg = { role: 'user' | 'assistant'; content: string; action?: any }

const SUGGESTED = ['Quero saber mais', 'Quanto custa?', 'Como agendar?', 'Achei caro', 'Pode atender online?']

function TestChat() {
  const [messages, setMessages] = useState<TestMsg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [resetting, setResetting] = useState(false)

  async function send(text: string) {
    const content = text.trim()
    if (!content || sending) return
    const history = messages.map(({ role, content }) => ({ role, content }))
    setMessages(m => [...m, { role: 'user', content }])
    setInput('')
    setSending(true)
    try {
      const { data } = await api.post('/api/assistants/test', { message: content, history })
      setMessages(m => [...m, { role: 'assistant', content: data.response, action: data.action }])
    } catch {
      toast.error('Erro ao testar atendimento.')
      setMessages(m => m.slice(0, -1))
    } finally { setSending(false) }
  }

  async function resetChat() {
    setResetting(true)
    try {
      await api.post('/api/assistants/test', { message: 'reset', reset: true })
      setMessages([])
      toast.success('Conversa reiniciada.')
    } catch { toast.error('Erro ao reiniciar.') }
    finally { setResetting(false) }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-2">
          Converse com a assistente como se fosse um paciente. Nada aqui é enviado pelo WhatsApp.
        </p>
        <button
          onClick={resetChat}
          disabled={resetting || messages.length === 0}
          className="flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40"
          style={{ border: '1px solid var(--line-2)', color: 'var(--text-2)' }}
        >
          {resetting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
          Reiniciar
        </button>
      </div>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED.map(s => (
            <button key={s} onClick={() => send(s)}
              className="px-2.5 py-1 rounded-full text-[12px] transition-colors"
              style={{ border: '1px solid var(--line-2)', color: 'var(--text-3)' }}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-xl flex flex-col"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--line-1)', minHeight: 240 }}>
        <div className="flex-1 p-4 space-y-3 overflow-y-auto" style={{ maxHeight: 320 }}>
          {messages.length === 0 && !sending && (
            <div className="h-full flex flex-col items-center justify-center text-center py-10 gap-2">
              <Bot className="w-6 h-6 text-3" />
              <p className="text-[12px] text-3">Envie uma mensagem para iniciar a simulação</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cn('flex gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              {m.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full grid place-items-center flex-shrink-0"
                  style={{ background: 'var(--brand-soft)' }}>
                  <Bot className="w-3 h-3" style={{ color: 'var(--brand)' }} />
                </div>
              )}
              <div className="max-w-[75%]">
                <div className="px-3 py-2 rounded-xl text-[12.5px] leading-relaxed whitespace-pre-wrap"
                  style={{
                    background: m.role === 'user' ? 'var(--brand)' : 'var(--bg-elevated)',
                    color: m.role === 'user' ? '#fff' : 'var(--text-1)',
                    border: m.role === 'user' ? 'none' : '1px solid var(--line-1)',
                  }}>
                  {m.content}
                </div>
              </div>
              {m.role === 'user' && (
                <div className="w-6 h-6 rounded-full grid place-items-center flex-shrink-0"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--line-1)' }}>
                  <User className="w-3 h-3 text-3" />
                </div>
              )}
            </div>
          ))}
          {sending && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full grid place-items-center flex-shrink-0"
                style={{ background: 'var(--brand-soft)' }}>
                <Bot className="w-3 h-3" style={{ color: 'var(--brand)' }} />
              </div>
              <div className="px-3 py-2 rounded-xl"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line-1)' }}>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-3" />
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 p-3" style={{ borderTop: '1px solid var(--line-1)' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
            placeholder="Digite como se fosse o paciente..."
            disabled={sending}
            className="flex-1 px-3 py-2 rounded-lg text-[12.5px] outline-none focus:ring-2 focus:ring-[var(--brand-ring)]"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line-2)', color: 'var(--text-1)' }}
          />
          <button
            onClick={() => send(input)}
            disabled={sending || !input.trim()}
            className="w-9 h-9 rounded-lg grid place-items-center flex-shrink-0 transition-opacity disabled:opacity-40"
            style={{ background: 'var(--brand)' }}>
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Persona form ─────────────────────────────────────────
const TONES = [
  { value: 'acolhedor',    label: 'Acolhedora' },
  { value: 'profissional', label: 'Profissional' },
  { value: 'direto',       label: 'Direta' },
  { value: 'empatico',     label: 'Empática' },
  { value: 'tecnico',      label: 'Técnica' },
]

const personaSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  tone: z.string().default('acolhedor'),
  greeting_message: z.string().optional(),
})
type PersonaForm = z.infer<typeof personaSchema>

function PersonaCard() {
  const qc = useQueryClient()
  const { data: assistant } = useQuery<any>({
    queryKey: ['assistant'],
    queryFn: () => api.get('/api/assistants').then(r => r.data.assistant),
  })

  const { register, handleSubmit, watch, setValue, reset, formState: { isSubmitting } } = useForm<PersonaForm>({
    resolver: zodResolver(personaSchema),
    defaultValues: { tone: 'acolhedor' },
  })

  const currentTone = watch('tone')

  useEffect(() => {
    if (assistant) {
      reset({
        name: assistant.name,
        tone: assistant.tone || 'acolhedor',
        greeting_message: assistant.greeting_message || '',
      })
    }
  }, [assistant, reset])

  async function onSubmit(data: PersonaForm) {
    try {
      await api.post('/api/assistants', data)
      toast.success('Assistente salva!')
      qc.invalidateQueries({ queryKey: ['assistant'] })
    } catch { toast.error('Erro ao salvar.') }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <div className="text-[11.5px] text-3 mb-1.5">Nome</div>
        <input
          {...register('name')}
          placeholder="Alice, Sofia, Lara..."
          className="w-full h-9 px-3 rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-[var(--brand-ring)]"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--line-2)', color: 'var(--text-1)' }}
        />
      </div>
      <div>
        <div className="text-[11.5px] text-3 mb-1.5">Tom</div>
        <div className="flex flex-wrap gap-1.5">
          {TONES.map(t => (
            <button key={t.value} type="button" onClick={() => setValue('tone', t.value)}
              className={cn(
                'px-2.5 py-1 rounded-md text-[12px] border transition',
                currentTone === t.value
                  ? 'bg-[var(--brand-soft)] text-[var(--brand)] border-[var(--brand-ring)]'
                  : 'border-[var(--line-2)] text-2 hover:bg-[var(--bg-surface)]',
              )}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[11.5px] text-3 mb-1.5">Mensagem de boas-vindas</div>
        <textarea
          {...register('greeting_message')}
          rows={4}
          placeholder="Olá! Sou a Alice, assistente da Dra. ..."
          className="w-full px-3 py-2 rounded-lg text-[12.5px] outline-none focus:ring-2 focus:ring-[var(--brand-ring)] resize-none"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--line-2)', color: 'var(--text-1)' }}
        />
      </div>
      <div className="flex items-center justify-between text-[11.5px] text-3 pt-1">
        <span className="flex items-center gap-1.5">
          <Activity className="w-3 h-3" />
          Publicado imediatamente ao salvar
        </span>
        <Btn variant="primary" size="sm" type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          Salvar e publicar
        </Btn>
      </div>
    </form>
  )
}

// ─── Knowledge Card ───────────────────────────────────────
function KnowledgeCard() {
  const [uploading, setUploading] = useState(false)
  const { data: assistant } = useQuery<any>({
    queryKey: ['assistant'],
    queryFn: () => api.get('/api/assistants').then(r => r.data.assistant),
  })

  const hasContent = !!(assistant?.pdf_content)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      await api.post('/api/assistants/upload-pdf', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('PDF enviado e indexado!')
    } catch { toast.error('Erro ao enviar PDF.') }
    finally { setUploading(false) }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 p-2.5 rounded-lg"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--line-1)' }}>
        <div className="w-8 h-8 rounded-md grid place-items-center flex-shrink-0"
          style={{ background: 'var(--bg-elevated)' }}>
          <FileText className="w-3.5 h-3.5" style={{ color: 'var(--brand)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-medium text-1 truncate">Base de conhecimento</div>
          <div className="text-[11px] text-3">
            {hasContent ? 'Conteúdo indexado e ativo' : 'Nenhum conteúdo ainda'}
          </div>
        </div>
        <Badge variant={hasContent ? 'success' : 'default'}>{hasContent ? 'Indexado' : 'Vazio'}</Badge>
      </div>
      <label className="flex w-full cursor-pointer">
        <input type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
        <Btn variant="outline" size="sm" className="w-full justify-center" disabled={uploading} type="button">
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {uploading ? 'Enviando…' : 'Enviar PDF'}
        </Btn>
      </label>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────
export default function TreinamentoPage() {
  const [showTest, setShowTest] = useState(false)

  const { data: assistant } = useQuery<any>({
    queryKey: ['assistant'],
    queryFn: () => api.get('/api/assistants').then(r => r.data.assistant),
    staleTime: 30_000,
  })

  const { data: convStats } = useQuery<any>({
    queryKey: ['conversations-stats'],
    queryFn: () => api.get('/api/conversations/stats').then(r => r.data.stats),
    staleTime: 30_000,
  })

  const aiPaused = assistant?.ai_paused ?? false
  const assistantName = assistant?.name || 'Frame AI'

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-6 space-y-6">
      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-2xl border p-6"
        style={{
          background: 'radial-gradient(120% 80% at 90% 0%, rgba(0,194,124,0.10) 0%, rgba(0,194,124,0) 50%), var(--bg-elevated)',
          borderColor: 'var(--line-1)',
        }}
      >
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00C27C] to-[#00E892] grid place-items-center shadow-[0_8px_24px_-8px_rgba(0,194,124,0.6)] flex-shrink-0">
              <Brain className="w-6 h-6 text-[#02140C]" strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[20px] font-semibold tracking-tight text-1">{assistantName}</h2>
                <Badge variant={aiPaused ? 'danger' : 'success'}>
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  {aiPaused ? 'Pausada' : 'Em produção'}
                </Badge>
              </div>
              <p className="text-[13px] text-2 mt-1 max-w-2xl">
                Treinada com as configurações do seu consultório.
                {convStats?.ai_messages ? ` ${Number(convStats.ai_messages).toLocaleString('pt-BR')} mensagens enviadas.` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Btn variant="ghost" size="sm">Histórico de versões</Btn>
            <Btn variant="secondary" size="sm" onClick={() => setShowTest(v => !v)}>
              <PlayCircle className="w-3.5 h-3.5" />
              {showTest ? 'Fechar playground' : 'Testar no playground'}
            </Btn>
          </div>
        </div>

        {showTest && (
          <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--line-1)' }}>
            <TestChat />
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KPI
          label="Mensagens (7d)"
          value={convStats?.ai_messages != null ? String(convStats.ai_messages) : '—'}
        />
        <KPI label="Resolução automática" value="—" hint="Sem dados disponíveis" />
        <KPI label="Satisfação (CSAT)"    value="—" hint="Sem dados disponíveis" />
        <KPI label="Custo médio"          value="—" hint="Sem dados disponíveis" />
      </div>

      {/* Performance chart + Capacidades */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <SectionTitle title="Performance ao longo do tempo" hint="Precisão de respostas %" />
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={PERF_DATA} margin={{ top: 8, right: 8, bottom: 0, left: -28 }}>
                <defs>
                  <linearGradient id="iaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00C27C" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#00C27C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--line-2)',
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="v" stroke="#00C27C" strokeWidth={2} fill="url(#iaGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Capacidades" />
          <div className="space-y-3">
            {CAPABILITIES.map(c => (
              <div key={c.t}>
                <div className="flex items-center justify-between text-[12px] mb-1">
                  <span className="text-2">{c.t}</span>
                  <span className="text-1 font-mono tabular-nums">{c.v}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#00C27C] to-[#00E892]"
                    style={{ width: `${c.v}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Base de conhecimento + Persona */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <SectionTitle
            title="Base de conhecimento"
            hint="Fontes que a assistente usa para responder"
            action={
              <label className="cursor-pointer">
                <Btn variant="outline" size="sm" type="button">
                  <Upload className="w-3.5 h-3.5" /> Adicionar
                </Btn>
                <input type="file" accept=".pdf" className="hidden" onChange={async e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const form = new FormData()
                  form.append('file', file)
                  try {
                    await api.post('/api/assistants/upload-pdf', form, { headers: { 'Content-Type': 'multipart/form-data' } })
                    toast.success('PDF enviado e indexado!')
                  } catch { toast.error('Erro ao enviar PDF.') }
                }} />
              </label>
            }
          />
          <KnowledgeCard />
        </Card>

        <Card>
          <SectionTitle title="Persona & tom de voz" hint="Como a assistente se comunica" />
          <PersonaCard />
        </Card>
      </div>
    </div>
  )
}
