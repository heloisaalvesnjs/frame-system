'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { MessageSquare, Search, Send, Loader2, Bot, Pencil, Check, X, Sparkles, Phone, Mail, Target, CalendarPlus, UserRound } from 'lucide-react'
import api from '@/lib/api'
import { Avatar, Badge, Btn } from '@/components/ui/finance-primitives'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────

interface Conversation {
  id: string
  client_id?: string | null
  client_name: string
  client_phone: string
  client_goal?: string | null
  client_email?: string | null
  client_since?: string | null
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

const AVATAR_COLORS = ['blue', 'green', 'purple', 'orange', 'pink'] as const

function getAvatarColor(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

const STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'default' }> = {
  active: { label: 'IA ativa', variant: 'success' },
  human_takeover: { label: 'Você assumiu', variant: 'warning' },
  resolved: { label: 'Resolvida', variant: 'default' },
}

const OUTCOME_LABELS: Record<string, { label: string; variant: 'success' | 'danger' | 'default' }> = {
  agendou: { label: 'Agendou consulta', variant: 'success' },
  comprou: { label: 'Comprou plano', variant: 'success' },
  nao_avancou: { label: 'Não avançou', variant: 'danger' },
  sem_resposta: { label: 'Sem resposta', variant: 'default' },
  outro: { label: 'Outro', variant: 'default' },
}

const FILTERS = [
  { key: 'todas', label: 'Todas' },
  { key: 'ia', label: 'IA ativa' },
  { key: 'humano', label: 'Aguardando você' },
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

  const [editingOutcome, setEditingOutcome] = useState(false)

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
    <main className="px-6 py-6">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-t1">Conversas</h1>
          <p className="mt-0.5 text-sm text-t3">
            Acompanhe as conversas da assistente com seus pacientes
          </p>
        </div>

        {/* ── Stats row ──────────────────────────────────────────────── */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Resolvidas', value: stats.resolved, color: 'var(--t1)' },
              { label: 'Agendamentos', value: stats.agendou, color: 'var(--brand)' },
              { label: 'Vendas', value: stats.comprou, color: 'var(--brand)' },
              { label: 'Sem retorno', value: stats.sem_resposta + stats.nao_avancou, color: 'var(--danger)' },
            ].map((card) => (
              <div key={card.label} className="surface p-4">
                <p className="text-[20px] font-bold tabular-nums" style={{ color: card.color }}>{card.value}</p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--t3)' }}>{card.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Filter pills ───────────────────────────────────────────── */}
        <div className="flex items-center gap-1 flex-wrap">
          {FILTERS.map((f) => (
            <Btn
              key={f.key}
              variant={filter === f.key ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Btn>
          ))}
        </div>

        {/* ── Split pane ─────────────────────────────────────────────── */}
        <div
          className="grid surface overflow-hidden p-0"
          style={{
            gridTemplateColumns: selected ? '320px minmax(0,1fr) 280px' : '320px minmax(0,1fr)',
            height: 'calc(100vh - 260px)',
            minHeight: 420,
          }}
        >
          {/* ── Conversation list ─────────────────────────────────── */}
          <div className="flex flex-col overflow-hidden border-r" style={{ borderColor: 'var(--border)' }}>
            {/* Search */}
            <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 rounded-lg px-3 h-9" style={{ background: 'var(--raised)' }}>
                <Search className="size-3.5 shrink-0" style={{ color: 'var(--t3)' }} />
                <input
                  type="text"
                  placeholder="Buscar paciente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent text-[13px] outline-none flex-1"
                  style={{ color: 'var(--t1)' }}
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
                      className={cn(
                        'w-full flex items-start gap-3 px-3.5 py-3 text-left transition-colors border-l-2 border-b',
                        active ? 'border-l-[var(--brand)] bg-white/[0.03]' : 'border-l-transparent hover:bg-white/[0.02]',
                      )}
                      style={{ borderBottomColor: 'var(--border)' }}
                    >
                      <Avatar name={name} color={getAvatarColor(name)} size={36} />
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
                        <p className="text-[12px] truncate mt-0.5 mb-1.5" style={{ color: 'var(--t2)' }}>
                          {conv.last_message || 'Sem mensagens'}
                        </p>
                        {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* ── Chat area ─────────────────────────────────────────── */}
          <div className="flex flex-col overflow-hidden min-w-0">
            {selectedId && selected ? (
              <>
                {/* Chat header */}
                <div className="h-14 px-5 flex items-center justify-between gap-4 flex-shrink-0 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={selected.client_name || selected.client_phone} color={getAvatarColor(selected.client_name || selected.client_phone)} size={36} />
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold truncate" style={{ color: 'var(--t1)' }}>
                        {selected.client_name || selected.client_phone}
                      </p>
                      <p className="text-[12px] truncate flex items-center gap-1.5" style={{ color: 'var(--t3)' }}>
                        <Phone className="size-3" /> {selected.client_phone}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(() => {
                      const b = STATUS_BADGE[selected.status]
                      return b ? <Badge variant={b.variant}>{b.label}</Badge> : null
                    })()}
                    {selected.status === 'active' && (
                      <button
                        onClick={() => toggleMode.mutate(selected.mode === 'copilot' ? 'auto' : 'copilot')}
                        disabled={toggleMode.isPending}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all duration-150"
                        style={selected.mode === 'copilot'
                          ? { color: 'var(--warning)', background: 'rgba(245,166,35,0.12)' }
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
                      <Btn variant="secondary" size="sm" onClick={() => takeover.mutate()} disabled={takeover.isPending}>
                        {takeover.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Assumir conversa
                      </Btn>
                    )}
                    {selected.status === 'human_takeover' && (
                      <Btn variant="primary" size="sm" onClick={() => resolve.mutate()} disabled={resolve.isPending}>
                        {resolve.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Marcar resolvida
                      </Btn>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
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
                              className="max-w-[70%] px-3.5 py-2.5 rounded-2xl rounded-br-md"
                              style={{ background: 'var(--surface)', color: 'var(--t1)', border: '1px dashed var(--brand)' }}
                            >
                              <p className="text-[11px] font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--brand)' }}>
                                <Sparkles className="size-2.5" /> Rascunho — aguardando aprovação
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
                                    <Btn
                                      variant="primary" size="sm"
                                      onClick={() => editDraft.mutate({ messageId: msg.id, content: editingDraftText })}
                                      disabled={editDraft.isPending || !editingDraftText.trim()}
                                    >
                                      <Check className="w-3 h-3" /> Salvar
                                    </Btn>
                                    <Btn variant="secondary" size="sm" onClick={() => setEditingDraftId(null)}>
                                      Cancelar
                                    </Btn>
                                  </>
                                ) : (
                                  <>
                                    <Btn
                                      variant="primary" size="sm"
                                      onClick={() => approveDraft.mutate(msg.id)}
                                      disabled={approveDraft.isPending}
                                    >
                                      <Check className="w-3 h-3" /> Aprovar e enviar
                                    </Btn>
                                    <Btn
                                      variant="secondary" size="sm"
                                      onClick={() => { setEditingDraftId(msg.id); setEditingDraftText(msg.content) }}
                                    >
                                      <Pencil className="w-3 h-3" /> Editar
                                    </Btn>
                                    <button
                                      onClick={() => discardDraft.mutate(msg.id)}
                                      disabled={discardDraft.isPending}
                                      className="text-[11px] flex items-center gap-1 px-2.5 py-1 rounded-lg"
                                      style={{ color: 'var(--danger)' }}
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
                        <div key={msg.id} className={cn('flex', isUser ? 'justify-start' : 'justify-end')}>
                          <div className="max-w-[70%]">
                            {!isUser && (
                              <div className="flex items-center gap-1 text-[10.5px] mb-1 justify-end" style={{ color: 'var(--brand)' }}>
                                <Sparkles className="size-2.5" /> Assistente IA
                              </div>
                            )}
                            <div
                              className={cn(
                                'px-3.5 py-2.5 text-[13px] leading-relaxed rounded-2xl',
                                isUser
                                  ? 'rounded-bl-md border'
                                  : 'rounded-br-md font-medium text-white bg-gradient-to-br from-[var(--brand)] to-[var(--brand-h)]',
                              )}
                              style={isUser ? { background: 'var(--raised)', color: 'var(--t1)', borderColor: 'var(--border)' } : undefined}
                            >
                              {msg.content}
                            </div>
                            <div className={cn('text-[10.5px] mt-1', isUser ? 'text-left' : 'text-right')} style={{ color: 'var(--t3)' }}>
                              {time}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Footer */}
                {selected.status === 'human_takeover' && (
                  <div className="p-4 border-t flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
                    <div className="rounded-xl p-2.5" style={{ background: 'var(--raised)' }}>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Digite sua mensagem..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                          className="bg-transparent text-[13px] outline-none flex-1"
                          style={{ color: 'var(--t1)' }}
                        />
                        <Btn variant="primary" size="sm" onClick={handleSendMessage} disabled={!newMessage.trim()}>
                          <Send className="w-3.5 h-3.5" /> Enviar
                        </Btn>
                      </div>
                    </div>
                    <p className="text-[11px] mt-2" style={{ color: 'var(--t3)' }}>
                      Você está no controle. A IA não responderá enquanto estiver ativo.
                    </p>
                  </div>
                )}

                {selected.status === 'active' && (
                  <div className="px-5 py-3 text-center flex-shrink-0 border-t" style={{ background: 'var(--brand-s)', borderColor: 'var(--border)' }}>
                    <p className="text-[12px] font-medium" style={{ color: 'var(--brand-h)' }}>
                      A assistente está respondendo automaticamente.{' '}
                      <button onClick={() => takeover.mutate()} className="underline font-semibold hover:opacity-70 transition-opacity">
                        Clique aqui para assumir
                      </button>
                    </p>
                  </div>
                )}

                {selected.status === 'resolved' && (
                  <div className="px-5 py-3 flex-shrink-0 border-t" style={{ borderColor: 'var(--border)', background: 'var(--raised)' }}>
                    {selected.outcome && !editingOutcome ? (
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Badge variant={OUTCOME_LABELS[selected.outcome]?.variant ?? 'default'}>
                          {OUTCOME_LABELS[selected.outcome]?.label ?? selected.outcome}
                        </Badge>
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
                            >
                              <Badge variant={cfg.variant}>{cfg.label}</Badge>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center px-6">
                  <MessageSquare className="w-11 h-11 mx-auto mb-4" style={{ color: 'var(--border)' }} />
                  <p className="text-[14px] font-medium" style={{ color: 'var(--t3)' }}>Selecione uma conversa</p>
                  <p className="text-[13px] mt-1" style={{ color: 'var(--t3)' }}>Escolha uma conversa na lista ao lado</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Painel do paciente ───────────────────────────────────── */}
          {selected && (
            <div className="flex flex-col overflow-y-auto border-l p-4 gap-4" style={{ borderColor: 'var(--border)' }}>
              <div className="flex flex-col items-center text-center gap-2 pt-2">
                <Avatar
                  name={selected.client_name || selected.client_phone}
                  color={getAvatarColor(selected.client_name || selected.client_phone)}
                  size={48}
                />
                <div>
                  <p className="text-[14px] font-semibold" style={{ color: 'var(--t1)' }}>
                    {selected.client_name || selected.client_phone}
                  </p>
                  {selected.client_since && (
                    <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--t3)' }}>
                      Paciente desde{' '}
                      {new Date(selected.client_since).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selected.client_id ? (
                  <Link href={`/clientes/${selected.client_id}`} className="flex-1">
                    <Btn variant="secondary" size="sm" className="w-full justify-center">
                      <UserRound className="w-3.5 h-3.5" /> Ver perfil
                    </Btn>
                  </Link>
                ) : (
                  <Btn variant="secondary" size="sm" className="flex-1 justify-center" disabled>
                    <UserRound className="w-3.5 h-3.5" /> Ver perfil
                  </Btn>
                )}
                <Link href="/agenda" className="flex-1">
                  <Btn variant="outline" size="sm" className="w-full justify-center">
                    <CalendarPlus className="w-3.5 h-3.5" /> Agendar
                  </Btn>
                </Link>
              </div>

              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--t3)' }}>
                  Detalhes
                </p>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--t3)' }} />
                    <span className="text-[12.5px]" style={{ color: 'var(--t2)' }}>{selected.client_phone}</span>
                  </div>
                  {selected.client_email && (
                    <div className="flex items-center gap-2.5">
                      <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--t3)' }} />
                      <span className="text-[12.5px] truncate" style={{ color: 'var(--t2)' }}>{selected.client_email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5">
                    <Target className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--t3)' }} />
                    <span className="text-[12.5px]" style={{ color: 'var(--t2)' }}>
                      {selected.client_goal || 'Objetivo não informado'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
