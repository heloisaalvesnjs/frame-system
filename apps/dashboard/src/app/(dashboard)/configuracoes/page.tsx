'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import {
  AlertTriangle,
  Bell,
  ChevronRight,
  Copy,
  CreditCard,
  Database,
  Download,
  Globe,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  MessageSquare,
  Palette,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
  User,
  Users,
  WalletCards,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Avatar, Badge, Btn, Card, SectionTitle } from '@/components/ui/finance-primitives'
import { cn } from '@/lib/utils'

type SectionId =
  | 'workspace'
  | 'perfil'
  | 'aparencia'
  | 'notificacoes'
  | 'integracoes'
  | 'plano'
  | 'equipe'
  | 'seguranca'
  | 'api'
  | 'dados'

const sections: Array<{ id: SectionId; label: string; icon: any }> = [
  { id: 'workspace', label: 'Workspace', icon: SlidersHorizontal },
  { id: 'perfil', label: 'Perfil', icon: User },
  { id: 'aparencia', label: 'Aparência', icon: Palette },
  { id: 'notificacoes', label: 'Notificações', icon: Bell },
  { id: 'integracoes', label: 'Integrações', icon: Globe },
  { id: 'plano', label: 'Plano e cobrança', icon: CreditCard },
  { id: 'equipe', label: 'Equipe', icon: Users },
  { id: 'seguranca', label: 'Segurança', icon: Lock },
  { id: 'api', label: 'API e webhooks', icon: KeyRound },
  { id: 'dados', label: 'Dados e LGPD', icon: Database },
]

function Field({ label, value, placeholder }: { label: string; value?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11.5px] font-medium text-t3">{label}</span>
      <input
        defaultValue={value}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-[var(--line-2)] bg-white/[0.03] px-3 text-[13px] text-t1 outline-none transition focus:border-[var(--brand-ring)]"
      />
    </label>
  )
}

function SelectField({ label, value, options }: { label: string; value: string; options: string[] }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11.5px] font-medium text-t3">{label}</span>
      <select
        defaultValue={value}
        className="h-9 w-full rounded-lg border border-[var(--line-2)] bg-white/[0.03] px-3 text-[13px] text-t1 outline-none transition focus:border-[var(--brand-ring)]"
      >
        {options.map(option => <option key={option}>{option}</option>)}
      </select>
    </label>
  )
}

function Toggle({ on = true }: { on?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        'relative h-5 w-9 rounded-full transition-colors',
        on ? 'bg-[var(--brand)]' : 'border border-[var(--line-2)] bg-white/[0.04]',
      )}
    >
      <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform', on ? 'left-[18px]' : 'left-0.5')} />
    </button>
  )
}

function Row({
  title,
  desc,
  right,
  on = true,
}: {
  title: string
  desc?: string
  right?: ReactNode
  on?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg px-3 py-2.5 transition hover:bg-white/[0.03]">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-t1">{title}</div>
        {desc && <div className="mt-0.5 text-[11.5px] text-t3">{desc}</div>}
      </div>
      {right ?? <Toggle on={on} />}
    </div>
  )
}

function WorkspaceSection() {
  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle
          title="Identidade do workspace"
          hint="Como sua clínica aparece para pacientes e equipe."
          action={<Btn size="sm" onClick={() => toast.success('Identidade salva')}>Salvar</Btn>}
        />
        <div className="mb-5 flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-xl bg-gradient-to-br from-[#00C27C] to-[#00E892] text-[18px] font-bold text-[#02140C]">
            FS
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn size="sm" variant="secondary"><Upload className="size-3.5" /> Enviar logo</Btn>
            <Btn size="sm" variant="ghost">Remover</Btn>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Nome da clínica" value="Clínica Nutri Plus" />
          <Field label="CNPJ" placeholder="00.000.000/0001-00" />
          <Field label="Subdomínio" value="nutriplus.framesystem.com.br" />
          <SelectField label="Fuso horário" value="America/Sao_Paulo" options={['America/Sao_Paulo', 'America/Fortaleza', 'America/Manaus']} />
          <SelectField label="Moeda" value="BRL - Real brasileiro" options={['BRL - Real brasileiro', 'USD - Dólar']} />
          <Field label="Telefone comercial" placeholder="+55 11 99999-0001" />
        </div>
      </Card>

      <Card>
        <SectionTitle title="Endereço comercial" hint="Aparece em notas fiscais e comprovantes." />
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Endereço" value="Av. Paulista, 1000" />
          <Field label="Complemento" value="Sala 1402" />
          <Field label="Cidade" value="São Paulo" />
          <Field label="Estado" value="SP" />
        </div>
      </Card>

      <Card className="border-[#FF5C5C]/20 bg-[#FF5C5C]/[0.04]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#FF5C5C]" />
            <div>
              <div className="text-[13px] font-semibold text-t1">Zona perigosa</div>
              <div className="mt-0.5 text-[12px] text-t3">Remove dados, conversas e pacientes permanentemente.</div>
            </div>
          </div>
          <Btn size="sm" variant="outline" className="border-[#FF5C5C]/40 text-[#FF5C5C] hover:bg-[#FF5C5C]/10">Excluir</Btn>
        </div>
      </Card>
    </div>
  )
}

