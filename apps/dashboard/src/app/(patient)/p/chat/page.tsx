'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usePatient, patientApi } from '@/contexts/PatientContext'
import { PatientNav } from '@/components/patient/PatientNav'
import { Send, MessageCircle, Loader2 } from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Message {
  id: string
  from_role: 'patient' | 'nutritionist'
  content: string
  read_at: string | null
  created_at: string
}

function formatMsgTime(dateStr: string) {
  const d = new Date(dateStr)
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return `Ontem ${format(d, 'HH:mm')}`
  return format(d, "d MMM HH:mm", { locale: ptBR })
}

export default function PatientChatPage() {
  const { client } = usePatient()
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: messages, isLoading } = useQuery<Message[]>({
    queryKey: ['patient-chat'],
    queryFn: async () => {
      const { data } = await patientApi.get('/api/patient/chat')
      return data.messages
    },
    enabled: !!client,
    refetchInterval: 10_000, // polling a cada 10s
    staleTime: 5_000,
  })

  const sendMsg = useMutation({
    mutationFn: (content: string) => patientApi.post('/api/patient/chat', { content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient-chat'] })
      setText('')
    },
  })

  // Scroll para baixo quando chegam novas mensagens
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    if (!text.trim() || sendMsg.isPending) return
    sendMsg.mutate(text.trim())
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="max-w-md mx-auto flex flex-col" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-3 border-b border-white/[0.05] flex-shrink-0">
        <h1 className="text-[18px] font-bold text-white tracking-tight">Chat</h1>
        <p className="text-xs text-white/35">Sua nutricionista responderá em breve</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <MessageCircle className="w-10 h-10 text-white/10 mb-3" />
            <p className="text-sm text-white/25">Nenhuma mensagem ainda</p>
            <p className="text-xs text-white/15 mt-1">Diga olá para sua nutricionista!</p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.from_role === 'patient'
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${isMe ? 'order-last' : ''}`}>
                  {!isMe && (
                    <p className="text-[10px] text-white/30 mb-1 ml-1">Nutricionista</p>
                  )}
                  <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                    isMe
                      ? 'bg-brand-500 text-white rounded-br-md'
                      : 'bg-white/[0.08] text-white/85 rounded-bl-md'
                  }`}>
                    {msg.content}
                  </div>
                  <p className={`text-[10px] text-white/20 mt-1 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                    {formatMsgTime(msg.created_at)}
                    {isMe && msg.read_at && ' · Lida'}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input — above bottom nav */}
      <div className="px-4 py-3 border-t border-white/[0.05] mb-16 flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Escreva uma mensagem..."
            rows={1}
            className="flex-1 bg-white/[0.06] border border-white/[0.1] rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-brand-500/40 resize-none transition-colors"
            style={{ maxHeight: '120px', overflowY: 'auto' }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sendMsg.isPending}
            className="w-10 h-10 rounded-full bg-brand-500 hover:bg-brand-400 flex items-center justify-center flex-shrink-0 transition-all active:scale-95 disabled:opacity-40 shadow-lg shadow-brand-500/25"
          >
            {sendMsg.isPending
              ? <Loader2 className="w-4 h-4 text-white animate-spin" />
              : <Send className="w-4 h-4 text-white" />}
          </button>
        </div>
      </div>

      <PatientNav />
    </div>
  )
}
