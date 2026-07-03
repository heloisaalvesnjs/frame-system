'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FileImage, FileText, X as XIcon, Loader2, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { Card, Badge, Btn, Toggle } from '@/components/ui/finance-primitives'

const DEFAULT_SERVICES_MSG =
`Tenho algumas opções para você 😊

{planos}

Qual dessas faz mais sentido pra você agora? Se tiver dúvida, me conta e te ajudo a escolher a melhor!`

// ── Service types ─────────────────────────────────────────────────
type Service = {
  id: string
  name: string
  category?: string
  modality: 'online' | 'presencial' | 'ambos'
  price?: number
  description?: string
}

type ServiceForm = {
  name: string
  category: string
  modality: 'online' | 'presencial' | 'ambos'
  price: string
  description: string
}

// ── Service modal ─────────────────────────────────────────────────
function ServiceModal({ service, onClose, onSaved }: {
  service: Service | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<ServiceForm>({
    name: service?.name || '',
    category: service?.category || '',
    modality: service?.modality || 'ambos',
    price: service?.price != null ? String(service.price) : '',
    description: service?.description || '',
  })
  const [saving, setSaving] = useState(false)

  const f = (field: keyof ServiceForm) => (v: string) =>
    setForm(prev => ({ ...prev, [field]: v }))

  async function save() {
    if (!form.name.trim()) { toast.error('Nome obrigatório'); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim() || undefined,
        modality: form.modality,
        price: form.price ? Number(form.price) : undefined,
        description: form.description.trim() || undefined,
      }
      if (service) {
        await api.put(`/api/services/${service.id}`, payload)
      } else {
        await api.post('/api/services', payload)
      }
      toast.success(service ? 'Serviço atualizado!' : 'Serviço criado!')
      onSaved()
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Erro ao salvar serviço')
    } finally { setSaving(false) }
  }

  const inputClass = 'w-full h-9 px-3 rounded-lg text-[13px] outline-none transition focus:ring-2'
  const inputStyle = { background: 'var(--raised)', color: 'var(--t1)', border: '1px solid var(--border)' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 space-y-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-elevated)' }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold" style={{ color: 'var(--t1)' }}>
            {service ? 'Editar serviço' : 'Novo serviço'}
          </h3>
          <button onClick={onClose} className="transition hover:opacity-70" style={{ color: 'var(--t3)' }}>
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11.5px] font-medium block mb-1" style={{ color: 'var(--t3)' }}>Nome *</label>
            <input
              value={form.name}
              onChange={e => f('name')(e.target.value)}
              placeholder="Ex: Consulta inicial"
              className={inputClass}
              style={inputStyle}
            />
          </div>

          <div>
            <label className="text-[11.5px] font-medium block mb-1" style={{ color: 'var(--t3)' }}>Categoria</label>
            <input
              value={form.category}
              onChange={e => f('category')(e.target.value)}
              placeholder="Ex: Consulta, Plano, Pacote"
              className={inputClass}
              style={inputStyle}
            />
          </div>

          <div>
            <label className="text-[11.5px] font-medium block mb-1" style={{ color: 'var(--t3)' }}>Modalidade</label>
            <select
              value={form.modality}
              onChange={e => f('modality')(e.target.value as 'online' | 'presencial' | 'ambos')}
              className={inputClass}
              style={inputStyle}
            >
              <option value="online">Online</option>
              <option value="presencial">Presencial</option>
              <option value="ambos">Online + Presencial</option>
            </select>
          </div>

          <div>
            <label className="text-[11.5px] font-medium block mb-1" style={{ color: 'var(--t3)' }}>Preço (R$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={e => f('price')(e.target.value)}
              placeholder="0,00"
              className={inputClass}
              style={inputStyle}
            />
          </div>

          <div>
            <label className="text-[11.5px] font-medium block mb-1" style={{ color: 'var(--t3)' }}>Descrição</label>
            <textarea
              value={form.description}
              onChange={e => f('description')(e.target.value)}
              rows={3}
              placeholder="Descreva brevemente o serviço..."
              className="w-full px-3 py-2 rounded-lg text-[13px] outline-none resize-none transition focus:ring-2"
              style={inputStyle}
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <Btn variant="ghost" size="sm" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" size="sm" onClick={save} disabled={saving}>
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Salvar
          </Btn>
        </div>
      </div>
    </div>
  )
}

