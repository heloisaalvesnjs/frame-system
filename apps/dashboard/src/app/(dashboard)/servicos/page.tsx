'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ShoppingBag, Sparkles, MessageSquare, Info, Upload, FileImage, FileText, X as XIcon } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

const CATEGORIES = ['Consulta', 'Pacote', 'Retorno', 'Avaliação', 'Outro']

interface Service { id: string; name: string; category: string; modality: 'online' | 'presencial' | 'ambos'; price: string; description: string }

// ── Templates pré-definidos ───────────────────────────────────────
const TEMPLATES: Omit<Service, 'id'>[] = [
  {
    name: 'Consultoria Online – Trimestral',
    category: 'Pacote',
    modality: 'online',
    price: '3x de R$248,84',
    description: '90 dias · plataforma completa + suporte · check-in quinzenal com ajustes reais · suporte ativo no WhatsApp · grupo individualizado direto com o David e equipe'
  },
  {
    name: 'Consultoria Online – Semestral',
    category: 'Pacote',
    modality: 'online',
    price: '6x de R$206,79',
    description: 'Melhor custo-benefício · grupo com David e equipe · área fitness inclusa · acompanhamento quinzenal · plano alimentar personalizado · menos de R$7/dia'
  },
  {
    name: 'Consultoria Online – Anual',
    category: 'Pacote',
    modality: 'online',
    price: '12x de R$156,27',
    description: 'Maior transformação · tudo incluso · plataforma completa + suporte · plano alimentar para sua realidade · acompanhamento de verdade, não genérico'
  },
  {
    name: 'Consultoria Presencial – Mensal',
    category: 'Consulta',
    modality: 'presencial',
    price: 'R$600 à vista',
    description: '1 consulta presencial · avaliação física · plano personalizado · suporte WhatsApp · Dossiê Evolutivo'
  },
  {
    name: 'Consultoria Presencial – Trimestral',
    category: 'Pacote',
    modality: 'presencial',
    price: '3x de R$414,63',
    description: 'Mais popular · 3 consultas presenciais · 3 avaliações físicas · treino individual elaborado · check-in quinzenal · Dossiê Evolutivo completo'
  },
  {
    name: 'Consultoria Presencial – Semestral',
    category: 'Pacote',
    modality: 'presencial',
    price: '6x de R$362,73',
    description: 'Máxima transformação · 6 consultas · 6 monitoramentos · treino individual · ficha de treino · Dossiê Evolutivo semestral · planejamento dos próximos passos'
  },
]

const DEFAULT_SERVICES_MSG =
`Tenho algumas opções para você 😊

{planos}

Qual dessas faz mais sentido pra você agora? Se tiver dúvida, me conta e te ajudo a escolher a melhor!`

