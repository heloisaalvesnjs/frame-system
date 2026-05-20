'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/lib/api'
import Cookies from 'js-cookie'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

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
  const router = useRouter()
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    try {
      setError('')
      const { data: res } = await api.post('/api/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
      })
      Cookies.set('token', res.token, { expires: 7 })
      router.push('/onboarding')
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null
      setError(message || 'Erro ao criar conta. Tente novamente.')
    }
  }

  return (
    <div className="min-h-screen bg-ui-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-500 mb-5 shadow-lg shadow-brand-500/30">
            <span className="text-white text-xl font-bold">F</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Frame</h1>
          <p className="text-white/30 mt-1 text-sm">Sua recepcionista virtual</p>
        </div>

        <div className="bg-ui-card rounded-2xl border border-ui-border p-8">
          <h2 className="text-base font-semibold text-white mb-6">Criar conta</h2>

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
              Criar conta
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
