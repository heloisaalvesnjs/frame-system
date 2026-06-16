'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarPlus, Phone, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { V4Avatar, V4Button, V4Card, V4Input, V4Page, V4Tag } from '@/components/v4/V4Primitives'

interface Conversation {
  id: string
  client_name: string
  client_phone: string
  client_goal?: string | null
  status: 'active' | 'human_takeover' | 'resolved'
  mode?: 'auto' | 'copilot'
  last_message?: string
  last_message_at?: string
}

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  sent_at: string
  pending_send?: boolean
}

function formatTime(date?: string) {
  if (!date) return ''
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(date))
}

export default function ConversasPage() {
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const { data, isFetching } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data } = await api.get('/api/conversations')
      return data.conversations
    },
    refetchInterval: 10000,
  })

  const conversations = data ?? []
  useEffect(() => {
    if (!selectedId && conversations.length) setSelectedId(conversations[0].id)
  }, [conversations, selectedId])

  const selected = conversations.find(item => item.id === selectedId) || null
  const filtered = conversations.filter(item => `${item.client_name} ${item.client_phone}`.toLowerCase().includes(search.toLowerCase()))

  const { data: messagesData } = useQuery<{ conversation: Conversation; messages: Message[] }>({
    queryKey: ['messages', selected?.id],
    queryFn: async () => {
      const { data } = await api.get(`/api/conversations/${selected!.id}/messages`)
      return data
    },
    enabled: !!selected?.id,
  })

  const messages = useMemo<Message[]>(() => messagesData?.messages ?? [], [messagesData])

  const takeover = useMutation({
    mutationFn: async () => api.post(`/api/conversations/${selected!.id}/takeover`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversations'] })
      toast.success('Conversa assumida')
    },
    onError: () => toast.error('Não foi possível assumir a conversa'),
  })

  return (
    <V4Page
      eyebrow="Atendimento"
      title="Caixa de entrada"
      subtitle="Acompanhe conversas reais do WhatsApp, intervenha quando necessário e mantenha o histórico do paciente no lugar certo."
      actions={<V4Button><RefreshCw className="h-4 w-4" />{isFetching ? 'Atualizando' : 'Atualização automática'}</V4Button>}
    >
      <div className="grid min-h-[560px] overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)] lg:h-[calc(100vh-190px)] lg:grid-cols-[320px_minmax(0,1fr)_300px]">
        <aside className="border-r border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] p-3">
            <V4Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar paciente..." className="w-full" />
          </div>
          <div className="max-h-[520px] divide-y divide-[var(--border)] overflow-auto lg:max-h-none">
            {filtered.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className="flex w-full gap-3 p-3 text-left transition hover:bg-[var(--raised)]"
                style={{ background: selected?.id === item.id ? 'var(--brand-s)' : undefined }}
              >
                <V4Avatar name={item.client_name || item.client_phone} color={['#8867a9', '#427fa1', '#b26d54'][index % 3]} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-medium text-t1">{item.client_name || item.client_phone}</span>
                    <span className="text-[10px] text-t3">{formatTime(item.last_message_at)}</span>
                  </div>
                  <p className="mt-1 truncate text-[12px] text-t3">{item.last_message || 'Sem mensagens recentes'}</p>
                  <div className="mt-2 flex gap-1.5">
                    <V4Tag tone={item.status === 'human_takeover' ? 'red' : item.status === 'resolved' ? 'default' : 'green'}>
                      {item.status === 'human_takeover' ? 'Precisa de você' : item.status === 'resolved' ? 'Resolvida' : 'IA atendendo'}
                    </V4Tag>
                  </div>
                </div>
              </button>
            ))}
            {!filtered.length && (
              <div className="px-4 py-10 text-center text-[12px] text-t3">
                Nenhuma conversa encontrada.
              </div>
            )}
          </div>
        </aside>

        <section className="flex min-w-0 flex-col">
          {selected ? (
            <>
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                <div className="flex items-center gap-3">
                  <V4Avatar name={selected.client_name || 'Paciente'} color="#427fa1" />
                  <div>
                    <div className="text-[14px] font-medium text-t1">{selected.client_name || selected.client_phone}</div>
                    <div className="text-[11.5px] text-t3">{selected.client_goal || 'Objetivo não informado'} · WhatsApp</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <V4Tag tone={selected.status === 'active' ? 'green' : 'default'} dot>{selected.status === 'active' ? 'Online' : 'Manual'}</V4Tag>
                  <V4Button className="h-8" onClick={() => takeover.mutate()} disabled={takeover.isPending || selected.status === 'human_takeover'}>
                    Assumir
                  </V4Button>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-auto bg-gradient-to-b from-[var(--surface)] to-[var(--bg)] p-5">
                {messages.map(message => (
                  <div key={message.id} className={message.role === 'assistant' ? 'flex justify-end' : 'flex justify-start'}>
                    <div className={message.role === 'assistant' ? 'max-w-[70%] rounded-2xl bg-[var(--brand)] px-4 py-3 text-[#0B2E1E]' : 'max-w-[70%] rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-t1'}>
                      {message.role === 'assistant' && <div className="mb-1 text-[10px] font-medium opacity-75">Assistente Frame</div>}
                      <div className="text-[13px] leading-5">{message.content}</div>
                    </div>
                  </div>
                ))}
                {!messages.length && (
                  <div className="grid h-full place-items-center text-center">
                    <div>
                      <div className="text-[13px] font-medium text-t1">Sem mensagens nessa conversa</div>
                      <p className="mt-1 text-[12px] text-t3">O histórico aparecerá aqui quando houver mensagens registradas.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-[var(--border)] p-3">
                <div className="rounded-[12px] border border-[var(--border)] bg-[var(--raised)] px-3 py-2 text-[12px] text-t3">
                  Envio manual direto ainda não possui endpoint dedicado. Use “Assumir” para pausar a IA e responder pelo canal conectado.
                </div>
              </div>
            </>
          ) : (
            <div className="grid flex-1 place-items-center p-8 text-center">
              <div>
                <div className="text-[14px] font-medium text-t1">Selecione uma conversa</div>
                <p className="mt-1 text-[12px] text-t3">Escolha uma conversa na lista ao lado.</p>
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-4 border-l border-[var(--border)] p-4">
          <V4Card className="p-4">
            <div className="text-[13px] font-medium text-t1">Resumo inteligente</div>
            <p className="mt-2 text-[12px] leading-5 text-t2">
              {selected ? 'Use este painel para acompanhar o contexto da conversa e decidir quando assumir o atendimento.' : 'Selecione uma conversa para ver o contexto.'}
            </p>
          </V4Card>
          <V4Card className="p-4">
            <div className="text-[13px] font-medium text-t1">Ações rápidas</div>
            <div className="mt-3 space-y-2">
              <V4Button className="w-full" disabled={!selected}><Phone className="h-4 w-4" />Ligar</V4Button>
              <V4Button className="w-full" disabled={!selected}><CalendarPlus className="h-4 w-4" />Agendar consulta</V4Button>
            </div>
          </V4Card>
        </aside>
      </div>
    </V4Page>
  )
}
