'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { MessageSquare, Info, Upload, FileImage, FileText, X as XIcon, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

const DEFAULT_SERVICES_MSG =
`Tenho algumas opções para você 😊

{planos}

Qual dessas faz mais sentido pra você agora? Se tiver dúvida, me conta e te ajudo a escolher a melhor!`

// ── Toggle ────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="relative inline-flex flex-shrink-0 cursor-pointer rounded-full transition-all duration-200 focus:outline-none"
      style={{
        height: '24px',
        width: '44px',
        background: checked ? 'var(--brand)' : 'var(--raised)',
        border: checked ? 'none' : '1px solid var(--border)',
        boxShadow: checked ? '0 0 0 3px rgba(0,194,124,0.18)' : 'none',
      }}
      title={checked ? 'Ativo — clique para desativar' : 'Inativo — clique para ativar'}
    >
      <span
        className="absolute top-0.5 inline-block rounded-full shadow-sm transition-transform duration-200"
        style={{
          height: '20px',
          width: '20px',
          background: checked ? '#fff' : 'var(--t3)',
          transform: checked ? 'translateX(22px)' : 'translateX(2px)',
        }}
      />
    </button>
  )
}

// ── MsgCard ───────────────────────────────────────────────────────
function MsgCard({ title, subtitle, enabled, onToggle, text, onTextChange, variables, defaultMsg, onSave, saving, dirty, onReset }: {
  title: string; subtitle: string; enabled: boolean; onToggle: (v: boolean) => void
  text: string; onTextChange: (v: string) => void; variables: string[]
  defaultMsg: string; onSave: () => void; saving: boolean; dirty: boolean
  onReset?: () => void
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="px-5 py-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: 'var(--brand-s-solid)' }}
            >
              <MessageSquare className="w-4 h-4" style={{ color: 'var(--brand)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>{title}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className="font-mono text-[10px] tracking-wider transition-colors"
              style={{ color: enabled ? 'var(--brand)' : 'var(--t3)' }}
            >
              {enabled ? 'ATIVO' : 'INATIVO'}
            </span>
            <Toggle checked={enabled} onChange={onToggle} />
          </div>
        </div>

        {enabled && (
          <div className="space-y-3 pt-1">
            <div
              className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs"
              style={{ background: 'var(--brand-s)', border: '1px solid rgba(0,194,124,.15)' }}
            >
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--brand)' }} />
              <div className="leading-relaxed" style={{ color: 'var(--t2)' }}>
                A assistente vai enviar essa mensagem <strong style={{ color: 'var(--t1)' }}>exatamente como você escreveu</strong>. Use as variáveis abaixo para inserir os planos automaticamente.
              </div>
            </div>

            <div className="relative">
              <textarea
                value={text}
                onChange={e => onTextChange(e.target.value)}
                rows={6}
                placeholder={defaultMsg}
                className="w-full rounded-xl px-4 py-3 text-sm resize-none focus:outline-none transition-colors leading-relaxed"
                style={{ background: 'var(--raised)', border: '1px solid var(--border)', color: 'var(--t1)' }}
              />
              <span
                className="absolute bottom-2.5 right-3 font-mono text-[10px]"
                style={{ color: 'var(--t3)' }}
              >
                {text.length} chars
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono" style={{ color: 'var(--t3)' }}>Variáveis:</span>
              {variables.map(v => (
                <button
                  key={v}
                  onClick={() => onTextChange(text + v)}
                  className="font-mono text-[11px] px-2 py-0.5 rounded-full transition-colors"
                  style={{ background: 'var(--brand-s)', color: 'var(--brand)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--brand-s-solid)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--brand-s)'}
                >
                  {v}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button onClick={onSave} disabled={saving || !dirty} className="btn-primary text-[12px] px-3 py-1.5">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Salvar mensagens
              </button>
              {onReset && (
                <button
                  onClick={onReset}
                  className="text-xs px-2 py-1.5 transition-colors"
                  style={{ color: 'var(--t3)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--t2)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--t3)'}
                >
                  Restaurar padrão
                </button>
              )}
            </div>
          </div>
        )}

        {!enabled && (
          <p className="text-xs leading-relaxed px-1" style={{ color: 'var(--t3)' }}>
            Quando desativado, a assistente usa o padrão do sistema para esta modalidade.
          </p>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────
export default function PlanosPage() {
  const qc = useQueryClient()

  type MediaVariant = 'geral' | 'online' | 'presencial'
  type MediaEntry = { type: string; name: string; enabled: boolean } | null
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

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="font-bold text-[22px] tracking-tight" style={{ color: 'var(--t1)' }}>Planos</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--t2)' }}>Configure a imagem e a mensagem que a assistente envia ao apresentar os planos</p>
      </div>

      {/* ── Mídia dos Planos ──────────────────────────────────────── */}
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Imagem ou PDF dos planos</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>
            A IA envia automaticamente quando apresentar os planos — <strong style={{ color: 'var(--t2)' }}>sem listar preços em texto</strong>
          </p>
        </div>
        {([
          { variant: 'online'     as MediaVariant, label: '🌐 Online',    color: '#3B82F6',   bg: 'rgba(59,130,246,.1)' },
          { variant: 'presencial' as MediaVariant, label: '📍 Presencial', color: '#8B5CF6',   bg: 'rgba(139,92,246,.1)' },
          { variant: 'geral'      as MediaVariant, label: 'Geral (ambos)', color: 'var(--t2)', bg: 'var(--raised)' },
        ]).map(({ variant, label, color, bg }) => {
          const info    = plansMedia[variant]
          const loading = uploadingVariant === variant
          return (
            <div
              key={variant}
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="px-5 py-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color }}>{label}</span>
                    {!info && <span className="text-[10px] font-mono" style={{ color: 'var(--t3)' }}>sem arquivo</span>}
                  </div>
                  {info && (
                    <div className="flex items-center gap-2">
                      <span
                        className="font-mono text-[10px] tracking-wider transition-colors"
                        style={{ color: info.enabled ? 'var(--brand)' : 'var(--t3)' }}
                      >
                        {info.enabled ? 'ATIVO' : 'INATIVO'}
                      </span>
                      <Toggle checked={info.enabled} onChange={val => toggleMedia(variant, val)} />
                    </div>
                  )}
                </div>

                {info ? (
                  <div
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: bg }}
                    >
                      {info.type === 'pdf'
                        ? <FileText className="w-4 h-4" style={{ color: 'var(--t2)' }} />
                        : <FileImage className="w-4 h-4" style={{ color: 'var(--t2)' }} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: 'var(--t1)' }}>{info.name}</p>
                      <p className="text-xs" style={{ color: 'var(--t3)' }}>
                        {info.type === 'pdf' ? 'PDF' : 'Imagem'} · {info.enabled ? '✅ Ativa' : '⏸ Desativada'}
                      </p>
                    </div>
                    <label
                      className="cursor-pointer text-xs flex-shrink-0 transition-colors"
                      style={{ color: 'var(--brand)' }}
                    >
                      Trocar
                      <input type="file" accept="image/jpeg,image/png,image/jpg,application/pdf" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadMedia(f, variant); e.target.value = '' }} />
                    </label>
                    <button
                      onClick={() => deleteMedia(variant)}
                      className="p-1 flex-shrink-0 transition-colors"
                      style={{ color: 'var(--t3)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#EF4444'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--t3)'}
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors',
                      loading ? 'opacity-50 pointer-events-none' : ''
                    )}
                    style={{ borderColor: 'var(--border)' }}
                    onMouseEnter={e => !loading && ((e.currentTarget as HTMLElement).style.background = 'var(--raised)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '')}
                  >
                    <Upload className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--t3)' }} />
                    <span className="text-sm" style={{ color: 'var(--t3)' }}>
                      {loading ? 'Enviando…' : 'Clique para enviar imagem ou PDF'}
                    </span>
                    <input type="file" accept="image/jpeg,image/png,image/jpg,application/pdf" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadMedia(f, variant); e.target.value = '' }} />
                  </label>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Mensagens dos Planos ──────────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Mensagens dos planos</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>Configure exatamente o que a assistente diz ao apresentar seus planos</p>
        </div>

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
