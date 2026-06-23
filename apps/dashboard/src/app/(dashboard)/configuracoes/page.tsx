'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Check, Building2, User, Bell, CreditCard, Users, Shield,
  KeyRound, Database, LogOut, Search, Globe, Upload,
  Smartphone, Mail, MessageSquare, Copy, Trash2, Eye, EyeOff,
  Download, AlertTriangle, ChevronRight, Plus, Loader2,
} from 'lucide-react'
import { Card, SectionTitle, Btn, Badge, Avatar } from '@/components/ui/finance-primitives'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'

// ── Helper components ────────────────────────────────────────────────────────

function Field({
  label, value, hint, type = 'text', onChange,
}: {
  label: string; value?: string; hint?: string; type?: string
  onChange?: (v: string) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11.5px] font-medium" style={{ color: 'var(--t3)' }}>{label}</label>
        {hint && <span className="text-[10.5px]" style={{ color: 'var(--t3)' }}>{hint}</span>}
      </div>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange?.(e.target.value)}
        className="w-full h-9 px-3 rounded-lg text-[13px] outline-none transition focus:ring-2"
        style={{ background: 'var(--raised)', color: 'var(--t1)', border: '1px solid var(--border)' }}
      />
    </div>
  )
}

function SelectField({ label, value, options, onChange }: {
  label: string; value: string; options: string[]
  onChange?: (v: string) => void
}) {
  return (
    <div>
      <label className="text-[11.5px] font-medium mb-1.5 block" style={{ color: 'var(--t3)' }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange?.(e.target.value)}
        className="w-full h-9 px-3 rounded-lg text-[13px] outline-none transition focus:ring-2"
        style={{ background: 'var(--raised)', color: 'var(--t1)', border: '1px solid var(--border)' }}
      >
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange?: (v: boolean) => void }) {
  const [v, setV] = useState(on)
  return (
    <button
      onClick={() => { setV(!v); onChange?.(!v) }}
      className="shrink-0 w-9 h-5 rounded-full relative transition-colors"
      style={{ background: v ? 'var(--brand)' : 'var(--border)' }}
    >
      <span className="absolute top-0.5 size-4 rounded-full bg-white shadow transition-all"
        style={{ left: v ? '18px' : '2px' }} />
    </button>
  )
}

function Row({ title, desc, on, right }: { title: string; desc?: string; on?: boolean; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="min-w-0">
        <div className="text-[13px] font-medium" style={{ color: 'var(--t1)' }}>{title}</div>
        {desc && <div className="text-[12px] mt-0.5" style={{ color: 'var(--t3)' }}>{desc}</div>}
      </div>
      {right ?? (on !== undefined && <Toggle on={on} />)}
    </div>
  )
}

// ── Nav ──────────────────────────────────────────────────────────────────────

const NAV = [
  { id: 'workspace',    label: 'Workspace',          icon: Building2 },
  { id: 'perfil',       label: 'Perfil',              icon: User },
  { id: 'notificacoes', label: 'Notificações',        icon: Bell },
  { id: 'faturamento',  label: 'Faturamento',         icon: CreditCard },
  { id: 'equipe',       label: 'Equipe',              icon: Users },
  { id: 'seguranca',    label: 'Segurança',           icon: Shield },
  { id: 'api',          label: 'API & Webhooks',      icon: KeyRound },
  { id: 'dados',        label: 'Dados & Privacidade', icon: Database },
] as const

type SectionId = (typeof NAV)[number]['id']

// ── WorkspaceSection ─────────────────────────────────────────────────────────

