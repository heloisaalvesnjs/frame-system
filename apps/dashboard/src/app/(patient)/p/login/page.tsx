'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePatient, patientApi } from '@/contexts/PatientContext'
import { Loader2, LogIn, KeyRound } from 'lucide-react'

export default function PatientLoginPage() {
  const { setSession, client, loading: authLoading } = usePatient()
  const router = useRouter()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && client) router.replace('/p/home')
  }, [client, authLoading, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await patientApi.post('/api/patient/auth/login', { login, password })
      setSession(data.token, data.account)
      router.push('/p/home')
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Credenciais inválidas. Verifique seu telefone/e-mail e senha.')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ui-bg">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ui-bg flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500 mb-4 shadow-lg shadow-brand-500/30">
            <span className="text-white text-2xl font-bold">F</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Bem-vinda de volta</h1>
          <p className="text-white/30 mt-1 text-sm">Acesse seu portal de acompanhamento</p>
        </div>

        <div className="bg-ui-card rounded-2xl border border-white/[0.07] p-7">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-white/40 font-medium block mb-1.5">
                Telefone ou e-mail
              </label>
              <input
                required
                autoComplete="username"
                placeholder="(11) 99999-9999 ou seu@email.com"
                value={login}
                onChange={e => setLogin(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/50 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs text-white/40 font-medium block mb-1.5">Senha</label>
              <input
                required
                type="password"
                autoComplete="current-password"
                placeholder="Sua senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
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
              className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 mt-1"
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <><LogIn className="w-4 h-4" /> Entrar</>
              }
            </button>
          </form>

          <p className="text-center text-xs text-white/30 mt-5">
            Não tem conta ainda?{' '}
            <Link href="/p/cadastro" className="text-brand-400 font-medium hover:text-brand-300 transition-colors">
              Criar conta
            </Link>
          </p>
        </div>

        {/* Hint for first-time users */}
        <div className="mt-4 flex items-start gap-2.5 bg-white/[0.03] border border-white/[0.05] rounded-xl px-4 py-3">
          <KeyRound className="w-3.5 h-3.5 text-white/25 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-white/25 leading-relaxed">
            Primeiro acesso? Peça o <strong className="text-white/40">link de acesso</strong> à sua nutricionista pelo WhatsApp.
          </p>
        </div>

      </div>
    </div>
  )
}