function PerfilSection() {
  const { user } = useAuth()
  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle title="Perfil pessoal" hint="Suas informações como usuário do Frame." action={<Btn size="sm">Salvar</Btn>} />
        <div className="mb-5 flex items-center gap-4">
          <Avatar name={user?.name || 'Frame System'} color="green" size={48} />
          <div>
            <div className="text-[13px] font-semibold text-t1">{user?.name || 'Heloisa'}</div>
            <div className="text-[11.5px] text-t3">{user?.email || 'usuario@framesystem.com.br'}</div>
          </div>
          <Btn size="sm" variant="secondary" className="ml-auto"><Upload className="size-3.5" /> Alterar foto</Btn>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Nome completo" value={user?.name || ''} />
          <Field label="E-mail" value={user?.email || ''} />
          <Field label="Telefone" placeholder="+55 11 99999-9999" />
          <Field label="Cargo" value="Nutricionista" />
        </div>
      </Card>
      <Card>
        <SectionTitle title="Assinatura de e-mail" hint="Usada em mensagens automáticas enviadas em seu nome." />
        <textarea
          defaultValue={`Abraços,\n${user?.name || 'Equipe Frame System'}`}
          className="min-h-24 w-full resize-none rounded-lg border border-[var(--line-2)] bg-white/[0.03] px-3 py-2.5 text-[13px] text-t1 outline-none"
        />
      </Card>
    </div>
  )
}

function AparenciaSection() {
  const { theme, toggleTheme } = useTheme()
  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle title="Aparência" hint="Tema, densidade e preferências visuais." />
        <div className="grid gap-3 md:grid-cols-3">
          {['dark', 'light', 'system'].map(option => (
            <button
              key={option}
              onClick={() => {
                if ((option === 'dark' && theme !== 'dark') || (option === 'light' && theme !== 'light')) toggleTheme()
              }}
              className={cn(
                'rounded-xl border p-3 text-left transition',
                theme === option ? 'border-[var(--brand-ring)] bg-[var(--brand-s)]' : 'border-[var(--line-2)] bg-white/[0.02] hover:bg-white/[0.04]',
              )}
            >
              <div className="mb-3 h-20 rounded-lg border border-white/[0.08] bg-gradient-to-br from-[#0E0F11] to-[#1B1D20]" />
              <div className="text-[13px] font-semibold capitalize text-t1">{option === 'dark' ? 'Escuro' : option === 'light' ? 'Claro' : 'Sistema'}</div>
            </button>
          ))}
        </div>
      </Card>
      <Card>
        <SectionTitle title="Preferências de interface" />
        <div className="space-y-1">
          <Row title="Modo compacto" desc="Reduz espaçamentos em tabelas e listas" on={false} />
          <Row title="Animações sutis" desc="Transições e hover states do Lovable" on />
          <Row title="Alto contraste" desc="Melhora legibilidade em ambientes claros" on={false} />
        </div>
      </Card>
    </div>
  )
}

function NotificacoesSection() {
  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle title="Canais" hint="Onde você quer receber alertas do sistema." />
        <div className="space-y-1">
          <Row title="E-mail" desc="Resumo diário e alertas importantes" right={<div className="flex items-center gap-2"><Mail className="size-3.5 text-t3" /><Toggle /></div>} />
          <Row title="WhatsApp interno" desc="Resumo operacional pelo WhatsApp" right={<div className="flex items-center gap-2"><MessageSquare className="size-3.5 text-t3" /><Toggle /></div>} />
          <Row title="Push no navegador" desc="Avisos enquanto o painel estiver aberto" />
        </div>
      </Card>
      <Card>
        <SectionTitle title="Eventos" />
        <div className="space-y-1">
          <Row title="Nova conversa" desc="Quando um paciente inicia uma conversa" />
          <Row title="Consulta agendada" desc="Quando a IA confirma um horário" />
          <Row title="Pagamento recebido" desc="Confirmação automática via gateway" />
          <Row title="Paciente sem resposta" desc="Lead parado por mais de 48 horas" />
        </div>
      </Card>
    </div>
  )
}

