'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarPlus, Send } from 'lucide-react'
import api from '@/lib/api'
import { V4Avatar, V4Button, V4Card, V4Input, V4Page, V4Tag } from '@/components/v4/V4Primitives'

interface Conversation {
  id: string
  client_name: string
  client_phone: string
  client_goal?: string | null
  status: 'active' | 'human_takeover' | 'resolved'
  last_message?: string
  last_message_at?: string
}

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  sent_at: string
}

const fallbackConversations: Conversation[] = [
  { id: '1', client_name: 'Amanda Souza', client_phone: '11999990001', client_goal: 'Emagrecimento', status: 'active', last_message: 'Quinta às 15h está perfeito.', last_message_at: new Date().toISOString() },
  { id: '2', client_name: 'Marina Rocha', client_phone: '11999990002', client_goal: 'Consulta online', status: 'human_takeover', last_message: 'Tenho uma condição específica. Posso explicar?', last_message_at: new Date().toISOString() },
  { id: '3', client_name: 'Larissa Costa', client_phone: '11999990003', client_goal: 'Nutrição esportiva', status: 'active', last_message: 'Vou pensar no valor e te retorno.', last_message_at: new Date().toISOString() },
]

export default function ConversasPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const { data } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data } = await api.get('/api/conversations')
      return data.conversations
    },
    refetchInterval: 10000,
  })

  const conversations = data?.length ? data : fallbackConversations
  useEffect(() => {
    if (!selectedId && conversations.length) setSelectedId(conversations[0].id)
  }, [conversations, selectedId])

  const selected = conversations.find(item => item.id === selectedId) || conversations[0]
  const filtered = conversations.filter(item => `${item.client_name} ${item.client_phone}`.toLowerCase().includes(search.toLowerCase()))

  const { data: messagesData } = useQuery<Message[]>({
    queryKey: ['messages', selected?.id],
    queryFn: async () => {
      const { data } = await api.get(`/api/conversations/${selected.id}/messages`)
      return data.messages
    },
    enabled: !!selected?.id && !fallbackConversations.some(item => item.id === selected.id),
  })

  const messages = useMemo<Message[]>(() => messagesData?.length ? messagesData : [
    { id: 'm1', role: 'user', content: 'Oi, queria saber como funciona a consulta online.', sent_at: new Date().toISOString() },
    { id: 'm2', role: 'assistant', content: 'Olá! A consulta online dura cerca de 50 minutos e inclui avaliação completa, definição de metas e plano de acompanhamento. Posso entender um pouco melhor o que você busca?', sent_at: new Date().toISOString() },
    { id: 'm3', role: 'user', content: selected?.last_message || 'Quinta às 15h está perfeito.', sent_at: new Date().toISOString() },
  ], [messagesData, selected?.last_message])

  return (
    <V4Page
      eyebrow="Atendimento"
      title="Caixa de entrada"
      subtitle="Acompanhe quem está sendo atendido pela IA e onde sua intervenção é necessária."
      actions={
        <>
          <V4Button>Marcar todas como lidas</V4Button>
          <V4Button variant="primary">Nova conversa</V4Button>
        </>
      }
    >
      <div className="grid h-[calc(100vh-190px)] min-h-[560px] grid-cols-[320px_minmax(0,1fr)_300px] overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)]">
        <aside className="border-r border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] p-3">
            <V4Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar paciente..." className="w-full" />
          </div>
          <div className="divide-y divide-[var(--border)] overflow-auto">
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
                    <span className="text-[10px] text-t3">8 min</span>
                  </div>
                  <p className="mt-1 truncate text-[12px] text-t3">{item.last_message || 'Sem mensagens recentes'}</p>
                  <div className="mt-2 flex gap-1.5">
                    <V4Tag tone={item.status === 'human_takeover' ? 'red' : 'green'}>{item.status === 'human_takeover' ? 'Precisa de você' : 'IA atendendo'}</V4Tag>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex min-w-0 flex-col">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <div className="flex items-center gap-3">
              <V4Avatar name={selected?.client_name || 'Paciente'} color="#427fa1" />
              <div>
                <div className="text-[14px] font-medium text-t1">{selected?.client_name || 'Paciente'}</div>
                <div className="text-[11.5px] text-t3">{selected?.client_goal || 'Consulta online'} · WhatsApp</div>
              </div>
            </div>
            <div className="flex gap-2">
              <V4Tag tone="green" dot>Online</V4Tag>
              <V4Button className="h-8">Assumir</V4Button>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-auto bg-gradient-to-b from-[var(--surface)] to-[var(--bg)] p-5">
            <div className="mx-auto w-fit rounded-full border border-[var(--border)] bg-[var(--raised)] px-3 py-1 text-[11px] text-t3">
              Assistente iniciou qualificação · 10:18
            </div>
            {messages.map(message => (
              <div key={message.id} className={message.role === 'assistant' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={message.role === 'assistant' ? 'max-w-[70%] rounded-2xl bg-[var(--brand)] px-4 py-3 text-[#0B2E1E]' : 'max-w-[70%] rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-t1'}>
                  {message.role === 'assistant' && <div className="mb-1 text-[10px] font-medium opacity-75">Assistente Frame</div>}
                  <div className="text-[13px] leading-5">{message.content}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-[var(--border)] p-3">
            <V4Input placeholder="Digite uma resposta..." className="flex-1" />
            <V4Button variant="primary"><Send className="h-4 w-4" />Enviar</V4Button>
          </div>
        </section>

        <aside className="space-y-4 border-l border-[var(--border)] p-4">
          <div>
            <div className="text-[13px] font-medium text-t1">Resumo inteligente</div>
            <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--raised)] p-3 text-[12px] leading-5 text-t2">
              {selected?.client_name || 'Paciente'} está em etapa de qualificação. Próximo passo sugerido: confirmar interesse, modalidade e melhor horário.
            </div>
          </div>
          <div>
            <div className="text-[13px] font-medium text-t1">Informações comerciais</div>
            <div className="mt-2 space-y-2 text-[12px]">
              {[
                ['Etapa', 'Qualificação'],
                ['Interesse', selected?.client_goal || 'Consulta online'],
                ['Origem', 'Site'],
                ['Intenção', 'Alta'],
                ['Responsável', 'Heloísa'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 border-b border-[var(--border)] pb-2">
                  <span className="text-t3">{label}</span>
                  <strong className="font-medium text-t1">{value}</strong>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[13px] font-medium text-t1">Próxima melhor ação</div>
            <div className="mt-2 space-y-2">
              <V4Button variant="primary" className="w-full">Enviar resposta sugerida</V4Button>
              <V4Button className="w-full"><CalendarPlus className="h-4 w-4" />Agendar consulta</V4Button>
            </div>
          </div>
        </aside>
      </div>
    </V4Page>
  )
}
