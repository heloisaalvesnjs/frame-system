'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Loader2, Save, Shield, Eye, EyeOff, CheckCircle, Sun, Moon,
  Check, Plus, Upload, UserPlus, Copy, Trash2, Clock, Pencil,
} from 'lucide-react'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Avatar, Badge, Btn, Card, SectionTitle } from '@/components/ui/finance-primitives'
import { V4Avatar, V4Button, V4Card, V4CardPad, V4Page, V4Tag } from '@/components/v4/V4Primitives'

const SECTIONS = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'seguranca', label: 'Segurança' },
  { id: 'integracoes', label: 'Integrações' },
  { id: 'equipe', label: 'Equipe' },
] as const

type SectionId = typeof SECTIONS[number]['id']

export default function ConfiguracoesPage() {
  const [section, setSection] = useState<SectionId>('perfil')

  return (
    <V4Page
      eyebrow="Gestão da conta"
      title="Configurações"
      subtitle="Perfil, integrações, equipe e segurança."
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
        <V4Card className="h-max p-2">
          {SECTIONS.map(item => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={section === item.id
                ? 'mb-1 flex w-full rounded-[10px] bg-[var(--brand-s)] px-3 py-2 text-left text-[13px] font-medium text-[var(--brand)]'
                : 'mb-1 flex w-full rounded-[10px] px-3 py-2 text-left text-[13px] font-medium text-t2 hover:bg-[var(--raised)]'}
            >
              {item.label}
            </button>
          ))}
        </V4Card>

        <div>
          {section === 'perfil' && <PerfilSection />}
          {section === 'seguranca' && <SegurancaSection />}
          {section === 'integracoes' && <IntegracoesSection />}
          {section === 'equipe' && <EquipeSection />}
        </div>
      </div>
    </V4Page>
  )
}

// ═══════════════════════════════════════════════════════
// Perfil
// ═══════════════════════════════════════════════════════

const profileSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().optional(),
  specialty: z.string().optional(),
  bio: z.string().optional(),
})
type ProfileData = z.infer<typeof profileSchema>

function PerfilSection() {
  const { user, refreshUser } = useAuth()

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileData>({ resolver: zodResolver(profileSchema) })

  useEffect(() => {
    if (user) reset({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      specialty: user.specialty || '',
      bio: user.bio || '',
    })
  }, [user, reset])

  async function onSubmit(data: ProfileData) {
    try {
      await api.put('/api/nutritionists/profile', data)
      await refreshUser()
      toast.success('Perfil salvo!')
    } catch {
      toast.error('Erro ao salvar. Tente novamente.')
    }
  }

  return (
    <div className="space-y-4">
      <V4CardPad className="flex items-center gap-5">
        <Avatar name={user?.name || 'U'} color="green" size={64} />
        <div>
          <p className="text-[18px] font-bold tracking-tight leading-tight text-t1">{user?.name || '—'}</p>
          <p className="mt-1 text-[12px] font-mono text-t3">{user?.email}</p>
          {user?.specialty && (
            <span className="inline-block mt-2"><Badge variant="success">{user.specialty}</Badge></span>
          )}
        </div>
      </V4CardPad>

      <V4CardPad>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[14px] font-medium text-t1">Informações</p>
            <p className="mt-0.5 text-[12px] text-t3">Dados do seu perfil profissional</p>
          </div>
          {isDirty && <V4Tag tone="amber">Alterações pendentes</V4Tag>}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="field-label">Nome completo</label>
              <input {...register('name')} className="input" placeholder="Seu nome" />
              {errors.name && <p className="mt-1.5 text-[12px] text-[var(--danger)]">{errors.name.message}</p>}
            </div>
            <div>
              <label className="field-label">E-mail</label>
              <input {...register('email')} type="email" className="input" placeholder="voce@exemplo.com" />
              {errors.email && <p className="mt-1.5 text-[12px] text-[var(--danger)]">{errors.email.message}</p>}
            </div>
            <div>
              <label className="field-label">WhatsApp pessoal</label>
              <input {...register('phone')} type="tel" className="input" placeholder="(11) 99999-9999" />
            </div>
            <div>
              <label className="field-label">Especialidade</label>
              <input {...register('specialty')} className="input" placeholder="Ex: Nutrição esportiva" />
            </div>
          </div>

          <div>
            <label className="field-label">Bio</label>
            <textarea {...register('bio')} rows={4} placeholder="Fale um pouco sobre você e sua abordagem..." className="textarea" />
          </div>

          <div className="flex items-center gap-3 border-t border-[var(--border)] pt-4">
            <V4Button type="submit" variant="primary" disabled={isSubmitting || !isDirty}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar alterações
            </V4Button>
            {!isDirty && <span className="text-[12px] font-mono text-t3">Sem alterações pendentes</span>}
          </div>
        </form>
      </V4CardPad>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// Segurança
// ═══════════════════════════════════════════════════════

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Informe a senha atual'),
  new_password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirm_password: z.string().min(1, 'Confirme a nova senha'),
}).refine(d => d.new_password === d.confirm_password, {
  message: 'As senhas não coincidem',
  path: ['confirm_password'],
})
type PasswordData = z.infer<typeof passwordSchema>