function IntegracoesSection() {
  const apps = [
    ['WhatsApp Business', 'Mensagens via Cloud API', 'success', '#25D366'],
    ['Instagram Direct', 'DMs e respostas a stories', 'default', '#DD2A7B'],
    ['Google Calendar', 'Sincronização de agenda', 'success', '#4285F4'],
    ['Stripe', 'Pagamentos recorrentes', 'default', '#635BFF'],
  ] as const
  return (
    <Card>
      <SectionTitle title="Integrações conectadas" hint="Gerencie integrações ativas no workspace." action={<Btn size="sm" variant="secondary">Ver marketplace</Btn>} />
      <div className="space-y-2">
        {apps.map(([name, desc, status, color]) => (
          <div key={name} className="flex items-center gap-3 rounded-lg p-2.5 transition hover:bg-white/[0.03]">
            <div className="size-9 rounded-lg" style={{ background: color }} />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-t1">{name}</div>
              <div className="text-[11.5px] text-t3">{desc}</div>
            </div>
            {status === 'success' ? <Badge variant="success">Conectado</Badge> : <Btn size="sm" variant="ghost">Conectar</Btn>}
          </div>
        ))}
      </div>
    </Card>
  )
}

function PlanoSection() {
  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle title="Plano atual" action={<Badge variant="success">Ativo</Badge>} />
        <div className="rounded-xl border border-[var(--brand-ring)] bg-[var(--brand-s)] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[20px] font-semibold text-t1">Frame Scale</div>
              <div className="mt-1 text-[12px] text-t3">Até 5 usuários, automações ilimitadas e integrações premium.</div>
            </div>
            <div className="text-right">
              <div className="text-[22px] font-semibold text-t1">R$ 1.997</div>
              <div className="text-[11px] text-t3">/mês</div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Btn size="sm">Fazer upgrade</Btn>
            <Btn size="sm" variant="ghost">Alterar plano</Btn>
          </div>
        </div>
      </Card>
      <Card>
        <SectionTitle title="Forma de pagamento" action={<Btn size="sm" variant="secondary">Adicionar cartão</Btn>} />
        <Row title="•••• •••• •••• 4242" desc="Visa · vence 08/2028" right={<Badge variant="default">Padrão</Badge>} />
      </Card>
    </div>
  )
}

function EquipeSection() {
  const members = [
    ['Heloisa', 'Owner', 'success'],
    ['Bianca Reis', 'Admin', 'info'],
    ['Júlia Andrade', 'Operador', 'default'],
  ] as const
  return (
    <Card>
      <SectionTitle title="Membros" hint="3 de 5 usuários incluídos no plano." action={<Btn size="sm">Convidar membro</Btn>} />
      <div className="space-y-2">
        {members.map(([name, role, variant]) => (
          <div key={name} className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-white/[0.03]">
            <Avatar name={name} color={role === 'Owner' ? 'green' : 'blue'} size={34} />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-t1">{name}</div>
              <div className="text-[11.5px] text-t3">{name.toLowerCase().split(' ')[0]}@framesystem.com.br</div>
            </div>
            <Badge variant={variant as any}>{role}</Badge>
            <Btn size="sm" variant="ghost">Gerenciar</Btn>
          </div>
        ))}
      </div>
    </Card>
  )
}

function SegurancaSection() {
  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle title="Senha" hint="Recomendamos atualizar a cada 90 dias." action={<Btn size="sm">Atualizar</Btn>} />
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Senha atual" placeholder="••••••••" />
          <Field label="Nova senha" placeholder="Mínimo 8 caracteres" />
          <Field label="Confirmar nova senha" placeholder="Repita a nova senha" />
        </div>
      </Card>
      <Card>
        <SectionTitle title="Autenticação em dois fatores" hint="Camada extra de proteção no login." action={<Badge variant="success">Ativo</Badge>} />
        <Row title="App autenticador" desc="Código temporário via aplicativo" />
        <Row title="SMS" desc="Código enviado para +55 11 ••••-4321" on={false} />
      </Card>
      <Card>
        <SectionTitle title="Sessões ativas" action={<Btn size="sm" variant="outline">Encerrar todas</Btn>} />
        <Row title="Windows · Edge" desc="Rio de Janeiro, BR · há 3 dias" right={<Btn size="sm" variant="ghost">Encerrar</Btn>} />
        <Row title="MacBook · Chrome" desc="São Paulo, BR · agora" right={<Badge variant="success">Esta sessão</Badge>} />
      </Card>
    </div>
  )
}

