'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { Loader2, ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react'

function RedefinirSenhaForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const token        = searchParams.get('token') ?? ''

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPass,  setShowPass]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)
  const [error,     setError]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6)         return setError('A senha deve ter no mínimo 6 caracteres.')
    if (password !== confirm)         return setError('As senhas não coincidem.')
    if (!token)                       return setError('Link inválido. Solicite um novo.')

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

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <p className="text-sm text-white/40">Link inválido ou expirado.</p>
        <Link href="/esqueci-senha" className="text-sm text-brand-400 hover:text-brand-300">
          Solicitar novo link
        </Link>
      </div>
    )
  }

  return done ? (
    <div className="text-center space-y-4">
      <div className="w-12 h-12 rounded-full bg-brand-500/15 flex items-center justify-center mx-auto">
        <CheckCircle className="w-6 h-6 text-brand-400" />
      </div>
      <div>
        <p className="font-semibold text-white text-[15px]">Senha redefinida!</p>
        <p className="text-sm text-white/40 mt-1.5">Redirecionando para o login...</p>
      </div>
    </div>
  ) : (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-white/60 leading-relaxed">
        Escolha uma nova senha para sua conta.
      </p>

      <div>
        <label className="text-xs text-white/40 font-medium block mb-1.5">Nova senha</label>
        <div className="relative">
          <input
            type={showPass ? 'text' : 'password'}
            required
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 pr-10 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/50 transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowPass(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
          >
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="text-xs text-white/40 font-medium block mb-1.5">Confirmar senha</label>
        <input
          type={showPass ? 'text' : 'password'}
          required
          placeholder="Repita a nova senha"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/50 transition-colors"
        />
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-brand-500/20"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Salvar nova senha'}
      </button>

      <Link
        href="/login"
        className="flex items-center justify-center gap-2 text-sm text-white/30 hover:text-white/60 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Voltar para o login
      </Link>
    </form>
  )
}

export default function RedefinirSenhaPage() {
  return (
    <div className="min-h-screen bg-ui-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-500 mb-4 shadow-lg shadow-brand-500/30">
            <span className="text-white text-xl font-bold">F</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Frame</h1>
          <p className="text-white/30 mt-1 text-sm">Nova senha</p>
        </div>

        <div className="bg-ui-card rounded-2xl border border-white/[0.07] p-7">
          <Suspense fallback={<Loader2 className="w-5 h-5 animate-spin text-white/30 mx-auto" />}>
            <RedefinirSenhaForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
