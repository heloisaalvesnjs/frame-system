'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Search, Send, Loader2, Bot, Pencil, Check, X } from 'lucide-react'
import api from '@/lib/api'

// ── Types ────────────────────────────────────────────────────────────────────

interface Conversation {
  id: string
  client_name: string
  client_phone: string
  status: 'active' | 'human_takeover' | 'resolved'
  mode?: 'auto' | 'copilot'
  outcome?: string | null
  outcome_notes?: string | null
  last_message?: string
  last_message_at?: string
  unread_count?: number
}

interface Stats {
  active: number
  human_takeover: number
  resolved: number
  agendou: number
  comprou: number
  nao_avancou: number
  sem_resposta: number
  outro: number
  sem_classificacao: number
}

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  sent_at: string
  pending_send?: boolean
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#5B6EF5', '#E84393', '#F59823', '#27AE60',
  '#9B59B6', '#E74C3C', '#1ABC9C', '#2980B9',
]

function getAvatarColor(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function getInitials(name: string, phone: string) {
  if (name && name !== 'Cliente') {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  }
  return phone.replace(/\D/g, '').slice(-2)
}

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  active:          { label: 'IA ativa',     color: '#059669', bg: 'rgba(0,194,124,0.1)' },
  human_takeover:  { label: 'Você assumiu', color: '#B45309', bg: 'rgba(245,166,35,0.12)' },
  resolved:        { label: 'Resolvida',    color: 'var(--t3)', bg: 'var(--raised)' },
}

const OUTCOME_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  agendou:        { label: 'Agendou consulta', color: '#059669', bg: 'rgba(0,194,124,0.1)' },
  comprou:        { label: 'Comprou plano',    color: '#059669', bg: 'rgba(0,194,124,0.1)' },
  nao_avancou:    { label: 'Não avançou',      color: '#DC2626', bg: 'rgba(220,38,38,0.08)' },
  sem_resposta:   { label: 'Sem resposta',     color: 'var(--t3)', bg: 'var(--raised)' },
  outro:          { label: 'Outro',            color: 'var(--t2)', bg: 'var(--raised)' },
}

const FILTERS = [
  { key: 'todas',     label: 'Todas' },
  { key: 'ia',        label: 'IA ativa' },
  { key: 'humano',    label: 'Aguardando você' },
  { key: 'resolvida', label: 'Resolvidas' },
] as const

