'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react'
import api from '@/lib/api'

function ResetForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token') ?? ''

  const [pass, setPass]   = useState('')
  const [pass2, setPass2] = useState('')
  const [show, setShow]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [done, setDone]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pass.length < 6) return setError('A senha deve ter pelo menos 6 caracteres.')
    if (pass !== pass2)  return setError('As senhas não coincidem.')
    setLoading(true)
    setError('')
    try {
      await api.post('/api/team/reset-password', { token, password: pass })
      setDone(true)
      setTimeout(() => router.push('/login'), 2500)
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Link inválido ou expirado.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) return (
    <p className="text-center text-sm" style={{ color: 'var(--t3)' }}>Link inválido.</p>
  )

  if (done) return (
    <div className="text-center space-y-3">
      <CheckCircle className="w-10 h-10 mx-auto" style={{ color: 'var(--brand)' }} />
      <p className="font-semibold" style={{ color: 'var(--t1)' }}>Senha redefinida!</p>
      <p className="text-sm" style={{ color: 'var(--t3)' }}>Redirecionando para o login…</p>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--t2)' }}>Nova senha</label>
        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            required minLength={6}
            placeholder="Mínimo 6 caracteres"
            value={pass} onChange={e => setPass(e.target.value)}
            className="input w-full pr-10"
          />
          <button type="button" onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t3)' }}>
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--t2)' }}>Confirmar senha</label>
        <input
          type={show ? 'text' : 'password'}
          required minLength={6}
          placeholder="Repita a senha"
          value={pass2} onChange={e => setPass2(e.target.value)}
          className="input w-full"
        />
      </div>
      {error && (
        <div className="rounded-xl px-4 py-3 text-[13px] font-medium"
          style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
          {error}
        </div>
      )}
      <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar nova senha'}
      </button>
    </form>
  )
}

export default function RedefinirSenhaEquipePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-[380px] space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg overflow-hidden" style={{ background: '#013F32' }}>
            <img src="/logo.svg" alt="Frame System" className="w-full h-full object-contain" />
          </div>
          <span className="font-semibold" style={{ color: 'var(--t1)' }}>Frame System</span>
        </div>
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--t1)' }}>Redefinir senha</h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--t3)' }}>Crie uma nova senha para sua conta de equipe.</p>
        </div>
        <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Suspense fallback={<Loader2 className="w-5 h-5 animate-spin mx-auto" />}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
