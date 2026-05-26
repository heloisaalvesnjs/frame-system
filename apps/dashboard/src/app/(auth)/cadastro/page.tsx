'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Clock, CheckCircle2, Mail, Stethoscope, User, KeyRound, ArrowRight } from 'lucide-react'

const nutriSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
})

type NutriForm = z.infer<typeof nutriSchema>

// ── Tela de aprovação pendente ───────────────────────────────────────────────

function PendingScreen({ email }: { email: string }) {
  return (
    <div className="min-h-screen bg-ui-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-500 mb-6 shadow-lg shadow-brand-500/30">
          <span className="text-white text-xl font-bold">F</span>
        </div>

        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-5">
          <Clock className="w-8 h-8 text-amber-400" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Solicitação enviada!</h1>
        <p className="text-white/40 text-sm mb-6 leading-relaxed">
          Sua conta foi criada e está{' '}
          <span className="text-amber-400 font-medium">aguardando aprovação</span>.
          <br />
          Você receberá acesso assim que for aprovada pela administração.
        </p>

        <div className="flex items-center justify-center gap-2 bg-white/5 border border-white/[0.08] rounded-xl px-4 py-3 mb-6">
          <Mail className="w-4 h-4 text-white/30 flex-shrink-0" />
          <span className="text-sm text-white/50 truncate">{email}</span>
        </div>

        <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-5 text-left mb-6 space-y-3.5">
          {[
            { icon: CheckCircle2, color: 'text-emerald-400', label: 'Conta criada com sucesso', done: true },
            { icon: Clock, color: 'text-amber-400', label: 'Aguardando aprovação da administração', done: false },
            { icon: CheckCircle2, color: 'text-white/20', label: 'Acesso liberado — você pode entrar', done: false },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <s.icon className={`w-4 h-4 flex-shrink-0 ${s.color}`} />
              <span className={`text-sm ${i === 2 ? 'text-white/25' : 'text-white/65'}`}>{s.label}</span>
            </div>
          ))}
        </div>

        <Link
          href="/login"
          className="block w-full py-2.5 rounded-xl border border-white/10 text-sm font-medium text-white/50 hover:text-white/80 hover:border-white/20 transition-colors"
        >
          Voltar para o login
        </Link>
      </div>
    </div>
  )
}

// ── Formulário nutricionista ─────────────────────────────────────────────────

function NutriTab() {
  const [pending, setPending] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<NutriForm>({
    resolver: zodResolver(nutriSchema),
  })

  async function onSubmit(data: NutriForm) {
    try {
      setError('')
      await api.post('/api/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
      })
      setSubmittedEmail(data.email)
      setPending(true)
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null
      setError(msg || 'Erro ao criar conta. Tente novamente.')
    }
  }

  if (pending) return <PendingScreen email={submittedEmail} />

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input
        label="Nome completo"
        placeholder="Dra. Maria Silva"
        error={errors.name?.message}
        {...register('name')}
      />
      <Input
        label="E-mail profissional"
        type="email"
        placeholder="voce@exemplo.com"
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        label="Senha"
        type="password"
        placeholder="Mínimo 8 caracteres"
        error={errors.password?.message}
        {...register('password')}
      />
      <Input
        label="Confirmar senha"
        type="password"
        placeholder="••••••••"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/15 rounded-xl px-4 py-3 mt-1">
        <Clock className="w-3.5 h-3.5 text-amber-400/70 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-white/35 leading-relaxed">
          Contas de nutricionista precisam de aprovação antes de serem ativadas.
        </p>
      </div>

      <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
        Solicitar acesso
      </Button>
    </form>
  )
}

// ── Tab paciente ─────────────────────────────────────────────────────────────

function PatientTab() {
  const router = useRouter()
  return (
    <div className="flex flex-col items-center text-center py-2 gap-5">
      <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
        <KeyRound className="w-6 h-6 text-brand-400" />
      </div>

      <div>
        <p className="text-sm font-semibold text-white/80 mb-1.5">Código de acesso necessário</p>
        <p className="text-xs text-white/35 leading-relaxed max-w-[260px] mx-auto">
          Para criar uma conta de paciente, você precisa do{' '}
          <span className="text-brand-400 font-medium">código de acesso</span>{' '}
          fornecido pela sua nutricionista.
        </p>
      </div>

      <button
        onClick={() => router.push('/p/cadastro')}
        className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-400 text-white text-sm font-semibold rounded-xl transition-all active:scale-[0.97] shadow-lg shadow-brand-500/20"
      >
        Criar conta com código <ArrowRight className="w-4 h-4" />
      </button>

      <p className="text-xs text-white/20">
        Não tem o código? Peça para a sua nutricionista.
      </p>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────

export default function CadastroPage() {
  const [tab, setTab] = useState<'nutri' | 'patient'>('nutri')

  return (
    <div className="min-h-screen bg-ui-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-500 mb-5 shadow-lg shadow-brand-500/30">
            <span className="text-white text-xl font-bold">F</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Frame</h1>
          <p className="text-white/30 mt-1 text-sm">Criar conta</p>
        </div>

        <div className="bg-ui-card rounded-2xl border border-ui-border overflow-hidden">

          {/* Tab switcher */}
          <div className="flex border-b border-white/[0.06]">
            <button
              onClick={() => setTab('nutri')}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors ${
                tab === 'nutri'
                  ? 'bg-brand-500/10 text-brand-400 border-b-2 border-brand-500'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              Nutricionista
            </button>
            <button
              onClick={() => setTab('patient')}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors ${
                tab === 'patient'
                  ? 'bg-brand-500/10 text-brand-400 border-b-2 border-brand-500'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <User className="w-4 h-4" />
              Paciente
            </button>
          </div>

          <div className="p-7">
            {tab === 'nutri' ? <NutriTab /> : <PatientTab />}
          </div>
        </div>

        <p className="text-center text-sm text-white/25 mt-5">
          Já tem conta?{' '}
          <Link href="/login" className="text-brand-400 font-medium hover:text-brand-300 transition-colors">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
