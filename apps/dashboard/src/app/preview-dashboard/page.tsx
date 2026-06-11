import Link from 'next/link'
import {
  ArrowRight,
  Bot,
  CalendarDays,
  Clock3,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'

const activity = [
  {
    name: 'Mariana Costa',
    tag: 'Lead',
    text: 'Novo lead iniciou conversa pelo WhatsApp',
    time: 'agora',
    color: '#059669',
    initials: 'MC',
  },
  {
    name: 'Juliana Nunes',
    tag: 'Agenda',
    text: 'Consulta agendada para hoje as 14:30',
    time: '8 min',
    color: '#4F46E5',
    initials: 'JN',
  },
  {
    name: 'Fernanda Lima',
    tag: 'Lead',
    text: 'Perguntou sobre protocolo para emagrecimento',
    time: '22 min',
    color: '#DB2777',
    initials: 'FL',
  },
  {
    name: 'Camila Rocha',
    tag: 'Agenda',
    text: 'Confirmou primeira consulta online',
    time: '41 min',
    color: '#D97706',
    initials: 'CR',
  },
]

const appointments = [
  { time: '09:00', name: 'Bruna Azevedo', type: 'Consulta online', status: 'Confirmada', tone: 'success' },
  { time: '11:30', name: 'Larissa Melo', type: 'Primeira consulta', status: 'Agendada', tone: 'info' },
  { time: '14:30', name: 'Juliana Nunes', type: 'Consulta presencial', status: 'Confirmada', tone: 'success' },
]

const focusCards = [
  {
    title: 'Velocidade de resposta',
    desc: 'Acompanhe se a recepcionista esta absorvendo a demanda antes que leads esfriem.',
    icon: Zap,
  },
  {
    title: 'Qualidade do treinamento',
    desc: 'Revise tom, limites e respostas da IA para manter a experiencia com cara de consultorio premium.',
    icon: Sparkles,
  },
  {
    title: 'Follow-ups planejados',
    desc: 'Use automacoes para recuperar interessados que ainda nao marcaram consulta.',
    icon: Clock3,
  },
]

function CommandCard({
  label,
  value,
  insight,
  icon: Icon,
  tone,
}: {
  label: string
  value: string | number
  insight: string
  icon: typeof Users
  tone: 'success' | 'info' | 'warning' | 'default'
}) {
  const toneClass = {
    success: 'text-emerald-500 bg-emerald-500/10',
    info: 'text-blue-500 bg-blue-500/10',
    warning: 'text-amber-500 bg-amber-500/10',
    default: 'text-zinc-500 bg-zinc-500/10',
  }[tone]

  return (
    <div className="group h-full rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-frame-md" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="mb-5 flex items-center justify-between">
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </span>
        <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-60" style={{ color: 'var(--t2)' }} />
      </div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--t3)' }}>
        {label}
      </p>
      <p className="mt-2 font-display text-[32px] font-bold leading-none tracking-tight" style={{ color: 'var(--t1)' }}>
        {value}
      </p>
      <p className="mt-3 min-h-[36px] text-[13px] leading-5" style={{ color: 'var(--t2)' }}>
        {insight}
      </p>
    </div>
  )
}

function Panel({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}>
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--t3)' }}>
            {eyebrow}
          </p>
          <h2 className="mt-0.5 text-[15px] font-bold" style={{ color: 'var(--t1)' }}>
            {title}
          </h2>
        </div>
        <span className="inline-flex items-center gap-1 text-[12px] font-bold" style={{ color: 'var(--brand-h)' }}>
          Abrir
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
      {children}
    </section>
  )
}

