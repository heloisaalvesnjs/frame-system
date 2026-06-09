'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Shield, Eye, EyeOff, CheckCircle, Loader2 } from 'lucide-react'
import api from '@/lib/api'

const schema = z.object({
  current_password: z.string().min(1, 'Informe a senha atual'),
  new_password:     z.string().min(8, 'Mínimo 8 caracteres'),
  confirm_password: z.string().min(1, 'Confirme a nova senha'),
}).refine(d => d.new_password === d.confirm_password, {
  message: 'As senhas não coincidem',
  path: ['confirm_password'],
})
type FormData = z.infer<typeof schema>

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
      toast.error(err?.response?.data?.error || 'Erro ao alterar senha.')
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-lg">

      <div className="mb-8">
        <h1 className="text-[24px] font-bold tracking-tight" style={{ color: 'var(--t1)' }}>
          Segurança
        </h1>
        <p className="text-[14px] mt-1" style={{ color: 'var(--t3)' }}>
          Gerencie sua senha de acesso
        </p>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="card-header">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--brand-s-solid)', border: '1px solid rgba(0,194,124,.2)' }}
            >
              <Shield className="w-4.5 h-4.5" style={{ color: 'var(--brand)' }} />
            </div>
            <div>
              <p className="text-[14px] font-semibold" style={{ color: 'var(--t1)' }}>Alterar senha</p>
              <p className="text-[12px]" style={{ color: 'var(--t3)' }}>Use uma senha forte com pelo menos 8 caracteres</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {done && (
            <div
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-5"
              style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}
            >
              <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#059669' }} />
              <p className="text-[13px] font-medium" style={{ color: '#059669' }}>
                Senha alterada com sucesso!
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full mt-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              Salvar nova senha
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
