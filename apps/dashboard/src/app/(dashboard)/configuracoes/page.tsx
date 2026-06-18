'use client'

import { useState } from 'react'
import {
  Check, Building2, User, Bell, CreditCard, Users, Shield,
  KeyRound, Database, LogOut, Search, Globe, Upload,
  Smartphone, Mail, MessageSquare, Copy, Trash2, Eye, EyeOff,
  Download, AlertTriangle, ChevronRight,
} from 'lucide-react'
import { Card, SectionTitle, Btn, Badge, Avatar } from '@/components/ui/finance-primitives'

// ── Helper components ────────────────────────────────────────────────────────

function Field({ label, value, hint, type = 'text' }: { label: string; value?: string; hint?: string; type?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11.5px] font-medium" style={{ color: 'var(--t3)' }}>{label}</label>
        {hint && <span className="text-[10.5px]" style={{ color: 'var(--t3)' }}>{hint}</span>}
      </div>
      <input
        type={type}
        defaultValue={value}
        className="w-full h-9 px-3 rounded-lg text-[13px] outline-none transition focus:ring-2"
        style={{
          background: 'var(--raised)',
          color: 'var(--t1)',
          border: '1px solid var(--border)',
        }}
      />
    </div>
  )
}

function SelectField({ label, value, options }: { label: string; value: string; options: string[] }) {
  return (
    <div>
      <label className="text-[11.5px] font-medium mb-1.5 block" style={{ color: 'var(--t3)' }}>{label}</label>
      <select
        defaultValue={value}
        className="w-full h-9 px-3 rounded-lg text-[13px] outline-none transition focus:ring-2"
        style={{
          background: 'var(--raised)',
          color: 'var(--t1)',
          border: '1px solid var(--border)',
        }}
      >
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  )
}

function Toggle({ on }: { on: boolean }) {
  const [v, setV] = useState(on)
  return (
    <button
      onClick={() => setV(!v)}
      className="shrink-0 w-9 h-5 rounded-full relative transition-colors"
      style={{ background: v ? 'var(--brand)' : 'var(--border)' }}
    >
      <span
        className="absolute top-0.5 size-4 rounded-full bg-white shadow transition-all"
        style={{ left: v ? '18px' : '2px' }}
      />
    </button>
  )
}

function Row({ title, desc, on, right }: { title: string; desc?: string; on?: boolean; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="min-w-0">
        <div className="text-[13px] font-medium" style={{ color: 'var(--t1)' }}>{title}</div>
        {desc && <div className="text-[12px] mt-0.5" style={{ color: 'var(--t3)' }}>{desc}</div>}
      </div>
      {right ?? (on !== undefined && <Toggle on={on} />)}
    </div>
  )
}

// ── Nav items (sem aparencia e integracoes) ──────────────────────────────────

const NAV = [
  { id: 'workspace',    label: 'Workspace',          icon: Building2 },
  { id: 'perfil',       label: 'Perfil',              icon: User },
  { id: 'notificacoes', label: 'Notificações',        icon: Bell },
  { id: 'faturamento',  label: 'Faturamento',         icon: CreditCard },
  { id: 'equipe',       label: 'Equipe',              icon: Users },
  { id: 'seguranca',    label: 'Segurança',           icon: Shield },
  { id: 'api',          label: 'API & Webhooks',      icon: KeyRound },
  { id: 'dados',        label: 'Dados & Privacidade', icon: Database },
] as const

type SectionId = (typeof NAV)[number]['id']

// ── Sections ────────────────────────────────────────────────────────────────