function PasswordField({ label, error, ...props }: any) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="field-label">{label}</label>
      <div className="relative">
        <input
          {...props}
          type={show ? 'text' : 'password'}
          className="input pr-10"
          style={error ? { borderColor: 'var(--danger)' } : undefined}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-t3 transition-opacity hover:opacity-70"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="mt-1.5 text-[12px] text-[var(--danger)]">{error}</p>}
    </div>
  )
}

function SegurancaSection() {
  const [done, setDone] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema),
  })

  async function onSubmit(data: PasswordData) {
    try {
      await api.post('/api/nutritionists/change-password', {
        current_password: data.current_password,
        new_password: data.new_password,
      })
      toast.success('Senha alterada com sucesso!')
      reset()
      setDone(true)
      setTimeout(() => setDone(false), 4000)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Erro ao alterar senha.')
    }
  }

  return (
    <V4CardPad className="max-w-lg">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--brand-s)]">
          <Shield className="h-4 w-4 text-[var(--brand)]" />
        </div>
        <div>
          <p className="text-[14px] font-medium text-t1">Alterar senha</p>
          <p className="text-[12px] text-t3">Use uma senha forte com pelo menos 8 caracteres</p>
        </div>
      </div>

      {done && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-[var(--brand-ring)] bg-[var(--brand-s)] px-4 py-3">
          <CheckCircle className="h-4 w-4 shrink-0 text-[var(--brand)]" />
          <p className="text-[13px] font-medium text-[var(--brand)]">Senha alterada com sucesso!</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <PasswordField label="Senha atual" error={errors.current_password?.message} placeholder="••••••••" {...register('current_password')} />
        <PasswordField label="Nova senha" error={errors.new_password?.message} placeholder="Mínimo 8 caracteres" {...register('new_password')} />
        <PasswordField label="Confirmar nova senha" error={errors.confirm_password?.message} placeholder="Repita a nova senha" {...register('confirm_password')} />

        <V4Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
          Salvar nova senha
        </V4Button>
      </form>
    </V4CardPad>
  )
}

// ═══════════════════════════════════════════════════════
// Aparência
// ═══════════════════════════════════════════════════════

function AparenciaSection() {
  const { theme, toggleTheme } = useTheme()

  return (
    <V4CardPad className="max-w-lg">
      <p className="text-[14px] font-medium text-t1">Tema</p>
      <p className="mt-0.5 text-[12px] text-t3">Escolha como o Frame System aparece para você.</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          onClick={() => theme !== 'light' && toggleTheme()}
          className={theme === 'light'
            ? 'flex flex-col items-center gap-2 rounded-xl border-[1.5px] border-[var(--brand)] bg-[var(--brand-s)] p-4'
            : 'flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--raised)] p-4'}
        >
          <Sun className="h-5 w-5" style={{ color: theme === 'light' ? 'var(--brand)' : 'var(--t3)' }} />
          <span className="text-[13px] font-medium text-t1">Claro</span>
        </button>
        <button
          onClick={() => theme !== 'dark' && toggleTheme()}
          className={theme === 'dark'
            ? 'flex flex-col items-center gap-2 rounded-xl border-[1.5px] border-[var(--brand)] bg-[var(--brand-s)] p-4'
            : 'flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--raised)] p-4'}
        >
          <Moon className="h-5 w-5" style={{ color: theme === 'dark' ? 'var(--brand)' : 'var(--t3)' }} />
          <span className="text-[13px] font-medium text-t1">Escuro</span>
        </button>
      </div>
    </V4CardPad>
  )
}

