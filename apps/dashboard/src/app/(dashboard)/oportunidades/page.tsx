'use client'

import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { Badge, Card } from '@/components/ui/finance-primitives'

interface Opportunity {
  id: string
  name: string | null
  phone: string
  goal: string | null
  stage: string | null
  source: string | null
  estimated_value: string | null
  stage_updated_at: string | null
  created_at: string
}

const STAGES = [
  { key: 'novo_contato', label: 'Novos contatos' },
  { key: 'em_atendimento', label: 'Em atendimento' },
  { key: 'qualificado', label: 'Qualificados' },
  { key: 'avaliando', label: 'Avaliando' },
  { key: 'agendamento_pendente', label: 'Agendamento pendente' },
  { key: 'consulta_marcada', label: 'Consulta marcada' },
] as const

function formatValue(value: string | null) {
  if (!value) return '—'
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return '—'
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
}

function timeAgo(date: string | null) {
  if (!date) return ''
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR })
  } catch {
    return ''
  }
}

export default function OportunidadesPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['opportunities'],
    queryFn: async () => {
      const res = await api.get('/clients/opportunities')
      return res.data.opportunities as Opportunity[]
    },
  })

  const moveStage = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      await api.patch(`/clients/${id}/stage`, { stage })
    },
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: ['opportunities'] })
      const previous = qc.getQueryData<Opportunity[]>(['opportunities'])
      qc.setQueryData<Opportunity[]>(['opportunities'], old =>
        (old ?? []).map(o => (o.id === id ? { ...o, stage, stage_updated_at: new Date().toISOString() } : o)),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(['opportunities'], context.previous)
      toast.error('Não foi possível mover a oportunidade')
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['opportunities'] })
    },
  })

  const sources = useMemo(() => {
    const set = new Set<string>()
    for (const o of data ?? []) {
      if (o.source) set.add(o.source)
    }
    return Array.from(set).sort()
  }, [data])

  const filtered = useMemo(() => {
    return (data ?? []).filter(o => {
      if (search.trim()) {
        const term = search.trim().toLowerCase()
        const haystack = `${o.name ?? ''} ${o.goal ?? ''}`.toLowerCase()
        if (!haystack.includes(term)) return false
      }
      if (sourceFilter !== 'all' && o.source !== sourceFilter) return false
      return true
    })
  }, [data, search, sourceFilter])

  const byStage = useMemo(() => {
    const map: Record<string, Opportunity[]> = {}
    for (const stage of STAGES) map[stage.key] = []
    for (const o of filtered) {
      const stage = o.stage && map[o.stage] ? o.stage : 'novo_contato'
      map[stage].push(o)
    }
    return map
  }, [filtered])

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-6 py-6">
      <div>
        <h1 className="font-display font-bold text-[22px] tracking-tight" style={{ color: 'var(--t1)' }}>Oportunidades</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--t3)' }}>
          Transforme contatos em consultas com clareza de etapa, intenção e próxima ação.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex h-9 min-w-[240px] items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--raised)] px-3">
          <Search className="h-3.5 w-3.5 text-t3" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar oportunidade…"
            className="h-full flex-1 bg-transparent text-[13px] text-t1 placeholder:text-t3 focus:outline-none"
          />
        </div>
        <select
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value)}
          className="h-9 rounded-lg border border-[var(--border)] bg-[var(--raised)] px-3 text-[13px] text-t1 focus:outline-none"
        >
          <option value="all">Todas as origens</option>
          {sources.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-[13px] text-t3">Carregando oportunidades…</div>
      ) : (
        <div className="grid grid-cols-[repeat(6,minmax(230px,1fr))] gap-3 overflow-x-auto pb-2">
          {STAGES.map(stage => {
            const items = byStage[stage.key] ?? []
            return (
              <div key={stage.key} className="flex min-w-[230px] flex-col gap-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[12px] font-semibold text-t1">{stage.label}</span>
                  <span className="rounded-full bg-[var(--raised)] px-2 py-0.5 text-[11px] font-medium text-t3">{items.length}</span>
                </div>

                <div className="flex flex-col gap-2.5">
                  {items.map(o => {
                    const stageIndex = STAGES.findIndex(s => s.key === stage.key)
                    const prevStage = STAGES[stageIndex - 1]
                    const nextStage = STAGES[stageIndex + 1]
                    return (
                      <Card key={o.id} hover className="p-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-[13px] font-semibold text-t1">{o.name || o.phone}</div>
                          <div className="text-[12.5px] font-semibold tabular-nums text-t1">{formatValue(o.estimated_value)}</div>
                        </div>
                        {o.goal && (
                          <p className="mt-1.5 text-[12px] leading-snug text-t3">{o.goal}</p>
                        )}
                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {o.source && <Badge variant="info">{o.source}</Badge>}
                            <span className="text-[11px] text-t3">{timeAgo(o.stage_updated_at || o.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={!prevStage || moveStage.isPending}
                              onClick={() => prevStage && moveStage.mutate({ id: o.id, stage: prevStage.key })}
                              className={cn(
                                'grid h-6 w-6 place-items-center rounded-md border border-[var(--border)] text-t3 transition-colors',
                                prevStage ? 'hover:bg-[var(--raised)] hover:text-t1' : 'opacity-30',
                              )}
                              aria-label="Mover para etapa anterior"
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={!nextStage || moveStage.isPending}
                              onClick={() => nextStage && moveStage.mutate({ id: o.id, stage: nextStage.key })}
                              className={cn(
                                'grid h-6 w-6 place-items-center rounded-md border border-[var(--border)] text-t3 transition-colors',
                                nextStage ? 'hover:bg-[var(--raised)] hover:text-t1' : 'opacity-30',
                              )}
                              aria-label="Mover para próxima etapa"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </Card>
                    )
                  })}

                  {items.length === 0 && (
                    <div className="rounded-lg border border-dashed border-[var(--border)] px-3 py-6 text-center text-[12px] text-t3">
                      Nenhuma oportunidade
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
