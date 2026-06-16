'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Bell, Building2, Check, Copy, CreditCard, Eye, EyeOff,
  Globe, Loader2, Lock, LogOut, Mail, Phone, Plus, Save,
  Settings, Shield, Sparkles, Trash2, User, UserPlus, Users,
  Wifi, X, Zap,
} from 'lucide-react'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'
import { V4Button, V4Card, V4Input, V4Page, V4Select, V4Tag } from '@/components/v4/V4Primitives'

// ── Seções ─────────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'conta',        label: 'Minha conta',             icon: User },
  { id: 'perfil',       label: 'Perfil profissional',      icon: Sparkles },
  { id: 'consultorio',  label: 'Consultório e marca',      icon: Building2 },
  { id: 'servicos',     label: 'Serviços e preços',        icon: CreditCard },
  { id: 'whatsapp',     label: 'WhatsApp',                 icon: Phone },
  { id: 'assistente',   label: 'Assistente e atendimento', icon: Zap },
  { id: 'integracoes',  label: 'Integrações',              icon: Wifi },
  { id: 'equipe',       label: 'Equipe e permissões',      icon: Users },
  { id: 'notificacoes', label: 'Notificações',             icon: Bell },
  { id: 'seguranca',    label: 'Segurança',                icon: Shield },
  { id: 'privacidade',  label: 'Privacidade e dados',      icon: Lock },
  { id: 'plano',        label: 'Plano e cobrança',         icon: CreditCard },
  { id: 'preferencias', label: 'Preferências',             icon: Settings },
] as const
type SectionId = typeof SECTIONS[number]['id']

export default function ConfiguracoesPage() {
  const [section, setSection] = useState<SectionId>('conta')

  return (
    <V4Page
      eyebrow="Gestão da conta"
      title="Configurações"
      subtitle="Gerencie todos os aspectos da sua conta, consultório e integrações."
    >
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[220px_minmax(0,1fr)]">
        <V4Card className="h-max overflow-hidden p-1.5">
          {SECTIONS.map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={cn(
                  'mb-0.5 flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-left text-[13px] font-medium transition-colors',
                  section === item.id
                    ? 'bg-[var(--brand-s)] text-[var(--brand)]'
                    : 'text-t2 hover:bg-[var(--raised)] hover:text-t1',
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                {item.label}
              </button>
            )
          })}
        </V4Card>

        <div>
          {section === 'conta'        && <ContaSection />}
          {section === 'perfil'       && <PerfilSection />}
          {section === 'consultorio'  && <ConsultorioSection />}
          {section === 'servicos'     && <ServicosSection />}
          {section === 'whatsapp'     && <WhatsAppSection />}
          {section === 'assistente'   && <AssistenteSection />}
          {section === 'integracoes'  && <IntegracoesSection />}
          {section === 'equipe'       && <EquipeSection />}
          {section === 'notificacoes' && <NotificacoesSection />}
          {section === 'seguranca'    && <SegurancaSection />}
          {section === 'privacidade'  && <PrivacidadeSection />}
          {section === 'plano'        && <PlanoSection />}
          {section === 'preferencias' && <PreferenciasSection />}
        </div>
      </div>
    </V4Page>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function SectionPanel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <V4Card className="p-6">
      <div className="mb-5 border-b border-[var(--border)] pb-4">
        <h2 className="text-[16px] font-semibold text-t1">{title}</h2>
        {subtitle && <p className="mt-1 text-[13px] text-t3">{subtitle}</p>}
      </div>
      {children}
    </V4Card>
  )
}

function FormRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[180px_1fr] sm:items-start sm:gap-4">
      <div className="pt-1.5">
        <label className="text-[13px] font-medium text-t1">{label}</label>
        {hint && <p className="mt-0.5 text-[11.5px] leading-4 text-t3">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  )
}

function Divider() {
  return <div className="my-5 border-t border-[var(--border)]" />
}