function WorkspaceSection() {
  const qc = useQueryClient()
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get('/api/nutritionists/profile').then(r => r.data),
  })

  const [name, setName] = useState('')
  const [specialty, setSpecialty] = useState('')

  // Sync local state when data loads
  useState(() => {
    if (profile) { setName(profile.name ?? ''); setSpecialty(profile.specialty ?? '') }
  })

  const save = useMutation({
    mutationFn: () => api.put('/api/nutritionists/profile', { name, specialty }),
    onSuccess: () => { toast.success('Salvo!'); qc.invalidateQueries({ queryKey: ['profile'] }) },
    onError: () => toast.error('Erro ao salvar'),
  })

  if (isLoading) return <Card><div className="text-[13px] py-8 text-center" style={{ color: 'var(--t3)' }}>Carregando…</div></Card>

  const displayName = name || profile?.name || ''
  const displaySpecialty = specialty || profile?.specialty || ''

  return (
    <>
      <Card>
        <SectionTitle
          title="Identidade do workspace"
          hint="Como sua clínica aparece para pacientes e equipe."
          action={
            <Btn size="sm" variant="primary" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="size-3 animate-spin" /> : null} Salvar
            </Btn>
          }
        />
        <div className="flex items-start gap-5 mb-5 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="size-16 rounded-xl grid place-items-center text-white font-bold text-[22px] shadow-lg"
            style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-soft))' }}>
            {(displayName[0] || 'N').toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-medium mb-1" style={{ color: 'var(--t1)' }}>Logo do workspace</div>
            <div className="text-[12px] mb-2" style={{ color: 'var(--t3)' }}>PNG ou SVG, mínimo 256×256px.</div>
            <div className="flex gap-2">
              <Btn size="sm" variant="secondary"><Upload className="size-3" /> Enviar logo</Btn>
              <Btn size="sm" variant="ghost">Remover</Btn>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nome da clínica" value={displayName} onChange={setName} />
          <Field label="Especialidade" value={displaySpecialty} onChange={setSpecialty} />
          <Field label="E-mail" value={profile?.email ?? ''} hint="Não editável" type="email" />
          <SelectField label="Fuso horário" value="América/São Paulo (GMT-3)" options={['América/São Paulo (GMT-3)', 'América/Manaus (GMT-4)', 'América/Belém (GMT-3)']} />
          <SelectField label="Idioma padrão" value="Português (BR)" options={['Português (BR)', 'English (US)', 'Español']} />
          <SelectField label="Moeda" value="Real (BRL)" options={['Real (BRL)', 'US Dollar (USD)', 'Euro (EUR)']} />
        </div>
      </Card>

      <Card>
        <SectionTitle title="Zona de perigo" hint="Ações irreversíveis no workspace." />
        <div className="rounded-lg p-4 flex items-center justify-between gap-4"
          style={{ border: '1px solid rgba(255,92,92,0.2)', background: 'rgba(255,92,92,0.04)' }}>
          <div className="flex gap-3">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" style={{ color: '#FF5C5C' }} />
            <div>
              <div className="text-[13px] font-medium" style={{ color: 'var(--t1)' }}>Excluir workspace</div>
              <div className="text-[12px]" style={{ color: 'var(--t3)' }}>Remove todos os dados, conversas e pacientes permanentemente.</div>
            </div>
          </div>
          <Btn size="sm" variant="danger">Excluir</Btn>
        </div>
      </Card>
    </>
  )
}

// ── PerfilSection ─────────────────────────────────────────────────────────────