// ═══════════════════════════════════════════════════════
// Integrações
// ═══════════════════════════════════════════════════════

type IntegrationId = 'whatsapp' | 'instagram' | 'calendar' | 'stripe' | 'asaas' | 'mailchimp' | 'zapier' | 'webhook' | 'import'

function LogoMark({ type }: { type: IntegrationId }) {
  const base = 'grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[12px] font-bold text-white'
  const map: Record<IntegrationId, string> = {
    whatsapp: 'bg-gradient-to-br from-[#25D366] to-[#128C7E]',
    instagram: 'bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]',
    calendar: 'bg-white text-[#1A73E8] border border-[var(--border)]',
    stripe: 'bg-gradient-to-br from-[#635BFF] to-[#3D32D6]',
    asaas: 'bg-gradient-to-br from-[#00C27C] to-[#00A86B]',
    mailchimp: 'bg-gradient-to-br from-[#FFE01B] to-[#E0C400] text-[#241C15]',
    zapier: 'bg-gradient-to-br from-[#FF4A00] to-[#C93B00]',
    webhook: 'bg-gradient-to-br from-[#6AA9FF] to-[#3F7DD9]',
    import: 'bg-gradient-to-br from-[#22C55E] to-[#15803D]',
  }

  if (type === 'calendar') {
    return (
      <div className={`${base} ${map[type]}`}>
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
          <path fill="#4285F4" d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5V9H4z" />
          <path fill="#34A853" d="M4 9h4v12H6.5A2.5 2.5 0 0 1 4 18.5z" />
          <path fill="#FBBC05" d="M8 9h6v12H8z" />
          <path fill="#EA4335" d="M14 9h6v9.5a2.5 2.5 0 0 1-2.5 2.5H14z" />
          <path fill="#fff" d="M7 12h10v6H7z" />
          <path fill="#1A73E8" d="M10.8 16.9h2.6v-.7h-.8v-3.1h-.7l-1.2.8.4.6.7-.5v2.2h-1z" />
        </svg>
      </div>
    )
  }

  if (type === 'whatsapp') {
    return (
      <div className={`${base} ${map[type]}`}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path fill="currentColor" d="M12.04 3.5a8.43 8.43 0 0 0-7.22 12.78L3.8 20.5l4.33-1.01a8.43 8.43 0 1 0 3.91-15.99Zm0 1.5a6.93 6.93 0 0 1 5.93 10.52l-.17.27.6 2.5-2.56-.6-.26.16A6.93 6.93 0 1 1 12.04 5Zm-2.38 3.4c-.16 0-.42.06-.64.3-.22.25-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.66 2.66 4.1 3.62 2.03.8 2.44.64 2.88.6.44-.04 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.42-1.34-1.66-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46Z" />
        </svg>
      </div>
    )
  }

  if (type === 'instagram') {
    return (
      <div className={`${base} ${map[type]}`}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path fill="none" stroke="currentColor" strokeWidth="2" d="M8 3.8h8A4.2 4.2 0 0 1 20.2 8v8a4.2 4.2 0 0 1-4.2 4.2H8A4.2 4.2 0 0 1 3.8 16V8A4.2 4.2 0 0 1 8 3.8Z" />
          <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="16.7" cy="7.3" r="1" fill="currentColor" />
        </svg>
      </div>
    )
  }

  if (type === 'stripe') return <div className={`${base} ${map[type]} text-[15px] normal-case`}>stripe</div>
  if (type === 'zapier') return <div className={`${base} ${map[type]} text-[18px]`}>*</div>

  const labels: Record<IntegrationId, string> = {
    whatsapp: 'WA', instagram: 'IG', calendar: 'GC', stripe: 'ST', asaas: 'AS', mailchimp: 'MC', zapier: 'ZP', webhook: 'WH', import: 'CSV',
  }
  return <div className={`${base} ${map[type]}`}>{labels[type]}</div>
}

