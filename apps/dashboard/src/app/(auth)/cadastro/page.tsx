'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Clock, CheckCircle2, Mail } from 'lucide-react'

const schema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  confirmPassword: z.string(),
  phone: z.string().optional(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

export default function CadastroPage() {
  const [pending, setPending] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      setError('')
      await api.post('/api/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
      })
      // Register always returns pending now — master must approve
      setSubmittedEmail(data.email)
      setPending(true)
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null
      setError(message || 'Erro ao criar conta. Tente novamente.')
    }
  }

  /* ── Pending approval screen ── */
  if (pending) {
    return (
      <div className="min-h-screen bg-ui-bg flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-500 mb-5 shadow-lg shadow-brand-500/30">
            <span className="text-white text-xl font-bold">F</span>
          </div>

          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-5">
            <Clock className="w-8 h-8 text-amber-400" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Solicitação enviada!</h1>
          <p className="text-white/40 text-sm mb-6 leading-relaxed">
            Sua conta foi criada e está <span className="text-amber-400 font-medium">aguardando aprovação</span>.
            <br />
            Você receberá acesso assim que for aprovada.
          </p>

          {/* Email badge */}
          <div className="flex items-center justify-center gap-2 bg-white/5 border border-white/[0.08] rounded-xl px-4 py-3 mb-6">
            <Mail className="w-4 h-4 text-white/30 flex-shrink-0" />
            <span className="text-sm text-white/50 truncate">{submittedEmail}</span>
          </div>

          {/* Steps */}
          <div className="bg-ui-card border border-white/[0.06] rounded-2xl p-5 text-left mb-6 space-y-3">
            {[
              { icon: CheckCircle2, color: 'text-emerald-400', label: 'Conta criada com sucesso' },
              { icon: Clock, color: 'text-amber-400', label: 'Aguardando aprovação da administração' },
              { icon: CheckCircle2, color: 'text-white/20', label: 'Acesso liberado — você pode entrar' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <s.icon className={`w-4 h-4 flex-shrink-0 ${s.color}`} />
                <span className={`text-sm ${i === 2 ? 'text-white/25' : 'text-white/60'}`}>{s.label}</span>
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

  /* ── Registration form ── */
  return (
    <div className="min-h-screen bg-ui-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-500 mb-5 shadow-lg shadow-brand-500/30">
            <span className="text-white text-xl font-bold">F</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Frame</h1>
          <p className="text-white/30 mt-1 text-sm">Solicitar acesso</p>
        </div>

        <div className="bg-ui-card rounded-2xl border border-ui-border p-8">
          <h2 className="text-base font-semibold text-white mb-1">Criar conta</h2>
          <p className="text-xs text-white/30 mb-6">Sua conta será ativada após aprovação</p>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label="Nome completo"
              placeholder="Dra. Maria Silva"
              error={errors.name?.message}
              {...register('name')}
            />

            <Input
              label="E-mail"
              type="email"
              placeholder="voce@exemplo.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="WhatsApp (opcional)"
              type="tel"
              placeholder="(11) 99999-9999"
              error={errors.phone?.message}
              {...register('phone')}
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

            <Button type="submit" loading={isSubmitting} className="w-full mt-1" size="lg">
              Solicitar acesso
            </Button>
          </form>

          <p className="text-center text-sm text-white/30 mt-6">
            Já tem conta?{' '}
            <Link href="/login" className="text-brand-400 font-medium hover:text-brand-300 transition-colors">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