function PerfilSection() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get('/api/nutritionists/profile').then(r => r.data),
  })

  const [form, setForm] = useState({ name: '', phone: '', specialty: '', bio: '' })

  // Sync once data loads
  const [synced, setSynced] = useState(false)
  if (profile && !synced) {
    setForm({ name: profile.name ?? '', phone: profile.phone ?? '', specialty: profile.specialty ?? '', bio: profile.bio ?? '' })
    setSynced(true)
  }

  const save = useMutation({
    mutationFn: () => api.put('/api/nutritionists/profile', form),
    onSuccess: () => { toast.success('Perfil atualizado!'); qc.invalidateQueries({ queryKey: ['profile'] }) },
    onError: () => toast.error('Erro ao salvar perfil'),
  })

  const f = (field: keyof typeof form) => (v: string) => setForm(prev => ({ ...prev, [field]: v }))

  if (isLoading) return <Card><div className="text-[13px] py-8 text-center" style={{ color: 'var(--t3)' }}>Carregando…</div></Card>

  return (
    <>
      <Card>
        <SectionTitle
          title="Perfil pessoal"
          hint="Suas informações como usuário do Frame."
          action={
            <Btn size="sm" variant="primary" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="size-3 animate-spin" /> : null} Salvar
            </Btn>
          }
        />
        <div className="flex items-center gap-4 mb-5 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <Avatar name={form.name || 'U'} color="green" size={56} />
          <div className="flex-1">
            <div className="text-[13px] font-medium" style={{ color: 'var(--t1)' }}>{form.name}</div>
            <div className="text-[12px]" style={{ color: 'var(--t3)' }}>Owner · {profile?.email}</div>
          </div>
          <Btn size="sm" variant="secondary"><Upload className="size-3" /> Alterar foto</Btn>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nome completo" value={form.name} onChange={f('name')} />
          <Field label="E-mail" value={profile?.email ?? ''} hint="Não editável" type="email" />
          <Field label="Telefone" value={form.phone} onChange={f('phone')} />
          <Field label="Especialidade" value={form.specialty} onChange={f('specialty')} />
        </div>
        <div className="mt-4">
          <label className="text-[11.5px] font-medium mb-1.5 block" style={{ color: 'var(--t3)' }}>Bio</label>
          <textarea
            value={form.bio}
            onChange={e => f('bio')(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg text-[13px] outline-none resize-none focus:ring-2 transition"
            style={{ background: 'var(--raised)', color: 'var(--t1)', border: '1px solid var(--border)' }}
          />
        </div>
      </Card>
    </>
  )
}

// ── NotificacoesSection ───────────────────────────────────────────────────────

function NotificacoesSection() {
  return (
    <>
      <Card>
        <SectionTitle title="Canais" hint="Onde você quer ser notificado." />
        <Row title="E-mail" desc="Notificações por e-mail" right={<div className="flex items-center gap-2"><Mail className="size-3.5" style={{ color: 'var(--t3)' }} /><Toggle on={true} /></div>} />
        <Row title="Push no navegador" desc="Notificações em tempo real" right={<div className="flex items-center gap-2"><Bell className="size-3.5" style={{ color: 'var(--t3)' }} /><Toggle on={true} /></div>} />
        <Row title="SMS" desc="Apenas para urgências (custo adicional)" right={<div className="flex items-center gap-2"><Smartphone className="size-3.5" style={{ color: 'var(--t3)' }} /><Toggle on={false} /></div>} />
        <Row title="WhatsApp interno" desc="Resumo diário via WhatsApp" right={<div className="flex items-center gap-2"><MessageSquare className="size-3.5" style={{ color: 'var(--t3)' }} /><Toggle on={true} /></div>} />
      </Card>

      <Card>
        <SectionTitle title="Eventos" hint="Escolha por quais eventos ser notificado." />
        <Row title="Nova conversa" desc="Quando um paciente inicia uma conversa" on={true} />
        <Row title="Agendamento confirmado" desc="Paciente confirma horário" on={true} />
        <Row title="Agendamento cancelado" desc="Paciente cancela ou remarca" on={true} />
        <Row title="Frame AI sugere resposta" desc="Quando a IA sugere uma ação relevante" on={false} />
        <Row title="Relatório semanal" desc="Resumo de performance toda segunda" on={true} />
      </Card>

      <Card>
        <SectionTitle title="Horário silencioso" hint="Não receber notificações nesse período." />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Início" value="22:00" />
          <Field label="Fim" value="07:00" />
        </div>
      </Card>
    </>
  )
}

// ── FaturamentoSection ────────────────────────────────────────────────────────

