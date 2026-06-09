'use client'

import { useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { Loader2, ArrowLeft, Mail, CheckCircle, ArrowRight } from 'lucide-react'

export default function EsqueciSenhaPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

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

        {sent ? (
          /* ── Confirmação ── */
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'var(--brand-s-solid)', border: '1px solid rgba(0,194,124,.2)' }}
            >
              <CheckCircle className="w-7 h-7" style={{ color: 'var(--brand)' }} />
            </div>
            <h2 className="text-[20px] font-bold mb-2" style={{ color: 'var(--t1)' }}>E-mail enviado!</h2>
            <p className="text-[14px] leading-relaxed mb-6" style={{ color: 'var(--t3)' }}>
              Se esse e-mail estiver cadastrado, você receberá as instruções em instantes.
              Verifique também a caixa de spam.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-[13px] font-semibold transition-opacity hover:opacity-70"
              style={{ color: 'var(--brand)' }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar para o login
            </Link>
          </div>
        ) : (
          /* ── Formulário ── */
          <>
            <div className="mb-8">
              <h1 className="text-[26px] font-bold tracking-tight mb-1.5" style={{ color: 'var(--t1)' }}>
                Esqueceu a senha?
              </h1>
              <p className="text-[14px]" style={{ color: 'var(--t3)' }}>
                Informe seu e-mail e enviaremos um link para redefinir a senha.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="field-label">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--t3)' }} />
                  <input
                    type="email"
                    required
                    placeholder="voce@exemplo.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input pl-10"
                  />
                </div>
              </div>

              {error && (
                <div
                  className="rounded-xl px-4 py-3 text-[13px] font-medium"
                  style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}
                >
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><span>Enviar link</span><ArrowRight className="w-4 h-4" /></>
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
          </>
        )}
      </div>
    </div>
  )
}
