'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Sparkles, FileText, Upload, Globe, BookOpen, CheckCircle2,
  MessageCircle, Send, Settings2, ShieldCheck, Headphones,
  Activity, ChevronRight, Loader2, RotateCcw, Bot, User,
} from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { Badge, Btn, Card, SectionTitle } from '@/components/ui/finance-primitives'

// ─── helpers ────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-[12.5px] font-medium text-1">{label}</label>
        {hint && <span className="text-[11px] text-3">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props}
      className="w-full h-10 px-3.5 rounded-lg text-[13px] text-1 outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-ring)] transition"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line-2)', ...((props as any).style) }}
    />
  )
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...props}
      className="w-full p-3.5 rounded-lg text-[13px] text-1 outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-ring)] transition resize-none leading-relaxed"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line-2)' }}
    />
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} type="button"
      className="relative w-9 h-5 rounded-full transition shrink-0"
      style={{ background: on ? 'var(--brand)' : 'var(--bg-surface)' }}>
      <span className="absolute top-0.5 size-4 rounded-full bg-white shadow transition-all"
        style={{ left: on ? 'calc(100% - 18px)' : '2px' }} />
    </button>
  )
}

function Row({ title, desc, control }: { title: string; desc?: string; control: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-4">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-1">{title}</div>
        {desc && <div className="text-[12px] text-3 mt-0.5">{desc}</div>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  )
}

// ─── nav sections ────────────────────────────────────────
const SECTIONS = [
  { id: 'overview',   label: 'Visão geral',           icon: Activity },
  { id: 'persona',    label: 'Personalidade',          icon: Sparkles },
  { id: 'welcome',    label: 'Mensagem inicial',       icon: MessageCircle },
  { id: 'services',   label: 'Serviços',               icon: BookOpen },
  { id: 'rules',      label: 'Regras de atendimento',  icon: Settings2 },
  { id: 'knowledge',  label: 'Base de conhecimento',   icon: FileText },
  { id: 'limits',     label: 'Limites',                icon: ShieldCheck },
  { id: 'handoff',    label: 'Transferência humana',   icon: Headphones },
  { id: 'test',       label: 'Testar assistente',      icon: Send },
] as const
type SecId = typeof SECTIONS[number]['id']

// ─── persona form ────────────────────────────────────────
const TONES_OPTS = ['Acolhedora', 'Profissional', 'Direta', 'Empática', 'Técnica', 'Calorosa', 'Concisa']

const personaSchema = z.object({
  name: z.string().min(1),
  tone: z.string().default('acolhedor'),
  greeting_message: z.string().optional(),
})
type PersonaForm = z.infer<typeof personaSchema>

function PersonaSection({ assistant, onSave }: { assistant: any; onSave: () => void }) {
  const [selectedTones, setSelectedTones] = useState<string[]>(['Acolhedora', 'Profissional'])
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<PersonaForm>({
    resolver: zodResolver(personaSchema),
    defaultValues: { tone: 'acolhedor' },
  })

  useEffect(() => {
    if (assistant) {
      reset({ name: assistant.name, tone: assistant.tone || 'acolhedor', greeting_message: assistant.greeting_message || '' })
      if (assistant.tone) setSelectedTones([assistant.tone])
    }
  }, [assistant, reset])

  function toggleTone(t: string) {
    setSelectedTones(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  async function onSubmit(data: PersonaForm) {
    await api.post('/api/assistants', { ...data, tone: selectedTones[0]?.toLowerCase() || data.tone })
    toast.success('Personalidade salva!')
    onSave()
  }

  return (
    <Card>
      <SectionTitle title="Personalidade & tom" hint="Como a assistente se apresenta e fala" />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Field label="Nome da assistente">
          <Input {...register('name')} placeholder="Alice, Sofia, Lara..." />
        </Field>
        <Field label="Tom de voz" hint="Escolha até 3">
          <div className="flex flex-wrap gap-1.5">
            {TONES_OPTS.map(t => {
              const on = selectedTones.includes(t)
              return (
                <button key={t} type="button" onClick={() => toggleTone(t)}
                  className={cn('px-3 h-8 rounded-full text-[12.5px] border transition', on
                    ? 'bg-[var(--brand-soft)] text-[var(--brand)] border-[var(--brand-ring)]'
                    : 'border-[var(--line-2)] text-2 hover:border-[var(--line-3)] hover:text-1')}>
                  {t}
                </button>
              )
            })}
          </div>
        </Field>
        <Field label="Descrição da personalidade" hint="Em poucas palavras">
          <TextArea rows={4} {...register('greeting_message')}
            placeholder="Ex: Acolhedora, profissional e prática. Trata cada paciente pelo nome..." />
        </Field>
        <div className="flex justify-end pt-1">
          <Btn variant="primary" size="sm" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            Salvar e publicar
          </Btn>
        </div>
      </form>
    </Card>
  )
}

// ─── welcome section ────────────────────────────────────
function WelcomeSection({ assistant, onSave }: { assistant: any; onSave: () => void }) {
  const [greet, setGreet] = useState('')
  const [farewell, setFarewell] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (assistant) {
      setGreet(assistant.greeting_message || '')
      setFarewell(assistant.farewell_message || '')
    }
  }, [assistant])

  async function save() {
    setSaving(true)
    try {
      await api.post('/api/assistants', { greeting_message: greet, farewell_message: farewell })
      toast.success('Mensagens salvas!')
      onSave()
    } catch { toast.error('Erro ao salvar.') }
    finally { setSaving(false) }
  }

  return (
    <Card>
      <SectionTitle title="Mensagem inicial" hint="A primeira mensagem que o paciente recebe" />
      <div className="space-y-5">
        <Field label="Saudação">
          <TextArea rows={3} value={greet} onChange={e => setGreet(e.target.value)}
            placeholder="Olá! 👋 Aqui é a Alice, assistente da clínica. Como posso te ajudar hoje?" />
        </Field>
        <Field label="Despedida">
          <TextArea rows={2} value={farewell} onChange={e => setFarewell(e.target.value)}
            placeholder="Foi um prazer! Qualquer dúvida é só chamar 😊" />
        </Field>
        <div className="flex justify-end pt-1">
          <Btn variant="primary" size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            Salvar e publicar
          </Btn>
        </div>
      </div>
    </Card>
  )
}

// ─── services section ────────────────────────────────────
function ServicesSection() {
  const router = useRouter()
  const { data, isLoading } = useQuery<any[]>({
    queryKey: ['services'],
    queryFn: () => api.get('/api/services').then(r => r.data.services ?? []),
  })

  if (isLoading) return <Card><div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-3" /></div></Card>

  const services: any[] = data ?? []

  return (
    <Card>
      <SectionTitle title="Serviços oferecidos" hint="O que a assistente pode oferecer e agendar"
        action={<Btn variant="outline" size="sm" onClick={() => router.push('/servicos')}>+ Novo serviço</Btn>} />
      {services.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-3">
          Nenhum serviço cadastrado.{' '}
          <button className="underline" style={{ color: 'var(--brand)' }} onClick={() => router.push('/servicos')}>
            Adicionar agora
          </button>
        </div>
      ) : (
        <div className="divide-y divide-[var(--line-1)]">
          {services.map((s: any) => (
            <Row key={s.id}
              title={s.name}
              desc={[s.duration_minutes ? `${s.duration_minutes} min` : '', s.price ? `R$ ${Number(s.price).toFixed(0)}` : ''].filter(Boolean).join(' · ')}
              control={
                <div className="flex items-center gap-3">
                  <Badge variant="success">Ativo</Badge>
                  <Btn variant="ghost" size="sm" onClick={() => router.push('/servicos')}>Editar</Btn>
                </div>
              }
            />
          ))}
        </div>
      )}
    </Card>
  )
}