function FaturamentoSection() {
  return (
    <>
      <Card>
        <SectionTitle title="Plano atual" action={<Badge variant="success">Ativo</Badge>} />
        <div className="rounded-xl p-5" style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand-ring)' }}>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider font-semibold mb-1" style={{ color: 'var(--brand)' }}>Frame Growth</div>
              <div className="text-[28px] font-semibold tracking-tight tabular-nums" style={{ color: 'var(--t1)' }}>
                R$ 297<span className="text-[14px] font-normal" style={{ color: 'var(--t3)' }}>/mês</span>
              </div>
              <ul className="text-[12.5px] mt-3 space-y-1" style={{ color: 'var(--t2)' }}>
                <li className="flex items-center gap-1.5"><Check className="size-3" style={{ color: 'var(--brand)' }} /> Pacientes ilimitados</li>
                <li className="flex items-center gap-1.5"><Check className="size-3" style={{ color: 'var(--brand)' }} /> Frame AI premium · 10k mensagens/mês</li>
                <li className="flex items-center gap-1.5"><Check className="size-3" style={{ color: 'var(--brand)' }} /> 5 usuários incluídos</li>
              </ul>
            </div>
            <Btn variant="primary">Fazer upgrade</Btn>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle title="Histórico de faturas" hint="Integração com gateway de pagamento em breve." />
        <div className="py-6 text-center text-[13px]" style={{ color: 'var(--t3)' }}>
          Nenhuma fatura disponível ainda.
        </div>
      </Card>
    </>
  )
}

// ── EquipeSection ─────────────────────────────────────────────────────────────