const MODALITY_OPTIONS = [
  { value: 'online',     label: '🌐 Online',      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
  { value: 'presencial', label: '📍 Presencial',   color: 'text-violet-500 bg-violet-500/10 border-violet-500/20' },
  { value: 'ambos',      label: '↔ Ambos',         color: 'text-brand-500 bg-brand-500/10 border-brand-500/20' },
] as const

function ModalityBadge({ modality }: { modality: string }) {
  const opt = MODALITY_OPTIONS.find(o => o.value === modality)
  if (!opt) return null
  return (
    <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full border ${opt.color}`}>
      {opt.label}
    </span>
  )
}

function ServiceForm({ initial, onSave, onCancel }: {
  initial?: Partial<Service>
  onSave: (data: Omit<Service, 'id'>) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    name:        initial?.name || '',
    category:    initial?.category || 'Consulta',
    modality:    (initial?.modality || 'presencial') as 'online' | 'presencial' | 'ambos',
    price:       initial?.price || '',
    description: initial?.description || '',
  })
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!form.name.trim()) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="rounded-xl p-4 space-y-4" style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
      <p className="font-mono text-[11px] text-t2 tracking-wider">{initial?.id ? 'EDITAR SERVIÇO' : 'NOVO SERVIÇO'}</p>

      {/* Modalidade — destaque no topo */}
      <div>
        <label className="text-[12px] font-medium text-t2 font-mono tracking-wide block mb-2">Modalidade</label>
        <div className="flex gap-2">
          {MODALITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setForm(v => ({ ...v, modality: opt.value }))}
              className={cn(
                'flex-1 py-2 rounded-lg border text-sm font-medium transition-all',
                form.modality === opt.value ? opt.color : 'text-t3 hover:text-t2'
              )}
              style={{ borderColor: form.modality === opt.value ? undefined : 'var(--border)' }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input label="Nome do plano" placeholder="Ex: Mensal, Trimestral..." value={form.name}
          onChange={e => setForm(v => ({ ...v, name: e.target.value }))} />
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-t2 font-mono tracking-wide">Categoria</label>
          <select value={form.category} onChange={e => setForm(v => ({ ...v, category: e.target.value }))}
            className="h-9 w-full rounded-lg px-3 text-sm text-t1 focus:outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <Input label="Valor" placeholder="Ex: R$ 250 ou 3x de R$148" value={form.price}
          onChange={e => setForm(v => ({ ...v, price: e.target.value }))} />
        <Input label="Descrição curta" placeholder="O que está incluso..." value={form.description}
          onChange={e => setForm(v => ({ ...v, description: e.target.value }))} />
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={submit} loading={saving} disabled={!form.name.trim()}>Salvar</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  )
}

// ── Toggle component ──────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
        checked ? 'bg-brand-500' : 'bg-t3/30'
      )}
    >
      <span className={cn(
        'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200',
        checked ? 'translate-x-4' : 'translate-x-0'
      )} />
    </button>
  )
}

// ── MsgCard ──────────────────────────────────────────────────────
function MsgCard({ title, subtitle, enabled, onToggle, text, onTextChange, variables, defaultMsg, onSave, saving, dirty, onReset }: {
  title: string; subtitle: string; enabled: boolean; onToggle: (v: boolean) => void
  text: string; onTextChange: (v: string) => void; variables: string[]
  defaultMsg: string; onSave: () => void; saving: boolean; dirty: boolean
  onReset?: () => void
}) {
  return (
    <Card>
      <CardContent className="py-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MessageSquare className="w-4 h-4 text-brand-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-t1">{title}</p>
              <p className="text-xs text-t3 mt-0.5">{subtitle}</p>
            </div>
          </div>
          <Toggle checked={enabled} onChange={onToggle} />
        </div>

        {enabled && (
          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs"
              style={{ background: 'var(--brand-s)', border: '1px solid rgba(0,194,124,.15)' }}>
              <Info className="w-3.5 h-3.5 text-brand-500 flex-shrink-0 mt-0.5" />
              <div className="text-t2 leading-relaxed">
                A assistente vai enviar essa mensagem <strong className="text-t1">exatamente como você escreveu</strong>. Use as variáveis abaixo para inserir os planos automaticamente.
              </div>
            </div>

            <div className="relative">
              <textarea
                value={text}
                onChange={e => onTextChange(e.target.value)}
                rows={6}
                placeholder={defaultMsg}
                className="w-full rounded-xl px-4 py-3 text-sm text-t1 resize-none focus:outline-none transition-colors leading-relaxed"
                style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
              />
              <span className="absolute bottom-2.5 right-3 font-mono text-[10px] text-t3">{text.length} chars</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-t3 font-mono">Variáveis:</span>
              {variables.map(v => (
                <button key={v} onClick={() => onTextChange(text + v)}
                  className="font-mono text-[11px] text-brand-500 bg-brand-500/10 hover:bg-brand-500/20 px-2 py-0.5 rounded-full transition-colors">
                  {v}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" onClick={onSave} loading={saving} disabled={!dirty}>Salvar mensagens</Button>
              {onReset && (
                <button onClick={onReset} className="text-xs text-t3 hover:text-t2 transition-colors px-2 py-1.5">
                  Restaurar padrão
                </button>
              )}
            </div>
          </div>
        )}

        {!enabled && (
          <p className="text-xs text-t3 leading-relaxed px-1">
            Quando desativado, a assistente usa o padrão do sistema para esta modalidade.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default function ServicosPage() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<Partial<Service> | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [addingTemplates, setAddingTemplates] = useState<Set<number>>(new Set())

  // Mídia dos planos
  const [mediaEnabled, setMediaEnabled] = useState(false)
  const [mediaInfo, setMediaInfo] = useState<{ type: string; name: string } | null>(null)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const mediaFileRef = useRef<HTMLInputElement>(null)

  // Mensagens personalizadas
  const [msgEnabled, setMsgEnabled] = useState(false)
  const [msgText, setMsgText] = useState(DEFAULT_SERVICES_MSG)
  const [msgOnlineEnabled, setMsgOnlineEnabled] = useState(false)
  const [msgOnlineText, setMsgOnlineText] = useState('')
  const [msgPresencialEnabled, setMsgPresencialEnabled] = useState(false)
  const [msgPresencialText, setMsgPresencialText] = useState('')
  const [savingMsg, setSavingMsg] = useState(false)
  const [msgDirty, setMsgDirty] = useState(false)

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: async () => { const { data } = await api.get('/api/services'); return data.services }
  })

  const { data: assistantData } = useQuery<any>({
    queryKey: ['assistant'],
    queryFn: async () => { const { data } = await api.get('/api/assistants'); return data.assistant }
  })

  // Sincroniza estado com dados do assistente
  useEffect(() => {
    if (assistantData) {
      setMediaEnabled(assistantData.plans_media_enabled ?? false)
      setMediaInfo(assistantData.has_plans_media ? {
        type: assistantData.plans_media_type ?? 'image',
        name: assistantData.plans_media_original_name ?? 'arquivo',
      } : null)
      setMsgEnabled(assistantData.services_message_enabled ?? false)
      setMsgText(assistantData.services_message || DEFAULT_SERVICES_MSG)
      setMsgOnlineEnabled(assistantData.services_message_online_enabled ?? false)
      setMsgOnlineText(assistantData.services_message_online || '')
      setMsgPresencialEnabled(assistantData.services_message_presencial_enabled ?? false)
      setMsgPresencialText(assistantData.services_message_presencial || '')
      setMsgDirty(false)
    }
  }, [assistantData])

  async function saveService(data: Omit<Service, 'id'>) {
    if ((editing as Service)?.id) {
      await api.put(`/api/services/${(editing as Service).id}`, data)
      toast.success('Serviço atualizado!')
    } else {
      await api.post('/api/services', data)
      toast.success('Serviço adicionado!')
    }
    qc.invalidateQueries({ queryKey: ['services'] })
    setEditing(null)
  }

  async function remove(id: string) {
    await api.delete(`/api/services/${id}`)
    toast.success('Serviço removido.')
    qc.invalidateQueries({ queryKey: ['services'] })
  }

  async function addTemplate(t: Omit<Service, 'id'>, idx: number) {
    setAddingTemplates(s => new Set(s).add(idx))
    try {
      await api.post('/api/services', t)
      qc.invalidateQueries({ queryKey: ['services'] })
      toast.success(`"${t.name}" adicionado!`)
    } catch { toast.error('Erro ao adicionar.') }
    finally { setAddingTemplates(s => { const n = new Set(s); n.delete(idx); return n }) }
  }

  function buildPayload(overrides: Record<string, unknown> = {}) {
    if (!assistantData) return null
    // Remove nulls e campos extras que o Zod não aceita
    const safe = Object.fromEntries(
      Object.entries(assistantData).filter(([, v]) => v !== null && v !== undefined)
    )
    return {
      ...safe,
      services_message: msgText,
      services_message_enabled: msgEnabled,
      services_message_online: msgOnlineText || undefined,
      services_message_online_enabled: msgOnlineEnabled,
      services_message_presencial: msgPresencialText || undefined,
      services_message_presencial_enabled: msgPresencialEnabled,
      ...overrides,
    }
  }

  async function uploadMedia(file: File) {
    setUploadingMedia(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post('/api/assistants/plans-media', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setMediaInfo({ type: data.type, name: data.original_name || file.name })
      setMediaEnabled(true)
      qc.invalidateQueries({ queryKey: ['assistant'] })
      toast.success('Arquivo enviado com sucesso!')
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Erro ao enviar arquivo')
    } finally { setUploadingMedia(false) }
  }

  async function deleteMedia() {
    try {
      await api.delete('/api/assistants/plans-media')
      setMediaInfo(null)
      setMediaEnabled(false)
      qc.invalidateQueries({ queryKey: ['assistant'] })
      toast.success('Arquivo removido.')
    } catch { toast.error('Erro ao remover arquivo') }
  }

  async function toggleMedia(val: boolean) {
    setMediaEnabled(val)
    try {
      await api.patch('/api/assistants/plans-media/toggle', { enabled: val })
      qc.invalidateQueries({ queryKey: ['assistant'] })
    } catch { toast.error('Erro ao salvar') }
  }

  async function saveMsgConfig() {
    if (!assistantData) { toast.error('Configure a assistente primeiro.'); return }
    const payload = buildPayload()
    if (!payload) return
    setSavingMsg(true)
    try {
      await api.post('/api/assistants', payload)
      qc.invalidateQueries({ queryKey: ['assistant'] })
      setMsgDirty(false)
      toast.success('Mensagens salvas!')
    } catch {
      toast.error('Erro ao salvar.')
    } finally {
      setSavingMsg(false)
    }
  }

  async function toggleMsg(val: boolean) {
    setMsgEnabled(val)
    if (!assistantData) return
    const payload = buildPayload({ services_message_enabled: val })
    if (!payload) return
    try {
      await api.post('/api/assistants', payload)
      qc.invalidateQueries({ queryKey: ['assistant'] })
    } catch { toast.error('Erro ao salvar.') }
  }

  async function toggleMsgOnline(val: boolean) {
    setMsgOnlineEnabled(val)
    if (!assistantData) return
    const payload = buildPayload({ services_message_online_enabled: val })
    if (!payload) return
    try {
      await api.post('/api/assistants', payload)
      qc.invalidateQueries({ queryKey: ['assistant'] })
    } catch { toast.error('Erro ao salvar.') }
  }

  async function toggleMsgPresencial(val: boolean) {
    setMsgPresencialEnabled(val)
    if (!assistantData) return
    const payload = buildPayload({ services_message_presencial_enabled: val })
    if (!payload) return
    try {
      await api.post('/api/assistants', payload)
      qc.invalidateQueries({ queryKey: ['assistant'] })
    } catch { toast.error('Erro ao salvar.') }
  }

  if (isLoading) return <div className="p-6 text-t2 text-sm">Carregando...</div>

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-[22px] tracking-tight text-t1">Serviços</h1>
          <p className="text-sm text-t2 mt-0.5">A assistente usa esses valores para responder sobre preços e planos</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowTemplates(v => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors border',
              showTemplates ? 'bg-brand-500/15 border-brand-500/40 text-brand-500' : 'border-theme text-t2 hover:text-t1'
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Templates
          </button>
          <Button size="sm" onClick={() => setEditing({})}>
            <Plus className="w-3.5 h-3.5" /> Novo serviço
          </Button>
        </div>
      </div>

      {/* Templates */}
      {showTemplates && (
        <Card>
          <CardContent className="py-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-brand-500" />
              <p className="text-sm font-semibold text-t1">Templates — Consultoria David Effgen</p>
              <span className="font-mono text-[10px] text-t3 ml-auto">Clique para adicionar</span>
            </div>
            <p className="font-mono text-[10px] text-t3 tracking-wider mb-2">ONLINE — PERFORMANCE REAL</p>
            <div className="space-y-2 mb-5">
              {TEMPLATES.slice(0, 3).map((t, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--raised)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-t1">{t.name}</p>
                    <p className="text-xs text-t2">{t.price}</p>
                  </div>
                  <Button size="sm" variant="secondary" loading={addingTemplates.has(i)} onClick={() => addTemplate(t, i)}>
                    Adicionar
                  </Button>
                </div>
              ))}
            </div>
            <p className="font-mono text-[10px] text-t3 tracking-wider mb-2">PRESENCIAL — PREMIUM</p>
            <div className="space-y-2">
              {TEMPLATES.slice(3).map((t, i) => (
                <div key={i+3} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--raised)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-t1">{t.name}</p>
                    <p className="text-xs text-t2">{t.price}</p>
                  </div>
                  <Button size="sm" variant="secondary" loading={addingTemplates.has(i+3)} onClick={() => addTemplate(t, i+3)}>
                    Adicionar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulário inline */}
      {editing && (
        <ServiceForm initial={editing} onSave={saveService} onCancel={() => setEditing(null)} />
      )}

      {/* Lista de serviços */}
      {services.length === 0 && !editing ? (
        <div className="flex flex-col items-center py-12 gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-brand-500" />
          </div>
          <p className="text-sm text-t2">Nenhum serviço ainda.</p>
          <p className="text-xs text-t3">Use o botão "Templates" para adicionar os planos rapidamente.</p>
          <button onClick={() => setShowTemplates(true)}
            className="mt-1 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-500 text-sm font-medium hover:bg-brand-500/15 transition-colors">
            <Sparkles className="w-3.5 h-3.5" /> Carregar templates
          </button>
        </div>
      ) : services.length > 0 ? (
        <div className="space-y-4">
          {(['online', 'presencial', 'ambos'] as const).map(mod => {
            const group = services.filter(s => (s.modality || 'presencial') === mod)
            if (group.length === 0) return null
            const labelMap = { online: '🌐 Online', presencial: '📍 Presencial', ambos: '↔ Online & Presencial' }
            return (
              <Card key={mod}>
                <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)', background: 'var(--raised)' }}>
                  <span className="text-sm font-semibold text-t1">{labelMap[mod]}</span>
                  <span className="font-mono text-[10px] text-t3 ml-1">{group.length} plano{group.length !== 1 ? 's' : ''}</span>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {group.map((s, i) => (
                      <tr key={s.id} style={{ borderTop: i > 0 ? '1px solid var(--border)' : undefined }}>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-t1">{s.name}</p>
                          {s.description && <p className="text-xs text-t3 mt-0.5 line-clamp-1">{s.description}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-[10px] text-brand-500 px-2 py-0.5 rounded-full bg-brand-500/10">{s.category}</span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-t1 whitespace-nowrap">{s.price || '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => setEditing(s)} className="p-1.5 rounded-lg text-t3 hover:text-t1 hover:bg-raised transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => remove(s.id)} className="p-1.5 rounded-lg text-t3 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )
          })}
        </div>
      ) : null}

      {/* ── Mídia dos Planos ──────────────────────────────────────── */}
      <Card>
        <CardContent className="py-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                {mediaInfo?.type === 'pdf' ? <FileText className="w-4 h-4 text-brand-500" /> : <FileImage className="w-4 h-4 text-brand-500" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-t1">Imagem ou PDF dos planos</p>
                <p className="text-xs text-t3 mt-0.5">
                  A IA envia automaticamente quando apresentar os planos ao cliente
                </p>
              </div>
            </div>
            {mediaInfo && <Toggle checked={mediaEnabled} onChange={toggleMedia} />}
          </div>

          {!mediaInfo ? (
            <label className={cn(
              'flex flex-col items-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors',
              uploadingMedia ? 'opacity-50 pointer-events-none' : 'hover:bg-raised'
            )} style={{ borderColor: 'var(--border)' }}>
              <Upload className="w-6 h-6 text-t3" />
              <span className="text-sm text-t2">
                {uploadingMedia ? 'Enviando...' : 'Clique para enviar imagem ou PDF dos planos'}
              </span>
              <span className="text-xs text-t3">JPG, PNG ou PDF · máx. 10MB</span>
              <input
                ref={mediaFileRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg,application/pdf"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadMedia(f); e.target.value = '' }}
              />
            </label>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
              <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                {mediaInfo.type === 'pdf'
                  ? <FileText className="w-5 h-5 text-brand-500" />
                  : <FileImage className="w-5 h-5 text-brand-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-t1 truncate">{mediaInfo.name}</p>
                <p className="text-xs text-t3 mt-0.5">
                  {mediaInfo.type === 'pdf' ? 'PDF' : 'Imagem'} · {mediaEnabled ? '✅ Ativa — será enviada automaticamente' : '⏸ Desativada'}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <label className="cursor-pointer text-xs text-brand-500 hover:text-brand-400 transition-colors">
                  Trocar
                  <input type="file" accept="image/jpeg,image/png,image/jpg,application/pdf" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadMedia(f); e.target.value = '' }} />
                </label>
                <button onClick={deleteMedia} className="p-1.5 text-t3 hover:text-red-500 transition-colors">
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {!mediaInfo && (
            <p className="text-xs text-t3 text-center">
              Exemplo: tabela de planos em imagem, cardápio de exemplo, apresentação em PDF
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Mensagens de Apresentação dos Planos ─────────────────── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-t1">Mensagens dos planos</h2>
          <p className="text-xs text-t3 mt-0.5">Configure exatamente o que a assistente diz ao apresentar seus planos</p>
        </div>

        {/* ── Card Online ── */}
        <MsgCard
          title="🌐 Mensagem dos planos Online"
          subtitle="Usada quando o cliente pergunta sobre planos online"
          enabled={msgOnlineEnabled}
          onToggle={toggleMsgOnline}
          text={msgOnlineText}
          onTextChange={v => { setMsgOnlineText(v); setMsgDirty(true) }}
          variables={['{planos_online}', '{planos}', '{nutri}']}
          defaultMsg={`Temos essas opções de consultoria online:\n\n{planos_online}\n\nQual faz mais sentido pra você agora?`}
          onSave={saveMsgConfig}
          saving={savingMsg}
          dirty={msgDirty}
        />

        {/* ── Card Presencial ── */}
        <MsgCard
          title="📍 Mensagem dos planos Presenciais"
          subtitle="Usada quando o cliente pergunta sobre planos presenciais"
          enabled={msgPresencialEnabled}
          onToggle={toggleMsgPresencial}
          text={msgPresencialText}
          onTextChange={v => { setMsgPresencialText(v); setMsgDirty(true) }}
          variables={['{planos_presencial}', '{planos}', '{nutri}']}
          defaultMsg={`Para o atendimento presencial temos:\n\n{planos_presencial}\n\nQual faz mais sentido pra você?`}
          onSave={saveMsgConfig}
          saving={savingMsg}
          dirty={msgDirty}
        />

        {/* ── Card Geral (fallback) ── */}
        <MsgCard
          title="Mensagem geral (todos os planos)"
          subtitle="Usada quando nenhuma mensagem específica acima estiver ativa"
          enabled={msgEnabled}
          onToggle={toggleMsg}
          text={msgText}
          onTextChange={v => { setMsgText(v); setMsgDirty(true) }}
          variables={['{planos}', '{planos_online}', '{planos_presencial}', '{nutri}']}
          defaultMsg={DEFAULT_SERVICES_MSG}
          onSave={saveMsgConfig}
          saving={savingMsg}
          dirty={msgDirty}
          onReset={() => { setMsgText(DEFAULT_SERVICES_MSG); setMsgDirty(true) }}
        />
      </div>

    </div>
  )
}
