'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Save, Loader2, Eye, EyeOff, Shield,
  Laptop, Smartphone, Copy, Bell, Check, Lock,
} from 'lucide-react'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { Badge, Btn } from '@/components/ui/finance-primitives'

// ─── Perfil ───────────────────────────────────────────────────────

const profileSchema = z.object({
  name:        z.string().min(2, 'Nome obrigatório'),
  email:       z.string().email('E-mail inválido'),
  crn:         z.string().optional(),
  phone:       z.string().optional(),
  public_link: z.string().optional(),
})
type ProfileData = z.infer<typeof profileSchema>

function PerfilSection() {
  const { user, refreshUser } = useAuth()

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting, isDirty } } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
  })

  useEffect(() => {
    if (user) reset({
      name:        user.name              || '',
      email:       user.email             || '',
      crn:         (user as any).crn      || '',
      phone:       (user as any).phone    || '',
      public_link: (user as any).public_link || '',
    })
  }, [user, reset])

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  async function onSubmit(data: ProfileData) {
    try {
      await api.put('/api/nutritionists/profile', data)
      await refreshUser()
      toast.success('Perfil salvo!')
    } catch {
      toast.error('Erro ao salvar. Tente novamente.')
    }
  }

  const publicLink = watch('public_link')

  function copyLink() {
    if (publicLink) {
      navigator.clipboard.writeText(publicLink)
      toast.success('Link copiado!')
    }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="card-header">
        <div>
          <p className="text-[14px] font-semibold" style={{ color: 'var(--t1)' }}>Perfil</p>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--t3)' }}>Suas informações profissionais</p>
        </div>
        {isDirty && <Badge variant="warning">Alterações pendentes</Badge>}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-6">
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-[26px] font-bold flex-shrink-0"
            style={{ background: 'var(--brand-s-solid)', border: '2px solid rgba(0,194,124,.2)', color: 'var(--brand)' }}
          >
            {initials}
          </div>
          <div>
            <p className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--t1)' }}>{user?.name || '—'}</p>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--t3)' }}>{user?.email}</p>
          </div>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="field-label">Nome completo</label>
            <input {...register('name')} className="input" placeholder="Seu nome" />
            {errors.name && <p className="text-[12px] mt-1.5 text-red-500">{errors.name.message}</p>}
          </div>
          <div>
            <label className="field-label">E-mail</label>
            <input {...register('email')} type="email" className="input" placeholder="voce@exemplo.com" />
            {errors.email && <p className="text-[12px] mt-1.5 text-red-500">{errors.email.message}</p>}
          </div>
          <div>
            <label className="field-label">CRN</label>
            <input {...register('crn')} className="input" placeholder="CRN-X 000000" />
          </div>
          <div>
            <label className="field-label">WhatsApp pessoal</label>
            <input {...register('phone')} type="tel" className="input" placeholder="(11) 99999-9999" />
          </div>
          <div className="col-span-2">
            <label className="field-label">Link da agenda</label>
            <div className="relative">
              <input
                {...register('public_link')}
                className="input pr-10"
                placeholder="https://agenda.exemplo.com/seu-nome"
              />
              <button
                type="button"
                onClick={copyLink}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                style={{ color: 'var(--t3)' }}
                title="Copiar link"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div
          className="flex items-center gap-3 pt-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <Btn type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar perfil
          </Btn>
          {!isDirty && (
            <span className="text-[12px] font-mono" style={{ color: 'var(--t3)' }}>
              Sem alterações pendentes
            </span>
          )}
        </div>
      </form>
    </div>
  )
}

// ─── Segurança ────────────────────────────────────────────────────

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
          style={error ? { borderColor: '#EF4444' } : undefined}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
          style={{ color: 'var(--t3)' }}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="text-[12px] mt-1.5" style={{ color: '#EF4444' }}>{error}</p>}
    </div>
  )
}

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Informe a senha atual'),
  new_password:     z.string().min(8, 'Mínimo 8 caracteres'),
  confirm_password: z.string().min(1, 'Confirme a nova senha'),
}).refine(d => d.new_password === d.confirm_password, {
  message: 'As senhas não coincidem',
  path: ['confirm_password'],
})
type PasswordData = z.infer<typeof passwordSchema>