// ── Tag de status ─────────────────────────────────────────────────
function StatusTag({ active }: { active: boolean }) {
  return <Badge variant={active ? 'success' : 'default'}>{active ? 'ATIVO' : 'INATIVO'}</Badge>
}

// ── Card de modalidade (upload de arquivo) ────────────────────────
type MediaVariant = 'geral' | 'online' | 'presencial'
type MediaEntry = { type: string; name: string; enabled: boolean } | null

function ModalityCard({ emoji, iconBg, title, subtitle, info, loading, onUpload, onDelete, onToggle }: {
  emoji: string; iconBg: string; title: string; subtitle: string
  info: MediaEntry; loading: boolean
  onUpload: (f: File) => void; onDelete: () => void; onToggle: (v: boolean) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const hasFile = !!info
  const active = !!info?.enabled

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) onUpload(f)
  }

  return (
    <Card className="!p-[18px]">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3.5">
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: iconBg }}
        >
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: 'var(--t1)' }}>{title}</p>
          <p className="text-[11px]" style={{ color: 'var(--t2)' }}>{subtitle}</p>
        </div>
        <Toggle
          checked={active}
          disabled={!hasFile}
          onChange={onToggle}
          size="lg"
        />
      </div>

      {/* Área de upload */}
      <div className="mb-2.5">
        <p className="text-[11px] font-semibold mb-1.5 tracking-wide" style={{ color: 'var(--t2)' }}>ARQUIVO DO PLANO</p>
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !loading && inputRef.current?.click()}
          className={cn('rounded-[10px] p-[18px] text-center cursor-pointer transition-colors', loading && 'opacity-50 pointer-events-none')}
          style={{
            border: '2px dashed',
            borderColor: dragging ? 'var(--brand)' : 'var(--border)',
            background: hasFile ? 'rgba(0,194,124,0.03)' : dragging ? 'rgba(0,194,124,0.05)' : undefined,
            opacity: hasFile && !active ? 0.6 : undefined,
          }}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 mx-auto animate-spin" style={{ color: 'var(--brand)' }} />
          ) : hasFile ? (
            <>
              <div className="flex items-center justify-center mb-1.5">
                {info!.type === 'pdf'
                  ? <FileText className="w-5 h-5" style={{ color: 'var(--brand)' }} />
                  : <FileImage className="w-5 h-5" style={{ color: 'var(--brand)' }} />}
              </div>
              <p className="text-xs font-semibold truncate px-1" style={{ color: 'var(--brand)' }}>{info!.name}</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--t3)' }}>1 arquivo carregado</p>
              <div className="flex items-center justify-center gap-2 mt-2.5">
                <Btn variant="secondary" size="sm" className="!text-[11px]">Trocar arquivo</Btn>
                <Btn
                  variant="ghost"
                  size="sm"
                  onClick={e => { e.stopPropagation(); onDelete() }}
                  className="!px-1.5 !text-[var(--t3)] hover:!text-[var(--danger)]"
                  title="Remover arquivo"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </Btn>
              </div>
            </>
          ) : (
            <>
              <div className="text-xl mb-1.5">📄</div>
              <p className="text-xs font-semibold" style={{ color: 'var(--t2)' }}>Arraste PDF ou imagem</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--t3)' }}>ou clique para selecionar</p>
              <span className="inline-block mt-2.5">
                <Btn variant="secondary" size="sm" className="!text-[11px]">Selecionar arquivo</Btn>
              </span>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg,application/pdf"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = '' }}
          />
        </div>
      </div>

      <p className="text-[11px]" style={{ color: 'var(--t3)' }}>Aceita: PDF, JPG, PNG · Máx. 10MB</p>
    </Card>
  )
}