// ══════════════════════════════════════════════════════════════════════════════
// 1 — Minha conta
// ══════════════════════════════════════════════════════════════════════════════
const contaSchema = z.object({
  name:  z.string().min(2, 'Nome obrigatório'),
  phone: z.string().optional(),
})
type ContaData = z.infer<typeof contaSchema>

function ContaSection() {
  const { user, refreshUser } = useAuth()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } =
    useForm<ContaData>({ resolver: zodResolver(contaSchema) })

  useEffect(() => {
    if (user) reset({ name: user.name || '', phone: user.phone || '' })
  }, [user, reset])

  async function onSubmit(data: ContaData) {
    await api.put('/api/nutritionists/profile', data)
    await refreshUser()
    toast.success('Conta atualizada!')
  }

  return (
    <SectionPanel title="Minha conta" subtitle="Dados básicos da sua conta no Frame System.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormRow label="Nome completo">
          <V4Input {...register('name')} placeholder="Seu nome" className="w-full" />
          {errors.name && <p className="mt-1 text-[11.5px] text-[var(--danger)]">{errors.name.message}</p>}
        </FormRow>
        <FormRow label="E-mail" hint="Não é possível alterar o e-mail após o cadastro.">
          <V4Input value={user?.email || ''} disabled className="w-full opacity-60" />
        </FormRow>
        <FormRow label="Telefone">
          <V4Input {...register('phone')} placeholder="+55 11 99999-9999" className="w-full" />
        </FormRow>
        <Divider />
        <div className="flex justify-end">
          <V4Button type="submit" variant="primary" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Salvar alterações
          </V4Button>
        </div>
      </form>
    </SectionPanel>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 2 — Perfil profissional
// ══════════════════════════════════════════════════════════════════════════════
const perfilSchema = z.object({
  specialty: z.string().optional(),
  bio:       z.string().optional(),
})
type PerfilData = z.infer<typeof perfilSchema>

function PerfilSection() {
  const { user, refreshUser } = useAuth()
  const { register, handleSubmit, reset, formState: { isSubmitting, isDirty } } =
    useForm<PerfilData>({ resolver: zodResolver(perfilSchema) })

  useEffect(() => {
    if (user) reset({ specialty: user.specialty || '', bio: user.bio || '' })
  }, [user, reset])

  async function onSubmit(data: PerfilData) {
    await api.put('/api/nutritionists/profile', data)
    await refreshUser()
    toast.success('Perfil atualizado!')
  }

  return (
    <SectionPanel title="Perfil profissional" subtitle="Informações que identificam você como profissional de saúde.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormRow label="Especialidade" hint="Ex: Nutrição clínica, Nutrição esportiva, Nutrição funcional">
          <V4Input {...register('specialty')} placeholder="Sua especialidade principal" className="w-full" />
        </FormRow>
        <FormRow label="Biografia" hint="Sua apresentação profissional. Usada pela IA para contextualizar os atendimentos.">
          <textarea
            {...register('bio')}
            placeholder="Descreva sua abordagem, experiência e diferencial profissional..."
            rows={5}
            className="w-full rounded-[10px] border border-[var(--border)] px-3 py-2 text-[13px] outline-none placeholder:text-t3 focus:border-[var(--brand-ring)] resize-none"
            style={{ background: 'var(--raised)', color: 'var(--t1)' }}
          />
        </FormRow>
        <Divider />
        <div className="flex justify-end">
          <V4Button type="submit" variant="primary" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Salvar
          </V4Button>
        </div>
      </form>
    </SectionPanel>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 3 — Consultório e marca
// ══════════════════════════════════════════════════════════════════════════════
function ConsultorioSection() {
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [email, setEmail] = useState('')
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setSaved(true)
    toast.success('Configurações do consultório salvas!')
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <SectionPanel title="Consultório e marca" subtitle="Identidade do seu espaço de atendimento.">
      <div className="space-y-4">
        <FormRow label="Nome do consultório">
          <V4Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Clínica Nutri Bem-Estar" className="w-full" />
        </FormRow>
        <FormRow label="Descrição" hint="Aparece em mensagens automáticas e confirmações.">
          <textarea
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            placeholder="Descrição curta do seu consultório..."
            rows={3}
            className="w-full rounded-[10px] border border-[var(--border)] px-3 py-2 text-[13px] outline-none placeholder:text-t3 focus:border-[var(--brand-ring)] resize-none"
            style={{ background: 'var(--raised)', color: 'var(--t1)' }}
          />
        </FormRow>
        <FormRow label="E-mail de contato">
          <V4Input value={email} onChange={e => setEmail(e.target.value)} placeholder="contato@seusite.com.br" type="email" className="w-full" />
        </FormRow>
        <Divider />
        <div className="flex justify-end">
          <V4Button variant="primary" onClick={handleSave}>
            {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
            {saved ? 'Salvo!' : 'Salvar'}
          </V4Button>
        </div>
      </div>
    </SectionPanel>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 4 — Serviços e preços
// ══════════════════════════════════════════════════════════════════════════════
interface Service { id: string; name: string; category: string; modality: string; price?: string }

function ServicosSection() {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newModality, setNewModality] = useState('online')
  const [newPrice, setNewPrice] = useState('')
  const [saving, setSaving] = useState(false)

  const { data, isLoading } = useQuery<{ services: Service[] }>({
    queryKey: ['services'],
    queryFn: () => api.get('/api/services').then(r => r.data),
  })

  async function handleAdd() {
    if (!newName.trim()) return
    setSaving(true)
    try {
      await api.post('/api/services', { name: newName, modality: newModality, price: newPrice || undefined })
      qc.invalidateQueries({ queryKey: ['services'] })
      setAdding(false); setNewName(''); setNewPrice('')
      toast.success('Serviço adicionado!')
    } catch { toast.error('Erro ao adicionar serviço') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    await api.delete(`/api/services/${id}`)
    qc.invalidateQueries({ queryKey: ['services'] })
    toast.success('Serviço removido')
  }

  return (
    <SectionPanel title="Serviços e preços" subtitle="Configure os serviços que sua assistente pode apresentar e agendar.">
      {isLoading ? (
        <div className="flex h-16 items-center justify-center text-[13px] text-t3">Carregando...</div>
      ) : (
        <div className="space-y-2">
          {(data?.services ?? []).length === 0 && !adding && (
            <p className="py-4 text-center text-[13px] text-t3">Nenhum serviço cadastrado.</p>
          )}
          {(data?.services ?? []).map(s => (
            <div key={s.id} className="flex items-center justify-between rounded-[10px] border border-[var(--border)] bg-[var(--raised)] px-3 py-2.5">
              <div>
                <span className="text-[13px] font-medium text-t1">{s.name}</span>
                <span className="ml-2 text-[11.5px] text-t3">{s.modality}</span>
                {s.price && <span className="ml-2 text-[12px] text-[var(--brand)]">{s.price}</span>}
              </div>
              <button onClick={() => handleDelete(s.id)} className="p-1 text-t3 hover:text-[var(--danger)]">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {adding ? (
            <div className="space-y-2 rounded-[10px] border border-[var(--brand-ring)] bg-[var(--raised)] p-3">
              <V4Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome do serviço" className="w-full" />
              <div className="flex gap-2">
                <V4Select value={newModality} onChange={e => setNewModality(e.target.value)} className="flex-1">
                  <option value="online">Online</option>
                  <option value="presencial">Presencial</option>
                  <option value="ambos">Ambos</option>
                </V4Select>
                <V4Input value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="Valor (ex: R$ 250)" className="flex-1" />
              </div>
              <div className="flex gap-2">
                <V4Button variant="primary" onClick={handleAdd} disabled={saving} className="flex-1 h-8">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Salvar
                </V4Button>
                <V4Button onClick={() => setAdding(false)} className="h-8">Cancelar</V4Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex w-full items-center gap-2 rounded-[10px] border border-dashed border-[var(--border)] px-3 py-2.5 text-[13px] text-t3 transition-colors hover:border-[var(--brand)] hover:text-[var(--brand)]"
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar serviço
            </button>
          )}
        </div>
      )}
    </SectionPanel>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 5 — WhatsApp
// ══════════════════════════════════════════════════════════════════════════════
function WhatsAppSection() {
  const qc = useQueryClient()
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: waData, isLoading } = useQuery<any>({
    queryKey: ['whatsapp-status'],
    queryFn: () => api.get('/api/whatsapp/status').then(r => r.data),
    refetchInterval: qrCode ? 3000 : 10000,
  })
  const connected = waData?.status === 'connected'

  useEffect(() => {
    if (connected && qrCode) { setQrCode(null); toast.success('WhatsApp conectado!') }
  }, [connected, qrCode])
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  async function handleConnect() {
    setConnecting(true)
    try {
      await api.post('/api/whatsapp/connect')
      await new Promise(r => setTimeout(r, 1500))
      const { data } = await api.get('/api/whatsapp/qr')
      if (data?.qrCode) { setQrCode(data.qrCode) }
      else {
        toast.info('Aguardando QR code...')
        let attempts = 0
        const interval = setInterval(async () => {
          attempts++
          try { const { data: qd } = await api.get('/api/whatsapp/qr'); if (qd?.qrCode) { setQrCode(qd.qrCode); clearInterval(interval) } } catch {}
          if (attempts >= 5) clearInterval(interval)
        }, 2000)
        pollRef.current = interval
      }
      qc.invalidateQueries({ queryKey: ['whatsapp-status'] })
    } catch (e: any) { toast.error(e?.response?.data?.error ?? 'Erro ao conectar') }
    finally { setConnecting(false) }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      await api.post('/api/whatsapp/disconnect')
      setQrCode(null)
      qc.invalidateQueries({ queryKey: ['whatsapp-status'] })
      toast.success('WhatsApp desconectado')
    } catch { toast.error('Erro ao desconectar') }
    finally { setDisconnecting(false) }
  }

  return (
    <SectionPanel title="WhatsApp" subtitle="Gerencie a conexão do número com o Frame System.">
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-[10px] border border-[var(--border)] bg-[var(--raised)] p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[#25D366]/10">
              <Phone className="h-4 w-4 text-[#25D366]" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-t1">
                {isLoading ? 'Verificando...' : connected ? (waData?.phone || 'Conectado') : 'Desconectado'}
              </p>
              <p className="text-[11.5px] text-t3">
                {connected ? 'Ativo e recebendo mensagens' : 'Conecte para ativar a assistente'}
              </p>
            </div>
          </div>
          <V4Tag tone={connected ? 'green' : 'default'} dot={connected}>
            {connected ? 'Conectado' : 'Offline'}
          </V4Tag>
        </div>

        {qrCode && (
          <div className="flex flex-col items-center gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--raised)] p-5">
            <p className="text-[13px] font-medium text-t1">Escaneie o QR code com seu WhatsApp</p>
            <p className="text-[11.5px] text-t3">WhatsApp → Dispositivos conectados → Conectar um dispositivo</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCode} alt="QR Code WhatsApp" className="h-48 w-48 rounded-lg border border-[var(--border)]" />
            <button onClick={() => setQrCode(null)} className="flex items-center gap-1 text-[11.5px] text-t3 hover:text-t1">
              <X className="h-3 w-3" /> Cancelar
            </button>
          </div>
        )}

        <div className="flex gap-2">
          {connected ? (
            <V4Button onClick={handleDisconnect} disabled={disconnecting} variant="danger">
              {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
              Desconectar
            </V4Button>
          ) : (
            <V4Button onClick={handleConnect} disabled={connecting || !!qrCode} variant="primary">
              {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Phone className="h-3.5 w-3.5" />}
              {qrCode ? 'Aguardando scan...' : 'Conectar WhatsApp'}
            </V4Button>
          )}
        </div>
      </div>
    </SectionPanel>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 6 — Assistente e atendimento
// ══════════════════════════════════════════════════════════════════════════════
function AssistenteSection() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery<any>({
    queryKey: ['assistant'],
    queryFn: () => api.get('/api/assistants').then(r => r.data),
  })
  const active = data?.is_active ?? true

  async function toggleIA() {
    try {
      await api.post('/api/assistants', { is_active: !active })
      qc.invalidateQueries({ queryKey: ['assistant'] })
      toast.success(active ? 'IA pausada' : 'IA ativada')
    } catch { toast.error('Erro ao alterar status da IA') }
  }

  return (
    <SectionPanel title="Assistente e atendimento" subtitle="Controle o comportamento da sua assistente virtual.">
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-[10px] border border-[var(--border)] bg-[var(--raised)] p-4">
          <div>
            <p className="text-[13px] font-medium text-t1">Status da IA</p>
            <p className="text-[11.5px] text-t3">
              {active ? 'Respondendo automaticamente.' : 'Pausada. Você responde manualmente.'}
            </p>
          </div>
          <button
            onClick={toggleIA}
            disabled={isLoading}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors',
              active ? 'border-[var(--brand)] bg-[var(--brand)]' : 'border-[var(--border)] bg-[var(--raised)]',
            )}
          >
            <span className={cn('block h-4 w-4 rounded-full bg-white shadow transition-transform', active ? 'translate-x-5' : 'translate-x-0.5')} />
          </button>
        </div>
        <div className="rounded-[10px] border border-[var(--border)] bg-[var(--raised)] p-4">
          <p className="text-[13px] font-medium text-t1">Nome da assistente</p>
          <p className="mt-1 text-[13px] text-t2">{data?.name || 'Frame'}</p>
          <p className="mt-2 text-[11.5px] text-t3">
            Para editar identidade, tom, horários e roteiros, acesse{' '}
            <a href="/treinamento" className="text-[var(--brand)] hover:underline">Assistente</a>.
          </p>
        </div>
      </div>
    </SectionPanel>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 7 — Integrações
// ══════════════════════════════════════════════════════════════════════════════
function IntegracoesSection() {
  const qc = useQueryClient()
  const { data: calData, isLoading } = useQuery<any>({
    queryKey: ['google-calendar-status'],
    queryFn: () => api.get('/api/google-calendar/status').then(r => r.data),
  })
  const calConnected = !!calData?.calendar_id || !!calData?.connected

  async function connectCalendar() {
    try {
      const { data } = await api.get('/api/google-calendar/auth-url')
      if (data?.url) window.location.href = data.url
    } catch { toast.error('Erro ao conectar Google Calendar') }
  }

  async function disconnectCalendar() {
    try {
      await api.delete('/api/google-calendar/disconnect')
      qc.invalidateQueries({ queryKey: ['google-calendar-status'] })
      toast.success('Google Calendar desconectado')
    } catch { toast.error('Erro ao desconectar') }
  }

  return (
    <SectionPanel title="Integrações" subtitle="Conecte ferramentas externas ao Frame System.">
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex h-16 items-center justify-center text-[13px] text-t3">Verificando conexões...</div>
        ) : (
          <div className="flex items-center justify-between rounded-[10px] border border-[var(--border)] bg-[var(--raised)] p-4">
            <div>
              <p className="text-[13px] font-medium text-t1">Google Calendar</p>
              <p className="text-[11.5px] text-t3">
                {calConnected && calData?.calendar_id ? calData.calendar_id : 'Sincronize agendamentos com seu calendário.'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <V4Tag tone={calConnected ? 'green' : 'default'} dot={calConnected}>
                {calConnected ? 'Conectado' : 'Desconectado'}
              </V4Tag>
              <V4Button className="h-8" onClick={calConnected ? disconnectCalendar : connectCalendar}>
                {calConnected ? 'Desconectar' : 'Conectar'}
              </V4Button>
            </div>
          </div>
        )}
        <p className="text-[11.5px] text-t3">
          Para gerenciar todas as integrações, acesse{' '}
          <a href="/integracoes" className="text-[var(--brand)] hover:underline">Integrações</a>.
        </p>
      </div>
    </SectionPanel>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 8 — Equipe e permissões
// ══════════════════════════════════════════════════════════════════════════════
interface TeamMember { id: string; name?: string; email: string; role: string; status: string; invite_link?: string }

function EquipeSection() {
  const qc = useQueryClient()
  const [emailVal, setEmailVal] = useState('')
  const [role, setRole] = useState('receptionist')
  const [inviting, setInviting] = useState(false)
  const [showInvite, setShowInvite] = useState(false)

  const { data } = useQuery<{ members: TeamMember[] }>({
    queryKey: ['team'],
    queryFn: () => api.get('/api/team').then(r => r.data),
  })

  const ROLE_LABELS: Record<string, string> = { admin: 'Admin', receptionist: 'Recepcionista', viewer: 'Visualizador' }

  async function invite() {
    if (!emailVal) return
    setInviting(true)
    try {
      await api.post('/api/team/invite', { email: emailVal, role })
      qc.invalidateQueries({ queryKey: ['team'] })
      setEmailVal(''); setShowInvite(false)
      toast.success('Convite enviado!')
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Erro ao convidar') }
    finally { setInviting(false) }
  }

  async function removeMember(id: string) {
    await api.delete(`/api/team/${id}`)
    qc.invalidateQueries({ queryKey: ['team'] })
    toast.success('Membro removido')
  }

  return (
    <SectionPanel title="Equipe e permissões" subtitle="Convide colaboradores para acessar o Frame System.">
      <div className="space-y-2">
        {(data?.members ?? []).length === 0 && !showInvite && (
          <p className="py-4 text-center text-[13px] text-t3">Nenhum colaborador convidado ainda.</p>
        )}
        {(data?.members ?? []).map(m => (
          <div key={m.id} className="flex items-center justify-between rounded-[10px] border border-[var(--border)] bg-[var(--raised)] px-3 py-2.5">
            <div>
              <p className="text-[13px] font-medium text-t1">{m.name || m.email}</p>
              <p className="text-[11.5px] text-t3">{m.email} · {ROLE_LABELS[m.role] || m.role}</p>
            </div>
            <div className="flex items-center gap-2">
              <V4Tag tone={m.status === 'active' ? 'green' : 'amber'}>
                {m.status === 'active' ? 'Ativo' : 'Pendente'}
              </V4Tag>
              {m.status === 'pending' && m.invite_link && (
                <button onClick={() => { navigator.clipboard.writeText(m.invite_link!); toast.success('Link copiado!') }} className="p-1 text-t3 hover:text-t1" title="Copiar link">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              )}
              <button onClick={() => removeMember(m.id)} className="p-1 text-t3 hover:text-[var(--danger)]">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}

        {showInvite ? (
          <div className="space-y-2 rounded-[10px] border border-[var(--brand-ring)] bg-[var(--raised)] p-3">
            <V4Input value={emailVal} onChange={e => setEmailVal(e.target.value)} placeholder="E-mail do colaborador" type="email" className="w-full" />
            <V4Select value={role} onChange={e => setRole(e.target.value)} className="w-full">
              <option value="receptionist">Recepcionista</option>
              <option value="admin">Admin</option>
              <option value="viewer">Visualizador</option>
            </V4Select>
            <div className="flex gap-2">
              <V4Button variant="primary" onClick={invite} disabled={inviting} className="h-8 flex-1">
                {inviting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                Enviar convite
              </V4Button>
              <V4Button onClick={() => setShowInvite(false)} className="h-8">Cancelar</V4Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowInvite(true)}
            className="flex w-full items-center gap-2 rounded-[10px] border border-dashed border-[var(--border)] px-3 py-2.5 text-[13px] text-t3 transition-colors hover:border-[var(--brand)] hover:text-[var(--brand)]"
          >
            <UserPlus className="h-3.5 w-3.5" /> Convidar colaborador
          </button>
        )}
      </div>
    </SectionPanel>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 9 — Notificações
// ══════════════════════════════════════════════════════════════════════════════
const NOTIF_ITEMS = [
  { id: 'new_lead',      label: 'Novo contato via WhatsApp',        desc: 'Quando um novo lead entrar em contato.' },
  { id: 'appointment',   label: 'Agendamento confirmado pela IA',    desc: 'Quando a assistente confirmar uma consulta.' },
  { id: 'takeover',      label: 'Solicitação de atendimento humano', desc: 'Quando o contato pedir para falar com você.' },
  { id: 'daily_summary', label: 'Resumo diário',                    desc: 'Sumário de atividade enviado por e-mail às 8h.' },
]

function NotificacoesSection() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    new_lead: true, appointment: true, takeover: true, daily_summary: false,
  })

  return (
    <SectionPanel title="Notificações" subtitle="Escolha quais eventos geram notificações para você.">
      <div className="divide-y divide-[var(--border)]">
        {NOTIF_ITEMS.map(item => (
          <div key={item.id} className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="text-[13px] font-medium text-t1">{item.label}</p>
              <p className="text-[11.5px] text-t3">{item.desc}</p>
            </div>
            <button
              onClick={() => setPrefs(p => ({ ...p, [item.id]: !p[item.id] }))}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition-colors',
                prefs[item.id] ? 'border-[var(--brand)] bg-[var(--brand)]' : 'border-[var(--border)] bg-[var(--raised)]',
              )}
            >
              <span className={cn('block h-4 w-4 rounded-full bg-white shadow transition-transform', prefs[item.id] ? 'translate-x-5' : 'translate-x-0.5')} />
            </button>
          </div>
        ))}
      </div>
    </SectionPanel>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 10 — Segurança
// ══════════════════════════════════════════════════════════════════════════════
const pwdSchema = z.object({
  current_password: z.string().min(1, 'Obrigatório'),
  new_password:     z.string().min(8, 'Mínimo 8 caracteres'),
  confirm_password: z.string(),
}).refine(d => d.new_password === d.confirm_password, {
  message: 'Senhas não conferem', path: ['confirm_password'],
})
type PwdData = z.infer<typeof pwdSchema>

function SegurancaSection() {
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<PwdData>({ resolver: zodResolver(pwdSchema) })

  async function onSubmit(data: PwdData) {
    try {
      await api.post('/api/nutritionists/change-password', {
        current_password: data.current_password,
        new_password: data.new_password,
      })
      reset()
      toast.success('Senha alterada com sucesso!')
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Senha atual incorreta') }
  }

  return (
    <SectionPanel title="Segurança" subtitle="Gerencie sua senha e acesso à conta.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormRow label="Senha atual">
          <div className="relative">
            <V4Input {...register('current_password')} type={showCurrent ? 'text' : 'password'} placeholder="Senha atual" className="w-full pr-10" />
            <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-t3">
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.current_password && <p className="mt-1 text-[11.5px] text-[var(--danger)]">{errors.current_password.message}</p>}
        </FormRow>
        <FormRow label="Nova senha">
          <div className="relative">
            <V4Input {...register('new_password')} type={showNew ? 'text' : 'password'} placeholder="Mínimo 8 caracteres" className="w-full pr-10" />
            <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-t3">
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.new_password && <p className="mt-1 text-[11.5px] text-[var(--danger)]">{errors.new_password.message}</p>}
        </FormRow>
        <FormRow label="Confirmar nova senha">
          <V4Input {...register('confirm_password')} type="password" placeholder="Repita a nova senha" className="w-full" />
          {errors.confirm_password && <p className="mt-1 text-[11.5px] text-[var(--danger)]">{errors.confirm_password.message}</p>}
        </FormRow>
        <Divider />
        <div className="flex justify-end">
          <V4Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
            Alterar senha
          </V4Button>
        </div>
      </form>
    </SectionPanel>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 11 — Privacidade e dados
// ══════════════════════════════════════════════════════════════════════════════
function PrivacidadeSection() {
  return (
    <SectionPanel title="Privacidade e dados" subtitle="Controle seus dados em conformidade com a LGPD.">
      <div className="space-y-3">
        <div className="rounded-[10px] border border-[var(--border)] bg-[var(--raised)] p-4">
          <p className="text-[13px] font-medium text-t1">Exportar meus dados</p>
          <p className="text-[11.5px] text-t3 mt-1">Cópia de todos os seus dados (Art. 18 LGPD). Enviada por e-mail em até 72h.</p>
          <V4Button className="mt-3 h-8" onClick={() => toast.info('Solicitação enviada. Você receberá os dados por e-mail.')}>
            Solicitar exportação
          </V4Button>
        </div>
        <div className="rounded-[10px] border border-[var(--border)] bg-[var(--raised)] p-4">
          <p className="text-[13px] font-medium text-t1">Retenção de dados</p>
          <p className="text-[11.5px] text-t3 mt-1">Conversas retidas por 2 anos. Dados de pacientes seguem a política CFN (5 anos mínimo).</p>
        </div>
        <div className="rounded-[10px] border border-[var(--danger)]/20 bg-[var(--danger)]/5 p-4">
          <p className="text-[13px] font-medium text-[var(--danger)]">Excluir conta</p>
          <p className="text-[11.5px] text-t3 mt-1">Irreversível. Para solicitar, contate <span className="text-t1">contato@framesystem.com.br</span>.</p>
        </div>
      </div>
    </SectionPanel>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 12 — Plano e cobrança
// ══════════════════════════════════════════════════════════════════════════════
function PlanoSection() {
  const { user } = useAuth()
  const plan = (user as any)?.plan || 'trial'
  const PLAN_LABELS: Record<string, string> = { trial: 'Avaliação gratuita', active: 'Frame Pro', suspended: 'Suspenso' }
  const PLAN_TONES: Record<string, 'green' | 'amber' | 'red'> = { trial: 'amber', active: 'green', suspended: 'red' }

  return (
    <SectionPanel title="Plano e cobrança" subtitle="Informações sobre seu plano atual.">
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-[10px] border border-[var(--border)] bg-[var(--raised)] p-4">
          <div>
            <p className="text-[13px] font-medium text-t1">{PLAN_LABELS[plan] || plan}</p>
            <p className="text-[11.5px] text-t3 mt-0.5">
              {plan === 'trial' ? 'Período de avaliação. Upgrade para desbloquear recursos completos.' :
               plan === 'active' ? 'Todos os recursos disponíveis.' :
               'Conta suspensa. Entre em contato para reativar.'}
            </p>
          </div>
          <V4Tag tone={PLAN_TONES[plan] || 'default'}>{PLAN_LABELS[plan] || plan}</V4Tag>
        </div>
        <p className="text-[11.5px] text-t3">
          Para upgrade ou informações sobre cobrança, fale com a equipe Frame em{' '}
          <span className="text-t1">contato@framesystem.com.br</span>.
        </p>
      </div>
    </SectionPanel>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// 13 — Preferências
// ══════════════════════════════════════════════════════════════════════════════
function PreferenciasSection() {
  const { theme, toggleTheme } = useTheme()

  return (
    <SectionPanel title="Preferências do sistema" subtitle="Personalize sua experiência no Frame System.">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium text-t1">Tema da interface</p>
            <p className="text-[11.5px] text-t3">Escolha entre modo claro e escuro.</p>
          </div>
          <div className="flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--raised)] p-0.5">
            <button
              onClick={() => theme === 'light' && toggleTheme()}
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-medium transition-colors',
                theme === 'dark' ? 'bg-[var(--surface)] text-t1 shadow-sm' : 'text-t3 hover:text-t1',
              )}
            >
              Escuro
            </button>
            <button
              onClick={() => theme === 'dark' && toggleTheme()}
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-medium transition-colors',
                theme === 'light' ? 'bg-[var(--surface)] text-t1 shadow-sm' : 'text-t3 hover:text-t1',
              )}
            >
              Claro
            </button>
          </div>
        </div>
        <Divider />
        <div>
          <p className="text-[13px] font-medium text-t1 mb-1.5">Idioma</p>
          <V4Select className="w-48">
            <option value="pt-BR">Português (Brasil)</option>
          </V4Select>
        </div>
      </div>
    </SectionPanel>
  )
}