function SegurancaSection() {
  const [twoFaEnabled, setTwoFaEnabled] = useState(false)
  const [done, setDone] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema),
  })

  async function onSubmit(data: PasswordData) {
    try {
      await api.post('/api/nutritionists/change-password', {
        current_password: data.current_password,
        new_password:     data.new_password,
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
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="card-header">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--brand-s-solid)', border: '1px solid rgba(0,194,124,.2)' }}
          >
            <Shield className="w-4 h-4" style={{ color: 'var(--brand)' }} />
          </div>
          <div>
            <p className="text-[14px] font-semibold" style={{ color: 'var(--t1)' }}>Segurança</p>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--t3)' }}>Senha e autenticação</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* Alterar senha */}
        <div>
          <p className="text-[13px] font-semibold mb-4" style={{ color: 'var(--t1)' }}>Alterar senha</p>
          {done && (
            <div
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-4"
              style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}
            >
              <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#059669' }} />
              <p className="text-[13px] font-medium" style={{ color: '#059669' }}>Senha alterada com sucesso!</p>
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-3 gap-3">
              <PasswordField
                label="Senha atual"
                error={errors.current_password?.message}
                placeholder="••••••••"
                {...register('current_password')}
              />
              <PasswordField
                label="Nova senha"
                error={errors.new_password?.message}
                placeholder="Mínimo 8 caracteres"
                {...register('new_password')}
              />
              <PasswordField
                label="Confirmar nova senha"
                error={errors.confirm_password?.message}
                placeholder="Repita a nova senha"
                {...register('confirm_password')}
              />
            </div>
            <div className="mt-4">
              <Btn type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Salvar nova senha
              </Btn>
            </div>
          </form>
        </div>

        <div style={{ borderTop: '1px solid var(--border)' }} />

        {/* 2FA */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold" style={{ color: 'var(--t1)' }}>
              Autenticação em dois fatores
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--t3)' }}>
              {twoFaEnabled ? 'Ativado — conta protegida com verificação extra' : 'Desativado'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTwoFaEnabled(v => !v)}
            className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
            style={{
              background: twoFaEnabled ? 'var(--brand)' : 'var(--raised)',
              border:     twoFaEnabled ? 'none' : '1px solid var(--border)',
            }}
          >
            <span className={cn(
              'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm',
              twoFaEnabled ? 'translate-x-5' : 'translate-x-0'
            )} />
          </button>
        </div>

        <div style={{ borderTop: '1px solid var(--border)' }} />

        {/* Sessões ativas */}
        <div>
          <p className="text-[13px] font-semibold mb-3" style={{ color: 'var(--t1)' }}>Sessões ativas</p>
          <div className="space-y-2">
            {/* Current session */}
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ border: '1px solid var(--border)' }}
            >
              <Laptop className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--t2)' }} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium" style={{ color: 'var(--t1)' }}>MacBook Pro — Chrome</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--t3)' }}>São Paulo, BR · Agora</p>
              </div>
              <Badge variant="success">Esta sessão</Badge>
            </div>

            {/* Other session */}
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ border: '1px solid var(--border)' }}
            >
              <Smartphone className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--t2)' }} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium" style={{ color: 'var(--t1)' }}>iPhone · Safari</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--t3)' }}>São Paulo, BR · há 2 dias</p>
              </div>
              <Btn variant="outline" size="sm" className="!text-[var(--danger)] !border-[var(--danger)]/20 flex-shrink-0">
                Encerrar
              </Btn>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Notificações ─────────────────────────────────────────────────

const NOTIF_ITEMS = [
  { key: 'new_conversation', label: 'Nova conversa iniciada', desc: 'Quando um novo paciente mandar mensagem' },
  { key: 'new_appointment',  label: 'Consulta agendada',      desc: 'Quando a IA confirmar um agendamento' },
  { key: 'followup',         label: 'Follow-up enviado',      desc: 'Quando a IA enviar mensagem de retorno' },
  { key: 'weekly_report',    label: 'Relatório semanal',      desc: 'Resumo de atividades toda segunda-feira' },
]

function NotificacoesSection() {
  const [notifs, setNotifs] = useState<Record<string, boolean>>({
    new_conversation: true,
    new_appointment:  true,
    followup:         false,
    weekly_report:    true,
  })

  function toggle(key: string) {
    setNotifs(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="card-header">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--brand-s-solid)', border: '1px solid rgba(0,194,124,.2)' }}
          >
            <Bell className="w-4 h-4" style={{ color: 'var(--brand)' }} />
          </div>
          <div>
            <p className="text-[14px] font-semibold" style={{ color: 'var(--t1)' }}>Notificações</p>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--t3)' }}>Alertas por e-mail e WhatsApp</p>
          </div>
        </div>
      </div>

      <div className="divide-y" style={{ '--tw-divide-opacity': 1 } as any}>
        {NOTIF_ITEMS.map(({ key, label, desc }) => {
          const enabled = notifs[key]
          return (
            <div
              key={key}
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--border-s)' }}
            >
              <div>
                <p
                  className="text-[13px] font-medium"
                  style={{ color: enabled ? 'var(--t1)' : 'var(--t2)' }}
                >
                  {label}
                </p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--t3)' }}>{desc}</p>
              </div>
              <button
                type="button"
                onClick={() => toggle(key)}
                className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-6"
                style={{
                  background: enabled ? 'var(--brand)' : 'var(--raised)',
                  border:     enabled ? 'none' : '1px solid var(--border)',
                }}
              >
                <span className={cn(
                  'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm',
                  enabled ? 'translate-x-5' : 'translate-x-0'
                )} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────

export default function ConfiguracoesPage() {
  return (
    <div className="p-6 md:p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="font-display font-bold text-[22px] tracking-tight" style={{ color: 'var(--t1)' }}>
          Configurações
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--t3)' }}>
          Gerencie seu perfil, segurança e notificações
        </p>
      </div>

      <PerfilSection />
      <SegurancaSection />
      <NotificacoesSection />
    </div>
  )
}