function WorkspaceSection() {
  return (
    <>
      <Card>
        <SectionTitle
          title="Identidade do workspace"
          hint="Como sua clínica aparece para pacientes e equipe."
          action={<Btn size="sm" variant="primary">Salvar</Btn>}
        />
        <div className="flex items-start gap-5 mb-5 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div
            className="size-16 rounded-xl grid place-items-center text-white font-bold text-[22px] shadow-lg"
            style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-soft))' }}
          >
            N+
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-medium mb-1" style={{ color: 'var(--t1)' }}>Logo do workspace</div>
            <div className="text-[12px] mb-2" style={{ color: 'var(--t3)' }}>PNG ou SVG, mínimo 256×256px.</div>
            <div className="flex gap-2">
              <Btn size="sm" variant="secondary"><Upload className="size-3" /> Enviar logo</Btn>
              <Btn size="sm" variant="ghost">Remover</Btn>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nome da clínica" value="Clínica Nutri Plus" />
          <Field label="CNPJ" value="12.345.678/0001-90" />
          <Field label="Subdomínio" value="nutriplus" hint=".frame.app" />
          <SelectField label="Fuso horário" value="América/São Paulo (GMT-3)" options={['América/São Paulo (GMT-3)', 'América/Manaus (GMT-4)', 'América/Belém (GMT-3)']} />
          <SelectField label="Idioma padrão" value="Português (BR)" options={['Português (BR)', 'English (US)', 'Español']} />
          <SelectField label="Moeda" value="Real (BRL)" options={['Real (BRL)', 'US Dollar (USD)', 'Euro (EUR)']} />
        </div>
      </Card>

      <Card>
        <SectionTitle title="Endereço comercial" hint="Aparece em notas fiscais e comprovantes." />
        <div className="grid grid-cols-2 gap-4">
          <Field label="CEP" value="01310-100" />
          <Field label="Cidade" value="São Paulo" />
          <div className="col-span-2"><Field label="Endereço" value="Av. Paulista, 1578 — Conjunto 142" /></div>
          <Field label="Estado" value="SP" />
          <Field label="País" value="Brasil" />
        </div>
      </Card>

      <Card>
        <SectionTitle title="Zona de perigo" hint="Ações irreversíveis no workspace." />
        <div
          className="rounded-lg p-4 flex items-center justify-between gap-4"
          style={{ border: '1px solid rgba(255,92,92,0.2)', background: 'rgba(255,92,92,0.04)' }}
        >
          <div className="flex gap-3">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" style={{ color: '#FF5C5C' }} />
            <div>
              <div className="text-[13px] font-medium" style={{ color: 'var(--t1)' }}>Excluir workspace</div>
              <div className="text-[12px]" style={{ color: 'var(--t3)' }}>Remove todos os dados, conversas e pacientes permanentemente.</div>
            </div>
          </div>
          <Btn size="sm" variant="danger">Excluir</Btn>
        </div>
      </Card>
    </>
  )
}

function PerfilSection() {
  return (
    <>
      <Card>
        <SectionTitle
          title="Perfil pessoal"
          hint="Suas informações como usuário do Frame."
          action={<Btn size="sm" variant="primary">Salvar</Btn>}
        />
        <div className="flex items-center gap-4 mb-5 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <Avatar name="Heloísa Alves" color="green" size={56} />
          <div className="flex-1">
            <div className="text-[13px] font-medium" style={{ color: 'var(--t1)' }}>Heloísa Alves</div>
            <div className="text-[12px]" style={{ color: 'var(--t3)' }}>Owner · heloisaalvesnjs@gmail.com</div>
          </div>
          <Btn size="sm" variant="secondary"><Upload className="size-3" /> Alterar foto</Btn>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nome completo" value="Heloísa Alves" />
          <Field label="E-mail" value="heloisaalvesnjs@gmail.com" type="email" />
          <Field label="Telefone" value="+55 11 99999-0000" />
          <Field label="Cargo" value="Nutricionista" />
          <SelectField label="Idioma" value="Português (BR)" options={['Português (BR)', 'English (US)']} />
          <SelectField label="Formato de data" value="DD/MM/AAAA" options={['DD/MM/AAAA', 'MM/DD/AAAA', 'AAAA-MM-DD']} />
        </div>
      </Card>

      <Card>
        <SectionTitle title="Assinatura de e-mail" hint="Usada em mensagens automáticas enviadas em seu nome." />
        <textarea
          defaultValue={'Heloísa Alves\nNutricionista — Frame System\n+55 11 99999-0000'}
          className="w-full h-28 px-3 py-2 rounded-lg text-[13px] outline-none resize-none focus:ring-2 transition"
          style={{
            background: 'var(--raised)',
            color: 'var(--t1)',
            border: '1px solid var(--border)',
          }}
        />
      </Card>
    </>
  )
}