// ─── knowledge section ───────────────────────────────────
function KnowledgeSection({ assistant, onSave }: { assistant: any; onSave: () => void }) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

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
      onSave()
    } catch { toast.error('Erro ao enviar PDF.') }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = '' }
  }

  const sources = hasContent
    ? [{ t: 'Base de conhecimento', s: 'Conteúdo indexado e ativo', icon: BookOpen }]
    : []

  return (
    <Card>
      <SectionTitle title="Base de conhecimento" hint="Documentos e fontes que a assistente consulta"
        action={
          <>
            <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
            <Btn variant="outline" size="sm" type="button" disabled={uploading}
              onClick={() => inputRef.current?.click()}>
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              Adicionar
            </Btn>
          </>
        }
      />
      <div className="space-y-2">
        {sources.length === 0 && (
          <div className="py-8 text-center text-[13px] text-3">
            Nenhum documento indexado ainda. Envie um PDF para começar.
          </div>
        )}
        {sources.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.t} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--line-1)] hover:border-[var(--line-2)] transition">
              <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0"
                style={{ background: 'var(--bg-surface)' }}>
                <Icon className="w-4 h-4" style={{ color: 'var(--brand)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-1 truncate">{s.t}</div>
                <div className="text-[11.5px] text-3">{s.s}</div>
              </div>
              <Badge variant="success">Indexado</Badge>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ─── limits section ──────────────────────────────────────
const LIMITES_OPTIONS = [
  { key: 'prescricao',   title: 'Não prescrever tratamentos ou medicamentos',    desc: undefined },
  { key: 'diagnostico',  title: 'Não discutir casos clínicos sensíveis',          desc: 'Encaminha para o nutricionista' },
  { key: 'fora_tema',    title: 'Não responder fora do tema',                     desc: 'Foca apenas em nutrição e agendamento' },
  { key: 'promo',        title: 'Não enviar conteúdo promocional não autorizado', desc: undefined },
]

function LimitsSection({ assistant, onSave }: { assistant: any; onSave: () => void }) {
  const [limits, setLimits] = useState<Record<string, boolean>>({
    prescricao: true, diagnostico: true, fora_tema: true, promo: true,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (assistant?.clinical_rules) {
      try {
        const parsed = JSON.parse(assistant.clinical_rules)
        if (typeof parsed === 'object' && !Array.isArray(parsed)) setLimits(prev => ({ ...prev, ...parsed }))
      } catch {}
    }
  }, [assistant])

  async function save() {
    setSaving(true)
    try {
      await api.post('/api/assistants', { clinical_rules: JSON.stringify(limits) })
      toast.success('Limites salvos!')
      onSave()
    } catch { toast.error('Erro ao salvar.') }
    finally { setSaving(false) }
  }

  return (
    <Card>
      <SectionTitle title="Limites da assistente" hint="O que a assistente nunca deve fazer" />
      <div className="divide-y divide-[var(--line-1)]">
        {LIMITES_OPTIONS.map(opt => (
          <Row key={opt.key} title={opt.title} desc={opt.desc}
            control={<Toggle on={limits[opt.key] !== false}
              onChange={v => setLimits(prev => ({ ...prev, [opt.key]: v }))} />} />
        ))}
      </div>
      <div className="flex justify-end pt-4">
        <Btn variant="primary" size="sm" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          Salvar e publicar
        </Btn>
      </div>
    </Card>
  )
}

// ─── handoff section ─────────────────────────────────────
function HandoffSection({ assistant, onSave }: { assistant: any; onSave: () => void }) {
  const [transfer, setTransfer] = useState(true)
  const [autoUrgency, setAutoUrgency] = useState(true)
  const [msg, setMsg] = useState('Vou te conectar com a nutricionista agora mesmo. Ela retorna em alguns minutos.')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (assistant?.farewell_message) {
      // use farewell_message as a proxy for handoff message if set
    }
  }, [assistant])

  async function save() {
    setSaving(true)
    try {
      await api.post('/api/assistants', { farewell_message: msg })
      toast.success('Configurações de transferência salvas!')
      onSave()
    } catch { toast.error('Erro ao salvar.') }
    finally { setSaving(false) }
  }

  return (
    <Card>
      <SectionTitle title="Transferência para humano" hint="Quando a assistente deve passar para você" />
      <div className="space-y-5">
        <div className="divide-y divide-[var(--line-1)]">
          <Row title="Permitir transferência" desc="Paciente pode pedir 'falar com nutricionista'"
            control={<Toggle on={transfer} onChange={setTransfer} />} />
          <Row title="Transferir automaticamente em urgências"
            control={<Toggle on={autoUrgency} onChange={setAutoUrgency} />} />
        </div>
        <Field label="Mensagem ao transferir">
          <TextArea rows={3} value={msg} onChange={e => setMsg(e.target.value)} />
        </Field>
        <div className="flex justify-end pt-1">
          <Btn variant="primary" size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            Salvar e publicar
          </Btn>
        </div>
      </div>
    </Card>
  )
}

