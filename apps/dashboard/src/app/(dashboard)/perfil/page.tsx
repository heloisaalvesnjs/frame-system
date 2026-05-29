'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardContent } from '@/components/ui/Card'

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

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<ProfileData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (user) {
      reset({
        name:      user.name      || '',
        email:     user.email     || '',
        phone:     user.phone     || '',
        specialty: user.specialty || '',
        bio:       user.bio       || '',
      })
    }
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

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  return (
    <div className="p-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-bold text-[22px] tracking-tight text-t1">Meu Perfil</h1>
        <p className="text-sm text-t2 mt-0.5">Suas informações pessoais e do consultório</p>
      </div>

      {/* Avatar section */}
      <div className="flex items-center gap-5 mb-8">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-brand-500 flex-shrink-0"
          style={{ background: 'var(--brand-s-solid)', border: '1.5px solid rgba(0,194,124,.2)' }}
        >
          {initials}
        </div>
        <div>
          <p className="font-display font-bold text-[18px] tracking-tight text-t1 leading-tight">
            {user?.name || '—'}
          </p>
          <p className="font-mono text-[11px] text-t2 mt-1">{user?.email}</p>
          {user?.specialty && (
            <span
              className="inline-flex items-center mt-2 font-mono text-[10px] tracking-wider text-brand-500 px-2 py-0.5 rounded-full"
              style={{ background: 'var(--brand-s)' }}
            >
              {user.specialty}
            </span>
          )}
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardContent className="py-6">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nome completo"
                error={errors.name?.message}
                {...register('name')}
              />
              <Input
                label="E-mail"
                type="email"
                error={errors.email?.message}
                {...register('email')}
              />
              <Input
                label="WhatsApp pessoal"
                type="tel"
                placeholder="(11) 99999-9999"
                {...register('phone')}
              />
              <Input
                label="Especialidade"
                placeholder="Ex: Nutrição esportiva"
                {...register('specialty')}
              />
            </div>

            <Textarea
              label="Bio"
              placeholder="Fale um pouco sobre você e sua abordagem..."
              rows={4}
              {...register('bio')}
            />

            <div className="flex items-center gap-3 pt-1">
              <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
                Salvar alterações
              </Button>
              {!isDirty && (
                <span className="font-mono text-[11px] text-t3">Sem alterações pendentes</span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