function NotificacoesSection() {
  return (
    <>
      <Card>
        <SectionTitle title="Canais" hint="Onde você quer ser notificado." />
        <Row title="E-mail" desc="heloisaalvesnjs@gmail.com" right={<div className="flex items-center gap-2"><Mail className="size-3.5" style={{ color: 'var(--t3)' }} /><Toggle on={true} /></div>} />
        <Row title="Push no navegador" desc="Notificações em tempo real" right={<div className="flex items-center gap-2"><Bell className="size-3.5" style={{ color: 'var(--t3)' }} /><Toggle on={true} /></div>} />
        <Row title="SMS" desc="Apenas para urgências (custo adicional)" right={<div className="flex items-center gap-2"><Smartphone className="size-3.5" style={{ color: 'var(--t3)' }} /><Toggle on={false} /></div>} />
        <Row title="WhatsApp interno" desc="Resumo diário via WhatsApp" right={<div className="flex items-center gap-2"><MessageSquare className="size-3.5" style={{ color: 'var(--t3)' }} /><Toggle on={true} /></div>} />
      </Card>

      <Card>
        <SectionTitle title="Eventos" hint="Escolha por quais eventos ser notificado." />
        <Row title="Nova conversa" desc="Quando um paciente inicia uma conversa" on={true} />
        <Row title="Agendamento confirmado" desc="Paciente confirma horário" on={true} />
        <Row title="Agendamento cancelado" desc="Paciente cancela ou remarca" on={true} />
        <Row title="Pagamento recebido" desc="Confirmação automática via gateway" on={true} />
        <Row title="Pagamento atrasado" desc="Alerta após 3 dias do vencimento" on={true} />
        <Row title="Frame AI sugere resposta" desc="Quando a IA sugere uma ação relevante" on={false} />
        <Row title="Relatório semanal" desc="Resumo de performance toda segunda" on={true} />
      </Card>

      <Card>
        <SectionTitle title="Horário silencioso" hint="Não receber notificações nesse período." />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Início" value="22:00" />
          <Field label="Fim" value="07:00" />
        </div>
      </Card>
    </>
  )
}

