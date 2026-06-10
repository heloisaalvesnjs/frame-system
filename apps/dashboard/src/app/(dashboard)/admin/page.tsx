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

const STATUS_PILL: Record<string, { color: string; bg: string; border: string }> = {
  active:    { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  pending:   { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  suspended: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
}
const STATUS_LABEL: Record<string, string> = {
  active: 'Ativa', pending: 'Pendente', suspended: 'Suspensa'
}

export default function AdminPage() {
  const { user } = useAuth()
  const router = useRouter()
  const qc = useQueryClient()

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
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--brand)' }} />
      </div>
    )
  }

  const pending   = nutris?.filter(n => n.status === 'pending') ?? []
  const active    = nutris?.filter(n => n.status === 'active' && !n.is_master) ?? []
  const suspended = nutris?.filter(n => n.status === 'suspended') ?? []

  const statsCards = stats ? [
    { label: 'Nutricionistas ativas', value: stats.active_nutritionists, accent: '#059669', iconColor: '#059669' },
    { label: 'Aguardando aprovação',  value: stats.pending_nutritionists, accent: '#D97706', iconColor: '#D97706' },
    { label: 'Pacientes cadastrados', value: stats.total_patients,        accent: '#00C27C', iconColor: '#00C27C' },
    { label: 'Total de clientes',     value: stats.total_clients,         accent: '#2563EB', iconColor: '#2563EB' },
  ] : []

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-7">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--brand-s)' }}
        >
          <Shield className="w-5 h-5" style={{ color: 'var(--brand)' }} />
        </div>
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-tight" style={{ color: 'var(--t1)' }}>
            Painel Administrativo
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--t3)' }}>Conta mestre — Frame System</p>
        </div>
      </div>

      {/* Stats */}
      {statsCards.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-7">
          {statsCards.map(s => (
            <div
              key={s.label}
              className="rounded-2xl p-4 relative overflow-hidden"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
                style={{ background: s.accent }}
              />
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--t3)' }}>
                {s.label}
              </p>
              <p className="text-2xl font-bold" style={{ color: s.iconColor }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pending approval */}
      {pending.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4" style={{ color: '#D97706' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Aguardando aprovação</h2>
            <span
              className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold border"
              style={{ color: '#D97706', background: '#FFFBEB', borderColor: '#FDE68A' }}
            >
              {pending.length}
            </span>
          </div>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
          >
            <ul>
              {pending.map((n, i) => (
                <li
                  key={n.id}
                  className="flex items-center gap-4 px-5 py-4"
                  style={i > 0 ? { borderTop: '1px solid var(--border)' } : undefined}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border"
                    style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}
                  >
                    <span className="text-sm font-bold" style={{ color: '#D97706' }}>{n.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--t1)' }}>{n.name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--t3)' }}>{n.email}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--t3)' }}>
                      Cadastro em {format(new Date(n.created_at), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => changeStatus.mutate({ id: n.id, status: 'active' })}
                      disabled={changeStatus.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border"
                      style={{ color: '#059669', background: '#ECFDF5', borderColor: '#A7F3D0' }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
                    </button>
                    <button
                      onClick={() => changeStatus.mutate({ id: n.id, status: 'suspended' })}
                      disabled={changeStatus.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border"
                      style={{ color: '#DC2626', background: '#FEF2F2', borderColor: '#FECACA' }}
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
          <CheckCircle2 className="w-4 h-4" style={{ color: '#059669' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Nutricionistas ativas</h2>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--brand)' }} />
          </div>
        ) : active.length === 0 ? (
          <div
            className="rounded-2xl p-6 text-center text-sm"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--t3)' }}
          >
            Nenhuma ainda
          </div>
        ) : (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
          >
            <ul>
              {active.map((n, i) => {
                const pill = STATUS_PILL[n.status]
                return (
                  <li
                    key={n.id}
                    className="flex items-center gap-4 px-5 py-3.5"
                    style={i > 0 ? { borderTop: '1px solid var(--border)' } : undefined}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border"
                      style={{ background: 'var(--brand-s)', borderColor: 'rgba(0,194,124,0.20)' }}
                    >
                      <span className="text-xs font-bold" style={{ color: 'var(--brand)' }}>{n.name.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--t1)' }}>{n.name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--t3)' }}>{n.email}</p>
                    </div>
                    {pill && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-md border font-semibold flex-shrink-0"
                        style={{ color: pill.color, background: pill.bg, borderColor: pill.border }}
                      >
                        {STATUS_LABEL[n.status]}
                      </span>
                    )}
                    <button
                      onClick={() => changeStatus.mutate({ id: n.id, status: 'suspended' })}
                      className="flex-shrink-0 transition-opacity hover:opacity-70"
                      title="Suspender"
                      style={{ color: '#DC2626' }}
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </section>

      {/* Suspended */}
      {suspended.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="w-4 h-4" style={{ color: '#DC2626' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Suspensas</h2>
          </div>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
          >
            <ul>
              {suspended.map((n, i) => (
                <li
                  key={n.id}
                  className="flex items-center gap-4 px-5 py-3 opacity-60"
                  style={i > 0 ? { borderTop: '1px solid var(--border)' } : undefined}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: 'var(--t2)' }}>{n.name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--t3)' }}>{n.email}</p>
                  </div>
                  <button
                    onClick={() => changeStatus.mutate({ id: n.id, status: 'active' })}
                    className="flex-shrink-0 transition-opacity hover:opacity-80"
                    title="Reativar"
                    style={{ color: '#059669' }}
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
