'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MessageSquare, Search, User, UserCheck, CheckCircle,
  Send, RefreshCw, ChevronRight
} from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn, formatDateTime } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────
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
  created_at: string
}

// ─── Conversation List Item ───────────────────────────────────────
function ConversationItem({
  conversation,
  active,
  onClick,
}: {
  conversation: Conversation
  active: boolean
  onClick: () => void
}) {
  const statusVariant: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
    active: 'success',
    human_takeover: 'warning',
    resolved: 'default',
  }

  const statusLabel: Record<string, string> = {
    active: 'IA ativa',
    human_takeover: 'Você assumiu',
    resolved: 'Resolvida',
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors border-b border-gray-100',
        active ? 'bg-brand-50' : 'hover:bg-gray-50'
      )}
    >
      <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
        <User className="w-4 h-4 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-sm font-semibold text-gray-900 truncate">
            {conversation.client_name || conversation.client_phone}
          </span>
          {conversation.last_message_at && (
            <span className="text-xs text-gray-400 flex-shrink-0">
              {new Date(conversation.last_message_at).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate mb-1.5">
          {conversation.last_message || 'Sem mensagens'}
        </p>
        <Badge variant={statusVariant[conversation.status]}>
          {statusLabel[conversation.status]}
        </Badge>
      </div>
    </button>
  )
}

// ─── Chat Bubble ─────────────────────────────────────────────────
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex gap-2', isUser ? 'justify-start' : 'justify-end')}>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-auto">
          <User className="w-3.5 h-3.5 text-gray-500" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-4 py-2.5 text-sm',
          isUser
            ? 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'
            : 'bg-brand-600 text-white rounded-br-sm'
        )}
      >
        <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
        <p className={cn('text-xs mt-1', isUser ? 'text-gray-400' : 'text-brand-200')}>
          {new Date(message.created_at).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────
export default function ConversasPage() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load conversations
  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data } = await api.get('/api/conversations')
      return data.conversations
    },
    refetchInterval: 5000,
  })

  // Load messages for selected conversation
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['messages', selectedId],
    queryFn: async () => {
      const { data } = await api.get(`/api/conversations/${selectedId}/messages`)
      return data.messages
    },
    enabled: !!selectedId,
    refetchInterval: 3000,
  })

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Takeover mutation
  const takeover = useMutation({
    mutationFn: () => api.post(`/api/conversations/${selectedId}/takeover`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  })

  // Resolve mutation
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
    // In a real scenario this would go through an internal endpoint
    setNewMessage('')
  }, [newMessage, selectedId])

  return (
    <div className="flex h-screen">
      {/* Sidebar: conversations list */}
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-900 mb-3">Conversas</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 h-9 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
              <MessageSquare className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">Nenhuma conversa</p>
              <p className="text-xs text-gray-400 mt-1">
                As conversas aparecerão aqui quando clientes enviarem mensagens
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

      {/* Main: chat area */}
      {selectedId && selected ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-gray-500" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {selected.client_name || selected.client_phone}
                </p>
                <p className="text-xs text-gray-500 truncate">{selected.client_phone}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {selected.status === 'active' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => takeover.mutate()}
                  loading={takeover.isPending}
                >
                  <UserCheck className="w-4 h-4" />
                  Assumir conversa
                </Button>
              )}
              {selected.status === 'human_takeover' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => resolve.mutate()}
                  loading={resolve.isPending}
                >
                  <CheckCircle className="w-4 h-4" />
                  Marcar como resolvida
                </Button>
              )}
              {selected.status !== 'resolved' && (
                <Badge
                  variant={selected.status === 'active' ? 'success' : 'warning'}
                >
                  {selected.status === 'active' ? 'IA respondendo' : 'Modo humano'}
                </Badge>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-3 bg-gray-50">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                Nenhuma mensagem ainda
              </div>
            ) : (
              messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input (only in human_takeover mode) */}
          {selected.status === 'human_takeover' && (
            <div className="px-6 py-4 border-t border-gray-200 bg-white">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Digite sua mensagem..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  className="flex-1 h-10 rounded-lg border border-gray-300 px-4 text-sm focus:outline-none focus:border-brand-500"
                />
                <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Você está no controle. A IA não responderá enquanto você estiver ativo.
              </p>
            </div>
          )}

          {selected.status === 'active' && (
            <div className="px-6 py-3 border-t border-gray-200 bg-brand-50 text-center">
              <p className="text-xs text-brand-700">
                A assistente está respondendo automaticamente.{' '}
                <button
                  onClick={() => takeover.mutate()}
                  className="font-medium underline"
                >
                  Clique aqui para assumir
                </button>
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Selecione uma conversa</p>
            <p className="text-sm text-gray-400 mt-1">Escolha uma conversa na lista ao lado</p>
          </div>
        </div>
      )}
    </div>
  )
}