function ApiSection() {
  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle title="Chaves de API" hint="Use para integrar o Frame com seus sistemas." action={<Btn size="sm">Nova chave</Btn>} />
        {['Produção', 'Sandbox'].map(name => (
          <Row
            key={name}
            title={name}
            desc={`fk_${name === 'Produção' ? 'live' : 'test'}_••••••••••••••••7c2e · criada em 08 jan 2026`}
            right={<div className="flex gap-1"><Btn size="sm" variant="ghost"><Copy className="size-3" /></Btn><Btn size="sm" variant="ghost"><Trash2 className="size-3" /></Btn></div>}
          />
        ))}
      </Card>
      <Card>
        <SectionTitle title="Webhooks" hint="Receba eventos em tempo real nos seus endpoints." action={<Btn size="sm" variant="secondary">Novo endpoint</Btn>} />
        <Row title="https://api.clinica.com/frame" desc="conversation.created, appointment.created" right={<Badge variant="success">200 OK</Badge>} />
        <Row title="https://n8n.framesystem.com.br/webhook" desc="assistant.message.sent" right={<Badge variant="danger">Falha</Badge>} />
      </Card>
    </div>
  )
}

function DadosSection() {
  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle title="Exportação de dados" hint="Receba todos os seus dados em um arquivo ZIP." action={<Btn size="sm" variant="secondary"><Download className="size-3.5" /> Solicitar export</Btn>} />
        <Row title="Último export" desc="Solicitado há 18 dias · disponível por 7 dias" right={<Btn size="sm" variant="ghost">Baixar</Btn>} />
      </Card>
      <Card>
        <SectionTitle title="Retenção de dados" />
        <div className="grid gap-3 md:grid-cols-2">
          <SelectField label="Conversas" value="2 anos" options={['6 meses', '1 ano', '2 anos', 'Indefinido']} />
          <SelectField label="Logs de auditoria" value="1 ano" options={['3 meses', '6 meses', '1 ano', '2 anos']} />
        </div>
      </Card>
      <Card>
        <SectionTitle title="LGPD & Compliance" hint="Conformidade com regulamentações de dados." />
        <Row title="Anonimizar pacientes inativos" desc="Após 24 meses sem atividade" />
        <Row title="Consentimento explícito no opt-in" desc="Exigir aceite antes de enviar mensagens" />
        <Row title="Direito ao esquecimento automatizado" desc="Processa solicitações em até 15 dias" />
      </Card>
    </div>
  )
}

function Content({ section }: { section: SectionId }) {
  if (section === 'workspace') return <WorkspaceSection />
  if (section === 'perfil') return <PerfilSection />
  if (section === 'aparencia') return <AparenciaSection />
  if (section === 'notificacoes') return <NotificacoesSection />
  if (section === 'integracoes') return <IntegracoesSection />
  if (section === 'plano') return <PlanoSection />
  if (section === 'equipe') return <EquipeSection />
  if (section === 'seguranca') return <SegurancaSection />
  if (section === 'api') return <ApiSection />
  return <DadosSection />
}

export default function ConfiguracoesPage() {
  const [section, setSection] = useState<SectionId>('workspace')
  const { logout } = useAuth()
  const sectionLabels: Record<SectionId, string> = {
    workspace: 'Workspace',
    perfil: 'Perfil',
    aparencia: 'Aparencia',
    notificacoes: 'Notificacoes',
    integracoes: 'Integracoes',
    plano: 'Faturamento',
    equipe: 'Equipe',
    seguranca: 'Seguranca',
    api: 'API & Webhooks',
    dados: 'Dados & Privacidade',
  }

  return (
    <main className="px-6 py-6">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-t1">Configurações</h1>
            <p className="mt-0.5 text-sm text-t3">Workspace, segurança, cobrança e preferências avançadas.</p>
          </div>
          <Badge variant="purple"><WalletCards className="size-3" /> Premium</Badge>
        </div>

        <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
          <Card className="h-max !p-2 lg:sticky lg:top-20">
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-t3" />
              <input
                placeholder="Buscar nas configuracoes..."
                className="h-8 w-full rounded-lg border border-[var(--line-1)] bg-[var(--raised)] pl-8 pr-2 text-[12px] text-t1 outline-none transition focus:ring-2 focus:ring-[var(--brand-ring)]"
              />
            </div>
            {sections.map(item => {
              const Icon = item.icon
              const active = section === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition',
                    active ? 'bg-[var(--brand-s)] text-[var(--brand)]' : 'text-t2 hover:bg-white/[0.04] hover:text-t1',
                  )}
                >
                  <Icon className="size-3.5" />
                  <span className="flex-1">{sectionLabels[item.id]}</span>
                  <ChevronRight className={cn('size-3 transition', active ? 'opacity-100' : 'opacity-0')} />
                </button>
              )
            })}
            <div className="mt-3 border-t border-[var(--line-1)] pt-3">
              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-[var(--danger)] transition hover:bg-[var(--danger)]/10"
              >
                <LogOut className="size-3.5" />
                Sair da conta
              </button>
            </div>
          </Card>

          <Content section={section} />
        </div>
      </div>
    </main>
  )
}
