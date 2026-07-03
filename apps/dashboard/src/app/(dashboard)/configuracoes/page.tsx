'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  User, Bell, CreditCard, Users, Shield,
  KeyRound, Database, LogOut, Search, Globe, Upload,
  Mail, Copy, Trash2, Eye, EyeOff,
  ChevronRight, Plus, Loader2,
} from 'lucide-react'
import { Card, SectionTitle, Btn, Badge, Avatar } from '@/components/ui/finance-primitives'
import { cn } from '@/lib/utils'
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
        <label className="text-[11.5px] font-medium text-3">{label}</label>
        {hint && <span className="text-[10.5px] text-3">{hint}</span>}
      </div>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange?.(e.target.value)}
        className="w-full h-9 px-3 rounded-lg text-[13px] text-1 outline-none transition focus:ring-2 focus:ring-[var(--brand-ring)]"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--line-2)' }}
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
      <label className="text-[11.5px] font-medium mb-1.5 block text-3">{label}</label>
      <select
        value={value}
        onChange={e => onChange?.(e.target.value)}
        className="w-full h-9 px-3 rounded-lg text-[13px] text-1 outline-none transition focus:ring-2 focus:ring-[var(--brand-ring)]"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--line-2)' }}
      >
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  )
}

// ── ComingSoon ────────────────────────────────────────────────────────────────

function ComingSoon({ title }: { title: string }) {
  return (
    <Card>
      <div className="py-10 text-center">
        <p className="text-[13px] font-medium" style={{ color: 'var(--t1)' }}>{title}</p>
        <p className="text-[12px] mt-1" style={{ color: 'var(--t3)' }}>Em desenvolvimento — em breve por aqui.</p>
      </div>
    </Card>
  )
}

// ── Nav ──────────────────────────────────────────────────────────────────────

const NAV = [
  { id: 'perfil',       label: 'Perfil',              icon: User },
  { id: 'notificacoes', label: 'Notificações',        icon: Bell },
  { id: 'faturamento',  label: 'Faturamento',         icon: CreditCard },
  { id: 'equipe',       label: 'Equipe',              icon: Users },
  { id: 'seguranca',    label: 'Segurança',           icon: Shield },
  { id: 'api',          label: 'API & Webhooks',      icon: KeyRound },
  { id: 'dados',        label: 'Dados & Privacidade', icon: Database },
] as const

type SectionId = (typeof NAV)[number]['id']

// ── PerfilSection ─────────────────────────────────────────────────────────────

function PerfilSection() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get('/api/nutritionists/profile').then(r => r.data),
  })

  const [form, setForm] = useState({ name: '', phone: '', specialty: '', bio: '' })

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
        <div className="flex items-center gap-4 mb-5 pb-5" style={{ borderBottom: '1px solid var(--line-1)' }}>
          <Avatar name={form.name || 'U'} color="green" size={56} />
          <div className="flex-1">
            <div className="text-[13px] font-medium text-1">{form.name}</div>
            <div className="text-[12px] text-3">Owner · {profile?.email}</div>
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
          <label className="text-[11.5px] font-medium mb-1.5 block text-3">Bio</label>
          <textarea
            value={form.bio}
            onChange={e => f('bio')(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg text-[13px] text-1 outline-none resize-none focus:ring-2 focus:ring-[var(--brand-ring)] transition"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--line-2)' }}
          />
        </div>
      </Card>
    </>
  )
}

// ── NotificacoesSection ───────────────────────────────────────────────────────

function NotificacoesSection() {
  return <ComingSoon title="Notificações" />
}

// ── FaturamentoSection ────────────────────────────────────────────────────────