function IntegrationCard({ id, name, desc, connected, comingSoon, account, onAction, actionLabel }: {
  id: IntegrationId; name: string; desc: string; connected?: boolean; comingSoon?: boolean; account?: string; onAction?: () => void; actionLabel?: string
}) {
  return (
    <div className={`flex flex-col rounded-[14px] border p-5 transition-colors ${
      comingSoon
        ? 'border-[var(--border)] bg-[var(--raised)] opacity-70'
        : connected
          ? 'border-[rgba(0,194,124,0.28)] bg-white hover:border-[var(--brand)]'
          : 'border-[var(--border)] bg-white hover:border-[rgba(0,194,124,0.35)]'
    }`}>
      <div className="flex items-start justify-between gap-2 mb-4">
        <LogoMark type={id} />
        {connected && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(0,194,124,0.25)] bg-[rgba(0,194,124,0.08)] px-2 py-0.5 text-[10px] font-medium text-[#08754D]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand)]" />
            Ativo
          </span>
        )}
        {comingSoon && (
          <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-white px-2 py-0.5 text-[10px] font-medium text-t3">
            Em breve
          </span>
        )}
      </div>
      <div className="flex-1">
        <div className="text-[13px] font-semibold text-t1">{name}</div>
        <p className="mt-1 text-[11.5px] leading-[1.5] text-t3">{connected && account ? account : desc}</p>
      </div>
      {!comingSoon && (
        <div className="mt-4 border-t border-[var(--border)] pt-3">
          <button
            onClick={onAction}
            disabled={!onAction}
            className="text-[12px] font-medium transition-colors disabled:opacity-40"
            style={{ color: connected ? 'var(--danger)' : 'var(--brand)' }}
          >
            {actionLabel ?? (connected ? 'Desconectar' : 'Conectar')}
          </button>
        </div>
      )}
    </div>
  )
}

function ImportButton() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function onChange(file?: File | null) {
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post('/api/clients/import-csv', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success(`${data.imported ?? 0} pacientes importados`)
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Erro ao importar pacientes')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => onChange(e.target.files?.[0])} />
      <Btn variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
        Importar pacientes
      </Btn>
    </>
  )
}

