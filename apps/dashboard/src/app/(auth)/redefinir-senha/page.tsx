'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { Loader2, ArrowLeft, CheckCircle, Eye, EyeOff, Lock, ArrowRight } from 'lucide-react'

// ── Form ──────────────────────────────────────────────────────────────────────

function RedefinirSenhaForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const token        = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6)   return setError('A senha deve ter no mínimo 6 caracteres.')
    if (password !== confirm)  return setError('As senhas não coincidem.')
    if (!token)                return setError('Link inválido. Solicite um novo.')

    setLoading(true)
    try {
      await api.post('/api/auth/reset-password', { token, password })
      setDone(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Erro ao redefinir senha. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  /* token inválido */
  if (!token) {
    return (
      <div className="text-center space-y-4">
        <p className="text-[14px]" style={{ color: 'var(--t3)' }}>Link inválido ou expirado.</p>
        <Link
          href="/esqueci-senha"
          className="text-[13px] font-semibold transition-opacity hover:opacity-70"
          style={{ color: 'var(--brand)' }}
        >
          Solicitar novo link
        </Link>
      </div>
    )
  }

  /* senha redefinida */
  if (done) {
    return (
      <div className="text-center space-y-4 py-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
          style={{ background: 'var(--brand-s-solid)', border: '1px solid rgba(0,194,124,.2)' }}
        >
          <CheckCircle className="w-7 h-7" style={{ color: 'var(--brand)' }} />
        </div>
        <div>
          <p className="text-[16px] font-bold" style={{ color: 'var(--t1)' }}>Senha redefinida!</p>
          <p className="text-[13px] mt-1.5" style={{ color: 'var(--t3)' }}>
            Redirecionando para o login...
          </p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Nova senha */}
      <div>
        <label className="field-label">Nova senha</label>
        <div className="relative">
          <input
            type={showPass ? 'text' : 'password'}
            required
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="input pr-10"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPass(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
            style={{ color: 'var(--t3)' }}
          >
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Confirmar */}
      <div>
        <label className="field-label">Confirmar senha</label>
        <input
          type={showPass ? 'text' : 'password'}
          required
          placeholder="Repita a nova senha"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          className="input"
        />
      </div>

      {error && (
        <div
          className="rounded-xl px-4 py-3 text-[13px]"
          style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}
        >
          {error}
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
        {loading
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <><Lock className="w-4 h-4" /><span>Salvar nova senha</span><ArrowRight className="w-4 h-4" /></>
        }
      </button>

      <Link
        href="/login"
        className="flex items-center justify-center gap-2 text-[13px] transition-opacity hover:opacity-70"
        style={{ color: 'var(--t3)' }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Voltar para o login
      </Link>
    </form>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RedefinirSenhaPage() {
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

        <div className="mb-8">
          <h1 className="text-[26px] font-bold tracking-tight mb-1.5" style={{ color: 'var(--t1)' }}>
            Nova senha
          </h1>
          <p className="text-[14px]" style={{ color: 'var(--t3)' }}>
            Escolha uma nova senha para sua conta.
          </p>
        </div>

        <div
          className="rounded-2xl p-7"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
        >
          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--t3)' }} />
            </div>
          }>
            <RedefinirSenhaForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
