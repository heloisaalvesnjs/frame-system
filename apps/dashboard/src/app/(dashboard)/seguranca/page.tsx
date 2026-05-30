'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Shield, Eye, EyeOff, CheckCircle } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'

const schema = z.object({
  current_password: z.string().min(1, 'Informe a senha atual'),
  new_password:     z.string().min(8, 'Mínimo 8 caracteres'),
  confirm_password: z.string().min(1, 'Confirme a nova senha'),
}).refine(d => d.new_password === d.confirm_password, {
  message: 'As senhas não coincidem',
  path: ['confirm_password'],
})
type FormData = z.infer<typeof schema>

function PasswordInput({ label, error, ...props }: any) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-medium text-t2 font-mono tracking-wide">{label}</label>
      <div className="relative">
        <input
          {...props}
          type={show ? 'text' : 'password'}
          className="h-9 w-full rounded-lg px-3 pr-10 text-sm text-t1 focus:outline-none focus:ring-2 focus:ring-brand-500/15 transition-all"
          style={{ background: 'var(--raised)', border: `1px solid ${error ? 'rgba(239,68,68,.4)' : 'var(--border)'}` }}
        />
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-t3 hover:text-t2 transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

export default function SegurancaPage() {
  const [done, setDone] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
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
      const msg = err?.response?.data?.error || 'Erro ao alterar senha.'
      toast.error(msg)
    }
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="font-display font-bold text-[22px] tracking-tight text-t1">Segurança</h1>
        <p className="text-sm text-t2 mt-0.5">Gerencie sua senha de acesso</p>
      </div>

      <Card>
        <CardContent className="py-6">

          {/* Header do card */}
          <div className="flex items-center gap-3 mb-6 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--brand-s-solid)', border: '1px solid rgba(0,194,124,.2)' }}
            >
              <Shield className="w-5 h-5 text-brand-500" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-t1">Alterar senha</p>
              <p className="text-xs text-t2">Use uma senha forte com pelo menos 8 caracteres</p>
            </div>
          </div>

          {done && (
            <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-5">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <p className="text-sm text-emerald-400 font-medium">Senha alterada com sucesso!</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <PasswordInput
              label="Senha atual"
              error={errors.current_password?.message}
              placeholder="••••••••"
              {...register('current_password')}
            />
            <PasswordInput
              label="Nova senha"
              error={errors.new_password?.message}
              placeholder="Mínimo 8 caracteres"
              {...register('new_password')}
            />
            <PasswordInput
              label="Confirmar nova senha"
              error={errors.confirm_password?.message}
              placeholder="Repita a nova senha"
              {...register('confirm_password')}
            />
            <div className="pt-1">
              <Button type="submit" loading={isSubmitting} className="w-full">
                Salvar nova senha
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
