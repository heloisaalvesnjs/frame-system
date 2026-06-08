'use client'

import { useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { Loader2, ArrowLeft, Mail, CheckCircle } from 'lucide-react'

export default function EsqueciSenhaPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/api/auth/forgot-password', { email })
      setSent(true)
    } catch {
      setError('Erro ao enviar e-mail. Tente novamente.')
    } finally {
      setLoading(false)
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
          <p className="text-white/30 mt-1 text-sm">Recuperação de senha</p>
        </div>

        <div className="bg-ui-card rounded-2xl border border-white/[0.07] p-7">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-brand-500/15 flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6 text-brand-400" />
              </div>
              <div>
                <p className="font-semibold text-white text-[15px]">E-mail enviado!</p>
                <p className="text-sm text-white/40 mt-1.5 leading-relaxed">
                  Se esse e-mail estiver cadastrado, você receberá as instruções em instantes. Verifique também a caixa de spam.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar para o login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <p className="text-sm text-white/60 leading-relaxed mb-5">
                  Informe o e-mail da sua conta e enviaremos um link para redefinir a senha.
                </p>
                <label className="text-xs text-white/40 font-medium block mb-1.5">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input
                    type="email"
                    required
                    placeholder="voce@exemplo.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/50 transition-colors"
                  />
                </div>
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
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Enviar link de recuperação'}
              </button>

              <Link
                href="/login"
                className="flex items-center justify-center gap-2 text-sm text-white/30 hover:text-white/60 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar para o login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
