'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePatient, patientApi } from '@/contexts/PatientContext'
import { Loader2, ArrowLeft, KeyRound } from 'lucide-react'

export default function PatientRegisterPage() {
  const { setSession } = usePatient()
  const router = useRouter()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPass) { setError('As senhas não coincidem'); return }
    if (code.length !== 6) { setError('O código de acesso deve ter 6 caracteres'); return }

    setLoading(true)
    try {
      const { data } = await patientApi.post('/api/patient/auth/register', {
        name,
        phone,
        email: email || undefined,
        password,
        invite_code: code.toUpperCase(),
      })
      setSession(data.token, data.account)
      router.push('/p/home')
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Erro ao criar conta. Verifique o código de acesso.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ui-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 overflow-hidden" style={{ background: '#013F32' }}>
            <img src="/logo.svg" alt="Frame System" className="w-9 h-9 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-white">Frame</h1>
          <p className="text-white/30 mt-1 text-sm">Criar conta de paciente</p>
        </div>

        <div className="bg-ui-card rounded-2xl border border-white/[0.07] p-7">

          {/* Code highlight */}
          <div className="flex items-start gap-3 bg-brand-500/10 border border-brand-500/20 rounded-xl p-4 mb-6">
            <KeyRound className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-brand-300 leading-relaxed">
              Você precisa do <strong>código de acesso</strong> fornecido pela sua nutricionista para criar a conta.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-white/40 font-medium block mb-1.5">Código de acesso *</label>
              <input
                required maxLength={6} placeholder="ABC123"
                value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                className="w-full bg-white/5 border border-brand-500/30 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/60 transition-colors font-mono tracking-widest uppercase text-center text-base font-bold"
              />
            </div>

            <div className="border-t border-white/[0.05] pt-4">
              <p className="text-xs text-white/30 mb-3">Seus dados</p>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs text-white/40 font-medium block mb-1.5">Nome completo *</label>
                  <input
                    required placeholder="Maria Silva"
                    value={name} onChange={e => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/40 font-medium block mb-1.5">Telefone *</label>
                  <input
                    required type="tel" placeholder="(11) 99999-9999"
                    value={phone} onChange={e => setPhone(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/40 font-medium block mb-1.5">E-mail (opcional)</label>
                  <input
                    type="email" placeholder="seu@email.com"
                    value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/40 font-medium block mb-1.5">Senha *</label>
                  <input
                    required type="password" placeholder="Mínimo 6 caracteres"
                    value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/40 font-medium block mb-1.5">Confirmar senha *</label>
                  <input
                    required type="password" placeholder="Repita a senha"
                    value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/50 transition-colors"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-brand-500/20 mt-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Criar minha conta'}
            </button>
          </form>

          <p className="text-center text-xs text-white/30 mt-5">
            Já tem conta?{' '}
            <Link href="/p/login" className="text-brand-400 font-medium hover:text-brand-300">
              Entrar
            </Link>
          </p>
        </div>

        <Link href="/p/login" className="flex items-center justify-center gap-1.5 mt-4 text-xs text-white/25 hover:text-white/50 transition-colors">
          <ArrowLeft className="w-3 h-3" /> Voltar para o login
        </Link>
      </div>
    </div>
  )
}
