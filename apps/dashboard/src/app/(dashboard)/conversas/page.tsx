'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  MoreHorizontal, Paperclip, Phone, Search, Send, Smile, Sparkles, Tag,
} from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Avatar, Badge, Btn } from '@/components/ui/finance-primitives'

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

const COLORS = ['blue', 'green', 'purple', 'orange', 'pink'] as const

function fmtTime(d?: string) {
  if (!d) return ''
  const date = new Date(d)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 60_000) return 'agora'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}min`
  if (diff < 86_400_000) return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

type FilterTab = 'Todas' | 'Precisa de você' | 'IA atendendo'

export default function ConversasPage() {
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterTab>('Todas')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data, isFetching } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => { const { data } = await api.get('/api/conversations'); return data.conversations },
    refetchInterval: 10_000,
  })

  const conversations = data ?? []

  useEffect(() => {
    if (!selectedId && conversations.length) setSelectedId(conversations[0].id)
  }, [conversations, selectedId])

  const selected = conversations.find(c => c.id === selectedId) ?? null

  const filtered = conversations.filter(c => {
    const text = `${c.client_name} ${c.client_phone}`.toLowerCase()
    if (!text.includes(search.toLowerCase())) return false
    if (filter === 'Precisa de você') return c.status === 'human_takeover'
    if (filter === 'IA atendendo') return c.status === 'active'
    return true
  })

  const { data: msgData } = useQuery<{ conversation: Conversation; messages: Message[] }>({
    queryKey: ['messages', selected?.id],
    queryFn: async () => { const { data } = await api.get(`/api/conversations/${selected!.id}/messages`); return data },
    enabled: !!selected?.id,
    refetchInterval: 8_000,
  })

  const messages = useMemo<Message[]>(() => msgData?.messages ?? [], [msgData])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const takeover = useMutation({
    mutationFn: () => api.post(`/api/conversations/${selected!.id}/takeover`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['conversations'] }); toast.success('Conversa assumida') },
    onError: () => toast.error('Não foi possível assumir a conversa'),
  })

  return (
    <div
      className="grid h-[calc(100vh-64px)]"
      style={{ gridTemplateColumns: '320px minmax(0,1fr) 320px' }}
    >
      {/* ── Left: thread list ───────────────────────────────── */}
      <div
        className="flex flex-col"
        style={{ borderRight: '1px solid var(--line-1)', background: 'color-mix(in srgb, var(--bg-elevated) 40%, transparent)' }}
      >
        <div className="p-3" style={{ borderBottom: '1px solid var(--line-1)' }}>
          <div
            className="flex h-8 items-center gap-2 rounded-lg px-3"
            style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--line-1)' }}
          >
            <Search className="h-3.5 w-3.5 text-3" />
            <input
              className="flex-1 bg-transparent text-[13px] text-1 outline-none placeholder:text-3"
              placeholder="Buscar conversas…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="mt-3 flex items-center gap-1">
            {(['Todas', 'Precisa de você', 'IA atendendo'] as FilterTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className="rounded-lg px-2.5 py-1 text-[11.5px] font-medium transition-colors"
                style={{
                  background: filter === tab ? 'var(--bg-elevated)' : 'transparent',
                  border: filter === tab ? '1px solid var(--line-2)' : '1px solid transparent',
                  color: filter === tab ? 'var(--text-1)' : 'var(--text-3)',
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 divide-y overflow-y-auto" style={{ '--tw-divide-opacity': '1', borderColor: 'var(--line-1)' } as any}>
          {filtered.map((c, i) => {
            const isActive = selected?.id === c.id
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className="relative flex w-full gap-3 px-3 py-3 text-left transition-colors"
                style={{
                  background: isActive ? 'color-mix(in srgb, var(--brand) 7%, transparent)' : 'transparent',
                  borderLeft: isActive ? '2px solid var(--brand)' : '2px solid transparent',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, white 2.5%, transparent)' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <Avatar name={c.client_name || c.client_phone} color={COLORS[i % COLORS.length]} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13px] font-medium text-1">{c.client_name || c.client_phone}</span>
                    <span className="shrink-0 text-[10.5px] text-3">{fmtTime(c.last_message_at)}</span>
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-2">{c.last_message || 'Sem mensagens recentes'}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <Badge>WhatsApp</Badge>
                    {c.status === 'active' && (
                      <Badge variant="success">
                        <Sparkles className="h-2.5 w-2.5" /> IA
                      </Badge>
                    )}
                    {c.status === 'human_takeover' && <Badge variant="warning">Precisa de você</Badge>}
                    {c.status === 'resolved' && <Badge>Resolvida</Badge>}
                  </div>
                </div>
              </button>
            )
          })}
          {!filtered.length && (
            <div className="px-4 py-10 text-center text-[12px] text-3">
              Nenhuma conversa encontrada.
            </div>
          )}
        </div>
      </div>

      {/* ── Middle: chat ────────────────────────────────────── */}
      <div className="flex min-w-0 flex-col">
        {selected ? (
          <>
            {/* Header */}
            <div
              className="flex h-14 items-center gap-3 px-5"
              style={{ borderBottom: '1px solid var(--line-1)' }}
            >
              <Avatar name={selected.client_name || 'Paciente'} color="blue" size={32} />
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold text-1">{selected.client_name || selected.client_phone}</div>
                <div className="flex items-center gap-2 text-[11.5px] text-3">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: selected.status === 'active' ? 'var(--brand)' : 'var(--text-3)' }}
                  />
                  {selected.status === 'active' ? 'Online' : selected.status === 'human_takeover' ? 'Precisa de você' : 'Resolvida'} · WhatsApp
                </div>
              </div>
              <a href={`tel:${selected.client_phone}`}>
                <button
                  className="grid h-8 w-8 place-items-center rounded-lg text-2 transition-colors hover:bg-[var(--bg-surface)] hover:text-1"
                >
                  <Phone className="h-3.5 w-3.5" />
                </button>
              </a>
              <button className="grid h-8 w-8 place-items-center rounded-lg text-2 transition-colors hover:bg-[var(--bg-surface)] hover:text-1">
                <Tag className="h-3.5 w-3.5" />
              </button>
              <button className="grid h-8 w-8 place-items-center rounded-lg text-2 transition-colors hover:bg-[var(--bg-surface)] hover:text-1">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Messages */}
            <div
              className="flex-1 space-y-4 overflow-y-auto px-6 py-6"
              style={{ background: 'linear-gradient(to bottom, var(--bg-elevated), var(--bg-base))' }}
            >
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.role === 'assistant' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[70%]">
                    {m.role === 'assistant' && (
                      <div className="mb-1 flex items-center justify-end gap-1 text-[10.5px]" style={{ color: 'var(--brand)' }}>
                        <Sparkles className="h-2.5 w-2.5" /> Resposta da IA
                      </div>
                    )}
                    <div
                      className="rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed"
                      style={
                        m.role === 'assistant'
                          ? { background: 'linear-gradient(135deg, #00C27C, #00B070)', color: '#02140C', borderBottomRightRadius: '6px' }
                          : { background: 'var(--bg-surface)', border: '1px solid var(--line-1)', color: 'var(--text-1)', borderBottomLeftRadius: '6px' }
                      }
                    >
                      {m.content}
                    </div>
                    <div
                      className={`mt-1 text-[10.5px] text-3 ${m.role === 'assistant' ? 'text-right' : 'text-left'}`}
                    >
                      {new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(m.sent_at))}
                    </div>
                  </div>
                </div>
              ))}
              {!messages.length && (
                <div className="grid h-full place-items-center text-center">
                  <div>
                    <div className="text-[13px] font-medium text-1">Sem mensagens nessa conversa</div>
                    <p className="mt-1 text-[12px] text-3">O histórico aparecerá aqui quando houver mensagens registradas.</p>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Composer */}
            <div className="p-4" style={{ borderTop: '1px solid var(--line-1)' }}>
              <div
                className="rounded-xl p-2.5"
                style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--line-1)' }}
              >
                <textarea
                  className="w-full resize-none bg-transparent text-[13px] text-1 outline-none placeholder:text-3"
                  rows={2}
                  placeholder={
                    selected.status === 'human_takeover'
                      ? 'Escreva uma mensagem…'
                      : 'IA está respondendo automaticamente. Use "Assumir" para intervir.'
                  }
                  disabled={selected.status !== 'human_takeover'}
                />
                <div className="mt-1 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button className="grid h-7 w-7 place-items-center rounded-md text-3 hover:bg-[var(--bg-surface)] hover:text-1 transition-colors">
                      <Paperclip className="h-3.5 w-3.5" />
                    </button>
                    <button className="grid h-7 w-7 place-items-center rounded-md text-3 hover:bg-[var(--bg-surface)] hover:text-1 transition-colors">
                      <Smile className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="flex h-7 items-center gap-1 rounded-md px-2 text-[11.5px] text-3 hover:bg-[var(--bg-surface)] hover:text-1 transition-colors"
                      style={{ color: 'var(--brand)' }}
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Sugerir
                    </button>
                  </div>
                  <Btn variant="primary" size="sm" disabled={selected.status !== 'human_takeover'}>
                    <Send className="h-3.5 w-3.5" /> Enviar
                  </Btn>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="grid flex-1 place-items-center p-8 text-center">
            <div>
              <div className="text-[14px] font-medium text-1">Selecione uma conversa</div>
              <p className="mt-1 text-[12px] text-3">Escolha uma conversa na lista ao lado.</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Right: patient sidebar ───────────────────────────── */}
      <div
        className="overflow-y-auto"
        style={{ borderLeft: '1px solid var(--line-1)', background: 'color-mix(in srgb, var(--bg-elevated) 40%, transparent)' }}
      >
        {selected ? (
          <>
            {/* Patient info */}
            <div className="p-5" style={{ borderBottom: '1px solid var(--line-1)' }}>
              <div className="mb-4 flex items-center gap-3">
                <Avatar name={selected.client_name || 'Paciente'} color="blue" size={48} />
                <div>
                  <div className="text-[14px] font-semibold text-1">{selected.client_name || selected.client_phone}</div>
                  <div className="text-[12px] text-3">{selected.client_phone}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a href={`https://wa.me/${selected.client_phone?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                  <Btn variant="secondary" size="sm" className="w-full">WhatsApp</Btn>
                </a>
                <Btn
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => takeover.mutate()}
                  disabled={takeover.isPending || selected.status === 'human_takeover'}
                >
                  Assumir
                </Btn>
              </div>
            </div>

            {/* Details */}
            <div className="p-5" style={{ borderBottom: '1px solid var(--line-1)' }}>
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-3">Detalhes</div>
              <div className="space-y-3">
                {[
                  ['Estágio', selected.status === 'human_takeover' ? 'Intervenção' : selected.status === 'resolved' ? 'Resolvida' : 'Atendimento'],
                  ['Objetivo', selected.client_goal || '—'],
                  ['Canal', 'WhatsApp'],
                  ['Modo', selected.mode === 'copilot' ? 'Copiloto' : 'Automático'],
                  ['LTV', '—'],
                  ['Próximo retorno', '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-[12.5px]">
                    <span className="text-3">{k}</span>
                    <span className="font-medium text-1">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="p-5">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-3">Histórico</div>
              <div className="relative pl-4">
                <div
                  className="absolute bottom-1 left-1 top-1 w-px"
                  style={{ background: 'var(--line-2)' }}
                />
                {[
                  { t: selected.status === 'human_takeover' ? 'Precisa de atenção' : 'Em atendimento automático', d: 'agora' },
                  { t: 'Conversa iniciada', d: 'recentemente' },
                ].map((h, i) => (
                  <div key={i} className="relative pb-3 last:pb-0">
                    <span
                      className="absolute -left-3 top-1 h-1.5 w-1.5 rounded-full ring-2"
                      style={{ background: 'var(--brand)', '--tw-ring-color': 'var(--bg-base)' } as any}
                    />
                    <div className="text-[12.5px] text-1">{h.t}</div>
                    <div className="text-[11px] text-3">{h.d}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="grid h-full place-items-center p-8 text-center">
            <p className="text-[12px] text-3">Selecione uma conversa para ver os detalhes.</p>
          </div>
        )}
      </div>
    </div>
  )
}