function EquipeSection() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['team'],
    queryFn: () => api.get('/api/team').then(r => r.data),
  })

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'receptionist' | 'viewer'>('receptionist')
  const [showInvite, setShowInvite] = useState(false)

  const invite = useMutation({
    mutationFn: () => api.post('/api/team/invite', { email: inviteEmail, role: inviteRole }),
    onSuccess: () => {
      toast.success('Convite enviado!')
      setInviteEmail(''); setShowInvite(false)
      qc.invalidateQueries({ queryKey: ['team'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Erro ao convidar'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/team/${id}`),
    onSuccess: () => { toast.success('Membro removido'); qc.invalidateQueries({ queryKey: ['team'] }) },
    onError: () => toast.error('Erro ao remover'),
  })

  const members: any[] = data?.members ?? []
  const active = members.filter((m: any) => m.status !== 'pending')
  const pending = members.filter((m: any) => m.status === 'pending')

  const roleLabel: Record<string, string> = { owner: 'Owner', admin: 'Admin', receptionist: 'Recepcionista', viewer: 'Visualizador' }
  const roleVariant: Record<string, any> = { owner: 'success', admin: 'info', receptionist: 'default', viewer: 'default' }
  const colors = ['green', 'blue', 'purple', 'orange'] as const

  return (
    <>
      <Card>
        <SectionTitle
          title="Membros"
          hint={`${active.length} membro(s) ativo(s)`}
          action={<Btn size="sm" variant="primary" onClick={() => setShowInvite(true)}><Plus className="size-3" /> Convidar</Btn>}
        />

        {showInvite && (
          <div className="mb-4 p-4 rounded-lg space-y-3" style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
            <div className="text-[13px] font-medium" style={{ color: 'var(--t1)' }}>Novo convite</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="E-mail" value={inviteEmail} onChange={setInviteEmail} type="email" />
              <SelectField
                label="Papel"
                value={inviteRole}
                options={['receptionist', 'admin', 'viewer']}
                onChange={v => setInviteRole(v as any)}
              />
            </div>
            <div className="flex gap-2">
              <Btn size="sm" variant="primary" onClick={() => invite.mutate()} disabled={!inviteEmail || invite.isPending}>
                {invite.isPending ? <Loader2 className="size-3 animate-spin" /> : null} Enviar convite
              </Btn>
              <Btn size="sm" variant="ghost" onClick={() => setShowInvite(false)}>Cancelar</Btn>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="py-6 text-center text-[13px]" style={{ color: 'var(--t3)' }}>Carregando…</div>
        ) : (
          <div className="space-y-1">
            {active.map((m: any, i: number) => (
              <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg transition hover:opacity-80">
                <Avatar name={m.name || m.email} color={colors[i % colors.length]} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate" style={{ color: 'var(--t1)' }}>{m.name || m.email}</div>
                  <div className="text-[12px] truncate" style={{ color: 'var(--t3)' }}>{m.email}</div>
                </div>
                <Badge variant={roleVariant[m.role] ?? 'default'}>{roleLabel[m.role] ?? m.role}</Badge>
                {m.role !== 'owner' && (
                  <Btn size="sm" variant="ghost" onClick={() => remove.mutate(m.id)}><Trash2 className="size-3" /></Btn>
                )}
              </div>
            ))}
            {active.length === 0 && (
              <div className="py-4 text-center text-[13px]" style={{ color: 'var(--t3)' }}>Nenhum membro ainda.</div>
            )}
          </div>
        )}
      </Card>

      {pending.length > 0 && (
        <Card>
          <SectionTitle title="Convites pendentes" />
          <div className="space-y-2">
            {pending.map((m: any) => {
              const link = m.invite_link || `${window.location.origin}/convite/${m.id}`
              return (
                <div key={m.id} className="p-3 rounded-lg space-y-2" style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-3">
                    <Mail className="size-4 flex-shrink-0" style={{ color: 'var(--t3)' }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium" style={{ color: 'var(--t1)' }}>{m.email}</div>
                      <div className="text-[11.5px]" style={{ color: 'var(--t3)' }}>Convidado como {roleLabel[m.role] ?? m.role} · Aguardando aceite</div>
                    </div>
                    <Btn size="sm" variant="ghost" onClick={() => remove.mutate(m.id)}><Trash2 className="size-3" /></Btn>
                  </div>
                  <div className="flex items-center gap-2 pl-7">
                    <div className="flex-1 truncate text-[11.5px] px-2.5 py-1.5 rounded-lg font-mono" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t3)' }}>
                      {link}
                    </div>
                    <Btn size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(link); toast.success('Link copiado!') }}>
                      <Copy className="size-3" /> Copiar
                    </Btn>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </>
  )
}

// ── SegurancaSection ──────────────────────────────────────────────────────────

function SegurancaSection() {
  const [show, setShow] = useState(false)
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' })

  const save = useMutation({
    mutationFn: () => api.post('/api/nutritionists/change-password', {
      current_password: form.current_password,
      new_password: form.new_password,
    }),
    onSuccess: () => {
      toast.success('Senha atualizada!')
      setForm({ current_password: '', new_password: '', confirm: '' })
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Erro ao atualizar senha'),
  })

  const canSave = form.current_password && form.new_password.length >= 8 && form.new_password === form.confirm

  return (
    <>
      <Card>
        <SectionTitle
          title="Senha"
          hint="Recomendamos atualizar a cada 90 dias."
          action={
            <Btn size="sm" variant="primary" onClick={() => save.mutate()} disabled={!canSave || save.isPending}>
              {save.isPending ? <Loader2 className="size-3 animate-spin" /> : null} Atualizar
            </Btn>
          }
        />
        <div className="grid grid-cols-1 gap-4 max-w-md">
          <div>
            <label className="text-[11.5px] font-medium mb-1.5 block" style={{ color: 'var(--t3)' }}>Senha atual</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={form.current_password}
                onChange={e => setForm(p => ({ ...p, current_password: e.target.value }))}
                className="w-full h-9 px-3 pr-9 rounded-lg text-[13px] outline-none focus:ring-2 transition"
                style={{ background: 'var(--raised)', color: 'var(--t1)', border: '1px solid var(--border)' }}
              />
              <button onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 transition hover:opacity-80" style={{ color: 'var(--t3)' }}>
                {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-[11.5px] font-medium mb-1.5 block" style={{ color: 'var(--t3)' }}>Nova senha</label>
            <input
              type="password"
              value={form.new_password}
              onChange={e => setForm(p => ({ ...p, new_password: e.target.value }))}
              className="w-full h-9 px-3 rounded-lg text-[13px] outline-none focus:ring-2 transition"
              style={{ background: 'var(--raised)', color: 'var(--t1)', border: '1px solid var(--border)' }}
            />
            {form.new_password && form.new_password.length < 8 && (
              <p className="text-[11px] mt-1" style={{ color: '#FF5C5C' }}>Mínimo 8 caracteres</p>
            )}
          </div>
          <div>
            <label className="text-[11.5px] font-medium mb-1.5 block" style={{ color: 'var(--t3)' }}>Confirmar nova senha</label>
            <input
              type="password"
              value={form.confirm}
              onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
              className="w-full h-9 px-3 rounded-lg text-[13px] outline-none focus:ring-2 transition"
              style={{ background: 'var(--raised)', color: 'var(--t1)', border: '1px solid var(--border)' }}
            />
            {form.confirm && form.confirm !== form.new_password && (
              <p className="text-[11px] mt-1" style={{ color: '#FF5C5C' }}>As senhas não coincidem</p>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle title="Autenticação em dois fatores" hint="Em breve." action={<Badge variant="default">Em breve</Badge>} />
        <div className="py-4 text-[13px]" style={{ color: 'var(--t3)' }}>Autenticação de dois fatores será disponibilizada em breve.</div>
      </Card>
    </>
  )
}

// ── ApiSection ────────────────────────────────────────────────────────────────

function ApiSection() {
  const qc = useQueryClient()
  const { data: webhooks, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => api.get('/api/integrations').then(r => r.data),
  })

  const [showNew, setShowNew] = useState(false)
  const [newUrl, setNewUrl] = useState('')

  const create = useMutation({
    mutationFn: () => api.post('/api/integrations', { url: newUrl, events: ['*'] }),
    onSuccess: () => {
      toast.success('Webhook criado!')
      setNewUrl(''); setShowNew(false)
      qc.invalidateQueries({ queryKey: ['webhooks'] })
    },
    onError: () => toast.error('Erro ao criar webhook'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/integrations/${id}`),
    onSuccess: () => { toast.success('Removido'); qc.invalidateQueries({ queryKey: ['webhooks'] }) },
    onError: () => toast.error('Erro ao remover'),
  })

  const list: any[] = Array.isArray(webhooks) ? webhooks : (webhooks?.integrations ?? [])

  return (
    <>
      <Card>
        <SectionTitle title="Chaves de API" hint="Integração de chaves em breve." />
        <div className="py-4 text-[13px]" style={{ color: 'var(--t3)' }}>
          Gerenciamento de chaves de API será disponibilizado em breve.
        </div>
      </Card>

      <Card>
        <SectionTitle
          title="Webhooks"
          hint="Receba eventos em tempo real nos seus endpoints."
          action={<Btn size="sm" variant="secondary" onClick={() => setShowNew(true)}><Plus className="size-3" /> Novo endpoint</Btn>}
        />

        {showNew && (
          <div className="mb-4 p-4 rounded-lg space-y-3" style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
            <Field label="URL do endpoint" value={newUrl} onChange={setNewUrl} />
            <div className="flex gap-2">
              <Btn size="sm" variant="primary" onClick={() => create.mutate()} disabled={!newUrl || create.isPending}>
                {create.isPending ? <Loader2 className="size-3 animate-spin" /> : null} Criar
              </Btn>
              <Btn size="sm" variant="ghost" onClick={() => setShowNew(false)}>Cancelar</Btn>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="py-4 text-center text-[13px]" style={{ color: 'var(--t3)' }}>Carregando…</div>
        ) : list.length === 0 ? (
          <div className="py-4 text-center text-[13px]" style={{ color: 'var(--t3)' }}>Nenhum webhook configurado.</div>
        ) : (
          <div className="space-y-2">
            {list.map((w: any) => (
              <div key={w.id} className="p-3 rounded-lg flex items-center gap-3" style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
                <Globe className="size-4" style={{ color: 'var(--t3)' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-mono truncate" style={{ color: 'var(--t1)' }}>{w.url}</div>
                  <div className="text-[11.5px] truncate" style={{ color: 'var(--t3)' }}>Eventos: {Array.isArray(w.events) ? w.events.join(', ') : w.events ?? '*'}</div>
                </div>
                <Badge variant={w.last_status === 200 || !w.last_status ? 'success' : 'danger'}>
                  {w.last_status ? `${w.last_status}` : 'Novo'}
                </Badge>
                <Btn size="sm" variant="ghost" onClick={() => remove.mutate(w.id)}><Trash2 className="size-3" /></Btn>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  )
}

// ── DadosSection ──────────────────────────────────────────────────────────────

function DadosSection() {
  return (
    <>
      <Card>
        <SectionTitle
          title="Exportação de dados"
          hint="Receba todos os seus dados em um arquivo ZIP."
          action={<Btn size="sm" variant="secondary"><Download className="size-3" /> Solicitar export</Btn>}
        />
        <div className="text-[12.5px]" style={{ color: 'var(--t2)' }}>
          Exportação de dados será disponibilizada em breve.
        </div>
      </Card>

      <Card>
        <SectionTitle title="LGPD & Compliance" hint="Conformidade com regulamentações de dados." />
        <Row title="Anonimizar pacientes inativos" desc="Após 24 meses sem atividade" on={true} />
        <Row title="Consentimento explícito no opt-in" desc="Exigir aceite antes de enviar mensagens" on={true} />
        <Row title="Direito ao esquecimento automatizado" desc="Processa solicitações em até 15 dias" on={true} />
      </Card>

      <Card>
        <SectionTitle title="Excluir conta" />
        <div className="rounded-lg p-4 flex items-center justify-between gap-4"
          style={{ border: '1px solid rgba(255,92,92,0.2)', background: 'rgba(255,92,92,0.04)' }}>
          <div className="flex gap-3">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" style={{ color: '#FF5C5C' }} />
            <div>
              <div className="text-[13px] font-medium" style={{ color: 'var(--t1)' }}>Apagar permanentemente sua conta</div>
              <div className="text-[12px]" style={{ color: 'var(--t3)' }}>Esta ação não pode ser desfeita. Todos os seus dados pessoais serão removidos.</div>
            </div>
          </div>
          <Btn size="sm" variant="danger">Excluir conta</Btn>
        </div>
      </Card>
    </>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ConfiguracoesPage() {
  const [section, setSection] = useState<SectionId>('workspace')

  return (
    <div>
      <div className="flex items-center justify-between px-8 py-4"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--t1)' }}>Configurações</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--t3)' }}>Workspace · Frame System</p>
        </div>
      </div>

      <div className="px-6 py-6 max-w-[1180px] mx-auto grid gap-8" style={{ gridTemplateColumns: '240px minmax(0,1fr)' }}>
        <aside className="space-y-4 sticky top-4 self-start">
          <div className="relative">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--t3)' }} />
            <input
              placeholder="Buscar nas configurações…"
              className="w-full h-8 pl-8 pr-2 rounded-lg text-[12px] outline-none focus:ring-2 transition"
              style={{ background: 'var(--raised)', color: 'var(--t1)', border: '1px solid var(--border)' }}
            />
          </div>
          <nav className="space-y-0.5 text-[13px]">
            {NAV.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setSection(id)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-colors"
                style={{
                  background: section === id ? 'var(--raised)' : undefined,
                  color: section === id ? 'var(--t1)' : 'var(--t2)',
                }}
              >
                <Icon className="size-3.5" />
                <span className="flex-1 text-left">{label}</span>
                {section === id && <ChevronRight className="size-3" style={{ color: 'var(--t3)' }} />}
              </button>
            ))}
          </nav>
          <div className="pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] transition"
              style={{ color: '#FF5C5C' }}
            >
              <LogOut className="size-3.5" /> Sair da conta
            </button>
          </div>
        </aside>

        <div className="space-y-4 min-w-0">
          {section === 'workspace'    && <WorkspaceSection />}
          {section === 'perfil'       && <PerfilSection />}
          {section === 'notificacoes' && <NotificacoesSection />}
          {section === 'faturamento'  && <FaturamentoSection />}
          {section === 'equipe'       && <EquipeSection />}
          {section === 'seguranca'    && <SegurancaSection />}
          {section === 'api'          && <ApiSection />}
          {section === 'dados'        && <DadosSection />}
        </div>
      </div>
    </div>
  )
}
