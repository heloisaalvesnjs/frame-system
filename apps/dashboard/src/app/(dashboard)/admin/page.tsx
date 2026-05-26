'use client'

import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { toast } from 'sonner'
import {
  CheckCircle2, XCircle, Clock, Users, Shield, Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Nutritionist {
  id: string; name: string; email: string; phone: string | null
  plan: string; status: string; is_master: boolean; created_at: string
}
interface Stats {
  active_nutritionists: number; pending_nutritionists: number
  total_patients: number; total_clients: number
}

const STATUS_PILL: Record<string, string> = {
  active:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  pending:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  suspended: 'bg-red-500/10 text-red-400 border-red-500/20',
}
const STATUS_LABEL: Record<string, string> = {
  active: 'Ativa', pending: 'Pendente', suspended: 'Suspensa'
}

export default function AdminPage() {
  const { user } = useAuth()
  const router = useRouter()
  const qc = useQueryClient()

  // Only master accounts can access this page
  useEffect(() => {
    if (user && !(user as any).is_master) router.replace('/dashboard')
  }, [user, router])

  const { data: stats } = useQuery<Stats>({
    queryKey: ['admin-stats'],
    queryFn: async () => { const { data } = await api.get('/api/admin/stats'); return data.stats },
    staleTime: 30_000,
  })

  const { data: nutris, isLoading } = useQuery<Nutritionist[]>({
    queryKey: ['admin-nutritionists'],
    queryFn: async () => { const { data } = await api.get('/api/admin/nutritionists'); return data.nutritionists },
    staleTime: 30_000,
  })

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/admin/nutritionists/${id}/status`, { status }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-nutritionists'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      const label = vars.status === 'active' ? 'aprovada' : vars.status === 'suspended' ? 'suspensa' : 'pendente'
      toast.success(`Conta ${label} com sucesso`)
    },
    onError: () => toast.error('Erro ao alterar status'),
  })

  if (!user || !(user as any).is_master) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 text-brand-400 animate-spin" /></div>
  }

  const pending  = nutris?.filter(n => n.status === 'pending') ?? []
  const active   = nutris?.filter(n => n.status === 'active' && !n.is_master) ?? []
  const suspended = nutris?.filter(n => n.status === 'suspended') ?? []

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-7">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-brand-400" />
        </div>
        <div>
          <h1 className="text-[22px] font-bold text-white tracking-tight">Painel Administrativo</h1>
          <p className="text-sm text-white/35 mt-0.5">Conta mestre — Frame System</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-7">
          {[
            { label: 'Nutricionistas ativas', value: stats.active_nutritionists, accent: 'bg-emerald-500', icon: CheckCircle2, color: 'text-emerald-400' },
            { label: 'Aguardando aprovação', value: stats.pending_nutritionists, accent: 'bg-amber-500', icon: Clock, color: 'text-amber-400' },
            { label: 'Pacientes cadastrados', value: stats.total_patients, accent: 'bg-brand-500', icon: Users, color: 'text-brand-400' },
            { label: 'Total de clientes', value: stats.total_clients, accent: 'bg-blue-500', icon: Users, color: 'text-blue-400' },
          ].map(s => (
            <div key={s.label} className="bg-ui-card border border-white/[0.06] rounded-2xl p-4 relative overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-0.5 ${s.accent}`} />
              <p className="text-[10px] font-semibold text-white/35 uppercase tracking-wider mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pending approval */}
      {pending.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white/80">Aguardando aprovação</h2>
            <span className="ml-auto text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-semibold">
              {pending.length}
            </span>
          </div>
          <div className="bg-ui-card border border-white/[0.06] rounded-2xl overflow-hidden">
            <ul className="divide-y divide-white/[0.04]">
              {pending.map(n => (
                <li key={n.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-amber-400">{n.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white/90 truncate">{n.name}</p>
                    <p className="text-xs text-white/35 truncate">{n.email}</p>
                    <p className="text-[10px] text-white/20 mt-0.5">
                      Cadastro em {format(new Date(n.created_at), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => changeStatus.mutate({ id: n.id, status: 'active' })}
                      disabled={changeStatus.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
                    </button>
                    <button
                      onClick={() => changeStatus.mutate({ id: n.id, status: 'suspended' })}
                      disabled={changeStatus.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-red-400 text-xs font-semibold rounded-lg transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Recusar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Active nutritionists */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white/80">Nutricionistas ativas</h2>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-brand-400 animate-spin" /></div>
        ) : active.length === 0 ? (
          <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-6 text-center text-sm text-white/25">Nenhuma ainda</div>
        ) : (
          <div className="bg-ui-card border border-white/[0.06] rounded-2xl overflow-hidden">
            <ul className="divide-y divide-white/[0.04]">
              {active.map(n => (
                <li key={n.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-8 h-8 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-brand-400">{n.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/80 truncate">{n.name}</p>
                    <p className="text-xs text-white/30 truncate">{n.email}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold flex-shrink-0 ${STATUS_PILL[n.status]}`}>
                    {STATUS_LABEL[n.status]}
                  </span>
                  <button
                    onClick={() => changeStatus.mutate({ id: n.id, status: 'suspended' })}
                    className="text-xs text-red-400/60 hover:text-red-400 transition-colors flex-shrink-0"
                    title="Suspender"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Suspended */}
      {suspended.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-semibold text-white/80">Suspensas</h2>
          </div>
          <div className="bg-ui-card border border-white/[0.06] rounded-2xl overflow-hidden">
            <ul className="divide-y divide-white/[0.04]">
              {suspended.map(n => (
                <li key={n.id} className="flex items-center gap-4 px-5 py-3 opacity-70">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/60 truncate">{n.name}</p>
                    <p className="text-xs text-white/25 truncate">{n.email}</p>
                  </div>
                  <button
                    onClick={() => changeStatus.mutate({ id: n.id, status: 'active' })}
                    className="text-xs text-emerald-400/60 hover:text-emerald-400 transition-colors flex-shrink-0"
                    title="Reativar"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  )
}