// ─── rules section ───────────────────────────────────────
function RulesSection() {
  const [confirmar, setConfirmar]     = useState(true)
  const [foraDhora, setForaDhora]     = useState(true)
  const [sugerirHorario, setSugerir]  = useState(true)
  const [lembrete, setLembrete]       = useState(true)

  return (
    <Card>
      <SectionTitle title="Regras de atendimento" hint="Como a assistente se comporta" />
      <div className="divide-y divide-[var(--line-1)]">
        <Row title="Sempre confirmar dados antes de agendar" desc="Nome, telefone e e-mail"
          control={<Toggle on={confirmar} onChange={setConfirmar} />} />
        <Row title="Responder fora do horário comercial" desc="Avisa que retorna no próximo dia útil"
          control={<Toggle on={foraDhora} onChange={setForaDhora} />} />
        <Row title="Sugerir o melhor horário disponível" desc="Baseado na agenda configurada"
          control={<Toggle on={sugerirHorario} onChange={setSugerir} />} />
        <Row title="Enviar lembrete pós-agendamento" desc="Confirmação 24h antes da consulta"
          control={<Toggle on={lembrete} onChange={setLembrete} />} />
      </div>
    </Card>
  )
}

// ─── test section ────────────────────────────────────────
type TestMsg = { role: 'user' | 'assistant'; content: string }