export default function PreviewDashboardPage() {
  return (
    <main className="min-h-screen bg-base px-5 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-semibold" style={{ borderColor: 'var(--border)', color: 'var(--brand-h)', background: 'var(--brand-s)' }}>
              <ShieldCheck className="h-3.5 w-3.5" />
              Preview do redesign premium
            </div>
            <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight md:text-[34px]" style={{ color: 'var(--t1)' }}>
              Bom dia, Heloisa
            </h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-6" style={{ color: 'var(--t2)' }}>
              Central de operacao para acompanhar leads, agenda e performance da assistente sem depender de login.
            </p>
          </div>

          <Link href="/login" className="btn-secondary h-10 px-4 text-[13px]">
            Voltar para login
          </Link>
        </div>

        <section className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          <CommandCard label="Clientes ativos" value={24} insight="6 novos leads nesta semana para nutrir." icon={Users} tone="success" />
          <CommandCard label="Agenda de hoje" value={3} insight="Proxima consulta as 11:30." icon={CalendarDays} tone="info" />
          <CommandCard label="Conversas abertas" value={8} insight="Atendimentos que ainda podem virar consulta." icon={MessageCircle} tone="warning" />
          <CommandCard label="Conversao" value="38%" insight="11 agendamentos nos ultimos 7 dias." icon={TrendingUp} tone="default" />
        </section>

        <section className="grid grid-cols-1 gap-3.5 xl:grid-cols-[1.45fr_0.9fr]">
          <Panel title="Linha do tempo comercial" eyebrow="Atendimento">
            <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {activity.map(item => (
                <li key={item.name} className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-raised">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: item.color }}>
                    {item.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[13px] font-bold" style={{ color: 'var(--t1)' }}>{item.name}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.tag === 'Lead' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                        {item.tag}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[12px]" style={{ color: 'var(--t2)' }}>{item.text}</p>
                  </div>
                  <span className="hidden text-[11px] sm:block" style={{ color: 'var(--t3)' }}>{item.time}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <div className="flex flex-col gap-3.5">
            <Panel title="Agenda de hoje" eyebrow="Consultorio">
              <div className="flex flex-col gap-2 p-3">
                {appointments.map(item => (
                  <div key={item.name} className="flex items-center gap-3 rounded-xl px-3 py-3" style={{ background: 'var(--raised)' }}>
                    <p className="w-12 flex-shrink-0 text-[13px] font-bold" style={{ color: 'var(--t1)' }}>{item.time}</p>
                    <span className="h-10 w-[3px] flex-shrink-0 rounded-full" style={{ background: item.tone === 'success' ? 'var(--brand)' : '#3B82F6' }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold" style={{ color: 'var(--t1)' }}>{item.name}</p>
                      <p className="truncate text-[11px]" style={{ color: 'var(--t2)' }}>{item.type} - 60 min</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.tone === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Saude da assistente" eyebrow="IA">
              <div className="p-5">
                <div className="mb-5 rounded-2xl border p-4" style={{ borderColor: 'rgba(0,194,124,.22)', background: 'var(--brand-s)' }}>
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-emerald-500" style={{ background: 'var(--surface)' }}>
                      <Bot className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[13px] font-bold" style={{ color: 'var(--t1)' }}>Recepcionista ativa</p>
                      <p className="mt-1 text-[12px] leading-5" style={{ color: 'var(--t2)' }}>
                        A IA esta pronta para qualificar leads, tirar duvidas e conduzir agendamentos.
                      </p>
                    </div>
                  </div>
                </div>
                {[
                  ['Conversas sob controle', '8'],
                  ['Agendamentos na semana', '11'],
                  ['Consultas realizadas no mes', '19'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-xl px-1 py-2">
                    <span className="text-[13px]" style={{ color: 'var(--t2)' }}>{label}</span>
                    <span className="text-[13px] font-bold" style={{ color: 'var(--t1)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
          {focusCards.map(item => (
            <div key={item.title} className="group rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-frame-md" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="mb-4 flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'var(--raised)', color: 'var(--t2)' }}>
                  <item.icon className="h-5 w-5" />
                </span>
                <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-60" style={{ color: 'var(--t2)' }} />
              </div>
              <h3 className="text-[14px] font-bold" style={{ color: 'var(--t1)' }}>{item.title}</h3>
              <p className="mt-2 text-[13px] leading-5" style={{ color: 'var(--t2)' }}>{item.desc}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}
