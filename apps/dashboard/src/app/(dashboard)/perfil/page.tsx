'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Card, Badge, Btn, Avatar } from '@/components/ui/finance-primitives'

const schema = z.object({
  name:      z.string().min(2, 'Nome obrigatório'),
  email:     z.string().email('E-mail inválido'),
  phone:     z.string().optional(),
  specialty: z.string().optional(),
  bio:       z.string().optional(),
})
type ProfileData = z.infer<typeof schema>

export default function PerfilPage() {
  const { user, refreshUser } = useAuth()

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (user) reset({
      name:      user.name      || '',
      email:     user.email     || '',
      phone:     user.phone     || '',
      specialty: user.specialty || '',
      bio:       user.bio       || '',
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
    <div className="p-6 md:p-8 max-w-2xl">

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display font-bold text-[22px] tracking-tight" style={{ color: 'var(--t1)' }}>
          Meu Perfil
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--t3)' }}>
          Suas informações pessoais e do consultório
        </p>
      </div>

      {/* Avatar section */}
      <Card className="flex items-center gap-5 mb-6">
        <Avatar name={user?.name || 'U'} color="green" size={64} />
        <div>
          <p className="text-[18px] font-bold tracking-tight leading-tight" style={{ color: 'var(--t1)' }}>
            {user?.name || '—'}
          </p>
          <p className="text-[12px] font-mono mt-1" style={{ color: 'var(--t2)' }}>{user?.email}</p>
          {user?.specialty && (
            <span className="inline-block mt-2">
              <Badge variant="success">{user.specialty}</Badge>
            </span>
          )}
        </div>
      </Card>

      {/* Form */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="card-header">
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: 'var(--t1)' }}>Informações</h2>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--t3)' }}>Dados do seu perfil profissional</p>
          </div>
          {isDirty && <Badge variant="warning">Alterações pendentes</Badge>}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
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
            <textarea
              {...register('bio')}
              rows={4}
              placeholder="Fale um pouco sobre você e sua abordagem..."
              className="textarea"
            />
          </div>

          <div className="flex items-center gap-3 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
            <Btn type="submit" disabled={isSubmitting || !isDirty} className="mt-4">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar alterações
            </Btn>
            {!isDirty && (
              <span className="text-[12px] mt-4 font-mono" style={{ color: 'var(--t3)' }}>
                Sem alterações pendentes
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
