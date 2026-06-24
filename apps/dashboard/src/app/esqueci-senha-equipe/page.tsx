'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, CheckCircle, ArrowLeft } from 'lucide-react'
import api from '@/lib/api'

export default function EsqueciSenhaEquipePage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/api/team/forgot-password', { email })
      setDone(true)
    } catch {
      setError('Erro ao processar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

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
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--t1)' }}>Esqueceu a senha?</h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--t3)' }}>
            Informe seu e-mail de equipe e enviaremos um link para redefinir.
          </p>
        </div>

        <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {done ? (
            <div className="text-center space-y-3">
              <CheckCircle className="w-10 h-10 mx-auto" style={{ color: 'var(--brand)' }} />
              <p className="font-semibold" style={{ color: 'var(--t1)' }}>Link enviado!</p>
              <p className="text-[13px]" style={{ color: 'var(--t3)' }}>
                Se esse e-mail estiver cadastrado, você receberá o link em instantes.
              </p>
              <Link href="/login" className="block mt-2 text-[13px] font-semibold" style={{ color: 'var(--brand)' }}>
                Voltar ao login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--t2)' }}>E-mail</label>
                <input
                  type="email" required
                  placeholder="voce@exemplo.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="input w-full"
                />
              </div>
              {error && (
                <div className="rounded-xl px-4 py-3 text-[13px] font-medium"
                  style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar link de redefinição'}
              </button>
            </form>
          )}
        </div>

        <Link href="/login" className="flex items-center gap-1.5 text-[13px] transition-colors hover:opacity-70"
          style={{ color: 'var(--t3)' }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao login
        </Link>
      </div>
    </div>
  )
}
