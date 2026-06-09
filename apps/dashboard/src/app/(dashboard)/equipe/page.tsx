'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { UserPlus, Copy, Trash2, Clock, CheckCircle, Shield, Eye, Pencil, Loader2 } from 'lucide-react'
import api from '@/lib/api'

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
  { value: 'admin',        label: 'Administrador', desc: 'Acesso total ao sistema',          icon: Shield },
  { value: 'receptionist', label: 'Recepcionista',  desc: 'Agenda, clientes e conversas',     icon: Pencil },
  { value: 'viewer',       label: 'Visualizador',   desc: 'Somente leitura, sem editar nada', icon: Eye   },
]

export default function EquipePage() {
  const qc = useQueryClient()
  const [email,    setEmail]    = useState('')
  const [role,     setRole]     = useState<'admin' | 'receptionist' | 'viewer'>('receptionist')
  const [adding,   setAdding]   = useState(false)
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

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-bold text-[22px] tracking-tight" style={{ color: 'var(--t1)' }}>Equipe</h1>
          <p className="text-[14px] mt-0.5" style={{ color: 'var(--t2)' }}>
            Adicione colaboradores e defina o que cada um pode fazer
          </p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="btn-primary flex-shrink-0">
          <UserPlus className="w-4 h-4" />
          Adicionar
        </button>
      </div>

      {/* Form novo membro */}
      {showForm && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div className="card-header">
            <p className="text-[14px] font-semibold" style={{ color: 'var(--t1)' }}>Novo colaborador</p>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="field-label">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="colaborador@email.com"
                className="input"
              />
            </div>

            <div>
              <label className="field-label">Nível de acesso</label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {ROLES.map(({ value, label, desc, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRole(value as any)}
                    className="flex flex-col gap-1 p-3 rounded-xl text-left transition-all"
                    style={role === value
                      ? { border: '1.5px solid var(--brand)', background: 'var(--brand-s)' }
                      : { border: '1px solid var(--border)' }
                    }
                  >
                    <Icon className="w-4 h-4" style={{ color: role === value ? 'var(--brand)' : 'var(--t3)' }} />
                    <p className="text-[12px] font-semibold" style={{ color: role === value ? 'var(--brand)' : 'var(--t1)' }}>
                      {label}
                    </p>
                    <p className="text-[10px] leading-tight" style={{ color: 'var(--t3)' }}>{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleInvite}
                disabled={adding || !email.trim()}
                className="btn-primary"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Gerar link de convite
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de membros */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <div
            className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }}
          />
        </div>
      ) : members.length === 0 ? (
        <div
          className="rounded-2xl py-12 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <UserPlus className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--border)' }} />
          <p className="text-[14px] font-medium" style={{ color: 'var(--t1)' }}>Nenhum colaborador ainda</p>
          <p className="text-[12px] mt-1" style={{ color: 'var(--t3)' }}>
            Adicione colaboradores para eles acessarem o sistema
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map(member => {
            const info = roleInfo(member.role)
            const RoleIcon = info?.icon ?? Eye
            return (
              <div
                key={member.id}
                className="rounded-xl px-5 py-4"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0"
                    style={{ background: 'var(--brand-s-solid)', color: 'var(--brand)' }}
                  >
                    {(member.name || member.email)[0].toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--t1)' }}>
                        {member.name || member.email}
                      </p>
                      {member.status === 'pending' ? (
                        <span
                          className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-full"
                          style={{ background: 'rgba(245,158,11,.1)', color: '#D97706' }}
                        >
                          <Clock className="w-2.5 h-2.5" /> pendente
                        </span>
                      ) : (
                        <span
                          className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-full"
                          style={{ background: 'rgba(16,185,129,.1)', color: '#059669' }}
                        >
                          <CheckCircle className="w-2.5 h-2.5" /> ativo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[11px] truncate" style={{ color: 'var(--t3)' }}>{member.email}</p>
                      <span style={{ color: 'var(--border)' }}>·</span>
                      <div className="flex items-center gap-1">
                        <RoleIcon className="w-3 h-3" style={{ color: 'var(--t3)' }} />
                        <span className="text-[11px]" style={{ color: 'var(--t3)' }}>{info?.label}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {member.status === 'pending' && member.invite_link && (
                      <button
                        onClick={() => copyLink(member.invite_link!)}
                        className="flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-lg transition-colors"
                        style={{ border: '1px solid var(--border)', color: 'var(--brand)' }}
                      >
                        <Copy className="w-3.5 h-3.5" /> Copiar link
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(member.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                      style={{ color: 'var(--t3)' }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.color = '#EF4444'
                        ;(e.currentTarget as HTMLElement).style.background = '#FEF2F2'
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.color = 'var(--t3)'
                        ;(e.currentTarget as HTMLElement).style.background = ''
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Info */}
      <div
        className="rounded-xl p-4 space-y-1.5"
        style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
      >
        <p className="text-[13px] font-semibold" style={{ color: 'var(--t1)' }}>Como funciona?</p>
        {[
          '1. Adicione o e-mail do colaborador e escolha o nível de acesso',
          '2. Copie o link gerado e envie para ele pelo WhatsApp ou e-mail',
          '3. O colaborador clica no link, cria uma senha e já entra no sistema',
          '4. Você pode remover o acesso a qualquer momento',
        ].map((s, i) => (
          <p key={i} className="text-[12px]" style={{ color: 'var(--t2)' }}>{s}</p>
        ))}
      </div>
    </div>
  )
}
