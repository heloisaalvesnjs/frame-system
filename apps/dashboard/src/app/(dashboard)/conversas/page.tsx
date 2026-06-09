'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MessageSquare, Search, User, UserCheck, CheckCircle, Send, Loader2,
} from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────

interface Conversation {
  id: string
  client_name: string
  client_phone: string
  status: 'active' | 'human_takeover' | 'resolved'
  last_message?: string
  last_message_at?: string
  unread_count?: number
}

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  sent_at: string
}

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  active:          { label: 'IA ativa',      color: '#059669', bg: '#ECFDF5' },
  human_takeover:  { label: 'Você assumiu',  color: '#D97706', bg: '#FFFBEB' },
  resolved:        { label: 'Resolvida',     color: '#6B7280', bg: '#F9FAFB' },
}

// ── Conversation Item ─────────────────────────────────────────────────────────

function ConversationItem({
  conversation, active, onClick,
}: {
  conversation: Conversation; active: boolean; onClick: () => void
}) {
  const badge = STATUS_BADGE[conversation.status]
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-all duration-150"
      style={{ background: active ? 'var(--brand-s)' : undefined, borderBottom: '1px solid var(--border)' }}
    >
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
      >
        <User className="w-4 h-4" style={{ color: 'var(--t3)' }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-sm font-semibold truncate" style={{ color: 'var(--t1)' }}>
            {conversation.client_name || conversation.client_phone}
          </span>
          {conversation.last_message_at && (
            <span className="text-xs flex-shrink-0" style={{ color: 'var(--t3)' }}>
              {new Date(conversation.last_message_at).toLocaleTimeString('pt-BR', {
                hour: '2-digit', minute: '2-digit',
              })}
            </span>
          )}
        </div>

        <p className="text-xs truncate mb-1.5" style={{ color: 'var(--t3)' }}>
          {conversation.last_message || 'Sem mensagens'}
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
}

// ── Message Bubble ────────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  return (
    <div className={cn('flex gap-2', isUser ? 'justify-start' : 'justify-end')}>
      {isUser && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-auto"
          style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
        >
          <User className="w-3.5 h-3.5" style={{ color: 'var(--t3)' }} />
        </div>
      )}
      <div
        className="max-w-[70%] rounded-2xl px-4 py-2.5 text-sm"
        style={isUser
          ? { background: 'var(--raised)', border: '1px solid var(--border)', color: 'var(--t1)', borderRadius: '18px 18px 18px 4px' }
          : { background: 'var(--brand)', color: '#fff', borderRadius: '18px 18px 4px 18px' }
        }
      >
        <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
        <p
          className="text-xs mt-1"
          style={{ color: isUser ? 'var(--t3)' : 'rgba(255,255,255,0.65)' }}
        >
          {message.sent_at
            ? new Date(message.sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            : ''}
        </p>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ConversasPage() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
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

  const takeover = useMutation({
    mutationFn: () => api.post(`/api/conversations/${selectedId}/takeover`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  })

  const resolve = useMutation({
    mutationFn: () => api.post(`/api/conversations/${selectedId}/resolve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  })

  const selected = conversations.find((c) => c.id === selectedId)

  const filtered = conversations.filter((c) => {
    const q = search.toLowerCase()
    return (
      c.client_name?.toLowerCase().includes(q) ||
      c.client_phone?.toLowerCase().includes(q)
    )
  })

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedId) return
    setNewMessage('')
  }, [newMessage, selectedId])

  return (
    <div className="flex h-[calc(100vh-60px)]">

      {/* ── Conversation list ─────────────────────────────────────── */}
      <div
        className="w-72 flex flex-col flex-shrink-0"
        style={{
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* Header + search */}
        <div className="px-4 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h1 className="text-[15px] font-semibold mb-3" style={{ color: 'var(--t1)' }}>
            Conversas
          </h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--t3)' }} />
            <input
              type="text"
              placeholder="Buscar cliente..."
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
                As conversas aparecem quando clientes enviam mensagens
              </p>
            </div>
          ) : (
            filtered.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                active={conv.id === selectedId}
                onClick={() => setSelectedId(conv.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Chat area ─────────────────────────────────────────────── */}
      {selectedId && selected ? (
        <div className="flex-1 flex flex-col min-w-0">

          {/* Chat header */}
          <div
            className="px-6 py-4 flex items-center justify-between gap-4 flex-shrink-0"
            style={{
              background: 'var(--surface)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
              >
                <User className="w-4 h-4" style={{ color: 'var(--t3)' }} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate" style={{ color: 'var(--t1)' }}>
                  {selected.client_name || selected.client_phone}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--t3)' }}>
                  {selected.client_phone}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {selected.status === 'active' && (
                <button
                  onClick={() => takeover.mutate()}
                  disabled={takeover.isPending}
                  className="btn-secondary text-[12px] px-3 py-1.5 flex items-center gap-1.5"
                >
                  {takeover.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                  Assumir conversa
                </button>
              )}
              {selected.status === 'human_takeover' && (
                <button
                  onClick={() => resolve.mutate()}
                  disabled={resolve.isPending}
                  className="btn-primary text-[12px] px-3 py-1.5 flex items-center gap-1.5"
                >
                  {resolve.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Marcar resolvida
                </button>
              )}
              {selected.status !== 'resolved' && (() => {
                const b = STATUS_BADGE[selected.status]
                return b ? (
                  <span className="inline-flex text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ color: b.color, background: b.bg }}>
                    {selected.status === 'active' ? 'IA respondendo' : 'Modo humano'}
                  </span>
                ) : null
              })()}
            </div>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-3"
            style={{ background: 'var(--bg)' }}
          >
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--t3)' }}>
                Nenhuma mensagem ainda
              </div>
            ) : (
              messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input — human_takeover */}
          {selected.status === 'human_takeover' && (
            <div
              className="px-6 py-4 flex-shrink-0"
              style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}
            >
              <div className="flex gap-3">
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
                  className="btn-primary px-3 py-2 flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--t3)' }}>
                Você está no controle. A IA não responderá enquanto estiver ativo.
              </p>
            </div>
          )}

          {selected.status === 'active' && (
            <div
              className="px-6 py-3 text-center flex-shrink-0"
              style={{ background: 'var(--brand-s)', borderTop: '1px solid var(--border)' }}
            >
              <p className="text-xs font-medium" style={{ color: 'var(--brand)' }}>
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
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg)' }}>
          <div className="text-center">
            <MessageSquare className="w-11 h-11 mx-auto mb-4" style={{ color: 'var(--border)' }} />
            <p className="font-medium" style={{ color: 'var(--t3)' }}>Selecione uma conversa</p>
            <p className="text-sm mt-1" style={{ color: 'var(--t3)' }}>Escolha uma conversa na lista ao lado</p>
          </div>
        </div>
      )}
    </div>
  )
}
