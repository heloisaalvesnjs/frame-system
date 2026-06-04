'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { UserPlus, Copy, Trash2, Clock, CheckCircle, Shield, Eye, Pencil } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

interface TeamMember {
  id: string
  name: string | null
  email: string
  role: 'admin' | 'receptionist' | 'viewer'
  status: 'pending' | 'active'
  created_at: string
  invite_link?: string
}

const ROLES = [
  { value: 'admin',        label: 'Administrador', desc: 'Acesso total ao sistema',                   icon: Shield },
  { value: 'receptionist', label: 'Recepcionista',  desc: 'Agenda, clientes e conversas',              icon: Pencil },
  { value: 'viewer',       label: 'Visualizador',   desc: 'Somente leitura, sem editar nada',          icon: Eye },
]

export default function EquipePage() {
  const qc = useQueryClient()
  const [email,  setEmail]  = useState('')
  const [role,   setRole]   = useState<'admin' | 'receptionist' | 'viewer'>('receptionist')
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const { data: members = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ['team'],
    queryFn: async () => { const { data } = await api.get('/api/team'); return data.members },
  })

  async function handleInvite() {
    if (!email.trim()) return
    setAdding(true)
    try {
      await api.post('/api/team/invite', { email: email.trim(), role })
      toast.success('Convite criado! Copie o link e envie para o colaborador.')
      setEmail('')
      setShowForm(false)
      qc.invalidateQueries({ queryKey: ['team'] })
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Erro ao criar convite.')
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(id: string) {
    if (!confirm('Remover este colaborador?')) return
    try {
      await api.delete(`/api/team/${id}`)
      toast.success('Colaborador removido.')
      qc.invalidateQueries({ queryKey: ['team'] })
    } catch { toast.error('Erro ao remover.') }
  }

  function copyLink(link: string) {
    navigator.clipboard.writeText(link)
    toast.success('Link copiado!')
  }

  const roleInfo = (r: string) => ROLES.find(x => x.value === r)

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-[22px] tracking-tight text-t1">Equipe</h1>
          <p className="text-sm text-t2 mt-0.5">Adicione colaboradores e defina o que cada um pode fazer</p>
        </div>
        <Button onClick={() => setShowForm(v => !v)}>
          <UserPlus className="w-4 h-4" />
          Adicionar
        </Button>
      </div>

      {/* Form novo membro */}
      {showForm && (
        <Card>
          <CardContent className="py-5 space-y-4">
            <p className="text-sm font-semibold text-t1">Novo colaborador</p>

            <div className="space-y-2">
              <label className="text-xs font-medium text-t2">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="colaborador@email.com"
                className="w-full h-9 rounded-lg px-3 text-sm text-t1 placeholder:text-t3 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-t2">Nível de acesso</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(({ value, label, desc, icon: Icon }) => (
                  <button key={value} type="button"
                    onClick={() => setRole(value as any)}
                    className={cn(
                      'flex flex-col gap-1 p-3 rounded-xl border text-left transition-all',
                      role === value ? 'border-brand-500/40 bg-brand-500/8' : 'hover:bg-raised'
                    )}
                    style={{ borderColor: role === value ? undefined : 'var(--border)' }}
                  >
                    <Icon className={cn('w-4 h-4', role === value ? 'text-brand-500' : 'text-t3')} />
                    <p className={cn('text-xs font-semibold', role === value ? 'text-brand-500' : 'text-t1')}>{label}</p>
                    <p className="text-[10px] text-t3 leading-tight">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleInvite} loading={adding} disabled={!email.trim()}>
                Gerar link de convite
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de membros */}
      {isLoading ? (
        <div className="text-sm text-t2">Carregando...</div>
      ) : members.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center space-y-2">
            <UserPlus className="w-8 h-8 text-t3 mx-auto" />
            <p className="text-sm font-medium text-t1">Nenhum colaborador ainda</p>
            <p className="text-xs text-t3">Adicione colaboradores para eles acessarem o sistema</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {members.map(member => {
            const info = roleInfo(member.role)
            const RoleIcon = info?.icon ?? Eye
            return (
              <Card key={member.id}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-brand-500 flex-shrink-0"
                      style={{ background: 'var(--brand-s-solid)' }}>
                      {(member.name || member.email)[0].toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-t1 truncate">
                          {member.name || member.email}
                        </p>
                        {member.status === 'pending' ? (
                          <span className="flex items-center gap-1 text-[10px] text-amber-400 font-mono px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,.1)' }}>
                            <Clock className="w-2.5 h-2.5" /> pendente
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,.1)' }}>
                            <CheckCircle className="w-2.5 h-2.5" /> ativo
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-t3 truncate">{member.email}</p>
                        <span className="text-t3">·</span>
                        <div className="flex items-center gap-1">
                          <RoleIcon className="w-3 h-3 text-t3" />
                          <span className="text-[11px] text-t3">{info?.label}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {member.status === 'pending' && member.invite_link && (
                        <button
                          onClick={() => copyLink(member.invite_link!)}
                          className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors px-2.5 py-1.5 rounded-lg"
                          style={{ border: '1px solid var(--border)' }}
                        >
                          <Copy className="w-3.5 h-3.5" /> Copiar link
                        </button>
                      )}
                      <button
                        onClick={() => handleRemove(member.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-t3 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Info */}
      <div className="rounded-xl p-4 text-xs text-t2 space-y-1.5" style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
        <p className="font-medium text-t1">Como funciona?</p>
        <p>1. Adicione o e-mail do colaborador e escolha o nível de acesso</p>
        <p>2. Copie o link gerado e envie para ele pelo WhatsApp ou e-mail</p>
        <p>3. O colaborador clica no link, cria uma senha e já entra no sistema</p>
        <p>4. Você pode remover o acesso a qualquer momento</p>
      </div>
    </div>
  )
}
