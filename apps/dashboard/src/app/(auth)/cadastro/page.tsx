'use client'

import { useState, forwardRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/lib/api'
import {
  Clock, CheckCircle2, Mail, Stethoscope, User,
  KeyRound, ArrowRight, Loader2, Eye, EyeOff,
} from 'lucide-react'

// ── Schemas ───────────────────────────────────────────────────────────────────

const nutriSchema = z.object({
  name:            z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email:           z.string().email('E-mail inválido'),
  password:        z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
})
type NutriForm = z.infer<typeof nutriSchema>

// ── Tela de aprovação pendente ────────────────────────────────────────────────

function PendingScreen({ email }: { email: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-[380px]">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white text-[13px]"
            style={{ background: 'var(--brand)' }}
          >
            F
          </div>
          <span className="font-semibold" style={{ color: 'var(--t1)' }}>Frame System</span>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
        >
          {/* Clock icon */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
          >
            <Clock className="w-7 h-7" style={{ color: '#D97706' }} />
          </div>

          <h2 className="text-[20px] font-bold mb-2" style={{ color: 'var(--t1)' }}>
            Solicitação enviada!
          </h2>
          <p className="text-[14px] leading-relaxed mb-5" style={{ color: 'var(--t3)' }}>
            Sua conta foi criada e está{' '}
            <span className="font-semibold" style={{ color: '#D97706' }}>aguardando aprovação</span>.
            Você receberá acesso assim que for aprovada.
          </p>

          {/* Email pill */}
          <div
            className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 mb-6"
            style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
          >
            <Mail className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--t3)' }} />
            <span className="text-[13px] truncate font-mono" style={{ color: 'var(--t2)' }}>{email}</span>
          </div>

          {/* Steps */}
          <div
            className="rounded-xl p-4 text-left mb-6 space-y-3"
            style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
          >
            {[
              { icon: CheckCircle2, color: '#059669', label: 'Conta criada com sucesso',           active: true  },
              { icon: Clock,        color: '#D97706', label: 'Aguardando aprovação da administração', active: true  },
              { icon: CheckCircle2, color: 'var(--border)', label: 'Acesso liberado — você pode entrar', active: false },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <s.icon className="w-4 h-4 flex-shrink-0" style={{ color: s.color }} />
                <span
                  className="text-[13px]"
                  style={{ color: s.active ? 'var(--t2)' : 'var(--border)' }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          <Link
            href="/login"
            className="btn-secondary w-full justify-center"
          >
            Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Password field ────────────────────────────────────────────────────────────

const PasswordField = forwardRef<HTMLInputElement, {
  label: string; error?: string; placeholder?: string; [k: string]: any
}>(function PasswordField({ label, error, placeholder, ...props }, ref) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="field-label">{label}</label>
      <div className="relative">
        <input
          {...props}
          ref={ref}
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
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
})

// ── Formulário nutricionista ──────────────────────────────────────────────────

function NutriTab() {
  const [pending,        setPending]        = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [apiError,       setApiError]       = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<NutriForm>({
    resolver: zodResolver(nutriSchema),
  })

  async function onSubmit(data: NutriForm) {
    setApiError('')
    try {
      await api.post('/api/auth/register', {
        name:     data.name,
        email:    data.email,
        password: data.password,
      })
      setSubmittedEmail(data.email)
      setPending(true)
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null
      setApiError(msg || 'Erro ao criar conta. Tente novamente.')
    }
  }

  if (pending) return <PendingScreen email={submittedEmail} />

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div>
        <label className="field-label">Nome completo</label>
        <input
          {...register('name')}
          placeholder="Dra. Maria Silva"
          className="input"
          style={errors.name ? { borderColor: '#EF4444' } : undefined}
        />
        {errors.name && <p className="text-[12px] mt-1.5" style={{ color: '#EF4444' }}>{errors.name.message}</p>}
      </div>

      <div>
        <label className="field-label">E-mail profissional</label>
        <input
          {...register('email')}
          type="email"
          placeholder="voce@exemplo.com"
          className="input"
          style={errors.email ? { borderColor: '#EF4444' } : undefined}
        />
        {errors.email && <p className="text-[12px] mt-1.5" style={{ color: '#EF4444' }}>{errors.email.message}</p>}
      </div>

      <PasswordField
        label="Senha"
        placeholder="Mínimo 8 caracteres"
        error={errors.password?.message}
        {...register('password')}
      />
      <PasswordField
        label="Confirmar senha"
        placeholder="••••••••"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      {apiError && (
        <div
          className="rounded-xl px-4 py-3 text-[13px]"
          style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}
        >
          {apiError}
        </div>
      )}

      {/* Aviso de aprovação */}
      <div
        className="flex items-start gap-2.5 rounded-xl px-4 py-3"
        style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
      >
        <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#D97706' }} />
        <p className="text-[12px] leading-relaxed" style={{ color: '#92400E' }}>
          Contas de nutricionista precisam de <strong>aprovação administrativa</strong> antes de serem ativadas.
        </p>
      </div>

      <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-1">
        {isSubmitting
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <><span>Solicitar acesso</span><ArrowRight className="w-4 h-4" /></>
        }
      </button>
    </form>
  )
}

// ── Tab paciente ──────────────────────────────────────────────────────────────

function PatientTab() {
  const router = useRouter()
  return (
    <div className="flex flex-col items-center text-center py-2 gap-5">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: 'var(--brand-s-solid)', border: '1px solid rgba(0,194,124,.2)' }}
      >
        <KeyRound className="w-6 h-6" style={{ color: 'var(--brand)' }} />
      </div>

      <div>
        <p className="text-[14px] font-semibold mb-1.5" style={{ color: 'var(--t1)' }}>
          Código de acesso necessário
        </p>
        <p className="text-[13px] leading-relaxed max-w-[260px] mx-auto" style={{ color: 'var(--t3)' }}>
          Para criar uma conta de paciente, você precisa do{' '}
          <span className="font-semibold" style={{ color: 'var(--brand)' }}>código de acesso</span>{' '}
          fornecido pela sua nutricionista.
        </p>
      </div>

      <button
        onClick={() => router.push('/p/cadastro')}
        className="btn-primary"
      >
        Criar conta com código <ArrowRight className="w-4 h-4" />
      </button>

      <p className="text-[12px]" style={{ color: 'var(--t3)' }}>
        Não tem o código? Peça para a sua nutricionista.
      </p>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function CadastroPage() {
  const [tab, setTab] = useState<'nutri' | 'patient'>('nutri')

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-[420px]">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white text-[13px]"
            style={{ background: 'var(--brand)' }}
          >
            F
          </div>
          <span className="font-semibold" style={{ color: 'var(--t1)' }}>Frame System</span>
        </div>

        <div className="mb-7">
          <h1 className="text-[26px] font-bold tracking-tight mb-1.5" style={{ color: 'var(--t1)' }}>
            Criar conta
          </h1>
          <p className="text-[14px]" style={{ color: 'var(--t3)' }}>
            Selecione o tipo de conta para começar.
          </p>
        </div>

        {/* Card com tabs */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
        >
          {/* Tab switcher */}
          <div className="flex" style={{ borderBottom: '1px solid var(--border)' }}>
            {[
              { id: 'nutri',   icon: Stethoscope, label: 'Nutricionista' },
              { id: 'patient', icon: User,         label: 'Paciente'      },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setTab(id as 'nutri' | 'patient')}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 text-[13px] font-medium transition-all"
                style={tab === id
                  ? { color: 'var(--brand)', background: 'var(--brand-s)', borderBottom: '2px solid var(--brand)' }
                  : { color: 'var(--t3)' }
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="p-7">
            {tab === 'nutri' ? <NutriTab /> : <PatientTab />}
          </div>
        </div>

        <p className="text-center text-[13px] mt-5" style={{ color: 'var(--t3)' }}>
          Já tem conta?{' '}
          <Link
            href="/login"
            className="font-semibold transition-opacity hover:opacity-70"
            style={{ color: 'var(--brand)' }}
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