function FaturamentoSection() {
  return <ComingSoon title="Faturamento" />
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
          <div className="mb-4 p-4 rounded-lg space-y-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--line-1)' }}>
            <div className="text-[13px] font-medium text-1">Novo convite</div>
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
          <div className="py-6 text-center text-[13px] text-3">Carregando…</div>
        ) : (
          <div className="space-y-1">
            {active.map((m: any, i: number) => (
              <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg transition hover:bg-[var(--bg-surface)]">
                <Avatar name={m.name || m.email} color={colors[i % colors.length]} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate text-1">{m.name || m.email}</div>
                  <div className="text-[12px] truncate text-3">{m.email}</div>
                </div>
                <Badge variant={roleVariant[m.role] ?? 'default'}>{roleLabel[m.role] ?? m.role}</Badge>
                {m.role !== 'owner' && (
                  <Btn size="sm" variant="ghost" onClick={() => remove.mutate(m.id)}><Trash2 className="size-3" /></Btn>
                )}
              </div>
            ))}
            {active.length === 0 && (
              <div className="py-4 text-center text-[13px] text-3">Nenhum membro ainda.</div>
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
                <div key={m.id} className="p-3 rounded-lg space-y-2" style={{ background: 'var(--bg-surface)', border: '1px solid var(--line-1)' }}>
                  <div className="flex items-center gap-3">
                    <Mail className="size-4 flex-shrink-0 text-3" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-1">{m.email}</div>
                      <div className="text-[11.5px] text-3">Convidado como {roleLabel[m.role] ?? m.role} · Aguardando aceite</div>
                    </div>
                    <Btn size="sm" variant="ghost" onClick={() => remove.mutate(m.id)}><Trash2 className="size-3" /></Btn>
                  </div>
                  <div className="flex items-center gap-2 pl-7">
                    <div className="flex-1 truncate text-[11.5px] px-2.5 py-1.5 rounded-lg font-mono text-3" style={{ background: 'var(--bg-base)', border: '1px solid var(--line-1)' }}>
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
            <label className="text-[11.5px] font-medium mb-1.5 block text-3">Senha atual</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={form.current_password}
                onChange={e => setForm(p => ({ ...p, current_password: e.target.value }))}
                className="w-full h-9 px-3 pr-9 rounded-lg text-[13px] text-1 outline-none focus:ring-2 focus:ring-[var(--brand-ring)] transition"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--line-2)' }}
              />
              <button onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 transition hover:opacity-80 text-3">
                {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-[11.5px] font-medium mb-1.5 block text-3">Nova senha</label>
            <input
              type="password"
              value={form.new_password}
              onChange={e => setForm(p => ({ ...p, new_password: e.target.value }))}
              className="w-full h-9 px-3 rounded-lg text-[13px] text-1 outline-none focus:ring-2 focus:ring-[var(--brand-ring)] transition"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--line-2)' }}
            />
            {form.new_password && form.new_password.length < 8 && (
              <p className="text-[11px] mt-1" style={{ color: 'var(--danger)' }}>Mínimo 8 caracteres</p>
            )}
          </div>
          <div>
            <label className="text-[11.5px] font-medium mb-1.5 block text-3">Confirmar nova senha</label>
            <input
              type="password"
              value={form.confirm}
              onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
              className="w-full h-9 px-3 rounded-lg text-[13px] text-1 outline-none focus:ring-2 focus:ring-[var(--brand-ring)] transition"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--line-2)' }}
            />
            {form.confirm && form.confirm !== form.new_password && (
              <p className="text-[11px] mt-1" style={{ color: 'var(--danger)' }}>As senhas não coincidem</p>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle title="Autenticação em dois fatores" hint="Em breve." action={<Badge variant="default">Em breve</Badge>} />
        <div className="py-4 text-[13px] text-3">Autenticação de dois fatores será disponibilizada em breve.</div>
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
      <ComingSoon title="Chaves de API" />

      <Card>
        <SectionTitle
          title="Webhooks"
          hint="Receba eventos em tempo real nos seus endpoints."
          action={<Btn size="sm" variant="secondary" onClick={() => setShowNew(true)}><Plus className="size-3" /> Novo endpoint</Btn>}
        />

        {showNew && (
          <div className="mb-4 p-4 rounded-lg space-y-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--line-1)' }}>
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
          <div className="py-4 text-center text-[13px] text-3">Carregando…</div>
        ) : list.length === 0 ? (
          <div className="py-4 text-center text-[13px] text-3">Nenhum webhook configurado.</div>
        ) : (
          <div className="space-y-2">
            {list.map((w: any) => (
              <div key={w.id} className="p-3 rounded-lg flex items-center gap-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--line-1)' }}>
                <Globe className="size-4 text-3 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-mono truncate text-1">{w.url}</div>
                  <div className="text-[11.5px] truncate text-3">Eventos: {Array.isArray(w.events) ? w.events.join(', ') : w.events ?? '*'}</div>
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
  return <ComingSoon title="Dados & Privacidade" />
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ConfiguracoesPage() {
  const [section, setSection] = useState<SectionId>('perfil')
  const { logout } = useAuth()

  return (
    <div className="mx-auto max-w-[1180px] px-6 py-6">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-1">Configurações</h1>
        <p className="mt-1 text-[13px] text-3">Workspace · Frame System</p>
      </div>

      <div className="grid gap-8" style={{ gridTemplateColumns: '220px minmax(0,1fr)' }}>
        <aside className="space-y-4 sticky top-4 self-start">
          <div className="relative">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-3" />
            <input
              placeholder="Buscar nas configurações…"
              className="w-full h-8 pl-8 pr-2 rounded-lg text-[12px] text-1 outline-none focus:ring-2 focus:ring-[var(--brand-ring)] transition"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--line-2)' }}
            />
          </div>
          <nav className="space-y-0.5">
            {NAV.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setSection(id)}
                className={cn(
                  'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors',
                  section === id
                    ? 'bg-[var(--brand-soft)] text-[var(--brand)]'
                    : 'text-2 hover:bg-[var(--bg-surface)] hover:text-1',
                )}
              >
                <Icon className="size-3.5 shrink-0" />
                <span className="flex-1 text-left">{label}</span>
                {section === id && <ChevronRight className="size-3 shrink-0" />}
              </button>
            ))}
          </nav>
          <div className="pt-3" style={{ borderTop: '1px solid var(--line-1)' }}>
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors hover:bg-[var(--bg-surface)]"
              style={{ color: 'var(--danger)' }}
            >
              <LogOut className="size-3.5 shrink-0" /> Sair da conta
            </button>
          </div>
        </aside>

        <div className="space-y-4 min-w-0">
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