function TestSection() {
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
      setMessages(m => [...m, { role: 'assistant', content: data.response }])
    } catch {
      toast.error('Erro ao testar.')
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
    <Card>
      <SectionTitle title="Testar assistente" hint="Converse com a assistente antes de publicar"
        action={
          <button onClick={resetChat} disabled={resetting || messages.length === 0}
            className="flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40"
            style={{ border: '1px solid var(--line-2)', color: 'var(--text-2)' }}>
            {resetting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
            Reiniciar
          </button>
        }
      />
      <div className="rounded-xl border flex flex-col" style={{ borderColor: 'var(--line-1)', background: 'var(--bg-base)', height: 360 }}>
        <div className="flex-1 p-4 space-y-3 overflow-y-auto">
          {messages.length === 0 && !sending && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2">
              <Bot className="w-6 h-6 text-3" />
              <p className="text-[12px] text-3">Envie uma mensagem para iniciar a simulação</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cn('flex gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              {m.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full grid place-items-center shrink-0" style={{ background: 'var(--brand-soft)' }}>
                  <Bot className="w-3 h-3" style={{ color: 'var(--brand)' }} />
                </div>
              )}
              <div className="max-w-[75%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed"
                style={{
                  background: m.role === 'user' ? 'var(--brand)' : 'var(--bg-elevated)',
                  color: m.role === 'user' ? '#fff' : 'var(--text-1)',
                  border: m.role === 'user' ? 'none' : '1px solid var(--line-1)',
                  borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                }}>
                {m.content}
              </div>
              {m.role === 'user' && (
                <div className="w-6 h-6 rounded-full grid place-items-center shrink-0" style={{ background: 'var(--bg-surface)', border: '1px solid var(--line-1)' }}>
                  <User className="w-3 h-3 text-3" />
                </div>
              )}
            </div>
          ))}
          {sending && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full grid place-items-center shrink-0" style={{ background: 'var(--brand-soft)' }}>
                <Bot className="w-3 h-3" style={{ color: 'var(--brand)' }} />
              </div>
              <div className="px-3.5 py-2.5 rounded-2xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line-1)' }}>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-3" />
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 p-3" style={{ borderTop: '1px solid var(--line-1)' }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
            placeholder="Escreva uma mensagem…" disabled={sending}
            className="flex-1 h-10 px-3.5 rounded-lg text-[13px] text-1 outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-ring)] transition"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line-2)' }}
          />
          <Btn variant="primary" size="md" onClick={() => send(input)} disabled={sending || !input.trim()}>
            <Send className="w-3.5 h-3.5" />
          </Btn>
        </div>
      </div>
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────
export default function TreinamentoPage() {
  const [section, setSection] = useState<SecId>('overview')
  const qc = useQueryClient()

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
  const assistantName = assistant?.name || 'Alice'

  function invalidate() { qc.invalidateQueries({ queryKey: ['assistant'] }) }

  return (
    <div className="mx-auto max-w-[1240px] px-8 py-8 space-y-8">
      {/* Sub-header with subtitle + actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap -mt-2">
        <p className="text-[13px] text-2">Configure como {assistantName} atende seus pacientes</p>
        <div className="flex items-center gap-2">
          <Btn variant="ghost" size="sm">Histórico</Btn>
          <Btn variant="primary" size="sm">
            <Sparkles className="w-3 h-3" />
            Salvar e publicar
          </Btn>
        </div>
      </div>

      {/* Hero compacto */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--line-1)', boxShadow: 'var(--shadow-md, 0 4px 16px -4px rgba(0,0,0,0.12))' }}>
        <div className="relative p-6 flex items-center gap-5 flex-wrap"
          style={{ background: 'radial-gradient(120% 80% at 90% 0%, rgba(0,194,124,0.10) 0%, rgba(0,194,124,0) 60%), var(--bg-elevated)' }}>
          <div className="w-14 h-14 rounded-2xl grid place-items-center shrink-0 bg-gradient-to-br from-[#00C27C] to-[#00E892] shadow-[0_8px_24px_-8px_rgba(0,194,124,0.6)]">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[20px] font-semibold tracking-tight text-1">{assistantName}</h2>
              <Badge variant={aiPaused ? 'danger' : 'success'}>
                <CheckCircle2 className="w-2.5 h-2.5" />
                {aiPaused ? 'Pausada' : 'Ativa'}
              </Badge>
            </div>
            <p className="text-[13px] text-2 mt-0.5">
              Atendente virtual · respondendo no WhatsApp
            </p>
          </div>
          <div className="flex items-center gap-6 text-right">
            <div>
              <div className="text-[10.5px] text-3 uppercase tracking-wider">Conversas hoje</div>
              <div className="text-[18px] font-semibold text-1 tabular-nums">
                {convStats?.total_conversations ?? '—'}
              </div>
            </div>
            <div>
              <div className="text-[10.5px] text-3 uppercase tracking-wider">Resolução</div>
              <div className="text-[18px] font-semibold text-1 tabular-nums">—</div>
            </div>
            <div>
              <div className="text-[10.5px] text-3 uppercase tracking-wider">CSAT</div>
              <div className="text-[18px] font-semibold text-1 tabular-nums">—</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar nav + content */}
      <div className="grid grid-cols-[220px_1fr] gap-8">
        <nav className="space-y-0.5 sticky top-24 h-fit">
          {SECTIONS.map(s => {
            const Icon = s.icon
            const active = s.id === section
            return (
              <button key={s.id} onClick={() => setSection(s.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-[12.5px] font-medium transition',
                  active
                    ? 'bg-[var(--brand-soft)] text-[var(--brand)]'
                    : 'text-2 hover:bg-[var(--bg-surface)] hover:text-1',
                )}>
                <Icon className="w-[15px] h-[15px] shrink-0" strokeWidth={1.75} />
                <span className="flex-1 text-left">{s.label}</span>
                {active && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
              </button>
            )
          })}
        </nav>

        <div className="min-w-0 space-y-6">
          {section === 'overview' && (
            <>
              <Card>
                <SectionTitle title="Status & versão" hint="Visão rápida da configuração atual" />
                <div className="divide-y divide-[var(--line-1)]">
                  <Row title="Status" desc="A assistente está respondendo automaticamente"
                    control={<Badge variant={aiPaused ? 'danger' : 'success'}>{aiPaused ? 'Pausada' : 'Ativa'}</Badge>} />
                  <Row title="Versão publicada" desc="Baseada nas suas configurações salvas"
                    control={<span className="text-[12.5px] font-mono text-2">v3.2</span>} />
                  <Row title="Modelo" desc="Frame AI · especializado em saúde"
                    control={<span className="text-[12.5px] text-2">Padrão</span>} />
                  <Row title="Canais conectados" desc="WhatsApp Business"
                    control={<span className="text-[12.5px] text-2">1 ativo</span>} />
                </div>
              </Card>

              <Card>
                <SectionTitle title={`O que ${assistantName} sabe fazer`} hint="Habilidades treinadas" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    'Qualificar leads de WhatsApp',
                    'Agendar consultas',
                    'Confirmar consultas 24h antes',
                    'Responder FAQ sobre planos',
                    'Coletar dados de novos pacientes',
                    'Transferir para humano quando necessário',
                  ].map(cap => (
                    <div key={cap} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border"
                      style={{ background: 'var(--bg-surface)', borderColor: 'var(--line-1)' }}>
                      <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--brand)' }} />
                      <span className="text-[12.5px] text-1">{cap}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}

          {section === 'persona'   && <PersonaSection   assistant={assistant} onSave={invalidate} />}
          {section === 'welcome'   && <WelcomeSection   assistant={assistant} onSave={invalidate} />}
          {section === 'services'  && <ServicesSection />}
          {section === 'rules'     && <RulesSection />}
          {section === 'knowledge' && <KnowledgeSection assistant={assistant} onSave={invalidate} />}
          {section === 'limits'    && <LimitsSection    assistant={assistant} onSave={invalidate} />}
          {section === 'handoff'   && <HandoffSection   assistant={assistant} onSave={invalidate} />}
          {section === 'test'      && <TestSection />}
        </div>
      </div>
    </div>
  )
}
