'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  receptionist: 'Recepcionista',
  viewer: 'Visualizador',
}

export default function ConvitePage() {
  const params  = useParams()
  const router  = useRouter()
  const token   = params?.token as string

  const [invite, setInvite]   = useState<any>(null)
  const [error,  setError]    = useState('')
  const [name,   setName]     = useState('')
  const [pass,   setPass]     = useState('')
  const [pass2,  setPass2]    = useState('')
  const [saving, setSaving]   = useState(false)
  const [done,   setDone]     = useState(false)

  useEffect(() => {
    if (!token) return
    api.get(`/api/team/join/${token}`)
      .then(({ data }) => setInvite(data.member))
      .catch(() => setError('Convite inválido ou já utilizado.'))
  }, [token])

  async function handleJoin() {
    if (!name.trim()) return setError('Informe seu nome.')
    if (pass.length < 6) return setError('A senha deve ter pelo menos 6 caracteres.')
    if (pass !== pass2) return setError('As senhas não coincidem.')
    setSaving(true)
    setError('')
    try {
      const { data } = await api.post(`/api/team/join/${token}`, { name: name.trim(), password: pass })
      localStorage.setItem('token', data.token)
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao aceitar convite.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <p className="font-display font-bold text-2xl text-t1">
            Frame<span style={{ color: 'var(--brand)' }}>.</span>
          </p>
          <p className="text-xs text-t3 mt-1 font-mono tracking-widest">SYSTEM</p>
        </div>

        {done ? (
          <div className="rounded-2xl p-6 text-center space-y-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="text-4xl">✅</div>
            <p className="font-semibold text-t1">Conta criada com sucesso!</p>
            <p className="text-sm text-t3">Redirecionando para o painel...</p>
          </div>
        ) : error && !invite ? (
          <div className="rounded-2xl p-6 text-center space-y-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="text-4xl">❌</div>
            <p className="font-semibold text-t1">Link inválido</p>
            <p className="text-sm text-t3">{error}</p>
          </div>
        ) : invite ? (
          <div className="rounded-2xl p-6 space-y-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div>
              <p className="text-sm font-semibold text-t1">Você foi convidado!</p>
              <p className="text-xs text-t3 mt-1">
                <strong className="text-t2">{invite.nutritionist_name}</strong> te convidou como{' '}
                <strong className="text-brand-400">{ROLE_LABELS[invite.role] || invite.role}</strong>
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-t2">E-mail</label>
                <div className="h-9 rounded-lg px-3 flex items-center text-sm text-t3"
                  style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
                  {invite.email}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-t2">Seu nome</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="Como quer ser chamado?"
                  className="w-full h-9 rounded-lg px-3 text-sm text-t1 placeholder:text-t3 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-t2">Criar senha</label>
                <input type="password" value={pass} onChange={e => setPass(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full h-9 rounded-lg px-3 text-sm text-t1 placeholder:text-t3 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-t2">Confirmar senha</label>
                <input type="password" value={pass2} onChange={e => setPass2(e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full h-9 rounded-lg px-3 text-sm text-t1 placeholder:text-t3 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg px-3 py-2 text-xs text-red-400" style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)' }}>
                {error}
              </div>
            )}

            <Button onClick={handleJoin} loading={saving} className="w-full">
              Criar minha conta e entrar
            </Button>
          </div>
        ) : (
          <div className="text-center text-t3 text-sm">Carregando convite...</div>
        )}
      </div>
    </div>
  )
}
