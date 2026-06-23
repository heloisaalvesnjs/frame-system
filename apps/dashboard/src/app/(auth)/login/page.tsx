'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Cookies from 'js-cookie'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { usePatient, patientApi } from '@/contexts/PatientContext'
import { Loader2, Eye, EyeOff, ArrowRight, Bot, Calendar, Users } from 'lucide-react'

// ── Password input with toggle ─────────────────────────────────────────────────

function PasswordInput({
  value,
  onChange,
  placeholder = '••••••••',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        required
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="input pr-10 w-full"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md transition-colors"
        style={{ color: 'var(--t3)' }}
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}

// ── Left panel — brand ────────────────────────────────────────────────────────

function BrandPanel() {
  const features = [
    { icon: Bot,      label: 'Assistente IA 24/7',        desc: 'Atende seus pacientes no WhatsApp automaticamente' },
    { icon: Calendar, label: 'Agenda inteligente',         desc: 'Agendamentos automáticos sem conflito de horários' },
    { icon: Users,    label: 'Gestão de clientes',         desc: 'Histórico completo, planos e acompanhamento' },
  ]

  return (
    <div
      className="login-brand-panel relative hidden lg:flex flex-col justify-between p-12 overflow-hidden"
      style={{ background: '#111113', width: '420px', flexShrink: 0 }}
    >
      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Glow */}
      <div
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,194,124,0.12) 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,194,124,0.06) 0%, transparent 70%)' }}
      />

      {/* Logo */}
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-16">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden" style={{ background: '#013F32' }}>
            <img src="/logo.svg" alt="Frame System" className="w-7 h-7 object-contain" />
          </div>
          <span className="text-white font-semibold text-[16px] tracking-tight">Frame System</span>
        </div>

        <div className="mb-12">
          <h1 className="text-[32px] font-bold text-white leading-tight tracking-tight mb-4">
            Sua recepcionista<br />
            <span style={{ color: 'var(--brand)' }}>sempre disponível.</span>
          </h1>
          <p className="text-[15px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Automatize o atendimento do seu consultório e foque no que realmente importa.
          </p>
        </div>

        <div className="flex flex-col gap-5">
          {features.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-4">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(0,194,124,0.12)', border: '1px solid rgba(0,194,124,0.15)' }}
              >
                <Icon className="w-4 h-4" style={{ color: 'var(--brand)' }} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-white">{label}</p>
                <p className="text-[13px] mt-0.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.40)' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10">
        <div
          className="flex items-center gap-2 text-[12px]"
          style={{ color: 'rgba(255,255,255,0.25)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--brand)' }} />
          Todos os dados protegidos com criptografia
        </div>
      </div>
    </div>
  )
}

// ── Main login page ───────────────────────────────────────────────────────────