function IntegracoesSection() {
  const qc = useQueryClient()
  const { data: waData } = useQuery<any>({
    queryKey: ['whatsapp-status'],
    queryFn: () => api.get('/api/whatsapp/status').then(r => r.data),
    refetchInterval: 5000,
  })
  const { data: calendarData, isLoading: calendarLoading } = useQuery<any>({
    queryKey: ['google-calendar-status'],
    queryFn: () => api.get('/api/google-calendar/status').then(r => r.data),
  })

  const waConnected = waData?.status === 'connected'
  const calendarConnected = !!calendarData?.calendar_id
  const activeCount = (waConnected ? 1 : 0) + (calendarConnected ? 1 : 0)
  const total = 8

  async function connectCalendar() {
    try {
      const { data } = await api.get('/api/google-calendar/auth-url')
      if (data?.url) window.location.href = data.url
    } catch { toast.error('Erro ao conectar Google Calendar') }
  }

  async function disconnectCalendar() {
    try {
      await api.delete('/api/google-calendar/disconnect')
      qc.invalidateQueries({ queryKey: ['google-calendar-status'] })
      toast.success('Google Calendar desconectado')
    } catch { toast.error('Erro ao desconectar Google Calendar') }
  }

  const integrations: Array<{ id: IntegrationId; name: string; desc: string; connected?: boolean; comingSoon?: boolean; account?: string; onAction?: () => void; actionLabel?: string }> = [
    {
      id: 'whatsapp', name: 'WhatsApp Business', desc: 'Canal oficial · mensagens, templates e mídia',
      connected: waConnected, account: waData?.phone || 'Instância conectada',
      onAction: () => toast.info('Use a configuração de WhatsApp já conectada ao sistema.'),
    },
    {
      id: 'calendar', name: 'Google Calendar', desc: calendarLoading ? 'Verificando conexão...' : 'Sincronização bidirecional de agenda',
      connected: calendarConnected, account: calendarData?.calendar_id,
      onAction: calendarConnected ? disconnectCalendar : connectCalendar,
      actionLabel: calendarConnected ? 'Desconectar' : 'Conectar',
    },
    { id: 'instagram', name: 'Instagram Direct', desc: 'DMs e respostas a stories', comingSoon: true },
    { id: 'stripe', name: 'Stripe', desc: 'Pagamentos recorrentes e cobranças', comingSoon: true },
    { id: 'asaas', name: 'Asaas', desc: 'Boletos, PIX e assinaturas', comingSoon: true },
    { id: 'mailchimp', name: 'Mailchimp', desc: 'Campanhas de e-mail e automações', comingSoon: true },
    { id: 'zapier', name: 'Zapier', desc: 'Conecte a 5.000+ aplicativos', comingSoon: true },
    { id: 'webhook', name: 'Webhook', desc: 'Eventos em tempo real para sua API', comingSoon: true },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] text-t3">{activeCount} ativa(s) · {total - activeCount} disponíveis</p>
        <ImportButton />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {integrations.map(item => <IntegrationCard key={item.id} {...item} />)}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// Equipe
// ═══════════════════════════════════════════════════════

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
  { value: 'admin', label: 'Administrador', desc: 'Acesso total ao sistema', icon: Shield },
  { value: 'receptionist', label: 'Recepcionista', desc: 'Agenda, clientes e conversas', icon: Pencil },
  { value: 'viewer', label: 'Visualizador', desc: 'Somente leitura, sem editar nada', icon: Eye },
]