// ── Grupo de mensagem (settings-group) ────────────────────────────
function MsgGroup({ title, subtitle, enabled, onToggle, text, onTextChange, variables, defaultMsg, onSave, saving, dirty, onReset }: {
  title: string; subtitle: string; enabled: boolean; onToggle: (v: boolean) => void
  text: string; onTextChange: (v: string) => void; variables: string[]
  defaultMsg: string; onSave: () => void; saving: boolean; dirty: boolean
  onReset?: () => void
}) {
  return (
    <Card className="!p-0 overflow-hidden">
      {/* Linha principal */}
      <div className="flex items-center justify-between gap-4 px-[18px] py-3.5">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold" style={{ color: 'var(--t1)' }}>{title}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--t2)' }}>{subtitle}</p>
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <StatusTag active={enabled} />
          <Toggle checked={enabled} onChange={onToggle} size="lg" />
        </div>
      </div>

      {/* Painel da mensagem */}
      <div className="px-[18px] py-3" style={{ background: 'var(--raised)' }}>
        <textarea
          value={text}
          onChange={e => enabled && onTextChange(e.target.value)}
          rows={enabled ? 5 : 2}
          disabled={!enabled}
          placeholder={defaultMsg}
          className="w-full rounded-xl px-3.5 py-2.5 text-xs resize-none focus:outline-none transition-all leading-relaxed"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--t1)',
            opacity: enabled ? 1 : 0.5,
          }}
        />

        {enabled && (
          <div className="mt-2 space-y-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono" style={{ color: 'var(--t3)' }}>Variáveis:</span>
              {variables.map(v => (
                <button
                  key={v}
                  onClick={() => onTextChange(text + v)}
                  className="font-mono text-[11px] px-2 py-0.5 rounded-full transition-colors"
                  style={{ background: 'var(--brand-s)', color: 'var(--brand)' }}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Btn onClick={onSave} disabled={saving || !dirty} size="sm">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Salvar mensagem
              </Btn>
              {onReset && (
                <Btn variant="ghost" size="sm" onClick={onReset} className="!text-[var(--t3)]">
                  Restaurar padrão
                </Btn>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

// ── Página ────────────────────────────────────────────────────────
export default function ServicosPage() {
  const qc = useQueryClient()

  // ── Services state ─────────────────────────────────────────
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)

  const { data: servicesData } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: () => api.get('/api/services').then(r => r.data.services ?? []),
  })
  const services = servicesData ?? []

  async function deleteService(id: string) {
    try {
      await api.delete(`/api/services/${id}`)
      qc.invalidateQueries({ queryKey: ['services'] })
      toast.success('Serviço removido.')
    } catch { toast.error('Erro ao remover serviço') }
  }

  function openNew() { setEditingService(null); setShowServiceModal(true) }
  function openEdit(s: Service) { setEditingService(s); setShowServiceModal(true) }
  function closeModal() { setShowServiceModal(false); setEditingService(null) }
  function onSaved() { qc.invalidateQueries({ queryKey: ['services'] }); closeModal() }

  // ── Planos/media state ─────────────────────────────────────
  const [plansMedia, setPlansMedia] = useState<Record<MediaVariant, MediaEntry>>({ geral: null, online: null, presencial: null })
  const [uploadingVariant, setUploadingVariant] = useState<MediaVariant | null>(null)

  const [msgEnabled, setMsgEnabled] = useState(false)
  const [msgText, setMsgText] = useState(DEFAULT_SERVICES_MSG)
  const [msgOnlineEnabled, setMsgOnlineEnabled] = useState(false)
  const [msgOnlineText, setMsgOnlineText] = useState('')
  const [msgPresencialEnabled, setMsgPresencialEnabled] = useState(false)
  const [msgPresencialText, setMsgPresencialText] = useState('')
  const [savingMsg, setSavingMsg] = useState(false)
  const [msgDirty, setMsgDirty] = useState(false)

  const { data: assistantData } = useQuery<any>({
    queryKey: ['assistant'],
    queryFn: async () => { const { data } = await api.get('/api/assistants'); return data.assistant }
  })

  useEffect(() => {
    if (assistantData) {
      const pm = assistantData.plans_media ?? {}
      setPlansMedia({
        geral:      pm.geral      ? { type: pm.geral.type,      name: pm.geral.name,      enabled: pm.geral.enabled      } : null,
        online:     pm.online     ? { type: pm.online.type,     name: pm.online.name,     enabled: pm.online.enabled     } : null,
        presencial: pm.presencial ? { type: pm.presencial.type, name: pm.presencial.name, enabled: pm.presencial.enabled } : null,
      })
      setMsgEnabled(assistantData.services_message_enabled ?? false)
      setMsgText(assistantData.services_message || DEFAULT_SERVICES_MSG)
      setMsgOnlineEnabled(assistantData.services_message_online_enabled ?? false)
      setMsgOnlineText(assistantData.services_message_online || '')
      setMsgPresencialEnabled(assistantData.services_message_presencial_enabled ?? false)
      setMsgPresencialText(assistantData.services_message_presencial || '')
      setMsgDirty(false)
    }
  }, [assistantData])

  function buildPayload(overrides: Record<string, unknown> = {}) {
    if (!assistantData) return null
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

  async function uploadMedia(file: File, variant: MediaVariant) {
    setUploadingVariant(variant)
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post(`/api/assistants/plans-media?variant=${variant}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setPlansMedia(prev => ({ ...prev, [variant]: { type: data.type, name: data.name || file.name, enabled: true } }))
      qc.invalidateQueries({ queryKey: ['assistant'] })
      toast.success('Arquivo enviado!')
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Erro ao enviar arquivo')
    } finally { setUploadingVariant(null) }
  }

  async function deleteMedia(variant: MediaVariant) {
    try {
      await api.delete(`/api/assistants/plans-media?variant=${variant}`)
      setPlansMedia(prev => ({ ...prev, [variant]: null }))
      qc.invalidateQueries({ queryKey: ['assistant'] })
      toast.success('Arquivo removido.')
    } catch { toast.error('Erro ao remover arquivo') }
  }

  async function toggleMedia(variant: MediaVariant, val: boolean) {
    setPlansMedia(prev => ({ ...prev, [variant]: prev[variant] ? { ...prev[variant]!, enabled: val } : null }))
    try {
      await api.patch(`/api/assistants/plans-media/toggle?variant=${variant}`, { enabled: val })
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
    } finally { setSavingMsg(false) }
  }

  async function toggleMsg(val: boolean) {
    setMsgEnabled(val)
    if (!assistantData) return
    const payload = buildPayload({ services_message_enabled: val })
    if (!payload) return
    try { await api.post('/api/assistants', payload); qc.invalidateQueries({ queryKey: ['assistant'] }) }
    catch { toast.error('Erro ao salvar.') }
  }

  async function toggleMsgOnline(val: boolean) {
    setMsgOnlineEnabled(val)
    if (!assistantData) return
    const payload = buildPayload({ services_message_online_enabled: val })
    if (!payload) return
    try { await api.post('/api/assistants', payload); qc.invalidateQueries({ queryKey: ['assistant'] }) }
    catch { toast.error('Erro ao salvar.') }
  }

  async function toggleMsgPresencial(val: boolean) {
    setMsgPresencialEnabled(val)
    if (!assistantData) return
    const payload = buildPayload({ services_message_presencial_enabled: val })
    if (!payload) return
    try { await api.post('/api/assistants', payload); qc.invalidateQueries({ queryKey: ['assistant'] }) }
    catch { toast.error('Erro ao salvar.') }
  }

  const modalityLabel: Record<string, string> = {
    online: 'Online',
    presencial: 'Presencial',
    ambos: 'Online + Presencial',
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {showServiceModal && (
        <ServiceModal service={editingService} onClose={closeModal} onSaved={onSaved} />
      )}

      <div>
        <h1 className="font-display font-bold text-[22px] tracking-tight" style={{ color: 'var(--t1)' }}>Serviços & Planos</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--t3)' }}>Configure os serviços oferecidos e as mensagens automáticas de entrega</p>
      </div>

      {/* ── Serviços ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Serviços</h2>
          <Btn variant="secondary" size="sm" onClick={openNew}>+ Novo serviço</Btn>
        </div>
        <Card>
          {services.length === 0 ? (
            <div className="py-8 text-center text-[13px]" style={{ color: 'var(--t3)' }}>
              Nenhum serviço cadastrado.{' '}
              <button className="underline transition hover:opacity-70" style={{ color: 'var(--brand)' }} onClick={openNew}>
                Adicionar agora
              </button>
            </div>
          ) : (
            <div className="divide-y" style={{ '--tw-divide-color': 'var(--border)' } as any}>
              {services.map(s => (
                <div key={s.id} className="flex items-center gap-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium" style={{ color: 'var(--t1)' }}>{s.name}</div>
                    <div className="text-[12px] mt-0.5" style={{ color: 'var(--t3)' }}>
                      {[
                        s.category,
                        modalityLabel[s.modality] ?? s.modality,
                        s.price != null ? `R$ ${Number(s.price).toFixed(0)}` : '',
                      ].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="success">Ativo</Badge>
                    <Btn variant="ghost" size="sm" onClick={() => openEdit(s)}>Editar</Btn>
                    <Btn
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteService(s.id)}
                      className="!px-1.5 !text-[var(--t3)] hover:!text-[var(--danger)]"
                      title="Remover serviço"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Btn>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Planos e mensagens automáticas ───────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--t1)' }}>Planos e mensagens automáticas</h2>

        {/* Modalidades de atendimento */}
        <div className="mb-4">
          <p className="text-[12px] mb-3" style={{ color: 'var(--t2)' }}>Modalidades de atendimento — arquivo de plano por canal</p>
          <div className="grid md:grid-cols-3 gap-3.5">
            <ModalityCard
              emoji="🌐"
              iconBg="rgba(10,132,255,0.1)"
              title="Online"
              subtitle="Teleconsulta / remoto"
              info={plansMedia.online}
              loading={uploadingVariant === 'online'}
              onUpload={f => uploadMedia(f, 'online')}
              onDelete={() => deleteMedia('online')}
              onToggle={v => toggleMedia('online', v)}
            />
            <ModalityCard
              emoji="📍"
              iconBg="rgba(0,194,124,0.1)"
              title="Presencial"
              subtitle="Consultório / clínica"
              info={plansMedia.presencial}
              loading={uploadingVariant === 'presencial'}
              onUpload={f => uploadMedia(f, 'presencial')}
              onDelete={() => deleteMedia('presencial')}
              onToggle={v => toggleMedia('presencial', v)}
            />
            <ModalityCard
              emoji="✨"
              iconBg="rgba(191,90,242,0.1)"
              title="Geral"
              subtitle="Ambas as modalidades"
              info={plansMedia.geral}
              loading={uploadingVariant === 'geral'}
              onUpload={f => uploadMedia(f, 'geral')}
              onDelete={() => deleteMedia('geral')}
              onToggle={v => toggleMedia('geral', v)}
            />
          </div>
          <p className="text-[11px] mt-2.5" style={{ color: 'var(--t3)' }}>
            A IA envia o arquivo automaticamente ao apresentar os planos
          </p>
        </div>

        {/* Mensagens dos planos */}
        <div>
          <p className="text-[12px] mb-3" style={{ color: 'var(--t2)' }}>Mensagens automáticas ao apresentar planos</p>
          <div className="flex flex-col gap-2.5">
            <MsgGroup
              title="Mensagem planos Online"
              subtitle="Enviada automaticamente quando o cliente pergunta sobre planos online"
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
            <MsgGroup
              title="Mensagem planos Presenciais"
              subtitle="Enviada automaticamente quando o cliente pergunta sobre planos presenciais"
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
            <MsgGroup
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
      </div>
    </div>
  )
}
