'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { UserPlus, Copy, Trash2, Clock, CheckCircle, Shield, Eye, Pencil, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import { Card, Badge, Btn, Avatar, SectionTitle } from '@/components/ui/finance-primitives'

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
  const activeMembers  = members.filter(m => m.status === 'active')
  const pendingMembers = members.filter(m => m.status === 'pending')

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-[22px] tracking-tight" style={{ color: 'var(--t1)' }}>Equipe</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--t3)' }}>
            Adicione colaboradores e defina o que cada um pode fazer
          </p>
        </div>
        <Btn onClick={() => setShowForm(v => !v)} className="flex-shrink-0">
          <UserPlus className="w-4 h-4" />
          Adicionar
        </Btn>
      </div>

      {/* Form novo membro */}
      {showForm && (
        <Card>
          <p className="text-[14px] font-semibold mb-4" style={{ color: 'var(--t1)' }}>Novo colaborador</p>
          <div className="space-y-4">
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
              <Btn onClick={handleInvite} disabled={adding || !email.trim()}>
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Gerar link de convite
              </Btn>
              <Btn variant="secondary" onClick={() => setShowForm(false)}>
                Cancelar
              </Btn>
            </div>
          </div>
        </Card>
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
        <Card className="py-12 text-center">
          <UserPlus className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--border)' }} />
          <p className="text-[14px] font-medium" style={{ color: 'var(--t1)' }}>Nenhum colaborador ainda</p>
          <p className="text-[12px] mt-1" style={{ color: 'var(--t3)' }}>
            Adicione colaboradores para eles acessarem o sistema
          </p>
        </Card>
      ) : (
        <>
          {/* Membros ativos */}
          {activeMembers.length > 0 && (
            <div className="space-y-2">
              <SectionTitle title={`Membros (${activeMembers.length})`} />
              {activeMembers.map(member => {
                const info = roleInfo(member.role)
                const RoleIcon = info?.icon ?? Eye
                return (
                  <Card key={member.id} className="px-5 py-4">
                    <div className="flex items-center gap-4">
                      <Avatar name={member.name || member.email} color="green" size={36} />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--t1)' }}>
                            {member.name || member.email}
                          </p>
                          <Badge variant="success"><CheckCircle className="w-2.5 h-2.5" /> ativo</Badge>
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
                        <Btn variant="ghost" size="sm" onClick={() => handleRemove(member.id)} className="!px-2">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Btn>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Convites pendentes */}
          {pendingMembers.length > 0 && (
            <div className="space-y-2">
              <SectionTitle title="Convites pendentes" />
              {pendingMembers.map(member => {
                const info = roleInfo(member.role)
                const RoleIcon = info?.icon ?? Eye
                return (
                  <Card key={member.id} className="px-5 py-4">
                    <div className="flex items-center gap-4">
                      <Avatar name={member.name || member.email} color="green" size={36} />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--t1)' }}>
                            {member.name || member.email}
                          </p>
                          <Badge variant="warning"><Clock className="w-2.5 h-2.5" /> pendente</Badge>
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
                        {member.invite_link && (
                          <Btn variant="outline" size="sm" onClick={() => copyLink(member.invite_link!)}>
                            <Copy className="w-3.5 h-3.5" /> Copiar link
                          </Btn>
                        )}
                        <Btn variant="ghost" size="sm" onClick={() => handleRemove(member.id)} className="!px-2">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Btn>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Info */}
      <Card className="space-y-1.5">
        <p className="text-[13px] font-semibold" style={{ color: 'var(--t1)' }}>Como funciona?</p>
        {[
          '1. Adicione o e-mail do colaborador e escolha o nível de acesso',
          '2. Copie o link gerado e envie para ele pelo WhatsApp ou e-mail',
          '3. O colaborador clica no link, cria uma senha e já entra no sistema',
          '4. Você pode remover o acesso a qualquer momento',
        ].map((s, i) => (
          <p key={i} className="text-[12px]" style={{ color: 'var(--t2)' }}>{s}</p>
        ))}
      </Card>
    </div>
  )
}