type FilterKey = (typeof FILTERS)[number]['key']

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ConversasPage() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>('todas')
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data } = await api.get('/api/conversations')
      return data.conversations
    },
    refetchInterval: 5000,
  })

  const { data: stats } = useQuery<Stats>({
    queryKey: ['conversations-stats'],
    queryFn: async () => {
      const { data } = await api.get('/api/conversations/stats')
      return data.stats
    },
    refetchInterval: 30000,
  })

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['messages', selectedId],
    queryFn: async () => {
      const { data } = await api.get(`/api/conversations/${selectedId}/messages`)
      return data.messages
    },
    enabled: !!selectedId,
    refetchInterval: 3000,
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    setEditingOutcome(false)
  }, [selectedId])

  const takeover = useMutation({
    mutationFn: () => api.post(`/api/conversations/${selectedId}/takeover`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  })

  const resolve = useMutation({
    mutationFn: () => api.post(`/api/conversations/${selectedId}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['conversations-stats'] })
    },
  })

  const setOutcome = useMutation({
    mutationFn: (outcome: string) => api.post(`/api/conversations/${selectedId}/outcome`, { outcome }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['conversations-stats'] })
      setEditingOutcome(false)
    },
  })

  const [editingOutcome, setEditingOutcome] = useState(false)

  const toggleMode = useMutation({
    mutationFn: (mode: 'auto' | 'copilot') => api.post(`/api/conversations/${selectedId}/mode`, { mode }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  })

  const approveDraft = useMutation({
    mutationFn: (messageId: string) => api.post(`/api/conversations/${selectedId}/messages/${messageId}/approve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages', selectedId] }),
  })

  const discardDraft = useMutation({
    mutationFn: (messageId: string) => api.post(`/api/conversations/${selectedId}/messages/${messageId}/discard`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages', selectedId] }),
  })

  const editDraft = useMutation({
    mutationFn: ({ messageId, content }: { messageId: string; content: string }) =>
      api.patch(`/api/conversations/${selectedId}/messages/${messageId}`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedId] })
      setEditingDraftId(null)
    },
  })

  const [editingDraftId, setEditingDraftId] = useState<string | null>(null)
  const [editingDraftText, setEditingDraftText] = useState('')

  const selected = conversations.find((c) => c.id === selectedId)

  const filtered = conversations.filter((c) => {
    const q = search.toLowerCase()
    const matchesSearch =
      c.client_name?.toLowerCase().includes(q) ||
      c.client_phone?.toLowerCase().includes(q)
    if (!matchesSearch) return false
    if (filter === 'ia') return c.status === 'active'
    if (filter === 'humano') return c.status === 'human_takeover'
    if (filter === 'resolvida') return c.status === 'resolved'
    return true
  })

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedId) return
    setNewMessage('')
  }, [newMessage, selectedId])

  return (
    <div className="p-6 md:p-8 max-w-[1400px]">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="mb-5">
        <h1 className="text-[24px] font-bold tracking-tight" style={{ color: 'var(--t1)' }}>
          Conversas
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--t2)' }}>
          Acompanhe as conversas da assistente com seus pacientes
        </p>
      </div>

      {/* ── Stats row ──────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Resolvidas', value: stats.resolved, color: 'var(--t1)' },
            { label: 'Agendamentos', value: stats.agendou, color: '#059669' },
            { label: 'Vendas', value: stats.comprou, color: '#059669' },
            { label: 'Sem retorno', value: stats.sem_resposta + stats.nao_avancou, color: '#DC2626' },
          ].map((card) => (
            <div
              key={card.label}
              className="px-4 py-3 rounded-2xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <p className="text-[20px] font-bold" style={{ color: card.color }}>{card.value}</p>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--t3)' }}>{card.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Filter pills ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {FILTERS.map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="text-[12px] font-semibold px-3.5 py-1.5 rounded-full transition-all duration-150"
              style={active
                ? { background: 'var(--brand-s)', color: 'var(--brand-h)', border: '1px solid transparent' }
                : { background: 'var(--surface)', color: 'var(--t2)', border: '1px solid var(--border)' }
              }
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {/* ── Split pane ─────────────────────────────────────────────── */}
      <div
        className="grid"
        style={{ gridTemplateColumns: '320px 1fr', height: 'calc(100vh - 230px)', minHeight: 420 }}
      >

        {/* ── Conversation list ─────────────────────────────────── */}
        <div
          className="flex flex-col overflow-hidden"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px 0 0 16px',
            borderRight: 'none',
          }}
        >
          {/* Search */}
          <div className="px-3.5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--t3)' }} />
              <input
                type="text"
                placeholder="Buscar paciente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                <MessageSquare className="w-9 h-9 mb-3" style={{ color: 'var(--border)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--t3)' }}>Nenhuma conversa</p>
                <p className="text-xs mt-1" style={{ color: 'var(--t3)' }}>
                  As conversas aparecem quando pacientes enviam mensagens
                </p>
              </div>
            ) : (
              filtered.map((conv) => {
                const active = conv.id === selectedId
                const badge = STATUS_BADGE[conv.status]
                const name = conv.client_name || conv.client_phone
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedId(conv.id)}
                    className="w-full flex items-start gap-3 px-3.5 py-3 text-left transition-all duration-150"
                    style={{
                      background: active ? 'rgba(0,194,124,0.04)' : undefined,
                      borderBottom: '1px solid var(--border)',
                      borderLeft: active ? '2px solid var(--brand)' : '2px solid transparent',
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px] font-bold"
                      style={{ background: getAvatarColor(name), color: '#fff' }}
                    >
                      {getInitials(conv.client_name, conv.client_phone)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--t1)' }}>
                          {name}
                        </span>
                        {conv.last_message_at && (
                          <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--t3)' }}>
                            {new Date(conv.last_message_at).toLocaleTimeString('pt-BR', {
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] truncate mt-0.5 mb-1" style={{ color: 'var(--t2)' }}>
                        {conv.last_message || 'Sem mensagens'}
                      </p>
                      {badge && (
                        <span
                          className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ color: badge.color, background: badge.bg }}
                        >
                          {badge.label}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ── Chat area ─────────────────────────────────────────── */}
        <div
          className="flex flex-col overflow-hidden min-w-0"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '0 16px 16px 0',
          }}
        >
          {selectedId && selected ? (
            <>
              {/* Chat header */}
              <div
                className="px-5 py-3.5 flex items-center justify-between gap-4 flex-shrink-0"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                    style={{ background: getAvatarColor(selected.client_name || selected.client_phone), color: '#fff' }}
                  >
                    {getInitials(selected.client_name, selected.client_phone)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold truncate" style={{ color: 'var(--t1)' }}>
                      {selected.client_name || selected.client_phone}
                    </p>
                    <p className="text-[12px] truncate" style={{ color: 'var(--t3)' }}>
                      {selected.client_phone}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {(() => {
                    const b = STATUS_BADGE[selected.status]
                    return b ? (
                      <span
                        className="inline-flex text-[11px] font-semibold px-2.5 py-1 rounded-full"
                        style={{ color: b.color, background: b.bg }}
                      >
                        {b.label}
                      </span>
                    ) : null
                  })()}
                  {selected.status === 'active' && (
                    <button
                      onClick={() => toggleMode.mutate(selected.mode === 'copilot' ? 'auto' : 'copilot')}
                      disabled={toggleMode.isPending}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all duration-150"
                      style={selected.mode === 'copilot'
                        ? { color: '#B45309', background: 'rgba(245,166,35,0.12)' }
                        : { color: 'var(--t2)', background: 'var(--raised)' }
                      }
                      title={selected.mode === 'copilot'
                        ? 'Modo copiloto: a IA gera rascunhos para você aprovar'
                        : 'Modo automático: a IA responde direto'
                      }
                    >
                      <Bot className="w-3 h-3" />
                      {selected.mode === 'copilot' ? 'Modo copiloto' : 'Modo automático'}
                    </button>
                  )}
                  {selected.status === 'active' && (
                    <button
                      onClick={() => takeover.mutate()}
                      disabled={takeover.isPending}
                      className="btn-secondary text-[12px] !px-3 !py-1.5 flex items-center gap-1.5"
                    >
                      {takeover.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Assumir conversa
                    </button>
                  )}
                  {selected.status === 'human_takeover' && (
                    <button
                      onClick={() => resolve.mutate()}
                      disabled={resolve.isPending}
                      className="btn-primary text-[12px] !px-3 !py-1.5 flex items-center gap-1.5"
                    >
                      {resolve.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Marcar resolvida
                    </button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-3"
                style={{ background: 'var(--bg)' }}
              >
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--t3)' }}>
                    Nenhuma mensagem ainda
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isUser = msg.role === 'user'
                    const time = msg.sent_at
                      ? new Date(msg.sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                      : ''

                    if (msg.pending_send) {
                      const isEditing = editingDraftId === msg.id
                      return (
                        <div key={msg.id} className="flex justify-end">
                          <div
                            className="max-w-[70%] px-3.5 py-2.5"
                            style={{
                              background: 'var(--surface)',
                              color: 'var(--t1)',
                              borderRadius: '14px 14px 4px 14px',
                              border: '1px dashed var(--brand)',
                            }}
                          >
                            <p className="text-[11px] font-semibold mb-1" style={{ color: 'var(--brand)' }}>
                              Rascunho — aguardando aprovação
                            </p>
                            {isEditing ? (
                              <textarea
                                value={editingDraftText}
                                onChange={(e) => setEditingDraftText(e.target.value)}
                                className="input w-full text-[13px]"
                                rows={3}
                              />
                            ) : (
                              <p className="text-[13px] whitespace-pre-wrap break-words leading-relaxed">
                                {msg.content}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => editDraft.mutate({ messageId: msg.id, content: editingDraftText })}
                                    disabled={editDraft.isPending || !editingDraftText.trim()}
                                    className="btn-primary text-[11px] !px-2.5 !py-1 flex items-center gap-1"
                                  >
                                    <Check className="w-3 h-3" /> Salvar
                                  </button>
                                  <button
                                    onClick={() => setEditingDraftId(null)}
                                    className="btn-secondary text-[11px] !px-2.5 !py-1"
                                  >
                                    Cancelar
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => approveDraft.mutate(msg.id)}
                                    disabled={approveDraft.isPending}
                                    className="btn-primary text-[11px] !px-2.5 !py-1 flex items-center gap-1"
                                  >
                                    <Check className="w-3 h-3" /> Aprovar e enviar
                                  </button>
                                  <button
                                    onClick={() => { setEditingDraftId(msg.id); setEditingDraftText(msg.content) }}
                                    className="btn-secondary text-[11px] !px-2.5 !py-1 flex items-center gap-1"
                                  >
                                    <Pencil className="w-3 h-3" /> Editar
                                  </button>
                                  <button
                                    onClick={() => discardDraft.mutate(msg.id)}
                                    disabled={discardDraft.isPending}
                                    className="text-[11px] flex items-center gap-1 px-2.5 py-1 rounded-lg"
                                    style={{ color: '#DC2626' }}
                                  >
                                    <X className="w-3 h-3" /> Descartar
                                  </button>
                                </>
                              )}
                            </div>
                            <p className="text-[10px] mt-1.5" style={{ color: 'var(--t3)' }}>
                              {time} · Rascunho da IA
                            </p>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div key={msg.id} className={isUser ? 'flex justify-start' : 'flex justify-end'}>
                        <div
                          className="max-w-[70%] px-3.5 py-2.5"
                          style={isUser
                            ? { background: 'var(--raised)', color: 'var(--t1)', borderRadius: '14px 14px 14px 4px' }
                            : { background: 'var(--brand)', color: '#fff', borderRadius: '14px 14px 4px 14px' }
                          }
                        >
                          {!isUser && (
                            <p className="text-[11px] font-semibold mb-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                              Assistente IA
                            </p>
                          )}
                          <p className="text-[13px] whitespace-pre-wrap break-words leading-relaxed">
                            {msg.content}
                          </p>
                          <p
                            className="text-[10px] mt-1"
                            style={{ color: isUser ? 'var(--t3)' : 'rgba(255,255,255,0.6)' }}
                          >
                            {isUser ? time : `${time} · IA`}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Footer */}
              {selected.status === 'human_takeover' && (
                <div
                  className="px-5 py-3.5 flex-shrink-0"
                  style={{ borderTop: '1px solid var(--border)' }}
                >
                  <div className="flex gap-2.5">
                    <input
                      type="text"
                      placeholder="Digite sua mensagem..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      className="input flex-1"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="btn-primary !px-3.5 flex-shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[11px] mt-2" style={{ color: 'var(--t3)' }}>
                    Você está no controle. A IA não responderá enquanto estiver ativo.
                  </p>
                </div>
              )}

              {selected.status === 'active' && (
                <div
                  className="px-5 py-3 text-center flex-shrink-0"
                  style={{ background: 'var(--brand-s)', borderTop: '1px solid var(--border)' }}
                >
                  <p className="text-[12px] font-medium" style={{ color: 'var(--brand-h)' }}>
                    A assistente está respondendo automaticamente.{' '}
                    <button
                      onClick={() => takeover.mutate()}
                      className="underline font-semibold hover:opacity-70 transition-opacity"
                    >
                      Clique aqui para assumir
                    </button>
                  </p>
                </div>
              )}

              {selected.status === 'resolved' && (
                <div
                  className="px-5 py-3 flex-shrink-0"
                  style={{ borderTop: '1px solid var(--border)', background: 'var(--raised)' }}
                >
                  {selected.outcome && !editingOutcome ? (
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span
                        className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full"
                        style={{
                          color: OUTCOME_LABELS[selected.outcome]?.color ?? 'var(--t2)',
                          background: OUTCOME_LABELS[selected.outcome]?.bg ?? 'var(--surface)',
                        }}
                      >
                        {OUTCOME_LABELS[selected.outcome]?.label ?? selected.outcome}
                      </span>
                      <button
                        onClick={() => setEditingOutcome(true)}
                        className="text-[11px] font-medium hover:opacity-70 transition-opacity"
                        style={{ color: 'var(--t3)' }}
                      >
                        Alterar classificação
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-[11px] font-medium mb-2" style={{ color: 'var(--t2)' }}>
                        Como terminou essa conversa?
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(OUTCOME_LABELS).map(([key, cfg]) => (
                          <button
                            key={key}
                            onClick={() => setOutcome.mutate(key)}
                            disabled={setOutcome.isPending}
                            className="text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all duration-150"
                            style={{ color: cfg.color, background: cfg.bg, border: '1px solid var(--border)' }}
                          >
                            {cfg.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg)' }}>
              <div className="text-center px-6">
                <MessageSquare className="w-11 h-11 mx-auto mb-4" style={{ color: 'var(--border)' }} />
                <p className="text-[14px] font-medium" style={{ color: 'var(--t3)' }}>Selecione uma conversa</p>
                <p className="text-[13px] mt-1" style={{ color: 'var(--t3)' }}>Escolha uma conversa na lista ao lado</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
