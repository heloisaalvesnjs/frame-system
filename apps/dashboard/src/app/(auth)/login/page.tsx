'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { usePatient, patientApi } from '@/contexts/PatientContext'
import { Loader2, Stethoscope, User } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const { setSession } = usePatient()
  const router = useRouter()

  const [tab, setTab] = useState<'nutri' | 'patient'>('nutri')

  // ── Nutricionista form state ────────────────────────────────────────────────
  const [nutriEmail, setNutriEmail] = useState('')
  const [nutriPass, setNutriPass] = useState('')
  const [nutriLoading, setNutriLoading] = useState(false)
  const [nutriError, setNutriError] = useState('')

  // ── Paciente form state ─────────────────────────────────────────────────────
  const [patLogin, setPatLogin] = useState('')
  const [patPass, setPatPass] = useState('')
  const [patLoading, setPatLoading] = useState(false)
  const [patError, setPatError] = useState('')

  async function handleNutriLogin(e: React.FormEvent) {
    e.preventDefault()
    setNutriError('')
    setNutriLoading(true)
    try {
      await login(nutriEmail, nutriPass)
      router.push('/dashboard')
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? 'E-mail ou senha incorretos'
      setNutriError(msg)
    } finally {
      setNutriLoading(false)
    }
  }

  async function handlePatientLogin(e: React.FormEvent) {
    e.preventDefault()
    setPatError('')
    setPatLoading(true)
    try {
      const { data } = await patientApi.post('/api/patient/auth/login', {
        login: patLogin,
        password: patPass,
      })
      setSession(data.token, data.account)
      router.push('/p/home')
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Telefone/e-mail ou senha incorretos'
      setPatError(msg)
    } finally {
      setPatLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ui-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-500 mb-4 shadow-lg shadow-brand-500/30">
            <span className="text-white text-xl font-bold">F</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Frame</h1>
          <p className="text-white/30 mt-1 text-sm">Sua recepcionista virtual</p>
        </div>

        <div className="bg-ui-card rounded-2xl border border-white/[0.07] overflow-hidden">

          {/* Tab switcher */}
          <div className="flex border-b border-white/[0.06]">
            <button
              onClick={() => setTab('nutri')}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors ${
                tab === 'nutri'
                  ? 'bg-brand-500/10 text-brand-400 border-b-2 border-brand-500'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              Nutricionista
            </button>
            <button
              onClick={() => setTab('patient')}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors ${
                tab === 'patient'
                  ? 'bg-brand-500/10 text-brand-400 border-b-2 border-brand-500'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <User className="w-4 h-4" />
              Paciente
            </button>
          </div>

          <div className="p-7">

            {/* ── Login Nutricionista ── */}
            {tab === 'nutri' && (
              <form onSubmit={handleNutriLogin} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs text-white/40 font-medium block mb-1.5">E-mail</label>
                  <input
                    type="email" required placeholder="voce@exemplo.com"
                    value={nutriEmail} onChange={e => setNutriEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/40 font-medium block mb-1.5">Senha</label>
                  <input
                    type="password" required placeholder="••••••••"
                    value={nutriPass} onChange={e => setNutriPass(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/50 transition-colors"
                  />
                </div>

                {nutriError && (
                  <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                    {nutriError}
                  </div>
                )}

                <button type="submit" disabled={nutriLoading}
                  className="w-full mt-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-brand-500/20">
                  {nutriLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Entrar'}
                </button>

                <p className="text-center text-xs text-white/30 mt-1">
                  Não tem conta?{' '}
                  <Link href="/cadastro" className="text-brand-400 font-medium hover:text-brand-300">
                    Solicitar acesso
                  </Link>
                </p>
              </form>
            )}

            {/* ── Login Paciente ── */}
            {tab === 'patient' && (
              <form onSubmit={handlePatientLogin} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs text-white/40 font-medium block mb-1.5">Telefone ou e-mail</label>
                  <input
                    type="text" required placeholder="(11) 99999-9999 ou email"
                    value={patLogin} onChange={e => setPatLogin(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/40 font-medium block mb-1.5">Senha</label>
                  <input
                    type="password" required placeholder="••••••••"
                    value={patPass} onChange={e => setPatPass(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/50 transition-colors"
                  />
                </div>

                {patError && (
                  <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                    {patError}
                  </div>
                )}

                <button type="submit" disabled={patLoading}
                  className="w-full mt-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-brand-500/20">
                  {patLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Entrar'}
                </button>

                <p className="text-center text-xs text-white/30 mt-1">
                  Primeira vez aqui?{' '}
                  <Link href="/p/cadastro" className="text-brand-400 font-medium hover:text-brand-300">
                    Criar minha conta
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