function EquipeSection() {
  const qc = useQueryClient()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'receptionist' | 'viewer'>('receptionist')
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
  const activeMembers = members.filter(m => m.status === 'active')
  const pendingMembers = members.filter(m => m.status === 'pending')

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-medium text-t1">Colaboradores</p>
          <p className="mt-0.5 text-[12px] text-t3">Adicione colaboradores e defina o que cada um pode fazer.</p>
        </div>
        <V4Button onClick={() => setShowForm(v => !v)}>
          <UserPlus className="h-4 w-4" />Adicionar
        </V4Button>
      </div>

      {!isLoading && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Membros', value: activeMembers.length, hint: 'ativos no workspace' },
            { label: 'Convites', value: pendingMembers.length, hint: 'aguardando aceite' },
            { label: 'Limite do plano', value: 5, hint: 'usuários incluídos' },
            { label: 'Disponíveis', value: Math.max(5 - members.length, 0), hint: 'assentos restantes' },
          ].map(item => (
            <V4CardPad key={item.label}>
              <div className="text-[22px] font-medium tabular-nums text-t1">{item.value}</div>
              <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-t3">{item.label}</div>
              <div className="mt-1 text-[11.5px] text-t3">{item.hint}</div>
            </V4CardPad>
          ))}
        </div>
      )}

      {showForm && (
        <V4CardPad>
          <p className="mb-4 text-[14px] font-medium text-t1">Novo colaborador</p>
          <div className="space-y-4">
            <div>
              <label className="field-label">E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="colaborador@email.com" className="input" />
            </div>
            <div>
              <label className="field-label">Nível de acesso</label>
              <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {ROLES.map(({ value, label, desc, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRole(value as any)}
                    className={role === value
                      ? 'flex flex-col gap-1 rounded-xl border-[1.5px] border-[var(--brand)] bg-[var(--brand-s)] p-3 text-left'
                      : 'flex flex-col gap-1 rounded-xl border border-[var(--border)] p-3 text-left'}
                  >
                    <Icon className="h-4 w-4" style={{ color: role === value ? 'var(--brand)' : 'var(--t3)' }} />
                    <p className="text-[12px] font-semibold" style={{ color: role === value ? 'var(--brand)' : 'var(--t1)' }}>{label}</p>
                    <p className="text-[10px] leading-tight text-t3">{desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <V4Button variant="primary" onClick={handleInvite} disabled={adding || !email.trim()}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Gerar link de convite
              </V4Button>
              <V4Button onClick={() => setShowForm(false)}>Cancelar</V4Button>
            </div>
          </div>
        </V4CardPad>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--brand)]" />
        </div>
      ) : members.length === 0 ? (
        <V4CardPad className="py-12 text-center">
          <UserPlus className="mx-auto mb-3 h-8 w-8 text-[var(--border)]" />
          <p className="text-[14px] font-medium text-t1">Nenhum colaborador ainda</p>
          <p className="mt-1 text-[12px] text-t3">Adicione colaboradores para eles acessarem o sistema</p>
        </V4CardPad>
      ) : (
        <>
          {activeMembers.length > 0 && (
            <div className="space-y-2">
              <SectionTitle title={`Membros (${activeMembers.length})`} />
              {activeMembers.map(member => {
                const info = roleInfo(member.role)
                const RoleIcon = info?.icon ?? Eye
                return (
                  <V4CardPad key={member.id}>
                    <div className="flex items-center gap-4">
                      <V4Avatar name={member.name || member.email} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[13px] font-semibold text-t1">{member.name || member.email}</p>
                          <Badge variant="success"><CheckCircle className="h-2.5 w-2.5" /> ativo</Badge>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <p className="truncate text-[11px] text-t3">{member.email}</p>
                          <span className="text-t3">·</span>
                          <div className="flex items-center gap-1">
                            <RoleIcon className="h-3 w-3 text-t3" />
                            <span className="text-[11px] text-t3">{info?.label}</span>
                          </div>
                        </div>
                      </div>
                      <Btn variant="ghost" size="sm" onClick={() => handleRemove(member.id)} className="!px-2">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Btn>
                    </div>
                  </V4CardPad>
                )
              })}
            </div>
          )}

          {pendingMembers.length > 0 && (
            <div className="space-y-2">
              <SectionTitle title="Convites pendentes" />
              {pendingMembers.map(member => {
                const info = roleInfo(member.role)
                const RoleIcon = info?.icon ?? Eye
                return (
                  <V4CardPad key={member.id}>
                    <div className="flex items-center gap-4">
                      <V4Avatar name={member.name || member.email} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[13px] font-semibold text-t1">{member.name || member.email}</p>
                          <Badge variant="warning"><Clock className="h-2.5 w-2.5" /> pendente</Badge>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <p className="truncate text-[11px] text-t3">{member.email}</p>
                          <span className="text-t3">·</span>
                          <div className="flex items-center gap-1">
                            <RoleIcon className="h-3 w-3 text-t3" />
                            <span className="text-[11px] text-t3">{info?.label}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {member.invite_link && (
                          <Btn variant="outline" size="sm" onClick={() => copyLink(member.invite_link!)}>
                            <Copy className="h-3.5 w-3.5" /> Copiar link
                          </Btn>
                        )}
                        <Btn variant="ghost" size="sm" onClick={() => handleRemove(member.id)} className="!px-2">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Btn>
                      </div>
                    </div>
                  </V4CardPad>
                )
              })}
            </div>
          )}
        </>
      )}

      <V4CardPad className="space-y-1.5">
        <p className="text-[13px] font-semibold text-t1">Como funciona?</p>
        {[
          '1. Adicione o e-mail do colaborador e escolha o nível de acesso',
          '2. Copie o link gerado e envie para ele pelo WhatsApp ou e-mail',
          '3. O colaborador clica no link, cria uma senha e já entra no sistema',
          '4. Você pode remover o acesso a qualquer momento',
        ].map((s, i) => <p key={i} className="text-[12px] text-t2">{s}</p>)}
      </V4CardPad>
    </div>
  )
}
