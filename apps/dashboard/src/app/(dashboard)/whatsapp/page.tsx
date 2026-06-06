'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Power } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

// ─── AI Power Toggle ─────────────────────────────────────────────
function AIPowerToggle() {
  const qc = useQueryClient()
  const [paused, setPaused] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data: assistant } = useQuery<any>({
    queryKey: ['assistant'],
    queryFn: async () => { const { data } = await api.get('/api/assistants'); return data.assistant },
    staleTime: 30_000,
  })

  useEffect(() => {
    if (assistant) setPaused(assistant.ai_paused ?? false)
  }, [assistant])

  async function toggle() {
    const next = !paused
    setSaving(true)
    try {
      await api.patch('/api/assistants/toggle-ai', { paused: next })
      setPaused(next)
      qc.invalidateQueries({ queryKey: ['assistant'] })
      toast.success(next ? 'IA desativada — não vai responder nenhuma mensagem.' : 'IA ativada!')
    } catch { toast.error('Erro ao alterar.') }
    finally { setSaving(false) }
  }

  return (
    <div className={cn(
      'flex items-center gap-4 rounded-2xl px-5 py-4 transition-colors',
      paused
        ? 'bg-red-500/8 border border-red-500/25'
        : 'bg-emerald-500/8 border border-emerald-500/20'
    )}>
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
        paused ? 'bg-red-500/15' : 'bg-emerald-500/15')}>
        <Power className={cn('w-5 h-5', paused ? 'text-red-500' : 'text-emerald-500')} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold', paused ? 'text-red-500' : 'text-emerald-600')}>
          {paused ? 'IA desativada' : 'IA ativa'}
        </p>
        <p className="text-xs text-t3 mt-0.5">
          {paused
            ? 'A assistente não está respondendo nenhuma mensagem no momento'
            : 'A assistente está respondendo normalmente'}
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={saving}
        className={cn(
          'relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 disabled:opacity-60',
          paused ? 'bg-red-500' : 'bg-emerald-500'
        )}
      >
        <span className={cn(
          'inline-block h-5 w-5 m-1 transform rounded-full bg-white shadow transition-transform duration-200',
          paused ? 'translate-x-0' : 'translate-x-5'
        )} />
      </button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────
export default function ConexoesPage() {
  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-t1">Conexões</h1>
        <p className="text-sm text-t3 mt-0.5">Gerencie o status da assistente</p>
      </div>

      <AIPowerToggle />

      <p className="text-xs text-t3 text-center">
        Para conectar ou desconectar o WhatsApp, acesse{' '}
        <a href="/integracoes" className="text-brand-400 hover:underline">Integrações</a>.
      </p>
    </div>
  )
}