function FaturamentoSection() {
  return (
    <>
      <Card>
        <SectionTitle title="Plano atual" action={<Badge variant="success">Ativo</Badge>} />
        <div
          className="rounded-xl p-5"
          style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand-ring)' }}
        >
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider font-semibold mb-1" style={{ color: 'var(--brand)' }}>Frame Growth</div>
              <div className="text-[28px] font-semibold tracking-tight tabular-nums" style={{ color: 'var(--t1)' }}>
                R$ 297<span className="text-[14px] font-normal" style={{ color: 'var(--t3)' }}>/mês</span>
              </div>
              <div className="text-[12px] mt-1" style={{ color: 'var(--t3)' }}>Próxima cobrança em 15 de julho · R$ 297,00</div>
              <ul className="text-[12.5px] mt-3 space-y-1" style={{ color: 'var(--t2)' }}>
                <li className="flex items-center gap-1.5"><Check className="size-3" style={{ color: 'var(--brand)' }} /> Pacientes ilimitados</li>
                <li className="flex items-center gap-1.5"><Check className="size-3" style={{ color: 'var(--brand)' }} /> Frame AI premium · 10k mensagens/mês</li>
                <li className="flex items-center gap-1.5"><Check className="size-3" style={{ color: 'var(--brand)' }} /> Integrações ilimitadas</li>
                <li className="flex items-center gap-1.5"><Check className="size-3" style={{ color: 'var(--brand)' }} /> 5 usuários incluídos</li>
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <Btn variant="primary">Fazer upgrade</Btn>
              <Btn variant="ghost" size="sm">Alterar plano</Btn>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle title="Forma de pagamento" action={<Btn size="sm" variant="secondary">Adicionar cartão</Btn>} />
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
          <div className="h-8 w-12 rounded grid place-items-center text-white text-[10px] font-bold" style={{ background: 'linear-gradient(135deg, #1A1F36, #635BFF)' }}>VISA</div>
          <div className="flex-1">
            <div className="text-[13px] font-medium" style={{ color: 'var(--t1)' }}>•••• •••• •••• 4242</div>
            <div className="text-[11.5px]" style={{ color: 'var(--t3)' }}>Expira 09/2027 · Heloísa Alves</div>
          </div>
          <Badge variant="default">Padrão</Badge>
          <Btn size="sm" variant="ghost">Remover</Btn>
        </div>
      </Card>

      <Card>
        <SectionTitle title="Histórico de faturas" action={<Btn size="sm" variant="ghost"><Download className="size-3" /> Exportar tudo</Btn>} />
        <div className="overflow-hidden rounded-lg" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-[12.5px]">
            <thead style={{ background: 'var(--raised)', color: 'var(--t3)' }}>
              <tr>
                <th className="text-left font-medium px-3 py-2 text-[11px] uppercase tracking-wider">Fatura</th>
                <th className="text-left font-medium px-3 py-2 text-[11px] uppercase tracking-wider">Data</th>
                <th className="text-left font-medium px-3 py-2 text-[11px] uppercase tracking-wider">Valor</th>
                <th className="text-left font-medium px-3 py-2 text-[11px] uppercase tracking-wider">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {[
                { id: 'INV-2026-006', date: '15 jun 2026', val: 'R$ 297,00', status: 'Pago' },
                { id: 'INV-2026-005', date: '15 mai 2026', val: 'R$ 297,00', status: 'Pago' },
                { id: 'INV-2026-004', date: '15 abr 2026', val: 'R$ 297,00', status: 'Pago' },
                { id: 'INV-2026-003', date: '15 mar 2026', val: 'R$ 297,00', status: 'Pago' },
              ].map((r) => (
                <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="px-3 py-2.5 font-medium tabular-nums" style={{ color: 'var(--t1)' }}>{r.id}</td>
                  <td className="px-3 py-2.5" style={{ color: 'var(--t2)' }}>{r.date}</td>
                  <td className="px-3 py-2.5 tabular-nums" style={{ color: 'var(--t1)' }}>{r.val}</td>
                  <td className="px-3 py-2.5"><Badge variant="success">{r.status}</Badge></td>
                  <td className="px-3 py-2.5 text-right"><Btn size="sm" variant="ghost"><Download className="size-3" /></Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

function EquipeSection() {
  const members = [
    { name: 'Heloísa Alves', email: 'heloisaalvesnjs@gmail.com', role: 'Owner', color: 'green' as const },
    { name: 'Marina Costa', email: 'marina@nutriplus.com.br', role: 'Admin', color: 'blue' as const },
    { name: 'Rafael Lima', email: 'rafael@nutriplus.com.br', role: 'Operador', color: 'purple' as const },
  ]
  return (
    <>
      <Card>
        <SectionTitle
          title="Membros"
          hint={`${members.length} de 5 usuários incluídos no plano.`}
          action={<Btn size="sm" variant="primary">Convidar membro</Btn>}
        />
        <div className="space-y-1">
          {members.map((m) => (
            <div key={m.email} className="flex items-center gap-3 p-2.5 rounded-lg transition hover:opacity-80">
              <Avatar name={m.name} color={m.color} size={36} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate" style={{ color: 'var(--t1)' }}>{m.name}</div>
                <div className="text-[12px] truncate" style={{ color: 'var(--t3)' }}>{m.email}</div>
              </div>
              <Badge variant={m.role === 'Owner' ? 'success' : m.role === 'Admin' ? 'info' : 'default'}>{m.role}</Badge>
              <Btn size="sm" variant="ghost">Gerenciar</Btn>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle title="Convites pendentes" />
        <div className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
          <Mail className="size-4" style={{ color: 'var(--t3)' }} />
          <div className="flex-1">
            <div className="text-[13px]" style={{ color: 'var(--t1)' }}>carolina@nutriplus.com.br</div>
            <div className="text-[11.5px]" style={{ color: 'var(--t3)' }}>Convidada como Operador · há 2 dias</div>
          </div>
          <Btn size="sm" variant="ghost">Reenviar</Btn>
          <Btn size="sm" variant="ghost"><Trash2 className="size-3" /></Btn>
        </div>
      </Card>
    </>
  )
}

function SegurancaSection() {
  const [show, setShow] = useState(false)
  return (
    <>
      <Card>
        <SectionTitle
          title="Senha"
          hint="Recomendamos atualizar a cada 90 dias."
          action={<Btn size="sm" variant="primary">Atualizar</Btn>}
        />
        <div className="grid grid-cols-1 gap-4 max-w-md">
          <div>
            <label className="text-[11.5px] font-medium mb-1.5 block" style={{ color: 'var(--t3)' }}>Senha atual</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                defaultValue="••••••••••••"
                className="w-full h-9 px-3 pr-9 rounded-lg text-[13px] outline-none focus:ring-2 transition"
                style={{ background: 'var(--raised)', color: 'var(--t1)', border: '1px solid var(--border)' }}
              />
              <button onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 transition hover:opacity-80" style={{ color: 'var(--t3)' }}>
                {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>
          <Field label="Nova senha" type="password" />
          <Field label="Confirmar nova senha" type="password" />
        </div>
      </Card>

      <Card>
        <SectionTitle
          title="Autenticação em dois fatores"
          hint="Camada extra de proteção no login."
          action={<Badge variant="success">Ativo</Badge>}
        />
        <Row title="App autenticador (TOTP)" desc="Google Authenticator, 1Password, Authy" on={true} />
        <Row title="SMS" desc="Código enviado para +55 11 ••••-4321" on={false} />
        <Row title="Chave de segurança (FIDO2)" desc="YubiKey, Touch ID, Windows Hello" on={false} />
      </Card>

      <Card>
        <SectionTitle
          title="Sessões ativas"
          hint="Dispositivos atualmente conectados."
          action={<Btn size="sm" variant="outline">Encerrar todas</Btn>}
        />
        {[
          { d: 'MacBook Pro · Chrome', l: 'São Paulo, BR · agora', current: true },
          { d: 'iPhone 15 · Safari',   l: 'São Paulo, BR · há 12 min', current: false },
          { d: 'Windows · Edge',       l: 'Rio de Janeiro, BR · há 3 dias', current: false },
        ].map((s) => (
          <Row
            key={s.d}
            title={s.d}
            desc={s.l}
            right={s.current ? <Badge variant="success">Esta sessão</Badge> : <Btn size="sm" variant="ghost">Encerrar</Btn>}
          />
        ))}
      </Card>

      <Card>
        <SectionTitle title="Log de atividades" hint="Eventos recentes de segurança." />
        <div className="space-y-2 text-[12.5px]">
          {[
            { e: 'Login bem-sucedido', w: 'MacBook · São Paulo', t: 'agora' },
            { e: '2FA habilitado', w: 'via app autenticador', t: 'há 2 dias' },
            { e: 'Senha alterada', w: 'MacBook · São Paulo', t: 'há 21 dias' },
            { e: 'Novo dispositivo confiável', w: 'iPhone 15', t: 'há 1 mês' },
          ].map((l) => (
            <div key={l.e} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <div className="size-1.5 rounded-full" style={{ background: 'var(--brand)' }} />
                <span style={{ color: 'var(--t1)' }}>{l.e}</span>
                <span style={{ color: 'var(--t3)' }}>— {l.w}</span>
              </div>
              <span style={{ color: 'var(--t3)' }}>{l.t}</span>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}

function ApiSection() {
  return (
    <>
      <Card>
        <SectionTitle
          title="Chaves de API"
          hint="Use para integrar o Frame com seus sistemas."
          action={<Btn size="sm" variant="primary">Nova chave</Btn>}
        />
        <div className="space-y-2">
          {[
            { name: 'Produção', key: 'fk_live_••••••••••••••••3a9f', created: '12 fev 2026', last: 'há 2 min' },
            { name: 'Sandbox',  key: 'fk_test_••••••••••••••••7c2e', created: '08 jan 2026', last: 'há 5 dias' },
          ].map((k) => (
            <div key={k.name} className="p-3 rounded-lg flex items-center gap-3" style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
              <KeyRound className="size-4" style={{ color: 'var(--t3)' }} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium flex items-center gap-2" style={{ color: 'var(--t1)' }}>
                  {k.name} <Badge variant="default">{k.last}</Badge>
                </div>
                <div className="text-[12px] font-mono truncate" style={{ color: 'var(--t3)' }}>{k.key} · criada {k.created}</div>
              </div>
              <Btn size="sm" variant="ghost"><Copy className="size-3" /></Btn>
              <Btn size="sm" variant="ghost"><Trash2 className="size-3" /></Btn>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle
          title="Webhooks"
          hint="Receba eventos em tempo real nos seus endpoints."
          action={<Btn size="sm" variant="secondary">Novo endpoint</Btn>}
        />
        <div className="space-y-2">
          {[
            { url: 'https://api.nutriplus.com.br/hooks/frame', events: 'conversation.*, appointment.*', ok: true },
            { url: 'https://hooks.zapier.com/hooks/catch/1234567/abc', events: 'payment.received', ok: true },
          ].map((w) => (
            <div key={w.url} className="p-3 rounded-lg flex items-center gap-3" style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
              <Globe className="size-4" style={{ color: 'var(--t3)' }} />
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-mono truncate" style={{ color: 'var(--t1)' }}>{w.url}</div>
                <div className="text-[11.5px] truncate" style={{ color: 'var(--t3)' }}>Eventos: {w.events}</div>
              </div>
              <Badge variant={w.ok ? 'success' : 'danger'}>{w.ok ? '200 OK' : 'Falha'}</Badge>
              <Btn size="sm" variant="ghost">Editar</Btn>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle title="Limites e uso" hint="Janela atual: 1 jun – 30 jun." />
        <div className="grid grid-cols-3 gap-4">
          {[
            { l: 'Requests / mês',      v: '84.230',  m: '200.000', p: 42 },
            { l: 'Webhooks entregues',  v: '12.401',  m: '50.000',  p: 25 },
            { l: 'Tokens Frame AI',     v: '4.2M',    m: '10M',     p: 42 },
          ].map((u) => (
            <div key={u.l}>
              <div className="text-[11.5px] mb-1" style={{ color: 'var(--t3)' }}>{u.l}</div>
              <div className="text-[16px] font-semibold tabular-nums" style={{ color: 'var(--t1)' }}>
                {u.v} <span className="text-[11.5px] font-normal" style={{ color: 'var(--t3)' }}>/ {u.m}</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                <div className="h-full rounded-full" style={{ width: u.p + '%', background: 'var(--brand)' }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}

function DadosSection() {
  return (
    <>
      <Card>
        <SectionTitle
          title="Exportação de dados"
          hint="Receba todos os seus dados em um arquivo ZIP."
          action={<Btn size="sm" variant="secondary"><Download className="size-3" /> Solicitar export</Btn>}
        />
        <div className="text-[12.5px]" style={{ color: 'var(--t2)' }}>
          Última exportação: <span style={{ color: 'var(--t1)' }}>12 mai 2026</span> · 84,2 MB
        </div>
      </Card>

      <Card>
        <SectionTitle title="Retenção de dados" hint="Por quanto tempo manter conversas e logs." />
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Conversas arquivadas" value="2 anos" options={['6 meses', '1 ano', '2 anos', 'Indefinido']} />
          <SelectField label="Logs de auditoria" value="1 ano" options={['3 meses', '6 meses', '1 ano', '2 anos']} />
        </div>
      </Card>

      <Card>
        <SectionTitle title="LGPD & Compliance" hint="Conformidade com regulamentações de dados." />
        <Row title="Anonimizar pacientes inativos" desc="Após 24 meses sem atividade" on={true} />
        <Row title="Consentimento explícito no opt-in" desc="Exigir aceite antes de enviar mensagens" on={true} />
        <Row title="Direito ao esquecimento automatizado" desc="Processa solicitações em até 15 dias" on={true} />
      </Card>

      <Card>
        <SectionTitle title="Excluir conta" />
        <div
          className="rounded-lg p-4 flex items-center justify-between gap-4"
          style={{ border: '1px solid rgba(255,92,92,0.2)', background: 'rgba(255,92,92,0.04)' }}
        >
          <div className="flex gap-3">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" style={{ color: '#FF5C5C' }} />
            <div>
              <div className="text-[13px] font-medium" style={{ color: 'var(--t1)' }}>Apagar permanentemente sua conta</div>
              <div className="text-[12px]" style={{ color: 'var(--t3)' }}>Esta ação não pode ser desfeita. Todos os seus dados pessoais serão removidos.</div>
            </div>
          </div>
          <Btn size="sm" variant="danger">Excluir conta</Btn>
        </div>
      </Card>
    </>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function ConfiguracoesPage() {
  const [section, setSection] = useState<SectionId>('workspace')

  return (
    <div>
      {/* Sub-header */}
      <div
        className="flex items-center justify-between px-8 py-4"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <div>
          <h1 className="text-[18px] font-semibold" style={{ color: 'var(--t1)' }}>Configurações</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--t3)' }}>Workspace · Frame System</p>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-6 max-w-[1180px] mx-auto grid gap-8" style={{ gridTemplateColumns: '240px minmax(0,1fr)' }}>
        {/* Sidebar nav */}
        <aside className="space-y-4 sticky top-4 self-start">
          <div className="relative">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--t3)' }} />
            <input
              placeholder="Buscar nas configurações…"
              className="w-full h-8 pl-8 pr-2 rounded-lg text-[12px] outline-none focus:ring-2 transition"
              style={{ background: 'var(--raised)', color: 'var(--t1)', border: '1px solid var(--border)' }}
            />
          </div>
          <nav className="space-y-0.5 text-[13px]">
            {NAV.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setSection(id)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-colors"
                style={{
                  background: section === id ? 'var(--raised)' : undefined,
                  color: section === id ? 'var(--t1)' : 'var(--t2)',
                }}
              >
                <Icon className="size-3.5" />
                <span className="flex-1 text-left">{label}</span>
                {section === id && <ChevronRight className="size-3" style={{ color: 'var(--t3)' }} />}
              </button>
            ))}
          </nav>
          <div className="pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] transition"
              style={{ color: '#FF5C5C' }}
            >
              <LogOut className="size-3.5" /> Sair da conta
            </button>
          </div>
        </aside>

        {/* Content */}
        <div className="space-y-4 min-w-0">
          {section === 'workspace'    && <WorkspaceSection />}
          {section === 'perfil'       && <PerfilSection />}
          {section === 'notificacoes' && <NotificacoesSection />}
          {section === 'faturamento'  && <FaturamentoSection />}
          {section === 'equipe'       && <EquipeSection />}
          {section === 'seguranca'    && <SegurancaSection />}
          {section === 'api'          && <ApiSection />}
          {section === 'dados'        && <DadosSection />}
        </div>
      </div>
    </div>
  )
}