export default function LoginPage() {
  const { login } = useAuth()
  const { setSession } = usePatient()
  const router = useRouter()

  const [tab, setTab] = useState<'nutri' | 'patient' | 'team'>('nutri')

  const [nutriEmail,   setNutriEmail]   = useState('')
  const [nutriPass,    setNutriPass]    = useState('')
  const [nutriLoading, setNutriLoading] = useState(false)
  const [nutriError,   setNutriError]   = useState('')

  const [patLogin,   setPatLogin]   = useState('')
  const [patPass,    setPatPass]    = useState('')
  const [patLoading, setPatLoading] = useState(false)
  const [patError,   setPatError]   = useState('')

  const [teamEmail,   setTeamEmail]   = useState('')
  const [teamPass,    setTeamPass]    = useState('')
  const [teamLoading, setTeamLoading] = useState(false)
  const [teamError,   setTeamError]   = useState('')

  async function handleNutriLogin(e: React.FormEvent) {
    e.preventDefault()
    setNutriError('')
    setNutriLoading(true)
    try {
      await login(nutriEmail, nutriPass)
      router.push('/dashboard')
    } catch (err: any) {
      setNutriError(err?.response?.data?.error ?? 'E-mail ou senha incorretos')
    } finally {
      setNutriLoading(false)
    }
  }

  async function handleTeamLogin(e: React.FormEvent) {
    e.preventDefault()
    setTeamError('')
    setTeamLoading(true)
    try {
      const { data } = await api.post('/api/team/login', { email: teamEmail, password: teamPass })
      Cookies.set('token', data.token, { expires: 7 })
      router.push('/dashboard')
    } catch (err: any) {
      setTeamError(err?.response?.data?.error ?? 'E-mail ou senha incorretos')
    } finally {
      setTeamLoading(false)
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
      setPatError(err?.response?.data?.error ?? 'Telefone/e-mail ou senha incorretos')
    } finally {
      setPatLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>

      {/* Left — brand panel */}
      <BrandPanel />

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[380px]">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center overflow-hidden" style={{ background: '#013F32' }}>
              <img src="/logo.svg" alt="Frame System" className="w-6 h-6 object-contain" />
            </div>
            <span className="font-semibold" style={{ color: 'var(--t1)' }}>Frame System</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-[26px] font-bold tracking-tight mb-1.5" style={{ color: 'var(--t1)' }}>
              Entrar
            </h2>
            <p className="text-[14px]" style={{ color: 'var(--t3)' }}>
              Acesse sua conta para continuar
            </p>
          </div>

          {/* Tab switcher */}
          <div
            className="flex gap-0.5 p-1 rounded-xl mb-7"
            style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}
          >
            {[
              { key: 'nutri',   label: 'Nutricionista' },
              { key: 'team',    label: 'Equipe' },
              { key: 'patient', label: 'Paciente' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as 'nutri' | 'team' | 'patient')}
                className="flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all duration-150"
                style={tab === t.key
                  ? { background: 'var(--surface)', color: 'var(--t1)', boxShadow: 'var(--shadow-sm)' }
                  : { background: 'transparent', color: 'var(--t3)' }
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Form: Nutricionista ── */}
          {tab === 'nutri' && (
            <form onSubmit={handleNutriLogin} className="flex flex-col gap-4">
              <div>
                <label className="field-label">E-mail</label>
                <input
                  type="email" required placeholder="voce@exemplo.com"
                  value={nutriEmail} onChange={e => setNutriEmail(e.target.value)}
                  className="input w-full"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="field-label" style={{ marginBottom: 0 }}>Senha</label>
                  <Link
                    href="/esqueci-senha"
                    className="text-[12px] font-medium transition-colors hover:opacity-70"
                    style={{ color: 'var(--brand)' }}
                  >
                    Esqueceu?
                  </Link>
                </div>
                <PasswordInput value={nutriPass} onChange={setNutriPass} />
              </div>

              {nutriError && (
                <div
                  className="rounded-xl px-4 py-3 text-[13px] font-medium"
                  style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}
                >
                  {nutriError}
                </div>
              )}

              <button
                type="submit"
                disabled={nutriLoading}
                className="btn-primary w-full mt-1"
              >
                {nutriLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><span>Entrar</span><ArrowRight className="w-4 h-4" /></>
                }
              </button>

              <p className="text-center text-[13px] mt-1" style={{ color: 'var(--t3)' }}>
                Não tem conta?{' '}
                <Link href="/cadastro" className="font-semibold transition-colors hover:opacity-70" style={{ color: 'var(--brand)' }}>
                  Solicitar acesso
                </Link>
              </p>
            </form>
          )}

          {/* ── Form: Equipe ── */}
          {tab === 'team' && (
            <form onSubmit={handleTeamLogin} className="flex flex-col gap-4">
              <div
                className="rounded-xl px-4 py-3 text-[13px]"
                style={{ background: 'var(--raised)', border: '1px solid var(--border)', color: 'var(--t3)' }}
              >
                Acesso exclusivo para colaboradores convidados pela nutricionista.
              </div>
              <div>
                <label className="field-label">E-mail</label>
                <input
                  type="email" required placeholder="voce@exemplo.com"
                  value={teamEmail} onChange={e => setTeamEmail(e.target.value)}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="field-label">Senha</label>
                <PasswordInput value={teamPass} onChange={setTeamPass} />
              </div>
              {teamError && (
                <div
                  className="rounded-xl px-4 py-3 text-[13px] font-medium"
                  style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}
                >
                  {teamError}
                </div>
              )}
              <button type="submit" disabled={teamLoading} className="btn-primary w-full mt-1">
                {teamLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><span>Entrar</span><ArrowRight className="w-4 h-4" /></>
                }
              </button>
              <p className="text-center text-[13px] mt-1" style={{ color: 'var(--t3)' }}>
                Primeiro acesso? Use o link de convite enviado pela nutricionista.
              </p>
            </form>
          )}

          {/* ── Form: Paciente ── */}
          {tab === 'patient' && (
            <form onSubmit={handlePatientLogin} className="flex flex-col gap-4">
              <div>
                <label className="field-label">Telefone ou e-mail</label>
                <input
                  type="text" required placeholder="(11) 99999-9999 ou email"
                  value={patLogin} onChange={e => setPatLogin(e.target.value)}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="field-label">Senha</label>
                <PasswordInput value={patPass} onChange={setPatPass} />
              </div>

              {patError && (
                <div
                  className="rounded-xl px-4 py-3 text-[13px] font-medium"
                  style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}
                >
                  {patError}
                </div>
              )}

              <button
                type="submit"
                disabled={patLoading}
                className="btn-primary w-full mt-1"
              >
                {patLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><span>Entrar</span><ArrowRight className="w-4 h-4" /></>
                }
              </button>

              <p className="text-center text-[13px] mt-1" style={{ color: 'var(--t3)' }}>
                Primeira vez aqui?{' '}
                <Link href="/p/cadastro" className="font-semibold transition-colors hover:opacity-70" style={{ color: 'var(--brand)' }}>
                  Criar minha conta
                </Link>
              </p>
            </form>
          )}

          {/* Footer links */}
          <div className="flex items-center justify-center gap-4 mt-8">
            {[
              { href: '/termos',      label: 'Termos de Uso' },
              { href: '/privacidade', label: 'Privacidade' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-[12px] transition-colors hover:opacity-70"
                style={{ color: 'var(--t3)' }}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
